# Feature 1: Mietdauer (7/10 Tage, Admin-konfigurierbar) — FERTIG

## Was jetzt geht
- Admin legt im Admin-Panel fest, welche Mietdauern erlaubt sind (z.B. 7, 10)
  → /admin/settings — ohne Code-Änderung anpassbar!
- Händler wählt pro Kleid eine dieser Dauern (Dropdown im Produkt-Editor)
- Kunde sieht beim Buchen die Dauer des jeweiligen Kleids
- Backend berechnet endDate = Startdatum + Dauer des Produkts

## Umgesetzt in
BACKEND:
- settings/ (neu): AppSetting-Entity, Service, Controller, Module
- Migration 018: Tabelle app_settings + products.rental_duration_days
- products: Feld rentalDurationDays (Entity + DTO)
- rentals.service: nutzt Produkt-Dauer statt fester 10 Tage,
  validiert gegen die erlaubten Werte

FLUTTER-APP:
- Product-Model: rentalDurationDays
- rentalDurationsProvider (lädt erlaubte Werte)
- Händler-Editor: Mietdauer-Dropdown
- Checkout: nutzt Produkt-Dauer (dynamisch statt 10)

WEB:
- settingsApi (api.ts)
- Admin-Panel: neue Seite /admin/settings (Mietdauern verwalten)
- Händler-Editor (new + edit): Mietdauer-Dropdown
- RentalCalendar: dynamische Dauer
- Produktdetail: übergibt die Dauer an den Kalender

## Neue Endpoints
GET  /settings/rental-durations         (öffentlich — für Dropdowns)
GET  /settings/admin/all                (Admin)
PUT  /settings/admin/rental-durations   (Admin, body: { durations: [7,10] })

## Migration ausführen
docker exec -it dressa_postgres psql -U dressa -d dressa_db -c "
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
"

## Testen
1. Als Admin: /admin/settings → Dauern auf z.B. "7, 10, 14" ändern
2. Als Händler: Produkt bearbeiten → Dropdown zeigt 7/10/14
3. Produkt auf 7 Tage setzen, speichern
4. Als Kunde: dieses Produkt mieten → Rückgabedatum = Start + 7 Tage
5. Anderes Produkt mit 10 Tagen → Rückgabe = Start + 10 Tage
