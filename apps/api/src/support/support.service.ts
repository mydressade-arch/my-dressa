import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { Order, OrderStatus } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { DamageReport } from '../rentals/damage-report.entity';

// Statuses Support darf NICHT setzen
const SUPPORT_FORBIDDEN_STATUSES = ['paid']; // Nur Stripe darf auf paid setzen

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)  private readonly userRepo: Repository<User>,
    @InjectRepository(DamageReport) private readonly damageRepo: Repository<DamageReport>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY', ''), { apiVersion: '2023-10-16' });
  }

  async getDashboard() {
    const [openOrders, pendingReturns, openDamage, totalToday] = await Promise.all([
      this.orderRepo.count({ where: { status: OrderStatus.PAID } }),
      this.orderRepo.query(`SELECT COUNT(*) as count FROM orders WHERE return_requested = true AND return_approved = false`),
      this.damageRepo.count({ where: { status: 'open' as any } }),
      this.orderRepo.query(`SELECT COUNT(*) as count FROM orders WHERE created_at::date = CURRENT_DATE`),
    ]);
    return {
      openOrders,
      pendingReturns: Number(pendingReturns[0]?.count || 0),
      openDamageReports: openDamage,
      ordersToday: Number(totalToday[0]?.count || 0),
    };
  }

  async searchOrders(q?: string, status?: string, page = 1) {
    const limit = 20;
    const skip = (page - 1) * limit;

    let query = this.orderRepo.createQueryBuilder('o')
      .leftJoinAndSelect('o.user', 'user')
      .leftJoinAndSelect('o.productVariant', 'pv')
      .leftJoinAndSelect('pv.product', 'p')
      .orderBy('o.createdAt', 'DESC')
      .take(limit).skip(skip);

    if (status) query = query.where('o.status = :status', { status });
    if (q) {
      const cond = status ? 'AND' : 'WHERE';
      query = query.andWhere(
        '(user.email ILIKE :q OR user.first_name ILIKE :q OR o.id::text ILIKE :q OR p.title ILIKE :q)',
        { q: `%${q}%` }
      );
    }

    const [orders, total] = await query.getManyAndCount();
    return {
      orders: orders.map(o => ({
        id: o.id,
        status: o.status,
        type: o.type,
        totalPrice: o.totalPrice,
        createdAt: o.createdAt,
        customer: { name: `${(o as any).user?.firstName} ${(o as any).user?.lastName}`, email: (o as any).user?.email },
        product: (o as any).productVariant?.product?.title,
        returnRequested: o.returnRequested,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderDetail(id: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['user', 'productVariant', 'productVariant.product', 'rentals'],
    });
    if (!order) throw new NotFoundException('Order nicht gefunden');

    const notes = await this.getNotes(id);
    return { ...order, notes };
  }

  async updateOrderStatus(id: string, status: string, agentId: string) {
    if (SUPPORT_FORBIDDEN_STATUSES.includes(status)) {
      throw new ForbiddenException(`Support darf Status "${status}" nicht setzen`);
    }
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order nicht gefunden');

    await this.orderRepo.update(id, { status: status as OrderStatus });
    await this.addNote(id, `Status geändert: ${order.status} → ${status}`, agentId, 'Support');
    this.logger.log(`Support ${agentId}: Order ${id} Status → ${status}`);
    return { message: `Status auf "${status}" gesetzt` };
  }

  async refundOrder(id: string, reason: string, agentId: string) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order nicht gefunden');
    if (!order.stripePaymentIntentId) throw new BadRequestException('Kein Stripe Payment Intent');
    if (order.status === OrderStatus.CANCELLED) throw new BadRequestException('Order bereits storniert');

    try {
      await this.stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        reason: 'requested_by_customer',
      });
      await this.orderRepo.update(id, { status: OrderStatus.CANCELLED });
      await this.addNote(id, `Refund ausgelöst von Support. Grund: ${reason || 'Keine Angabe'}`, agentId, 'Support');
      this.logger.log(`Support ${agentId}: Refund für Order ${id}`);
      return { message: 'Refund erfolgreich ausgelöst' };
    } catch (e: any) {
      throw new BadRequestException(`Stripe Refund fehlgeschlagen: ${e.message}`);
    }
  }

  async addNote(orderId: string, note: string, agentId: string, agentName: string) {
    await this.dataSource.query(`
      INSERT INTO support_notes (id, order_id, note, agent_id, agent_name, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
    `, [orderId, note, agentId, agentName]);
    return { message: 'Notiz gespeichert' };
  }

  async getNotes(orderId: string) {
    return this.dataSource.query(`
      SELECT * FROM support_notes WHERE order_id = $1 ORDER BY created_at DESC
    `, [orderId]).catch(() => []);
  }

  async searchCustomers(q?: string) {
    let query = this.userRepo.createQueryBuilder('u')
      .select(['u.id', 'u.email', 'u.firstName', 'u.lastName', 'u.role', 'u.isActive', 'u.createdAt'])
      .where('u.role = :role', { role: 'customer' })
      .orderBy('u.createdAt', 'DESC')
      .take(50);

    if (q) {
      query = query.andWhere('(u.email ILIKE :q OR u.first_name ILIKE :q OR u.last_name ILIKE :q)', { q: `%${q}%` });
    }
    return query.getMany();
  }

  async getCustomerDetail(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Kunde nicht gefunden');

    const orders = await this.orderRepo.find({
      where: { userId: id },
      order: { createdAt: 'DESC' },
      take: 20,
      relations: ['productVariant', 'productVariant.product'],
    });

    return {
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isActive: user.isActive, createdAt: user.createdAt },
      orders: orders.map(o => ({
        id: o.id, status: o.status, type: o.type,
        totalPrice: o.totalPrice, createdAt: o.createdAt,
        product: (o as any).productVariant?.product?.title,
      })),
      orderCount: orders.length,
      totalSpent: orders.reduce((s, o) => s + Number(o.totalPrice || 0), 0),
    };
  }

  async getDamageReports(status?: string) {
    const query: any = (status && status !== 'all') ? { status } : {};
    return this.damageRepo.find({
      where: query,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
