# Fix: Hydration-Fehler + Kreislauf entfernt

## 1. Hydration-Fehler behoben
FEHLER: "Text content does not match server-rendered HTML"

URSACHE: Die neue Produktkarte rief t() (Übersetzung) direkt beim ersten
Render auf. Der Server rendert immer Deutsch, der Browser bei englischer
Spracheinstellung aber Englisch → der Text stimmte nicht überein → React
meldet einen Hydration-Fehler.

LÖSUNG: Alle sichtbaren Texte rendern vor dem "Mount" jetzt immer Deutsch
(wie der Server), erst danach wechselt die Sprache. Das ist exakt das
Muster, das Navbar und Startseite schon nutzten (mounted ? t(...) : 'de').

## 2. Kreislauf komplett entfernt
Die "Das Kleid bleibt in Bewegung"-Grafik ist raus. Die Startseite zeigt
wieder die unveränderte "So funktioniert es"-Sektion.
(Die Datei RentalCycle.tsx liegt noch im Ordner, wird aber nirgends mehr
importiert — sie stört nicht und kann gelöscht werden.)

## Weiterhin aktiv (neues Design)
- Preis-Erzählung auf der Karte
- Zweites Bild beim Hover
- Verfügbarkeitsanzeige

## Hinweis: "Next.js ist veraltet"
Das ist nur eine Warnung, KEIN Fehler. Eure Version ist 14.2.35.
Optional aktualisieren mit:  npm i next@latest
Muss aber nicht — die App läuft damit einwandfrei.
