# v55 — Bugfixes + Größen/Farben vom Admin verwaltbar

## 1. BUGFIX: Kalender zeigte 10 Tage + "max 7 Tage"
Drei alte Texte aus dem 7-Tage-Modell entfernt:
- RentalCalendar: "Enddatum auswählen (max. 7 Tage...)" → zeigt jetzt die
  echte Mietdauer des Produkts
- Produktdetail: "Max 7 Tage" → "{X} Tage Mietdauer"
  Auch "/ day" → "/ Miete" (Preis ist fest, nicht pro Tag!)
- AGB-Text: an das neue Modell angepasst

WICHTIG: Wenn der Kalender IMMER NOCH 10 Tage zeigt, obwohl du 7 gewählt
hast, ist die MIGRATION NOCH NICHT GELAUFEN. Führ das aus:

docker exec -it dressa_postgres psql -U dressa -d dressa_db -c "
CREATE TABLE IF NOT EXISTS app_settings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), key VARCHAR(100) UNIQUE NOT NULL, value TEXT NOT NULL, description VARCHAR(255), updated_at TIMESTAMPTZ DEFAULT NOW());
INSERT INTO app_settings (key, value, description) VALUES ('rental_durations', '7,10', 'Erlaubte Mietdauern') ON CONFLICT (key) DO NOTHING;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rental_duration_days INTEGER DEFAULT 10;"

Danach das Produkt EINMAL neu speichern (damit die Dauer gesetzt wird).

## 2. Größen + Farben: auswählbar statt Freitext
- Händler wählt Größe UND Farbe aus Dropdowns (kein Tippen mehr)
- BEIDE sind jetzt PFLICHT (vorher war Farbe optional)
- Der Admin pflegt die Listen unter /admin/settings — wie bei Kategorien

## Neue Endpoints
GET /settings/product-sizes           (öffentlich)
GET /settings/product-colors          (öffentlich)
PUT /settings/admin/product-sizes     (Admin)
PUT /settings/admin/product-colors    (Admin)

## Umgesetzt in
BACKEND: settings/ erweitert (Farben + Größen als Settings)
WEB: Admin /admin/settings (3 Blöcke: Mietdauern, Größen, Farben)
     Händler-Editor (new + edit): Dropdowns statt Textfelder + Pflicht
APP:  Größen/Farben-Dropdowns holen die Werte jetzt vom Admin
      (mit Fallback auf die Standardliste)

## Testen
1. Als Admin: /admin/settings → Farben z.B. auf "Schwarz, Rot, Gold" ändern
2. Als Händler: Produkt anlegen → Farb-Dropdown zeigt genau diese drei
3. Versuche zu speichern ohne Farbe → Fehlermeldung
