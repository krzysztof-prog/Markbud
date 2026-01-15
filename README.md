# AKROBUD - System ERP dla Produkcji Okien Aluminiowych

System zarządzania produkcją okien aluminiowych, magazynem profili, dostawami i okuciami.

---

## 🚀 Quick Start

### Wymagania
- **Node.js 18+**
- **pnpm** (NIGDY npm/yarn!)
- **Windows 10** (natywny, bez WSL)
- **VS Code** (zalecany)

### Instalacja i uruchomienie

```powershell
# Instalacja zależności
pnpm install

# Migracje bazy danych
pnpm db:migrate
pnpm db:generate

# Uruchomienie w trybie deweloperskim
pnpm dev

# Lub osobno:
pnpm dev:api    # Backend (Fastify) - http://localhost:3001
pnpm dev:web    # Frontend (Next.js) - http://localhost:3000
```

### Podstawowe komendy

```powershell
# Database
pnpm db:migrate    # Migracje (NIGDY db:push!)
pnpm db:generate   # Generowanie klienta Prisma
pnpm db:seed       # Dane testowe
pnpm db:studio     # Prisma Studio (GUI)

# Build
pnpm build         # Build całego projektu
pnpm lint          # Sprawdź kod

# Testing
pnpm test          # Wszystkie testy
pnpm test:unit     # Tylko unit tests
pnpm test:coverage # Testy z pokryciem

# Porty / Cleanup
pnpm kill          # Zabij serwery dev (porty 3000/3001)

# Czyszczenie cache (gdy coś nie działa)
Remove-Item -Recurse -Force apps/web/.next
pnpm install
```

---

## 📂 Struktura Projektu

```
AKROBUD/
├── apps/
│   ├── api/                  # Backend Fastify + Prisma
│   │   ├── src/
│   │   │   ├── routes/       # Endpointy API
│   │   │   ├── handlers/     # Obsługa HTTP
│   │   │   ├── services/     # Logika biznesowa
│   │   │   ├── repositories/ # Dostęp do bazy
│   │   │   ├── validators/   # Zod schemas
│   │   │   └── utils/        # money.ts, logger, errors
│   │   └── prisma/           # Schema (44 modele) + migracje
│   │
│   └── web/                  # Frontend Next.js + React
│       └── src/
│           ├── app/          # Strony (App Router)
│           ├── features/     # Moduły funkcjonalne (deliveries, orders...)
│           ├── components/   # UI components (Shadcn/ui)
│           └── lib/          # Utils, API client
│
├── docs/                     # 📚 DOKUMENTACJA - ZACZNIJ TUTAJ!
│   ├── architecture/         # Architektura, baza, API
│   ├── guides/               # Przewodniki deweloperskie
│   ├── features/             # Dokumentacja modułów
│   ├── user-guides/          # Dla użytkowników końcowych
│   ├── reviews/              # Audyty i raporty
│   └── CLAUDE_COMMUNICATION.md  # Jak Claude ma rozmawiać
│
├── CLAUDE.md                 # Kontekst projektu dla Claude
├── COMMON_MISTAKES.md        # DO/DON'T - PRZECZYTAJ PRZED KODOWANIEM!
├── LESSONS_LEARNED.md        # Błędy z historii projektu
└── ARCHITECTURE.md           # Ogólna architektura systemu
```

---

## 🏗️ Tech Stack

### Backend
- **Fastify 4.x** - Framework HTTP (szybki i lekki)
- **Prisma 5.x** - ORM dla SQLite
- **Zod** - Walidacja schematów
- **TypeScript** - Strict mode
- **Vitest** - Testy jednostkowe

### Frontend
- **Next.js 15.5.7** - Framework React (App Router)
- **TailwindCSS** + **Shadcn/ui** - Styling (Radix UI)
- **React Query v5** - Zarządzanie stanem serwera
- **React Hook Form** - Formularze z walidacją
- **TanStack Table v8** - Tabele danych

### Narzędzia
- **pnpm workspaces** - Monorepo manager
- **ESLint** - Linter
- **Prettier** - Code formatter (opcjonalnie)

### Testing
- **Vitest** - Unit tests, integration tests
- **@faker-js/faker** - Generowanie danych testowych
- **Playwright** - E2E tests (opcjonalnie)

---

## 🧪 Testing

### Uruchamianie testów

```powershell
# Wszystkie testy
pnpm test

# Unit tests z watch mode
pnpm test:unit

# Testy z coverage report
pnpm test:coverage

# Testy tylko API
pnpm --filter @akrobud/api test
```

### Struktura testów

