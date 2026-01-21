# First Run

Pierwsze uruchomienie aplikacji i weryfikacja instalacji.

## Start Development Servers

### Opcja 1: Wszystkie aplikacje (zalecane)

```bash
pnpm dev
```

To uruchomi:
- **Backend API** - http://localhost:3001
- **Frontend App** - http://localhost:3000

### Opcja 2: Osobno (do debugowania)

```bash
# Terminal 1 - Backend
pnpm dev:api

# Terminal 2 - Frontend
pnpm dev:web
```

## Sprawdz czy dziala

### Backend

```bash
curl http://localhost:3001/health
# Powinno zwrocic: {"status":"ok","timestamp":"2025-12-30T10:00:00.000Z"}
```

### Frontend

- Otworz http://localhost:3000
- Powinienes zobaczyc dashboard

## Accessing the Application

### URLs

| Aplikacja | URL | Opis |
|-----------|-----|------|
| **Frontend** | http://localhost:3000 | Glowna aplikacja (Next.js) |
| **Backend API** | http://localhost:3001 | Fastify API |
| **Swagger Docs** | http://localhost:3001/docs | API documentation |
| **Prisma Studio** | `pnpm db:studio` | Database GUI |

### Login (jesli jest auth)

Po seed database dostepne sa:
- **Username:** `admin`
- **Password:** `admin123`

_(Zmien to w production!)_

---

**Nastepny krok:** [Development Workflow](./04-development-workflow.md)

[Powrot do indeksu](../../QUICK_START.md)
