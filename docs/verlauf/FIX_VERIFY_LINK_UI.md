# 2 Fixes: Verify-Link kaputt + professionelle Bestätigung

## Problem 1: Verify-Link funktionierte nicht — ZWEI Ursachen gefunden

Ursache A (Haupt): verifyEmail() rief sendWelcome() mit await auf. Wenn der
E-Mail-Versand wegen Brevo hängt (2-Min-Timeout), scheiterte die ganze
verifyEmail-Antwort — OBWOHL die Verifizierung in der DB schon erfolgreich
war. Frontend sah einen Fehler → "Link funktioniert nicht".
FIX: sendWelcome läuft jetzt im Hintergrund (.catch), blockiert die
Verifizierung nicht mehr.

Ursache B: Die Support-Funktion erzeugte den Link mit falschem Pfad:
  /auth/verify?token=...   (FALSCH — Seite existiert nicht)
Die echte Seite liegt unter /auth/verify-email
FIX: Pfad korrigiert auf /auth/verify-email?token=...

## Problem 2: confirm()-Popup unprofessionell
Die "Direkt verifizieren"-Aktion nutzte das hässliche Browser-confirm()-
Popup. Ersetzt durch eine saubere, eingebettete Bestätigungs-Box direkt in
der Seite (mit klarer Warnung, "Ja verifizieren" / "Abbrechen").
Gilt für Support UND Admin (nutzen dieselbe Komponente).

## Keine Migration nötig.
