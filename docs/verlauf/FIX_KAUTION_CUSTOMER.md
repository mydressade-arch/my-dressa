# Fix: Kaution "unvollständig" — Stripe-Customer fehlte (ECHTE Ursache)

## Diagnose aus den Stripe-Transaktionen
Zwei Zahlungen bei einer Miete:
- 14,99 € "Erfolgreich" (Karte 4242) = die MIETE (auto-capture)
- 20,00 € "Unvollständig" (keine Karte), confirm 400 = die KAUTION
Die Kaution scheiterte beim Bestätigen mit "keine Zahlungsmethode verfügbar".

## Die ECHTE Ursache
Eine Karte kann nur dann für eine ZWEITE Zahlung (die Kaution) wiederverwendet
werden, wenn sie an einen Stripe-CUSTOMER gebunden ist. Es gab keinen Customer
→ die Karte war Einmal-Gebrauch → Kaution blieb "unvollständig".
setup_future_usage allein reicht NICHT ohne Customer.
(v103 holte die payment_method zuverlässiger, aber ohne Customer war sie
trotzdem nicht wiederverwendbar.)

## Fix (payments.service.ts create-intent, RENTAL)
1. Stripe-Customer anlegen oder wiederverwenden (pro User, gespeichert in
   users.stripe_customer_id).
2. BEIDE Intents (Miete + Kaution) bekommen customer: <customerId>.
3. Miete behält setup_future_usage: 'off_session' → Karte wird an den Customer
   gebunden, sobald die Miete bestätigt ist.
4. Kaution nutzt denselben Customer → Karte ist wiederverwendbar → Reservierung
   klappt.

Plumbing:
- User-Entity: neues Feld stripeCustomerId (stripe_customer_id)
- payments.service: userRepo injiziert
- payments.module: User registriert

## MIGRATION NÖTIG (neu!)
In ALLE_MIGRATIONEN.sql ergänzt + auf Railway ausführen:
  ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR DEFAULT NULL;

## So testen
Miete mit Karte 4242. Jetzt sollte:
- Miete: "Erfolgreich"
- Kaution: "Erfordert Zahlungseinzug" (requires_capture) — NICHT mehr "unvollständig"
- Terminal: payment_intent.amount_capturable_updated [201]
- Browser-Konsole: "✓ Kaution erfolgreich reserviert"
