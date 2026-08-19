# Fix: TypeScript-Fehler bei rentalDurationDays

## Das Problem
Build kompilierte erfolgreich (Imports ok!), aber TypeScript-Check schlug fehl:
  Type 'number' is not assignable to type 'string'
  (merchant/products/new/page.tsx:196)

## Ursache
Als das Mietdauer-Feld zum freien Eingabefeld wurde, blieb der State-
Startwert ein leerer String ('', Zeile 45), aber der onChange schrieb eine
Zahl rein (Number(e.target.value)). → Feld mal String, mal Zahl = Typkonflikt.

## Fix
onChange speichert jetzt den String direkt (e.target.value statt
Number(...)). Das Feld ist durchgängig String — genau wie die anderen
Preisfelder (salePrice, rentalPrice etc.).
Die Umwandlung in eine Zahl passiert erst beim Absenden (Zeile 87:
Number(form.rentalDurationDays)) und bei der Validierung (Zeile 73).

## Bearbeiten-Formular: NICHT betroffen
Dort ist rentalDurationDays durchgängig eine Zahl (State=10, onChange=Number).
In sich konsistent, kein Fehler.

## Geprüft
Alle anderen Zahlenfelder im Neu-Formular nutzen up('feld') = String-State,
konsistent. Kein weiterer Typkonflikt.

## Keine Backend-Änderung, keine Migration.
