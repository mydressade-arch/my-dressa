# Händler-Bestellung: transparente Aufschlüsselung

## Deine Frage: "warum 100€ statt 110€?"
Antwort: Die 100 € waren KORREKT. Der Händler sieht seinen ANTEIL, nicht
den Gesamtbetrag. Es fehlte nur die Erklärung, wie sich das zusammensetzt.

## Die Rechnung (100 Miete + 10 Versand)
  Kunde zahlt:        110,00 €  (Miete + Versand)
  Provision 10%:      −10,00 €  (nur auf die Miete, NICHT auf Versand)
  ───────────────────────────
  Dein Anteil:        100,00 €  (= 90 Miete + 10 Versand)

WICHTIG: Miet-Provision ist 10%, Kauf-Provision ist 15%.
Der Versand bleibt IMMER beim Händler (keine Provision darauf).

## Was jetzt anders ist
Statt einer nackten Zahl zeigt jede Bestellung die volle Aufschlüsselung:
  - Kunde zahlte
  - davon Versand (bei Miete)
  - Provision (mit Prozentsatz)
  - Dein Anteil (hervorgehoben)

Umgesetzt in Web UND App. Die Anzeige nutzt primär die echten Backend-Werte
und rechnet nur nach, falls ein Wert fehlt — dadurch immer korrekt.

## Kein Backend-Change / keine Migration
Die Berechnung im Backend war bereits richtig. Es wurde nur die ANZEIGE
transparenter gemacht. commissionAmount/merchantAmount/shippingCost kommen
schon in der Bestell-Antwort mit.
