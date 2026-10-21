# 2 Fixes: Riesiges Icon bei leeren Seiten + Newsletter funktioniert

## Problem 1: Icon wird riesig / vollbild bei leeren Seiten
Nebeneffekt der SVG-Umstellung. Empty-State-Icons nutzen
fontSize:'clamp(24px,3vw,40px)'. Meine Icon-Komponente machte
parseInt('clamp(...)') → NaN → SVG ohne Größe → riesig.

Behoben in Icon.tsx: Wenn fontSize eine CSS-Funktion (clamp, rem, %) ist,
wird sie jetzt als width/height im Style gesetzt statt als size={NaN}.
Saubere px-Werte ('18px', 20) funktionieren wie vorher.
Zentral gelöst → alle betroffenen Icons auf einmal.

## Problem 2: Subscribe-Button ohne Funktion
Der Newsletter-Button auf der Startseite war reine Deko (kein onClick).
Jetzt funktioniert er: E-Mails werden in der DB gesammelt.

Backend (neues Modul newsletter/):
- Tabelle newsletter_subscribers (email unique, source, created_at)
- POST /newsletter/subscribe (öffentlich) — speichert E-Mail
  (doppelte werden still ignoriert, kein Fehler)
- GET /newsletter/admin/subscribers (nur Admin) — für Export

Frontend:
- Neue Komponente NewsletterSignup.tsx (mit State, Validierung,
  Erfolgs-/Fehlermeldung)
- E-Mail-Validierung, Enter-Taste, Ladezustand
- Nach Anmeldung: "Danke! Du bist angemeldet."

## Migration (neue Tabelle)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  source VARCHAR(50) DEFAULT 'homepage',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
(auch in ALLE_MIGRATIONEN.sql)

## Export der E-Mails später
GET /newsletter/admin/subscribers (als Admin eingeloggt) gibt alle
Anmeldungen zurück. Kann man später als CSV exportieren oder in Brevo
importieren.
