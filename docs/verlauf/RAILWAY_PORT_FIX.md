# Fix: "Website nicht erreichbar" / SIGTERM auf Railway

## Problem
Das Frontend startete mit `next start` auf festem Port 3000.
Railway weist aber einen DYNAMISCHEN Port über $PORT zu.
→ App hört auf 3000, Railway erwartet sie auf $PORT
→ Railway denkt "App antwortet nicht" → SIGTERM → Neustart-Schleife
→ Website nicht erreichbar (obwohl der Prozess "startet")

## Fix (bereits eingebaut)
1. package.json:
   "start": "next start -p ${PORT:-3000}"
2. nixpacks.toml:
   cmd = "npx next start -p ${PORT:-3000}"

Jetzt nutzt die App den Port, den Railway vorgibt.

## Nach dem Deploy prüfen
1. In Railway → dein Frontend-Service → Settings → Networking:
   Ein "Public Domain" muss generiert sein (oder deine mydressa.de
   Domain zugewiesen).
2. Der Service sollte GRÜN sein und nicht mehr neu starten.
3. Logs sollten zeigen: "Ready on http://0.0.0.0:XXXX" (der Railway-Port),
   NICHT nur "localhost:3000".

## Falls es weiter hängt: Healthcheck
Railway → Service → Settings → Healthcheck Path:
Falls gesetzt auf "/" und die Startseite lange lädt, kann der
Healthcheck fehlschlagen. Dann Healthcheck-Path leeren oder auf
eine schnelle Route setzen.

## Umgebungsvariablen prüfen (wichtig!)
Das Frontend braucht:
  NEXT_PUBLIC_API_URL = https://<deine-api>.up.railway.app/api/v1
Sonst versucht die Website localhost:3001 zu erreichen (klappt nicht
in Produktion). Diese Variable im Railway-Frontend-Service setzen.
