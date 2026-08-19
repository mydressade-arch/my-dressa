# Fix: "Neuen Link erstellen" zeigte nichts an

## Das Problem
Der Button funktionierte technisch (Server antwortete 201 = Erfolg, Token
wurde erstellt), aber im Frontend erschien NICHTS.

## Die Ursache (Race Condition im State)
resend() setzte den Link + Erfolgsmeldung — und rief dann sofort lookup()
auf, um den Status zu aktualisieren. Aber lookup() begann mit:
  setMsg(''); setLink('')
→ Es LÖSCHTE die gerade erstellte Meldung und den Link im selben Moment.
Ergebnis: Link wird erstellt und sofort wieder entfernt = "nichts passiert".

## Der Fix
1. lookup(keepMessages) — Parameter hinzugefügt. Beim Aufruf aus resend()
   und verifyNow() wird lookup(true) genutzt → Meldung/Link bleiben erhalten.
2. Such-Button: onClick={() => lookup()} statt onClick={lookup}
   (sonst wäre das Event-Objekt als keepMessages=true durchgerutscht).
3. resend() robuster: klare Meldungen für alle Fälle (Link erstellt /
   bereits verifiziert / unerwartete Antwort / Fehler).

## Ergebnis
Nach "Neuen Link erstellen" erscheint jetzt:
- Die Erfolgsmeldung "✓ Neuer Link erstellt..."
- Der Link selbst (klickbar + Kopieren-Button)
Support kann den Link kopieren und dem Kunden geben.

## Keine Backend-Änderung, keine Migration.
