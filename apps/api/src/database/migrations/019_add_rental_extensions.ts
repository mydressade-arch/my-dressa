import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRentalExtensions1749500000000 implements MigrationInterface {
  name = 'AddRentalExtensions1749500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Feature 5: Mietverlängerungen
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rental_extensions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        extra_days INTEGER NOT NULL,
        fee DECIMAL(10,2) NOT NULL,
        previous_end_date DATE NOT NULL,
        new_end_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        paid_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rental_extensions_rental
      ON rental_extensions(rental_id)
    `);

    // Wie oft darf verlängert werden + Einstellung für Gebühr
    await queryRunner.query(`
      INSERT INTO app_settings (key, value, description)
      VALUES ('max_extensions_per_rental', '2', 'Maximale Anzahl Verlängerungen pro Miete')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS rental_extensions`);
    await queryRunner.query(`DELETE FROM app_settings WHERE key = 'max_extensions_per_rental'`);
  }
}
