# My Dressa — Start Guide

## Wichtig: Immer direkt in den Unterordner navigieren!

### API starten
```bash
cd apps/api
npm install      # nur beim ersten Mal
npm run dev      # startet auf http://localhost:3001
```

### Web starten (neues Terminal)
```bash
cd apps/web
npm install      # nur beim ersten Mal
npm run dev      # startet auf http://localhost:3000
```

### Datenbank migrieren
```bash
cd apps/api
npm run migration:run
npm run db:seed   # Testdaten
```

## NICHT aus dem Root-Ordner starten!
❌ `npm run dev` (aus my-dressa/)
✅ `cd apps/web && npm run dev`
✅ `cd apps/api && npm run dev`

## URLs
| Service        | URL                          |
|----------------|------------------------------|
| Web Frontend   | http://localhost:3000        |
| API            | http://localhost:3001/api/v1 |
| Swagger Docs   | http://localhost:3001/docs   |

## Test-Accounts (nach db:seed)
| Rolle    | Email                   | Passwort     |
|----------|-------------------------|--------------|
| Admin    | admin@mydressa.de       | Admin123!    |
| Händler  | haendler@mydressa.de    | Merchant123! |
| Kunde    | kunde@mydressa.de       | Customer123! |
