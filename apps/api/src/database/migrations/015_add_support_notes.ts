import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportNotes1749100000000 implements MigrationInterface {
  name = 'AddSupportNotes1749100000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS support_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id),
        note TEXT NOT NULL,
        agent_id UUID NOT NULL,
        agent_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS support_notes`);
  }
}