```
apps/api/
├── src/
│   ├── handlers/
│   │   └── deliveryHandler.test.ts   # Unit tests handlerów
│   ├── services/
│   │   └── deliveryService.test.ts   # Unit tests serwisów
│   ├── repositories/
│   │   └── OrderRepository.test.ts   # Repository tests
│   └── tests/
│       ├── fixtures/                 # Test fixtures
│       ├── mocks/                    # Mock helpers
│       └── utils/                    # Test utilities
```

### Konwencje

- Nazwa pliku: `*.test.ts` (obok testowanego pliku)
- Używaj fixtures zamiast tworzenia danych inline
- Mockuj Prisma przez `prisma.mock.ts`
- Unikaj testów integracyjnych które dotykają bazy (chyba że konieczne)

**Więcej:** [docs/guides/vitest-testing-patterns.md](docs/guides/vitest-testing-patterns.md)

---

## 🧩 Główne Moduły Systemu

| Moduł | Opis | Dokumentacja |
|-------|------|--------------|
| **Zlecenia** | Zarządzanie zleceniami produkcyjnymi okien | [docs/features/orders/](docs/features/orders/) |
| **Dostawy** | Planowanie dostaw profili + optymalizacja palet | [docs/features/deliveries.md](docs/features/deliveries.md) |
| **Magazyn** | Stan magazynowy profili aluminiowych | [docs/features/warehouse/](docs/features/warehouse/) |
| **Szyby** | Zamówienia i dostawy szyb (import PDF) | [docs/features/glass/](docs/features/glass/) |
| **Schuco** | Integracja z Schuco Connect (Puppeteer) | [docs/user-guides/schuco.md](docs/user-guides/schuco.md) |
| **Raporty** | Eksporty PDF, raporty miesięczne | [docs/features/reports.md](docs/features/reports.md) |

---

## 📚 Dokumentacja

### 🎯 Dla deweloperów (ZACZNIJ TUTAJ!)

| Dokument | Przeznaczenie |
|----------|---------------|
| **[CLAUDE.md](CLAUDE.md)** | Kontekst projektu dla Claude - **PRZECZYTAJ NAJPIERW!** |
| **[COMMON_MISTAKES.md](COMMON_MISTAKES.md)** | DO/DON'T - częste błędy |
| **[LESSONS_LEARNED.md](LESSONS_LEARNED.md)** | Błędy z historii - nie powtarzaj! |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Ogólna architektura systemu |
| **[docs/CLAUDE_COMMUNICATION.md](docs/CLAUDE_COMMUNICATION.md)** | Jak Claude ma się komunikować |

### 🏛️ Architektura

- [Struktura bazy danych](docs/architecture/database.md) - Prisma schema, modele
- [Endpointy API](docs/architecture/api-endpoints.md) - Lista wszystkich endpoints

### 📖 Przewodniki deweloperskie

- [Workflow pracy](docs/guides/development-workflow.md) - Jak pracować z projektem
- [Anti-patterns](docs/guides/anti-patterns.md) - **Czego unikać** (WAŻNE!)
- [Transakcje Prisma](docs/guides/transactions.md) - Jak używać `$transaction`
- [Operacje odwrotne](docs/guides/reverse-operations.md) - Undo/rollback patterns

### 🎨 Funkcjonalności

- [Moduł dostaw](docs/features/deliveries.md)
- [Moduł zleceń](docs/features/orders/)
- [Magazyn profili](docs/features/warehouse/)
- [Zamówienia szyb](docs/features/glass/)
- [Import danych](docs/features/imports/)

### 👥 Dla użytkowników końcowych

- [Pierwsze kroki](docs/user-guides/getting-started.md)
- [Jak pracować z dostawami](docs/user-guides/deliveries.md)
- [Jak pracować ze zleceniami](docs/user-guides/orders.md)
- [Integracja Schuco](docs/user-guides/schuco.md)
- [Rozwiązywanie problemów](docs/user-guides/troubleshooting.md)

### 📊 Audyty i raporty

- [**Najnowszy audyt (2026-01-02)**](docs/reviews/COMPREHENSIVE_AUDIT_REPORT_2026-01-02.md)
- [Raport zgodności ze standardami](docs/RAPORT_ZGODNOSCI_SKILLAMI_2025-12-31.md)

---

## 🎓 Dla Claude Code

### Skills dostępne
- **`backend-dev-guidelines`** - Standardy backendu (Routes → Handlers → Services → Repos)
- **`frontend-dev-guidelines`** - Standardy frontendu (React, Next.js, TailwindCSS)

