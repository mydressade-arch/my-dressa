import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepositAmountToProducts1748970000000 implements MigrationInterface {
  name = 'AddDepositAmountToProducts1748970000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS deposit_amount`);
  }
}
