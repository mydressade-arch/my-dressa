# 7 Fixes: Live-Vorbereitung (Stripe, E-Mail, Verifizierung)

## 1. "Internal Error" → klare Meldung
createMerchantStripeAccount fängt jetzt Stripe-Connect-Fehler ab.
Statt "Interner Serverfehler" kommt: "Zahlungen sind noch nicht
eingerichtet. Der Betreiber muss zuerst Stripe Connect aktivieren
(dashboard.stripe.com/connect)."

## 2. Falsches "ausverkauft" nach fehlgeschlagener Zahlung
BUG: Bei Kauf wurde der Bestand sofort reduziert (1→0). Schlug die Zahlung
fehl (z.B. Händler ohne Stripe-Konto), blieb der Bestand auf 0 → Produkt
fälschlich "ausverkauft".
FIX: handlePaymentFailed gibt den Bestand bei PURCHASE wieder frei
(variantRepo.increment). ProductVariant dafür ins payments.module + Service
injiziert.

## 3. Mietdauer stand auf 10 statt eingestelltem Wert
Neu-Produkt-Formular: Default war fest 10. Jetzt = erster verfügbarer Wert
aus den Admin-Einstellungen (durations[0]). Falls die gespeicherte Dauer
nicht in der Liste ist, wird sie trotzdem als Option angezeigt.
Bearbeiten-Formular lud den echten Wert schon korrekt (prod.rentalDurationDays).

## 4. Langsame Registrierung (dauerte bis 2 Min)
URSACHE: register() wartete (await) auf den E-Mail-Versand. Bei Brevo-
Problemen lief SMTP in einen 2-Min-Timeout → Nutzer wartete 2 Min.
FIX: E-Mail wird im HINTERGRUND gesendet (kein await). Registrierung ist
sofort fertig. Fehler werden nur geloggt.

## 5. + 6. Brevo IP / E-Mail kommt nicht an / 409 bereits vergeben
URSACHE: Brevo blockiert die Railway-IP (unrecognised IP address).
→ E-Mail geht nicht raus → Kunde kann nicht verifizieren → beim erneuten
Registrieren "409 bereits vergeben".
LÖSUNG (kein Code): IP in Brevo freigeben:
  https://app.brevo.com/security/authorised_ips
Oder IP-Beschränkung dort deaktivieren.
Code-seitig: siehe Punkt 7 (manuelle Verifizierung als Ausweg).

## 7. Admin/Support: Verifizierung manuell handhaben (NEU)
Neue Seite: /support/verify UND /admin/verify (im Menü verlinkt).
Support/Admin kann:
- Nutzer per E-Mail suchen → sieht Verifizierungsstatus
- "Neuen Link erstellen" → generiert frischen Verifizierungs-Link zum
  Weitergeben an den Kunden (falls E-Mail nicht ankam)
- "Direkt verifizieren" → schaltet den Nutzer sofort manuell frei

Backend: 3 neue Endpoints in users.controller (nur ADMIN + SUPPORT):
  GET  /users/support/lookup/:email
  POST /users/support/resend-verification
  POST /users/support/verify-manually

## WICHTIG — was der Betreiber SELBST tun muss (kein Code):
1. Stripe Connect aktivieren: dashboard.stripe.com/connect
   (sonst kann kein Händler ein Konto verbinden → keine Zahlungen)
2. Brevo-IP freigeben (sonst kommen keine E-Mails an)
3. Eigenes Stripe-Hauptkonto verifizieren (Firmendaten, Bank)

## Migration
KEINE neue Tabelle nötig — alle genutzten Felder existieren bereits.
