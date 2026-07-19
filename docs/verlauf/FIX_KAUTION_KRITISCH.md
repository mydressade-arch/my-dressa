# 🔴 KRITISCHER FIX: Die Kaution wurde NIE eingezogen

## Was du im Stripe-Dashboard gesehen hast
110,00 € — Erfolgreich   ← Miete
100,00 € — Unvollständig ← KAUTION (nie bezahlt!)

"Unvollständig" = der PaymentIntent wurde angelegt, aber nie bestätigt.
Das heißt: Bei JEDER Miete wurde die Kaution nicht eingezogen.
Bei Schaden/Verspätung hättest du NICHTS in der Hand gehabt.

## Warum
Das Backend erzeugte ZWEI PaymentIntents (Miete + Kaution). Der Client
versuchte, den zweiten mit derselben Karte zu bestätigen. Stripe verbietet
das aber: Eine Zahlungsmethode darf nicht für einen zweiten PaymentIntent
wiederverwendet werden, wenn kein Customer-Objekt daran hängt.
Der Fehler wurde im Frontend nur mit console.warn verschluckt — du hast
nie eine Fehlermeldung gesehen.

## Die Lösung: EINE Zahlung statt zwei
Miete + Versand + Kaution werden jetzt in EINEM PaymentIntent abgebucht.
- Eine Bestätigung, ein Zahlungs-Sheet → funktioniert zuverlässig
- Der Kunde sieht EINE Abbuchung (bessere UX, ehrlicher)
- Die Kaution wird später per TEIL-Rückerstattung zurückgegeben

## Wichtig: alle Rückerstattungen sind jetzt Teilbeträge
Da die Zahlung Miete UND Kaution enthält, darf beim Zurückgeben nur der
KAUTIONSBETRAG erstattet werden — sonst bekäme der Kunde die Miete geschenkt.
Angepasst in:
- refundDeposit(paymentIntentId, betrag)
- resolveDeposit (pünktliche Rückgabe)
- tryFinalizeReturn (beidseitige Bestätigung)
- damage-reports releaseDeposit (Admin: voll zurück)
- damage-reports retainDeposit (Admin: Teilbetrag) — war schon korrekt

## Auch korrigiert: falsche Angaben im Checkout
App und Web sagten: "Kaution wird nur reserviert, nicht abgebucht."
Das war FALSCH (und bei Preisangaben rechtlich heikel).
Jetzt korrekt: Kaution erscheint als eigene Zeile, und der Gesamtbetrag
zeigt "Gesamt jetzt abgebucht" inkl. Kaution + Hinweis auf die Rückerstattung.

## Testen
1. Miete buchen (Testkarte 4242...)
2. Im Stripe-Dashboard: NUR EINE Zahlung, Betrag = Miete + Versand + Kaution
   → Status "Erfolgreich", KEIN "Unvollständig" mehr
3. Rückgabe beidseitig bestätigen
   → Refund erscheint mit dem KAUTIONSBETRAG (nicht der Gesamtsumme!)
4. Prüfen: der Händler bekommt weiterhin nur seinen Mietanteil
   (Provision läuft über order.totalPrice, nicht über den Stripe-Betrag)

## Alte "unvollständige" Intents
Die kannst du in Stripe ignorieren — sie verfallen von selbst.
Sie haben nie Geld bewegt.
