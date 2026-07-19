# Feature 6: Beidseitige Rückgabe-Bestätigung — FERTIG

## Ablauf
1. Kunde bestätigt "Ich habe zurückgeschickt" (App + Web)
2. Händler bestätigt Erhalt mit Zustand: gut / beschädigt / verloren
3. Wenn BEIDE bestätigt UND Zustand "gut" → Kaution automatisch zurück (Stripe)
4. Bei beschädigt/verloren → keine Auto-Rückgabe, geht an Admin (Feature 4)

## Umgesetzt in
- Backend: 2 Endpoints + tryFinalizeReturn-Logik + Migration 017
- Flutter-App: Kunden-Button (Meine Mieten) + Händler-Button (Bestellungen)
- Web-App: Kunden-Button (Account) + Händler (Orders, neuer Endpoint)

## Neue Endpoints
POST /rentals/:id/confirm-return-customer   (Kunde)
POST /rentals/:id/confirm-return-merchant   (Händler, body: {condition})

## Migration ausführen
docker exec -it dressa_postgres psql -U dressa -d dressa_db -c "ALTER TABLE rentals ADD COLUMN IF NOT EXISTS customer_confirmed_return BOOLEAN DEFAULT FALSE; ALTER TABLE rentals ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ; ALTER TABLE rentals ADD COLUMN IF NOT EXISTS merchant_confirmed_return BOOLEAN DEFAULT FALSE; ALTER TABLE rentals ADD COLUMN IF NOT EXISTS merchant_confirmed_at TIMESTAMPTZ;"

## Testen
1. Miete anlegen + bezahlen (Status active)
2. Als Kunde: "Rücksendung bestätigen"
3. Als Händler: "Erhalt bestätigen" → "Alles in Ordnung"
4. Prüfen: Kaution wird zurückerstattet (Stripe), Status "returned"
   Erst nachdem BEIDE bestätigt haben!
5. Test Schaden: Händler wählt "Beschädigt" → geht an Admin, keine Auto-Rückgabe
