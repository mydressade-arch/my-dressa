import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Rental } from '../rentals/rental.entity';
import { User } from '../users/user.entity';
import { ProductVariant } from '../products/product-variant.entity';

export enum OrderType {
  PURCHASE = 'purchase',
  RENTAL   = 'rental',
}

export enum OrderStatus {
  PENDING   = 'pending',
  PAID      = 'paid',
  SHIPPED   = 'shipped',
  DELIVERED = 'delivered',
  RETURNED  = 'returned',
  CANCELLED = 'cancelled',
  REFUNDED  = 'refunded',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'product_variant_id' })
  productVariantId: string;

  @Column({ type: 'enum', enum: OrderType })
  type: OrderType;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ name: 'commission_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  commissionAmount: number;

  // Versandkosten dieser Bestellung (bei Kauf; Miete führt sie am Rental).
  @Column({ name: 'shipping_cost', type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ name: 'merchant_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  merchantAmount: number;

  @Column({ name: 'stripe_payment_intent_id', type: 'varchar', nullable: true })
  stripePaymentIntentId: string | null;

  @Column({ name: 'shipping_address', type: 'jsonb', nullable: true })
  shippingAddress: Record<string, any> | null;

  @Column({ name: 'tracking_number', type: 'varchar', nullable: true })
  trackingNumber: string | null;

  @Column({ name: 'tracking_url', type: 'varchar', nullable: true })
  trackingUrl: string | null;

  // Feature 5: Verlängerungs-Order — es gibt NICHTS zu versenden,
  // das Kleid ist bereits beim Kunden.
  @Column({ name: 'is_extension', type: 'boolean', default: false })
  isExtension: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'return_requested', default: false })
  returnRequested: boolean;

  @Column({ name: 'return_reason', type: 'text', nullable: true })
  returnReason: string | null;

  @Column({ name: 'return_approved', default: false })
  returnApproved: boolean;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ProductVariant)
  @JoinColumn({ name: 'product_variant_id' })
  productVariant: ProductVariant;

  @OneToMany(() => Rental, rental => rental.order)
  rentals: Rental[];
}
