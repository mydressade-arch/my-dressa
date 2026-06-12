import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, OrderType } from './order.entity';
import { Rental, RentalStatus } from '../rentals/rental.entity';
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

    const order = this.orderRepo.create({
      userId,
      productVariantId: dto.productVariantId,
      type: OrderType.PURCHASE,
      status: OrderStatus.PENDING,
      totalPrice: variant.product.salePrice,
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

    // Versand-E-Mail an Kunde
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

    // Lieferungs-E-Mail an Kunde
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
    const order = await this.findOne(id, userId);
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

    await this.orderRepo.update(id, { status: OrderStatus.CANCELLED });

    // Stock wiederherstellen
    if (order.type === OrderType.PURCHASE) {
      await this.variantRepo.increment({ id: order.productVariantId }, 'stockQuantity', 1);
    }

    // Rental stornieren
    if (order.type === OrderType.RENTAL) {
      const rental = await this.rentalRepo.findOne({ where: { orderId: id } });
      if (rental && rental.status !== RentalStatus.RETURNED) {
        await this.rentalRepo.update(rental.id, { status: RentalStatus.CANCELLED });
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
      .orderBy('o.created_at', 'DESC')
      .getMany();
  }
}
