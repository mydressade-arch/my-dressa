-- ─── Test Commission für Payout Request Test ─────────────────────────────────
-- Führe dieses Script in deiner PostgreSQL Datenbank aus:
-- psql -U postgres -d mydressa -f test-commission.sql

DO $$
DECLARE
  v_merchant_id   UUID;
  v_order_id      UUID;
BEGIN

  SELECT id INTO v_merchant_id FROM merchant_profiles LIMIT 1;
  SELECT id INTO v_order_id    FROM orders            LIMIT 1;

  IF v_merchant_id IS NULL THEN
    RAISE NOTICE 'Kein MerchantProfile gefunden!';
    RETURN;
  END IF;

  IF v_order_id IS NULL THEN
    RAISE NOTICE 'Keine Order gefunden!';
    RETURN;
  END IF;

  -- Kauf Commission
  INSERT INTO commissions (id, order_id, merchant_id, gross_amount, platform_amount, merchant_amount, type)
  VALUES (gen_random_uuid(), v_order_id, v_merchant_id, 100.00, 15.00, 85.00, 'purchase');

  -- Miet Commission
  INSERT INTO commissions (id, order_id, merchant_id, gross_amount, platform_amount, merchant_amount, type)
  VALUES (gen_random_uuid(), v_order_id, v_merchant_id, 60.00, 6.00, 54.00, 'rental');

  RAISE NOTICE 'Fertig — €139 ausstehend für Händler %', v_merchant_id;

END $$;
