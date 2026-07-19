import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettingsAndRentalDuration1749400000000 implements MigrationInterface {
  name = 'AddSettingsAndRentalDuration1749400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Feature 1: zentrale Einstellungen (Admin-änderbar)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description VARCHAR(255),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Standard: 7 und 10 Tage erlaubt
    await queryRunner.query(`
      INSERT INTO app_settings (key, value, description)
      VALUES ('rental_durations', '7,10', 'Erlaubte Mietdauern in Tagen (kommagetrennt)')
      ON CONFLICT (key) DO NOTHING
    `);

    // Mietdauer pro Produkt (vom Händler gewählt)
    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS rental_duration_days INTEGER DEFAULT 10
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS rental_duration_days`);
    await queryRunner.query(`DROP TABLE IF EXISTS app_settings`);
  }
}
