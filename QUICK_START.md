# AKROBUD - Quick Start Guide

Przewodnik szybkiego startu dla nowych deweloperow.

## Spis Tresci

| Sekcja | Opis | Link |
|--------|------|------|
| **Prerequisites** | Wymagane narzedzia i weryfikacja instalacji | [01-prerequisites.md](docs/quick-start/01-prerequisites.md) |
| **Installation** | Klonowanie repo, instalacja zaleznosci, konfiguracja | [02-installation.md](docs/quick-start/02-installation.md) |
| **First Run** | Pierwsze uruchomienie i weryfikacja | [03-first-run.md](docs/quick-start/03-first-run.md) |
| **Development Workflow** | Typowy dzien pracy, konwencje commitow | [04-development-workflow.md](docs/quick-start/04-development-workflow.md) |
| **Common Commands** | Najczesciej uzywane komendy | [05-common-commands.md](docs/quick-start/05-common-commands.md) |
| **First Task Tutorial** | Praktyczny tutorial - dodanie pola do modelu | [06-first-task-tutorial.md](docs/quick-start/06-first-task-tutorial.md) |
| **Troubleshooting** | Rozwiazania najczestszych problemow | [07-troubleshooting.md](docs/quick-start/07-troubleshooting.md) |

---

## Szybki Start (5 minut)

```bash
# 1. Clone
git clone https://github.com/your-org/akrobud.git
cd akrobud

# 2. Install
pnpm install

# 3. Setup environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 4. Database
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. Run
pnpm dev
```

Otworz http://localhost:3000 - powinienes zobaczyc dashboard.

---

## URLs

| Aplikacja | URL |
|-----------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/docs |
| Prisma Studio | `pnpm db:studio` |

---

## Najwazniejsze komendy

```bash
pnpm dev           # Uruchom projekt
pnpm db:studio     # GUI bazy danych
pnpm type-check    # Sprawdz typy TypeScript
pnpm lint:fix      # Napraw linting
pnpm test          # Uruchom testy
```

---

## Dalsze Kroki

Teraz gdy masz dzialajace srodowisko:

1. **Przeczytaj dokumentacje:**
   - [ARCHITECTURE.md](ARCHITECTURE.md) - Architektura systemu
   - [CONTRIBUTING.md](CONTRIBUTING.md) - Guidelines
   - [CLAUDE.md](CLAUDE.md) - Konwencje projektu

2. **Explore codebase:**
   - Backend: `apps/api/src/`
   - Frontend: `apps/web/src/`
   - Database: `apps/api/prisma/schema.prisma`

3. **Wez pierwszy task:**
   - Przeczytaj [First Task Tutorial](docs/quick-start/06-first-task-tutorial.md)

---

## Przydatne Linki

- [Dokumentacja API](docs/API_DOCUMENTATION.md)
- [Dokumentacja Frontend](docs/FRONTEND_DOCUMENTATION.md)
- [Backend Guidelines](.claude/skills/backend-dev-guidelines/)
- [Frontend Guidelines](.claude/skills/frontend-dev-guidelines/)
- [Anti-patterns](docs/guides/anti-patterns.md)
- [Troubleshooting](docs/quick-start/07-troubleshooting.md)

---

**Masz pytania?** Zobacz [CONTRIBUTING.md](CONTRIBUTING.md) lub utworz Issue.

---

**Ostatnia aktualizacja:** 2026-01-20
