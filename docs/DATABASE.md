# My Dressa — Datenbankdokumentation

## Schnellstart

```bash
# 1. PostgreSQL starten
docker-compose up -d postgres

# 2. Migration ausführen (erstellt alle Tabellen)
cd apps/api && npm run migration:run

# 3. Testdaten einspielen (nur Dev!)
npm run db:seed
```

## Tabellen (14)

| Tabelle           | Beschreibung                          |
|-------------------|---------------------------------------|
| users             | Alle Nutzer — Kunde/Händler/Admin     |
| addresses         | Lieferadressen                        |
| merchant_profiles | Händler, Stripe-Account, Guthaben     |
| products          | Produkte mit Kauf-/Mietpreis          |
| product_variants  | Größen + Farben je Produkt            |
| product_images    | S3-URLs der Bilder                    |
| orders            | Jede Transaktion (Kauf oder Miete)    |
| rentals           | Miet-Zeiträume mit Overlap-Schutz    |
| deposits          | Kautionen: held/released/retained    |
| legal_consents    | DSGVO — Zustimmungen mit Timestamp   |
| commissions       | Provisionsbuchungen je Order          |
| merchant_payouts  | Stripe Transfers an Händler           |
| reviews           | Kundenbewertungen (1–5 Sterne)        |
| support_tickets   | Support-Anfragen                      |

## Kritischer Constraint

```sql
CONSTRAINT rentals_no_overlap
  EXCLUDE USING gist (
    product_variant_id WITH =,
    daterange(start_date, end_date, '[)') WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'returned'))
```

PostgreSQL verhindert Doppelbuchungen auf DB-Ebene — race-condition-sicher, kein Code kann das umgehen.

## Test-Accounts (nach Seed)

| Rolle   | E-Mail                  | Passwort     |
|---------|-------------------------|--------------|
| Admin   | admin@mydressa.de       | Admin123!    |
| Händler | haendler@mydressa.de    | Merchant123! |
| Kunde   | kunde@mydressa.de       | Customer123! |
