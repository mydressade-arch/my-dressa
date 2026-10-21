# Mietdauer komplett frei — keine feste Begrenzung mehr

## Was geändert wurde
Die Mietdauer wird jetzt VOLLSTÄNDIG vom Händler bestimmt. Keine feste
Liste, kein Default 10, keine Backend-Überschreibung.

## Die versteckte Ursache (Backend-Überschreibung!)
Selbst wenn 6 gespeichert wurde, setzte das Backend es zurück:
  rentals.service.ts: "if (!allowedDurations.includes(durationDays)) →
  durationDays = allowedDurations[0]"
Da 6 nicht in der erlaubten Liste [7,10] war, wurde es auf 7 oder 10
überschrieben. Das war ein zweiter, versteckter Grund für das Problem.
→ Diese Überschreibung ist ENTFERNT. Die Händler-Dauer wird respektiert.

## Alle Änderungen
Frontend:
- Neu + Bearbeiten: Dropdown → freies Zahlenfeld (Händler tippt Tage)
- Kein Default 10 mehr im State (leer)
- Pflichtvalidierung: bei Miete muss Mietdauer > 0 eingegeben werden
- Alle "|| 10" Fallbacks → "|| 1" (kein verstecktes 10 mehr)
- RentalCalendar Default 10 → 1

Backend:
- rentals.service.ts: allowedDurations-Überschreibung ENTFERNT
- Nur noch Minimal-Schutz gegen 0/negativ (→ 1)
- Extension baseDays: "|| 10" → "|| 1"

## Bestehende Produkte
Die mit 10 gespeicherten Produkte einmal bearbeiten und echte Dauer
eingeben. Oder per SQL:
  UPDATE products SET rental_duration_days = DEINE_ZAHL WHERE id = '...';

## Hinweis
Die Admin-Einstellung "erlaubte Mietdauern" wird für die MIETE nicht mehr
genutzt (nur noch für die Verlängerungs-Optionen). Das ist ok — der Händler
ist jetzt frei.

## Keine Migration nötig.
