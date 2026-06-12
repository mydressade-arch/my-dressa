import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategories1748940000000 implements MigrationInterface {
  name = 'AddCategories1748940000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(500),
        is_active   BOOLEAN     NOT NULL DEFAULT true,
        sort_order  INT         NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Bestehende Kategorien aus Products importieren
    await queryRunner.query(`
      INSERT INTO categories (name, sort_order)
      SELECT DISTINCT category, ROW_NUMBER() OVER (ORDER BY category)
      FROM products
      WHERE category IS NOT NULL AND category != ''
      ON CONFLICT (name) DO NOTHING
    `);

    // Standard-Kategorien wenn noch keine vorhanden
    await queryRunner.query(`
      INSERT INTO categories (name, sort_order) VALUES
        ('Abendmode',   1),
        ('Casual',      2),
        ('Vintage',     3),
        ('Accessories', 4),
        ('Suits',       5),
        ('Sportswear',  6),
        ('Bridal',      7)
      ON CONFLICT (name) DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS categories`);
  }
}
