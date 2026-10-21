# Icons: Material-Symbols-FONT → echte SVG-Icons (lucide)

## Was & warum
Die Icon-SCHRIFTART (Material Symbols von Google) wurde komplett durch
echte SVG-Icons (lucide-react, war schon installiert) ersetzt.

Vorteile:
- KEIN Text-Aufblitzen mehr beim ersten Laden (das war dein Problem)
- Schneller: keine ~200KB Icon-Font mehr laden
- Keine Google-Fonts-Abhängigkeit für Icons
- Icons sind sofort da (im JS-Bundle, kein Nachladen)

## Wie
Neue zentrale Komponente: src/components/ui/Icon.tsx
- Mappt alle 68 genutzten Material-Namen → lucide-SVG-Komponenten
- Gleiche Nutzung wie vorher: <Icon name="home" style={{fontSize:20}} />
- Versteht feste UND dynamische Namen: <Icon name={item.icon} />
- fontSize/color aus style werden übernommen (Material-kompatibel)

Ersetzt: 143 Vorkommen in 52 Dateien (automatisiert + geprüft).

Entfernt:
- Material-Symbols <link> aus layout.tsx
- Das FOUT-Workaround-Script (nicht mehr nötig)
- .material-symbols-outlined CSS-Regeln

## Wichtig: lucide-Version
package.json hat lucide-react ^0.383.0 (v0-Namen). Die verwendeten Namen
(XCircle, CheckCircle2, AlertCircle, AlertOctagon …) sind für DIESE Version
korrekt. In lucide v1.0 heißen sie anders (CircleX, OctagonAlert …) —
NICHT upgraden ohne die Namen anzupassen, sonst bricht der Build.

## Testen
npm run dev / build → Icons sollten überall als SVG erscheinen.
Falls ein Icon fehlt: Console-Warnung "[Icon] Unbekanntes Icon: xyz"
→ dann fehlt das Mapping in Icon.tsx (leicht zu ergänzen).
