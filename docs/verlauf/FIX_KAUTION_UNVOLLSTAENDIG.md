# Fix: Kaution "Unvollständig" + Rückgabe-Button erst nach Tracking

## Problem 1: Kaution blieb "Unvollständig" in Stripe
Test zeigte: Kaution-PaymentIntent in Stripe = "Unvollständig — Kundin hat
Zahlungsmethode nicht angegeben", obwohl Rückgabe als gut bestätigt.

URSACHE: Der Miet-PaymentIntent hatte kein setup_future_usage. Deshalb wurde
die Karte NICHT gespeichert und konnte nicht für die Kautions-Reservierung
wiederverwendet werden → Kaution nie bestätigt.

FIX:
- Backend (payments.service.ts): Miet-Intent bekommt
  setup_future_usage: 'off_session' → Karte wird gespeichert.
- Frontend (checkout/rental): confirmCardPayment für die Kaution nutzt die
  payment_method aus der Miet-Bestätigung (jetzt zuverlässig verfügbar).
  + Logging, falls die payment_method doch fehlt.

## Problem 2: Rückgabe-Button zu früh sichtbar
Der Händler sah "Confirm Return" sofort — auch wenn der Kunde noch gar keine
Rücksendung aufgegeben hatte.

FIX (merchant/orders): "Confirm Return"-Button erscheint ERST, wenn
rental.returnTrackingNumber gesetzt ist (Kunde hat Rücksende-Nummer
eingegeben). Vorher steht stattdessen: "Warte auf Rücksendung des Kunden".

Ablauf jetzt sauber:
1. Kunde schickt Kleid zurück → gibt DHL-Rücksende-Nr. im Konto ein
2. Händler sieht die Nr. → "Confirm Return" erscheint → bestätigt Empfang
3. Kaution wird freigegeben (cancel)

## Wichtig zum Testen
Testkarte 4242... UNTERSTÜTZT manuelle Kaution-Reservierung.
Nach dem Fix in Stripe prüfen:
- Miete: "Succeeded" (Karte gespeichert)
- Kaution: "Requires capture" (= reserviert) — NICHT mehr "Unvollständig"

## Keine Migration nötig.
