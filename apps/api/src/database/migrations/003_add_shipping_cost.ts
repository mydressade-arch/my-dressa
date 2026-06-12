import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShippingCostToProducts1748910000000 implements MigrationInterface {
  name = 'AddShippingCostToProducts1748910000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS shipping_cost`);
  }
}
