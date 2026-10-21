# Fix: ALLE kaputten Icon-Imports (Build Error)

## Das Problem
Der frühere automatische Icon-Import-Einfüger (sed) hat in mehreren
Dateien die Import-Zeile an falscher Stelle eingefügt → Build brach ab.

Zwei Fehler-Muster:
1. Import mitten im mehrzeiligen Stripe-Import (checkout-Dateien)
   → in v93 schon gefixt
2. Import NACH "export default function" (im Code statt oben)
   → rental-policy, sustainability
3. Import in der Mitte der Datei (reset-password) — technisch durch
   Hoisting geduldet, aber unsauber → aufgeräumt

## Reparierte Dateien
- src/app/rental-policy/page.tsx (Import war Zeile 2, nach export)
- src/app/sustainability/page.tsx (Import war Zeile 2, nach export)
- src/app/auth/reset-password/page.tsx (Imports in Zeile 100-102 →
  nach oben verschoben, Duplikate entfernt, Suspense konsolidiert)

## Prüfung
Systematische Suche über ALLE .tsx/.ts-Dateien nach 3 Fehler-Mustern:
- Import nach export default function
- Import in mehrzeiligem import-Block
- Import nach function/const-Deklaration
Ergebnis: keine weiteren kaputten Imports. Balance (Braces + Parens) ok.

## WICHTIG für dich
Du hast v91 gebaut, aber die Checkout-Fixes waren in v93. Diese Version
(v94) enthält ALLE Fixes zusammen. Ab jetzt diese nutzen.

## Keine Backend-Änderung, keine Migration.
