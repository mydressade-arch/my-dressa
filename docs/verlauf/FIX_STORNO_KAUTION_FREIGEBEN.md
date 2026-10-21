# Fix: Bei Miet-Storno wird die Kaution freigegeben

## Die Logik-Lücke (vom User erkannt)
Bei einer bezahlten Miete, die storniert wird:
- Miete wurde zurückerstattet ✓
- Rental auf cancelled ✓
- ABER: die reservierte Kaution (Hold) blieb blockiert → das Geld des
  Kunden war bis zu 30 Tage auf der Karte gesperrt, bis die Reservierung
  von selbst verfiel. Nicht sauber.

## Fix (orders.service cancel())
Bei einer stornierten MIETE wird jetzt zusätzlich die Kautions-Reservierung
freigegeben:
- stripe.paymentIntents.cancel(stripeHoldId) → Hold aufgehoben, Geld sofort
  wieder frei beim Kunden
- Fallback (alte abgebuchte Kaution): refund
- Deposit-Status → RELEASED, mit Grund "Miete storniert — Kaution freigegeben"

Dafür: Deposit-Repo in orders.service injiziert + in orders.module registriert.

## Ablauf jetzt vollständig bei Miet-Storno
1. Miete zurückerstattet
2. Kautions-Reservierung aufgehoben (Geld sofort frei) ← NEU
3. Kalender wieder frei (Rental cancelled)

## Kauf-Storno unverändert
Bei Kauf: Refund + Bestand zurück (keine Kaution betroffen).

## Keine Migration nötig.
