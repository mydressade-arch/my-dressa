# Mietmodell testen — ohne 10 Tage zu warten

## Was passiert technisch (der Ablauf)

1. Kunde bucht → Rental wird angelegt mit Status `pending`,
   endDate = Start + 10 Tage
2. Kunde zahlt (Miete + Kaution) → Stripe-Webhook setzt Status `active`,
   Kaution wird SOFORT abgebucht (nicht nur reserviert)
3. Täglich um 8:00 Uhr läuft der Scheduler `markOverdueRentals`:
   - Findet alle Mieten mit `end_date < heute` UND Status `active`
   - Setzt sie auf `overdue`
   - Löst die Strafe aus (`applyPenalty`):
     * Kaution wird EINBEHALTEN (Status RETAINED, Geld bleibt da)
     * Strafbetrag des Produkts wird am Rental vermerkt
     * Kunde bekommt eine E-Mail
4. Gibt der Kunde rechtzeitig zurück (Händler bestätigt, Zustand "gut"):
   → Kaution wird per Stripe ZURÜCKERSTATTET (refund)

═══════════════════════════════════════════════════════════
## TEST OHNE 10 TAGE WARTEN
═══════════════════════════════════════════════════════════

Es gibt zwei Dinge zu umgehen:
(a) das 10-Tage-Enddatum
(b) den täglichen 8-Uhr-Cron

### Methode 1: Enddatum in die Vergangenheit setzen + Test-Endpoint (empfohlen)

**Schritt 1** — Eine Miete anlegen und bezahlen (mit Stripe-Testkarte 4242…).
Sie ist jetzt `active`.

**Schritt 2** — Das Enddatum dieser Miete künstlich in die Vergangenheit
setzen, damit sie als überfällig gilt. In der Datenbank:

```sql
-- Alle aktiven Mieten künstlich überfällig machen (zum Testen!)
UPDATE rentals
SET end_date = CURRENT_DATE - INTERVAL '1 day'
WHERE status = 'active';
```

(Docker-Befehl:
```bash
docker exec -it dressa_postgres psql -U dressa -d dressa_db -c "UPDATE rentals SET end_date = CURRENT_DATE - INTERVAL '1 day' WHERE status = 'active';"
```
)

**Schritt 3** — Den Overdue-Check sofort auslösen (statt auf 8 Uhr zu warten).
Dafür gibt es jetzt einen Admin-Test-Endpoint:

```
POST /api/v1/rentals/admin/run-overdue-check
Authorization: Bearer <DEIN_ADMIN_TOKEN>
```

Mit curl:
```bash
curl -X POST http://localhost:3001/api/v1/rentals/admin/run-overdue-check \
  -H "Authorization: Bearer DEIN_ADMIN_TOKEN"
```

Antwort z.B.: `{ "message": "Overdue-Check ausgeführt", "processed": 1 }`

**Schritt 4** — Prüfen was passiert ist:
```sql
-- Rental sollte jetzt 'overdue' sein + penalty_applied_at gesetzt
SELECT id, status, end_date, penalty_applied_at, penalty_amount FROM rentals;

-- Kaution sollte 'retained' sein
SELECT id, status, retained_amount FROM deposits;
```

Im Stripe-Dashboard (Test-Modus): Die Kaution-Zahlung ist abgebucht
und NICHT zurückerstattet (= einbehalten).
Der Kunde sollte eine "Mietartikel überfällig"-E-Mail bekommen.

═══════════════════════════════════════════════════════════
## TEST: Pünktliche Rückgabe (Kaution zurück)
═══════════════════════════════════════════════════════════

**Schritt 1** — Miete anlegen + bezahlen (Status `active`).

**Schritt 2** — Als Händler die Rückgabe bestätigen mit Zustand "gut":
```
PATCH /api/v1/rentals/<RENTAL_ID>/return
Authorization: Bearer <HAENDLER_TOKEN>
Body: { "returnCondition": "good" }
```

**Schritt 3** — Prüfen:
```sql
SELECT id, status FROM rentals;       -- sollte 'returned'
SELECT id, status FROM deposits;      -- sollte 'released'
```
Im Stripe-Dashboard: Die Kaution wurde per Refund zurückerstattet.

═══════════════════════════════════════════════════════════
## Was passiert bei "mehr als 10 Tage nicht zurückgegeben"
═══════════════════════════════════════════════════════════

Sobald end_date überschritten ist (Tag 11), beim nächsten Scheduler-Lauf
(oder Test-Endpoint):

1. Status → `overdue`
2. Kaution wird EINBEHALTEN (Kunde bekommt sie NICHT zurück)
3. Der Strafbetrag (den der Händler am Produkt gesetzt hat) wird am
   Rental vermerkt (Feld penalty_amount)
4. Kunde bekommt eine E-Mail mit Betrag

WICHTIG: Die Strafe wird nur EINMAL ausgelöst (penalty_applied_at
verhindert Doppel-Auslösung). Bleibt der Artikel noch länger weg,
passiert nichts Weiteres automatisch — dann ist es ein Fall für
deinen Support / ggf. Inkasso. Das ist bewusst so, weil automatische
Mehrfach-Abbuchungen rechtlich heikel sind.

═══════════════════════════════════════════════════════════
## Den Test-Endpoint später entfernen
═══════════════════════════════════════════════════════════
Der Endpoint `POST /rentals/admin/run-overdue-check` ist nur fürs
Testen. Vor dem echten Live-Gang kannst du ihn aus
rentals.controller.ts entfernen (oder als Admin-only belassen — er
ist durch Admin-Rolle geschützt, also unkritisch).
