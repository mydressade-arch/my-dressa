# Änderungen in diesem Projekt-Stand

Dies ist das vollständige Projekt (my-dressa/) mit allen Änderungen eingebaut.
Struktur wie gewohnt: apps/api (Backend) + apps/web (Frontend).

## Eingebaut

### Neues Mietmodell (fester Preis + 10 Tage + Strafe)
BACKEND (apps/api):
- database/migrations/016_add_penalty_amount.ts (NEU — Migration + Constraint-Fix)
- rentals/* (10 Tage fest, fester Preis, Strafe-Logik)
- products/* (penaltyAmount Feld)
- payments/payments.service.ts (Kaution sofort abbuchen + refund)
- notifications/notifications.service.ts (Strafe-E-Mail)

FRONTEND (apps/web):
- components/rental/RentalCalendar.tsx (Einzeldatum, Number-Fix)
- app/checkout/rental/page.tsx (fester Preis)
- app/merchant/products/new + edit (Strafgebühr-Feld)
- app/products/page.tsx + globals.css (Grid-Layout-Fix)

## WICHTIG: Datenbank
Vor dem Start die Migration ausführen ODER das SQL direkt anwenden:
→ siehe FIX_CONSTRAINT_SOFORT.sql

Die alte DB-Constraint erlaubte nur 1-7 Tage Mietdauer. Das neue Modell
braucht 10 Tage. Das SQL/die Migration behebt das.

## Start
```bash
# Backend
cd apps/api && npm install && npm run migration:run && npm run start:dev
# Frontend
cd apps/web && npm install && npm run dev
```

Details: DEPLOY_MIETMODELL.md
