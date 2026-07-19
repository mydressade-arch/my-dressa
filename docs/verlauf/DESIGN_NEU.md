# Neues Design — mit Rückschalter

## Zurück zur alten Ansicht (nichts geht verloren)
In der .env (oder bei Railway in den Variablen):

    NEXT_PUBLIC_NEW_DESIGN=0

Damit erscheint wieder exakt die alte Produktkarte und die alte
"So funktioniert es"-Sektion. Der alte Code liegt unverändert in
ProductCardClassic.tsx — es wurde nichts überschrieben.

## Was neu ist

### 1. Preis-Erzählung auf der Karte
Vorher: zwei gleich große Buttons ("Mieten €110" / "Kaufen €599").
Jetzt:  Die Miete steht groß, der Kaufpreis daneben als Einordnung
        ("oder kaufen für €599").

WICHTIG — bewusste Entscheidung:
Ich habe KEINEN durchgestrichenen Preis und KEINE "Sparen Sie 82 %"-
Auszeichnung eingebaut. Der Kaufpreis ist kein früherer Preis, sondern ein
zweites Angebot. Werbung mit Preisgegenüberstellungen ist in Deutschland
abmahnanfällig. Die Geschichte erzählt jetzt die Typografie — das wirkt
genauso, ohne das Risiko.

Es gibt eine sachliche Zeile "Miete = 18 % des Kaufpreises".
Falls euer Anwalt Bedenken hat, abschaltbar mit:
    NEXT_PUBLIC_PRICE_RATIO=0

### 2. Zweites Bild beim Hover
Fährt man über die Karte, blendet das zweite Produktbild ein.
Fällt sauber zurück, wenn nur ein Bild existiert.

### 3. Verfügbarkeit auf der Karte
"Sofort verfügbar" (grün) oder "Frei ab 20. Juli" (dunkel/gold).

BACKEND: products.service berechnet das mit EINER zusätzlichen Abfrage pro
Seite (kein N+1). Neue Felder in der Produktliste:
  availableNow: boolean
  nextAvailableDate: "2026-07-20" | null

### 4. Kreislauf-Grafik — STANDARDMÄSSIG AUS
Es wird die klassische "So funktioniert es"-Sektion gezeigt (wie gewünscht).
Die Ring-Variante ("Das Kleid bleibt in Bewegung") liegt weiterhin im Code,
ist aber deaktiviert. Zum Einschalten:
    NEXT_PUBLIC_CYCLE=1

### 5. Qualitätsdetails (ohne Schalter, immer aktiv)
- Bilder blenden sanft ein statt hart aufzupoppen
- Sichtbarer Fokusrahmen bei Tastaturbedienung (:focus-visible)
- "Bewegung reduzieren" aus den Systemeinstellungen wird respektiert
- Herz-Button jetzt 40px statt 34px (besser auf dem Handy zu treffen)

## Was ich NICHT prüfen konnte
Ich kann Next.js hier nicht starten. Der Ring ist rechnerisch platziert,
aber im Browser noch nicht gesehen. Bitte einmal anschauen — besonders
bei 900-1100px Breite, wo er am engsten wird.
