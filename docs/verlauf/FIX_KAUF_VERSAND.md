# Fix: Versand & Provision beim KAUF

## Was war falsch
Der Kauf hatte drei zusammenhängende Fehler:

1. VERSAND WURDE NICHT BERECHNET
   Kauf-totalPrice = salePrice (ohne Versand). Der Kunde sah zwar im
   Checkout eine "Gesamt"-Zeile MIT Versand, zahlte aber nur den
   Produktpreis. Anzeige und Zahlung widersprachen sich.

2. PROVISION AUF DEN VERSAND
   Beim Kauf wurde die Provision auf den GESAMTbetrag gerechnet — also
   auch auf die Versandkosten. Das widersprach der Miete (dort korrekt
   ohne Versand) und deiner Regel "Versand bleibt beim Händler".

3. Betraf BEIDE Modi: Test (Webhook) UND Live (Stripe application_fee).

## Wie es jetzt ist (konsistent mit der Miete)
Der Händler stellt shipping_cost pro Produkt ein (kann 0 sein = gratis).
  - Kauf-totalPrice = salePrice + shipping   (wie Miete)
  - Provision NUR auf den Produktpreis, NIE auf den Versand
  - Versand bleibt zu 100% beim Händler

## Beispiel: Kauf 599€ + 10€ Versand, Provision 15%
  Kunde zahlt:        609,00 €
  davon Versand:       10,00 €
  Provision 15%:      −89,85 €   (15% von 599, NICHT von 609)
  ───────────────────────────
  Händler-Anteil:     519,15 €   (= 509,15 Produkt + 10 Versand)

## Geändert in
BACKEND:
  - orders.service: Kauf-totalPrice = salePrice + shipping, shipping am Order
  - order.entity: neues Feld shipping_cost + Migration 022
  - payments.service: Provisionsbasis ohne Versand (Test UND Live)
WEB:
  - Kauf-Checkout: Button + Betrag zeigen jetzt die Gesamtsumme
  - Händler-Aufschlüsselung: Versand-Zeile auch beim Kauf
APP:
  - Order-Model: shippingCost; Aufschlüsselung: Versand auch beim Kauf
  (Der App-Kauf-Checkout rechnete den Versand schon vorher korrekt.)

## Migration
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0;
UPDATE orders o SET shipping_cost = COALESCE(p.shipping_cost, 0)
  FROM product_variants v JOIN products p ON p.id = v.product_id
  WHERE o.product_variant_id = v.id AND o.type = 'purchase' AND o.shipping_cost = 0;
(auch in ALLE_MIGRATIONEN.sql)
