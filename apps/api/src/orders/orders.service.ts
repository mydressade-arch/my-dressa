import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, LessThan } from 'typeorm';
import { Order, OrderStatus, OrderType } from './order.entity';
import { Rental, RentalStatus } from '../rentals/rental.entity';
import { Deposit, DepositStatus } from '../rentals/deposit.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { User } from '../users/user.entity';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { NotificationsService } from '../notifications/notifications.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

export class CreateOrderDto {
  productVariantId: string;
  type?: string;
  // shippingAddress wird separat akzeptiert aber nicht als required
  shippingAddress?: Record<string, any>;
}

// Feste Storno-Gründe für den Händler (Code → lesbares Label). Eine feste
// Liste macht es dem Händler einfach (Auswahl statt Freitext) und erlaubt dem
// Admin, die Storno-Gründe sauber auszuwerten.
export const MERCHANT_CANCEL_REASONS: Record<string, string> = {
  out_of_stock:   'Nicht mehr auf Lager',
  damaged:        'Artikel beschädigt / Qualitätsmangel',
  shipping_issue: 'Versand nicht möglich (Adresse/Region)',
  pricing_error:  'Preis- oder Angebotsfehler',
  other:          'Sonstiger Grund',
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Rental)
    private readonly rentalRepo: Repository<Rental>,
    @InjectRepository(Deposit)
    private readonly depositRepo: Repository<Deposit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MerchantProfile)
    private readonly merchantProfileRepo: Repository<MerchantProfile>,
    private readonly notifications: NotificationsService,
        private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2023-10-16',
    });
  }
  private stripe: Stripe;

  async createPurchaseOrder(userId: string, dto: CreateOrderDto) {
    // E-Mail-Verifizierung ist zum KAUFEN erforderlich.
    const buyer = await this.userRepo.findOne({ where: { id: userId } });
    if (!buyer?.isVerified) {
      throw new ForbiddenException(
        'Bitte bestätige zuerst deine E-Mail-Adresse, um kaufen zu können.',
      );
    }

    const variant = await this.variantRepo.findOne({
      where: { id: dto.productVariantId },
      relations: ['product'],
    });
    if (!variant) throw new NotFoundException('Produktvariante nicht gefunden');
    if (!variant.product.isForSale) throw new BadRequestException('Produkt nicht zum Kauf');

    // Stock prüfen
    if (variant.stockQuantity < 1) {
      throw new BadRequestException('Produkt ist ausverkauft');
    }

    const shippingCost = Number(variant.product.shippingCost ?? 0);
    const order = this.orderRepo.create({
      userId,
      productVariantId: dto.productVariantId,
      type: OrderType.PURCHASE,
      status: OrderStatus.PENDING,
      // Kaufpreis + Versand (Versand stellt der Händler pro Produkt ein,
      // kann 0 sein = versandkostenfrei). Wie bei der Miete.
      totalPrice: Number(variant.product.salePrice) + shippingCost,
      shippingCost,
      shippingAddress: dto.shippingAddress || {},
    });
    await this.orderRepo.save(order);

    // Stock um 1 reduzieren (optimistic — wird bei cancel wieder erhöht)
    await this.variantRepo.update(dto.productVariantId, {
      stockQuantity: Math.max(0, variant.stockQuantity - 1),
    });

    this.logger.log(`Purchase Order: ${order.id}`);

    // Keine E-Mail hier — wird nach Stripe-Zahlung gesendet (payments.service.ts)
    return order;
  }

  async findByUser(userId: string) {
    return this.orderRepo.find({
      where: { userId },
      relations: ['productVariant', 'productVariant.product', 'productVariant.product.images'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['productVariant', 'productVariant.product', 'productVariant.product.images', 'user'],
    });
    if (!order) throw new NotFoundException('Bestellung nicht gefunden');
    if (order.userId !== userId) throw new ForbiddenException();
    return order;
  }

  async updateStatus(id: string, status: OrderStatus) {
    await this.orderRepo.update(id, { status });
    return { message: `Status: ${status}` };
  }

  // ── Händler: Versand bestätigen mit DHL ───────────────────────────────────
  async shipOrder(orderId: string, merchantUserId: string, trackingNumber: string, trackingUrl?: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['productVariant', 'productVariant.product', 'productVariant.product.merchant'],
    });
    if (!order) throw new NotFoundException('Order nicht gefunden');
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Versand nur bei bezahlten Bestellungen möglich');
    }

    // Prüfen ob dieser Händler die Order besitzt
    const merchantProfile = await this.merchantProfileRepo?.findOne({ where: { userId: merchantUserId } });
    const merchantId = merchantProfile?.id ?? merchantUserId;
    if (order.productVariant?.product?.merchantId !== merchantId) {
      throw new ForbiddenException('Diese Bestellung gehört nicht deinem Shop');
    }

    await this.orderRepo.update(orderId, {
      status: OrderStatus.SHIPPED,
      trackingNumber,
      trackingUrl: trackingUrl || `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${trackingNumber}`,
    });

    this.logger.log(`Order ${orderId} shipped by merchant ${merchantId} — DHL: ${trackingNumber}`);

    // Versand-E-Mail an Kunde — BEWUSST NICHT awaited.
    // Sonst wartet die HTTP-Antwort auf den Mailserver (1-3 Sek. Verzögerung
    // im Händler-Portal). Die Mail geht im Hintergrund raus.
    void (async () => {
      try {
        const fullOrder = await this.orderRepo.findOne({
          where: { id: orderId },
          relations: ['user', 'productVariant', 'productVariant.product'],
        });
        if (fullOrder?.user?.email) {
          await this.notifications.sendShippingNotification(fullOrder.user.email, {
            firstName:     fullOrder.user.firstName,
            orderNumber:   orderId.substring(0, 8).toUpperCase(),
            productName:   fullOrder.productVariant?.product?.title || 'Produkt',
            trackingNumber,
            trackingUrl:   trackingUrl || `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${trackingNumber}`,
          });
        }
      } catch (e: any) {
        this.logger.warn(`Versand-E-Mail fehlgeschlagen: ${e.message}`);
      }
    })();

    return { message: `Versand bestätigt. Sendungsnummer: ${trackingNumber}` };
  }

  // ── Kunde: Empfang bestätigen ─────────────────────────────────────────────
  // ── Admin/Händler: delivered setzen ─────────────────────────────────────────
  async confirmDelivery(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['productVariant', 'productVariant.product', 'productVariant.product.merchant'],
    });
    if (!order) throw new NotFoundException('Order nicht gefunden');
    if (order.status !== OrderStatus.SHIPPED) {
      throw new BadRequestException('Nur versendete Bestellungen können als delivered markiert werden');
    }
    await this.orderRepo.update(orderId, { status: OrderStatus.DELIVERED });

    // balancePending → balancePaid (Geld ist verdient nach Lieferung)
    const merchant = (order as any).productVariant?.product?.merchant;
    const merchantAmount = Number(order.merchantAmount || 0);
    if (merchant && merchantAmount > 0) {
      await this.merchantProfileRepo.update(merchant.id, {
        balancePending: Math.max(0, Math.round((Number(merchant.balancePending) - merchantAmount) * 100) / 100),
        balancePaid: Math.round((Number(merchant.balancePaid) + merchantAmount) * 100) / 100,
      });
    }

    // Lieferungs-E-Mail an Kunde — nicht awaited (siehe shipOrder)
    void (async () => {
      try {
        const fullOrder = await this.orderRepo.findOne({
          where: { id: orderId },
          relations: ['user', 'productVariant', 'productVariant.product'],
        });
        if (fullOrder?.user?.email) {
          await this.notifications.sendDeliveredNotification(fullOrder.user.email, {
            firstName:   fullOrder.user.firstName,
            orderNumber: orderId.substring(0, 8).toUpperCase(),
            productName: fullOrder.productVariant?.product?.title || 'Produkt',
            orderType:   fullOrder.type,
          });
        }
      } catch (e: any) {
        this.logger.warn(`Lieferungs-E-Mail fehlgeschlagen: ${e.message}`);
      }
    })();

    return { message: 'Als geliefert markiert' };
  }

  // ── Kunde: Rückgabe beantragen ───────────────────────────────────────────
  async requestReturn(orderId: string, userId: string, reason: string) {
    const order = await this.findOne(orderId, userId);
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Rückgabe nur bei gelieferten Bestellungen möglich');
    }
    if (order.returnRequested) {
      throw new BadRequestException('Rückgabe bereits beantragt');
    }
    await this.orderRepo.update(orderId, {
      returnRequested: true,
      returnReason: reason,
    });
    return { message: 'Rückgabe beantragt — Händler wird benachrichtigt' };
  }

  // ── Händler: Rückgabe bestätigen → Admin genehmigt Refund ────────────────
  async approveReturn(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Bestellung nicht gefunden');
    if (!order.returnRequested) throw new BadRequestException('Keine Rückgabe beantragt');

    await this.orderRepo.update(orderId, {
      returnApproved: true,
      status: OrderStatus.RETURNED,
    });

    // Stripe Refund
    if (order.stripePaymentIntentId) {
      try {
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
        await stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
          reason: 'requested_by_customer',
        });
        this.logger.log(`Refund erstellt für Order ${orderId}`);
      } catch (e: any) {
        this.logger.warn(`Stripe Refund fehlgeschlagen: ${e.message}`);
      }
    }

    return { message: 'Rückgabe genehmigt — Kunde wird erstattet (5-10 Werktage)' };
  }

  async cancel(id: string, userId: string) {
    // Kunden-Storno: nur die eigene Bestellung.
    const order = await this.findOne(id, userId);
    return this._executeCancellation(order, { cancelledBy: 'customer' });
  }

  // ── Händler-Storno ──────────────────────────────────────────────────────
  // Typischer Fall: der Händler hat den Artikel nicht mehr auf Lager, obwohl
  // der Kunde schon bezahlt/gemietet hat. Gleiche Mechanik wie der Kunden-
  // Storno (Refund + Lager + Kaution-Freigabe), aber mit Eigentumsprüfung,
  // Pflicht-Grund (aus fester Liste) und Benachrichtigung an den Kunden.
  async cancelAsMerchant(id: string, merchantUserId: string, reasonCode?: string, note?: string) {
    if (!reasonCode) {
      throw new BadRequestException('Bitte einen Storno-Grund angeben');
    }

    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['productVariant', 'productVariant.product', 'productVariant.product.merchant', 'user'],
    });
    if (!order) throw new NotFoundException('Bestellung nicht gefunden');

    // Gehört diese Bestellung dem Shop dieses Händlers? (gleiche Prüfung wie Versand)
    const merchantProfile = await this.merchantProfileRepo?.findOne({ where: { userId: merchantUserId } });
    const merchantId = merchantProfile?.id ?? merchantUserId;
    if (order.productVariant?.product?.merchantId !== merchantId) {
      throw new ForbiddenException('Diese Bestellung gehört nicht deinem Shop');
    }

    // Nur solange NICHT versandt. Ist die Ware schon unterwegs/geliefert, ist
    // das ein Rückgabe-Fall (über den Support), kein Storno.
    if (![OrderStatus.PENDING, OrderStatus.PAID].includes(order.status)) {
      throw new BadRequestException(
        'Storno nur möglich, solange die Bestellung noch nicht versandt ist. Ist die Ware bereits unterwegs, läuft das über die Rückgabe/den Support.',
      );
    }

    const label = MERCHANT_CANCEL_REASONS[reasonCode] || MERCHANT_CANCEL_REASONS.other;
    const storedReason = note?.trim() ? `${label}: ${note.trim()}` : label;
    const wasPaid = order.status === OrderStatus.PAID;

    const result = await this._executeCancellation(order, {
      cancelledBy: 'merchant',
      reason: storedReason,
    });

    // Kunden-Benachrichtigung im Hintergrund (blockiert die HTTP-Antwort nicht).
    void (async () => {
      try {
        if (order.user?.email) {
          await this.notifications.sendOrderCancelled(order.user.email, {
            firstName:    order.user.firstName || 'Kunde',
            productTitle: order.productVariant?.product?.title || 'Artikel',
            orderNumber:  order.id.substring(0, 8).toUpperCase(),
            reason:       label,
            isRental:     order.type === OrderType.RENTAL,
            refunded:     wasPaid,
          });
        }
      } catch (e: any) {
        this.logger.warn(`Storno-E-Mail fehlgeschlagen: ${e.message}`);
      }
    })();

    return result;
  }

  // Gemeinsame Storno-Mechanik für Kunde, Händler und Admin.
  private async _executeCancellation(
    order: Order,
    opts: { cancelledBy: 'customer' | 'merchant' | 'admin'; reason?: string },
  ) {
    const id = order.id;
    if (![OrderStatus.PENDING, OrderStatus.PAID].includes(order.status)) {
      throw new BadRequestException('Stornierung nur bei pending oder paid möglich');
    }

    // Wenn bereits bezahlt → Stripe Refund auslösen
    let refundId: string | null = null;
    if (order.status === OrderStatus.PAID && order.stripePaymentIntentId) {
      try {
        const refund = await this.stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
          reason: 'requested_by_customer',
        });
        refundId = refund.id;
        this.logger.log(`Stripe Refund erstellt: ${refundId} für Order ${id}`);
      } catch (stripeErr: any) {
        this.logger.error(`Stripe Refund fehlgeschlagen: ${stripeErr.message}`);
        throw new BadRequestException(
          'Rückerstattung konnte nicht verarbeitet werden. Bitte kontaktiere den Support.'
        );
      }
    }

    await this.orderRepo.update(id, {
      status: OrderStatus.CANCELLED,
      cancelledBy: opts.cancelledBy,
      ...(opts.reason ? { cancelReason: opts.reason } : {}),
    });

    // Stock wiederherstellen
    if (order.type === OrderType.PURCHASE) {
      await this.variantRepo.increment({ id: order.productVariantId }, 'stockQuantity', 1);
    }

    // Rental stornieren + Kaution-Reservierung freigeben
    if (order.type === OrderType.RENTAL) {
      const rental = await this.rentalRepo.findOne({ where: { orderId: id } });
      if (rental && rental.status !== RentalStatus.RETURNED) {
        await this.rentalRepo.update(rental.id, { status: RentalStatus.CANCELLED });

        // Die reservierte Kaution (Hold) freigeben, damit das blockierte Geld
        // des Kunden sofort wieder frei wird (sonst bliebe es bis zu 30 Tage
        // auf der Karte blockiert, bis die Reservierung von selbst verfällt).
        try {
          const deposit = await this.depositRepo.findOne({ where: { rentalId: rental.id } });
          if (deposit?.stripeHoldId && deposit.status !== DepositStatus.RELEASED) {
            try {
              await this.stripe.paymentIntents.cancel(deposit.stripeHoldId);
            } catch (e: any) {
              // Falls es doch eine abgebuchte (alte) Kaution war → zurückerstatten
              this.logger.warn(`Kautions-Hold-Cancel fehlgeschlagen (${e.message}) — versuche Refund`);
              try {
                await this.stripe.refunds.create({
                  payment_intent: deposit.stripeHoldId,
                  amount: Math.round(Number(deposit.amount) * 100),
                });
              } catch (e2: any) {
                this.logger.warn(`Kautions-Refund-Fallback fehlgeschlagen: ${e2.message}`);
              }
            }
            await this.depositRepo.update(deposit.id, {
              status: DepositStatus.RELEASED,
              releasedAt: new Date(),
              releaseReason: 'Miete storniert — Kaution freigegeben',
            });
          }
        } catch (e: any) {
          this.logger.warn(`Kaution-Freigabe bei Storno fehlgeschlagen: ${e.message}`);
        }
      }
    }

    return {
      message: order.status === OrderStatus.PAID
        ? `Storniert. Rückerstattung wird in 5-10 Werktagen gutgeschrieben.${refundId ? ` (Ref: ${refundId})` : ''}`
        : 'Storniert.',
      refundId,
    };
  }

  async findByMerchant(merchantId: string) {
    return this.orderRepo
      .createQueryBuilder('o')
      .innerJoinAndSelect('o.productVariant', 'v')
      .innerJoinAndSelect('v.product', 'p')
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('o.user', 'u')
      .leftJoinAndSelect('o.rentals', 'r')   // ← Rental mit laden!
      .where('p.merchant_id = :merchantId', { merchantId })
      // WICHTIG: Der Händler sieht nur Bestellungen mit ECHTER Zahlung.
      //  • 'pending' = angelegt, aber nie bezahlt (Checkout abgebrochen).
      //  • 'cancelled' OHNE erfolgreiche Zahlung = fehlgeschlagener Versuch
      //    (stripe_payment_intent_id wird NUR bei erfolgreicher Zahlung gesetzt).
      // Beides wird ausgeblendet. Echte (auch später stornierte/erstattete)
      // Bestellungen haben eine stripe_payment_intent_id und bleiben sichtbar.
      .andWhere('o.status != :pending', { pending: OrderStatus.PENDING })
      .andWhere('NOT (o.status = :cancelled AND o.stripe_payment_intent_id IS NULL)', { cancelled: OrderStatus.CANCELLED })
      .orderBy('o.created_at', 'DESC')
      .getMany();
  }

  // ── Aufräumen: nie bezahlte Bestellungen entfernen ────────────────────────
  // Bestellungen entstehen als 'pending', BEVOR bezahlt wird. Bricht der Kunde
  // den Checkout ab (keine Karte eingegeben, Tab geschlossen), bliebe die
  // Bestellung sonst liegen und würde beim Kauf Lagerbestand blockieren.
  // Alle 10 Minuten: offene Bestellungen, die älter als 15 Min sind, prüfen und
  // NUR dann löschen, wenn bei Stripe wirklich keine Zahlung mehr unterwegs ist.
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupAbandonedOrders() {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const stale = await this.orderRepo.find({
      where: { status: OrderStatus.PENDING, createdAt: LessThan(cutoff) },
    });
    if (!stale.length) return;

    // Stripe-Status, bei denen sicher KEIN Geld (mehr) kommt → löschbar.
    // Nicht löschen bei: processing (z. B. SEPA, dauert Tage), requires_action
    // (3-D-Secure noch offen), requires_capture, succeeded.
    const DELETABLE = new Set([
      'requires_payment_method',
      'requires_confirmation',
      'canceled',
    ]);

    let removed = 0;
    for (const order of stale) {
      try {
        let safeToDelete = false;
        if (!order.checkoutPaymentIntentId) {
          // Nie bis zur Zahlung gekommen → sicher löschbar.
          safeToDelete = true;
        } else {
          const pi = await this.stripe.paymentIntents.retrieve(order.checkoutPaymentIntentId);
          safeToDelete = DELETABLE.has(pi.status);
        }
        if (!safeToDelete) continue;
        await this._deleteUnpaidOrder(order);
        removed++;
      } catch (e: any) {
        this.logger.warn(`Aufräumen Order ${order.id} fehlgeschlagen: ${e.message}`);
      }
    }
    if (removed) this.logger.log(`${removed} unbezahlte Bestellung(en) entfernt`);
  }

  // Löscht eine NIE bezahlte Bestellung sauber: Lager zurück (Kauf),
  // Miet-Zeile(n) weg, dann die Bestellung. Nur für 'pending' — daran hängt
  // kein Geld, keine Provision und keine Auszahlung.
  private async _deleteUnpaidOrder(order: Order) {
    if (order.status !== OrderStatus.PENDING) return;
    if (order.type === OrderType.PURCHASE && order.productVariantId) {
      await this.variantRepo.increment({ id: order.productVariantId }, 'stockQuantity', 1);
    }
    // FK: zuerst evtl. Miet-Zeile(n), dann die Bestellung.
    await this.rentalRepo.delete({ orderId: order.id });
    await this.orderRepo.delete({ id: order.id });
  }
}
