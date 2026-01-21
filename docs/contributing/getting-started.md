# Getting Started - Rozpoczecie Pracy

Ten dokument opisuje jak przygotowac srodowisko do pracy z projektem AKROBUD.

---

## Prerequisites

Wymagane oprogramowanie:
- **Node.js** 18+ (zalecane 20 LTS)
- **pnpm** 8+ (package manager)
- **Git** 2.30+

---

## Fork & Clone

```bash
# Fork repozytorium na GitHubie
# Nastepnie sklonuj lokalnie:

git clone https://github.com/YOUR_USERNAME/akrobud.git
cd akrobud
```

---

## Instalacja

```bash
# Instalacja zaleznosci
pnpm install

# Generowanie Prisma client
pnpm db:generate

# Uruchomienie migracji
pnpm db:migrate

# Seed database (opcjonalnie)
pnpm db:seed
```

---

## Uruchomienie Development Server

```bash
# Wszystkie aplikacje
pnpm dev

# Lub osobno:
pnpm dev:api    # Backend (http://localhost:3001)
pnpm dev:web    # Frontend (http://localhost:3000)
```

---

## Weryfikacja Setupu

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Testy
pnpm test
```

Jesli wszystko dziala - gotowe do pracy!

---

## Nastepne Kroki

- [Development Workflow](./development-workflow.md) - Jak pracowac z kodem
- [Coding Standards](./coding-standards.md) - Standardy kodowania
- [Git Workflow](./git-workflow.md) - Praca z Git

---

**Powrot do:** [CONTRIBUTING](../../CONTRIBUTING.md)
