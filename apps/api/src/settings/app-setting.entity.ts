import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Zentrale, vom Admin änderbare Einstellungen (Key-Value).
 * Beispiel: rental_durations = "7,10"
 * So können Werte ohne Code-Änderung angepasst werden.
 */
@Entity('app_settings')
export class AppSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** Bekannte Setting-Keys (typsicher). */
export const SETTING_KEYS = {
  RENTAL_DURATIONS: 'rental_durations', // z.B. "7,10"
  PRODUCT_COLORS: 'product_colors',     // z.B. "Schwarz,Weiß,Rot"
  PRODUCT_SIZES: 'product_sizes',       // z.B. "XS,S,M,L,XL"
  // Startseiten-Bilder (Feature: Admin ändert Bilder selbst)
  HOME_HERO_IMG: 'home_hero_img',
  HOME_DRESS_IMG: 'home_dress_img',
  HOME_SUIT_IMG: 'home_suit_img',
  HOME_ACCESS_IMG: 'home_access_img',
  HOME_VINTAGE_IMG: 'home_vintage_img',
} as const;
