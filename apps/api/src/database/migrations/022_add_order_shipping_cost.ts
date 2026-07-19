import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderShippingCost1749800000000 implements MigrationInterface {
  name = 'AddOrderShippingCost1749800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Versandkosten pro Bestellung (bei Kauf; Miete führt sie am Rental).
    // Nötig, damit die Provision beim Kauf den Versand korrekt ausklammert
    // und die Händler-Aufschlüsselung stimmt.
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0
    `);

    // Bestehende Kauf-Bestellungen nachträglich mit dem Produkt-Versand füllen.
    await queryRunner.query(`
      UPDATE orders o
      SET shipping_cost = COALESCE(p.shipping_cost, 0)
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      WHERE o.product_variant_id = v.id
        AND o.type = 'purchase'
        AND o.shipping_cost = 0
    `);

    // Ebenso bestehende Miet-Bestellungen (damit die Aufschlüsselung stimmt).
    await queryRunner.query(`
      UPDATE orders o
      SET shipping_cost = COALESCE(p.shipping_cost, 0)
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      WHERE o.product_variant_id = v.id
        AND o.type = 'rental'
        AND o.shipping_cost = 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS shipping_cost`);
  }
}
