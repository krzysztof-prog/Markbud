# Architectural Decisions (ADRs)

> Dokumentacja kluczowych decyzji architektonicznych projektu AKROBUD.

---

## ADR-001: SQLite vs PostgreSQL

**Status:** Zaakceptowany

**Kontekst:**
Potrzebujemy bazy danych dla aplikacji. Rozważane opcje:
- SQLite (plikowa)
- PostgreSQL (server-based)

**Decyzja:** SQLite

**Uzasadnienie:**
- Mala/srednia skala wdrozenia (pojedyncza lokalizacja)
- Prostota (brak serwera bazy danych)
- Plikowa (latwy backup - wystarczy skopiowac plik)
- Wystarczajaca wydajnosc dla obciazenia (5-10 uzytkownikow)

**Trade-offs:**
- Ograniczone rownolegle zapisy
- Brak wbudowanej replikacji
- Ograniczone mozliwosci skalowania

**Konsekwencje:**
- Backup: Regularne kopiowanie pliku `dev.db` / `prod.db`
- Migracje: `prisma migrate` (nie `db push`!)
- Optimistic locking dla concurrent updates

---

## ADR-002: Monorepo vs Separate Repos

**Status:** Zaakceptowany

**Kontekst:**
Struktura repozytorium dla frontend i backend.

**Decyzja:** Monorepo (pnpm workspaces + Turbo)

**Uzasadnienie:**
- Wspoldzielone typy miedzy frontend/backend
- Atomowe commity w calym stacku
- Uproszczone zarzadzanie dependencies
- Lepsze developer experience

**Trade-offs:**
- Wiekszy rozmiar repozytorium
- Zlozonosc konfiguracji (workspace, turbo)

**Konsekwencje:**
- Struktura: `apps/api`, `apps/web`, `packages/shared`
- Build: Turbo dla parallel builds i cache
- CI/CD: Single pipeline dla wszystkiego

---

## ADR-003: Next.js App Router vs Pages Router

**Status:** Zaakceptowany

**Kontekst:**
Next.js oferuje dwa systemy routingu: App Router (nowy) i Pages Router (legacy).

**Decyzja:** App Router

**Uzasadnienie:**
- React Server Components
- Lepszy code splitting
- Ulepszone SEO
- Future-proof (kierunek rozwoju Next.js)

**Trade-offs:**
- Krzywa uczenia sie
- Ograniczone wsparcie bibliotek (poczatkowo)

**Konsekwencje:**
- Routing w katalogu `app/`
- Uzywanie `use client` dla komponentow klienckich
- Server Actions dla prostych operacji

---

## ADR-004: Optimistic Locking for Warehouse

**Status:** Zaakceptowany

**Kontekst:**
Magazyn profili moze byc aktualizowany rownolegle przez roznych uzytkownikow.
Potrzebujemy zabezpieczenia przed "lost updates".

**Decyzja:** Version field + check on update

**Uzasadnienie:**
- Zapobiega utracie aktualizacji w scenariuszach rownoleglych
- Lepsze niz pessimistic locking (brak blokad)
- Obsluguje edge cases (podwojne submisje)

**Implementacja:**

```prisma
model WarehouseStock {
  id               Int      @id @default(autoincrement())
  profileId        Int
  colorId          Int
  currentStockBeams Int     @default(0)
  version          Int      @default(1)
  updatedAt        DateTime @updatedAt

  @@unique([profileId, colorId])
}
```

```typescript
// Aktualizacja z optimistic locking
async function updateStock(stockId: number, newQuantity: number, currentVersion: number) {
  const result = await prisma.warehouseStock.updateMany({
    where: {
      id: stockId,
      version: currentVersion  // Sprawdz wersje
    },
    data: {
      currentStockBeams: newQuantity,
      version: { increment: 1 }  // Zwieksz wersje
    }
  });

  if (result.count === 0) {
    throw new ConflictError('Dane zostaly zmienione przez innego uzytkownika. Odswiez strone.');
  }
}
```

---

## ADR-005: Feature-Based Frontend Structure

**Status:** Zaakceptowany

**Kontekst:**
Organizacja kodu frontendowego. Opcje:
- Type-based: `components/`, `hooks/`, `services/`
- Feature-based: `features/<feature>/`

**Decyzja:** Feature-based structure

**Uzasadnienie:**
- Kolokacja powiazanego kodu
- Latwiejsza nawigacja
- Skalowalnosc
- Jasna odpowiedzialnosc

**Struktura:**

