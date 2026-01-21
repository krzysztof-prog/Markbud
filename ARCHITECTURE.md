# Architektura Systemu AKROBUD

> Przeglad architektury systemu AKROBUD. Szczegolowa dokumentacja znajduje sie w podlinkowanych dokumentach.

---

## Spis Tresci

| Sekcja | Opis | Link |
|--------|------|------|
| **Tech Stack** | Technologie, monorepo structure, pnpm, Turbo | [tech-stack.md](docs/architecture/tech-stack.md) |
| **Backend** | Layered architecture, warstwy, middleware | [backend.md](docs/architecture/backend.md) |
| **Frontend** | Next.js App Router, features, state management | [frontend.md](docs/architecture/frontend.md) |
| **Database** | Schema bazy danych, modele, relacje | [database.md](docs/architecture/database.md) |
| **API Endpoints** | Lista endpointow API | [api-endpoints.md](docs/architecture/api-endpoints.md) |
| **Integracje** | Schuco, Google Calendar, PDF, File Watcher | [external-integrations.md](docs/architecture/external-integrations.md) |
| **Przeplyw danych** | Request lifecycle, WebSocket | [communication-flow.md](docs/architecture/communication-flow.md) |
| **Bezpieczenstwo** | Auth, authorization, walidacja | [security.md](docs/architecture/security.md) |
| **Decyzje (ADRs)** | Kluczowe decyzje architektoniczne | [decisions.md](docs/architecture/decisions.md) |
| **Wydajnosc** | Performance, monitoring, logging | [performance.md](docs/architecture/performance.md) |

---

## Przeglad Architektury

AKROBUD to monorepo zawierajace:
- **Backend API** (Fastify + Prisma + SQLite)
- **Frontend App** (Next.js 15 + React 19)
- **Shared Packages** (TypeScript types, utils)

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     AKROBUD System                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Frontend   │ ◄─────► │   Backend    │                  │
│  │  (Next.js)   │  HTTP   │  (Fastify)   │                  │
│  │   Port 3000  │  REST   │  Port 3001   │                  │
│  └──────────────┘         └──────┬───────┘                  │
│         │                         │                           │
│         │                  ┌──────▼───────┐                  │
│         │                  │   Database   │                  │
│         │                  │   (SQLite)   │                  │
│         │                  └──────────────┘                  │
│         │                                                     │
│         │                  External Systems:                 │
│         │                  - Schuco Connect (Puppeteer)      │
│         └─────────────────► - Google Calendar API            │
│                            - PDF Generation (PDFKit)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack (skrot)

| Warstwa | Technologie |
|---------|-------------|
| **Backend** | Fastify 4.x + TypeScript + Prisma 5.x (SQLite) + Zod |
| **Frontend** | Next.js 15.5.7 + React 19 + React Query + TailwindCSS + Shadcn/ui |
| **Monorepo** | pnpm workspaces + Turbo |

**Szczegoly:** [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md)

---

## Backend Architecture (skrot)

Wzorzec warstwowy:

```
Routes → Handlers → Services → Repositories → Database
```

| Warstwa | Odpowiedzialnosc |
|---------|------------------|
| Routes | Definicja endpointow, OpenAPI |
| Handlers | HTTP layer, walidacja, response |
| Services | Logika biznesowa, transakcje |
| Repositories | Dostep do bazy (Prisma) |

**Szczegoly:** [docs/architecture/backend.md](docs/architecture/backend.md)

---

## Frontend Architecture (skrot)

Feature-based organization:

```
features/<feature>/
├── api/           # React Query
├── components/    # UI components
├── hooks/         # Custom hooks
└── types/         # TypeScript types
```

**State Management:**
- Server State: React Query
- Client State: useState/useReducer
- URL State: searchParams

**Szczegoly:** [docs/architecture/frontend.md](docs/architecture/frontend.md)

---

## Database Schema (skrot)

**31 tabel** podzielonych na grupy:
- Uzytkownicy (1)
- Profile aluminiowe (3)
- Zlecenia (3)
- Magazyn profili (3)
- Dostawy (3)
- Optymalizacja palet (4)
- Magazyn okuc (8)
- Dostawy Schuco (2)
- Zestawienia miesieczne (3)
- Pozostale (4)

**Szczegoly:** [docs/architecture/database.md](docs/architecture/database.md)

---

## Kluczowe Decyzje Architektoniczne

| ID | Decyzja | Uzasadnienie |
|----|---------|--------------|
| ADR-001 | SQLite | Prostota, plikowa, wystarczajaca wydajnosc |
| ADR-002 | Monorepo | Wspoldzielone typy, atomowe commity |
| ADR-003 | App Router | RSC, lepszy code splitting, future-proof |
| ADR-004 | Optimistic Locking | Zapobieganie lost updates w magazynie |
| ADR-005 | Feature-based | Kolokacja kodu, latwiejsza nawigacja |

**Szczegoly:** [docs/architecture/decisions.md](docs/architecture/decisions.md)

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Production Environment          │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   Next.js    │    │   Fastify    │  │
│  │   (PM2)      │    │   (PM2)      │  │
│  │   Port 5001  │    │   Port 5000  │  │
│  └──────────────┘    └──────┬───────┘  │
│         │                     │          │
│         │              ┌──────▼───────┐ │
│         └─────────────►│   SQLite     │ │
│                        │   (file)     │ │
│                        └──────────────┘ │
└─────────────────────────────────────────┘
```

**Szczegoly deployment:** [docs/deployment/](docs/deployment/)

---

## Dalsze Informacje

### Dokumentacja architektoniczna
- [Tech Stack](docs/architecture/tech-stack.md)
- [Backend Architecture](docs/architecture/backend.md)
- [Frontend Architecture](docs/architecture/frontend.md)
- [Database Schema](docs/architecture/database.md)
- [API Endpoints](docs/architecture/api-endpoints.md)
- [External Integrations](docs/architecture/external-integrations.md)
- [Communication Flow](docs/architecture/communication-flow.md)
- [Security Model](docs/architecture/security.md)
- [Architectural Decisions](docs/architecture/decisions.md)
- [Performance & Monitoring](docs/architecture/performance.md)

### Inne dokumenty
- [Backend Guidelines](.claude/skills/backend-dev-guidelines/)
- [Frontend Guidelines](.claude/skills/frontend-dev-guidelines/)
- [Deployment Guide](docs/deployment/README.md)
- [COMMON_MISTAKES.md](COMMON_MISTAKES.md) - DO/DON'T

---

**Ostatnia aktualizacja:** 2026-01-20
**Wersja dokumentu:** 2.0.0
