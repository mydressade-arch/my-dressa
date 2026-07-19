# Feature: Admin ändert Startseiten-Bilder selbst

## Was der Admin jetzt kann
Unter /admin/settings gibt es einen neuen Block "Startseiten-Bilder".
Dort kann er alle 5 Bilder der Startseite ändern:
  - Hauptbild (Hero, ganz oben)
  - Abendmode (große Kachel)
  - Business (kleine Kachel)
  - Accessoires (kleine Kachel)
  - Vintage & Unikate (Banner)

Zwei Wege pro Bild:
  1. HOCHLADEN  → Datei vom Computer (landet in Cloudflare R2)
  2. URL        → eine Bild-Adresse einfügen (z.B. von Unsplash)

Jedes Bild hat eine Live-Vorschau. Änderungen erscheinen SOFORT auf der
Startseite (die lädt die Bilder beim Öffnen vom Server).

## Technik
BACKEND (settings-Modul):
  - 5 neue Setting-Keys (home_hero_img, home_dress_img, …)
  - getHomeImages() liefert alle Bilder (mit den alten URLs als Fallback)
  - StorageService.uploadSiteImage() für den Upload nach R2
  - Endpoints:
      GET  /settings/home-images                     (öffentlich)
      PUT  /settings/admin/home-images/:name         (Admin, per URL)
      POST /settings/admin/home-images/:name/upload  (Admin, Datei)

WEB:
  - Startseite lädt die Bilder dynamisch (settingsApi.homeImages),
    Fallback = die bisherigen fest verdrahteten Bilder
  - Neue Admin-Komponente HomeImagesManager (Upload + URL + Vorschau)

## Keine Migration nötig
Die Bilder sind normale Einträge in der bestehenden app_settings-Tabelle.

## Wichtig: Upload braucht konfigurierten Speicher
Der Datei-Upload funktioniert nur, wenn Cloudflare R2 eingerichtet ist
(die gleichen Zugangsdaten, die schon für Produktbilder genutzt werden).
Falls R2 nicht konfiguriert ist, kommt eine klare Meldung — dann einfach
den URL-Weg nutzen. Der funktioniert immer.

## Testen
1. Als Admin: /admin/settings → runterscrollen zu "Startseiten-Bilder"
2. Bei "Vintage & Unikate" eine URL einfügen → Speichern
3. Startseite öffnen → das neue Bild ist da
4. Upload testen: eine Bilddatei hochladen (falls R2 konfiguriert)
