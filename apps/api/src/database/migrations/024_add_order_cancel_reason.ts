import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderCancelReason1749900000000 implements MigrationInterface {
  name = 'AddOrderCancelReason1749900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Grund der Stornierung (vom Händler aus einer festen Liste gewählt,
    // optional mit Freitext) — für die Kunden-Benachrichtigung und die
    // Storno-Statistik im Admin-Panel.
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(255)
    `);

    // Wer hat storniert: 'customer' | 'merchant' | 'admin'.
    // Erlaubt dem Admin, die Storno-Quote pro Händler auszuwerten.
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS cancel_reason`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS cancelled_by`);
  }
}
