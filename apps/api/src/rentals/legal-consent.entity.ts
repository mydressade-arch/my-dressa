import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('legal_consents')
export class LegalConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @Column({ name: 'agb_version' })
  agbVersion: string;

  @Column({ name: 'rental_terms_version', nullable: true })
  rentalTermsVersion: string;

  @Column({ name: 'liability_accepted' })
  liabilityAccepted: boolean;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'accepted_at' })
  acceptedAt: Date;
}
