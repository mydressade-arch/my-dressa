# Mietdauer immer 10 — ENDLICH die Wurzel gefunden

## Der echte Bug (im Backend, nicht Frontend!)
Alle bisherigen Fixes waren im Frontend — aber der Bug saß im BACKEND.

In products.service.ts create() wurde beim Anlegen eines Produkts das Feld
rentalDurationDays GAR NICHT an productRepo.create() übergeben. Das Formular
sendete es korrekt, das DTO akzeptierte es korrekt — aber der Service
speicherte es nie. Also blieb es auf dem DB-Default 10 (product.entity.ts).

Das erklärt ALLES:
- Formular: du wählst 6 → wird gesendet ✓
- DTO: akzeptiert 6 ✓
- Service: ignoriert es beim Erstellen ✗ → speichert Default 10
- Checkout: liest 10 aus der DB → zeigt 10

## Fix
products.service.ts create(): rentalDurationDays UND penaltyAmount werden
jetzt an productRepo.create() übergeben (nur wenn gesetzt).

Das UPDATE (Bearbeiten) war NICHT betroffen — es nutzt productRepo.update()
mit allen Feldern. Deshalb konntest du es durch nachträgliches Bearbeiten
"reparieren". Jetzt speichert schon das Erstellen korrekt.

## WICHTIG: Bestehende Produkte korrigieren
Alle VOR diesem Fix erstellten Produkte haben rental_duration_days = 10
in der DB. Zwei Wege, das zu korrigieren:

Weg 1 (einzeln): Jedes Produkt einmal im Händler-Panel bearbeiten und die
Mietdauer neu wählen → speichert jetzt korrekt.

Weg 2 (alle auf einmal, per SQL in Railway) — NUR wenn du für ALLE
denselben Wert willst, z.B. 6:
  UPDATE products SET rental_duration_days = 6 WHERE rental_duration_days = 10;
(Vorsicht: ändert ALLE Produkte mit aktuell 10 auf 6. Nur nutzen wenn
gewollt.)

## Keine Migration nötig (Spalte existiert schon).
