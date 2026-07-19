import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Rental } from './rental.entity';

export enum ExtensionStatus {
  PENDING = 'pending',   // angelegt, noch nicht bezahlt
  PAID    = 'paid',      // bezahlt → Enddatum verlängert
  FAILED  = 'failed',    // Zahlung fehlgeschlagen
}

/**
 * Feature 5: Verlängerung einer laufenden Miete.
 * Die Gebühr enthält KEINE Versandkosten (das Kleid ist schon beim Kunden).
 */
@Entity('rental_extensions')
export class RentalExtension {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rental_id', type: 'uuid' })
  rentalId: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ name: 'extra_days', type: 'int' })
  extraDays: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  fee: number;

  @Column({ name: 'previous_end_date', type: 'date' })
  previousEndDate: string;

  @Column({ name: 'new_end_date', type: 'date' })
  newEndDate: string;

  @Column({ type: 'varchar', length: 20, default: ExtensionStatus.PENDING })
  status: ExtensionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @ManyToOne(() => Rental)
  @JoinColumn({ name: 'rental_id' })
  rental: Rental;
}
