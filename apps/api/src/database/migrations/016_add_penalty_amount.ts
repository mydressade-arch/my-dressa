import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPenaltyAmount1749200000000 implements MigrationInterface {
  name = 'AddPenaltyAmount1749200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Strafbetrag pro Produkt (vom Händler festgelegt).
    // Wird fällig, wenn ein Mietartikel nach 10 Tagen nicht zurück ist.
    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(10,2) DEFAULT NULL
    `);

    // Vermerk am Rental, ob/wann die Strafe ausgelöst wurde.
    await queryRunner.query(`
      ALTER TABLE rentals
      ADD COLUMN IF NOT EXISTS penalty_applied_at TIMESTAMPTZ DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE rentals
      ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(10,2) DEFAULT NULL
    `);

    // Alte Constraint (max. 7 Tage) entfernen — neues Modell nutzt feste 10 Tage.
    await queryRunner.query(`
      ALTER TABLE rentals DROP CONSTRAINT IF EXISTS rentals_duration_days_check
    `);
    // Neue, großzügigere Constraint (1–31 Tage) für Flexibilität.
    await queryRunner.query(`
      ALTER TABLE rentals
      ADD CONSTRAINT rentals_duration_days_check CHECK (duration_days BETWEEN 1 AND 31)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS penalty_amount`);
    await queryRunner.query(`ALTER TABLE rentals DROP COLUMN IF EXISTS penalty_applied_at`);
    await queryRunner.query(`ALTER TABLE rentals DROP COLUMN IF EXISTS penalty_amount`);
    // Constraint auf alten Wert zurücksetzen
    await queryRunner.query(`ALTER TABLE rentals DROP CONSTRAINT IF EXISTS rentals_duration_days_check`);
    await queryRunner.query(`
      ALTER TABLE rentals
      ADD CONSTRAINT rentals_duration_days_check CHECK (duration_days BETWEEN 1 AND 7)
    `);
  }
}
