import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    // ── Extensions ──────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`);

    // ── ENUM Types ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE user_role AS ENUM ('customer','merchant','support','admin')
    `);
    await queryRunner.query(`
      CREATE TYPE product_status AS ENUM ('draft','active','inactive','suspended')
    `);
    await queryRunner.query(`
      CREATE TYPE order_type AS ENUM ('purchase','rental')
    `);
    await queryRunner.query(`
      CREATE TYPE order_status AS ENUM
        ('pending','paid','shipped','delivered','returned','cancelled','refunded')
    `);
    await queryRunner.query(`
      CREATE TYPE rental_status AS ENUM
        ('pending','active','pending_return','returned','overdue','cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE deposit_status AS ENUM
        ('held','released','retained','partially_retained')
    `);
    await queryRunner.query(`
      CREATE TYPE payout_status AS ENUM ('pending','processing','paid','failed')
    `);
    await queryRunner.query(`
      CREATE TYPE order_commission_type AS ENUM ('purchase','rental')
    `);

    // ── TABLE: users ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE users (
        id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email                    VARCHAR(255) NOT NULL UNIQUE,
        password_hash            VARCHAR(255) NOT NULL,
        role                     user_role    NOT NULL DEFAULT 'customer',
        first_name               VARCHAR(100) NOT NULL,
        last_name                VARCHAR(100) NOT NULL,
        phone                    VARCHAR(30),
        is_verified              BOOLEAN      NOT NULL DEFAULT FALSE,
        is_active                BOOLEAN      NOT NULL DEFAULT TRUE,
        email_verification_token VARCHAR(255),
        refresh_token_hash       VARCHAR(255),
        created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_users_email ON users(email)`);
    await queryRunner.query(`CREATE INDEX idx_users_role  ON users(role)`);

    // ── TABLE: addresses ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE addresses (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        street     VARCHAR(255) NOT NULL,
        city       VARCHAR(100) NOT NULL,
        zip        VARCHAR(20)  NOT NULL,
        country    VARCHAR(10)  NOT NULL DEFAULT 'DE',
        is_default BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_addresses_user ON addresses(user_id)`);

    // ── TABLE: merchant_profiles ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE merchant_profiles (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id           UUID           NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        stripe_account_id VARCHAR(100),
        shop_name         VARCHAR(150)   NOT NULL,
        balance_pending   DECIMAL(10,2)  NOT NULL DEFAULT 0,
        balance_paid      DECIMAL(10,2)  NOT NULL DEFAULT 0,
        is_verified       BOOLEAN        NOT NULL DEFAULT FALSE,
        created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_merchant_user ON merchant_profiles(user_id)`);

    // ── TABLE: products ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE products (
        id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
        merchant_id  UUID           NOT NULL REFERENCES merchant_profiles(id) ON DELETE CASCADE,
        title        VARCHAR(200)   NOT NULL,
        description  TEXT,
        sale_price   DECIMAL(10,2),
        rental_price DECIMAL(10,2),
        category     VARCHAR(100),
        status       product_status NOT NULL DEFAULT 'draft',
        is_for_sale  BOOLEAN        NOT NULL DEFAULT FALSE,
        is_for_rent  BOOLEAN        NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_products_merchant  ON products(merchant_id)`);
    await queryRunner.query(`CREATE INDEX idx_products_status    ON products(status)`);
    await queryRunner.query(`CREATE INDEX idx_products_category  ON products(category)`);
    await queryRunner.query(`
      CREATE INDEX idx_products_fts
        ON products USING gin(to_tsvector('german', title || ' ' || COALESCE(description,'')))
    `);

    // ── TABLE: product_variants ─────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE product_variants (
        id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id     UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        size           VARCHAR(20) NOT NULL,
        color          VARCHAR(50) NOT NULL,
        stock_quantity INTEGER     NOT NULL DEFAULT 1 CHECK (stock_quantity >= 0)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_variants_product ON product_variants(product_id)`);

    // ── TABLE: product_images ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE product_images (
        id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        url        VARCHAR(500) NOT NULL,
        sort_order INTEGER      NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_images_product ON product_images(product_id)`);

    // ── TABLE: orders ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE orders (
        id                      UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id                 UUID         NOT NULL REFERENCES users(id),
        product_variant_id      UUID         NOT NULL REFERENCES product_variants(id),
        type                    order_type   NOT NULL,
        status                  order_status NOT NULL DEFAULT 'pending',
        total_price             DECIMAL(10,2) NOT NULL,
        commission_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
        merchant_amount         DECIMAL(10,2) NOT NULL DEFAULT 0,
        stripe_payment_intent_id VARCHAR(100),
        shipping_address        JSONB,
        created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_orders_user    ON orders(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_orders_status  ON orders(status)`);
    await queryRunner.query(`CREATE INDEX idx_orders_variant ON orders(product_variant_id)`);

    // ── TABLE: rentals ───────────────────────────────────────────
    // KRITISCH: Exclusion Constraint verhindert Doppelbuchungen auf DB-Ebene
    await queryRunner.query(`
      CREATE TABLE rentals (
        id                 UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id           UUID          NOT NULL UNIQUE REFERENCES orders(id),
        product_variant_id UUID          NOT NULL REFERENCES product_variants(id),
        start_date         DATE          NOT NULL,
        end_date           DATE          NOT NULL,
        duration_days      INTEGER       NOT NULL CHECK (duration_days BETWEEN 1 AND 7),
        status             rental_status NOT NULL DEFAULT 'pending',
        returned_at        TIMESTAMPTZ,
        damage_notes       TEXT,
        created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

        CONSTRAINT rentals_dates_check
          CHECK (end_date > start_date),

        -- KRITISCHER CONSTRAINT: verhindert überlappende Buchungen für dieselbe Variante
        CONSTRAINT rentals_no_overlap
          EXCLUDE USING gist (
            product_variant_id WITH =,
            daterange(start_date, end_date, '[)') WITH &&
          )
          WHERE (status NOT IN ('cancelled', 'returned'))
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_rentals_variant ON rentals(product_variant_id)`);
    await queryRunner.query(`CREATE INDEX idx_rentals_status  ON rentals(status)`);
    await queryRunner.query(`CREATE INDEX idx_rentals_dates   ON rentals(start_date, end_date)`);
    await queryRunner.query(`CREATE INDEX idx_rentals_order   ON rentals(order_id)`);

    // ── TABLE: deposits ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE deposits (
        id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
        rental_id        UUID           NOT NULL UNIQUE REFERENCES rentals(id),
        amount           DECIMAL(10,2)  NOT NULL CHECK (amount > 0),
        status           deposit_status NOT NULL DEFAULT 'held',
        stripe_hold_id   VARCHAR(100),
        released_at      TIMESTAMPTZ,
        release_reason   TEXT,
        retained_amount  DECIMAL(10,2)  DEFAULT 0,
        created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
      )
    `);

    // ── TABLE: legal_consents ────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE legal_consents (
        id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id              UUID        NOT NULL REFERENCES users(id),
        order_id             UUID        REFERENCES orders(id),
        agb_version          VARCHAR(20) NOT NULL,
        rental_terms_version VARCHAR(20),
        liability_accepted   BOOLEAN     NOT NULL DEFAULT FALSE,
        ip_address           INET,
        accepted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_consents_user  ON legal_consents(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_consents_order ON legal_consents(order_id)`);

    // ── TABLE: commissions ───────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE commissions (
        id              UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id        UUID                  NOT NULL UNIQUE REFERENCES orders(id),
        merchant_id     UUID                  NOT NULL REFERENCES merchant_profiles(id),
        gross_price     DECIMAL(10,2)         NOT NULL,
        rate            DECIMAL(5,2)          NOT NULL,
        platform_amount DECIMAL(10,2)         NOT NULL,
        merchant_amount DECIMAL(10,2)         NOT NULL,
        type            order_commission_type NOT NULL,
        payout_id       UUID,
        created_at      TIMESTAMPTZ           NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_commissions_merchant ON commissions(merchant_id)`);
    await queryRunner.query(`CREATE INDEX idx_commissions_order    ON commissions(order_id)`);

    // ── TABLE: merchant_payouts ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE merchant_payouts (
        id                 UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        merchant_id        UUID          NOT NULL REFERENCES merchant_profiles(id),
        amount             DECIMAL(10,2) NOT NULL CHECK (amount > 0),
        status             payout_status NOT NULL DEFAULT 'pending',
        stripe_transfer_id VARCHAR(100),
        paid_at            TIMESTAMPTZ,
        created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_payouts_merchant ON merchant_payouts(merchant_id)`);

    // ── TABLE: reviews ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE reviews (
        id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID        NOT NULL REFERENCES users(id),
        product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        order_id   UUID        NOT NULL UNIQUE REFERENCES orders(id),
        rating     SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment    TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_reviews_product ON reviews(product_id)`);

    // ── TABLE: support_tickets ───────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE ticket_status   AS ENUM ('open','in_progress','resolved','closed')`);
    await queryRunner.query(`
      CREATE TYPE ticket_priority AS ENUM ('low','medium','high','urgent')`);
    await queryRunner.query(`
      CREATE TABLE support_tickets (
        id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID            NOT NULL REFERENCES users(id),
        order_id   UUID            REFERENCES orders(id),
        subject    VARCHAR(255)    NOT NULL,
        message    TEXT            NOT NULL,
        status     ticket_status   NOT NULL DEFAULT 'open',
        priority   ticket_priority NOT NULL DEFAULT 'medium',
        created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ     NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_tickets_user   ON support_tickets(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_tickets_status ON support_tickets(status)`);

    // ── Auto-update updated_at Trigger ───────────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trigger_set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql
    `);
    for (const table of ['users','products','orders','support_tickets']) {
      await queryRunner.query(`
        CREATE TRIGGER set_updated_at_${table}
          BEFORE UPDATE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()
      `);
    }
  }

  // ── DOWN — alles rückgängig ──────────────────────────────────
  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'support_tickets','reviews','merchant_payouts','commissions',
      'legal_consents','deposits','rentals','orders',
      'product_images','product_variants','products',
      'merchant_profiles','addresses','users',
    ];
    for (const t of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
    }
    const types = [
      'ticket_priority','ticket_status','payout_status','deposit_status',
      'rental_status','order_status','order_type','product_status',
      'order_commission_type','user_role',
    ];
    for (const t of types) {
      await queryRunner.query(`DROP TYPE IF EXISTS ${t}`);
    }
  }
}
