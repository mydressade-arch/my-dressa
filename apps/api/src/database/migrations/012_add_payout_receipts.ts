import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayoutReceipts1748991000000 implements MigrationInterface {
  name = 'AddPayoutReceipts1748991000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payout_receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payout_id UUID NOT NULL REFERENCES merchant_payouts(id),
        receipt_url VARCHAR(500) NOT NULL,
        uploaded_by VARCHAR(100) NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS payout_receipts`);
  }
}
