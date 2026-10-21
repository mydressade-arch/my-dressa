import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Newsletter-Anmeldungen von der Startseite.
 * Einfache Sammlung der E-Mail-Adressen — später exportierbar
 * (z.B. für einen Versand über Brevo).
 */
@Entity('newsletter_subscribers')
export class NewsletterSubscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  // Woher kam die Anmeldung (z.B. 'homepage'), für spätere Auswertung
  @Column({ type: 'varchar', nullable: true, default: 'homepage' })
  source: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
