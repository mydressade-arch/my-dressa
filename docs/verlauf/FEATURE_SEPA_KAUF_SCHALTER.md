# Feature: SEPA-Lastschrift beim Kauf (Admin-Schalter)

## Wunsch des Kunden
- Beim KAUF: alle Methoden (Karte + IBAN/SEPA)
- Beim MIETEN: nur Karte (Visa/Mastercard) — wegen Kaution-Reservierung
- Admin kann SEPA später im Panel an/aus schalten

## Warum Miete nur Karte
SEPA kann KEINE Beträge reservieren (bucht immer sofort ab). Die Kaution
braucht aber eine Reservierung (unser 30-Tage-Hold-Modell). Darum ist Miete
fest auf Karte, nicht abschaltbar.

## Umsetzung

### Backend
- app-setting.entity: neuer Key ALLOW_SEPA_PURCHASE ('allow_sepa_purchase')
- settings.service: getAllowSepaPurchase() / setAllowSepaPurchase()
  Default: false (nur Karte)
- payments.service: PURCHASE-Intent nutzt je nach Setting
  ['card'] oder ['card','sepa_debit']. Miete bleibt IMMER ['card'].
  SettingsService injiziert (SettingsModule in payments.module importiert).
- settings.controller:
  GET /settings/payment-methods (öffentlich, für Checkout)
  PUT /settings/admin/payment-methods (Admin, { allow: bool })

### Frontend
- settingsApi: paymentMethods() + adminSetPaymentMethods(allow)
- admin/settings: Toggle-Schalter "SEPA-Lastschrift beim Kauf"
  (schön animiert, Standard aus)
- Checkout: KEINE Änderung nötig! PaymentElement zeigt die Methoden
  automatisch, die der PaymentIntent mitbringt. return_url ist schon da
  (SEPA braucht Weiterleitung).

## WICHTIG — User-Aktionen (kein Code)

### SEPA in Stripe aktivieren
Damit SEPA überhaupt erscheint, muss es im Stripe-Dashboard aktiviert sein:
Stripe Dashboard → Settings → Payment methods → SEPA Direct Debit → aktivieren.
OHNE das zeigt Stripe die Option nicht, egal was im Code steht.

### SEPA-Risiko (dem Kunden bekannt, trotzdem gewünscht)
- SEPA ist langsam (Tage bis Bestätigung) → erst nach Zahlungseingang versenden
- Rücklastschrift bis zu 8 Wochen möglich → Geld kann zurückgeholt werden
- Standard-Schalter: AUS

## Keine Migration nötig (app_settings-Tabelle existiert, key/value).
