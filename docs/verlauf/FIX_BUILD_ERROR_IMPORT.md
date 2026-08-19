# Fix: Build Error "cannot import as reserved word"

## Das Problem
Build schlug fehl in checkout/rental/page.tsx:
  import {
  import { Icon } from '@/components/ui/Icon'   ← FALSCH mittendrin
    Elements, ...
  } from '@stripe/react-stripe-js'

Beim früheren automatischen Hinzufügen des Icon-Imports (sed nach letzter
import-Zeile) rutschte die Icon-Zeile MITTEN in den mehrzeiligen Stripe-
Import → kaputte Syntax.

## Betroffene Dateien (BEIDE gefixt)
- src/app/checkout/rental/page.tsx
- src/app/checkout/purchase/page.tsx
(dasselbe Muster in beiden — der Build wäre sonst nach dem ersten Fix
am zweiten gescheitert)

## Fix
Icon-Import an die richtige Stelle verschoben (NACH dem Stripe-Import,
nicht mitten hinein).

## Prüfung
Alle .tsx-Dateien systematisch geprüft: kein weiterer import mitten in
einem offenen mehrzeiligen Import-Block. Balance ok. Icon wird in beiden
Dateien tatsächlich genutzt.

## Keine Backend-Änderung, keine Migration.
