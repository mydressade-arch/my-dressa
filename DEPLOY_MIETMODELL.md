# Deploy-Anleitung: Neues Mietmodell (fester Preis + 10 Tage + Strafe)

Drei Pakete gehören zusammen und müssen in dieser Reihenfolge deployed werden:
1. Backend (zuerst — enthält die Datenbank-Migration)
2. Web-App
3. Flutter-App

═══════════════════════════════════════════════════════════
## ⚠️ WICHTIG ZUERST: Datenbank-Backup
═══════════════════════════════════════════════════════════
Vor dem Deploy ein Backup der Produktions-Datenbank machen.
Die Migration ist additiv (fügt nur Spalten hinzu, ändert keine
bestehenden Daten) → risikoarm, aber Sicherheit geht vor.

In Railway: Postgres-Service → Backups → manuelles Backup anlegen.

═══════════════════════════════════════════════════════════
## 1. BACKEND (mydressa-backend-rental-model.zip)
═══════════════════════════════════════════════════════════

### Dateien ersetzen (im API-Projekt apps/api/src):
- database/migrations/016_add_penalty_amount.ts   (NEU)
- rentals/rentals.service.ts                       (ersetzen)
- rentals/rental.entity.ts                         (ersetzen)
- rentals/rentals.module.ts                        (ersetzen)
- rentals/dto/create-rental.dto.ts                 (ersetzen)
- products/product.entity.ts                       (ersetzen)
- products/dto/create-product.dto.ts               (ersetzen)
- payments/payments.service.ts                     (ersetzen)
- notifications/notifications.service.ts           (ersetzen)

### Migration ausführen
Nach dem Deploy auf Railway die Migration laufen lassen:
```bash
npm run migration:run
```
(oder wie in deinem package.json definiert — prüfe das Script.
 Manche Setups führen Migrationen automatisch beim Start aus.)

Falls du die Migration manuell per SQL machen willst:
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE rentals  ADD COLUMN IF NOT EXISTS penalty_applied_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE rentals  ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(10,2) DEFAULT NULL;
```

### Was sich im Backend ändert
- Mietdauer ist fest 10 Tage (endDate = startDate + 10, automatisch)
- Mietpreis ist fest (rentalPrice, NICHT mehr × Tage)
- Kaution wird SOFORT abgebucht (nicht mehr 7-Tage-Hold, da Holds
  vor Ablauf der 10 Tage verfallen würden)
- Bei pünktlicher Rückgabe (Zustand "gut"): Kaution wird per Stripe
  zurückerstattet (refund)
- Bei Überfälligkeit (Tag 10 überschritten): Scheduler löst Strafe aus
  → Kaution einbehalten + Strafbetrag des Produkts + E-Mail an Kunden
- consent (DSGVO) ist jetzt Pflicht → kein 500-Crash mehr bei fehlendem consent

═══════════════════════════════════════════════════════════
## 2. WEB-APP (mydressa-web-rental-model.zip)
═══════════════════════════════════════════════════════════

### Dateien ersetzen (im Web-Projekt apps/web):
- src/components/rental/RentalCalendar.tsx           (ersetzen)
- src/app/checkout/rental/page.tsx                   (ersetzen)
- src/app/merchant/products/new/page.tsx             (ersetzen)
- src/app/merchant/products/edit/[id]/page.tsx       (ersetzen)

### Was sich ändert
- Kalender: Kunde wählt EIN Startdatum (kein Zeitraum mehr),
  Enddatum automatisch +10 Tage
- Preis: fester Mietpreis statt × Tage
- Produkt-Editor (Händler): neues Feld "Strafgebühr bei Nichtrückgabe"

═══════════════════════════════════════════════════════════
## 3. FLUTTER-APP (mydressa-flutter-v10.zip)
═══════════════════════════════════════════════════════════

Komplettes Projekt. Bauen wie gewohnt:
```bash
cd android && gradlew --stop && cd ..
flutter clean && flutter pub get && flutter run
```

### Was sich ändert
- Checkout: einzelner Date-Picker (Startdatum), Rückgabedatum +10 Tage
- Fester Mietpreis statt Tagesrechnung
- Hinweis auf Strafe bei verspäteter Rückgabe
- Produkt-Editor: Strafgebühr-Feld

═══════════════════════════════════════════════════════════
## NACH DEM DEPLOY: Testen
═══════════════════════════════════════════════════════════
1. Als Händler ein Mietprodukt bearbeiten → Kaution + Strafgebühr setzen
2. Als Kunde mieten → nur 1 Startdatum wählbar, fester Preis
3. Stripe Test-Karte 4242... → Zahlung + Kaution sollten durchgehen
4. Kaution wird sofort abgebucht (im Stripe-Dashboard sichtbar)
5. Bei Rückgabe (Händler bestätigt, Zustand "gut") → Kaution-Refund

### Wichtiger Hinweis zur Strafe
Der Scheduler läuft täglich um 8:00 Uhr. Eine Strafe wird erst
ausgelöst, wenn das endDate (Start + 10 Tage) in der Vergangenheit
liegt UND die Miete noch aktiv ist. Zum Testen kannst du in der DB
ein endDate in die Vergangenheit setzen.

### Rechtlicher Hinweis
Die Strafe + Kaution müssen in deinen AGB/Mietbedingungen klar
beschrieben sein (Höhe, Bedingungen). Die Consent-Checkbox verweist
bereits darauf. Lass die Texte vor dem Live-Gang anwaltlich prüfen.
