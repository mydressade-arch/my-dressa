import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderIsExtension1749700000000 implements MigrationInterface {
  name = 'AddOrderIsExtension1749700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Verlängerungs-Orders markieren — sie brauchen KEINEN Versand,
    // das Kleid ist bereits beim Kunden.
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS is_extension BOOLEAN DEFAULT FALSE
    `);

    // Bestehende Verlängerungs-Orders nachträglich markieren + auf
    // 'delivered' setzen, damit sie nicht als offener Versand hängen.
    await queryRunner.query(`
      UPDATE orders o
      SET is_extension = TRUE
      FROM rental_extensions e
      WHERE e.order_id = o.id
    `);
    await queryRunner.query(`
      UPDATE orders o
      SET status = 'delivered'
      FROM rental_extensions e
      WHERE e.order_id = o.id
        AND e.status = 'paid'
        AND o.status IN ('paid', 'pending')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS is_extension`);
  }
}
