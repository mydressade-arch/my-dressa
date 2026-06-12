import {
  Injectable, Logger, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Commission } from './commission.entity';
import { MerchantPayout, PayoutStatus } from './merchant-payout.entity';
import { MerchantProfile } from '../users/merchant-profile.entity';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);
  constructor(
    @InjectRepository(Commission)
    private readonly commissionRepo: Repository<Commission>,
    @InjectRepository(MerchantPayout)
    private readonly payoutRepo: Repository<MerchantPayout>,
    @InjectRepository(MerchantProfile)
    private readonly merchantRepo: Repository<MerchantProfile>,
  ) {}

  // ── Händler: Statistiken ─────────────────────────────────────────────────
  async getMerchantStats(merchantId: string) {
    const result = await this.commissionRepo
      .createQueryBuilder('c')
      .select('SUM(c.merchant_amount)', 'totalEarned')
      .addSelect('SUM(c.platform_amount)', 'totalCommission')
      .addSelect('COUNT(*)', 'orderCount')
      .where('c.merchant_id = :merchantId', { merchantId })
      .getRawOne();

    // Ausstehend = Commissions ohne Payout
    const pending = await this.commissionRepo
      .createQueryBuilder('c')
      .select('SUM(c.merchant_amount)', 'pendingAmount')
      .where('c.merchant_id = :merchantId', { merchantId })
      .andWhere('c.payout_id IS NULL')
      .getRawOne();

    // Offene Auszahlungsanfragen
    const openRequests = await this.payoutRepo.count({
      where: { merchantId, status: PayoutStatus.PENDING },
    });

    // Fallback: Orders direkt zählen wenn noch keine Commissions existieren
    // (z.B. wenn Webhook noch nicht gefeuert hat)
    const totalEarned = Number(result?.totalEarned ?? 0);
    const orderCount  = Number(result?.orderCount ?? 0);

    return {
      totalEarned,
      totalCommission: Number(result?.totalCommission ?? 0),
      orderCount,
      pendingPayout:   Number(pending?.pendingAmount ?? 0),
      openRequests,
      // Hinweis wenn Earnings 0 aber Orders existieren
      webhookNote: totalEarned === 0
        ? 'Falls du Bestellungen hast: prüfe ob der Stripe Webhook aktiv ist (stripe listen)'
        : null,
    };
  }

  // ── Händler: Auszahlung anfragen ─────────────────────────────────────────
  async requestPayout(merchantId: string, note?: string) {
    // Prüfen ob bereits eine offene Anfrage existiert
    const existing = await this.payoutRepo.findOne({
      where: { merchantId, status: PayoutStatus.PENDING },
    });
    if (existing) {
      throw new ConflictException(
        'Du hast bereits eine offene Auszahlungsanfrage. Bitte warte bis sie bearbeitet wurde.'
      );
    }

    // Ausstehenden Betrag berechnen
    const pending = await this.commissionRepo
      .createQueryBuilder('c')
      .select('SUM(c.merchant_amount)', 'amount')
      .where('c.merchant_id = :merchantId', { merchantId })
      .andWhere('c.payout_id IS NULL')
      .getRawOne();

    const amount = Number(pending?.amount ?? 0);

    if (amount <= 0) {
      throw new BadRequestException(
        'Kein ausstehender Betrag für eine Auszahlung vorhanden.'
      );
    }

    // Auszahlungsanfrage erstellen
    const payout = this.payoutRepo.create({
      merchantId,
      amount,
      status: PayoutStatus.PENDING,
      note: note?.trim() || null,
    });
    await this.payoutRepo.save(payout);

    return {
      message: `Auszahlungsanfrage über €${amount.toFixed(2)} wurde gestellt. Ein Admin wird sie in Kürze bearbeiten.`,
      payoutId: payout.id,
      amount,
    };
  }

  // ── Händler: Auszahlungshistorie ─────────────────────────────────────────
  async getMerchantPayouts(merchantId: string) {
    return this.payoutRepo.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Admin: Alle offenen Anfragen ─────────────────────────────────────────
  async getAllPendingPayouts() {
    return this.payoutRepo.find({
      where: { status: PayoutStatus.PENDING },
      order: { createdAt: 'ASC' }, // älteste zuerst
    });
  }

  // ── Admin: Alle Anfragen (mit Filter) ────────────────────────────────────
  async getAllPayouts(status?: PayoutStatus) {
    const where: any = {};
    if (status) where.status = status;
    return this.payoutRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // ── Admin: Auszahlung genehmigen ─────────────────────────────────────────
  async approvePayout(payoutId: string, adminId: string, stripeTransferId?: string) {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Auszahlung nicht gefunden');
    if (payout.status !== PayoutStatus.PENDING) {
      throw new ConflictException('Auszahlung wurde bereits bearbeitet');
    }

    // Merchant Profil laden für Balance-Update
    const merchant = await this.merchantRepo.findOne({
      where: { id: payout.merchantId },
    });

    // Alle offenen Commissions dieser Anfrage als bezahlt markieren
    const openCommissions = await this.commissionRepo.find({
      where: { merchantId: payout.merchantId, payoutId: IsNull() },
    });
    for (const commission of openCommissions) {
      await this.commissionRepo.update(commission.id, { payoutId: payout.id });
    }

    // Automatischer Stripe Transfer wenn Händler Connected Account hat
    let finalTransferId = stripeTransferId || null;
    if (!finalTransferId && merchant?.stripeAccountId) {
      try {
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
        const transfer = await stripe.transfers.create({
          amount: Math.round(Number(payout.amount) * 100), // Cents
          currency: 'eur',
          destination: merchant.stripeAccountId,
          description: `My Dressa Payout - ${payoutId}`,
          metadata: { payoutId, merchantId: payout.merchantId },
        });
        finalTransferId = transfer.id;
        this.logger.log(`Stripe Transfer erstellt: ${transfer.id} für Händler ${payout.merchantId}`);
      } catch (e: any) {
        this.logger.warn(`Stripe Transfer fehlgeschlagen: ${e.message} — Payout trotzdem als bezahlt markiert`);
      }
    }

    // Payout als bezahlt markieren
    await this.payoutRepo.update(payoutId, {
      status: PayoutStatus.PAID,
      stripeTransferId: finalTransferId,
      paidAt: new Date(),
      reviewedBy: adminId,
      reviewedAt: new Date(),
    });

    // Merchant Balance updaten
    if (merchant) {
      await this.merchantRepo.update(merchant.id, {
        balancePaid: Number(merchant.balancePaid) + Number(payout.amount),
      });
    }

    return { message: `€${Number(payout.amount).toFixed(2)} Auszahlung genehmigt` };
  }

  // ── Admin: Auszahlung ablehnen ────────────────────────────────────────────
  async rejectPayout(payoutId: string, adminId: string, reason?: string) {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Auszahlung nicht gefunden');
    if (payout.status !== PayoutStatus.PENDING) {
      throw new ConflictException('Auszahlung wurde bereits bearbeitet');
    }

    await this.payoutRepo.update(payoutId, {
      status: PayoutStatus.FAILED,
      note: reason ? `Abgelehnt: ${reason}` : 'Abgelehnt durch Admin',
      reviewedBy: adminId,
      reviewedAt: new Date(),
    });

    return { message: 'Auszahlung abgelehnt' };
  }

  // ── Admin: Report ─────────────────────────────────────────────────────────
  async getAdminReport() {
    return this.commissionRepo
      .createQueryBuilder('c')
      .select('SUM(c.platform_amount)', 'totalPlatformRevenue')
      .addSelect('SUM(c.merchant_amount)', 'totalMerchantPayouts')
      .addSelect('COUNT(*)', 'totalOrders')
      .addSelect('c.type', 'type')
      .groupBy('c.type')
      .getRawMany();
  }
}
