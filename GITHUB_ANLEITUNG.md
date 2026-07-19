# Was ins GitHub-Repo gehört — und was NICHT

## ✅ HOCHLADEN (das ist dein Code)
  apps/api/          → NestJS Backend (Quellcode)
  apps/web/          → Next.js Frontend (Quellcode)
  docker/            → Docker-Konfiguration
  docs/              → Dokumentation
  *.md               → alle Markdown-Dokus
  *.sql              → Migrationen (ALLE_MIGRATIONEN.sql etc.)
  docker-compose.yml
  package.json
  .env.example       → VORLAGE ohne echte Werte (wichtig für andere!)
  .gitignore         → die neue Datei
  package-lock.json  → falls vorhanden (sorgt für gleiche Versionen)

## ❌ NIEMALS HOCHLADEN (durch .gitignore geschützt)
  .env               → ECHTE Secrets (Passwörter, Stripe-Keys, JWT)
  apps/api/.env
  apps/web/.env.local
  node_modules/      → riesig, wird mit "npm install" neu erzeugt
  .next/  dist/  build/  → Build-Ausgaben, neu erzeugbar
  *.log              → Logs
  .DS_Store          → macOS-Müll

## Die wichtigste Regel
NIE eine .env-Datei mit echten Werten committen.
Nur .env.example (mit Platzhaltern) gehört ins Repo.

Wenn jemand dein Repo klont, macht er:
  1. cp apps/api/.env.example apps/api/.env
  2. füllt die echten Werte ein
  3. npm install
  4. npm run dev

## So pushst du sauber
```bash
cd my-dressa
git init
# .gitignore ist schon da → Secrets werden automatisch ignoriert
git add .
git status          # PRÜFEN: taucht KEINE .env auf? Gut.
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN_NAME/my-dressa.git
git push -u origin main
```

## ⚠️ WICHTIG: Vorher prüfen!
Führe VOR dem ersten Push aus:
```bash
git status
```
Wenn dort ".env" oder "apps/api/.env" auftaucht → STOP.
Dann ist die .gitignore nicht aktiv. Prüfe, ob die .gitignore im
Hauptordner (my-dressa/) liegt.

## Falls du schon mal Secrets gepusht hast
Wenn in einem früheren Commit echte Keys stecken, reicht Löschen NICHT —
sie bleiben in der Git-Historie. Dann:
  1. Die Keys bei Stripe/Railway SOFORT neu generieren (die alten sperren)
  2. Historie bereinigen (git filter-repo) oder Repo neu aufsetzen
