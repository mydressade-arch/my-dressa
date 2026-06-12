import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { OrderType } from '../orders/order.entity';

@Entity('commissions')
export class Commission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @Column({ name: 'gross_price', type: 'decimal', precision: 10, scale: 2 })
  grossPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rate: number;

  @Column({ name: 'platform_amount', type: 'decimal', precision: 10, scale: 2 })
  platformAmount: number;

  @Column({ name: 'merchant_amount', type: 'decimal', precision: 10, scale: 2 })
  merchantAmount: number;

  @Column({ type: 'enum', enum: OrderType })
  type: OrderType;

  @Column({ name: 'payout_id', type: 'varchar', nullable: true })
  payoutId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
