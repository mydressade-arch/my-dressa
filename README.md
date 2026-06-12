# My Dressa — Fashion Marketplace

> Kauf & Vermietung von Kleidung — Marketplace Platform für Deutschland

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + TypeScript |
| Frontend | Next.js + Tailwind CSS |
| Mobile | Flutter |
| Datenbank | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Payments | Stripe Connect |
| Storage | AWS S3 / Cloudflare R2 |
| DevOps | Docker + GitHub Actions |

## Schnellstart

### Voraussetzungen
- Node.js >= 20
- Docker + Docker Compose
- Git

### Setup

```bash
# 1. Repo klonen
git clone https://github.com/your-org/my-dressa.git
cd my-dressa

# 2. Umgebungsvariablen setzen
cp .env.example .env
# .env öffnen und Werte eintragen (Stripe Keys, etc.)

# 3. Services starten
docker-compose up -d

# 4. Dependencies installieren
npm install

# 5. API starten (Dev)
npm run dev:api

# 6. Web starten (Dev)
npm run dev:web
```

### Verfügbare Services
| Service | URL |
|---------|-----|
| API | http://localhost:3001/api/v1 |
| Swagger Docs | http://localhost:3001/docs |
| Web | http://localhost:3000 |
| MailHog (Dev E-Mails) | http://localhost:8025 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## Projektstruktur

```
my-dressa/
├── apps/
│   ├── api/          # NestJS Backend
│   │   └── src/
│   │       ├── auth/           # JWT, Login, Register
│   │       ├── users/          # User + Merchant Profile
│   │       ├── products/       # Produkte, Varianten, Bilder
│   │       ├── rentals/        # Rental Engine, Deposits, Legal
│   │       ├── payments/       # Stripe Connect
│   │       ├── orders/         # Bestellverwaltung
│   │       ├── commissions/    # Provision + Auszahlungen
│   │       ├── notifications/  # E-Mail + Push
│   │       └── admin/          # Admin Dashboard API
│   ├── web/          # Next.js Frontend
│   └── mobile/       # Flutter App
├── packages/
│   ├── shared/       # Gemeinsame Types/Utils
│   ├── ui/           # UI-Komponenten
│   └── config/       # Konfiguration
├── docker/           # Docker-Konfiguration
├── docs/             # Dokumentation
└── .github/          # CI/CD Pipelines
```

## Sprint-Plan

| Sprint | Inhalt | Status |
|--------|--------|--------|
| 0 | Planung, ERD, Architecture | ✅ Fertig |
| 1 | Monorepo + DevOps + Auth | 🔄 Aktiv |
| 2 | Product Module | ⏳ Offen |
| 3 | Rental Engine | ⏳ Offen |
| 4 | Checkout + Payments | ⏳ Offen |
| 5 | Orders + Notifications | ⏳ Offen |
| 6 | Admin Dashboard | ⏳ Offen |
| 7 | Security + DSGVO + Tests | ⏳ Offen |

## Kritische Architektur-Entscheidungen

**Rental Conflict Prevention:** DB-Level Exclusion Constraint mit `btree_gist` Extension + `FOR UPDATE SKIP LOCKED` verhindert Doppelbuchungen race-condition-sicher.

**Kaution:** Stripe Authorization Hold — Geld wird auf Kundenkarte blockiert, aber nicht abgebucht. Freigabe oder Einbehaltung nach Rückgabe.

**Zahlungsfluss:** Escrow-Modell via Stripe Connect — Geld bleibt auf Platform bis Lieferung bestätigt, dann automatischer Transfer minus Provision.

**DSGVO:** Jede Zustimmung wird in `legal_consents` mit Timestamp, IP und Dokumentversion gespeichert.
# my-dressa
