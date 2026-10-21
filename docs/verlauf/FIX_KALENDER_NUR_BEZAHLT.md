# Fix: Kalender blockiert nur bei erfolgreicher Zahlung

## Das Problem
Zahlung schlug fehl, aber der Zeitraum wurde trotzdem im Kalender blockiert.
Niemand konnte denselben Zeitraum mehr buchen.

## Ursache
checkAvailability blockierte PENDING-Mieten (angelegt, noch nicht bezahlt)
für ein 30-Min-Fenster. Bei fehlgeschlagener Zahlung blieb die Miete PENDING
und blockierte — besonders schlimm, wenn der Webhook handlePaymentFailed
nicht feuerte (z.B. stripe listen lief nicht / Key abgelaufen).

## Fix
1. checkAvailability (Anzeige): Blockiert jetzt NUR noch wirklich BEZAHLTE
   Mieten (ACTIVE, PENDING_RETURN, OVERDUE). PENDING blockiert die Anzeige
   GAR NICHT mehr. → Datum ist nur gesperrt, wenn erfolgreich bezahlt.

2. create (Doppelbuchungs-Schutz): PENDING-Mieten blockieren eine Neubuchung
   nur noch, wenn sie FRISCH sind (< 20 Min, also gerade im Bezahlvorgang).
   So können nicht zwei Kunden gleichzeitig denselben Termin kaufen, aber
   eine abgebrochene Zahlung gibt den Termin nach max. 20 Min frei.

## Ablauf jetzt (konsistent)
- Zahlung erfolgreich → Webhook setzt Rental ACTIVE → blockiert Kalender ✓
- Zahlung fehlgeschlagen → bleibt PENDING → blockiert Anzeige NICHT,
  Neubuchung nur max. 20 Min ✓

## WICHTIG — deine bestehende Test-Blockade aufräumen
Die Miete aus deinem fehlgeschlagenen Test hängt evtl. noch als PENDING
und blockiert. Einmalig aufräumen (lokal oder Railway SQL-Konsole):

  UPDATE rentals SET status = 'cancelled'
  WHERE status = 'pending'
    AND id NOT IN (SELECT rental_id FROM ... );  -- siehe unten

Einfacher — ALLE alten PENDING-Mieten stornieren (nur Test-Daten!):
  UPDATE rentals SET status = 'cancelled' WHERE status = 'pending';

(Vorsicht: nur in der Testphase. Storniert alle gerade "im Bezahlvorgang"
befindlichen Mieten. In Produktion vorsichtiger vorgehen.)

## Keine Migration nötig.
