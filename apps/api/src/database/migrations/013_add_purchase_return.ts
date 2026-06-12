import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseReturn1749000000000 implements MigrationInterface {
  name = 'AddPurchaseReturn1749000000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS return_requested BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS return_reason TEXT,
      ADD COLUMN IF NOT EXISTS return_approved BOOLEAN NOT NULL DEFAULT false
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      DROP COLUMN IF EXISTS return_requested,
      DROP COLUMN IF EXISTS return_reason,
      DROP COLUMN IF EXISTS return_approved
    `);
  }
}
