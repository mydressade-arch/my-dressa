import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Order } from '../orders/order.entity';

export enum RentalStatus {
  PENDING        = 'pending',
  ACTIVE         = 'active',
  PENDING_RETURN = 'pending_return',
  RETURNED       = 'returned',
  OVERDUE        = 'overdue',
  CANCELLED      = 'cancelled',
}

@Entity('rentals')
export class Rental {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'product_variant_id' })
  productVariantId: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'duration_days' })
  durationDays: number;

  @Column({ type: 'enum', enum: RentalStatus, default: RentalStatus.PENDING })
  status: RentalStatus;

  @Column({ name: 'returned_at', type: 'timestamptz', nullable: true })
  returnedAt: Date | null;

  @Column({ name: 'damage_notes', type: 'text', nullable: true })
  damageNotes: string | null;

  @Column({ name: 'return_tracking_number', type: 'varchar', nullable: true })
  returnTrackingNumber: string | null;

  @Column({ name: 'return_confirmed_at', type: 'timestamptz', nullable: true })
  returnConfirmedAt: Date | null;

  @Column({ name: 'return_confirmed_by', type: 'uuid', nullable: true })
  returnConfirmedBy: string | null;

  // Beidseitige Rückgabe-Bestätigung (Feature 6)
  @Column({ name: 'customer_confirmed_return', type: 'boolean', default: false })
  customerConfirmedReturn: boolean;

  @Column({ name: 'customer_confirmed_at', type: 'timestamptz', nullable: true })
  customerConfirmedAt: Date | null;

  @Column({ name: 'merchant_confirmed_return', type: 'boolean', default: false })
  merchantConfirmedReturn: boolean;

  @Column({ name: 'merchant_confirmed_at', type: 'timestamptz', nullable: true })
  merchantConfirmedAt: Date | null;

  @Column({ name: 'return_condition', type: 'varchar', nullable: true })
  returnCondition: string | null;   // 'good' | 'damaged' | 'lost'

  @Column({ name: 'damage_photo_urls', type: 'jsonb', default: [] })
  damagePhotoUrls: string[];

  @Column({ name: 'penalty_applied_at', type: 'timestamptz', nullable: true })
  penaltyAppliedAt: Date | null;

  @Column({ name: 'penalty_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  penaltyAmount: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Order, order => order.rentals)
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
