import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommissionKind1750100000000 implements MigrationInterface {
  name = 'AddCommissionKind1750100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Art der Gutschrift: 'sale' = normale Verkaufs-/Mietprovision,
    // 'damage_compensation' = einbehaltene Kaution, die dem Händler als
    // Schadensersatz gutgeschrieben wurde (sichtbar im Einnahmen-Verlauf
    // und in der Auszahlungsliste des Admins).
    await queryRunner.query(`
      ALTER TABLE commissions
      ADD COLUMN IF NOT EXISTS kind VARCHAR(40) NOT NULL DEFAULT 'sale'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE commissions DROP COLUMN IF EXISTS kind`);
  }
}