```
features/
├── deliveries/
│   ├── api/
│   │   └── deliveriesApi.ts
│   ├── components/
│   │   ├── DeliveryCard.tsx
│   │   ├── DeliveriesTable.tsx
│   │   └── index.ts
│   ├── hooks/
│   │   └── useDeliveries.ts
│   └── types/
│       └── index.ts
├── orders/
│   └── ...
└── warehouse/
    └── ...
```

**Konsekwencje:**
- Nowe feature = nowy katalog w `features/`
- Wspoldzielone komponenty w `components/ui/`
- Import: `import { DeliveryCard } from '@/features/deliveries'`

---

## ADR-006: React Query for Server State

**Status:** Zaakceptowany

**Kontekst:**
Zarzadzanie stanem danych z serwera. Opcje:
- Redux + RTK Query
- React Query (TanStack Query)
- SWR
- Plain useState + fetch

**Decyzja:** React Query

**Uzasadnienie:**
- Wbudowane cache management
- Automatyczne refetching
- Optimistic updates
- Dobra integracja z React
- Aktywny development

**Konsekwencje:**
- QueryClientProvider w providers.tsx
- useQuery dla odczytu, useMutation dla zapisu
- queryKey dla cache invalidation

---

## ADR-007: Zod for Validation

**Status:** Zaakceptowany

**Kontekst:**
Walidacja danych wejsciowych. Opcje:
- Joi
- Yup
- Zod
- Custom validation

**Decyzja:** Zod

**Uzasadnienie:**
- TypeScript-first (inference typow)
- Dobre komunikaty bledow
- Kompatybilnosc z React Hook Form
- Maly bundle size

**Konsekwencje:**
- Schema definitions w `validators/`
- `zodResolver` w formularzach
- Walidacja w handlerach: `schema.parse(req.body)`

---

## ADR-008: Shadcn/ui for Components

**Status:** Zaakceptowany

**Kontekst:**
Biblioteka komponentow UI. Opcje:
- Material UI
- Chakra UI
- Shadcn/ui
- Custom components

**Decyzja:** Shadcn/ui

**Uzasadnienie:**
- Pelna kontrola (kod w `components/ui/`)
- Stylowanie TailwindCSS
- Accessibility wbudowane
- Brak vendor lock-in (copy-paste, nie dependency)

**Konsekwencje:**
- Komponenty w `components/ui/`
- Mozliwosc dostosowania kazdego komponentu
- Konfiguracja w `components.json`

---

## ADR-009: Layered Backend Architecture

**Status:** Zaakceptowany

**Kontekst:**
Organizacja kodu backendowego.

**Decyzja:** Route -> Handler -> Service -> Repository

**Uzasadnienie:**
- Jasny podzial odpowiedzialnosci
- Latwosc testowania (mockowanie warstw)
- Ponowne uzycie logiki biznesowej
- Konsystencja w calym projekcie

**Warstwy:**
1. **Routes** - definicja endpointow, OpenAPI
2. **Handlers** - HTTP layer, walidacja, response
3. **Services** - logika biznesowa, orchestration
4. **Repositories** - dostep do bazy danych

**Konsekwencje:**
- NIE try-catch w handlerach (middleware)
- Transakcje w services
- Prisma tylko w repositories

---

## ADR-010: Soft Delete Pattern

**Status:** Zaakceptowany

**Kontekst:**
Usuwanie danych. Opcje:
- Hard delete (DELETE FROM)
- Soft delete (SET deletedAt)

**Decyzja:** Soft delete dla waznych encji

**Uzasadnienie:**
- Mozliwosc przywrocenia danych
- Audit trail
- Zachowanie historii
- Zapobieganie przypadkowym utratom

**Implementacja:**

```prisma
model Delivery {
  id        Int       @id
  deletedAt DateTime? // null = aktywny, data = usuniety
}
```

```typescript
// "Usuwanie" - soft delete
await prisma.delivery.update({
  where: { id },
  data: { deletedAt: new Date() }
});

// Pobieranie - tylko aktywne
await prisma.delivery.findMany({
  where: { deletedAt: null }
});
```

**Konsekwencje:**
- Wszystkie zapytania musza filtrowac `deletedAt: null`
- Mozliwosc implementacji "Kosz" w UI
- Okresowe czyszczenie starych soft-deleted rekordow

---

## Powiazane Dokumenty

- [Tech Stack](./tech-stack.md)
- [Backend Architecture](./backend.md)
- [Frontend Architecture](./frontend.md)

---

**Ostatnia aktualizacja:** 2026-01-20
