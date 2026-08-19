# Progressive E-Mail-Verifizierung

## Das Problem
Alle Nutzer erschienen als "verifiziert", obwohl sie den Link nie klickten.
Ursache: auth.service.ts Zeile 49:
  isVerified: NODE_ENV === 'development'
→ Im Dev-Modus wurden ALLE Nutzer automatisch verifiziert. Sicherheitsrisiko
falls Railway je auf development läuft.

## Die neue Lösung (progressive Verifizierung)
Nutzer können sich registrieren + einloggen + stöbern OHNE Verifizierung.
Verifizierung wird erst bei GELD-Aktionen verlangt: Kauf, Miete, Verkäufer
werden.

Vorteile:
- Niedrige Einstiegshürde (verliert keine Nutzer beim Registrieren)
- Robust gegen Brevo-E-Mail-Probleme (man kommt trotzdem rein)
- Schützt trotzdem da, wo Geld/Verantwortung im Spiel ist

## Änderungen

Backend:
1. auth.service.ts register(): isVerified: false (IMMER, kein Dev-Bypass)
2. auth.service.ts login(): Verifizierungs-Sperre ENTFERNT (man kann rein)
3. orders.service createPurchaseOrder(): prüft isVerified → sonst
   ForbiddenException "Bitte E-Mail bestätigen, um kaufen zu können"
4. rentals.service create(): prüft isVerified → sonst "...um mieten..."
5. merchant-requests.service createRequest(): prüft isVerified →
   "...um verkaufen..."
6. NEU: auth resendVerification() + POST /auth/resend-verification
   (eingeloggte Nutzer können Bestätigungs-E-Mail erneut anfordern)

Frontend:
- authApi.resendVerification() hinzugefügt
- Checkout zeigt die klare Fehlermeldung an (war schon vorhanden)

## Bestehende Nutzer
Die aktuell fälschlich als verifiziert markierten Nutzer bleiben verifiziert
(kein Zwang, sie zurückzusetzen). Nur NEUE Nutzer starten unverifiziert.
Falls du ALLE zurücksetzen willst (optional):
  UPDATE users SET is_verified = false WHERE role = 'customer';
(Vorsicht: dann müssen alle Kunden neu verifizieren.)

## Admin/Support-Werkzeug
Erinnerung: Unter /support/verify bzw. /admin/verify können Admin/Support
Nutzer manuell verifizieren oder einen neuen Link erzeugen (falls E-Mail
nicht ankommt).

## Keine Migration nötig.
