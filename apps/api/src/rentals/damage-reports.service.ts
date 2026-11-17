import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { DamageReport, DamageSeverity, DamageReportStatus } from './damage-report.entity';
import { Rental, RentalStatus } from './rental.entity';
import { Order, OrderStatus, OrderType } from '../orders/order.entity';
import { Commission } from '../commissions/commission.entity';
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

    // Doppelmeldungen verhindern: Es gibt nur EINE Kaution pro Miete. Besteht
    // bereits eine offene Meldung für diese Miete, keine zweite anlegen —
    // sonst bliebe die zweite „offen" hängen, nachdem die erste die Kaution
    // bereits entschieden hat.
    const existingOpen = await this.reportRepo.findOne({
      where: { rentalId: dto.rentalId, status: In([DamageReportStatus.OPEN, DamageReportStatus.REVIEWING]) },
    });
    if (existingOpen) {
      throw new BadRequestException(
        'Für diese Miete besteht bereits eine offene Schadensmeldung. Bitte warte, bis der Admin sie bearbeitet hat.',
      );
    }

    // Es gibt nur EINE Kaution pro Miete. Wurde sie bereits entschieden
    // (freigegeben oder einbehalten), ist der Vorgang abgeschlossen — eine
    // erneute Schadensmeldung/Erstattungsforderung ist dann nicht mehr möglich.
    const deposit = await this.depositRepo.findOne({ where: { rentalId: dto.rentalId } });
    if (deposit && (
      deposit.status === DepositStatus.RELEASED ||
      deposit.status === DepositStatus.RETAINED ||
      deposit.status === DepositStatus.PARTIALLY_RETAINED
    )) {
      throw new BadRequestException(
        'Die Kaution dieser Miete wurde bereits final entschieden. Eine erneute Schadensmeldung ist nicht mehr möglich.',
      );
    }

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
  async getMerchantReports(merchantId: string): Promise<any[]> {
    const reports = await this.reportRepo.find({
      where: { reportedBy: merchantId },
      order: { createdAt: 'DESC' },
    });

    // Kautionsstatus je Miete anhängen, damit das Frontend den "Schaden
    // melden"-Button ausblenden kann, sobald die Kaution entschieden ist.
    const rentalIds = [...new Set(reports.map((r) => r.rentalId))];
    const deposits = rentalIds.length
      ? await this.depositRepo.find({ where: { rentalId: In(rentalIds) } })
      : [];
    const depByRental = new Map(deposits.map((d) => [d.rentalId, d.status]));

    return reports.map((r) => ({
      ...r,
      depositStatus: depByRental.get(r.rentalId) ?? null,
    }));
  }

  // ── Admin: alle Reports ───────────────────────────────────────────────────
  async getAllReports(status?: DamageReportStatus): Promise<any[]> {
    // Angereicherte Liste: Produkt (Titel, Größe, Bild), Kunde, Mietzeitraum
    // und Kaution — damit der Admin sofort sieht, worum es geht, statt nur
    // einer nackten Meldung mit IDs.
    const qb = this.reportRepo
      .createQueryBuilder('dr')
      .leftJoin('rentals', 'r', 'r.id = dr.rental_id')
      .leftJoin('orders', 'o', 'o.id = dr.order_id')
      .leftJoin('product_variants', 'v', 'v.id = o.product_variant_id')
      .leftJoin('products', 'p', 'p.id = v.product_id')
      .leftJoin('users', 'u', 'u.id = o.user_id')
      .leftJoin('deposits', 'd', 'd.rental_id = dr.rental_id')
      .select('dr.id', 'id')
      .addSelect('dr.rentalId', 'rentalId')
      .addSelect('dr.orderId', 'orderId')
      .addSelect('dr.description', 'description')
      .addSelect('dr.severity', 'severity')
      .addSelect('dr.status', 'status')
      .addSelect('dr.resolution', 'resolution')
      .addSelect('dr.photoUrls', 'photoUrls')
      .addSelect('dr.createdAt', 'createdAt')
      .addSelect('p.title', 'productTitle')
      .addSelect('v.size', 'size')
      .addSelect('u.first_name', 'firstName')
      .addSelect('u.last_name', 'lastName')
      .addSelect('u.email', 'email')
      .addSelect('r.start_date', 'startDate')
      .addSelect('r.end_date', 'endDate')
      .addSelect('d.amount', 'depositAmount')
      .addSelect('d.status', 'depositStatus')
      .addSelect(
        `(SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1)`,
        'productImage',
      );

    if (status) qb.where('dr.status = :status', { status });
    qb.orderBy('dr.created_at', 'DESC');

    const rows = await qb.getRawMany();

    return rows.map((r) => ({
      id:          r.id,
      rentalId:    r.rentalId,
      orderId:     r.orderId,
      description: r.description,
      severity:    r.severity,
      status:      r.status,
      resolution:  r.resolution,
      photoUrls:   Array.isArray(r.photoUrls) ? r.photoUrls : [],
      createdAt:   r.createdAt,
      product: {
        title: r.productTitle || 'Produkt',
        size:  r.size || '',
        image: r.productImage || null,
      },
      customer: {
        name:  [r.firstName, r.lastName].filter(Boolean).join(' ') || '—',
        email: r.email || '',
      },
      rental: {
        startDate: r.startDate || null,
        endDate:   r.endDate || null,
      },
      deposit: {
        amount: r.depositAmount != null ? Number(r.depositAmount) : null,
        status: r.depositStatus || null,
      },
    }));
  }

  // Andere noch offene Meldungen DERSELBEN Miete automatisch mitschließen.
  // Die Kaution-Entscheidung gilt für die ganze Miete, nicht pro Meldung —
  // so bleibt keine „offene" Zweitmeldung hängen.
  private async closeSiblingReports(rentalId: string, exceptReportId: string, adminId: string) {
    const siblings = await this.reportRepo.find({
      where: {
        rentalId,
        id: Not(exceptReportId),
        status: In([DamageReportStatus.OPEN, DamageReportStatus.REVIEWING]),
      },
    });
    for (const s of siblings) {
      await this.reportRepo.update(s.id, {
        status:     DamageReportStatus.RESOLVED,
        resolution: 'Automatisch geschlossen — die Kaution dieser Miete wurde über eine andere Meldung entschieden.',
        resolvedBy: adminId,
        resolvedAt: new Date(),
      });
    }
  }

  // ── Admin: Meldung schließen OHNE Kautions-Aktion ─────────────────────────
  // Für Duplikate/irrtümliche Meldungen: schließt die Meldung, rührt die
  // Kaution NICHT an (z. B. weil sie über eine andere Meldung schon entschieden
  // wurde). So lässt sich eine hängende Zweitmeldung endlich erledigen.
  async dismissReport(reportId: string, adminId: string, note?: string): Promise<DamageReport> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report nicht gefunden');
    if (report.status === DamageReportStatus.RESOLVED) {
      throw new BadRequestException('Report bereits gelöst');
    }
    await this.reportRepo.update(reportId, {
      status:     DamageReportStatus.RESOLVED,
      resolution: `Meldung geschlossen (keine Kautions-Aktion)${note ? `: ${note}` : ''}`,
      resolvedBy: adminId,
      resolvedAt: new Date(),
    });
    return this.reportRepo.findOne({ where: { id: reportId } }) as Promise<DamageReport>;
  }

  // ── Admin: Kaution freigeben ──────────────────────────────────────────────
  async releaseDeposit(reportId: string, adminId: string, note?: string): Promise<DamageReport> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report nicht gefunden');
    if (report.status === DamageReportStatus.RESOLVED) {
      throw new BadRequestException('Report bereits gelöst');
    }

    const deposit = await this.depositRepo.findOne({ where: { rentalId: report.rentalId } });

    // Schutz: Eine bereits EINBEHALTENE Kaution darf nicht nachträglich
    // freigegeben werden (sonst würde das einbehaltene Geld zurückerstattet).
    if (deposit && (deposit.status === DepositStatus.RETAINED ||
                    deposit.status === DepositStatus.PARTIALLY_RETAINED)) {
      throw new BadRequestException(
        'Kaution wurde für diese Miete bereits einbehalten — Freigabe nicht mehr möglich.',
      );
    }

    // Kaution freigeben: Die Kaution ist nur RESERVIERT (Hold), nicht
    // abgebucht. Freigeben = die Reservierung aufheben (cancel).
    // → Das Geld ist sofort wieder beim Kunden verfügbar, KEINE Gebühr.
    if (deposit?.stripeHoldId && deposit.status !== DepositStatus.RELEASED) {
      try {
        await this.stripe.paymentIntents.cancel(deposit.stripeHoldId);
      } catch (e: any) {
        // Falls der Hold schon abgelaufen/eingezogen ist, oder es sich um
        // eine alte, bereits abgebuchte Kaution handelt → als Fallback
        // zurückerstatten (damit der Kunde sein Geld in jedem Fall bekommt).
        console.warn(`Hold-Cancel fehlgeschlagen (${e.message}) — versuche Refund`);
        try {
          await this.stripe.refunds.create({
            payment_intent: deposit.stripeHoldId,
            amount: Math.round(Number(deposit.amount) * 100),
          });
        } catch (e2: any) {
          console.warn(`Refund-Fallback ebenfalls fehlgeschlagen: ${e2.message}`);
        }
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

    // Weitere offene Meldungen derselben Miete automatisch mitschließen.
    await this.closeSiblingReports(report.rentalId, reportId, adminId);

    // Die Rückgabe ist mit der Kautions-Entscheidung abgeschlossen: Miete +
    // Order auf "zurückgegeben" setzen. Sonst bliebe die Provision auf "In
    // Arbeit" hängen und der "Rückgabe bestätigen"-Button würde weiter angezeigt.
    await this.completeReturn(report.rentalId);

    return this.reportRepo.findOne({ where: { id: reportId } }) as Promise<DamageReport>;
  }

  // Schließt die Miet-Rückgabe nach einer Kautions-Entscheidung ab.
  // Ein bereits stornierter Status wird nie überschrieben.
  private async completeReturn(rentalId: string): Promise<void> {
    const rental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    if (!rental) return;

    if (rental.status !== RentalStatus.RETURNED && rental.status !== RentalStatus.CANCELLED) {
      await this.rentalRepo.update(rentalId, {
        status: RentalStatus.RETURNED,
        returnedAt: new Date(),
      });
    }

    if (rental.orderId) {
      const orderRepo = this.rentalRepo.manager.getRepository(Order);
      const order = await orderRepo.findOne({ where: { id: rental.orderId } });
      if (order && order.status !== OrderStatus.RETURNED && order.status !== OrderStatus.CANCELLED) {
        await orderRepo.update(rental.orderId, { status: OrderStatus.RETURNED });
      }
    }
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

    // Schutz: Eine bereits aufgelöste Kaution (freigegeben oder einbehalten)
    // darf nicht erneut einbehalten werden. Verhindert Konflikte, wenn für
    // dieselbe Miete mehrere Meldungen existieren.
    if (deposit && (deposit.status === DepositStatus.RELEASED ||
                    deposit.status === DepositStatus.RETAINED ||
                    deposit.status === DepositStatus.PARTIALLY_RETAINED)) {
      throw new BadRequestException(
        'Kaution wurde für diese Miete bereits aufgelöst (freigegeben oder einbehalten) — keine weitere Aktion möglich.',
      );
    }

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

    // Kaution EINZIEHEN. Zuerst den ECHTEN Status bei Stripe prüfen und nur
    // dann einziehen, wenn der Hold noch gültig ist. moneyCollected merkt sich,
    // ob tatsächlich Geld geflossen ist — der Transfer an den Händler darf NUR
    // dann laufen, sonst zahlt die Plattform aus eigener Tasche (Geld-Leck).
    let moneyCollected = false;
    if (deposit?.stripeHoldId && retained > 0) {
      const pi = await this.stripe.paymentIntents.retrieve(deposit.stripeHoldId);
      if (pi.status === 'requires_capture') {
        // Reservierter Hold → genau den einbehaltenen Betrag einziehen.
        // Der Rest der Reservierung wird von Stripe automatisch freigegeben.
        await this.stripe.paymentIntents.capture(deposit.stripeHoldId, {
          amount_to_capture: Math.round(retained * 100),
        });
        moneyCollected = true;
        console.log(`Kaution eingezogen: €${retained} (Rest automatisch freigegeben)`);
      } else if (pi.status === 'succeeded') {
        // Alt-Modell: Kaution war bereits abgebucht → nur den Rest zurück.
        moneyCollected = true;
        if (refundToCustomer > 0) {
          await this.stripe.refunds.create({
            payment_intent: deposit.stripeHoldId,
            amount: Math.round(refundToCustomer * 100),
          });
        }
      } else {
        // canceled / o. Ä. → Hold bereits freigegeben, es gibt nichts einzuziehen.
        throw new BadRequestException(
          `Kaution kann nicht einbehalten werden — Status der Reservierung: ${pi.status}. ` +
          `Sie wurde vermutlich bereits freigegeben.`,
        );
      }
    }

    // 2. Transfer an Händler — NUR wenn wirklich Geld eingezogen wurde.
    let transferId: string | undefined;
    if (moneyCollected && retained > 0 && deposit) {
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

    // 2b. Wurde die Entschädigung NICHT per Stripe ausgezahlt (Händler ohne
    // verknüpftes Stripe-Konto oder Transfer fehlgeschlagen)? Dann dem Händler-
    // Guthaben gutschreiben, damit der Betrag in der Auszahlungsliste auftaucht
    // und der Admin ihn manuell überweisen kann — klar als Schadensersatz
    // gekennzeichnet (kind='damage_compensation', 0 % Plattformgebühr).
    if (moneyCollected && retained > 0 && !transferId) {
      try {
        const r = await this.rentalRepo.findOne({
          where: { id: report.rentalId },
          relations: ['order', 'order.productVariant', 'order.productVariant.product'],
        });
        const merchantId = (r as any)?.order?.productVariant?.product?.merchantId;
        if (merchantId && r?.orderId) {
          const commissionRepo = this.rentalRepo.manager.getRepository(Commission);
          await commissionRepo.save(commissionRepo.create({
            orderId:        r.orderId,
            merchantId,
            grossPrice:     retained,
            rate:           0,
            platformAmount: 0,
            merchantAmount: retained,
            type:           OrderType.RENTAL,
            kind:           'damage_compensation',
          }));
          console.log(`Schadensersatz dem Händler-Guthaben gutgeschrieben: €${retained}`);
        }
      } catch (e: any) {
        console.warn(`Schadensersatz-Gutschrift fehlgeschlagen: ${e.message}`);
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

    // Weitere offene Meldungen derselben Miete automatisch mitschließen.
    await this.closeSiblingReports(report.rentalId, reportId, adminId);

    // Rückgabe abschließen (siehe releaseDeposit): Miete + Order → zurückgegeben.
    await this.completeReturn(report.rentalId);

    const result = await this.reportRepo.findOne({ where: { id: reportId } }) as any;
    return { ...result, transferId };
  }
}
