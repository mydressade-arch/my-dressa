# Professioneller Audit-Bericht — My Dressa vor Kundenübergabe
Datum: Juni 2026
Geprüft: Backend (NestJS), Flutter-App, Web-App (Next.js)

═══════════════════════════════════════════════════════════
## ZUSAMMENFASSUNG
═══════════════════════════════════════════════════════════
Das System ist solide und sicher gebaut. Ich habe 3 echte Probleme
gefunden und behoben (1 Sicherheitsleck, 2 Logik-Bugs). Der Rest der
Sicherheitsarchitektur ist überdurchschnittlich gut.

WICHTIG: Ich kann nur statisch prüfen (Code lesen), NICHT real ausführen.
Die manuellen Testfälle unten MUSST du selbst durchführen.

═══════════════════════════════════════════════════════════
## GEFUNDENE & BEHOBENE PROBLEME
═══════════════════════════════════════════════════════════

### 🔴 SICHERHEIT: Datenbank-Details wurden an den Client geleakt
Der Exception-Filter sendete bei DB-Fehlern `err.detail` an den Client —
das enthielt komplette Tabellenzeilen mit allen Spaltenwerten (genau die
"Fehlgeschlagene Zeile enthält..."-Meldung, die du gesehen hast).
Das ist Information Disclosure (verrät interne DB-Struktur).
→ BEHOBEN: Client bekommt nur generische Meldungen, Details nur ins Log.

### 🟠 LOGIK: Doppelte Kautions-Rückerstattung möglich
Wenn eine Miete überfällig war (Kaution als Strafe einbehalten) und der
Händler danach trotzdem "gute Rückgabe" buchte, wäre die bereits
einbehaltene Kaution fälschlich zurückerstattet worden (finanzielles Risiko).
→ BEHOBEN: Refund nur noch, wenn Kaution nicht bereits aufgelöst.

### 🟡 ROBUSTHEIT: Null-Zugriff in Strafe-E-Mail
`rental.order.id` ohne Null-Check (theoretischer Crash).
→ BEHOBEN: Null-safe gemacht.

═══════════════════════════════════════════════════════════
## WAS BEREITS SICHER IST (geprüft, kein Handlungsbedarf)
═══════════════════════════════════════════════════════════
✓ Alle Admin/Support/Commission-Endpoints: Guard auf Klassen-Ebene
✓ Stripe-Webhook: Signatur-Verifikation (kein Spoofing möglich)
✓ IDOR-Schutz: User kann keine fremden Mieten sehen (userId-Check)
✓ Brute-Force-Schutz: Login auf 5 Versuche/Minute limitiert
✓ Passwörter: bcrypt cost 12, min. 8 Zeichen
✓ Tokens: crypto.randomBytes(32), kryptografisch sicher
✓ SQL-Injection: alle Queries parametrisiert (:param-Bindings)
✓ CORS: nicht auf Wildcard, nutzt FRONTEND_URL
✓ Helmet: aktiv (Security-Header, x-powered-by versteckt)
✓ ValidationPipe: whitelist aktiv (Mass-Assignment-Schutz)
✓ Zahlungsbetrag: serverseitig berechnet (keine Manipulation)
✓ App-Tokens: FlutterSecureStorage (verschlüsselt)
✓ Test-Endpoint run-overdue-check: nur Admin

═══════════════════════════════════════════════════════════
## OFFENE PUNKTE (nicht kritisch, aber empfohlen)
═══════════════════════════════════════════════════════════
1. forbidNonWhitelisted ist false → unbekannte Felder werden still
   ignoriert. Für maximale Härtung auf true setzen, aber vorher testen
   ob bestehende Requests noch laufen.
2. .gitignore für .env prüfen (Secrets dürfen nie ins Git).
3. Echte Rechtstexte (Impressum/Datenschutz/AGB) vor Live-Gang.
4. Stripe LIVE-Keys + Webhook-Secret als ENV in Produktion.
5. Den Test-Endpoint run-overdue-check vor finalem Live entfernen
   (oder belassen — ist Admin-geschützt).

═══════════════════════════════════════════════════════════
## MANUELLE TESTFÄLLE (DU musst diese durchführen)
═══════════════════════════════════════════════════════════
Ich kann den Code nicht real ausführen. Diese Tests bitte selbst machen:

### A. Constraint-Fix (ZUERST!)
```bash
docker exec -it dressa_postgres psql -U dressa -d dressa_db -c "ALTER TABLE rentals DROP CONSTRAINT IF EXISTS rentals_duration_days_check; ALTER TABLE rentals ADD CONSTRAINT rentals_duration_days_check CHECK (duration_days BETWEEN 1 AND 31);"
```

### B. Kauf-Flow
[ ] Produkt kaufen mit Testkarte 4242 4242 4242 4242
[ ] Größe + Farbe wählen → erscheinen in Bestellung + beim Händler
[ ] Zahlung erfolgreich → Order-Status "paid" (via Webhook)

### C. Miet-Flow (Happy Path)
[ ] Mietprodukt: Händler setzt Kaution + Strafgebühr
[ ] Kunde wählt 1 Startdatum → Enddatum +10 Tage automatisch
[ ] Fester Preis angezeigt (nicht × Tage)
[ ] Consent-Checkbox muss angehakt werden
[ ] Zahlung: Miete + Kaution → beide in Stripe sichtbar
[ ] Kaution wird SOFORT abgebucht (nicht nur reserviert)

### D. Pünktliche Rückgabe
[ ] Händler bestätigt Rückgabe, Zustand "gut"
[ ] Kaution wird per Stripe zurückerstattet (Refund im Dashboard)
[ ] Rental-Status "returned", Deposit "released"

### E. Überfällig + Strafe (mit Test-Trick)
[ ] Miete anlegen + bezahlen (Status active)
[ ] SQL: UPDATE rentals SET end_date = CURRENT_DATE - INTERVAL '1 day' WHERE status='active';
[ ] POST /api/v1/rentals/admin/run-overdue-check (als Admin)
[ ] Prüfen: Status "overdue", penalty_applied_at gesetzt
[ ] Kaution "retained" (NICHT zurückerstattet)
[ ] Kunde bekommt Überfällig-E-Mail
[ ] WICHTIG: Danach Händler-Rückgabe "gut" versuchen →
    Kaution darf NICHT zurückerstattet werden (der Fix von oben)

### F. Sicherheit
[ ] Als Kunde A versuchen, Bestellung von Kunde B abzurufen → 403
[ ] Ohne Login geschützte Endpoints aufrufen → 401
[ ] 6× falsch einloggen → ab dem 6. Versuch geblockt (Rate-Limit)
[ ] Provoziere einen DB-Fehler → Client sieht NUR generische Meldung
    (keine Tabellenwerte mehr)

### G. Sprache
[ ] DE/EN umschalten → ALLES wechselt (auch Portale)

═══════════════════════════════════════════════════════════
## EMPFEHLUNG
═══════════════════════════════════════════════════════════
Nach dem Durchlauf der Testfälle A–G ist das System bereit für einen
kontrollierten Kundentest (Beta). Für den ECHTEN Live-Gang mit echtem
Geld zusätzlich die SICHERHEITS_CHECKLISTE.md abarbeiten (Secrets,
Rechtstexte, Stripe Live-Keys).