### Przed rozpoczęciem pracy:
1. ✅ Przeczytaj [CLAUDE.md](CLAUDE.md) - kontekst projektu
2. ✅ Przeczytaj [COMMON_MISTAKES.md](COMMON_MISTAKES.md) - DO/DON'T
3. ✅ Przeczytaj [LESSONS_LEARNED.md](LESSONS_LEARNED.md) - błędy z historii
4. ✅ Aktywuj odpowiedni skill (backend/frontend)
5. ✅ Sprawdź [docs/guides/anti-patterns.md](docs/guides/anti-patterns.md)

### Zasady komunikacji:
- Rozmawiasz **PO POLSKU**
- Kod **PO ANGIELSKU**, komentarze **PO POLSKU**
- Komunikaty użytkownika **PO POLSKU**
- **Pytaj zamiast zakładać** - szczególnie o biznes/UX
- **Pokazuj opcje** (szybkie vs lepsze)
- **Wyjaśniaj konsekwencje** decyzji

**Pełne zasady:** [docs/CLAUDE_COMMUNICATION.md](docs/CLAUDE_COMMUNICATION.md)

---

## 🔴 Krytyczne zasady (z audytu)

### ⚠️ NIGDY nie rób tego:

1. **Operacje na pieniądzach bez `money.ts`**
   ```typescript
   // ❌ BŁĄD
   const total = parseFloat(order.valuePln);

   // ✅ ZAWSZE
   import { groszeToPln } from './utils/money';
   const total = groszeToPln(order.valuePln as Grosze);
   ```

2. **Hard delete** - ZAWSZE używaj soft delete (`deletedAt`)
3. **Import bez raportowania błędów** - zbieraj errors[], pokazuj użytkownikowi
4. **Buttony bez `disabled={isPending}`** - podczas mutacji
5. **`db:push`** - NIGDY! Zawsze `db:migrate` (push kasuje dane!)

**Pełna lista:** [COMMON_MISTAKES.md](COMMON_MISTAKES.md)

---

## 🛠️ Typowe problemy

### "pnpm dev nie działa"
```powershell
pnpm install
pnpm db:generate
# Sprawdź czy porty 3000/4000 są wolne
```

### "Błąd TypeScript w frontend"
```powershell
Remove-Item -Recurse -Force apps/web/.next
pnpm db:generate
# Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### "Migracja Prisma conflict"
- NIE używaj `db:push` (kasuje dane!)
- Przeczytaj UWAŻNIE błąd migracji
- Może trzeba ręcznie edytować plik migracji

**Więcej:** [docs/user-guides/troubleshooting.md](docs/user-guides/troubleshooting.md)

---

## 📊 Skala projektu

- **Użytkownicy:** 5-10 jednocześnie
- **Zleceń rocznie:** 2000-3000 (~200-250/miesiąc)
- **Okucia na zlecenie:** średnio 20 pozycji
- **Baza danych:** SQLite (wystarczająca dla tej skali)
- **Wzrost:** Nie planowany (stabilna skala)

---

## 🔗 Linki szybkie

| Potrzebujesz | Zobacz |
|--------------|--------|
| Jak zacząć? | **Ten plik (README.md)** |
| Kontekst dla Claude? | [CLAUDE.md](CLAUDE.md) |
| Czego unikać? | [COMMON_MISTAKES.md](COMMON_MISTAKES.md) |
| Błędy z przeszłości? | [LESSONS_LEARNED.md](LESSONS_LEARNED.md) |
| Architektura? | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Problem techniczny? | [docs/user-guides/troubleshooting.md](docs/user-guides/troubleshooting.md) |
| Wszystkie dokumenty? | [docs/](docs/) |

---

## 📝 Contributing

Przed dodaniem kodu:
- [ ] Przeczytaj [CLAUDE.md](CLAUDE.md)
- [ ] Sprawdź [COMMON_MISTAKES.md](COMMON_MISTAKES.md)
- [ ] Sprawdź [LESSONS_LEARNED.md](LESSONS_LEARNED.md)
- [ ] Aktywuj odpowiedni skill (backend/frontend)
- [ ] Code review przez [docs/guides/anti-patterns.md](docs/guides/anti-patterns.md)

---

## 📞 Support

- **Dokumentacja:** [docs/](docs/)
- **Troubleshooting:** [docs/user-guides/troubleshooting.md](docs/user-guides/troubleshooting.md)
- **Issues:** Użyj [Beads](https://github.com/steveyegge/beads)

---

## 📜 Licencja

**Proprietary** - AKROBUD

---

**Ostatnia aktualizacja:** 2026-01-05
**Wersja:** 1.0.0 (production-ready)
