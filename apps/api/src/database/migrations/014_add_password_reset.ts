import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordReset1749001000000 implements MigrationInterface {
  name = 'AddPasswordReset1749001000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS reset_password_token,
      DROP COLUMN IF EXISTS reset_password_expires
    `);
  }
}
