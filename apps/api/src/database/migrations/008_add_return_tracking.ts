import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReturnTracking1748960000000 implements MigrationInterface {
  name = 'AddReturnTracking1748960000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rentals
      ADD COLUMN IF NOT EXISTS return_tracking_number VARCHAR(100)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rentals DROP COLUMN IF EXISTS return_tracking_number
    `);
  }
}
