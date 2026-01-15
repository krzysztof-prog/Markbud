# PLAN NAPRAW - AUDYT 2026-01-14

> **Status:** Do realizacji
> **Utworzono:** 2026-01-14
> **Źródło:** [COMPREHENSIVE_AUDIT_2026-01-14.md](reviews/COMPREHENSIVE_AUDIT_2026-01-14.md)

---

## LEGENDA PRIORYTETÓW

| Priorytet | Znaczenie | Termin |
|-----------|-----------|--------|
| 🔴 **P0** | KRYTYCZNE - blokuje produkcję | Natychmiast |
| 🟠 **P1** | Wysokie - wpływa na bezpieczeństwo/UX | Tydzień |
| 🟡 **P2** | Średnie - technical debt | Miesiąc |
| 🟢 **P3** | Niskie - nice to have | Backlog |

---

## 🔴 P0 - KRYTYCZNE (Blokuje produkcję)

### P0-SEC-001: Brak autoryzacji na warehouse routes
- **Plik:** `apps/api/src/routes/warehouse.ts`
- **Problem:** WSZYSTKIE endpointy dostępne bez logowania
- **Ryzyko:** Każdy może modyfikować stan magazynu
- **Rozwiązanie:**
  ```typescript
  import { verifyAuth } from '../middleware/auth.js';
  import { requireManagerAccess } from '../middleware/role-check.js';

  // Dla wszystkich endpointów:
  fastify.get('/shortages', { preHandler: verifyAuth }, handlers.getShortages);
  fastify.put('/:colorId/:profileId', { preHandler: [verifyAuth, requireManagerAccess] }, handlers.updateStock);
  // etc.
  ```
- **Czas:** 2h
- **Status:** [ ] Do zrobienia

---

### P0-SEC-002: Brak autoryzacji na settings routes
- **Plik:** `apps/api/src/routes/settings.ts`
- **Problem:** WSZYSTKIE endpointy dostępne bez logowania
- **Ryzyko:** Każdy może zmieniać ustawienia systemu
- **Rozwiązanie:**
  ```typescript
  import { verifyAuth } from '../middleware/auth.js';
  import { requireUserManagement } from '../middleware/role-check.js';

  // GET - tylko zalogowani
  fastify.get('/', { preHandler: verifyAuth }, handler.getAll);

  // PUT/POST/DELETE - tylko admin
  fastify.put('/:key', { preHandler: [verifyAuth, requireUserManagement] }, handler.upsertOne);
  ```
- **Czas:** 1h
- **Status:** [ ] Do zrobienia

---

### P0-SEC-003: Brak autoryzacji na imports routes
- **Plik:** `apps/api/src/routes/imports.ts`
- **Problem:** WSZYSTKIE endpointy dostępne bez logowania
- **Ryzyko:** Każdy może uploadować pliki, usuwać foldery
- **Rozwiązanie:**
  ```typescript
  import { verifyAuth } from '../middleware/auth.js';

  fastify.post('/upload', { preHandler: verifyAuth }, handler.upload);
  fastify.post('/folder', { preHandler: verifyAuth }, handler.importFolder);
  fastify.delete('/delete-folder', { preHandler: verifyAuth }, handler.deleteFolder);
  ```
- **Czas:** 1h
- **Status:** [ ] Do zrobienia

---

### P0-SEC-004: Brak autoryzacji na pallets routes
- **Plik:** `apps/api/src/routes/pallets.ts`
- **Problem:** WSZYSTKIE endpointy dostępne bez logowania
- **Ryzyko:** Każdy może usuwać optymalizacje palet
- **Rozwiązanie:**
  ```typescript
  import { verifyAuth } from '../middleware/auth.js';
  import { requireManagerAccess } from '../middleware/role-check.js';

  fastify.post('/optimize/:deliveryId', { preHandler: [verifyAuth, requireManagerAccess] }, handler.optimizeDelivery);
  fastify.delete('/optimization/:deliveryId', { preHandler: [verifyAuth, requireManagerAccess] }, handler.deleteOptimization);
  ```
