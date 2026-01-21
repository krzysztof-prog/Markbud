# Installation

Przewodnik instalacji projektu AKROBUD.

## 1. Clone Repository

```bash
# Sklonuj repozytorium
git clone https://github.com/your-org/akrobud.git
cd akrobud
```

## 2. Install Dependencies

```bash
# Instalacja wszystkich zaleznosci
pnpm install
```

To zainstaluje dependencies dla:
- `apps/api` (Backend)
- `apps/web` (Frontend)
- `packages/shared` (Shared utilities)

**Oczekiwany output:**
```
✓ Installing dependencies...
✓ Installing Playwright browsers...
Done in 45s
```

## 3. Environment Variables

### Backend (.env)

```bash
# Skopiuj przykladowy plik
cp apps/api/.env.example apps/api/.env

# Edytuj jesli potrzeba (domyslne wartosci sa OK dla dev)
nano apps/api/.env
```

**apps/api/.env:**
```bash
# Database
DATABASE_URL="file:./prisma/dev.db"

# JWT
JWT_SECRET="dev-secret-change-in-production"

# Server
PORT=3001
NODE_ENV="development"

# Schuco (opcjonalne dla dev)
SCHUCO_USERNAME=""
SCHUCO_PASSWORD=""

# Google Calendar (opcjonalne)
GOOGLE_CALENDAR_API_KEY=""
```

### Frontend (.env.local)

```bash
# Skopiuj przykladowy plik
cp apps/web/.env.example apps/web/.env.local
```

**apps/web/.env.local:**
```bash
# API URL
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## 4. Database Setup

```bash
# Generuj Prisma Client
pnpm db:generate

# Uruchom migracje
pnpm db:migrate

# Seed database (opcjonalnie - dodaje przykladowe dane)
pnpm db:seed
```

**Co sie dzieje:**
1. `db:generate` - generuje TypeScript types z Prisma schema
2. `db:migrate` - tworzy baze SQLite i stosuje migrations
3. `db:seed` - dodaje przykladowe profile, kolory, users

**Oczekiwany output:**
```
✓ Generated Prisma Client
✓ Applied 15 migrations
✓ Seeded database with 50 profiles, 10 colors, 1 user
```

---

**Nastepny krok:** [Pierwsze uruchomienie](./03-first-run.md)

[Powrot do indeksu](../../QUICK_START.md)
