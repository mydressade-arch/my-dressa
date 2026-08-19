# 3 Checkout-Bugs behoben

## Bug 1: "Mietpreis pro Tag" — irreführend
Euer Modell ist ein FESTER Mietpreis (nicht × Tage). Der Label-Text
"pro Tag" / "/Tag" war falsch und verwirrend.
Behoben in:
  - Händler: Produkt neu + bearbeiten → "Mietpreis (fester Preis pro Miete)"
  - Admin-Ansicht: "/Tag" entfernt
  - i18n: rentalPrice-Label korrigiert

## Bug 2: Checkout zeigte "10 Tage" statt echter Mietdauer
Die Rental-Checkout-Seite hatte die 10 HARTCODIERT (const days = 10),
obwohl das Produkt z.B. 7 Tage hat.
Behoben: nutzt jetzt product.rentalDurationDays (echte Dauer).
  - Zeile 73: const days = product.rentalDurationDays || 10
  - Zeile 143: zeigt {days} statt fest "10"
Der Kalender selbst rechnete schon korrekt — nur die Anzeige war falsch.

## Bug 3: Button "€24.99" vs. "Gesamt abgebucht €34.99"
Der Button zeigte total OHNE Kaution (24.99), die tatsächliche Abbuchung
war MIT Kaution (34.99). Widerspruch → Kunde verwirrt.

Ursache: total = rentalFee + shipping (ohne deposit), aber die Kaution
wird bei Option A sofort mit abgebucht.

Behoben: total = rentalFee + shipping + deposit → Button zeigt jetzt
denselben Betrag wie "Gesamt jetzt abgebucht" (34.99).

WICHTIG: Der echte Zahlbetrag kommt vom Backend (clientSecret), nicht von
diesem amount-Wert. Das Backend rechnete die Kaution schon immer korrekt
mit (totalWithDepositCents). Es war NUR ein Anzeige-Fehler — es wurde nie
zu wenig abgebucht, nur falsch angezeigt.

## Keine Migration nötig — nur Frontend-Anzeige.
