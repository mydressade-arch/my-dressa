import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepositConsent1749600000000 implements MigrationInterface {
  name = 'AddDepositConsent1749600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Feature 4: "Verspätung" (late) als Beschwerdegrund.
    // Hinweis: damage_reports.severity ist ein VARCHAR(20) — kein DB-Enum.
    // Der neue Wert 'late' passt ohne Schema-Änderung hinein.
    // (Die Entity kennt ihn über DamageSeverity.LATE.)

    // Feature 3: separate Zustimmung zur Kaution protokollieren
    await queryRunner.query(`
      ALTER TABLE legal_consents
      ADD COLUMN IF NOT EXISTS deposit_accepted BOOLEAN DEFAULT FALSE
    `);
    await queryRunner.query(`
      ALTER TABLE legal_consents
      ADD COLUMN IF NOT EXISTS deposit_terms_version VARCHAR(20)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE legal_consents DROP COLUMN IF EXISTS deposit_accepted`);
    await queryRunner.query(`ALTER TABLE legal_consents DROP COLUMN IF EXISTS deposit_terms_version`);
  }
}
