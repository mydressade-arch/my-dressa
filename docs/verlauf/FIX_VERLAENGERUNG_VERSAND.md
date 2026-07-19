# Zwei Bugfixes

## 1. Verlängerung erschien als DHL-Versandauftrag  (mein Fehler)
Die Verlängerung legt eine Order an — die sah im Händler-Portal aus wie
eine frische Bestellung, die versendet werden muss. Falsch: Das Kleid ist
ja schon beim Kunden.

GELÖST:
- Orders haben jetzt ein Flag is_extension
- Nach der Zahlung geht die Verlängerungs-Order direkt auf "delivered"
  (nichts zu versenden)
- Im Händler-Portal (Web + App) erscheint stattdessen ein Hinweis:
  "Mietverlängerung — kein Versand nötig, der Artikel ist bereits beim Kunden"
- Kein Versand-Button, keine Rückgabe-Bestätigung für diese Order
- Der Händler sieht sie trotzdem (er verdient ja daran)

## 2. "Versand bestätigen" dauerte lange
URSACHE: Das Backend hat die Versand-E-Mail mit await verschickt — die
HTTP-Antwort wartete also, bis der Mailserver (Brevo) fertig war. Das sind
1-3 Sekunden Wartezeit für den Händler.

GELÖST: Die E-Mail wird jetzt im Hintergrund verschickt (fire-and-forget).
Die Antwort kommt sofort, der Status springt direkt auf "shipped".
Dasselbe gilt jetzt auch für "Als geliefert markieren".

## Migration
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_extension BOOLEAN DEFAULT FALSE;
UPDATE orders o SET is_extension = TRUE
  FROM rental_extensions e WHERE e.order_id = o.id;
UPDATE orders o SET status = 'delivered'
  FROM rental_extensions e
  WHERE e.order_id = o.id AND e.status = 'paid' AND o.status IN ('paid','pending');

(Ist auch in ALLE_MIGRATIONEN.sql enthalten.)
