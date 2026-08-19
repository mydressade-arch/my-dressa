import {
  Injectable, BadRequestException, ConflictException,
  NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { parseISO, isAfter, isBefore, addDays } from 'date-fns';

import { Rental, RentalStatus } from './rental.entity';
import { Deposit, DepositStatus } from './deposit.entity';
import { LegalConsent } from './legal-consent.entity';
import { Order, OrderType, OrderStatus } from '../orders/order.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { CreateRentalDto } from './dto/create-rental.dto';
import { ReturnRentalDto, ReturnCondition } from './dto/return-rental.dto';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { PaymentsService } from '../payments/payments.service';
import { SettingsService } from '../settings/settings.service';
import { RentalExtension, ExtensionStatus } from './rental-extension.entity';

// Geschäftsregeln — zentral definiert
const RULES = {
  // Fallback-Mietdauer, falls kein Produkt-Wert und kein Admin-Setting greift.
  RENTAL_DAYS: 10,
  MAX_ACTIVE_RENTALS_PER_USER: 3,
  // Kaution + Strafbetrag werden pro Produkt aus der DB gelesen.
};

@Injectable()
export class RentalsService {
  private readonly logger = new Logger(RentalsService.name);

  constructor(
    @InjectRepository(Rental)
    private readonly rentalRepo: Repository<Rental>,
    @InjectRepository(Deposit)
    private readonly depositRepo: Repository<Deposit>,
    @InjectRepository(LegalConsent)
    private readonly consentRepo: Repository<LegalConsent>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    
    
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notifications: NotificationsService,
    @InjectRepository(MerchantProfile)
    private readonly merchantProfileRepo: Repository<MerchantProfile>,
    private readonly paymentsService: PaymentsService,
    private readonly settingsService: SettingsService,
    @InjectRepository(RentalExtension)
    private readonly extensionRepo: Repository<RentalExtension>,
  ) {}

  // ─── AVAILABILITY CHECK (öffentlich) ────────────────────────
  async checkAvailability(
    productVariantId: string,
    startDate: string,
    endDate: string,
  ): Promise<{ available: boolean; blockedRanges: { start: string; end: string }[] }> {

    // Alle aktiven Buchungen für diese Variante laden.
    // WICHTIG: PENDING-Mieten (angelegt, aber noch nicht bezahlt) blockieren
    // nur für ein kurzes Reservierungsfenster (30 Min). Läuft die Zahlung
    // nicht durch, wird der Termin automatisch wieder frei — sonst würde eine
    // abgebrochene Zahlung den Kalender dauerhaft blockieren.
    const RESERVATION_WINDOW_MIN = 30;
    const cutoff = new Date(Date.now() - RESERVATION_WINDOW_MIN * 60 * 1000);

    const activeRentals = await this.rentalRepo
      .createQueryBuilder('r')
      .where('r.productVariantId = :variantId', { variantId: productVariantId })
      .andWhere('r.status NOT IN (:...excluded)', {
        excluded: [RentalStatus.CANCELLED, RentalStatus.RETURNED],
      })
      // PENDING nur zählen, wenn es NOCH im Reservierungsfenster liegt.
      // Bezahlte/aktive Mieten (nicht PENDING) blockieren immer.
      .andWhere(
        '(r.status != :pending OR r.createdAt > :cutoff)',
        { pending: RentalStatus.PENDING, cutoff },
      )
      .select(['r.startDate', 'r.endDate', 'r.status'])
      .getMany();

    const blockedRanges = activeRentals.map((r) => ({
      start: r.startDate,
      end: r.endDate,
    }));

    // Prüfen ob angefragter Zeitraum frei ist
    const requestedStart = parseISO(startDate);
    const requestedEnd = parseISO(endDate);

    const hasConflict = activeRentals.some((r) => {
      const existingStart = parseISO(r.startDate);
      const existingEnd = parseISO(r.endDate);
      // Overlap: start < existing_end AND end > existing_start
      return isBefore(requestedStart, existingEnd) && isAfter(requestedEnd, existingStart);
    });

    return { available: !hasConflict, blockedRanges };
  }

  // ─── CREATE RENTAL (atomare Transaktion) ─────────────────────
  async create(userId: string, dto: CreateRentalDto, ipAddress: string) {
    // E-Mail-Verifizierung ist zum MIETEN erforderlich.
    const renter = await this.userRepo.findOne({ where: { id: userId } });
    if (!renter?.isVerified) {
      throw new ForbiddenException(
        'Bitte bestätige zuerst deine E-Mail-Adresse, um mieten zu können.',
      );
    }

    // DSGVO-Einwilligung ist Pflicht (verhindert auch 500-Crash).
    if (!dto.consent || dto.consent.liabilityAccepted !== true) {
      throw new BadRequestException(
        'Zustimmung zu AGB, Mietbedingungen und Haftung ist erforderlich',
      );
    }
    // Feature 3: separate Zustimmung zur Kaution
    if (dto.consent.depositAccepted !== true) {
      throw new BadRequestException(
        'Zustimmung zur Kaution ist erforderlich',
      );
    }

    const startDate = parseISO(dto.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── Validierung Startdatum ─────────────────────────────────
    if (isBefore(startDate, today)) {
      throw new BadRequestException('Startdatum muss in der Zukunft liegen');
    }

    // Mietdauer wird aus dem Produkt gelesen (nach dem Laden der Variante)

    // ── Nutzer-Limit prüfen ────────────────────────────────────
    const activeCount = await this.rentalRepo
      .createQueryBuilder('r')
      .innerJoin('r.order', 'o')
      .where('o.user_id = :userId', { userId })
      .andWhere('r.status IN (:...active)', {
        active: [RentalStatus.PENDING, RentalStatus.ACTIVE],
      })
      .andWhere('o.status != :cancelled', { cancelled: 'cancelled' })
      .getCount();

    if (process.env.NODE_ENV === 'production' && activeCount >= RULES.MAX_ACTIVE_RENTALS_PER_USER) {
      throw new BadRequestException(
        `Maximal ${RULES.MAX_ACTIVE_RENTALS_PER_USER} aktive Mieten gleichzeitig erlaubt`,
      );
    }

    // ── Produktvariante laden ──────────────────────────────────
    const variant = await this.variantRepo.findOne({
      where: { id: dto.productVariantId },
      relations: ['product'],
    });
    if (!variant) throw new NotFoundException('Produktvariante nicht gefunden');
    if (!variant.product.isForRent) {
      throw new BadRequestException('Dieses Produkt ist nicht zur Miete verfügbar');
    }

    // Mietdauer aus dem Produkt — der Händler bestimmt sie frei.
    // Es gibt KEINE feste Liste erlaubter Werte mehr. Nur ein minimaler
    // Schutz gegen ungültige Werte (0 oder negativ).
    let durationDays = Number(variant.product.rentalDurationDays);
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      durationDays = 1; // Notfall-Minimum, sollte praktisch nie vorkommen
    }
    const endDate = addDays(startDate, durationDays);
    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];

    // Fester Mietpreis (NICHT mehr × Tage) — vom Händler festgelegt
    const rentalPrice  = Number(variant.product.rentalPrice);
    const shippingCost  = Number(variant.product.shippingCost ?? 0);
    const totalPrice    = rentalPrice + shippingCost;
    // Kaution vom Produkt lesen — NUR aus DB, kein hardcoded Fallback
    if (variant.product.depositAmount == null) {
      throw new BadRequestException('Kaution nicht konfiguriert — bitte Produkt bearbeiten und Kaution setzen');
    }
    const depositAmount = Number(variant.product.depositAmount);


    // ── ATOMARE TRANSAKTION ────────────────────────────────────
    // Availability Check + Order + Rental + Deposit + Consent
    // Alles in einer DB-Transaction mit Row-Level Locking
    return await this.dataSource.transaction(async (manager) => {

      // CRITICAL: Pessimistic Lock — verhindert Race Conditions
      // FOR UPDATE + COUNT ist in PostgreSQL nicht erlaubt.
      // Stattdessen: SELECT id ... FOR UPDATE, dann length prüfen.
      const conflicts = await manager
        .getRepository(Rental)
        .createQueryBuilder('r')
        .select('r.id')
        .where('r.product_variant_id = :variantId', { variantId: dto.productVariantId })
        .andWhere('r.status NOT IN (:...excluded)', {
          excluded: [RentalStatus.CANCELLED, RentalStatus.RETURNED],
        })
        .andWhere('r.start_date < :endDate', { endDate: endDateStr })
        .andWhere('r.end_date > :startDate', { startDate: startDateStr })
        .setLock('pessimistic_write') // FOR UPDATE — sperrt die Zeilen
        .getMany();

      if (conflicts.length > 0) {
        throw new ConflictException(
          'Produkt ist im gewählten Zeitraum nicht mehr verfügbar',
        );
      }

      // Order erstellen
      const order = manager.getRepository(Order).create({
        userId,
        productVariantId: dto.productVariantId,
        type: OrderType.RENTAL,
        status: OrderStatus.PENDING,
        totalPrice: totalPrice,
        shippingCost,           // Versand am Order (für die Händler-Aufschlüsselung)
        shippingAddress: dto.shippingAddress,
      });
      await manager.getRepository(Order).save(order);

      // Rental erstellen
      const rental = manager.getRepository(Rental).create({
        orderId: order.id,
        productVariantId: dto.productVariantId,
        startDate: startDateStr,
        endDate: endDateStr,
        durationDays,
        status: RentalStatus.PENDING,
      });
      await manager.getRepository(Rental).save(rental);

      // Deposit (Kaution) erstellen
      const deposit = manager.getRepository(Deposit).create({
        rentalId: rental.id,
        amount: depositAmount,
        status: DepositStatus.HELD,
      });
      await manager.getRepository(Deposit).save(deposit);

      // Legal Consent speichern (DSGVO!)
      const consent = manager.getRepository(LegalConsent).create({
        userId,
        orderId: order.id,
        agbVersion: dto.consent.agbVersion,
        rentalTermsVersion: dto.consent.rentalTermsVersion,
        liabilityAccepted: dto.consent.liabilityAccepted,
        depositAccepted: dto.consent.depositAccepted,
        depositTermsVersion: dto.consent.depositTermsVersion ?? '1.0',
        ipAddress,
      });
      await manager.getRepository(LegalConsent).save(consent);

      this.logger.log(
        `Rental erstellt: ${rental.id} | User: ${userId} | Variante: ${dto.productVariantId}`,
      );

      const result = {
        orderId: order.id,
        rentalId: rental.id,
        depositId: deposit.id,
        rentalFee: rentalPrice,
        shippingCost,
        totalPrice,
        depositAmount,
        startDate: startDateStr,
        endDate: endDateStr,
        durationDays,
        message: 'Mietanfrage erstellt. Bitte Zahlung abschließen.',
      };

      // Keine E-Mail hier — wird nach Stripe-Zahlung gesendet (payments.service.ts Webhook)
      return result;
    });
  }

  // ─── RÜCKGABE PROZESS ────────────────────────────────────────
  async processReturn(rentalId: string, merchantUserId: string, dto: ReturnRentalDto) {
    const rental = await this.rentalRepo.findOne({
      where: { id: rentalId },
      relations: ['order', 'order.productVariant', 'order.productVariant.product'],
    });
    if (!rental) throw new NotFoundException('Miete nicht gefunden');

    // Nur Händler des Produkts darf Rückgabe bestätigen
    // merchantUserId kann user.id ODER merchantProfile.id sein — beide prüfen
    const product = rental.order.productVariant.product;
    const merchantProfile = await this.merchantProfileRepo?.findOne({ where: { userId: merchantUserId } });
    const resolvedMerchantId = merchantProfile?.id ?? merchantUserId;
    if (product.merchantId !== resolvedMerchantId && product.merchantId !== merchantUserId) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    if (![RentalStatus.ACTIVE, RentalStatus.PENDING_RETURN, RentalStatus.OVERDUE].includes(rental.status)) {
      throw new BadRequestException('Rückgabe nur bei aktiver Miete möglich');
    }

    return await this.dataSource.transaction(async (manager) => {
      const deposit = await manager.getRepository(Deposit).findOne({
        where: { rentalId },
      });

      // Deposit-Entscheidung basierend auf Zustand
      let depositStatus: DepositStatus;
      let releaseReason: string;

      switch (dto.condition) {
        case ReturnCondition.GOOD:
          depositStatus = DepositStatus.RELEASED;
          releaseReason = 'Kleid in einwandfreiem Zustand zurückgegeben';
          break;
        case ReturnCondition.DAMAGED:
          depositStatus = DepositStatus.RETAINED;
          releaseReason = `Schaden gemeldet: ${dto.damageNotes ?? 'keine Details'}`;
          break;
        case ReturnCondition.LOST:
          depositStatus = DepositStatus.RETAINED;
          releaseReason = 'Kleid nicht zurückgegeben / verloren';
          break;
      }

      // Deposit updaten
      if (deposit) {
        // Schutz: Wenn die Kaution bereits als Strafe einbehalten wurde
        // (Status RETAINED durch Overdue-Scheduler), NICHT zurückerstatten.
        const alreadyResolved = deposit.status === DepositStatus.RETAINED ||
            deposit.status === DepositStatus.RELEASED;

        await manager.getRepository(Deposit).update(deposit.id, {
          status: depositStatus,
          releasedAt: new Date(),
          releaseReason,
          retainedAmount: depositStatus === DepositStatus.RELEASED ? 0 : deposit.amount,
        });

        // Option A: Bei einwandfreier Rückgabe die abgebuchte Kaution
        // per Stripe zurückerstatten — aber NUR wenn nicht schon
        // als Strafe einbehalten oder bereits erstattet.
        if (depositStatus === DepositStatus.RELEASED &&
            deposit.stripeHoldId &&
            !alreadyResolved) {
          try {
            await this.paymentsService.refundDeposit(
                deposit.stripeHoldId, Number(deposit.amount));
          } catch (e) {
            this.logger.error(`Kautions-Rückerstattung fehlgeschlagen: ${e}`);
          }
        }
      }

      // Rental + Order Status updaten
      await manager.getRepository(Rental).update(rentalId, {
        status: RentalStatus.RETURNED,
        returnedAt: new Date(),
        damageNotes: dto.damageNotes,
      });
      await manager.getRepository(Order).update(rental.orderId, {
        status: OrderStatus.RETURNED,
      });

      this.logger.log(`Rückgabe verarbeitet: ${rentalId} | Zustand: ${dto.condition}`);

      // Kautions-E-Mail an Kunden senden
      const order2 = await manager.getRepository(Order).findOne({
        where: { id: rental.orderId },
        relations: ['productVariant', 'productVariant.product'],
      });
      if (order2) {
        const renter = await this.userRepo.findOne({ where: { id: order2.userId } });
        if (renter) {
          if (depositStatus === 'released') {
            await this.notifications.sendDepositReleased(
              renter.email, renter.firstName,
              { productTitle: product.title, amount: deposit?.amount ?? 50 }
            );
          } else {
            await this.notifications.sendDepositRetained(
              renter.email, renter.firstName,
              { productTitle: product.title, amount: deposit?.amount ?? 50, reason: releaseReason }
            );
          }
        }
      }

      return {
        message: 'Rückgabe bestätigt',
        depositStatus,
        releaseReason,
        stripeDepositNote: depositStatus === 'released'
          ? 'Kaution wird auf die Karte des Kunden zurückgebucht'
          : 'Kaution wird einbehalten (Schadenfall)',
      };
    });
  }

  // ─── RENTAL DETAILS ─────────────────────────────────────────
  async findOne(rentalId: string, userId: string) {
    const rental = await this.rentalRepo.findOne({
      where: { id: rentalId },
      relations: ['order', 'order.productVariant', 'order.productVariant.product'],
    });
    if (!rental) throw new NotFoundException('Miete nicht gefunden');
    if (rental.order.userId !== userId) throw new ForbiddenException();
    return rental;
  }

  // ─── USER'S RENTALS ──────────────────────────────────────────
  async findByUser(userId: string) {
    const rentals = await this.rentalRepo
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.order', 'o')
      .innerJoinAndSelect('o.productVariant', 'v')
      .innerJoinAndSelect('v.product', 'p')
      .leftJoinAndSelect('p.images', 'img')
      .where('o.user_id = :userId', { userId })
      .orderBy('r.created_at', 'DESC')
      .getMany();

    // depositAmount direkt am Rental-Objekt für Frontend
    return rentals.map(r => ({
      ...r,
      depositAmount: (r as any).order?.productVariant?.product?.depositAmount ?? 50,
    }));
  }

  // ─── OVERDUE CHECK (wird vom Scheduler aufgerufen) ───────────
  async setReturnTracking(rentalId: string, userId: string, trackingNumber: string) {
    const rental = await this.rentalRepo.findOne({
      where: { id: rentalId },
      relations: ['order'],
    });
    if (!rental) throw new NotFoundException('Miete nicht gefunden');
    if (rental.order.userId !== userId) throw new ForbiddenException('Keine Berechtigung');
    // Rücksendung nur möglich wenn Miete als geliefert markiert wurde
    const order = rental.order;
    if (!order || order.status !== 'delivered') {
      throw new BadRequestException('Rücksendung erst möglich nachdem die Lieferung bestätigt wurde');
    }
    await this.rentalRepo.update(rentalId, {
      returnTrackingNumber: trackingNumber,
      status: RentalStatus.PENDING_RETURN,
    });
    // Order bleibt auf 'delivered' — Rental Status zeigt pending_return
    this.logger.log(`Rücksende-Tracking: ${trackingNumber} für Rental ${rentalId}`);
  }

  // ─── Feature 6: Beidseitige Rückgabe-Bestätigung ────────────────────────────

  /// Kunde bestätigt: "Ich habe das Kleid zurückgeschickt."
  async customerConfirmReturn(rentalId: string, userId: string) {
    const rental = await this.rentalRepo.findOne({
      where: { id: rentalId },
      relations: ['order'],
    });
    if (!rental) throw new NotFoundException('Miete nicht gefunden');
    if (rental.order.userId !== userId) {
      throw new ForbiddenException('Keine Berechtigung');
    }
    if (![RentalStatus.ACTIVE, RentalStatus.PENDING_RETURN, RentalStatus.OVERDUE]
        .includes(rental.status)) {
      throw new BadRequestException('Bestätigung nur bei laufender Miete möglich');
    }

    await this.rentalRepo.update(rentalId, {
      customerConfirmedReturn: true,
      customerConfirmedAt: new Date(),
      status: RentalStatus.PENDING_RETURN,
    });

    // Prüfen, ob jetzt beide bestätigt haben
    await this.tryFinalizeReturn(rentalId);
    return { message: 'Rückgabe vom Kunden bestätigt' };
  }

  /// Händler bestätigt: "Kleid erhalten." condition = good | damaged | lost
  async merchantConfirmReturn(
    rentalId: string,
    merchantUserId: string,
    condition: 'good' | 'damaged' | 'lost' | 'late',
    notes?: string,
  ) {
    const rental = await this.rentalRepo.findOne({
      where: { id: rentalId },
      relations: ['order', 'order.productVariant', 'order.productVariant.product'],
    });
    if (!rental) throw new NotFoundException('Miete nicht gefunden');

    // Berechtigung: Händler des Produkts
    const product = rental.order.productVariant.product;
    const merchantProfile = await this.merchantProfileRepo?.findOne({
      where: { userId: merchantUserId },
    });
    const resolvedMerchantId = merchantProfile?.id ?? merchantUserId;
    if (product.merchantId !== resolvedMerchantId && product.merchantId !== merchantUserId) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    // Bei Problem (Schaden/verloren): NICHT automatisch abschließen,
    // sondern Schadensmeldung erzeugen → Admin entscheidet (Feature 4)
    if (condition === 'damaged' || condition === 'lost' || condition === 'late') {
      await this.rentalRepo.update(rentalId, {
        merchantConfirmedReturn: true,
        merchantConfirmedAt: new Date(),
        returnCondition: condition,
      });
      // Schadensmeldung anlegen (falls Service verfügbar)
      this.logger.log(
        `Händler meldet Problem (${condition}) für Rental ${rentalId} → Admin-Review`,
      );
      return {
        message: 'Problem gemeldet — Kaution wird vom Admin geprüft',
        requiresAdminReview: true,
      };
    }

    // Zustand gut → Händler-Bestätigung setzen
    await this.rentalRepo.update(rentalId, {
      merchantConfirmedReturn: true,
      merchantConfirmedAt: new Date(),
      returnCondition: 'good',
    });

    await this.tryFinalizeReturn(rentalId);
    return { message: 'Rückgabe vom Händler bestätigt' };
  }

  /// Prüft, ob BEIDE bestätigt haben. Wenn ja UND Zustand gut →
  /// Kaution automatisch zurückerstatten + Miete abschließen.
  private async tryFinalizeReturn(rentalId: string) {
    const rental = await this.rentalRepo.findOne({
      where: { id: rentalId },
    });
    if (!rental) return;

    // Beide müssen bestätigt haben
    if (!rental.customerConfirmedReturn || !rental.merchantConfirmedReturn) {
      return; // noch nicht beide → warten
    }

    // Zustand muss gut sein (bei Schaden/verloren läuft es über Admin)
    if (rental.returnCondition && rental.returnCondition !== 'good') {
      return;
    }

    // Kaution zurückerstatten
    const deposit = await this.depositRepo.findOne({ where: { rentalId } });
    if (deposit && deposit.status === DepositStatus.HELD && deposit.stripeHoldId) {
      try {
        await this.paymentsService.refundDeposit(
            deposit.stripeHoldId, Number(deposit.amount));
        await this.depositRepo.update(deposit.id, {
          status: DepositStatus.RELEASED,
          releasedAt: new Date(),
          releaseReason: 'Beide Seiten haben die Rückgabe bestätigt',
          retainedAmount: 0,
        });
      } catch (e) {
        this.logger.error(`Auto-Kautions-Rückgabe fehlgeschlagen: ${e}`);
      }
    }

    // Miete + Order abschließen
    await this.rentalRepo.update(rentalId, {
      status: RentalStatus.RETURNED,
      returnedAt: new Date(),
      returnConfirmedAt: new Date(),
    });
    const full = await this.rentalRepo.findOne({
      where: { id: rentalId },
      relations: ['order'],
    });
    if (full?.order) {
      await this.orderRepo.update(full.order.id, { status: OrderStatus.RETURNED });
    }
    this.logger.log(`Miete ${rentalId} beidseitig bestätigt → abgeschlossen, Kaution zurück`);
  }

  // ─── Feature 5: Mietverlängerung ────────────────────────────────────────────

  /// Zeigt dem Kunden, ob und wie er verlängern kann.
  async getExtensionOptions(rentalId: string, userId: string) {
    const rental = await this.rentalRepo.findOne({
      where: { id: rentalId },
      relations: ['order', 'order.productVariant', 'order.productVariant.product'],
    });
    if (!rental) throw new NotFoundException('Miete nicht gefunden');
    if (rental.order.userId !== userId) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    // Nur solange das Kleid beim Kunden ist
    const extendable = [RentalStatus.ACTIVE, RentalStatus.OVERDUE].includes(rental.status);
    if (!extendable) {
      return { canExtend: false, reason: 'Verlängerung nur bei laufender Miete möglich' };
    }
    if (rental.customerConfirmedReturn) {
      return { canExtend: false, reason: 'Rücksendung wurde bereits bestätigt' };
    }

    // Limit prüfen
    const maxExtensions = parseInt(
      await this.settingsService.get('max_extensions_per_rental', '2'), 10) || 2;
    const used = await this.extensionRepo.count({
      where: { rentalId, status: ExtensionStatus.PAID },
    });
    if (used >= maxExtensions) {
      return {
        canExtend: false,
        reason: `Maximal ${maxExtensions} Verlängerungen erlaubt`,
      };
    }

    const product = rental.order.productVariant.product;
    const durations = await this.settingsService.getRentalDurations();

    // Gebühr pro Option: anteilig zum Mietpreis, OHNE Versandkosten
    const basePrice = Number(product.rentalPrice);
    const baseDays = Number(product.rentalDurationDays) || 1;
    const options = durations.map((days) => ({
      extraDays: days,
      // Tagespreis × zusätzliche Tage (kaufmännisch gerundet, kein Versand!)
      fee: Math.round((basePrice / baseDays) * days * 100) / 100,
    }));

    return {
      canExtend: true,
      currentEndDate: rental.endDate,
      extensionsUsed: used,
      maxExtensions,
      options,
      note: 'Die Verlängerungsgebühr enthält keine Versandkosten.',
    };
  }

  /// Legt eine Verlängerung an (unbezahlt). Der Client bezahlt danach über
  /// den normalen Payment-Flow (create-intent mit der zurückgegebenen orderId).
  async requestExtension(rentalId: string, userId: string, extraDays: number) {
    const opts = await this.getExtensionOptions(rentalId, userId);
    if (!opts.canExtend) {
      throw new BadRequestException(opts.reason ?? 'Verlängerung nicht möglich');
    }

    const chosen = opts.options?.find((o) => o.extraDays === extraDays);
    if (!chosen) {
      throw new BadRequestException('Ungültige Verlängerungsdauer');
    }

    const rental = await this.rentalRepo.findOne({
      where: { id: rentalId },
      relations: ['order'],
    });
    if (!rental) throw new NotFoundException('Miete nicht gefunden');

    const prevEnd = new Date(rental.endDate);
    const newEnd = addDays(prevEnd, extraDays);
    const newEndStr = newEnd.toISOString().split('T')[0];

    return this.dataSource.transaction(async (manager) => {
      // Order für die Verlängerungsgebühr (KEINE Versandkosten!)
      const order = manager.getRepository(Order).create({
        userId,
        productVariantId: rental.productVariantId,
        type: OrderType.RENTAL,
        status: OrderStatus.PENDING,
        totalPrice: chosen.fee,
        shippingAddress: rental.order.shippingAddress,
        // Verlängerung: KEIN Versand nötig, Kleid ist beim Kunden
        isExtension: true,
      });
      await manager.getRepository(Order).save(order);

      const ext = manager.getRepository(RentalExtension).create({
        rentalId,
        orderId: order.id,
        extraDays,
        fee: chosen.fee,
        previousEndDate: String(rental.endDate),
        newEndDate: newEndStr,
        status: ExtensionStatus.PENDING,
      });
      await manager.getRepository(RentalExtension).save(ext);

      this.logger.log(
        `Verlängerung angefragt: Rental ${rentalId}, +${extraDays} Tage, ${chosen.fee}€`,
      );

      return {
        extensionId: ext.id,
        orderId: order.id,       // damit der Client bezahlen kann
        extraDays,
        fee: chosen.fee,
        newEndDate: newEndStr,
      };
    });
  }

  /// Wird nach erfolgreicher Zahlung aufgerufen (vom Webhook).
  /// Verlängert das Enddatum der Miete.
  async confirmExtensionPaid(orderId: string) {
    const ext = await this.extensionRepo.findOne({ where: { orderId } });
    if (!ext || ext.status === ExtensionStatus.PAID) return;

    await this.extensionRepo.update(ext.id, {
      status: ExtensionStatus.PAID,
      paidAt: new Date(),
    });

    // Enddatum der Miete aktualisieren + ggf. Status zurück auf ACTIVE
    const rental = await this.rentalRepo.findOne({ where: { id: ext.rentalId } });
    if (rental) {
      await this.rentalRepo.update(rental.id, {
        endDate: ext.newEndDate,
        durationDays: Number(rental.durationDays) + Number(ext.extraDays),
        // War die Miete überfällig, ist sie durch die Verlängerung wieder aktiv
        status: rental.status === RentalStatus.OVERDUE
          ? RentalStatus.ACTIVE
          : rental.status,
      });
    }

    this.logger.log(
      `Verlängerung bezahlt: Rental ${ext.rentalId} läuft jetzt bis ${ext.newEndDate}`,
    );
  }

  async markOverdueRentals() {
    const today = new Date().toISOString().split('T')[0];

    // 1. Überfällige Mieten finden (Enddatum < heute, noch aktiv)
    const overdueRentals = await this.rentalRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.order', 'o')
      .leftJoinAndSelect('o.productVariant', 'pv')
      .leftJoinAndSelect('pv.product', 'p')
      .where('r.end_date < :today', { today })
      .andWhere('r.status = :status', { status: RentalStatus.ACTIVE })
      .getMany();

    let penaltyCount = 0;
    for (const rental of overdueRentals) {
      // Status auf OVERDUE setzen
      await this.rentalRepo.update(rental.id, { status: RentalStatus.OVERDUE });

      // Strafe nur einmal auslösen
      if (rental.penaltyAppliedAt) continue;

      try {
        await this.applyPenalty(rental);
        penaltyCount++;
      } catch (e) {
        this.logger.error(`Strafe für Rental ${rental.id} fehlgeschlagen: ${e}`);
      }
    }

    this.logger.log(
      `${overdueRentals.length} überfällig, ${penaltyCount} Strafen ausgelöst`,
    );
    return overdueRentals.length;
  }

  /// Löst die Strafe für eine überfällige Miete aus:
  /// 1. Kaution einbehalten (bereits abgebucht → bleibt einbehalten)
  /// 2. Strafbetrag des Produkts erfassen
  /// 3. Kunde per E-Mail informieren
  async applyPenalty(rental: Rental) {
    const product = rental.order?.productVariant?.product;
    const penaltyAmount = product?.penaltyAmount != null
      ? Number(product.penaltyAmount)
      : 0;

    // Kaution einbehalten (statt freigeben). Bei Option A ist sie schon
    // abgebucht — resolveDeposit markiert sie als RETAINED.
    await this.paymentsService.resolveDeposit(
      rental.id,
      true,
      'Mietartikel nicht fristgerecht zurückgegeben',
    );

    // Strafe am Rental vermerken
    await this.rentalRepo.update(rental.id, {
      penaltyAppliedAt: new Date(),
      penaltyAmount: penaltyAmount,
    });

    // Kunde benachrichtigen
    try {
      if (!rental.order?.id) return;
      const fullOrder = await this.orderRepo.findOne({
        where: { id: rental.order.id },
        relations: ['user'],
      });
      if (fullOrder?.user) {
        await this.notifications.sendOverduePenalty(fullOrder.user.email, {
          firstName: fullOrder.user.firstName,
          productTitle: product?.title || 'Mietartikel',
          penaltyAmount,
        });
      }
    } catch (e) {
      this.logger.error(`Strafe-E-Mail fehlgeschlagen: ${e}`);
    }

    this.logger.log(
      `Strafe ausgelöst für Rental ${rental.id}: Kaution einbehalten + ${penaltyAmount}€ Strafe`,
    );
  }
}
