import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMerchantRequests1748900000000 implements MigrationInterface {
  name = 'AddMerchantRequests1748900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Enum-Typ nur anlegen wenn noch nicht vorhanden
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE merchant_request_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS merchant_requests (
        id            UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID                      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        shop_name     VARCHAR(255)              NOT NULL,
        status        merchant_request_status   NOT NULL DEFAULT 'pending',
        reason        VARCHAR(500),
        reviewed_by   UUID,
        created_at    TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ               NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_merchant_requests_user   ON merchant_requests(user_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_merchant_requests_status ON merchant_requests(status);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS merchant_requests`);
    await queryRunner.query(`DROP TYPE  IF EXISTS merchant_request_status`);
  }
}
