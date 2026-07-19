import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBilateralReturnConfirm1749300000000 implements MigrationInterface {
  name = 'AddBilateralReturnConfirm1749300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Feature 6: Beidseitige Rückgabe-Bestätigung
    await queryRunner.query(`
      ALTER TABLE rentals
      ADD COLUMN IF NOT EXISTS customer_confirmed_return BOOLEAN DEFAULT FALSE
    `);
    await queryRunner.query(`
      ALTER TABLE rentals
      ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE rentals
      ADD COLUMN IF NOT EXISTS merchant_confirmed_return BOOLEAN DEFAULT FALSE
    `);
    await queryRunner.query(`
      ALTER TABLE rentals
      ADD COLUMN IF NOT EXISTS merchant_confirmed_at TIMESTAMPTZ DEFAULT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE rentals DROP COLUMN IF EXISTS customer_confirmed_return`);
    await queryRunner.query(`ALTER TABLE rentals DROP COLUMN IF EXISTS customer_confirmed_at`);
    await queryRunner.query(`ALTER TABLE rentals DROP COLUMN IF EXISTS merchant_confirmed_return`);
    await queryRunner.query(`ALTER TABLE rentals DROP COLUMN IF EXISTS merchant_confirmed_at`);
  }
}