- **Czas:** 1h
- **Status:** [ ] Do zrobienia

---

### P0-SEC-005: Brak autoryzacji na dashboard stats
- **Plik:** `apps/api/src/routes/dashboard.ts`
- **Problem:** GET /, /alerts, /stats/* dostępne bez logowania
- **Ryzyko:** Wyciek danych biznesowych
- **Rozwiązanie:**
  ```typescript
  import { verifyAuth } from '../middleware/auth.js';

  fastify.get('/', { preHandler: verifyAuth }, getDashboardData);
  fastify.get('/alerts', { preHandler: verifyAuth }, getAlerts);
  fastify.get('/stats/weekly', { preHandler: verifyAuth }, getWeeklyStats);
  fastify.get('/stats/monthly', { preHandler: verifyAuth }, getMonthlyStats);
  ```
- **Czas:** 30min
- **Status:** [ ] Do zrobienia

---

### P0-SEC-006: Path traversal w browse-folders
- **Plik:** `apps/api/src/routes/settings.ts` (linie 44-148)
- **Problem:** Endpoint pozwala przeglądać system plików bez autoryzacji
- **Ryzyko:** Reconnaissance attack, wyciek struktury serwera
- **Rozwiązanie:**
  ```typescript
  // 1. Dodać autoryzację
  fastify.get('/browse-folders', { preHandler: [verifyAuth, requireUserManagement] }, async (request, reply) => {
    // 2. Whitelist dozwolonych ścieżek
    const allowedBasePaths = [
      'C:\\inetpub\\markbud',
      '\\\\192.168.1.6\\Public\\Markbud_import'
    ];

    const requestedPath = request.query.path || '';

    // 3. Sprawdź PRZED normalizacją
    if (requestedPath.includes('..') || requestedPath.includes('~')) {
      return reply.status(400).send({ error: 'Nieprawidłowa ścieżka' });
    }

    const normalizedPath = path.resolve(path.normalize(requestedPath));

    // 4. Upewnij się że ścieżka jest w dozwolonych
    const isAllowed = allowedBasePaths.some(base =>
      normalizedPath.toLowerCase().startsWith(base.toLowerCase())
    );

    if (!isAllowed) {
      return reply.status(403).send({ error: 'Dostęp zabroniony' });
    }

    // ... reszta logiki
  });
  ```
- **Czas:** 1h
- **Status:** [ ] Do zrobienia

---

### P0-ARCH-001: Warehouse-orders bez architektury
- **Plik:** `apps/api/src/routes/warehouse-orders.ts`
- **Problem:** Cały moduł (300+ linii) ma bezpośrednie zapytania Prisma w routes
- **Rozwiązanie:** Stworzyć pełną architekturę:
  1. `apps/api/src/handlers/warehouseOrderHandler.ts`
  2. `apps/api/src/services/warehouseOrderService.ts`
  3. `apps/api/src/repositories/WarehouseOrderRepository.ts`
  4. `apps/api/src/validators/warehouse-order.ts`
- **Czas:** 4h
- **Status:** [ ] Do zrobienia

---

## 🟠 P1 - WYSOKIE (W tym tygodniu)

### P1-ARCH-001: Refactor MagazynAkrobudPageContent.tsx (851 linii)
- **Plik:** `apps/web/src/app/magazyn/akrobud/MagazynAkrobudPageContent.tsx`
- **Problem:** Zbyt wiele odpowiedzialności, 3 taby w jednym komponencie
- **Rozwiązanie:**
  ```
  magazyn/akrobud/
  ├── page.tsx (routing only)
  ├── MagazynAkrobudLayout.tsx (layout + tabs)
  └── components/
      ├── OrdersTab.tsx (~250L)
      ├── StockTab.tsx (~250L)
      └── HistoryTab.tsx (~250L)
  ```
- **Czas:** 4h
- **Status:** [ ] Do zrobienia

---

### P1-ARCH-002: Refactor admin/settings/page.tsx (756 linii)
- **Plik:** `apps/web/src/app/admin/settings/page.tsx`
- **Problem:** 7+ tabów w jednym komponencie, duplikacja z features/settings
- **Rozwiązanie:** Użyć istniejących komponentów z `features/settings/components/`
  ```typescript
  // Zamiast inline tabs, użyj:
  import {
    GeneralSettingsTab,
    FoldersTab,
    GlassWatchTab,
    // ...
  } from '@/features/settings/components';

  // Z lazy loading:
  const GeneralSettingsTab = dynamic(
    () => import('@/features/settings/components').then(m => ({ default: m.GeneralSettingsTab })),
    { loading: () => <TabSkeleton /> }
  );
  ```
- **Czas:** 3h
- **Status:** [ ] Do zrobienia

---

### P1-PERF-001: Dodać memoization do OrdersTable
- **Plik:** `apps/web/src/features/orders/components/OrdersTable.tsx`
- **Problem:** Re-renders na każdą zmianę state, brak debounce
- **Rozwiązanie:**
  ```typescript
  // 1. React.memo dla całego komponentu
  export const OrdersTable = React.memo<Props>(({ orders, filters }) => {
    // 2. useMemo dla filtered/sorted data
    const filteredOrders = useMemo(() => {
      return orders.filter(/* ... */);
    }, [orders, filters]);

    // 3. useCallback dla handlers
    const handleClick = useCallback((id: number) => {
      // ...
    }, []);

    return /* ... */;
  });
  ```
- **Czas:** 2h
- **Status:** [ ] Do zrobienia

---

### P1-PERF-002: Dodać useDebounce hook
- **Plik:** NOWY `apps/web/src/hooks/useDebounce.ts`
- **Problem:** Search inputs nie mają debounce, każde naciśnięcie klawisza triggeruje re-render
- **Rozwiązanie:**
  ```typescript
  import { useEffect, useState } from 'react';

  export function useDebounce<T>(value: T, delay = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
      const handler = setTimeout(() => setDebouncedValue(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
  }
  ```
- **Użycie:**
  ```typescript
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredArticles = useMemo(() => {
    return articles.filter(a =>
      a.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [articles, debouncedSearch]);
  ```
- **Czas:** 1h
- **Status:** [ ] Do zrobienia

---

### P1-SEC-007: Usunąć try-catch z authHandler
- **Plik:** `apps/api/src/handlers/authHandler.ts`
- **Problem:** Wszystkie 3 handlery mają try-catch (łamie zasadę: middleware obsługuje błędy)
- **Rozwiązanie:** Usunąć try-catch, pozwolić middleware na obsługę błędów
- **Czas:** 30min
- **Status:** [ ] Do zrobienia

---

### P1-SEC-008: Fix authService własna instancja Prisma
- **Plik:** `apps/api/src/services/authService.ts` (linia 12)
- **Problem:** `const prisma = new PrismaClient();` zamiast shared instance
- **Rozwiązanie:**
  ```typescript
  // PRZED:
  const prisma = new PrismaClient();

  // PO:
  import { prisma } from '../index.js';
  ```
- **Czas:** 30min
- **Status:** [ ] Do zrobienia

---

### P1-CODE-001: Usunąć debug console.log z glassOrderHandler
- **Plik:** `apps/api/src/handlers/glassOrderHandler.ts`
- **Problem:** 16 linii debug console.log
- **Rozwiązanie:** Usunąć lub zastąpić logger.debug()
- **Czas:** 30min
- **Status:** [ ] Do zrobienia

---

### P1-CODE-002: Naprawić typy (request as any).user
- **Pliki:**
  - `apps/api/src/handlers/userHandler.ts:123`
  - `apps/api/src/handlers/settingsHandler.ts:134`
  - (i inne handlery)
- **Problem:** Brak prawidłowych typów dla Fastify request z authenticated user
- **Rozwiązanie:**
  ```typescript
  // apps/api/src/types/fastify.d.ts
  import '@fastify/jwt';

  declare module 'fastify' {
    interface FastifyRequest {
      user?: {
        userId: number;
        email: string;
        role: string;
      };
    }
  }
  ```
- **Czas:** 1h
- **Status:** [ ] Do zrobienia

---

### P1-TEST-001: Dodać podstawowe testy frontend
- **Pliki:** NOWE w `apps/web/src/**/*.test.tsx`
- **Problem:** 0% pokrycia testami w frontend
- **Rozwiązanie:** Dodać testy dla kluczowych komponentów
- **Priorytet testów:**
  1. OrdersTable - filtrowanie, sortowanie
  2. DeliveryValue - obliczenia kwot
  3. useDebounce - custom hook
  4. money utils - groszeToPln, plnToGrosze
- **Czas:** 4h
- **Status:** [ ] Do zrobienia

---

## 🟡 P2 - ŚREDNIE (W tym miesiącu)

### P2-ARCH-003: Przenieść inline handlers z orders.ts
- **Plik:** `apps/api/src/routes/orders.ts`
- **Problem:** 5 inline handlers (linie 129-458)
- **Rozwiązanie:** Przenieść do `orderHandler.ts`:
  - `hasPdf()` (GET /:id/has-pdf)
  - `downloadPdf()` (GET /:id/pdf)
  - `getColorTable()` (GET /table/:colorId)
  - `getRequirementsTotals()` (GET /requirements/totals)
  - `updateVariantType()` (PATCH /:id/variant-type)
- **Czas:** 3h
- **Status:** [ ] Do zrobienia

---

### P2-ARCH-004: Przenieść inline handlers z settings.ts
- **Plik:** `apps/api/src/routes/settings.ts`
- **Problem:** 3 inline handlers dla folder browsing i file watcher
- **Rozwiązanie:** Przenieść do `settingsHandler.ts`:
  - `browseFolders()` (GET /browse-folders)
  - `validateFolder()` (POST /validate-folder)
  - `getFileWatcherStatus()` / `restartFileWatcher()`
- **Czas:** 1h
- **Status:** [ ] Do zrobienia

---

### P2-ARCH-005: Stworzyć PalletStockRepository
- **Plik:** `apps/api/src/services/palletStockService.ts`
- **Problem:** Service używa bezpośrednio Prisma zamiast repository
- **Rozwiązanie:**
  1. Stworzyć `apps/api/src/repositories/PalletStockRepository.ts`
  2. Przenieść wszystkie zapytania Prisma
  3. Zaktualizować service do używania repository
- **Czas:** 2h
- **Status:** [ ] Do zrobienia

---

### P2-ARCH-006: Stworzyć WorkingDayRepository
- **Plik:** `apps/api/src/services/HolidayService.ts`
- **Problem:** Service używa bezpośrednio Prisma
- **Rozwiązanie:** Stworzyć `WorkingDayRepository.ts`
- **Czas:** 1h
- **Status:** [ ] Do zrobienia

---

### P2-PERF-003: Lazy loading w features/
- **Problem:** 0 dynamic imports w features/, wszystko ładuje się na starcie
- **Rozwiązanie:** Lazy load modals i ciężkie komponenty:
  ```typescript
  // W features/orders/components/index.ts
  export const OrderDetailModal = dynamic(
    () => import('./OrderDetailModal').then(m => ({ default: m.OrderDetailModal })),
    { loading: () => <ModalSkeleton /> }
  );

  export const ImportArticlesDialog = dynamic(
    () => import('./ImportArticlesDialog').then(m => ({ default: m.ImportArticlesDialog })),
    { loading: () => <DialogSkeleton /> }
  );
  ```
- **Czas:** 3h
- **Status:** [ ] Do zrobienia

---

### P2-PERF-004: Lazy load Recharts
- **Plik:** `apps/web/src/features/orders/components/OrdersStatsModal.tsx`
- **Problem:** Recharts (~450KB) ładuje się nawet gdy modal jest zamknięty
- **Rozwiązanie:**
  ```typescript
  const OrdersStatsModal = dynamic(
    () => import('./OrdersStatsModal'),
    { loading: () => <ModalSkeleton /> }
  );
  ```
- **Czas:** 1h
- **Status:** [ ] Do zrobienia

---

### P2-DB-001: Dodać brakujące indeksy
- **Plik:** Nowa migracja Prisma
- **Problem:** Brak indeksów na często queryowanych polach
- **Rozwiązanie:**
  ```prisma
  // schema.prisma - dodać:
  model Order {
    @@index([completedAt])
    @@index([productionDate, status])
    @@index([documentAuthorUserId])
  }

  model DeliveryOrder {
    @@index([orderId])
  }
  ```
- **Czas:** 1h
- **Status:** [ ] Do zrobienia

---

### P2-DB-002: Soft delete dla Profile i Color
- **Plik:** Nowa migracja Prisma
- **Problem:** Cascade delete może usunąć dane historyczne
- **Rozwiązanie:**
  ```prisma
  model Profile {
    deletedAt DateTime?
    @@index([deletedAt])
  }

  model Color {
    deletedAt DateTime?
    @@index([deletedAt])
  }

  // Zmień onDelete w OrderRequirement na Restrict
  model OrderRequirement {
    profile Profile @relation(fields: [profileId], references: [id], onDelete: Restrict)
    color   Color   @relation(fields: [colorId], references: [id], onDelete: Restrict)
  }
  ```
- **Czas:** 2h
- **Status:** [ ] Do zrobienia

---

### P2-SEC-009: Ujednolicić CORS variables
- **Pliki:**
  - `apps/api/src/utils/config.ts`
  - `apps/api/.env.production`
- **Problem:** Kod używa `ALLOWED_ORIGINS`, .env.production ma `CORS_ORIGIN`
- **Rozwiązanie:**
  ```typescript
  // config.ts
  allowedOrigins: (
    process.env.ALLOWED_ORIGINS ||
    process.env.CORS_ORIGIN ||  // fallback dla kompatybilności
    'http://localhost:3000'
  ).split(',')...
  ```
- **Czas:** 30min
- **Status:** [ ] Do zrobienia

---

### P2-CODE-003: Zastąpić console.log przez logger
- **Pliki:**
  - `apps/api/src/services/parsers/UzyteBeleParser.ts`
  - `apps/api/src/services/parsers/BeamCalculator.ts`
  - `apps/api/src/services/file-watcher/UzyteBeleWatcher.ts`
  - (+ 5 innych)
- **Problem:** 8 plików z console.log zamiast logger
- **Rozwiązanie:** Zamień na `logger.info()` / `logger.debug()`
- **Czas:** 1h
- **Status:** [ ] Do zrobienia

---

### P2-CODE-004: Rozwiązać TODO/FIXME
- **Problem:** 19 TODO/FIXME w kodzie
- **Najważniejsze:**
  1. `routes/settings.ts:236` - "Dodać middleware requireAdmin" (P0-SEC-002 pokrywa)
  2. `DeliveryNotificationService.ts:331` - "Implement email sending"
  3. `orderService.integration.test.ts:340` - "Implement optimistic locking"
- **Czas:** 4-8h (zależnie od decyzji)
- **Status:** [ ] Do przeglądu

---

### P2-UX-001: Suspense boundaries (pilotaż)
- **Problem:** 0 użyć `<Suspense>`, wszystko przez isLoading checks
- **Rozwiązanie:** Pilotaż w 3 komponentach:
  1. Dashboard - `useSuspenseQuery` + `<Suspense>`
  2. Deliveries list
  3. Orders table
- **Czas:** 4h
- **Status:** [ ] Do zrobienia

---

## 🟢 P3 - NISKIE (Backlog)

### P3-PERF-001: Virtual scrolling dla dużych list
- **Problem:** @tanstack/react-virtual zainstalowane ale nieużywane
- **Rozwiązanie:** Dodać virtualization dla list >500 elementów
- **Czas:** 8h
- **Status:** [ ] Backlog

---

### P3-ARCH-007: Refactor remaining large components
- **Problem:** 17 komponentów 300-600 linii
- **Lista:**
  - ProfileDeliveryTable.tsx (619L)
  - WorkerEditPanel.tsx (605L)
  - ImportArticlesDialog.tsx (568L)
  - OrderDetailModal.tsx (551L)
  - NewOperatorDashboard.tsx (517L)
  - (+ 12 innych)
- **Czas:** 20-30h
- **Status:** [ ] Backlog

---

### P3-TEST-002: Zwiększyć pokrycie testami backend
- **Problem:** ~17% pokrycia
- **Cel:** 50% pokrycia
- **Priorytet:**
  - timesheetsService.ts (847L)
  - palletStockService.ts (840L)
  - ImportOrchestrator.ts
  - productionReportService.ts
- **Czas:** 15-20h
- **Status:** [ ] Backlog

---

### P3-CODE-005: Refactor duplicate CRUD operations
- **Plik:** `apps/api/src/services/timesheetsService.ts`
- **Problem:** 4x podobne operacje CRUD (Workers, Positions, TaskTypes, SpecialWorkTypes)
- **Rozwiązanie:** Generic repository pattern lub generatory
- **Czas:** 6h
- **Status:** [ ] Backlog

---

### P3-DOC-001: Dokumentacja API (OpenAPI/Swagger)
- **Problem:** Brak dokumentacji API
- **Rozwiązanie:** Dodać @fastify/swagger
- **Czas:** 8h
- **Status:** [ ] Backlog

---

## PODSUMOWANIE CZASU

| Priorytet | Liczba zadań | Szacowany czas |
|-----------|--------------|----------------|
| 🔴 P0 | 7 | 10-12h |
| 🟠 P1 | 11 | 15-20h |
| 🟡 P2 | 13 | 20-25h |
| 🟢 P3 | 5 | 55-70h |

**Łącznie:** 100-130h pracy

---

## HARMONOGRAM SUGEROWANY

### Tydzień 1 (KRYTYCZNE)
- [ ] P0-SEC-001 do P0-SEC-006 (bezpieczeństwo)
- [ ] P0-ARCH-001 (warehouse-orders)
- **Łącznie:** 10h

### Tydzień 2 (WYSOKIE)
- [ ] P1-ARCH-001, P1-ARCH-002 (duże komponenty)
- [ ] P1-PERF-001, P1-PERF-002 (memoization)
- [ ] P1-SEC-007, P1-SEC-008 (auth fixes)
- [ ] P1-CODE-001, P1-CODE-002 (cleanup)
- **Łącznie:** 15h

### Tydzień 3-4 (ŚREDNIE)
- [ ] P2-ARCH-003 do P2-ARCH-006 (architektura)
- [ ] P2-PERF-003, P2-PERF-004 (lazy loading)
- [ ] P2-DB-001, P2-DB-002 (baza danych)
- [ ] P2-CODE-003, P2-CODE-004 (cleanup)
- **Łącznie:** 15h

### Miesiąc 2+ (BACKLOG)
- [ ] P3-* (według potrzeb)

---

## INSTRUKCJA UŻYCIA

### Dla Claude:
1. Przed rozpoczęciem zadania, oznacz je jako `[x] W trakcie`
2. Po zakończeniu, oznacz jako `[x] Zrobione`
3. Dodaj notatki w komentarzach jeśli coś wymaga wyjaśnienia
4. Aktualizuj LESSONS_LEARNED.md przy błędach

### Dla użytkownika:
1. Możesz zmienić priorytety zadań
2. Możesz usunąć zadania które nie są potrzebne
3. Dodaj nowe zadania w odpowiedniej sekcji
4. Regularnie przeglądaj postęp

---

**Ostatnia aktualizacja:** 2026-01-14
**Autor:** Claude Opus 4.5
