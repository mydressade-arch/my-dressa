import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayoutRequest1748920000000 implements MigrationInterface {
  name = 'AddPayoutRequest1748920000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE merchant_payouts
      ADD COLUMN IF NOT EXISTS note VARCHAR(500),
      ADD COLUMN IF NOT EXISTS reviewed_by UUID,
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE merchant_payouts
      DROP COLUMN IF EXISTS note,
      DROP COLUMN IF EXISTS reviewed_by,
      DROP COLUMN IF EXISTS reviewed_at
    `);
  }
}
