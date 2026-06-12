import {
  Injectable, BadRequestException, ConflictException,
  NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { differenceInDays, parseISO, isAfter, isBefore, addDays } from 'date-fns';

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

// Geschäftsregeln — zentral definiert
const RULES = {
  MAX_RENTAL_DAYS: 7,
  MAX_ACTIVE_RENTALS_PER_USER: 3,
  // DEPOSIT_AMOUNT entfernt — wird aus product.depositAmount gelesen
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
  ) {}

  // ─── AVAILABILITY CHECK (öffentlich) ────────────────────────
  async checkAvailability(
    productVariantId: string,
    startDate: string,
    endDate: string,
  ): Promise<{ available: boolean; blockedRanges: { start: string; end: string }[] }> {

    // Alle aktiven Buchungen für diese Variante laden
    const activeRentals = await this.rentalRepo
      .createQueryBuilder('r')
      .where('r.productVariantId = :variantId', { variantId: productVariantId })
      .andWhere('r.status NOT IN (:...excluded)', {
        excluded: [RentalStatus.CANCELLED, RentalStatus.RETURNED],
      })
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
    const startDate = parseISO(dto.startDate);
    const endDate = parseISO(dto.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── Validierungen ──────────────────────────────────────────
    if (isBefore(startDate, today)) {
      throw new BadRequestException('Startdatum muss in der Zukunft liegen');
    }
    if (!isAfter(endDate, startDate)) {
      throw new BadRequestException('Enddatum muss nach dem Startdatum liegen');
    }

    const durationDays = differenceInDays(endDate, startDate);
    if (durationDays > RULES.MAX_RENTAL_DAYS) {
      throw new BadRequestException(
        `Maximale Mietdauer: ${RULES.MAX_RENTAL_DAYS} Tage`,
      );
    }
    if (durationDays < 1) {
      throw new BadRequestException('Mindestmietdauer: 1 Tag');
    }

    // ── Nutzer-Limit prüfen ────────────────────────────────────
    const activeCount = await this.rentalRepo
      .createQueryBuilder('r')
      .innerJoin('r.order', 'o')
      .where('o.user_id = :userId', { userId })
      .andWhere('r.status IN (:...active)', {
        active: [RentalStatus.PENDING, RentalStatus.ACTIVE],  // PENDING_RETURN & RETURNED nicht mitzählen
      })
      // Stornierte Orders nicht mitzählen
      .andWhere('o.status != :cancelled', { cancelled: 'cancelled' })
      .getCount();

    // Nur in Production limitieren
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

    const rentalPrice  = Number(variant.product.rentalPrice) * durationDays;
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
        .andWhere('r.start_date < :endDate', { endDate: dto.endDate })
        .andWhere('r.end_date > :startDate', { startDate: dto.startDate })
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
        shippingAddress: dto.shippingAddress,
      });
      await manager.getRepository(Order).save(order);

      // Rental erstellen
      const rental = manager.getRepository(Rental).create({
        orderId: order.id,
        productVariantId: dto.productVariantId,
        startDate: dto.startDate,
        endDate: dto.endDate,
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
        startDate: dto.startDate,
        endDate: dto.endDate,
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
        await manager.getRepository(Deposit).update(deposit.id, {
          status: depositStatus,
          releasedAt: new Date(),
          releaseReason,
          retainedAmount: depositStatus === DepositStatus.RELEASED ? 0 : deposit.amount,
        });
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

  async markOverdueRentals() {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.rentalRepo
      .createQueryBuilder()
      .update(Rental)
      .set({ status: RentalStatus.OVERDUE })
      .where('end_date < :today', { today })
      .andWhere('status = :status', { status: RentalStatus.ACTIVE })
      .execute();

    this.logger.log(`${result.affected} Mieten als überfällig markiert`);
    return result.affected;
  }
}
