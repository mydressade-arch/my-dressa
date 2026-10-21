# Alle 3 Verifizierungs-Funktionen komplett

## Funktion 1 — Verify-Link in der E-Mail (Nutzer klickt selbst)
Der Nutzer bekommt bei Registrierung eine E-Mail mit Bestätigungslink.
Klick → Konto verifiziert.
Status: war schon da, in v88 repariert (sendWelcome blockierte nicht mehr,
Pfad korrigiert).

## Funktion 2 — Nutzer fordert selbst neue E-Mail an (NEU vervollständigt)
Falls die E-Mail nie ankam, kann der eingeloggte Nutzer selbst eine neue
anfordern.
- Backend: POST /auth/resend-verification (war schon da)
- NEU: VerificationBanner-Komponente mit "E-Mail erneut senden"-Button
- NEU: Banner auf der Konto-Seite eingebunden (zeigt sich nur bei
  unverifizierten Nutzern)
- NEU: isVerified wird jetzt im Login-Response mitgeliefert, damit das
  Frontend den Status kennt

Das Banner kann bei Bedarf auch woanders eingebaut werden:
  import { VerificationBanner } from '@/components/auth/VerificationBanner'
  <VerificationBanner />
Es rendert automatisch nichts, wenn der Nutzer verifiziert/ausgeloggt ist.

## Funktion 3 — Admin/Support (manuell)
Unter /support/verify bzw. /admin/verify:
- Nutzer per E-Mail suchen (Status sehen)
- "Neuen Link erstellen" → Link zum Weitergeben
- "Direkt verifizieren" → sofort freischalten (mit professioneller
  Bestätigungs-Box, kein Browser-Popup mehr)
Status: komplett (v87 gebaut, v88 UI verbessert).

## Änderungen dieser Version
- auth.service.ts: isVerified im Login-Response
- auth.store.ts: isVerified im User-Type
- VerificationBanner.tsx: NEU
- account/page.tsx: Banner eingebunden

## Keine Migration nötig.
