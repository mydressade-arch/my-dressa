-- SOFORT-FIX: Erlaubt 10 Tage Mietdauer
-- Die alte Constraint erlaubte nur 1-7 Tage. Direkt auf der DB ausführen
-- (z.B. Railway → Postgres → Query, oder psql).

-- 1. Alte Constraint entfernen
ALTER TABLE rentals DROP CONSTRAINT IF EXISTS rentals_duration_days_check;

-- 2. Neue Constraint (1-31 Tage)
ALTER TABLE rentals
  ADD CONSTRAINT rentals_duration_days_check CHECK (duration_days BETWEEN 1 AND 31);

-- 3. Falls noch nicht geschehen: penalty-Spalten anlegen
ALTER TABLE products ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE rentals  ADD COLUMN IF NOT EXISTS penalty_applied_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE rentals  ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(10,2) DEFAULT NULL;
