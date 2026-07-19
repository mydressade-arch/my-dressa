# Features 2, 3, 4 — FERTIG (alle 6 Features damit komplett)

## Feature 2: Kaution + 3 Fälle
Der Admin entscheidet bei einer Beschwerde über die Kaution:
1. VOLL ZURÜCK an den Kunden      → Button "Kaution → Kunde zurück"
2. VOLL an den Händler            → "Kaution einbehalten", Feld leer lassen
3. TEILWEISE                      → "Kaution einbehalten" + Betrag eingeben
                                     (Rest geht automatisch an den Kunden zurück!)

⚠️ WICHTIGER BUGFIX: Die Admin-Entscheidung nutzte noch die ALTE Hold-Logik
(capture/cancel). Da die Kaution jetzt sofort abgebucht wird (Option A),
hätten diese Aufrufe fehlgeschlagen — der Admin hätte die Kaution NICHT
zurückgeben können. Jetzt korrekt:
  - Freigeben  = Stripe Refund (Geld zurück an den Kunden)
  - Einbehalten = Geld bleibt, Transfer an den Händler
  - Teilbetrag  = Teil-Refund an den Kunden + Rest an den Händler

## Feature 3: Zustimmung zu den Bedingungen
- Bestehende AGB/Mietbedingungen-Checkbox bleibt
- NEU: separater, hervorgehobener KAUTIONS-Block mit eigener Checkbox
  ("Ich stimme der Kaution von €X und den Kautionsbedingungen zu")
- Ohne BEIDE Zustimmungen ist keine Miete möglich (Backend prüft das!)
- Die Zustimmung wird protokolliert (legal_consents.deposit_accepted)
- Der finale Rechtstext vom Anwalt kann später einfach eingesetzt werden

## Feature 4: Beschwerdesystem
- Der Händler kann jetzt auch "Verspätete Rückgabe" melden (nicht nur Schaden)
- Neue Gründe: Leicht / Mittel / Schwer / VERSPÄTET / Nicht zurückgegeben
- Die Beschwerde erscheint im Admin-Panel unter "Schadensmeldungen"
- Der Admin entscheidet dort über die Kaution (siehe Feature 2)
- Bei "beschädigt/verspätet/verloren" wird die Kaution NICHT automatisch
  zurückgezahlt, sondern wartet auf die Admin-Entscheidung

## Migration ausführen
docker exec -it dressa_postgres psql -U dressa -d dressa_db -c "
ALTER TABLE legal_consents ADD COLUMN IF NOT EXISTS deposit_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_consents ADD COLUMN IF NOT EXISTS deposit_terms_version VARCHAR(20);"

(Hinweis: 'late' als Beschwerdegrund braucht KEINE Migration —
 die Spalte severity ist ein VARCHAR, kein DB-Enum.)

## Testen
1. Miete buchen → BEIDE Checkboxen nötig (AGB + Kaution), sonst kein Weiter
2. Als Händler: "Erhalt bestätigen" → "Verspätet zurück" wählen
3. Als Admin: Schadensmeldungen → die Meldung erscheint mit "Verspätet"
4. Teilbetrag testen: "Kaution einbehalten" + z.B. 30 € eingeben
   → 30 € an den Händler, Rest zurück an den Kunden (im Stripe-Dashboard prüfen!)
