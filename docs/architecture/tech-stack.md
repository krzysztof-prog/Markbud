# Tech Stack i Monorepo Structure

> Dokumentacja stosu technologicznego i struktury monorepo projektu AKROBUD.

---

## Stack Technologiczny

| Warstwa | Technologie |
|---------|-------------|
| **Backend** | Fastify 4.x + TypeScript + Prisma 5.x (SQLite) + Zod |
| **Frontend** | Next.js 15.5.7 + React 19 + React Query + TailwindCSS + Shadcn/ui |
| **Monorepo** | pnpm workspaces + Turbo |
| **Real-time** | WebSocket |
| **Dokumenty** | PDFKit (generowanie PDF) |
| **Scraping** | Puppeteer (Schuco Connect) |

---

## High-Level Diagram

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

## Monorepo Structure

```
AKROBUD/
├── apps/
│   ├── api/                    # Backend application
│   │   ├── src/
│   │   │   ├── routes/         # Fastify route definitions
│   │   │   ├── handlers/       # HTTP request handlers
│   │   │   ├── services/       # Business logic layer
│   │   │   ├── repositories/   # Data access layer (Prisma)
│   │   │   ├── validators/     # Zod schemas
│   │   │   ├── middleware/     # Fastify middleware
│   │   │   ├── plugins/        # Fastify plugins (Swagger, WebSocket)
│   │   │   └── utils/          # Utilities & helpers
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   ├── migrations/     # SQL migrations
│   │   │   └── seed.ts         # Database seeding
│   │   ├── uploads/            # Uploaded files (CSV, PDF)
│   │   └── downloads/          # Downloaded files (Schuco)
│   │
│   └── web/                    # Frontend application
│       ├── src/
│       │   ├── app/            # Next.js App Router pages
│       │   ├── components/     # Reusable UI components
│       │   │   ├── ui/         # Shadcn/ui components
│       │   │   ├── layout/     # Layout components
│       │   │   ├── charts/     # Recharts components
│       │   │   └── loaders/    # Loading states
│       │   ├── features/       # Feature-based modules
│       │   │   ├── deliveries/ # Delivery feature
│       │   │   ├── orders/     # Orders feature
│       │   │   ├── warehouse/  # Warehouse feature
│       │   │   └── glass/      # Glass feature
│       │   ├── hooks/          # Custom React hooks
│       │   ├── lib/            # Utilities & helpers
│       │   │   ├── api-client.ts   # API client (fetch wrapper)
│       │   │   └── api.ts          # React Query setup
│       │   └── types/          # TypeScript type definitions
│       └── public/             # Static assets
│
├── packages/
│   └── shared/                 # Shared code
│       └── src/
│           ├── types/          # Shared TypeScript types
│           └── utils/          # Shared utilities
│
├── docs/                       # Documentation
├── .plan/                      # Project plans & backlog
└── .claude/                    # AI configuration
```

---

## Package Manager - pnpm

**pnpm workspaces** - wszystkie dependencies zarzadzane centralnie:

```json
// pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Komendy pnpm

```powershell
# Instalacja dependencies
pnpm install

# Uruchomienie dev servers
pnpm dev              # Backend + Frontend
pnpm dev:api          # Tylko API (port 3001)
pnpm dev:web          # Tylko frontend (port 3000)

# Build
pnpm build            # Build calego projektu
pnpm lint             # Sprawdz kod
```

---

## Turbo - Build System

**Turbo** - parallel builds i caching:

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    }
  }
}
```

### Zalety Turbo

- **Parallel execution** - zadania wykonywane rownolegle
- **Caching** - buildy sa cachowane, ponowne buildy sa szybsze
- **Dependency graph** - automatyczne okreslanie kolejnosci zadan

---

## Zmienne Srodowiskowe

### Backend (apps/api/.env)

```env
DATABASE_URL="file:./prisma/dev.db"
PORT=3001
NODE_ENV=development

# Schuco
SCHUCO_EMAIL=
SCHUCO_PASSWORD=
SCHUCO_BASE_URL=https://connect.schueco.com/schueco/pl/
SCHUCO_HEADLESS=true
```

### Frontend (apps/web/.env)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Powiazane Dokumenty

- [Backend Architecture](./backend.md)
- [Frontend Architecture](./frontend.md)
- [Database Schema](./database.md)
- [Architectural Decisions](./decisions.md)

---

**Ostatnia aktualizacja:** 2026-01-20
