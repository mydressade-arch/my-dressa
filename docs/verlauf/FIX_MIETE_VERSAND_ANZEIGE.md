# Fix: Versand-Zeile fehlte bei Miet-Bestellungen

## Deine Frage: "wird Provision vom Gesamt genommen?"
NEIN — die Zahlen waren die ganze Zeit RICHTIG:

  Kunde zahlte    63,99 €   (59 Miete + 4,99 Versand)
  Provision 10%   −5,90 €   (10% von 59, NICHT von 63,99!)
  Dein Anteil     58,09 €   (= 53,10 Miete + 4,99 Versand)

Die Provision wird korrekt nur auf die Miete (59€) berechnet, nicht auf
den Versand. Der Händler behält den vollen Versand.

## Das eigentliche Problem: die Versand-Zeile fehlte
Ohne die Zeile "davon Versand 4,99€" sah es aus, als wären die 5,90€
einfach 10% vom Gesamtbetrag — was Misstrauen weckt. Die Zeile fehlte,
weil bei Miet-Bestellungen shipping_cost nicht am Order gespeichert war
(nur beim Kauf, seit v69).

## Behoben
- Miet-Order speichert jetzt shipping_cost (wie der Kauf)
- Anzeige zeigt die Versand-Zeile jetzt korrekt:

  Kunde zahlte    63,99 €
  davon Versand    4,99 €   ← jetzt sichtbar
  Provision 10%   −5,90 €
  ─────────────────────
  Dein Anteil     58,09 €

Jetzt ist auf einen Blick klar, dass die Provision nur auf 59€ läuft.

## Migration (füllt alte Bestellungen nach)
UPDATE orders o SET shipping_cost = COALESCE(p.shipping_cost, 0)
  FROM product_variants v JOIN products p ON p.id = v.product_id
  WHERE o.product_variant_id = v.id AND o.type = 'rental' AND o.shipping_cost = 0;

Hinweis: Die Anzeige funktioniert sogar OHNE Migration, weil sie ersatzweise
den Versand direkt vom Produkt liest. Die Migration sorgt nur dafür, dass
der Wert dauerhaft an der Bestellung haftet.
