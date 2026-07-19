import {
  Injectable, BadRequestException, NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import Stripe from 'stripe';

import { Order, OrderStatus, OrderType } from '../orders/order.entity';
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
    @InjectRepository(Commission)
    private readonly commissionRepo: Repository<Commission>,
    @InjectRepository(MerchantProfile)
    private readonly merchantRepo: Repository<MerchantProfile>,
    @InjectRepository(MerchantPayout)
    private readonly payoutRepo: Repository<MerchantPayout>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
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

      // Im Test-Modus: kein Stripe Connect nötig (direkter Charge an Plattform)
      // Im Live-Modus: Händler muss Stripe Connect haben
      const intentParams: any = {
        amount: amountCents,
        currency: 'eur',
        payment_method_types: ['card'],
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
      const depositAmountCents = Math.round(depositAmountEur * 100);

      // ── EINE Zahlung für Miete + Kaution ──────────────────────────────
      // Früher waren das ZWEI PaymentIntents. Der zweite (Kaution) konnte
      // aber nie bestätigt werden, weil Stripe die Wiederverwendung einer
      // Zahlungsmethode ohne Customer-Objekt verbietet → die Kaution blieb
      // dauerhaft "unvollständig" und wurde NIE eingezogen.
      // Jetzt: eine Zahlung, eine Bestätigung. Die Kaution wird später per
      // TEIL-Rückerstattung (Refund über den Kautionsbetrag) zurückgegeben.
      const totalWithDepositCents = amountCents + depositAmountCents;

      const rentalPaymentIntent = await this.stripe.paymentIntents.create({
        amount: totalWithDepositCents,
        currency: 'eur',
        payment_method_types: ['card'],
        metadata: {
          orderId: order.id,
          orderType: OrderType.RENTAL,
          userId,
          type: 'rental_with_deposit',
          depositAmount: String(depositAmountEur),
          rentalAmount: String(order.totalPrice),
        },
      });

      return {
        // Beide Namen, damit App und Web funktionieren
        clientSecret: rentalPaymentIntent.client_secret,
        rentalClientSecret: rentalPaymentIntent.client_secret,
        paymentIntentId: rentalPaymentIntent.id,
        rentalPaymentIntentId: rentalPaymentIntent.id,
        // Kein separates Kautions-Secret mehr — ist in der Zahlung enthalten
        depositClientSecret: null,
        rentalAmount: order.totalPrice,
        depositAmount: depositAmountEur,
        totalCharged: totalWithDepositCents / 100,
        depositIncluded: true,
        currency: 'EUR',
        testMode: isTestMode,
      };
    }
  }

  async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const { orderId, orderType, type } = paymentIntent.metadata;
    if (!orderId) return;

    // Kaution: 'deposit_charge' (Option A, sofort abgebucht) oder
    // 'deposit_hold' (altes Modell) — beide speichern die Stripe-ID,
    // damit später Rückerstattung/Einbehalt möglich ist.
    if (type === 'deposit_charge' || type === 'deposit_hold') {
      const rental = await this.rentalRepo.findOne({ where: { orderId } });
      if (rental) {
        await this.depositRepo.update({ rentalId: rental.id }, { stripeHoldId: paymentIntent.id });
      }
      this.logger.log(`Kaution erfasst: ${paymentIntent.id}`);
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

  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const { orderId } = paymentIntent.metadata;
    if (!orderId) return;
    await this.orderRepo.update(orderId, { status: OrderStatus.CANCELLED });
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

    if (capture) {
      // Option A: Kaution wurde bereits abgebucht. Einbehalten = nur Status
      // setzen, das Geld bleibt beim Plattform-/Händlerkonto.
      await this.depositRepo.update(deposit.id, {
        status: DepositStatus.RETAINED,
        releasedAt: new Date(),
        releaseReason: reason,
        retainedAmount: deposit.amount,
      });
    } else {
      // Pünktliche Rückgabe: NUR den Kautionsbetrag zurückerstatten
      // (die Zahlung enthält auch die Miete!).
      await this.stripe.refunds.create({
        payment_intent: deposit.stripeHoldId,
        amount: Math.round(Number(deposit.amount) * 100),
      });
      await this.depositRepo.update(deposit.id, {
        status: DepositStatus.RELEASED,
        releasedAt: new Date(),
        releaseReason: reason,
        retainedAmount: 0,
      });
    }
    this.logger.log(`Kaution ${capture ? 'einbehalten' : 'zurückerstattet'}: ${deposit.stripeHoldId}`);
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
    const account = await this.stripe.accounts.create({
      type: 'express',
      country: 'DE',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: { mcc: '5691' },
    });

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
