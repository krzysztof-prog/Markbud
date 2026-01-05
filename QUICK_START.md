# AKROBUD - Quick Start Guide

Przewodnik szybkiego startu dla nowych deweloperów.

## Spis Treści

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [First Run](#first-run)
- [Development Workflow](#development-workflow)
- [Common Commands](#common-commands)
- [Accessing the Application](#accessing-the-application)
- [First Task Tutorial](#first-task-tutorial)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Przed rozpoczęciem upewnij się, że masz zainstalowane:

### Wymagane

| Tool | Minimalna Wersja | Sprawdź | Instalacja |
|------|------------------|---------|------------|
| **Node.js** | 18.0.0 | `node --version` | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 8.0.0 | `pnpm --version` | `npm install -g pnpm` |
| **Git** | 2.30.0 | `git --version` | [git-scm.com](https://git-scm.com/) |

### Opcjonalne (ale zalecane)

- **VS Code** - zalecany editor
  - Extensions: Prisma, ESLint, Prettier, Tailwind CSS IntelliSense
- **Prisma Studio Desktop** - GUI dla bazy danych

---

## Installation

### 1. Clone Repository

```bash
# Sklonuj repozytorium
git clone https://github.com/your-org/akrobud.git
cd akrobud
```

### 2. Install Dependencies

```bash
# Instalacja wszystkich zależności
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

### 3. Environment Variables

#### Backend (.env)

```bash
# Skopiuj przykładowy plik
cp apps/api/.env.example apps/api/.env

# Edytuj jeśli potrzeba (domyślne wartości są OK dla dev)
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

#### Frontend (.env.local)

```bash
# Skopiuj przykładowy plik
cp apps/web/.env.example apps/web/.env.local
```

**apps/web/.env.local:**
```bash
# API URL
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 4. Database Setup

```bash
# Generuj Prisma Client
pnpm db:generate

# Uruchom migracje
pnpm db:migrate

# Seed database (opcjonalnie - dodaje przykładowe dane)
pnpm db:seed
```

**Co się dzieje:**
1. `db:generate` - generuje TypeScript types z Prisma schema
2. `db:migrate` - tworzy bazę SQLite i stosuje migrations
3. `db:seed` - dodaje przykładowe profile, kolory, users

**Oczekiwany output:**
```
✓ Generated Prisma Client
✓ Applied 15 migrations
✓ Seeded database with 50 profiles, 10 colors, 1 user
```

---

## First Run

### Start Development Servers

#### Opcja 1: Wszystkie aplikacje (zalecane)

```bash
pnpm dev
```

To uruchomi:
- **Backend API** - http://localhost:3001
- **Frontend App** - http://localhost:3000

#### Opcja 2: Osobno (do debugowania)

```bash
# Terminal 1 - Backend
pnpm dev:api

# Terminal 2 - Frontend
pnpm dev:web
```

### Sprawdź czy działa

**Backend:**
```bash
curl http://localhost:3001/health
# Powinno zwrócić: {"status":"ok","timestamp":"2025-12-30T10:00:00.000Z"}
```

**Frontend:**
- Otwórz http://localhost:3000
- Powinieneś zobaczyć dashboard

---

## Accessing the Application

### URLs

| Aplikacja | URL | Opis |
|-----------|-----|------|
| **Frontend** | http://localhost:3000 | Główna aplikacja (Next.js) |
| **Backend API** | http://localhost:3001 | Fastify API |
| **Swagger Docs** | http://localhost:3001/docs | API documentation |
| **Prisma Studio** | `pnpm db:studio` | Database GUI |

### Login (jeśli jest auth)

Po seed database dostępne są:
- **Username:** `admin`
- **Password:** `admin123`

_(Zmień to w production!)_

---

## Development Workflow

### Typowy dzień pracy

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
pnpm install

# 3. Apply any new migrations
pnpm db:migrate

# 4. Start dev servers
pnpm dev

# 5. Podczas pracy - sprawdzaj często:
pnpm type-check   # TypeScript errors
pnpm lint         # Linting issues
pnpm test         # Unit tests

# 6. Przed commitem:
pnpm lint:fix     # Auto-fix linting
git add .
git commit -m "feat: opis zmiany"
git push
```

### File Watching

Development servers mają hot-reload:
- **Backend:** Auto-restart na zmiany w `apps/api/src/`
- **Frontend:** Hot Module Replacement (HMR) na zmiany w `apps/web/src/`

---

## Common Commands

### Development

```bash
pnpm dev              # Start all apps
pnpm dev:api          # Backend only
pnpm dev:web          # Frontend only
```

### Database

```bash
pnpm db:migrate       # Create/apply migrations
pnpm db:generate      # Generate Prisma Client
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:reset         # Reset database (⚠️ kasuje dane!)
```

### Testing

```bash
pnpm test             # Unit tests
pnpm test:watch       # Tests in watch mode
pnpm test:coverage    # With coverage report
pnpm test:e2e         # E2E tests (Playwright)
pnpm test:e2e:ui      # E2E with UI
```

### Code Quality

```bash
pnpm lint             # Check linting
pnpm lint:fix         # Auto-fix linting issues
pnpm type-check       # TypeScript type checking
pnpm format           # Format code (Prettier)
```

### Build

```bash
pnpm build            # Build all apps for production
pnpm build:api        # Build backend only
pnpm build:web        # Build frontend only
```

### Cleanup

```bash
pnpm clean            # Remove node_modules, dist, .next
pnpm clean:cache      # Clear all caches
```

---

## First Task Tutorial

Zróbmy prostą zmianę żeby nauczyć się workflow:

### Zadanie: Dodaj pole "notes" do Order

#### 1. Update Database Schema

**apps/api/prisma/schema.prisma:**
```prisma
model Order {
  id          String   @id @default(uuid())
  orderNumber String   @unique
  // ... inne pola ...
  notes       String?  // ← DODAJ TO POLE
}
```

#### 2. Create Migration

```bash
pnpm db:migrate
# Wpisz nazwę: "add_notes_to_order"
```

#### 3. Update TypeScript Types

Backend Prisma Client auto-update się po `db:generate`, ale frontend needs update:

**apps/web/src/types/order.ts:**
```typescript
export interface Order {
  id: string;
  orderNumber: string;
  // ... inne pola ...
  notes?: string; // ← DODAJ TO POLE
}
```

#### 4. Update Backend Validator

**apps/api/src/validators/order.ts:**
```typescript
export const createOrderSchema = z.object({
  orderNumber: z.string(),
  // ... inne pola ...
  notes: z.string().optional(), // ← DODAJ TO POLE
});
```

#### 5. Update Frontend Form

**apps/web/src/features/orders/components/OrderForm.tsx:**
```tsx
<FormField
  control={form.control}
  name="notes"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Notatki</FormLabel>
      <FormControl>
        <Textarea {...field} />
      </FormControl>
    </FormItem>
  )}
/>
```

#### 6. Test

```bash
# Sprawdź TypeScript
pnpm type-check

# Test w aplikacji
pnpm dev
# Przejdź do http://localhost:3000/zlecenia/nowe
# Sprawdź czy pole "Notatki" się pojawia
```

#### 7. Commit

```bash
git add .
git commit -m "feat(orders): dodaj pole notes do zleceń"
git push
```

**Gratulacje!** Zrobiłeś swoją pierwszą zmianę 🎉

---

## Troubleshooting

### Problem: `pnpm: command not found`

**Rozwiązanie:**
```bash
npm install -g pnpm
```

---

### Problem: Port 3000/3001 already in use

**Rozwiązanie:**
```bash
# Zabij procesy na portach
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

Lub zmień port w `.env` files.

---

### Problem: Database migration failed

**Rozwiązanie:**
```bash
# Reset database (⚠️ kasuje dane!)
pnpm db:reset

# Lub ręcznie:
rm apps/api/prisma/dev.db
pnpm db:migrate
pnpm db:seed
```

---

### Problem: TypeScript errors po instalacji

**Rozwiązanie:**
```bash
# Regeneruj Prisma Client
pnpm db:generate

# Clear cache
rm -rf apps/web/.next
rm -rf apps/api/dist

# Restart TS Server w VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

### Problem: Frontend shows "API connection error"

**Sprawdź:**
1. Backend działa? (`curl http://localhost:3001/health`)
2. Poprawny `NEXT_PUBLIC_API_URL` w `apps/web/.env.local`?
3. CORS issues? (Sprawdź console w DevTools)

**Rozwiązanie:**
```bash
# Restart dev servers
pnpm dev
```

---

### Problem: Playwright tests fail

**Rozwiązanie:**
```bash
# Install browsers
pnpm exec playwright install

# Update Playwright
pnpm add -D @playwright/test@latest
```

---

### Problem: `MODULE_NOT_FOUND` errors

**Rozwiązanie:**
```bash
# Reinstall dependencies
rm -rf node_modules
rm -rf apps/*/node_modules
pnpm install
```

---

### Problem: Slow dev server

**Optymalizacje:**
1. **Next.js cache:**
   ```bash
   rm -rf apps/web/.next
   ```

2. **Node memory:**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

3. **Turbo cache:**
   ```bash
   rm -rf .turbo
   ```

---

## Dalsze Kroki

Teraz gdy masz działające środowisko:

1. **Przeczytaj dokumentację:**
   - [ARCHITECTURE.md](ARCHITECTURE.md) - Architektura systemu
   - [CONTRIBUTING.md](CONTRIBUTING.md) - Guidelines
   - [CLAUDE.md](CLAUDE.md) - Konwencje projektu

2. **Explore codebase:**
   - Backend: `apps/api/src/`
   - Frontend: `apps/web/src/`
   - Database: `apps/api/prisma/schema.prisma`

3. **Weź pierwszy task:**
   ```bash
   bd list
   bd show <task-id>
   ```

4. **Join the team:**
   - Pytania? Stwórz Issue
   - Sugestie? Pull Request
   - Need help? Skontaktuj się z team

---

## Przydatne Linki

- [Dokumentacja API](docs/API_DOCUMENTATION.md)
- [Dokumentacja Frontend](docs/FRONTEND_DOCUMENTATION.md)
- [Backend Guidelines](.claude/skills/backend-dev-guidelines/)
- [Frontend Guidelines](.claude/skills/frontend-dev-guidelines/)
- [Anti-patterns](docs/guides/anti-patterns.md)

---

**Powodzenia!** 🚀

Masz pytania? Zobacz [CONTRIBUTING.md](CONTRIBUTING.md) lub utwórz Issue.

---

**Ostatnia aktualizacja:** 2025-12-30
