# Fix: "Kann nicht gelöscht werden" beim Produkt-Bearbeiten

## Der Fehler
Beim Bearbeiten eines Produkts, das schon Bestellungen hat:
  PATCH /products/... → 409
  "Kann nicht gelöscht werden — verknüpfte Bestellungen vorhanden"
  (FK-Constraint orders_product_variant_id_fkey)

## Die Ursache
Die update-Methode hat bei JEDER Bearbeitung ALLE Varianten gelöscht
und neu angelegt:
    DELETE FROM product_variants WHERE product_id = ...
Sobald aber eine Variante in einer Bestellung referenziert ist, verbietet
die Datenbank das Löschen. → Bearbeiten unmöglich, sobald etwas verkauft
oder vermietet wurde.

## Die Lösung: Zusammenführen statt Löschen-und-Neu
Varianten werden jetzt intelligent gemerged (erkannt an Größe + Farbe):
  - Vorhandene Variante  → aktualisiert (Bestand etc.)
  - Neue Variante        → hinzugefügt
  - Entfernte Variante:
      · wenn in Bestellungen → NICHT gelöscht, nur Bestand auf 0
        (Historie bleibt intakt, verschwindet aber aus dem Verkauf)
      · wenn ungenutzt       → gelöscht

## Nebeneffekt behoben
Varianten mit Bestand 0 erscheinen nicht mehr in der Größenauswahl auf
der Produktseite. Eine "entfernte" (deaktivierte) Variante verschwindet
also sauber für den Kunden.

## Keine Migration nötig
Nur Logik geändert, kein Schema.

## Testen
1. Produkt mit einer Bestellung bearbeiten → speichern
   → funktioniert jetzt (vorher 409-Fehler)
2. Eine Variante entfernen, die schon vermietet wurde
   → sie verschwindet aus dem Shop, die alte Bestellung bleibt aber gültig
3. Eine ungenutzte Variante entfernen → wird echt gelöscht
