import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrackingAndDamageReport1748950000000 implements MigrationInterface {
  name = 'AddTrackingAndDamageReport1748950000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Sendungsnummer in orders
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS tracking_url    VARCHAR(500)
    `);

    // 2. Return-Bestätigung + Foto-Beweis in rentals
    await queryRunner.query(`
      ALTER TABLE rentals
      ADD COLUMN IF NOT EXISTS return_confirmed_at   TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS return_confirmed_by   UUID,
      ADD COLUMN IF NOT EXISTS return_condition      VARCHAR(20),
      ADD COLUMN IF NOT EXISTS damage_photo_urls     JSONB DEFAULT '[]'::jsonb
    `);

    // 3. Damage Reports Tabelle
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS damage_reports (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        rental_id     UUID        NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
        order_id      UUID        NOT NULL REFERENCES orders(id)  ON DELETE CASCADE,
        reported_by   UUID        NOT NULL,
        description   TEXT        NOT NULL,
        photo_urls    JSONB       NOT NULL DEFAULT '[]'::jsonb,
        severity      VARCHAR(20) NOT NULL DEFAULT 'minor',
        status        VARCHAR(20) NOT NULL DEFAULT 'open',
        resolution    TEXT,
        resolved_by   UUID,
        resolved_at   TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_damage_reports_rental ON damage_reports(rental_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS damage_reports`);
    await queryRunner.query(`
      ALTER TABLE orders DROP COLUMN IF EXISTS tracking_number, DROP COLUMN IF EXISTS tracking_url
    `);
    await queryRunner.query(`
      ALTER TABLE rentals
      DROP COLUMN IF EXISTS return_confirmed_at,
      DROP COLUMN IF EXISTS return_confirmed_by,
      DROP COLUMN IF EXISTS return_condition,
      DROP COLUMN IF EXISTS damage_photo_urls
    `);
  }
}
