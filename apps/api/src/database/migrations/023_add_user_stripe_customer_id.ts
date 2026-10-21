import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserStripeCustomerId1761000000000 implements MigrationInterface {
  name = 'AddUserStripeCustomerId1761000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Stripe-Customer-ID pro Nutzer. Nötig fürs Miet-Kautionsmodell:
    // nur über einen Customer kann die Karte der Miet-Zahlung für die
    // Kautions-Reservierung wiederverwendet werden.
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR DEFAULT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id
    `);
  }
}
