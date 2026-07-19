# Fix: Verlängerung zeigte 0,00 € beim Händler

## Zwei Ursachen (beide behoben)

### 1. Es wurde gar keine Provision erstellt (der eigentliche Bug)
Im Webhook hatte der Verlängerungs-Block ein frühes `return;` — dadurch
wurde die Provisions-Erstellung übersprungen, die erst danach kommt.
Folge: Der Händler bekam für Verlängerungen KEINE Gutschrift.
Er hätte umsonst gearbeitet.

BEHOBEN: Die Verlängerung erstellt jetzt eine eigene Provision.
- Provisionsbasis = die volle Verlängerungsgebühr
  (KEIN Versandkosten-Abzug — die Verlängerung enthält ja keinen Versand)
- Das Geld geht DIREKT ins verfügbare Guthaben (balancePaid), nicht in
  "ausstehend". Grund: Es gibt keine Lieferung, auf die man warten müsste —
  die Leistung ist mit der Zahlung erbracht.

### 2. Anzeige-Fehler im Händler-Portal
Der Code war: `order.merchantAmount || order.totalPrice`
Problem: merchantAmount kommt als String "0.00" — und der ist in
JavaScript truthy! Der Fallback griff also nie, es wurde immer 0,00 €
angezeigt.
BEHOBEN: Es wird jetzt sauber auf Zahlen geprüft.

## Wie die Verlängerungsgebühr berechnet wird

Tagespreis = Mietpreis ÷ Mietdauer des Produkts
Gebühr     = Tagespreis × gewählte Zusatztage
(OHNE Versandkosten — das Kleid ist ja schon beim Kunden)

Beispiel: Kleid 110 € für 10 Tage → Tagespreis 11 €
  + 7 Tage  →  77,00 €
  + 10 Tage → 110,00 €

Die WÄHLBAREN Zusatztage sind aktuell dieselben Werte wie die
Mietdauern aus dem Admin-Panel (also z.B. 7 und 10 Tage).
Der Kunde kann NICHT frei z.B. 6 Tage wählen.

→ Wenn du freie Tageszahl möchtest (z.B. 1–14 Tage), sag Bescheid.
