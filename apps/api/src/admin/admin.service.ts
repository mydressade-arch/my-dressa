import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { StorageService } from '../products/storage.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { Product, ProductStatus } from '../products/product.entity';
import { Order } from '../orders/order.entity';
import { Rental, RentalStatus } from '../rentals/rental.entity';
import { MerchantProfile } from '../users/merchant-profile.entity';
import { Commission } from '../commissions/commission.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    @InjectRepository(User)        private readonly userRepo: Repository<User>,
    @InjectRepository(Product)     private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)       private readonly orderRepo: Repository<Order>,
    @InjectRepository(MerchantProfile) private readonly merchantRepo: Repository<MerchantProfile>,
    @InjectRepository(Commission)  private readonly commissionRepo: Repository<Commission>,
    @InjectRepository(Rental)       private readonly rentalRepo: Repository<Rental>,
    private readonly storageService: StorageService,
  ) {}

  async getAllUsers(page = 1, limit = 20) {
    const [users, total] = await this.userRepo.findAndCount({
      order: { createdAt: 'DESC' }, skip: (page-1)*limit, take: limit,
    });
    return { users, total, page, totalPages: Math.ceil(total/limit) };
  }

  async toggleUserActive(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User nicht gefunden');
    await this.userRepo.update(userId, { isActive: !user.isActive });
    return { message: `User ${user.isActive ? 'gesperrt' : 'entsperrt'}` };
  }

  async changeUserRole(userId: string, role: UserRole, requestingAdminId: string) {
    // Sicherheit: Admin-Rolle kann nur über DB/Superadmin vergeben werden
    if (role === UserRole.ADMIN) {
      throw new ForbiddenException('Admin-Rolle kann nicht über das Panel vergeben werden');
    }
    // Sicherheit: Admin kann sich selbst nicht ändern
    if (userId === requestingAdminId) {
      throw new ForbiddenException('Du kannst deine eigene Rolle nicht ändern');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User nicht gefunden');
    if (user.role === UserRole.ADMIN) throw new ForbiddenException('Admin-Rolle kann nicht geändert werden');
    await this.userRepo.update(userId, { role });
    return { message: `Rolle auf ${role} gesetzt` };
  }

  // FIX: sucht per userId ODER merchantProfile.id
  async verifyMerchant(id: string) {
    // Versuche zunächst als merchantProfile.id
    let merchant = await this.merchantRepo.findOne({ where: { id } });
    // Falls nicht gefunden, suche per userId
    if (!merchant) merchant = await this.merchantRepo.findOne({ where: { userId: id } });
    if (!merchant) throw new NotFoundException('Händlerprofil nicht gefunden');
    await this.merchantRepo.update(merchant.id, { isVerified: true });
    return { message: 'Händler verifiziert' };
  }

  async suspendProduct(productId: string) {
    await this.productRepo.update(productId, { status: ProductStatus.SUSPENDED });
    return { message: 'Produkt gesperrt' };
  }

  async getAllProducts(page = 1, limit = 20) {
    const [products, total] = await this.productRepo.findAndCount({
      relations: ['merchant', 'images'],
      order: { createdAt: 'DESC' }, skip: (page-1)*limit, take: limit,
    });
    return { products, total, page, totalPages: Math.ceil(total/limit) };
  }

  // ── Benachrichtigungen für Admin ─────────────────────────────────────────
  async getNotifications() {
    const [
      pendingPayouts,
      openDamageReports,
      pendingMerchantRequests,
      returnRequests,
    ] = await Promise.all([
      this.commissionRepo
        ? this.orderRepo.query(`SELECT COUNT(*) as count FROM merchant_payouts WHERE status = 'pending'`)
        : Promise.resolve([{count:0}]),
      this.orderRepo.query(`SELECT COUNT(*) as count FROM damage_reports WHERE status = 'open'`),
      this.merchantRepo.query(`SELECT COUNT(*) as count FROM merchant_requests WHERE status = 'pending'`).catch(() => [{count:0}]),
      this.orderRepo.query(`SELECT COUNT(*) as count FROM orders WHERE return_requested = true AND return_approved = false`).catch(() => [{count:0}]),
    ]);

    return {
      pendingPayouts:         Number(pendingPayouts[0]?.count || 0),
      openDamageReports:      Number(openDamageReports[0]?.count || 0),
      pendingMerchantRequests: Number(pendingMerchantRequests[0]?.count || 0),
      returnRequests:         Number(returnRequests[0]?.count || 0),
      total: Number(pendingPayouts[0]?.count || 0) +
             Number(openDamageReports[0]?.count || 0) +
             Number(pendingMerchantRequests[0]?.count || 0) +
             Number(returnRequests[0]?.count || 0),
    };
  }

  // ── Chart Daten: Verkäufe vs Mieten (letzte 30 Tage) ─────────────────────
  async getSalesChart() {
    // Debug: alle Orders zählen
    const total = await this.orderRepo.query(`SELECT COUNT(*) as count, MIN(created_at) as oldest FROM orders`);
    this.logger.log(`Chart Debug: Total orders=${total[0]?.count}, oldest=${total[0]?.oldest}`);

    // Cast to TEXT in SQL to avoid timezone/object issues
    const rows = await this.orderRepo.query(`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date,
        type,
        COUNT(*) as count,
        COALESCE(SUM(total_price), 0) as revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'), type
      ORDER BY date ASC
    `);
    this.logger.log(`Chart rows: ${rows.length}, sample: ${JSON.stringify(rows[0])}`);

    // Build 30-day map
    const days: Record<string, {date:string, purchases:number, rentals:number, purchaseRevenue:number, rentalRevenue:number}> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = { date: key, purchases: 0, rentals: 0, purchaseRevenue: 0, rentalRevenue: 0 };
    }
    rows.forEach((r: any) => {
      const key = String(r.date).substring(0, 10);
      if (days[key]) {
        if (r.type === 'purchase') {
          days[key].purchases = Number(r.count);
          days[key].purchaseRevenue = Number(r.revenue || 0);
        } else if (r.type === 'rental') {
          days[key].rentals = Number(r.count);
          days[key].rentalRevenue = Number(r.revenue || 0);
        }
      }
    });
    return Object.values(days);
  }

  async getAllMerchants() {
    const rows = await this.merchantRepo.query(`
      SELECT
        mp.id, mp.shop_name as "shopName", mp.is_verified as "isVerified",
        mp.stripe_account_id as "stripeAccountId",
        mp.balance_pending as "balancePending", mp.balance_paid as "balancePaid",
        mp.created_at as "createdAt",
        u.email, u.first_name as "firstName", u.last_name as "lastName",
        (SELECT COUNT(*) FROM products p WHERE p.merchant_id = mp.id) as "productCount"
      FROM merchant_profiles mp
      LEFT JOIN users u ON u.id = mp.user_id
      ORDER BY mp.created_at DESC
    `);
    return rows.map((m: any) => ({
      id:             m.id,
      shopName:       m.shopName || '—',
      email:          m.email || '—',
      firstName:      m.firstName || '',
      lastName:       m.lastName || '',
      isVerified:     m.isVerified,
      stripeConnected: !!m.stripeAccountId,
      balancePending: m.balancePending,
      balancePaid:    m.balancePaid,
      productCount:   Number(m.productCount || 0),
      createdAt:      m.createdAt,
    }));
  }

  async getAllOrders(page = 1, limit = 20) {
    const [orders, total] = await this.orderRepo.findAndCount({
      relations: ['user', 'productVariant', 'productVariant.product', 'productVariant.product.merchant', 'rentals'],
      order: { createdAt: 'DESC' }, skip: (page-1)*limit, take: limit,
    });
    return { orders, total, page, totalPages: Math.ceil(total/limit) };
  }

  async updateOrderStatus(orderId: string, status: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order nicht gefunden');
    await this.orderRepo.update(orderId, { status: status as any });

    // Wenn Order storniert wird → auch zugehörige Rental stornieren
    if (status === 'cancelled') {
      const rental = await this.rentalRepo.findOne({ where: { orderId } });
      if (rental && rental.status !== RentalStatus.RETURNED) {
        await this.rentalRepo.update(rental.id, { status: RentalStatus.CANCELLED });
      }
    }

    return { message: `Status → ${status}` };
  }

  async getMerchantsStripeStatus() {
    const merchants = await this.merchantRepo.find({
      relations: ['user'],
    });

    return merchants.map(m => ({
      merchantId: m.id,
      shopName: m.shopName,
      email: m.user?.email,
      stripeConnected: !!m.stripeAccountId,
      stripeAccountId: m.stripeAccountId,
      isVerified: m.isVerified,
      status: !m.stripeAccountId
        ? 'not_connected'
        : m.isVerified
          ? 'complete'
          : 'onboarding_incomplete',
    }));
  }

  // ── DEV ONLY: Test Commission erstellen ─────────────────────────────────────
  async createTestCommission(merchantUserId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Nur in Development verfügbar');
    }

    // MerchantProfile aus userId holen
    const profile = await this.merchantRepo.findOne({ where: { userId: merchantUserId } })
      || await this.merchantRepo.findOne({});

    if (!profile) throw new Error('Kein MerchantProfile gefunden');

    const order = await this.orderRepo.findOne({ order: { createdAt: 'DESC' } });
    if (!order) throw new Error('Keine Order gefunden');

    // Kauf Commission
    const c1 = this.commissionRepo.create({
      orderId:        order.id,
      merchantId:     profile.id,
      grossPrice:     100,
      rate:           15,
      platformAmount: 15,
      merchantAmount: 85,
      type:           'purchase' as any,
    });

    // Miet Commission
    const c2 = this.commissionRepo.create({
      orderId:        order.id,
      merchantId:     profile.id,
      grossPrice:     60,
      rate:           10,
      platformAmount: 6,
      merchantAmount: 54,
      type:           'rental' as any,
    });

    await this.commissionRepo.save([c1, c2]);

    return {
      message: '✅ Test Commissions erstellt',
      merchantId: profile.id,
      totalPending: 139,
      commissions: [c1.id, c2.id],
    };
  }

  async getStorageStatus() {
    return {
      r2Connected: this.storageService.isEnabled(),
      message: this.storageService.isEnabled()
        ? '✅ Cloudflare R2 aktiv — Bilder-Upload funktioniert'
        : '⚠️ R2 nicht konfiguriert — AWS_ACCESS_KEY_ID, AWS_ENDPOINT etc. in .env eintragen',
    };
  }

  async getDashboardStats() {
    const [totalUsers, totalProducts, totalOrders, revenueResult, pendingMerchants] =
      await Promise.all([
        this.userRepo.count(),
        this.productRepo.count({ where: { status: ProductStatus.ACTIVE } }),
        this.orderRepo.count(),
        this.commissionRepo.createQueryBuilder('c').select('SUM(c.platform_amount)','revenue').getRawOne(),
        this.merchantRepo.count({ where: { isVerified: false } }),
      ]);

    const last7Days = await this.orderRepo
      .createQueryBuilder('o')
      .select("DATE_TRUNC('day', o.created_at)",'day')
      .addSelect('COUNT(*)','count')
      .where("o.created_at >= NOW() - INTERVAL '7 days'")
      .groupBy("DATE_TRUNC('day', o.created_at)")
      .orderBy('day','ASC')
      .getRawMany();

    return { totalUsers, totalProducts, totalOrders,
      totalRevenue: Number(revenueResult?.revenue ?? 0), pendingMerchants, last7Days };
  }

  async setTrackingNumber(orderId: string, trackingNumber: string, trackingUrl?: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order nicht gefunden');
    await this.orderRepo.update(orderId, {
      trackingNumber,
      trackingUrl: trackingUrl || `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${trackingNumber}`,
      status: 'shipped' as any,
    });
    return { message: `Sendungsnummer gesetzt: ${trackingNumber}` };
  }


  async getMerchantDetails(merchantId: string) {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      relations: ['user', 'products', 'products.images', 'products.variants'],
      order: { products: { createdAt: 'DESC' } },
    });
    if (!merchant) throw new Error('Händler nicht gefunden');

    const orders = await this.orderRepo.query(`
      SELECT o.*, pv.size, pv.color, p.title as product_title
      FROM orders o
      LEFT JOIN product_variants pv ON pv.id = o.product_variant_id
      LEFT JOIN products p ON p.id = pv.product_id
      WHERE p.merchant_id = $1
      ORDER BY o.created_at DESC
      LIMIT 20
    `, [merchantId]);

    return {
      merchant,
      products: merchant.products || [],
      recentOrders: orders,
    };
  }
}
