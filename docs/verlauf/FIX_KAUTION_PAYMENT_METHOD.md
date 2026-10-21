# Fix: Kaution wurde übersprungen (payment_method fehlte)

## Symptom
Miete ging durch (payment_intent.succeeded [201]), aber die Kaution blieb
"unvollständig" und der Event amount_capturable_updated kam nie.

## Ursache
Nach stripe.confirmPayment() mit redirect:'if_required' enthält das
zurückgegebene paymentIntent-Objekt die payment_method manchmal NICHT.
Dann war usedPaymentMethod leer → der Kautions-Block wurde übersprungen
→ die Kaution wurde nie bestätigt/reserviert.

## Fix (checkout/rental/page.tsx)
1. Wenn paymentIntent.payment_method leer ist, wird der Miet-PaymentIntent
   frisch von Stripe abgerufen (stripe.retrievePaymentIntent(clientSecret))
   → liefert die payment_method zuverlässig.
2. clientSecret (das Miet-Secret) wird jetzt als Prop an StripePaymentForm
   durchgereicht (vorher nicht verfügbar).
3. Klareres Logging: "✓ Kaution erfolgreich reserviert" bei Erfolg.

## So testen
stripe listen mit allen 3 Events, dann eine Miete:
- Terminal: payment_intent.succeeded [201] UND
            payment_intent.amount_capturable_updated [201]
- Stripe: Kaution auf "Erfordert Zahlungseinzug" (requires_capture)
- Browser-Konsole: "✓ Kaution erfolgreich reserviert"

## Keine Migration, keine Backend-Änderung.
