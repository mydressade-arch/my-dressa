# Feature 5: Mietverlängerung — FERTIG
Plus zwei kritische Bugfixes (siehe unten!)

## Ablauf
1. Kunde sieht bei laufender Miete "Miete verlängern"
2. Er wählt aus den Optionen (kommen aus den Admin-Mietdauern, z.B. +7 / +10 Tage)
3. Gebühr = anteiliger Tagespreis × Zusatztage — OHNE VERSANDKOSTEN
4. Er bezahlt (Stripe) — KEINE erneute Kaution!
5. Nach der Zahlung: Rückgabedatum wird automatisch verlängert
6. War die Miete überfällig, wird sie wieder "aktiv"

## Grenzen
- Nur bei laufender (active) oder überfälliger (overdue) Miete
- Nicht mehr, wenn der Kunde die Rücksendung schon bestätigt hat
- Max. 2 Verlängerungen (Admin-Setting: max_extensions_per_rental)

## Neue Endpoints
GET  /rentals/:id/extension-options   (Optionen + Gebühren)
POST /rentals/:id/extend              (body: { extraDays }) → gibt orderId zurück
     danach normal über POST /payments/create-intent bezahlen

## Umgesetzt in
BACKEND: rental-extension.entity.ts, Migration 019, Service-Logik,
         Webhook verlängert das Enddatum nach Zahlung
WEB:     /rentals/[id]/extend (eigene Seite mit Stripe), Button im Account
APP:     Verlängern-Button in "Meine Mieten" + Bottom-Sheet + Payment Sheet

═══════════════════════════════════════════════════════════
## ⚠️ ZWEI KRITISCHE BUGS GEFUNDEN & BEHOBEN
═══════════════════════════════════════════════════════════

### 1. Kaution wurde nie mit Stripe verknüpft (GELDVERLUST-RISIKO)
Beim Umstieg auf "Kaution sofort abbuchen" wurde die Metadata von
'deposit_hold' auf 'deposit_charge' geändert — der Webhook prüfte aber
noch auf 'deposit_hold'. Folge: Die Stripe-ID der Kaution wurde NICHT
gespeichert → die Kaution hätte später weder zurückerstattet noch
einbehalten werden können. Das hätte echtes Geld gekostet.
→ BEHOBEN: Webhook akzeptiert jetzt beide Typen.

### 2. Verfügbarkeitsprüfung war ausgehebelt (DOPPELBUCHUNGEN)
Die Prüfung "ist das Kleid im Zeitraum frei?" nutzte dto.endDate —
das schickt der Client aber nicht mehr (wird serverseitig berechnet).
Der Wert war also undefined → die Prüfung lief ins Leere.
Ausserdem hätte das Rental ein leeres Enddatum bekommen können.
→ BEHOBEN: nutzt jetzt das berechnete Enddatum.

## Migration ausführen
docker exec -it dressa_postgres psql -U dressa -d dressa_db -c "
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
ON CONFLICT (key) DO NOTHING;"

## Testen
1. Miete anlegen + bezahlen (Status active)
2. Im Konto "Miete verlängern" → Optionen erscheinen mit Preisen
3. Option wählen → Stripe-Zahlung (Testkarte 4242...)
4. Prüfen: Rückgabedatum ist um die gewählten Tage verschoben
5. Im Stripe-Dashboard: NUR die Gebühr wurde belastet, KEINE zweite Kaution
