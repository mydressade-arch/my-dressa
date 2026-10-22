# My Dressa — Komplette Test-Anleitung

## Schritt 1: Beide Server starten

**Terminal 1 — API:**
```bash
cd apps/api
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd apps/web
npm run dev
```

---

## Schritt 2: Als Händler einloggen

Öffne `http://localhost:3001/docs` (Swagger)

`POST /auth/login`:
```json
{ "email": "haendler@mydressa.de", "password": "Merchant123!" }
```
→ `accessToken` kopieren → oben rechts "Authorize" → `Bearer TOKEN` eingeben

---

## Schritt 3: Produkt erstellen (Swagger)

`POST /products`:
```json
{
  "title": "Elegantes Abendkleid",
  "description": "Wunderschönes schwarzes Abendkleid aus Seide",
  "rentalPrice": 45.00,
  "salePrice": 890.00,
  "category": "Abendmode",
  "isForRent": true,
  "isForSale": true,
  "variants": [
    { "size": "S", "color": "Schwarz", "stockQuantity": 1 },
    { "size": "M", "color": "Schwarz", "stockQuantity": 1 },
    { "size": "L", "color": "Schwarz", "stockQuantity": 1 }
  ]
}
```
→ Produkt-ID aus Response kopieren

---

## Schritt 4: Produkt veröffentlichen (Swagger)

`POST /products/{id}/publish`
→ Produkt-ID einfügen → Execute

---

## Schritt 5: Im Frontend testen

`http://localhost:3000/products` → Produkt sollte erscheinen!

---

## Schritt 6: Als Kunde mieten

1. `http://localhost:3000/auth/login` → mit `kunde@mydressa.de` / `Customer123!`
2. Produkt anklicken → "Reserve for Rental" → Kalender öffnet sich
3. Start- und Enddatum wählen → "Confirm Rental Dates"
4. Adresse eingeben → Terms akzeptieren → "Confirm Rental"
5. `http://localhost:3000/account` → Rental erscheint unter "My Rentals"

---

## Panels

| Panel | URL | Login |
|-------|-----|-------|
| Kunde | http://localhost:3000/account | kunde@mydressa.de |
| Händler | http://localhost:3000/merchant/dashboard | haendler@mydressa.de |
| Admin | http://localhost:3000/admin | admin@mydressa.de |

---

## Alle Passwörter
| Account | Passwort |
|---------|---------|
| admin@mydressa.de | Admin123! |
| haendler@mydressa.de | Merchant123! |
| kunde@mydressa.de | Customer123! |

