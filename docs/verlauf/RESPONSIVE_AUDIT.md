# Responsive-Audit: Produktseiten

## 🔴 GEFUNDEN & BEHOBEN

### 1. ProductCard: Buttons liefen aus der Karte (betraf Handy UND Laptop)
Die zwei CTAs ("Jetzt Mieten €110" / "Jetzt Kaufen €599") standen nebeneinander
mit whiteSpace:'nowrap'. Der Text konnte weder umbrechen noch schrumpfen.

  Platzbedarf beider Buttons:  ~260px
  Karte auf 360px-Handy:       ~158px   → Überlauf
  Karte auf Tablet (3 Spalten): ~230px  → Überlauf
  Karte auf Laptop (3 Spalten): ~230px  → Überlauf

Nur bei Produkten, die MIETE UND KAUF anbieten (also dem Standardfall!).

BEHOBEN:
- nowrap entfernt, minWidth:0 gesetzt (Text darf notfalls umbrechen)
- Ab 1100px abwärts stapeln sich die Buttons untereinander (volle Kartenbreite)

### 2. Produktdetail: Thumbnails waren auf dem Handy nicht erreichbar
Die Leiste (72px pro Bild, kein Umbruch, kein Scroll) war bei 5+ Bildern breiter
als der Bildschirm. Weil im globals.css "overflow-x: hidden" steht, wurde das
nicht sichtbar — die Bilder 4, 5, 6 waren einfach ABGESCHNITTEN und NICHT
ANTIPPBAR. Das ist schlimmer als ein sichtbarer Überlauf.

BEHOBEN: Leiste ist jetzt horizontal scrollbar (flexShrink:0 + overflowX:auto),
mit dezenter Scrollbar. Alle Bilder erreichbar.

### 3. Grid-Spalten konnten nicht schrumpfen
Grid-/Flex-Kinder haben min-width:auto — sie schrumpfen nicht unter ihre
Inhaltsbreite und erzwingen dadurch Überlauf.
BEHOBEN: minWidth:0 auf beiden Spalten der Detailseite.

### 4. Kleinere Korrekturen
- Produkttitel: feste 36px → clamp(26px, 4.5vw, 36px) + Wortumbruch
- Grid-Abstand: feste 64px → clamp(24px, 4vw, 64px)
- Händler-Zeile: flexWrap ergänzt

## ✅ GEPRÜFT UND IN ORDNUNG
- Produktraster: 4 / 3 / 2 Spalten (Desktop / Tablet / Handy) — CSS nutzt
  !important und überschreibt damit korrekt die Inline-Styles
- Filter-Sidebar: klappt unter 900px weg, Button zum Öffnen vorhanden
- Mietkalender: 7 Spalten mit 1fr — fluid, kein Überlauf
- Bilder: Seitenverhältnis über paddingBottom-% — kein Layout-Sprung
- Viewport-Meta: width=device-width, initialScale 1, Zoom bis 5x erlaubt
- Suchfeld: maxWidth 320 + flex:1 + minWidth:0

## 🟡 EMPFEHLUNG (nicht behoben, Design-Entscheidung)
Der Herz-Button auf der Produktkarte ist 34x34px. Apple und Google empfehlen
mindestens 44x44px für Touch-Ziele. Auf dem Handy ist er dadurch etwas
fummelig zu treffen. Falls gewünscht, vergrößere ich ihn auf 40-44px.

## Testbreiten
320px (iPhone SE) · 360px (Android) · 390px (iPhone 14) · 768px (iPad hoch)
· 1024px (iPad quer) · 1280px (Laptop) · 1440px+ (Desktop)
