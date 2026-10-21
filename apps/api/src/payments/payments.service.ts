import {
  Injectable, BadRequestException, NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import Stripe from 'stripe';

import { Order, OrderStatus, OrderType } from '../orders/order.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { User } from '../users/user.entity';
import { Rental, RentalStatus } from '../rentals/rental.entity';
import { RentalExtension, ExtensionStatus } from '../rentals/rental-extension.entity';
import { Deposit, DepositStatus } from '../rentals/deposit.entity';
import { Commission } from '../commissions/commission.entity';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { MerchantPayout, PayoutStatus } from '../commissions/merchant-payout.entity';

const COMMISSION_RATES = {
  [OrderType.PURCHASE]: 0.15,
  [OrderType.RENTAL]:   0.10,
};


@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Rental)
    private readonly rentalRepo: Repository<Rental>,
    @InjectRepository(RentalExtension)
    private readonly extensionRepo: Repository<RentalExtension>,
    @InjectRepository(Deposit)
    private readonly depositRepo: Repository<Deposit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Commission)
    private readonly commissionRepo: Repository<Commission>,
    @InjectRepository(MerchantProfile)
    private readonly merchantRepo: Repository<MerchantProfile>,
    @InjectRepository(MerchantPayout)
    private readonly payoutRepo: Repository<MerchantPayout>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    private readonly settingsService: SettingsService,
  ) {
    // Fix 1: ?? '' verhindert "undefined nicht assignable zu string"
    const stripeKey = config.get<string>('STRIPE_SECRET_KEY') ?? '';
    this.stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
  }

  async createPaymentIntent(orderId: string, userId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
      relations: ['productVariant', 'productVariant.product',
                  'productVariant.product.merchant'],
    });
    if (!order) throw new NotFoundException('Bestellung nicht gefunden');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Bestellung bereits bezahlt oder storniert');
    }

    const merchant = order.productVariant.product.merchant;
    const isTestMode = this.config.get<string>('STRIPE_SECRET_KEY', '').startsWith('sk_test_');
    const amountCents = Math.round(Number(order.totalPrice) * 100);

    if (order.type === OrderType.PURCHASE) {
      const commissionRate = COMMISSION_RATES[OrderType.PURCHASE];
      // Provision NIE auf Versandkosten (der Versand bleibt beim Händler).
      const shipCents = Math.round(
        Number((order as any).shippingCost ?? order.productVariant?.product?.shippingCost ?? 0) * 100,
      );
      const commissionBaseCents = Math.max(0, amountCents - shipCents);
      const commissionCents = Math.round(commissionBaseCents * commissionRate);

      // Zahlungsmethoden beim KAUF: Karte immer, SEPA-Lastschrift (IBAN) nur
      // wenn der Admin das im Panel aktiviert hat. (Bei Miete: immer nur Karte.)
      const allowSepa = await this.settingsService.getAllowSepaPurchase();
      const purchaseMethods = allowSepa ? ['card', 'sepa_debit'] : ['card'];

      // Im Test-Modus: kein Stripe Connect nötig (direkter Charge an Plattform)
      // Im Live-Modus: Händler muss Stripe Connect haben
      const intentParams: any = {
        amount: amountCents,
        currency: 'eur',
        payment_method_types: purchaseMethods,
        metadata: { orderId: order.id, orderType: OrderType.PURCHASE, userId },
      };

      if (!isTestMode && merchant.stripeAccountId) {
        intentParams.application_fee_amount = commissionCents;
        intentParams.transfer_data = { destination: merchant.stripeAccountId };
      } else if (!isTestMode && !merchant.stripeAccountId) {
        throw new BadRequestException('Händler hat noch kein Stripe-Konto verknüpft');
      }

      const paymentIntent = await this.stripe.paymentIntents.create(intentParams);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: order.totalPrice,
        currency: 'EUR',
        testMode: isTestMode,
      };

    } else {
      // Feature 5: Ist das eine Verlängerungs-Order? Dann NUR die Gebühr
      // berechnen — keine erneute Kaution und keine Versandkosten.
      const extension = await this.extensionRepo.findOne({ where: { orderId: order.id } });
      if (extension) {
        const extIntent = await this.stripe.paymentIntents.create({
          amount: amountCents,
          currency: 'eur',
          payment_method_types: ['card'],
          metadata: {
            orderId: order.id,
            orderType: OrderType.RENTAL,
            userId,
            type: 'rental_extension',
          },
        });
        return {
          clientSecret: extIntent.client_secret,
          paymentIntentId: extIntent.id,
          amount: order.totalPrice,
          currency: 'EUR',
          testMode: isTestMode,
          isExtension: true,
        };
      }

      // Kaution aus Produkt lesen
      const depositAmountEur = Number(order.productVariant.product.depositAmount ?? 0);
      if (depositAmountEur <= 0) {
        throw new BadRequestException('Kaution nicht konfiguriert — bitte Produkt bearbeiten');
      }

      // ── ZWEI getrennte Zahlungen: Miete + Kaution (Airbnb-Modell) ──────
      //
      // 1) MIETE: wird sofort abgebucht (capture_method automatisch).
      //    → Stripe-Gebühr fällt nur auf den (kleinen) Mietbetrag an.
      //
      // 2) KAUTION: wird nur RESERVIERT, nicht abgebucht
      //    (capture_method: 'manual'). Dank "Extended Authorization"
      //    (von Stripe für dieses Konto freigeschaltet) hält die
      //    Reservierung bis zu 30 Tage.
      //    → KEINE Stripe-Gebühr, solange die Kaution nur reserviert ist.
      //    Bei Rückgabe: cancel (Freigabe). Bei Schaden: capture (Einzug).
      //
      // Beide laufen über dieselbe Karte des Kunden. Das Frontend bestätigt
      // zuerst die Miete, dann die Kaution (zwei client_secrets).

      // Stripe-Customer anlegen oder wiederverwenden. ZWINGEND nötig: nur
      // über einen Customer kann die Karte der Miet-Zahlung für die
      // Kautions-Reservierung WIEDERVERWENDET werden. Ohne Customer ist die
      // Karte Einmal-Gebrauch → die Kaution bleibt "unvollständig".
      const buyer = await this.userRepo.findOne({ where: { id: userId } });
      let customerId = buyer?.stripeCustomerId || undefined;
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: buyer?.email,
          name: buyer ? `${buyer.firstName} ${buyer.lastName}`.trim() : undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        await this.userRepo.update(userId, { stripeCustomerId: customerId });
      }

      // 1) Miete — sofort abbuchen, Karte am Customer speichern
      const rentalPaymentIntent = await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'eur',
        customer: customerId, // ← Karte wird an diesen Customer gebunden
        payment_method_types: ['card'],
        // Karte SPEICHERN, damit sie gleich auch für die Kautions-
        // Reservierung genutzt werden kann.
        setup_future_usage: 'off_session',
        metadata: {
          orderId: order.id,
          orderType: OrderType.RENTAL,
          userId,
          type: 'rental_fee',
          rentalAmount: String(order.totalPrice),
        },
      });

      // 2) Kaution — wird NICHT mehr hier erstellt.
      //    Sie wird serverseitig in handlePaymentSucceeded() in EINEM
      //    Rutsch erstellt + bestätigt (create mit confirm:true,
      //    off_session:true), sobald die Miete bezahlt und die Karte am
      //    Customer gespeichert ist. Das ist das von Stripe dokumentierte
      //    Muster für Kautionen/Holds auf einer gespeicherten Karte (Hotel-/
      //    Mietwagen-Modell) und vermeidet den Fehler, einen leeren
      //    PaymentIntent nachträglich off_session bestätigen zu müssen.
      //    Der Kautionsbetrag steht bereits im Deposit-Datensatz.

      return {
        // Miete (wird im Frontend bestätigt)
        clientSecret: rentalPaymentIntent.client_secret,
        rentalClientSecret: rentalPaymentIntent.client_secret,
        paymentIntentId: rentalPaymentIntent.id,
        rentalPaymentIntentId: rentalPaymentIntent.id,
        // Kaution folgt serverseitig nach bezahlter Miete (kein client_secret)
        depositClientSecret: null,
        depositPaymentIntentId: null,
        rentalAmount: order.totalPrice,
        depositAmount: depositAmountEur,
        totalCharged: amountCents / 100, // nur die Miete wird abgebucht
        depositIncluded: false, // Kaution ist separat (reserviert)
        currency: 'EUR',
        testMode: isTestMode,
      };
    }
  }

  /**
   * Wird aufgerufen, wenn eine KAUTION erfolgreich RESERVIERT wurde
   * (Stripe-Event 'amount_capturable_updated'). Das Geld ist auf der Karte
   * des Kunden blockiert, aber NICHT abgebucht. Wir merken uns die
   * PaymentIntent-ID, um die Reservierung später freizugeben (cancel) oder
   * einzuziehen (capture).
   */
  async handleDepositAuthorized(paymentIntent: Stripe.PaymentIntent) {
    const { orderId, type } = paymentIntent.metadata;
    if (!orderId) return;
    if (type !== 'rental_deposit_hold') return; // nur Kautions-Holds

    const rental = await this.rentalRepo.findOne({ where: { orderId } });
    if (rental) {
      await this.depositRepo.update(
        { rentalId: rental.id },
        { stripeHoldId: paymentIntent.id, status: DepositStatus.HELD },
      );
      this.logger.log(`Kaution reserviert (Hold): ${paymentIntent.id} für Order ${orderId}`);
    }
  }

  async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const { orderId, orderType, type } = paymentIntent.metadata;
    if (!orderId) return;

    // Kaution — die Stripe-PaymentIntent-ID der Kaution speichern, damit
    // sie später freigegeben (cancel) oder eingezogen (capture) werden kann.
    //   'rental_deposit_hold' = neues Modell (nur reserviert, 30 Tage)
    //   'deposit_charge' / 'deposit_hold' = ältere Modelle (abgebucht)
    if (type === 'rental_deposit_hold' || type === 'deposit_charge' || type === 'deposit_hold') {
      const rental = await this.rentalRepo.findOne({ where: { orderId } });
      if (rental) {
        await this.depositRepo.update({ rentalId: rental.id }, { stripeHoldId: paymentIntent.id });
      }
      this.logger.log(`Kaution erfasst (${type}): ${paymentIntent.id}`);
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Order).update(orderId, {
        status: OrderStatus.PAID,
        stripePaymentIntentId: paymentIntent.id,
      });

      // Feature 5: Gehört diese Zahlung zu einer Mietverlängerung?
      const ext = await manager.getRepository(RentalExtension).findOne({
        where: { orderId },
      });
      if (ext && ext.status !== ExtensionStatus.PAID) {
        await manager.getRepository(RentalExtension).update(ext.id, {
          status: ExtensionStatus.PAID,
          paidAt: new Date(),
        });
        // Verlängerungs-Order direkt auf DELIVERED — es gibt nichts zu
        // versenden, das Kleid ist bereits beim Kunden. Sonst würde sie
        // im Händler-Portal als offener Versand-Auftrag erscheinen.
        await manager.getRepository(Order).update(orderId, {
          status: OrderStatus.DELIVERED,
        });
        const extRental = await manager.getRepository(Rental).findOne({
          where: { id: ext.rentalId },
        });
        if (extRental) {
          await manager.getRepository(Rental).update(extRental.id, {
            endDate: ext.newEndDate,
            durationDays: Number(extRental.durationDays) + Number(ext.extraDays),
            // War die Miete überfällig → durch Verlängerung wieder aktiv
            status: extRental.status === RentalStatus.OVERDUE
              ? RentalStatus.ACTIVE
              : extRental.status,
          });
        }
        // ── Provision für die Verlängerung ──────────────────────────
        // WICHTIG: Ohne das bekäme der Händler 0,00 € für die Verlängerung!
        // Die Gebühr enthält KEINE Versandkosten → nichts abziehen.
        const extOrder = await manager.getRepository(Order).findOne({
          where: { id: orderId },
          relations: ['productVariant', 'productVariant.product'],
        });
        if (extOrder) {
          const extRate = COMMISSION_RATES[OrderType.RENTAL] ?? 0.15;
          const extGross = Number(extOrder.totalPrice);
          const extPlatform = Math.round(extGross * extRate * 100) / 100;
          const extMerchant = Math.round((extGross - extPlatform) * 100) / 100;

          const extCommission = manager.getRepository(Commission).create({
            orderId,
            merchantId: extOrder.productVariant.product.merchantId,
            grossPrice: extGross,
            rate: extRate * 100,
            platformAmount: extPlatform,
            merchantAmount: extMerchant,
            type: OrderType.RENTAL as any,
          });
          await manager.getRepository(Commission).save(extCommission);
          await manager.getRepository(Order).update(orderId, {
            commissionAmount: extPlatform,
            merchantAmount: extMerchant,
          });

          // Verlängerung ist sofort verdient (kein Versand, keine Lieferung
          // abzuwarten) → direkt ins verfügbare Guthaben, nicht "pending".
          const extMerchantProfile = await manager
            .getRepository(MerchantProfile)
            .findOne({ where: { id: extOrder.productVariant.product.merchantId } });
          if (extMerchantProfile && extMerchant > 0) {
            await manager.getRepository(MerchantProfile).update(
              extMerchantProfile.id,
              {
                balancePaid: Math.round(
                  (Number(extMerchantProfile.balancePaid) + extMerchant) * 100,
                ) / 100,
              },
            );
          }
          this.logger.log(
            `Verlängerung: Provision ${extPlatform}€, Händler ${extMerchant}€`,
          );
        }

        this.logger.log(
          `Verlängerung bezahlt: Rental ${ext.rentalId} läuft bis ${ext.newEndDate}`,
        );
        return; // keine neue Miete aktivieren
      }

      if (orderType === OrderType.RENTAL) {
        const rental = await manager.getRepository(Rental).findOne({ where: { orderId } });
        if (rental) {
          await manager.getRepository(Rental).update(rental.id, { status: RentalStatus.ACTIVE });

          // Miete + Kaution wurden in EINER Zahlung eingezogen.
          // Die Kaution auf genau diesen PaymentIntent verweisen — darüber
          // läuft später die (Teil-)Rückerstattung.
          if (type === 'rental_with_deposit' || paymentIntent.metadata?.depositAmount) {
            await manager.getRepository(Deposit).update(
              { rentalId: rental.id },
              {
                stripeHoldId: paymentIntent.id,
                status: DepositStatus.HELD,
              },
            );
            this.logger.log(
              `Kaution eingezogen (in Mietzahlung enthalten): ${paymentIntent.id}`,
            );
          }
        }
      }

      const order = await manager.getRepository(Order).findOne({
        where: { id: orderId },
        relations: ['productVariant', 'productVariant.product'],
      });
      if (order) {
        const rate = COMMISSION_RATES[order.type as OrderType] ?? 0.15;
        const gross = Number(order.totalPrice);
        // Provision NIE auf Versandkosten — der Versand bleibt beim Händler.
        // Gilt für Miete UND Kauf.
        const shippingCostDb = order.type === OrderType.RENTAL
          ? Number((order as any).productVariant?.product?.shippingCost ?? 0)
          : Number((order as any).shippingCost ?? (order as any).productVariant?.product?.shippingCost ?? 0);
        const commissionBase = Math.max(0, gross - shippingCostDb);
        const platformAmount = Math.round(commissionBase * rate * 100) / 100;
        const merchantAmount  = Math.round((gross - platformAmount) * 100) / 100;

        this.logger.log(`Commission erstellen: merchantId=${order.productVariant.product.merchantId} gross=${gross} merchant=${merchantAmount} platform=${platformAmount}`);
        const commission = manager.getRepository(Commission).create({
          orderId,
          merchantId: order.productVariant.product.merchantId,
          grossPrice: gross,
          rate: rate * 100,
          platformAmount,
          merchantAmount,
          type: order.type as any,
        });
        await manager.getRepository(Commission).save(commission);
        await manager.getRepository(Order).update(orderId, { commissionAmount: platformAmount, merchantAmount });
        this.logger.log(`Commission gespeichert: id=${commission.id}`);

        // balancePending erhöhen (noch nicht verdient — wartet auf Lieferung)
        const merchant = await manager.getRepository(MerchantProfile).findOne({
          where: { id: order.productVariant.product.merchantId }
        });
        if (merchant) {
          await manager.getRepository(MerchantProfile).update(merchant.id, {
            balancePending: Math.round((Number(merchant.balancePending) + merchantAmount) * 100) / 100,
          });
        }
      }
    });

    this.logger.log(`Zahlung erfolgreich: Order ${orderId}`);

    // ── KAUTION serverseitig reservieren (Airbnb-Modell) ──────────────────
    // Die Miete ist jetzt bezahlt und die Karte ist am Stripe-Customer
    // gespeichert. Die Kaution wird NICHT mehr im Frontend bestätigt: eine
    // gespeicherte Karte wiederzuverwenden ist eine Off-Session-Zahlung und
    // MUSS serverseitig mit off_session:true bestätigt werden — sonst lehnt
    // Stripe die Frontend-Bestätigung mit 400 ab ("Unvollständig").
    // Scheitert die Reservierung wirklich (Karte verweigert / 3D-Secure
    // nötig), wird die Miet-Gebühr sauber zurückerstattet und alles
    // storniert — der Kunde bleibt NICHT auf einer halben Zahlung sitzen.
    if (type === 'rental_fee') {
      const depositSecured = await this.secureRentalDeposit(orderId, paymentIntent);
      if (!depositSecured) {
        return; // storniert + zurückerstattet → keine Bestätigungs-E-Mail senden
      }
    }

    // Bestätigungs-E-Mail nach Zahlung
    try {
      const order = await this.orderRepo.findOne({
        where: { id: orderId },
        relations: ['user', 'productVariant', 'productVariant.product', 'rentals'],
      });
      if (order?.user?.email) {
        if (order.type === OrderType.RENTAL) {
          const rental = (order as any).rentals?.[0];
          await this.notifications.sendRentalConfirmation(order.user.email, {
            firstName:    order.user.firstName,
            productTitle: order.productVariant?.product?.title || 'Produkt',
            size:         order.productVariant?.size || '',
            startDate:    rental?.startDate || '',
            endDate:      rental?.endDate || '',
            durationDays: rental?.durationDays || 1,
            rentalFee:    Number(order.totalPrice),
            depositAmount: Number(order.productVariant?.product?.depositAmount || 0),
            merchantName: order.productVariant?.product?.merchant?.shopName || 'My Dressa',
          });
        } else {
          await this.notifications.sendOrderConfirmation(order.user.email, {
            orderId:      order.id,
            firstName:    order.user.firstName,
            productTitle: order.productVariant?.product?.title || 'Produkt',
            size:         order.productVariant?.size || '',
            totalPrice:   Number(order.totalPrice),
            merchantName: order.productVariant?.product?.merchant?.shopName || 'My Dressa',
          });
        }
      }
    } catch (e: any) {
      this.logger.warn(`Bestätigungs-E-Mail fehlgeschlagen: ${e.message}`);
    }
  }

  /**
   * Reserviert die Kaution serverseitig off_session mit der Karte, die
   * gerade die Miete bezahlt hat. Gibt true zurück, wenn die Reservierung
   * erfolgreich war (oder keine Kaution zu sichern ist), sonst false
   * (dann wurde bereits zurückerstattet + storniert).
   */
  private async secureRentalDeposit(
    orderId: string,
    rentalPaymentIntent: Stripe.PaymentIntent,
  ): Promise<boolean> {
    const rental = await this.rentalRepo.findOne({ where: { orderId } });
    if (!rental) return true; // keine Miete → nichts zu sichern

    const deposit = await this.depositRepo.findOne({ where: { rentalId: rental.id } });
    if (!deposit) return true; // kein Kautions-Datensatz → Miete bleibt gültig
    const depositAmountEur = Number(deposit.amount);
    if (!depositAmountEur || depositAmountEur <= 0) return true; // keine Kaution

    // Karte + Customer von der gerade bezahlten Miet-Zahlung übernehmen.
    const paymentMethod =
      typeof rentalPaymentIntent.payment_method === 'string'
        ? rentalPaymentIntent.payment_method
        : rentalPaymentIntent.payment_method?.id;
    const customerId =
      typeof rentalPaymentIntent.customer === 'string'
        ? rentalPaymentIntent.customer
        : rentalPaymentIntent.customer?.id;

    if (!paymentMethod || !customerId) {
      await this.handleDepositSecuringFailed(
        orderId,
        'keine Karte/kein Customer auf der Miet-Zahlung gefunden',
      );
      return false;
    }

    // Dokumentiertes Stripe-Muster für Kautionen auf gespeicherter Karte:
    // PaymentIntent in EINEM Aufruf erstellen UND bestätigen, off_session,
    // manual capture (nur reservieren). → Status 'requires_capture'.
    const baseParams: any = {
      amount: Math.round(depositAmountEur * 100),
      currency: 'eur',
      customer: customerId,
      payment_method: paymentMethod,
      payment_method_types: ['card'],
      capture_method: 'manual', // nur reservieren, nicht abbuchen
      off_session: true, // gespeicherte Karte, Kunde nicht aktiv dabei
      confirm: true, // sofort bestätigen
      metadata: {
        orderId,
        orderType: OrderType.RENTAL,
        type: 'rental_deposit_hold',
        depositAmount: String(depositAmountEur),
      },
    };

    // 30-Tage-Hold (Extended Authorization) NUR anfordern, wenn das Konto
    // dafür freigeschaltet ist — gesteuert per Env-Variable STRIPE_EXTENDED_AUTH:
    //   • Test-Konto (nicht berechtigt): Variable weglassen/=false → Standard-Hold (~7 Tage)
    //   • Live-Konto (für 30 Tage berechtigt): STRIPE_EXTENDED_AUTH=true
    // WICHTIG: KEIN "erst mit, dann ohne"-Versuch! Ein fehlgeschlagener erster
    // Versuch erzeugt einen echten (fehlgeschlagenen) PaymentIntent, dessen
    // payment_failed-Webhook sonst parallel die bereits erfolgreiche Miete
    // storniert + zurückerstattet (Race Condition). Darum genau EIN Versuch.
    const useExtendedAuth =
      String(this.config.get('STRIPE_EXTENDED_AUTH') ?? '').toLowerCase() === 'true';
    if (useExtendedAuth) {
      baseParams.payment_method_options = {
        card: { request_extended_authorization: 'if_available' },
      };
    }

    try {
      const pi = await this.stripe.paymentIntents.create(baseParams);
      this.logger.log(
        `Kaution reserviert (${useExtendedAuth ? '30-Tage-Hold' : 'Standard-Hold'}): ${pi.id} (Status: ${pi.status})`,
      );
      await this.depositRepo.update(deposit.id, {
        stripeHoldId: pi.id,
        status: DepositStatus.HELD,
      });
      return true;
    } catch (e: any) {
      // Karte abgelehnt, 3D-Secure zwingend, oder (bei aktivem Flag) Konto
      // doch nicht berechtigt → Miete sauber rückabwickeln. Volle Meldung loggen.
      const msg = e?.raw?.message || e?.message || e?.code || 'abgelehnt';
      this.logger.error(`Kaution-Reservierung Stripe-Fehler: code=${e?.code} msg=${msg}`);
      await this.handleDepositSecuringFailed(orderId, `${e?.code || 'error'}: ${msg}`);
      return false;
    }
  }

  /**
   * Rückabwicklung, wenn die Kaution NICHT reserviert werden konnte, die
   * Miet-Gebühr aber schon abgebucht wurde: Miet-Gebühr zurückerstatten,
   * Order + Miete stornieren, Kunde informieren. Idempotent — läuft nur
   * einmal (prüft, ob die Order bereits storniert ist).
   */
  private async handleDepositSecuringFailed(orderId: string, reason: string): Promise<void> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['user', 'productVariant', 'productVariant.product'],
    });
    if (!order) return;
    if (order.status === OrderStatus.CANCELLED) return; // schon behandelt (z. B. per Webhook)

    this.logger.warn(`Kaution konnte nicht gesichert werden (Order ${orderId}): ${reason}`);

    // 1) Order + Miete ZUERST stornieren (schneller DB-Write). So sieht ein
    //    parallel eintreffender Webhook-Aufruf sofort CANCELLED und bricht ab
    //    → keine doppelte Rückerstattung/E-Mail.
    await this.orderRepo.update(orderId, { status: OrderStatus.CANCELLED });
    const rental = await this.rentalRepo.findOne({ where: { orderId } });
    if (rental) {
      await this.rentalRepo.update(rental.id, { status: RentalStatus.CANCELLED });
      const deposit = await this.depositRepo.findOne({ where: { rentalId: rental.id } });
      if (deposit) {
        await this.depositRepo.update(deposit.id, { status: DepositStatus.RELEASED });
      }
    }

    // 2) Miet-Gebühr zurückerstatten, falls schon abgebucht.
    if (order.stripePaymentIntentId) {
      try {
        await this.stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
        this.logger.warn(`Miet-Gebühr zurückerstattet (Order ${orderId})`);
      } catch (e: any) {
        this.logger.warn(`Rückerstattung der Miet-Gebühr fehlgeschlagen: ${e.message}`);
      }
    }

    // 3) Provision zurücknehmen. Die Miet-Zahlung war kurz erfolgreich, daher
    //    wurde bereits eine Commission erstellt und dem Händler-Guthaben
    //    (balancePending) gutgeschrieben. Da wir die Miete jetzt rückabwickeln,
    //    muss das wieder abgezogen und die Commission entfernt werden — sonst
    //    bleibt ein falsches Guthaben stehen.
    try {
      const commission = await this.commissionRepo.findOne({ where: { orderId } });
      if (commission && !commission.payoutId) {
        const merchant = await this.merchantRepo.findOne({ where: { id: commission.merchantId } });
        if (merchant) {
          const newPending = Math.round(
            (Number(merchant.balancePending) - Number(commission.merchantAmount)) * 100,
          ) / 100;
          await this.merchantRepo.update(merchant.id, {
            balancePending: Math.max(0, newPending),
          });
        }
        await this.commissionRepo.delete(commission.id);
        this.logger.warn(`Provision zurückgenommen (Order ${orderId}, Storno)`);
      }
    } catch (e: any) {
      this.logger.warn(`Provisions-Rücknahme fehlgeschlagen: ${e.message}`);
    }

    // 4) Kunde best-effort informieren (Zahlung rückabgewickelt).
    try {
      if (order.user?.email) {
        const produkt = order.productVariant?.product?.title || 'das Kleid';
        await this.notifications.sendEmail(
          order.user.email,
          'Deine Miete konnte nicht abgeschlossen werden',
          `<p>Hallo ${order.user.firstName || ''},</p>
           <p>leider konnte die Kaution für <strong>${produkt}</strong> nicht
           reserviert werden, daher wurde die Miete nicht abgeschlossen.</p>
           <p>Die bereits gezahlte Miet-Gebühr wurde vollständig zurückerstattet.
           Es wurde dir nichts berechnet.</p>
           <p>Bitte versuche es erneut oder nutze eine andere Karte.</p>
           <p>Dein My-Dressa-Team</p>`,
        );
      }
    } catch (e: any) {
      this.logger.warn(`Storno-E-Mail konnte nicht gesendet werden: ${e.message}`);
    }
  }

  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const { orderId, type } = paymentIntent.metadata;
    if (!orderId) return;

    // Sonderfall: die KAUTION (nicht die Miete) ist fehlgeschlagen. Die
    // Miet-Gebühr wurde evtl. schon abgebucht → sauber zurückerstatten +
    // stornieren statt den Kunden auf einer halben Zahlung sitzen zu lassen.
    if (type === 'rental_deposit_hold') {
      // Schutz gegen veraltete Fehl-Events: Wurde die Kaution inzwischen
      // (z. B. durch den Fallback-Versuch ohne Extended Auth) unter einer
      // ANDEREN PaymentIntent erfolgreich reserviert, ist dieses
      // payment_failed veraltet → ignorieren, NICHT die gültige Miete stornieren.
      const rental = await this.rentalRepo.findOne({ where: { orderId } });
      if (rental) {
        const deposit = await this.depositRepo.findOne({ where: { rentalId: rental.id } });
        if (
          deposit?.status === DepositStatus.HELD &&
          deposit.stripeHoldId &&
          deposit.stripeHoldId !== paymentIntent.id
        ) {
          this.logger.warn(
            `Veraltetes payment_failed für ${paymentIntent.id} ignoriert — Kaution bereits reserviert (${deposit.stripeHoldId})`,
          );
          return;
        }
      }
      await this.handleDepositSecuringFailed(orderId, 'Kautions-Zahlung fehlgeschlagen (Webhook)');
      return;
    }

    // Order laden (für Typ + Variante), dann stornieren
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['productVariant'],
    });
    await this.orderRepo.update(orderId, { status: OrderStatus.CANCELLED });

    // Bei einem KAUF: den reservierten Bestand wieder freigeben,
    // sonst erscheint das Produkt fälschlich als "ausverkauft".
    try {
      if (order && order.type === OrderType.PURCHASE && order.productVariant) {
        await this.variantRepo.increment(
          { id: order.productVariant.id },
          'stockQuantity',
          1,
        );
        this.logger.warn(`Bestand für Variante ${order.productVariant.id} zurückgegeben (Zahlung fehlgeschlagen)`);
      }
    } catch (e: any) {
      this.logger.warn(`Bestand-Rückgabe nach Zahlungsfehler fehlgeschlagen: ${e.message}`);
    }

    // Auch die zugehörige Miete stornieren, damit der Kalender-Termin
    // sofort wieder frei wird (sonst blockiert die PENDING-Miete weiter).
    try {
      const rental = await this.rentalRepo.findOne({ where: { orderId } });
      if (rental && rental.status === RentalStatus.PENDING) {
        await this.rentalRepo.update(rental.id, {
          status: RentalStatus.CANCELLED,
        });
        this.logger.warn(`Miete ${rental.id} storniert (Zahlung fehlgeschlagen)`);
      }
    } catch (e: any) {
      this.logger.warn(`Miete-Storno nach Zahlungsfehler fehlgeschlagen: ${e.message}`);
    }

    this.logger.warn(`Zahlung fehlgeschlagen: Order ${orderId}`);
  }

  async payoutMerchant(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['productVariant', 'productVariant.product', 'productVariant.product.merchant'],
    });
    if (!order || order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Auszahlung nur nach Lieferung möglich');
    }

    const commission = await this.commissionRepo.findOne({ where: { orderId } });
    if (!commission) throw new NotFoundException('Commission nicht gefunden');
    if (commission.payoutId) throw new BadRequestException('Auszahlung bereits erfolgt');

    const merchant = order.productVariant.product.merchant;
    if (!merchant.stripeAccountId) throw new BadRequestException('Händler hat kein Stripe-Konto');

    const amountCents = Math.round(commission.merchantAmount * 100);

    return await this.dataSource.transaction(async (manager) => {
      const transfer = await this.stripe.transfers.create({
        amount: amountCents,
        currency: 'eur',
        destination: merchant.stripeAccountId!, // Fix 2: non-null assertion
        metadata: { orderId, commissionId: commission.id },
      });

      const payout = manager.getRepository(MerchantPayout).create({
        merchantId: merchant.id,
        amount: commission.merchantAmount,
        status: PayoutStatus.PAID,
        stripeTransferId: transfer.id,
        paidAt: new Date(),
      });
      await manager.getRepository(MerchantPayout).save(payout);
      await manager.getRepository(Commission).update(commission.id, { payoutId: payout.id });
      await manager.getRepository(MerchantProfile).update(merchant.id, {
        balancePaid: () => `balance_paid + ${commission.merchantAmount}`,
      });

      this.logger.log(`Auszahlung: ${transfer.id} | ${commission.merchantAmount}€ → ${merchant.shopName}`);
      return { payoutId: payout.id, stripeTransferId: transfer.id, amount: commission.merchantAmount };
    });
  }

  /// Erstattet die Kaution zurück.
  /// WICHTIG: Die Zahlung enthält Miete + Kaution. Es darf deshalb NUR der
  /// Kautionsbetrag erstattet werden (Teil-Refund), sonst bekäme der Kunde
  /// auch die Miete zurück!
  async refundDeposit(paymentIntentId: string, amountEur?: number) {
    // Status prüfen: Eine RESERVIERTE (nicht erfasste) Kaution muss STORNIERT
    // werden (cancel → Hold freigeben) — man kann sie nicht "zurückerstatten",
    // da nie etwas abgebucht wurde. Nur eine bereits abgebuchte Kaution wird
    // per refund zurückerstattet.
    const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status === 'requires_capture') {
      await this.stripe.paymentIntents.cancel(paymentIntentId);
      this.logger.log(`Kaution-Reservierung freigegeben (cancel): ${paymentIntentId}`);
      return;
    }
    if (pi.status === 'canceled') {
      this.logger.log(`Kaution bereits freigegeben: ${paymentIntentId}`);
      return;
    }

    // Bereits abgebucht (succeeded) → zurückerstatten.
    const params: any = { payment_intent: paymentIntentId };
    if (amountEur != null && amountEur > 0) {
      params.amount = Math.round(amountEur * 100);
    }
    await this.stripe.refunds.create(params);
    this.logger.log(
      `Kaution zurückerstattet: ${paymentIntentId}` +
      (amountEur != null ? ` (€${amountEur})` : ' (voll)'),
    );
  }

  async resolveDeposit(rentalId: string, capture: boolean, reason: string) {
    const deposit = await this.depositRepo.findOne({ where: { rentalId } });
    if (!deposit?.stripeHoldId || deposit.status !== DepositStatus.HELD) return;

    // Aktuellen Status der Kaution bei Stripe prüfen.
    const pi = await this.stripe.paymentIntents.retrieve(deposit.stripeHoldId);
    const isHold = pi.status === 'requires_capture'; // reserviert, nicht abgebucht

    if (capture) {
      // Kaution EINBEHALTEN. Reservierter Hold → jetzt abbuchen (capture).
      // Bereits abgebucht → nur Status setzen (Geld bleibt einbehalten).
      if (isHold) {
        await this.stripe.paymentIntents.capture(deposit.stripeHoldId, {
          amount_to_capture: Math.round(Number(deposit.amount) * 100),
        });
      }
      await this.depositRepo.update(deposit.id, {
        status: DepositStatus.RETAINED,
        releasedAt: new Date(),
        releaseReason: reason,
        retainedAmount: deposit.amount,
      });
    } else {
      // Kaution FREIGEBEN. Reservierter Hold → Hold freigeben (cancel).
      // Bereits abgebucht → Kautionsbetrag zurückerstatten.
      if (isHold) {
        await this.stripe.paymentIntents.cancel(deposit.stripeHoldId);
      } else if (pi.status !== 'canceled') {
        await this.stripe.refunds.create({
          payment_intent: deposit.stripeHoldId,
          amount: Math.round(Number(deposit.amount) * 100),
        });
      }
      await this.depositRepo.update(deposit.id, {
        status: DepositStatus.RELEASED,
        releasedAt: new Date(),
        releaseReason: reason,
        retainedAmount: 0,
      });
    }
    this.logger.log(`Kaution ${capture ? 'einbehalten (capture)' : 'freigegeben (cancel)'}: ${deposit.stripeHoldId}`);
  }

  async refundOrder(orderId: string, reason: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order?.stripePaymentIntentId) throw new BadRequestException('Keine Payment Intent ID');

    const refund = await this.stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      reason: 'requested_by_customer',
      metadata: { orderId, reason },
    });
    await this.orderRepo.update(orderId, { status: OrderStatus.REFUNDED });
    return { refundId: refund.id, status: refund.status };
  }

  async createMerchantStripeAccount(merchantId: string, email: string) {
    let account: Stripe.Account;
    try {
      account = await this.stripe.accounts.create({
        type: 'express',
        country: 'DE',
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: { mcc: '5691' },
      });
    } catch (e: any) {
      // Häufigster Fall: Stripe Connect ist im Stripe-Konto nicht aktiviert.
      this.logger.error(`Stripe-Konto-Erstellung fehlgeschlagen: ${e.message}`);
      if (e?.message?.includes('signed up for Connect') || e?.message?.includes('Connect')) {
        throw new BadRequestException(
          'Zahlungen sind noch nicht eingerichtet. Der Betreiber muss zuerst ' +
          'Stripe Connect im Stripe-Dashboard aktivieren (dashboard.stripe.com/connect).',
        );
      }
      throw new BadRequestException(
        'Stripe-Konto konnte nicht erstellt werden. Bitte später erneut versuchen.',
      );
    }

    await this.merchantRepo.update(merchantId, { stripeAccountId: account.id });

    const accountLink = await this.stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${this.config.get('FRONTEND_URL')}/merchant/stripe/refresh`,
      return_url:  `${this.config.get('FRONTEND_URL')}/merchant/stripe/success`,
      type: 'account_onboarding',
    });

    return { accountId: account.id, onboardingUrl: accountLink.url };
  }

  // ── Stripe Account Status prüfen ────────────────────────────────────────────
  async checkMerchantStripeStatus(merchantId: string) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('Händlerprofil nicht gefunden');

    if (!merchant.stripeAccountId) {
      return {
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        onboardingComplete: false,
        requirements: [],
        message: 'Kein Stripe-Konto verknüpft',
      };
    }

    // Stripe Account Details abrufen
    const account = await this.stripe.accounts.retrieve(merchant.stripeAccountId);

    const onboardingComplete = account.charges_enabled && account.payouts_enabled;
    const requirements = [
      ...(account.requirements?.currently_due ?? []),
      ...(account.requirements?.past_due ?? []),
    ];

    // Status in DB speichern
    await this.merchantRepo.update(merchantId, {
      isVerified: onboardingComplete,
    });

    return {
      connected: true,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      onboardingComplete,
      requirements,
      detailsSubmitted: account.details_submitted,
      message: onboardingComplete
        ? 'Stripe vollständig eingerichtet ✓'
        : requirements.length > 0
          ? `Onboarding unvollständig — ${requirements.length} Angabe(n) fehlen`
          : 'Onboarding läuft noch',
    };
  }

  // ── Neuen Onboarding-Link generieren (falls abgelaufen) ───────────────────
  async refreshMerchantOnboardingLink(merchantId: string) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    if (!merchant?.stripeAccountId) {
      throw new BadRequestException('Kein Stripe-Konto vorhanden');
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: merchant.stripeAccountId,
      refresh_url: `${this.config.get('FRONTEND_URL')}/merchant/stripe/refresh`,
      return_url:  `${this.config.get('FRONTEND_URL')}/merchant/stripe/success`,
      type: 'account_onboarding',
    });

    return { onboardingUrl: accountLink.url };
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    // Fix 3: ?? '' verhindert "undefined nicht assignable zu string"
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  async getMerchantProfile(userId: string) {
    return this.merchantRepo.findOne({ where: [{ userId }, { id: userId }] });
  }

  async getStripeTransfers(stripeAccountId: string) {
    const transfers = await this.stripe.transfers.list({
      destination: stripeAccountId,
      limit: 20,
    });
    return transfers.data.map(t => ({
      id: t.id,
      amount: t.amount / 100,
      currency: t.currency,
      description: t.description,
      created: new Date(t.created * 1000).toISOString(),
      metadata: t.metadata,
    }));
  }
}
