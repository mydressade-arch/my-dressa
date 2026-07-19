# My Dressa — Logo & Icons (Web)

## Dateien in public/
favicon.ico            Browser-Tab (16/32/48)
favicon.svg            moderne Browser, scharf in jeder Größe
apple-touch-icon.png   iPhone/iPad Homescreen (180px)
icon-192.png           PWA
icon-512.png           PWA
manifest.json          PWA-Manifest
og-image.png           Sharing-Bild (WhatsApp, LinkedIn, Facebook…)

mark.svg               nur das Zeichen (in Navbar + Footer eingebaut)
logo.svg               Zeichen + Schriftzug, dunkel (helle Flächen)
logo-light.svg         Zeichen + Schriftzug, hell (dunkle Flächen)
logo-stacked.svg       gestapelt (z.B. Login-Seite)

## Bereits eingebaut
- Navbar + Footer zeigen jetzt das Zeichen neben "My Dressa"
- layout.tsx: Favicon, Apple-Touch-Icon, Manifest, OG-Bild verdrahtet

## Testen
Nach dem Deploy: Link in WhatsApp posten → das og-image sollte erscheinen.
Falls nicht: Browser-Cache leeren, Facebook-Debugger nutzt einen eigenen Cache.
