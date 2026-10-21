import {
  Injectable, Logger, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
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
  // SQL-Bedingung: Eine Einnahme ist "reif" (auszahlbar), wenn die zugehörige
  // Bestellung abgeschlossen ist — Kauf: geliefert; Miete: zurückgegeben.
  // Einnahmen aus noch laufenden Mieten sind NICHT auszahlbar (könnten noch
  // storniert/zurückerstattet werden).
  private readonly MATURE_SQL =
    `((o.type = 'purchase' AND o.status = 'delivered') OR (o.type = 'rental' AND r.status = 'returned'))`;

  // QueryBuilder für offene (noch nicht ausgezahlte) UND reife Provisionen.
  private matureOpenCommissionsQB(merchantId: string) {
    return this.commissionRepo
      .createQueryBuilder('c')
      .leftJoin('orders', 'o', 'o.id = c.order_id')
      .leftJoin('rentals', 'r', 'r.order_id = o.id')
      .where('c.merchant_id = :merchantId', { merchantId })
      .andWhere('c.payout_id IS NULL')
      .andWhere(this.MATURE_SQL);
  }

  // Summe der auszahlbaren (reifen, offenen) Einnahmen.
  private async getMatureOpenSum(merchantId: string): Promise<number> {
    const row = await this.matureOpenCommissionsQB(merchantId)
      .select('COALESCE(SUM(c.merchant_amount),0)', 'amount')
      .getRawOne();
    return Math.round(Number(row?.amount ?? 0) * 100) / 100;
  }

  // Detaillierter Einnahmen-Verlauf: jede einzelne Provision (= ein Verkauf
  // oder eine Miete) mit Produkt, Datum, Brutto, Gebühr, Netto und Status.
  async getMerchantHistory(merchantId: string) {
    const rows = await this.commissionRepo
      .createQueryBuilder('c')
      .leftJoin('orders', 'o', 'o.id = c.order_id')
      .leftJoin('rentals', 'r', 'r.order_id = o.id')
      .leftJoin('product_variants', 'v', 'v.id = o.product_variant_id')
      .leftJoin('products', 'p', 'p.id = v.product_id')
      .select('c.id', 'id')
      .addSelect('c.created_at', 'createdAt')
      .addSelect('c.type', 'type')
      .addSelect('c.gross_price', 'gross')
      .addSelect('c.platform_amount', 'platformAmount')
      .addSelect('c.merchant_amount', 'merchantAmount')
      .addSelect('c.payout_id', 'payoutId')
      .addSelect('p.title', 'productTitle')
      .addSelect('v.size', 'size')
      .addSelect(`CASE WHEN ${this.MATURE_SQL} THEN 1 ELSE 0 END`, 'mature')
      .where('c.merchant_id = :merchantId', { merchantId })
      .orderBy('c.created_at', 'DESC')
      .getRawMany();

    return rows.map((r) => {
      const mature = Number(r.mature) === 1;
      // Status: ausgezahlt | auszahlbar (reif, offen) | in Arbeit (noch nicht reif)
      const status = r.payoutId ? 'paid' : (mature ? 'available' : 'upcoming');
      return {
        id: r.id,
        date: r.createdAt,
        type: r.type, // 'rental' | 'purchase'
        productTitle: r.productTitle || 'Produkt',
        size: r.size || '',
        gross: Number(r.gross ?? 0),
        fee: Number(r.platformAmount ?? 0),
        net: Number(r.merchantAmount ?? 0),
        mature,
        status,
      };
    });
  }

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

    // Offener Betrag aufteilen: auszahlbar (reif) vs. kommend (noch laufende Mieten).
    const totalOpen       = Number(pending?.pendingAmount ?? 0);
    const availablePayout = await this.getMatureOpenSum(merchantId);
    const upcomingPayout  = Math.round((totalOpen - availablePayout) * 100) / 100;

    return {
      totalEarned,
      totalCommission: Number(result?.totalCommission ?? 0),
      orderCount,
      // pendingPayout = tatsächlich JETZT auszahlbarer Betrag (reif)
      pendingPayout:   availablePayout,
      availablePayout,
      upcomingPayout:  Math.max(0, upcomingPayout),
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

    // Nur den auszahlbaren (REIFEN) Betrag anfragen — Einnahmen aus laufenden
    // Mieten werden erst nach Rückgabe & Abschluss auszahlbar.
    const amount = await this.getMatureOpenSum(merchantId);

    if (amount <= 0) {
      throw new BadRequestException(
        'Kein auszahlbarer Betrag vorhanden. Einnahmen aus laufenden Mieten werden erst nach der Rückgabe auszahlbar.'
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

    // Nur die REIFEN (auszahlbaren) offenen Provisionen markieren — Einnahmen
    // aus laufenden Mieten bleiben offen und werden erst nach Abschluss
    // auszahlbar. Der tatsächlich ausgezahlte Betrag wird daraus berechnet
    // (Quelle der Wahrheit zum Auszahlungszeitpunkt).
    const matureRows = await this.matureOpenCommissionsQB(payout.merchantId)
      .select('c.id', 'id')
      .addSelect('c.merchant_amount', 'amt')
      .getRawMany();
    const matureIds = matureRows.map((r) => r.id);
    const actualAmount =
      Math.round(matureRows.reduce((a, r) => a + Number(r.amt || 0), 0) * 100) / 100;

    if (matureIds.length) {
      await this.commissionRepo.update({ id: In(matureIds) }, { payoutId: payout.id });
    }

    // Automatischer Stripe Transfer wenn Händler Connected Account hat
    let finalTransferId = stripeTransferId || null;
    if (!finalTransferId && merchant?.stripeAccountId && actualAmount > 0) {
      try {
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
        const transfer = await stripe.transfers.create({
          amount: Math.round(actualAmount * 100), // Cents
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

    // Payout als bezahlt markieren — Betrag auf den tatsächlich ausgezahlten
    // (reifen) Wert setzen, damit Datensatz und Überweisung übereinstimmen.
    await this.payoutRepo.update(payoutId, {
      status: PayoutStatus.PAID,
      amount: actualAmount,
      stripeTransferId: finalTransferId,
      paidAt: new Date(),
      reviewedBy: adminId,
      reviewedAt: new Date(),
    });

    // Merchant Balance updaten
    if (merchant) {
      await this.merchantRepo.update(merchant.id, {
        balancePaid: Math.round((Number(merchant.balancePaid) + actualAmount) * 100) / 100,
      });
    }

    return { message: `€${actualAmount.toFixed(2)} Auszahlung genehmigt` };
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
