import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum DamageSeverity {
  MINOR    = 'minor',     // kleine Flecken, leichte Beschädigungen
  MODERATE = 'moderate',  // sichtbare Schäden, reparierbar
  SEVERE   = 'severe',    // starke Beschädigung, unbrauchbar
  LOST     = 'lost',      // Kleid nicht zurückgekommen
  LATE     = 'late',      // verspätete Rückgabe (Feature 4)
}

export enum DamageReportStatus {
  OPEN       = 'open',       // neu eingegangen
  REVIEWING  = 'reviewing',  // Admin prüft
  RESOLVED   = 'resolved',   // abgeschlossen
  DISPUTED   = 'disputed',   // Kunde widerspricht
}

@Entity('damage_reports')
export class DamageReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rental_id' })
  rentalId: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'reported_by' })
  reportedBy: string;  // merchantId der meldet

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'photo_urls', type: 'jsonb', default: [] })
  photoUrls: string[];

  // DB-Spalte ist VARCHAR(20) — kein Postgres-Enum. TypeScript-Enum
  // dient nur der Typsicherheit im Code.
  @Column({
    type: 'varchar',
    length: 20,
    default: DamageSeverity.MINOR,
  })
  severity: DamageSeverity;

  @Column({
    type: 'varchar',
    length: 20,
    default: DamageReportStatus.OPEN,
  })
  status: DamageReportStatus;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
