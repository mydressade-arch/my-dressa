-- ═══════════════════════════════════════════════════════════
-- ALLE MIGRATIONEN FÜR DIE 6 FEATURES — in einem Rutsch
-- Ausführen mit:
-- docker exec -i dressa_postgres psql -U dressa -d dressa_db < ALLE_MIGRATIONEN.sql
-- ═══════════════════════════════════════════════════════════

-- ── Mietmodell (fester Preis + Strafe) ──────────────────────
ALTER TABLE rentals DROP CONSTRAINT IF EXISTS rentals_duration_days_check;
ALTER TABLE rentals ADD CONSTRAINT rentals_duration_days_check CHECK (duration_days BETWEEN 1 AND 90);
ALTER TABLE products ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE rentals  ADD COLUMN IF NOT EXISTS penalty_applied_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE rentals  ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(10,2) DEFAULT NULL;

-- ── Feature 6: Beidseitige Rückgabe-Bestätigung ─────────────
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS customer_confirmed_return BOOLEAN DEFAULT FALSE;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS merchant_confirmed_return BOOLEAN DEFAULT FALSE;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS merchant_confirmed_at TIMESTAMPTZ;

-- ── Feature 1: Einstellungen + Mietdauer pro Produkt ────────
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO app_settings (key, value, description)
VALUES ('rental_durations', '7,10', 'Erlaubte Mietdauern in Tagen')
ON CONFLICT (key) DO NOTHING;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rental_duration_days INTEGER DEFAULT 10;

-- ── Feature 5: Mietverlängerung ─────────────────────────────
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
);
CREATE INDEX IF NOT EXISTS idx_rental_extensions_rental ON rental_extensions(rental_id);
INSERT INTO app_settings (key, value, description)
VALUES ('max_extensions_per_rental', '2', 'Maximale Verlängerungen pro Miete')
ON CONFLICT (key) DO NOTHING;

-- ── Feature 3: Separate Kautions-Zustimmung ─────────────────
ALTER TABLE legal_consents ADD COLUMN IF NOT EXISTS deposit_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_consents ADD COLUMN IF NOT EXISTS deposit_terms_version VARCHAR(20);

-- ── Optional: Größen/Farben vorbelegen (sonst greifen Defaults) ──
INSERT INTO app_settings (key, value, description)
VALUES ('product_sizes', 'XS,S,M,L,XL,XXL,34,36,38,40,42,44,46,ONE SIZE', 'Verfügbare Größen')
ON CONFLICT (key) DO NOTHING;
INSERT INTO app_settings (key, value, description)
VALUES ('product_colors', 'Schwarz,Weiß,Beige,Creme,Grau,Navy,Blau,Rot,Bordeaux,Rosa,Grün,Gold,Silber,Bunt', 'Verfügbare Farben')
ON CONFLICT (key) DO NOTHING;

-- Fertig! Prüfen:
-- SELECT key, value FROM app_settings;

-- ── Fix: Verlängerungs-Orders brauchen keinen Versand ───────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_extension BOOLEAN DEFAULT FALSE;
UPDATE orders o SET is_extension = TRUE
  FROM rental_extensions e WHERE e.order_id = o.id;
UPDATE orders o SET status = 'delivered'
  FROM rental_extensions e
  WHERE e.order_id = o.id AND e.status = 'paid'
    AND o.status IN ('paid', 'pending');

-- ── Fix: Versandkosten auch beim Kauf ───────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0;
UPDATE orders o SET shipping_cost = COALESCE(p.shipping_cost, 0)
  FROM product_variants v JOIN products p ON p.id = v.product_id
  WHERE o.product_variant_id = v.id AND o.type = 'purchase' AND o.shipping_cost = 0;

-- Auch Miet-Bestellungen mit Versand nachfüllen (Aufschlüsselung)
UPDATE orders o SET shipping_cost = COALESCE(p.shipping_cost, 0)
  FROM product_variants v JOIN products p ON p.id = v.product_id
  WHERE o.product_variant_id = v.id AND o.type = 'rental' AND o.shipping_cost = 0;

-- ── Newsletter-Anmeldungen (Startseite) ─────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  source VARCHAR(50) DEFAULT 'homepage',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- v105: Stripe-Customer-ID für Karten-Wiederverwendung (Kautions-Modell)
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR DEFAULT NULL;
