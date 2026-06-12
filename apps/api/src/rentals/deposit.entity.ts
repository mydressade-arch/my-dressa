import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Rental } from './rental.entity';

export enum DepositStatus {
  HELD                = 'held',
  RELEASED            = 'released',
  RETAINED            = 'retained',
  PARTIALLY_RETAINED  = 'partially_retained',
}

@Entity('deposits')
export class Deposit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rental_id' })
  rentalId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: DepositStatus, default: DepositStatus.HELD })
  status: DepositStatus;

  @Column({ name: 'stripe_hold_id', type: 'varchar', nullable: true })
  stripeHoldId: string | null;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @Column({ name: 'release_reason', type: 'text', nullable: true })
  releaseReason: string | null;

  @Column({ name: 'retained_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  retainedAmount: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => Rental)
  @JoinColumn({ name: 'rental_id' })
  rental: Rental;
}
