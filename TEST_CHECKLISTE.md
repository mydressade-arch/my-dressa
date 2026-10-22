# ✅ My Dressa — Test-Checkliste vor Go-Live

Geh das Schritt für Schritt durch. Hak jede Zeile ab. Wo es hakt: notieren
und melden. Reihenfolge = wie ein echter Nutzer die App erlebt.

**Test-Accounts:**
| Rolle    | E-Mail                  | Passwort     |
|----------|-------------------------|--------------|
| Admin    | admin@mydressa.de       | Admin123!    |
| Händler  | haendler@mydressa.de    | Merchant123! |
| Kunde    | kunde@mydressa.de       | Customer123! |

**Vorher sicherstellen:**
- [ ] DB-Migration ist auf Railway vollständig gelaufen (alle Tabellen da)
- [ ] Stripe-Webhook läuft (stripe listen ODER Dashboard-Webhook aktiv)
- [ ] Stripe-Keys gesetzt (pk_test_… im Frontend, sk_test_… im Backend)

---

## 0. Grundlegendes (jede Seite)
- [ ] Startseite lädt ohne Fehler
- [ ] Icons erscheinen sofort als Symbole (NICHT als Text-Wörter)
- [ ] Bei leerer Suche: das "nichts gefunden"-Icon ist normal groß (nicht riesig)
- [ ] Sprache umschalten DE/EN funktioniert überall
- [ ] Handy-Ansicht: nichts überlappt, Buttons erreichbar
- [ ] Buttons unten kollidieren nicht mit der Handy-Navigationsleiste

## 1. Registrierung & Login (nicht eingeloggt)
- [ ] Neu registrieren mit neuer E-Mail → Bestätigungs-Mail kommt an
- [ ] Login mit falschem Passwort → Fehlermeldung (kein Absturz)
- [ ] 5× falsches Passwort → wird geblockt (Rate-Limit)
- [ ] Login mit richtigem Passwort → eingeloggt
- [ ] Passwort vergessen → Reset-Mail kommt an

## 2. Kunde: Stöbern & Merkliste
- [ ] Produktliste zeigt Produkte mit Bildern
- [ ] Nach Größe/Kategorie filtern funktioniert
- [ ] Produkt anklicken → Detailseite mit Bildern, Preis, Größen
- [ ] Herz/Merkliste anklicken OHNE Login → leitet zum Login
- [ ] Eingeloggt: Herz anklicken → Produkt in Merkliste
- [ ] Merkliste-Seite zeigt gemerkte Produkte

## 3. Kunde: MIETE (kritischster Ablauf!)
- [ ] Produkt mit Miet-Option öffnen
- [ ] "Jetzt mieten" OHNE Login → leitet zum Login
- [ ] Eingeloggt: Startdatum im Kalender wählen
- [ ] Enddatum wird automatisch berechnet (= echte Mietdauer, z.B. 7 Tage)
- [ ] Checkout zeigt RICHTIGE Mietdauer (nicht fest "10 Tage")
- [ ] Preis-Aufschlüsselung stimmt: Miete + Versand + Kaution
- [ ] Button-Betrag = "Gesamt jetzt abgebucht" (KEIN Widerspruch!)
- [ ] Adresse eingeben, AGB/Kaution zustimmen
- [ ] Mit Stripe-Testkarte zahlen: 4242 4242 4242 4242, Datum in Zukunft, CVC beliebig
- [ ] Nach Zahlung: Erfolgsseite
- [ ] Der gemietete Zeitraum ist jetzt im Kalender blockiert

## 4. Kunde: Miete abbrechen (Zahlung fehlschlagen lassen)
- [ ] Neue Miete starten, aber Zahlung ABBRECHEN (Testkarte 4000 0000 0000 0002 = wird abgelehnt)
- [ ] Der Termin bleibt NICHT blockiert (wird wieder frei)
- [ ] Keine "halbe" Miete im Konto

## 5. Kunde: KAUF
- [ ] Produkt mit Kauf-Option öffnen
- [ ] "Jetzt kaufen" → Checkout
- [ ] Preis = Produktpreis + Versand (Versand sichtbar)
- [ ] Mit Testkarte zahlen → Erfolg
- [ ] Bestellung erscheint im Konto

