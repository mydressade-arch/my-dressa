import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckoutPaymentIntent1750000000000 implements MigrationInterface {
  name = 'AddCheckoutPaymentIntent1750000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // PaymentIntent-ID, die beim Checkout erzeugt wird — getrennt von
    // stripe_payment_intent_id (das erst bei ERFOLGREICHER Zahlung gesetzt wird
    // und "bezahlt" bedeutet). Hiermit kann der Aufräum-Job den echten Stripe-
    // Status einer noch offenen (pending) Bestellung prüfen und sie nur dann
    // löschen, wenn wirklich keine Zahlung mehr unterwegs ist.
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS checkout_payment_intent_id VARCHAR(255)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS checkout_payment_intent_id`);
  }
}
