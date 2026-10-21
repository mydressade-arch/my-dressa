# Etappe 1: Kaution als 30-Tage-Reservierung (Airbnb-Modell)

## Das gelöste Problem
Früher: Miete + Kaution als EINE Abbuchung → Stripe-Gebühr auf die volle
(hohe) Summe. Kaution-Rückgabe per Refund → Gebühr NICHT erstattet → Verlust.

Jetzt: Miete abbuchen, Kaution nur RESERVIEREN (30 Tage, von Stripe für das
Konto freigeschaltet). Keine Gebühr auf die reservierte Kaution.

## Voraussetzung (von Stripe bestätigt)
Stripe Support hat für das Konto (acct_1TkgoKDeuAHMsJcx) freigeschaltet:
- MCC 7296 (Clothing Rental)
- Extended Authorization bis 30 Tage
- "no additional fees"

## Code-Änderungen

### 1. create-intent (payments.service.ts)
RENTAL erzeugt jetzt ZWEI PaymentIntents:
- Miete: amount = Mietbetrag, sofort abbuchen (automatic capture)
- Kaution: amount = Kaution, capture_method: 'manual',
  payment_method_options.card.request_extended_authorization: 'if_available'
Rückgabe: rentalClientSecret + depositClientSecret + depositPaymentIntentId.
depositIncluded: false, totalCharged = nur Miete.

### 2. Frontend (checkout/rental/page.tsx)
Nach der Miet-Bestätigung (confirmPayment) wird die Kaution mit DERSELBEN
Karte reserviert: stripe.confirmCardPayment(depositClientSecret,
{ payment_method: paymentIntent.payment_method }).
Schlägt die Kaution fehl (Karte unterstützt keine Reservierung) → trotzdem
weiterleiten (Miete ist bezahlt), nur Warnung loggen.

### 3. Webhook (stripe-webhook.controller.ts + payments.service.ts)
NEU: Event 'payment_intent.amount_capturable_updated' → handleDepositAuthorized().
Bei manueller Kaution feuert Stripe KEIN 'succeeded', sondern dieses Event,
sobald die Reservierung steht. Dort: deposit.stripeHoldId = Kautions-Intent-ID,
status = HELD.
handlePaymentSucceeded erkennt zusätzlich type 'rental_deposit_hold'.

### 4. releaseDeposit (damage-reports.service.ts)
Rückgabe GOOD: stripe.paymentIntents.cancel(holdId) statt refund.
→ Reservierung aufgehoben, Geld sofort frei beim Kunden, KEINE Gebühr.
Fallback (alte abgebuchte Kaution): refund.

### 5. retainDeposit (damage-reports.service.ts)
Schaden: stripe.paymentIntents.capture(holdId, { amount_to_capture: retained }).
Zieht nur den Schadensbetrag ein, Rest wird automatisch freigegeben.
Transfer an Händler läuft NACH dem Capture. Fallback: Teil-Refund.

## WICHTIG — User-Aktionen (kein Code)

### Produktion-Webhook erweitern!
Im Stripe-Dashboard beim Produktions-Webhook den Event hinzufügen:
  payment_intent.amount_capturable_updated
(zusätzlich zu succeeded + payment_failed)
OHNE diesen Event wird die Kautions-Hold-ID NIE gespeichert → release/retain
funktioniert nicht!

### Zum Testen (stripe listen)
stripe listen --forward-to .../webhooks/stripe
--events payment_intent.succeeded,payment_intent.payment_failed,payment_intent.amount_capturable_updated

## Grenzen (ehrlich)
- Nicht jede Karte unterstützt 30-Tage-Reservierung ("if_available" → fällt
  sonst auf Standard-Dauer zurück, ~7 Tage). Dann Risiko bei langen Mieten.
- Miete > 30 Tage: Reservierung verfällt. Für später: rechtzeitig erneuern.
- off-session capture kann scheitern → Fallback-Logik vorhanden.

## RECHTLICH (Anwalt, Etappe 3)
Zustimmungstext im Checkout + AGB: "Kaution wird reserviert, bei Schaden
bis zu X€ eingezogen". Noch zu erledigen.

## Keine Migration nötig (deposit.entity hat alle Felder).
