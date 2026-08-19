# Fix: Icon-Namen erscheinen als Text beim ersten Laden (FOUT)

## Problem
Beim ersten Laden im Browser sah man kurz die WÖRTER (home, favorite,
shopping_cart …) statt der Icons — erst nach 1-2 Sek erschienen die Symbole.

## Ursache
Die Material-Symbols-Icon-Font wird von Google geladen. Solange sie nicht
da ist, zeigt der Browser den Text-Inhalt von
<span class="material-symbols-outlined">home</span> — also das Wort "home".
Verstärkt durch display=swap (sagt dem Browser ausdrücklich: erst Text zeigen).

## Lösung (3 Teile)
1. display=swap → display=block bei der Icon-Font
   (Block-Periode: Text unsichtbar statt als Wort gezeigt)
2. CSS: html:not(.fonts-ready) .material-symbols-outlined { visibility: hidden }
   → Icon-Namen bleiben unsichtbar, bis die Font geladen ist
3. Script: setzt 'fonts-ready' sobald Font geladen (Font Loading API)
   + Fallback nach 2s (falls API fehlt → Icons trotzdem anzeigen)

Ergebnis: Kein Text-Aufblitzen mehr. Icons erscheinen, sobald die Font da ist.

## Hinweis für später (optional, größerer Umbau)
Die dauerhaft beste Lösung wäre, die Icon-FONT ganz zu entfernen und
einzelne SVG-Icons (z.B. lucide-react) zu nutzen. Dann gibt es gar keine
Font mehr zu laden. Aber: großer Umbau (alle <span material-symbols>
ersetzen). Für jetzt nicht nötig.
