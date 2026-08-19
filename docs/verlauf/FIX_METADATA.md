# Metadaten vervollständigt

## Was schon da war (gut!)
Titel, Beschreibung, Keywords, Open Graph, Icons, Favicon, Manifest —
alle referenzierten Bilder existieren auch. Solide Basis.

## Was ergänzt wurde
1. metadataBase — behebt die Build-Warnung. Nutzt NEXT_PUBLIC_SITE_URL
   (Fallback https://www.mydressa.de). Damit werden og-image & Co. mit der
   ECHTEN Domain aufgelöst, nicht mehr localhost:3000.
2. twitter — summary_large_image Karte (schöne Vorschau auf X/Twitter).
3. robots — erlaubt Google-Indexierung + große Bildvorschau.

## Empfehlung: Umgebungsvariable setzen
Für saubere Metadaten in Produktion auf Railway (Web-Service) setzen:
  NEXT_PUBLIC_SITE_URL = https://www.mydressa.de
(sonst greift der Fallback, der aber auch schon korrekt ist)

## Optional für später (nicht dringend)
- Eigene og-image.png pro Produkt (aktuell globales Bild) — für schönere
  Link-Vorschauen einzelner Produkte
- sitemap.xml + robots.txt für bessere Google-Indexierung

## Keine Backend-Änderung, keine Migration.
