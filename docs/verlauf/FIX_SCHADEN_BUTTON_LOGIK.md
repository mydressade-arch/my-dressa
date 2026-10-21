# Fix: Schaden-Button verschwindet bei "guter Zustand"

## Das Logik-Problem (vom User erkannt)
Der Händler bestätigt Rückgabe mit "guter Zustand" → Kaution wird
freigegeben. ABER danach erschien trotzdem noch der "Schaden melden"-Button.
Widersprüchlich: "alles gut" und gleichzeitig "Schaden melden".

## Fix
merchant/orders: Der "Schaden melden"-Button erscheint jetzt NUR, wenn
rental.returnCondition !== 'good'.
→ Bei "good" (Händler hat guten Zustand quittiert): kein Schaden-Button.
→ Bei "damaged/lost": Schaden-Button bleibt.

## Warum das sauber ist
Der Zustand wird im Backend gespeichert (rental.returnCondition: 'good' |
'damaged' | 'lost'). Die merchant-orders API lädt die Rental mit allen
Feldern (leftJoinAndSelect). Das Frontend liest order.rentals[0].

Kein Lücken-Fall: returnCondition ist nur null, BEVOR bestätigt wurde — und
da ist status != 'returned', also erscheint der Button ohnehin nicht.

## Keine Backend-Änderung, keine Migration.
