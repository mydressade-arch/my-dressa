# 2 Fixes: Reservierung ohne Zahlung + langsame Bilder

## Problem 1: Kalender reservierte trotz fehlgeschlagener Zahlung
Du hast richtig erkannt: Der Termin wurde blockiert, obwohl die Zahlung
scheiterte. Ursache: Miete wird VOR der Zahlung angelegt (Status PENDING),
und PENDING blockierte den Kalender OHNE Zeitlimit.

Doppelte Lösung:
1. PENDING-Mieten blockieren nur noch 30 Minuten (Reservierungsfenster).
   Läuft die Zahlung nicht durch, wird der Termin automatisch wieder frei.
   (checkAvailability: PENDING nur zählen wenn createdAt < 30 Min alt)
2. Bei fehlgeschlagener Zahlung wird die Miete SOFORT storniert
   (handlePaymentFailed storniert jetzt auch das Rental, nicht nur die Order).

So bleibt Schutz vor Doppelbuchung (kurzes Reservieren während der Zahlung),
aber kein ewiges Blockieren mehr bei Abbruch.

## Problem 2: Bilder laden langsam beim ersten Aufruf
Teils normal (erster Besuch = kein Cache), aber verbessert:
- Die ersten 4 Karten (oben sichtbar) laden jetzt SOFORT (eager +
  fetchPriority high) statt "lazy". Sie erscheinen schneller.
- Grauer Platzhalter + sanftes Einblenden waren schon vorhanden.

Für später (größere Wirkung, mehr Aufwand): echte Bildoptimierung
(kleinere Dateigrößen). Das würde die Ladezeit weiter senken, ist aber
ein separater Schritt.

## Migration
Keine für diese Fixes. ABER: die DB-Migration muss vollständig laufen
(du warst dabei, die Blöcke in der Railway-Konsole auszuführen).
