# 🚀 My Dressa — Anleitung zum Live-Gehen

Diese Anleitung führt Schritt für Schritt zum echten Live-Betrieb mit
echten Zahlungen. Bitte **in dieser Reihenfolge** durchgehen und nichts
überspringen — jeder Schritt baut auf dem vorigen auf.

> ⚠️ **Wichtig vorab:** „Live gehen" bedeutet echtes Geld, echte
> Kundendaten und rechtliche Verantwortung. Bitte die rechtlichen Punkte
> am Ende (Abschnitt 7) ernst nehmen — sie sind kein optionales Extra.

---

## Schritt 1: Datenbank vorbereiten (technische Basis)

Bevor irgendetwas live geht, muss die Datenbank vollständig eingerichtet
sein. Falls das noch nicht geschehen ist, muss die Migrations-Datei
`ALLE_MIGRATIONEN.sql` einmal komplett auf der Produktions-Datenbank
(Railway) laufen.

- [ ] Alle Tabellen sind angelegt (keine „column/relation does not exist"-Fehler in den Logs)
- [ ] Eine Test-Miete und ein Test-Kauf funktionieren ohne DB-Fehler

**Warum:** Ohne vollständige Datenbank stürzt die App bei bestimmten
Aktionen ab. Das ist der häufigste Grund für „geht plötzlich nicht".

---

## Schritt 2: Alle Zugangsdaten (Umgebungsvariablen) setzen

Die App braucht eine Reihe von geheimen Zugangsdaten. Diese werden **direkt
bei Railway** eingetragen (nicht im Code, nicht per Nachricht verschickt).

### Frontend (Railway → Web-Service → Variables)
```
NEXT_PUBLIC_API_URL                    = https://[deine-api].up.railway.app/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY     = pk_live_...   (siehe Schritt 4)
NEXT_PUBLIC_COMPANY_NAME               = (Firmenname)
NEXT_PUBLIC_COMPANY_OWNER              = (Inhaber)
NEXT_PUBLIC_COMPANY_STREET             = (Straße)
NEXT_PUBLIC_COMPANY_CITY               = (PLZ + Ort)
NEXT_PUBLIC_COMPANY_COUNTRY            = (Land)
NEXT_PUBLIC_COMPANY_EMAIL              = (Kontakt-E-Mail)
NEXT_PUBLIC_COMPANY_WEBSITE            = https://www.mydressa.de
NEXT_PUBLIC_COMPANY_VAT_ID             = (USt-ID, falls vorhanden)
```

### Backend (Railway → API-Service → Variables)
```
STRIPE_SECRET_KEY        = sk_live_...   (siehe Schritt 4 — STRENG GEHEIM)
STRIPE_WEBHOOK_SECRET    = whsec_...      (siehe Schritt 3)
JWT_SECRET               = (langer zufälliger String)
JWT_REFRESH_SECRET       = (anderer langer zufälliger String)
JWT_EXPIRES_IN           = 15m
JWT_REFRESH_EXPIRES_IN   = 7d
BREVO_API_KEY            = (für E-Mail-Versand)
BREVO_SMTP_USER          = (Brevo SMTP)
BREVO_SMTP_KEY           = (Brevo SMTP)
AWS_ACCESS_KEY_ID        = (Cloudflare R2 — Bilder)
AWS_SECRET_ACCESS_KEY    = (Cloudflare R2)
AWS_ENDPOINT             = (Cloudflare R2)
FIREBASE_PROJECT_ID      = (falls genutzt)
FIREBASE_CLIENT_EMAIL    = (falls genutzt)
FIREBASE_PRIVATE_KEY     = (falls genutzt)
FIREBASE_STORAGE_BUCKET  = (falls genutzt)
```

> 🔒 **Sicherheit:** Der `sk_live_`-Key und alle Secrets werden vom
> Betreiber **selbst direkt bei Railway** eingetragen — niemals per Chat,
> E-Mail oder Screenshot teilen. Wer den `sk_live_`-Key hat, kann echtes
> Geld bewegen.

---

## Schritt 3: Stripe-Webhook einrichten (Zahlungsbestätigung)

Ohne diesen Schritt weiß die App nicht, wann eine Zahlung erfolgreich war —
Bestellungen bleiben dann fälschlich auf „unbezahlt".

1. **dashboard.stripe.com** → oben in den **Live-Modus** wechseln
2. **Developers → Webhooks → Add endpoint**
3. Endpoint-URL:
   ```
   https://[deine-api].up.railway.app/api/v1/webhooks/stripe
   ```
   (die echte API-URL von Railway, mit `/api/v1/webhooks/stripe` am Ende)
4. Events auswählen:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
5. **Add endpoint**
6. Das angezeigte **Signing secret** (`whsec_...`) kopieren und bei Railway
   als `STRIPE_WEBHOOK_SECRET` (Backend) eintragen

> Hinweis: `stripe listen` im Terminal ist nur zum Testen und läuft nur,
> solange ein PC an ist. Für den echten Betrieb ist dieser Dashboard-
> Webhook zwingend.

---

## Schritt 4: Von Test- auf Live-Zahlungen umstellen

Solange Test-Keys (`pk_test_` / `sk_test_`) aktiv sind, fließt kein echtes
Geld. Für den echten Betrieb:

1. **dashboard.stripe.com** → **Live-Modus** aktivieren
2. Stripe-Konto vollständig verifizieren (Firmendaten, Bankverbindung) —
   Stripe verlangt das, bevor echte Auszahlungen möglich sind
3. **Developers → API Keys** (im Live-Modus):
   - `pk_live_...` → Frontend-Variable `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `sk_live_...` → Backend-Variable `STRIPE_SECRET_KEY`
4. Den Live-Webhook aus Schritt 3 einrichten (eigenes `whsec_` für Live!)

> ⚠️ Test- und Live-Modus haben **getrennte** Keys und Webhooks. Nicht
> vermischen. Erst im Testmodus alles durchtesten, dann auf Live umstellen.

---

## Schritt 5: Nach jeder Änderung neu deployen

Railway übernimmt geänderte Variablen erst nach einem Neustart/Deploy.
- [ ] Nach dem Setzen aller Variablen: beide Services (Web + API) neu deployen
- [ ] In den Logs prüfen: keine Fehler beim Start

---

## Schritt 6: Vollständig durchtesten (VOR dem echten Start)

- [ ] Die Datei `TEST_CHECKLISTE.md` einmal komplett durchgehen
- [ ] Zuerst im **Stripe-Testmodus** (Testkarte 4242 4242 4242 4242)
- [ ] Prüfen: Miete, Kauf, Storno, Versand, Rückgabe, Kaution
- [ ] Prüfen: Zahlung erscheint korrekt im Stripe-Dashboard
- [ ] Erst wenn alles läuft → auf Live-Keys umstellen
- [ ] Eine echte Klein-Testzahlung im Live-Modus (und wieder erstatten)

---

## Schritt 7: Rechtliches — BITTE ERNST NEHMEN ⚖️

Diese Punkte sind **kein Code-Thema**, aber rechtlich verpflichtend in
Deutschland. Ohne sie drohen Abmahnungen und Bußgelder.

- [ ] **Impressum** vollständig und korrekt (Pflicht nach § 5 DDG)
- [ ] **Datenschutzerklärung** (DSGVO) — was wird gespeichert, warum, wie lange
- [ ] **AGB** — besonders das **Miet- und Kautionsmodell**
- [ ] **Widerrufsrecht** für Verbraucher korrekt geregelt

> 🚨 **Dringende Empfehlung:** Das Miet- und Kautionsmodell von einem
> **Anwalt** prüfen lassen, bevor echtes Geld fließt. Die Kaution und die
> Regelungen bei verspäteter Rückgabe/Schäden berühren deutsches
> Verbraucherrecht (u.a. AGB-Recht). Eine falsche Formulierung kann die
> ganze Klausel unwirksam machen. Das ist die wichtigste nicht-technische
> Aufgabe vor dem Start.

---

## Schritt 8: Los geht's

Wenn Schritte 1–7 abgehakt sind:
- [ ] Live-Keys aktiv, Webhook läuft, alles getestet
- [ ] Rechtstexte anwaltlich geprüft
- [ ] Ein letzter echter Testkauf funktioniert

**Dann ist die Seite bereit für echte Kunden.** 🎉

---

## Bei Problemen
- **Zahlung kommt nicht an:** Webhook prüfen (Schritt 3) — häufigste Ursache
- **App-Fehler „does not exist":** Migration unvollständig (Schritt 1)
- **„Stripe nicht konfiguriert":** Publishable-Key-Variable fehlt (Schritt 2)
- **Bilder laden nicht:** R2/AWS-Variablen prüfen (Schritt 2)

Immer zuerst in den **Railway-Logs** schauen — dort steht die genaue
Fehlerursache.
