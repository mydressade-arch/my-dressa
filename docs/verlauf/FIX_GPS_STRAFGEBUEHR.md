# 2 kleine UI-Fixes

## 1. GPS-Icon + Adresse auf einer Zeile (merchant/orders)
Nach der SVG-Umstellung stand das location_on-Icon oben und die Adresse
brach darunter um (SVGs sind inline-block, verhalten sich anders als die
alte Font).
FIX: Icon + Adresse in einen Flex-Container (display:flex, alignItems:
center, gap:4). Icon hat flexShrink:0 (wird nicht gequetscht), Adresse
in <span>. Jetzt sauber auf einer Zeile.

## 2. "Strafgebühr bei Nichtrückgabe"-Feld entfernt (Produkt anlegen)
Das Eingabefeld wurde aus dem Neu-Produkt-Formular entfernt.
- Nur das sichtbare Feld ist weg
- penaltyAmount bleibt im State (''), wird als undefined ans Backend
  gesendet (Feld ist dort optional) → kein Backend-Problem
- Bonus: rechtlich sicherer. "Strafe/Strafgebühr" ist in DE-AGB heikel
  (§ 309 Nr. 6 BGB, Vertragsstrafen-Verbot). Das Entfernen vermeidet das.

Hinweis: Das Feld existiert im Bearbeiten-Formular evtl. noch — falls es
auch dort weg soll, bitte melden.

## Keine Migration nötig.
