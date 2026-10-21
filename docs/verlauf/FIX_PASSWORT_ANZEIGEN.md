# Passwort anzeigen/verbergen (Auge-Icon)

## Was
Bei allen Passwortfeldern gibt es jetzt ein Auge-Icon zum Anzeigen/
Verbergen des Passworts.

## Wie
Neue wiederverwendbare Komponente: components/ui/PasswordInput.tsx
- Ersetzt <input type="password" ... />
- Auge-Icon rechts im Feld (visibility / visibility_off)
- Klick schaltet zwischen Text und Punkten um
- tabIndex=-1 am Button (springt beim Tab nicht dazwischen)

Neue Icons im Mapping: visibility (Eye), visibility_off (EyeOff)

## Ersetzt in (6 Felder, 4 Seiten):
- Login (1)
- Registrierung (1) — über die generische Feld-map
- Passwort zurücksetzen (2)
- Konto → Passwort ändern (3)

## Keine Migration, keine Backend-Änderung.
