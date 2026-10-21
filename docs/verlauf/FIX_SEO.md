# SEO-Verbesserungen (Suchmaschinen-Optimierung)

## Vorher schon da
Metadaten (Titel, Beschreibung, Keywords, Open Graph, Twitter, robots-meta,
Icons), einige Seiten-Metadaten. metadataBase in v96 ergänzt.

## Neu hinzugefügt

### 1. sitemap.xml (src/app/sitemap.ts)
Automatisch generierte Sitemap für Google:
- Alle statischen öffentlichen Seiten (Home, Produkte, About, etc.)
- Produkte DYNAMISCH von der API geladen (jedes Produkt einzeln in Google
  auffindbar)
- Mit Prioritäten + Update-Frequenz
- Robust: wenn API nicht erreichbar → nur statische Seiten (kein Crash)
- Erreichbar unter /sitemap.xml

### 2. robots.txt (src/app/robots.ts)
- Erlaubt Google die öffentlichen Seiten
- Sperrt private Bereiche (admin, support, merchant, account, checkout,
  auth, api) — die sollen NICHT in Google
- Verweist auf die Sitemap

### 3. Strukturierte Daten / JSON-LD (layout.tsx)
- OnlineStore-Markup für Google (Name, Logo, Beschreibung, URL)
- Hilft Google zu verstehen: "das ist ein Mode-Shop"
- Grundlage für Rich Results

## Empfehlung: Umgebungsvariable
Auf Railway (Web-Service) setzen für korrekte URLs:
  NEXT_PUBLIC_SITE_URL = https://www.mydressa.de

## Nach dem Deploy prüfen
- https://www.mydressa.de/sitemap.xml → sollte die Seiten listen
- https://www.mydressa.de/robots.txt → sollte die Regeln zeigen
- Google Search Console: Sitemap einreichen (dashboard → Sitemaps →
  sitemap.xml eintragen) für schnellere Indexierung

## Optional für später
- JSON-LD pro Produkt (Preis, Verfügbarkeit) für Rich Results mit Preisen
  — komplexer weil Produktseite Client-Komponente ist
- Google Search Console + Analytics einrichten

## Keine Backend-Änderung, keine Migration.
