import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBankAccount1748990000000 implements MigrationInterface {
  name = 'AddBankAccount1748990000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE merchant_profiles
      ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200),
      ADD COLUMN IF NOT EXISTS bank_iban_encrypted VARCHAR(500),
      ADD COLUMN IF NOT EXISTS bank_bic VARCHAR(20),
      ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200)
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE merchant_profiles
      DROP COLUMN IF EXISTS bank_account_name,
      DROP COLUMN IF EXISTS bank_iban_encrypted,
      DROP COLUMN IF EXISTS bank_bic,
      DROP COLUMN IF EXISTS bank_name
    `);
  }
}
