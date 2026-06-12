import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MerchantPayout } from './merchant-payout.entity';

@Entity('payout_receipts')
export class PayoutReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payout_id' })
  payoutId: string;

  @ManyToOne(() => MerchantPayout)
  @JoinColumn({ name: 'payout_id' })
  payout: MerchantPayout;

  @Column({ name: 'receipt_url' })
  receiptUrl: string;

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
