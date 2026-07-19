import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { DamageReport, DamageSeverity, DamageReportStatus } from './damage-report.entity';
import { Rental } from './rental.entity';
import { Deposit, DepositStatus } from './deposit.entity';
import { StorageService } from '../products/storage.service';

@Injectable()
export class DamageReportsService {
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(DamageReport)
    private readonly reportRepo: Repository<DamageReport>,
    @InjectRepository(Rental)
    private readonly rentalRepo: Repository<Rental>,
    @InjectRepository(Deposit)
    private readonly depositRepo: Repository<Deposit>,
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2023-10-16',
    });
  }

  // ── Händler: Schaden melden ───────────────────────────────────────────────
  async createReport(dto: {
    rentalId: string;
    reportedBy: string;
    description: string;
    severity: DamageSeverity;
    photos?: Express.Multer.File[];
  }): Promise<DamageReport> {
    const rental = await this.rentalRepo.findOne({
      where: { id: dto.rentalId },
      relations: ['order'],
    });
    if (!rental) throw new NotFoundException('Miete nicht gefunden');

    const photoUrls: string[] = [];
    if (dto.photos?.length) {
      for (const photo of dto.photos) {
        const url = await this.storageService.uploadProductImage(photo, `damages/${dto.reportedBy}`);
        photoUrls.push(url);
      }
    }

    if (photoUrls.length) {
      await this.rentalRepo.update(dto.rentalId, { damagePhotoUrls: photoUrls });
    }

    const report = this.reportRepo.create({
      rentalId:   dto.rentalId,
      orderId:    rental.orderId,
      reportedBy: dto.reportedBy,
      description: dto.description,
      severity:   dto.severity,
      photoUrls,
      status:     DamageReportStatus.OPEN,
    });

    return this.reportRepo.save(report);
  }

  // ── Händler: eigene Reports ───────────────────────────────────────────────
  async getMerchantReports(merchantId: string): Promise<DamageReport[]> {
    return this.reportRepo.find({
      where: { reportedBy: merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Admin: alle Reports ───────────────────────────────────────────────────
  async getAllReports(status?: DamageReportStatus): Promise<DamageReport[]> {
    const where: any = {};
    if (status) where.status = status;
    return this.reportRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // ── Admin: Kaution freigeben ──────────────────────────────────────────────
  async releaseDeposit(reportId: string, adminId: string, note?: string): Promise<DamageReport> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report nicht gefunden');
    if (report.status === DamageReportStatus.RESOLVED) {
      throw new BadRequestException('Report bereits gelöst');
    }

    const deposit = await this.depositRepo.findOne({ where: { rentalId: report.rentalId } });

    // Option A: Die Kaution wurde bereits abgebucht → zurückERSTATTEN.
    // (Früher war es ein Hold, der gecancelt wurde. Holds verfallen aber
    //  nach 7 Tagen, deshalb wird jetzt sofort abgebucht.)
    if (deposit?.stripeHoldId && deposit.status !== DepositStatus.RELEASED) {
      try {
        // NUR den Kautionsbetrag erstatten — die Zahlung enthält auch die Miete!
        await this.stripe.refunds.create({
          payment_intent: deposit.stripeHoldId,
          amount: Math.round(Number(deposit.amount) * 100),
        });
      } catch (e: any) {
        console.warn(`Stripe refund skipped: ${e.message}`);
      }
    }

    // Deposit freigeben
    if (deposit) {
      await this.depositRepo.update(deposit.id, {
        status: DepositStatus.RELEASED,
        retainedAmount: 0,
        releasedAt: new Date(),
        releaseReason: note || 'Kaution freigegeben durch Admin',
      });
    }

    // Report lösen
    await this.reportRepo.update(reportId, {
      status:     DamageReportStatus.RESOLVED,
      resolution: `✓ Kaution freigegeben${note ? `: ${note}` : ''}`,
      resolvedBy: adminId,
      resolvedAt: new Date(),
    });

    return this.reportRepo.findOne({ where: { id: reportId } }) as Promise<DamageReport>;
  }

  // ── Admin: Kaution einbehalten ────────────────────────────────────────────
  async retainDeposit(
    reportId: string,
    adminId: string,
    note?: string,
    merchantAmount?: number,  // Betrag der an den Händler geht
  ): Promise<DamageReport & { transferId?: string }> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report nicht gefunden');
    if (report.status === DamageReportStatus.RESOLVED) {
      throw new BadRequestException('Report bereits gelöst');
    }

    const deposit = await this.depositRepo.findOne({
      where: { rentalId: report.rentalId },
    });

    // Option A: Die Kaution ist BEREITS abgebucht (kein Hold mehr).
    // Einbehalten = Geld bleibt bei uns; ein Capture ist nicht nötig.
    // Wenn der Admin nur einen TEIL einbehält, bekommt der Kunde den
    // Rest per Teil-Refund zurück.
    const depositTotal = deposit ? Number(deposit.amount) : 0;
    const retainRaw = merchantAmount && merchantAmount > 0
      ? Number(merchantAmount)
      : depositTotal;
    // Sicherheit: nie mehr einbehalten als die Kaution hergibt
    const retained = Math.min(Math.max(retainRaw, 0), depositTotal);
    const refundToCustomer = Math.round((depositTotal - retained) * 100) / 100;

    // Teilbetrag an den Kunden zurückerstatten (falls nicht alles einbehalten wird)
    if (deposit?.stripeHoldId && refundToCustomer > 0) {
      try {
        await this.stripe.refunds.create({
          payment_intent: deposit.stripeHoldId,
          amount: Math.round(refundToCustomer * 100),
        });
        console.log(`Teil-Rückerstattung an Kunden: €${refundToCustomer}`);
      } catch (e: any) {
        console.warn(`Teil-Rückerstattung fehlgeschlagen: ${e.message}`);
      }
    }

    // 2. Transfer an Händler wenn merchantAmount > 0
    let transferId: string | undefined;
    if (retained > 0 && deposit) {
      try {
        // Händler Connected Account laden
        const rental = await this.rentalRepo.findOne({
          where: { id: report.rentalId },
          relations: ['order', 'order.productVariant', 'order.productVariant.product', 'order.productVariant.product.merchant'],
        });
        const merchantStripeId = rental?.order?.productVariant?.product?.merchant?.stripeAccountId;

        if (merchantStripeId) {
          const transfer = await this.stripe.transfers.create({
            amount: Math.round(retained * 100),
            currency: 'eur',
            destination: merchantStripeId,
            description: `Schadensentschädigung - ${reportId}`,
            metadata: { reportId, type: 'damage_compensation' },
          });
          transferId = transfer.id;
          console.log(`Transfer an Händler: ${transfer.id} €${retained}`);
        }
      } catch (e: any) {
        console.warn(`Transfer an Händler fehlgeschlagen: ${e.message}`);
      }
    }

    // 3. Deposit in DB aktualisieren
    if (deposit) {
      await this.depositRepo.update(deposit.id, {
        status: DepositStatus.RETAINED,
        retainedAmount: retained,
        releasedAt: new Date(),
        releaseReason: note || 'Kaution (teilweise) einbehalten',
      });
    }

    // 4. Report lösen
    const resolution = [
      retained >= depositTotal
        ? `✗ Kaution komplett einbehalten (€${retained})`
        : `✗ €${retained} einbehalten, €${refundToCustomer} an Kunden zurück`,
      retained > 0 ? `€${retained} an Händler überwiesen` : null,
      note || null,
    ].filter(Boolean).join(' — ');

    await this.reportRepo.update(reportId, {
      status:     DamageReportStatus.RESOLVED,
      resolution,
      resolvedBy: adminId,
      resolvedAt: new Date(),
    });

    const result = await this.reportRepo.findOne({ where: { id: reportId } }) as any;
    return { ...result, transferId };
  }
}
