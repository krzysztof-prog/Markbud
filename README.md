# AKROBUD - System ERP dla Produkcji Okien Aluminiowych

System zarządzania produkcją okien aluminiowych, magazynem profili, dostawami i okuciami.

## Quick Start

### Wymagania
- Node.js 18+
- pnpm

### Instalacja i uruchomienie

```bash
# Instalacja zależności
pnpm install

# Uruchomienie w trybie deweloperskim
pnpm dev

# Lub osobno:
pnpm dev:api    # Backend (Fastify) - http://localhost:3001
pnpm dev:web    # Frontend (Next.js) - http://localhost:3000

# Baza danych
pnpm db:migrate    # Migracje
pnpm db:generate   # Generowanie klienta Prisma
pnpm db:seed       # Dane początkowe
pnpm db:studio     # Prisma Studio
```

## Struktura Projektu

```
Markbud/
├── apps/
│   ├── api/              # Backend Fastify + Prisma
│   │   ├── src/
│   │   │   ├── routes/       # Endpointy API
│   │   │   ├── handlers/     # Obsługa requestów
│   │   │   ├── services/     # Logika biznesowa
│   │   │   └── repositories/ # Dostęp do bazy
│   │   └── prisma/           # Schema i migracje
│   └── web/              # Frontend Next.js + React
│       └── src/
│           ├── app/          # Strony (App Router)
│           ├── components/   # Komponenty UI
│           ├── features/     # Moduły funkcjonalne
│           └── lib/          # Utilities
│
├── docs/                 # Dokumentacja techniczna
│   ├── architecture/     # Architektura systemu
│   ├── guides/           # Przewodniki deweloperskie
│   ├── features/         # Dokumentacja funkcjonalności
│   └── user-guides/      # Instrukcje dla użytkowników
│
├── .plan/                # Plany rozwoju i backlog
└── dev/                  # Dokumentacja aktywnej pracy
```

## Tech Stack

### Backend
- **Fastify** - Framework HTTP
- **Prisma** - ORM dla SQLite
- **Zod** - Walidacja schematów
- **TypeScript**

### Frontend
- **Next.js 15** - Framework React (App Router)
- **TailwindCSS** + **Shadcn/ui** - Styling
- **React Query** - Zarządzanie stanem serwera
- **React Hook Form** - Formularze
- **TanStack Table** - Tabele danych

## Główne Moduły

| Moduł | Opis |
|-------|------|
| **Zlecenia** | Zarządzanie zleceniami produkcyjnymi |
| **Dostawy** | Planowanie dostaw i optymalizacja palet |
| **Magazyn** | Stan magazynowy profili aluminiowych |
| **Okucia** | Magazyn okuć okiennych |
| **Schuco** | Integracja z Schuco Connect |
| **Raporty** | Eksporty PDF, raporty miesięczne |

## Dokumentacja

### Architektura
- [Struktura bazy danych](docs/architecture/database.md)
- [Endpointy API](docs/architecture/api-endpoints.md)

### Przewodniki deweloperskie
- [Transakcje Prisma](docs/guides/transactions.md)
- [Operacje odwrotne](docs/guides/reverse-operations.md)
- [Antypatterns - czego unikać](docs/guides/anti-patterns.md)

### Funkcjonalności
- [Moduł dostaw](docs/features/deliveries.md)
- [Raporty i eksporty](docs/features/reports.md)

### Dla użytkowników
- [Instrukcja Schuco](docs/user-guides/schuco.md)

## Dla Deweloperów

Przed rozpoczęciem pracy przeczytaj [CLAUDE.md](CLAUDE.md) zawierający:
- Konwencje kodu
- Strukturę katalogów
- Dostępne komendy
- Ważne zasady

### Skills dla Claude Code
- `backend-dev-guidelines` - Dokumentacja backendu
- `frontend-dev-guidelines` - Dokumentacja frontendu

## Issue Tracking

Projekt używa [Beads](https://github.com/steveyegge/beads) do śledzenia zadań:

```bash
bd list          # Lista zadań
bd create "..."  # Nowe zadanie
bd show <id>     # Szczegóły
```

## Licencja

Proprietary - AKROBUD
