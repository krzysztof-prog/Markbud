# Contributing to AKROBUD

Dziekujemy za zainteresowanie kontrybuacja do projektu AKROBUD! Ten dokument zawiera przeglad procesu rozwoju i wspolpracy.

---

## Spis Tresci

| Dokument | Opis |
|----------|------|
| [Getting Started](docs/contributing/getting-started.md) | Instalacja, setup, pierwsze uruchomienie |
| [Development Workflow](docs/contributing/development-workflow.md) | Proces pracy z kodem |
| [Coding Standards](docs/contributing/coding-standards.md) | TypeScript, Backend, Frontend, Code Style |
| [Git Workflow](docs/contributing/git-workflow.md) | Branching, Commit Convention |
| [Pull Requests](docs/contributing/pull-requests.md) | Tworzenie PR, Code Review |
| [Testing](docs/contributing/testing.md) | Unit, E2E, Coverage |
| [Documentation](docs/contributing/documentation.md) | Gdzie i jak dokumentowac |
| [Issue Reporting](docs/contributing/issue-reporting.md) | Zglaszanie bugow i feature requests |

---

## Quick Start

```bash
# 1. Clone repo
git clone https://github.com/YOUR_USERNAME/akrobud.git
cd akrobud

# 2. Instalacja
pnpm install
pnpm db:generate
pnpm db:migrate

# 3. Uruchomienie
pnpm dev

# 4. Weryfikacja
pnpm type-check
pnpm lint
pnpm test
```

**Szczegoly:** [Getting Started](docs/contributing/getting-started.md)

---

## Workflow w skrocie

```
1. Wybierz Issue       ->  [Development Workflow]
2. Utworz branch       ->  [Git Workflow]
3. Koduj + testy       ->  [Coding Standards] + [Testing]
4. Commit              ->  [Git Workflow]
5. Create PR           ->  [Pull Requests]
6. Code Review         ->  [Pull Requests]
7. Merge!
```

---

## Kluczowe zasady

### Architektura Backend

```
Route -> Handler -> Service -> Repository -> Database
```

### Architektura Frontend

```
features/
  module/
    api/          # API calls
    components/   # React components
    hooks/        # Custom hooks
    types/        # TypeScript types
```

### Commit Convention

```bash
feat(api): dodaj endpoint GET /orders/:id
fix(web): napraw blad w kalendarzu
docs: aktualizuj README
```

**Szczegoly:** [Git Workflow](docs/contributing/git-workflow.md)

---

## Dodatkowe Zasoby

- [ARCHITECTURE.md](ARCHITECTURE.md) - Architektura systemu
- [CLAUDE.md](CLAUDE.md) - Konwencje projektu
- [docs/guides/](docs/guides/) - Development guides
- [Backend Guidelines](.claude/skills/backend-dev-guidelines/)
- [Frontend Guidelines](.claude/skills/frontend-dev-guidelines/)

---

## Kontakt

Pytania? Suggestions?
- Utworz Issue
- Skontaktuj sie z maintainers

---

**Dziekujemy za wklad w projekt AKROBUD!**

---

**Ostatnia aktualizacja:** 2026-01-20
