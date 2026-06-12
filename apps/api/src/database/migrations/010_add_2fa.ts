import { MigrationInterface, QueryRunner } from 'typeorm';

export class Add2FA1748980000000 implements MigrationInterface {
  name = 'Add2FA1748980000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS two_fa_secret VARCHAR(255),
      ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN NOT NULL DEFAULT false
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS two_fa_secret,
      DROP COLUMN IF EXISTS two_fa_enabled
    `);
  }
}