## 6. Kunde: Stornieren
- [ ] Bezahlte, noch nicht versandte Bestellung im Konto öffnen
- [ ] "Cancel"-Button ist sichtbar
- [ ] Stornieren → Bestätigung "Rückerstattung 5-10 Tage"
- [ ] Status wird "storniert"
- [ ] (Bei versendeter Bestellung: KEIN Cancel-Button)

## 7. Kunde: Newsletter (Startseite)
- [ ] E-Mail eingeben, "Anmelden" → "Danke! Du bist angemeldet"
- [ ] Ungültige E-Mail → Fehlermeldung
- [ ] (Admin kann Anmeldungen später abrufen)

## 8. Händler: Produkte verwalten
- [ ] Als Händler einloggen
- [ ] Neues Produkt anlegen (mit Bild, Größen, Preisen)
- [ ] "Mietpreis" heißt "fester Preis pro Miete" (NICHT "pro Tag")
- [ ] Produkt bearbeiten, das schon eine Bestellung hat → speichert OHNE Fehler
- [ ] Eine Variante entfernen, die vermietet wurde → verschwindet aus Shop,
      alte Bestellung bleibt gültig

## 9. Händler: Bestellungen & Versand
- [ ] Eingegangene Bestellung sehen
- [ ] Aufschlüsselung zeigt: Kunde zahlte / davon Versand / Provision / Dein Anteil
- [ ] Provision NUR auf Produkt/Miete, NICHT auf Versand
- [ ] "Als versandt markieren" NUR bei bezahlten Bestellungen möglich
- [ ] Bei unbezahlter Bestellung: Versand nicht möglich (Fehlermeldung)

## 10. Händler: Auszahlungen
- [ ] Auszahlungs-Übersicht zeigt korrekte Beträge
- [ ] (Bankkonto/Stripe-Connect eingerichtet)

## 11. Rückgabe & Kaution (nach Mietende)
- [ ] Kunde bestätigt Rückgabe
- [ ] Händler bestätigt Rückgabe
- [ ] Nach beidseitiger Bestätigung: Kaution wird erstattet
- [ ] Bei Schaden: Händler kann Schadensmeldung erstellen

## 12. Admin
- [ ] Als Admin einloggen → Dashboard lädt
- [ ] Nutzerliste sehen
- [ ] Händler-Anfrage genehmigen/ablehnen
- [ ] Homepage-Bilder ändern (Upload oder URL) → erscheint auf Startseite
- [ ] Einstellungen ändern (Mietdauern, Größen, Farben)
- [ ] Newsletter-Anmeldungen abrufen

## 13. Sicherheit (wichtig!)
- [ ] Als Kunde eingeloggt: kann NICHT auf /admin zugreifen
- [ ] Als Kunde: kann NICHT fremde Bestellungen sehen (andere User-ID in URL)
- [ ] Ausloggen → geschützte Seiten nicht mehr erreichbar
- [ ] Nach 15+ Min Inaktivität weiter nutzbar (Token-Refresh greift)

## 14. Zahlungen echt prüfen (Stripe-Dashboard)
- [ ] Testzahlung erscheint im Stripe-Dashboard
- [ ] Betrag stimmt (inkl. Versand, inkl. Kaution bei Miete)
- [ ] Provision/Application-Fee stimmt
- [ ] Refund bei Storno erscheint im Dashboard

---

## Stripe-Testkarten (Testmodus)
| Zweck                | Kartennummer          |
|----------------------|-----------------------|
| Erfolg               | 4242 4242 4242 4242   |
| Wird abgelehnt       | 4000 0000 0000 0002   |
| Braucht 3D-Secure    | 4000 0025 0000 3155   |
(Datum: beliebig in der Zukunft. CVC: beliebige 3 Ziffern.)

---

## Wenn etwas hakt
Notier: WELCHE Zeile, WAS passiert (Screenshot/Fehlertext), auf welchem
Gerät. Dann gezielt beheben — nicht raten.

## Was NICHT diese Checkliste abdeckt (separat klären)
- Rechtstexte (Impressum/AGB/Datenschutz/Kaution) von einem ANWALT prüfen
  lassen — besonders das Kautions-/Mietmodell nach deutschem Recht.
- Von Stripe TEST- auf LIVE-Keys wechseln, wenn echtes Geld fließen soll.
- Stripe-Webhook fest im Dashboard (nicht nur stripe listen).
# Done