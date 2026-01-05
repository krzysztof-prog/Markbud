# Antypatterns - Czego Unikać

> Skondensowane zasady z doświadczenia projektu. Pełna wersja: [archive/anti-patterns-full.md](../archive/anti-patterns-full.md)

---

## Obsługa Błędów (Error Handling)

### Backend - Zasady

| Nie rób | Rób |
|---------|-----|
| Lokalne `try-catch` dla ZodError w handlerach | Pozwól middleware obsłużyć ZodError |
| Zwracaj `reply.status(400).send({ error })` | Throwuj custom error (`throw new ValidationError()`) |
| Mieszane polskie/angielskie komunikaty | Wszystkie user-facing po polsku |
| `error.message` bez kontekstu | Szczegółowe komunikaty z nazwą zasobu |
| Logowanie w handlerach | Logowanie tylko w middleware i Service |

**Wzorzec Handler - DOBRZE:**
```typescript
async getById(request: FastifyRequest, reply: FastifyReply) {
  const { id } = idParamsSchema.parse(request.params); // ZodError → middleware
  const order = await this.service.findById(id);
  if (!order) {
    throw new NotFoundError('Zamówienie'); // Middleware obsłuży
  }
  return reply.send(order);
}
```

**Wzorzec Handler - ŹLE:**
```typescript
async getById(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = idParamsSchema.parse(request.params);
    // Duplikacja - middleware już to obsługuje!
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: error.errors[0].message });
    }
  }
}
```

**Custom Errors - Hierarchia:**
```typescript
AppError (bazowa)
├── ValidationError (400)
├── NotFoundError (404)
├── ConflictError (409)
├── UnauthorizedError (401)
├── ForbiddenError (403)
└── InternalServerError (500)
```

**Kiedy używać lokalnego try-catch:**
- Tylko dla ConflictError z details (np. import konflikt)
- Nigdy dla ZodError, NotFoundError, ValidationError
- File upload errors z custom message

**Transakcje - używaj safe-transaction.ts:**
```typescript
// TAK
import { safeTransaction } from '../utils/safe-transaction.js';

await safeTransaction(prisma, async (tx) => {
  const order = await tx.order.create({ data });
  await tx.orderRequirement.createMany({ data: requirements });
  return order;
});

// NIE - brak error handling
await prisma.$transaction(async (tx) => {
  // błędy nie są odpowiednio obsłużone
});
```

### Frontend - Zasady

| Nie rób | Rób |
|---------|-----|
| Query bez error state | `const { data, error, refetch } = useQuery()` |
| Brak error UI | Użyj `<ErrorUI />` komponentu |
| Angielskie komunikaty | Wszystko po polsku |
| Toast bez retry dla network errors | `showRetryableErrorToast()` z onRetry |
| Brak logowania błędów | Używaj `logError()` z error-logger.ts |

**Wzorzec Query - DOBRZE:**
```typescript
const { data, isLoading, error, refetch } = useQuery({ ... });

if (isLoading) return <Skeleton />;
if (error) return <ErrorUI message="..." onRetry={refetch} error={error} />;
if (!data?.length) return <EmptyState />;
return <DataView data={data} />;
```

**Wzorzec Mutation - DOBRZE:**
```typescript
const mutation = useMutation({
  mutationFn: api.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
    showSuccessToast('Sukces', 'Utworzono pomyślnie');
  },
  onError: (error) => {
    showCategorizedErrorToast(error, () => mutation.mutate());
    logMutationError(error, 'createItem');
  },
});
```

**Error Logger - kiedy używać:**
```typescript
import { logError, logApiError, logComponentError } from '@/lib/error-logger';

// W catch block
catch (error) {
  logError(error, { component: 'OrderForm', action: 'submit' });
}

// W API error
logApiError(error, '/api/orders', 'POST');

// W Error Boundary
logComponentError(error, 'Dashboard', componentStack);
```

---

## Baza Danych (Prisma/SQLite)

| Nie rób | Rób |
|---------|-----|
| `pnpm db:push` | `pnpm db:migrate` (push kasuje dane!) |
| `@@index` na kolumnach z `@@unique` | `@@unique` sam tworzy indeks |
| Zmiana schema bez `npx prisma generate` | Zawsze generuj po zmianie |
| `DATE(timestamp)` w SQLite | `DATE(datetime(ts/1000, 'unixepoch'))` |
| `DROP TABLE` + `CREATE TABLE` | `ALTER TABLE ADD COLUMN` (zachowuje dane!) |
| `PRAGMA foreign_keys=OFF` | Zawsze używaj foreign keys (integralność!) |
| Migracje bez timestampa | `YYYYMMDDHHMMSS_nazwa` format |
| Redundantne indeksy | Jedna kolumna z `@@index([status])` + compound `@@index([status, date])` |
| Brak indeksów na foreign keys | Indeksuj kolumny używane w WHERE/JOIN (deliveryId, orderId) |

### Bezpieczne Migracje - KRYTYCZNE

```sql
-- NIE - UTRATA DANYCH!
PRAGMA foreign_keys=OFF;
CREATE TABLE orders_new (...);
INSERT INTO orders_new SELECT ... FROM orders;
DROP TABLE orders;  -- Kasuje foreign keys!
ALTER TABLE orders_new RENAME TO orders;
PRAGMA foreign_keys=ON;

-- TAK - BEZPIECZNE
ALTER TABLE orders ADD COLUMN client TEXT;
ALTER TABLE orders ADD COLUMN project TEXT;
-- Kolumny dodane, dane zachowane, foreign keys nienaruszone
```

**Zasady bezpiecznych migracji:**
1. Używaj `ALTER TABLE ADD COLUMN` zamiast DROP/CREATE
2. Nigdy nie wyłączaj `PRAGMA foreign_keys=OFF`
3. Zawsze nadawaj migracjom timestamp: `20251211000000_nazwa`
4. Używaj `--create-only` do review przed uruchomieniem
5. Twórz backup bazy przed niebezpiecznymi operacjami

**Wyjątki (SQLite < 3.35.0):**
- Brak wsparcia dla `ALTER TABLE DROP COLUMN`
- Brak wsparcia dla `ALTER TABLE RENAME COLUMN`
- W takich przypadkach dokumentuj w komentarzu i odłóż do upgrade SQLite

### Database Performance - Indeksy

**Symptomy brakujących indeksów:**
- Slow queries (>100ms) dla findMany z WHERE
- N+1 query pattern w relacjach
- Aggregate queries bez indeksów

**Kiedy dodać index:**
```prisma
// TAK - foreign key używany w WHERE
model DeliveryOrder {
  deliveryId Int
  @@index([deliveryId])  // Używany w WHERE deliveryId często
}

// TAK - compound index dla combined queries
model OrderRequirement {
  orderId Int
  colorId Int
  @@index([orderId])           // Dla WHERE orderId
  @@index([orderId, colorId])  // Dla WHERE orderId AND colorId
}

// NIE - @@unique już tworzy indeks
model WarehouseStock {
  profileId Int
  colorId Int
  @@unique([profileId, colorId])
  @@index([profileId, colorId])  // REDUNDANTNY! Unique już ma index
}
```

**Redundantne indeksy - przykłady:**
```prisma
// REDUNDANTNE
@@index([status])
@@index([archivedAt])
@@index([archivedAt, status])  // Ten wystarczy dla (archivedAt + status)
@@index([status, archivedAt])  // Ten wystarczy dla (status + archivedAt)

// ZOPTYMALIZOWANE
@@index([status])
@@index([archivedAt])
@@index([status, archivedAt])  // Jeden compound index zamiast wielu
```

**Jak zidentyfikować potrzebne indeksy:**
1. Sprawdź Repository - szukaj `where: { kolumna: ... }`
2. Policz ile razy kolumna używana w WHERE (>5 = dodaj index)
3. Sprawdź compound queries - `where: { a: ..., b: ... }` = `@@index([a, b])`
4. Użyj `EXPLAIN QUERY PLAN` w SQLite do weryfikacji

**Migration example - 2024-12-17:**
```sql
-- Dodano delivery_orders_delivery_id_idx (10+ użyć w DeliveryRepository)
-- Dodano order_requirements_order_id_color_id_idx (combined lookups)
-- Usunięto orders_archived_at_status_idx (redundantny)
-- Usunięto orders_created_at_archived_at_idx (rzadko używany)
```

---

## Edge Cases - Rozwiązania Zaimplementowane

### Optimistic Locking
**Problem:** Race conditions przy concurrent updates stanu magazynu.

**Rozwiązanie:**
```typescript
// apps/api/src/services/okuc/OkucStockService.ts
async updateStock(input: UpdateOkucStockInput, expectedVersion?: number) {
  return withOptimisticLockRetry(async () => {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.okucStock.findFirst({ where: { ... } });

      // Version check
      if (expectedVersion !== undefined && current.version !== expectedVersion) {
        throw new OptimisticLockError('Concurrent update detected', current.version);
      }

      // Update with version increment
      return tx.okucStock.update({
        where: { id: current.id, version: current.version },
        data: { quantity: newQty, version: { increment: 1 } }
      });
    });
  });
}
```

**Gdzie stosować:**
- WarehouseStock (✓ zaimplementowane)
- OkucStock (✓ zaimplementowane)
- Każda tabela z frequent concurrent writes

### State Machine dla Status
**Problem:** Nielegalne transitions statusów (completed → new, archived → in_progress).

**Rozwiązanie:**
```typescript
// apps/api/src/utils/order-status-machine.ts
const VALID_TRANSITIONS = {
  new: ['in_progress', 'archived'],
  in_progress: ['completed', 'archived'],
  completed: ['archived'],
  archived: [], // Terminal state
};

// W OrderService
async updateOrder(id, data) {
  if (data.status) {
    validateStatusTransition(currentOrder.status, data.status);
  }
  // ... update
}
```

**Stosuj dla:** Order status, Delivery status, Payment status

### Warehouse Stock Validation
**Problem:** Rozpoczęcie produkcji bez wystarczających materiałów → ujemny stan.

**Rozwiązanie:**
```typescript
// apps/api/src/utils/warehouse-validation.ts
async function validateSufficientStock(prisma, orderId) {
  const requirements = await prisma.orderRequirement.findMany({ where: { orderId } });
  const stocks = await prisma.warehouseStock.findMany({ where: { OR: [...] } });

  // Check każdego profilu x koloru
  for (const req of requirements) {
    if (stock.currentStockBeams < req.beamsCount) {
      throw new ValidationError(`Brakuje ${shortage} bel profilu ${profileNumber}`);
    }
  }
}

// W OrderService - przed zmianą statusu na in_progress
if (newStatus === ORDER_STATUSES.IN_PROGRESS) {
  await validateSufficientStock(prisma, orderId);
}
```

**Stosuj przed:** Rozpoczęciem produkcji, alokacją materiałów, commitowaniem deliveries

### Import Lock Cleanup
**Problem:** Expired locks nie są czyszczone → folder zablokowany na zawsze.

**Rozwiązanie:**
```typescript
// apps/api/src/services/importLockCleanupScheduler.ts
export class ImportLockCleanupScheduler {
  start() {
    // Cleanup co godzinę
    this.task = cron.schedule('0 * * * *', () => this.runCleanup());
  }

  private async runCleanup() {
    const deleted = await this.lockService.cleanupExpiredLocks();
    logger.info(`Removed ${deleted} expired locks`);
  }
}

// W index.ts
startImportLockCleanupScheduler(prisma);
```

**Pattern:** Scheduled cleanup (cron) dla wszystkich time-based resources (locks, sessions, temp files)

### Money as Int (Grosze/Centy)
**Problem:** Float precision loss (1250.50 PLN → 1250 przez truncation).

**Rozwiązanie:**
```typescript
// apps/api/src/utils/money.ts
export type Grosze = number & { readonly __brand: 'grosze' };
export type Centy = number & { readonly __brand: 'centy' };

export function plnToGrosze(pln: number): Grosze {
  if (Math.abs(pln - Math.round(pln * 100) / 100) > 0.0001) {
    throw new Error('Too much precision');
  }
  return Math.round(pln * 100) as Grosze;
}

// Database stores Int
valuePln Int?  -- Grosze (1250.50 PLN = 125050)
valueEur Int?  -- Centy (100.00 EUR = 10000)
```

**Stosuj dla:** Wszystkich wartości pieniężnych, cen, kwot

### WebSocket Memory Leak
**Problem:** `connectionRateLimits` Map rośnie bez ograniczeń.

**Rozwiązanie:**
```typescript
// apps/api/src/plugins/websocket.ts
setInterval(() => {
  const now = Date.now();
  for (const [connId, limit] of connectionRateLimits.entries()) {
    // Cleanup entries older than 1 hour
    if (now > limit.resetAt + 3600000) {
      connectionRateLimits.delete(connId);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

**Pattern:** Periodic cleanup dla in-memory caches/maps

---

## Backend (Fastify/TypeScript)

| Nie rób | Rób |
|---------|-----|
| Business logic w routes | Route → Handler → Service → Repository |
| `parseInt()` bez `isNaN()` | Zawsze sprawdzaj NaN przed użyciem |
| `any` typy | `unknown` + type narrowing, Prisma types |
| `startsWith()` dla ścieżek Windows | `toLowerCase()` - case-insensitive |
| Osobne `remove` + `add` operacje | Jedna transakcja `prisma.$transaction()` |
| `max position` poza transakcją | Aggregate w transakcji (race condition!) |

### Transakcje - szablon
```typescript
await prisma.$transaction(async (tx) => {
  const max = await tx.table.aggregate({ _max: { position: true } });
  await tx.table.create({ data: { position: (max._max.position || 0) + 1 } });
});
```

---

## Frontend (Next.js 15 / React)

### Dynamic Imports - KRYTYCZNE
```typescript
// NIE - runtime error w Next.js 15
const C = dynamic(() => import('./C'));

// TAK - explicit default
const C = dynamic(() => import('./C').then(m => m.default), { ssr: false });
```

Po zmianach: `rm -rf apps/web/.next && pnpm dev:web`

### React Hooks - Kolejność
```typescript
function Component() {
  // 1. WSZYSTKIE Hooks na początku
  const { data } = useQuery(...);
  const [state, setState] = useState(...);
  const memo = useMemo(() => ..., []);

  // 2. POTEM early returns
  if (!data) return <Loading />;

  // 3. POTEM render
  return <div>{data}</div>;
}
```

### Częste błędy React

| Nie rób | Rób |
|---------|-----|
| `useEffect` do fetch | `useQuery` z React Query |
| Hook wewnątrz `if` | Hook zawsze, `enabled: !!condition` |
| `{items.map(x => <><div/></>)}` | `<React.Fragment key={x.id}>` |
| `preview.import.metadata` | `preview?.import?.metadata` |
| `icon={History}` | `icon={<History />}` |

### Optimistic Updates - szablon
```typescript
useMutation({
  onMutate: async () => {
    const prev = queryClient.getQueryData(['key']);
    queryClient.setQueryData(['key'], newData);
    return { prev };
  },
  onError: (_, __, ctx) => {
    queryClient.setQueryData(['key'], ctx.prev); // rollback!
  },
});
```

---

## TypeScript

| Nie rób | Rób |
|---------|-----|
| `catch (e: any)` | `catch (e: unknown)` + `e instanceof Error` |
| `as any` | `as Prisma.OrderWhereInput` |
| `icon: any` | `icon: ComponentType<SVGProps<SVGSVGElement>>` |
| Inline typy | Interfejsy w `/types` |

---

## UX / Komponenty

| Nie rób | Rób |
|---------|-----|
| Warning i Error ten sam kolor | `warning` (żółty) vs `destructive` (czerwony) |
| Tylko drag & drop | + context menu jako alternatywa |
| `rounded-inherit` | `rounded-[inherit]` (arbitrary value) |
| Optimistic bez feedbacku | `SyncIndicator` dla `_optimistic: true` |

---

## PDF (pdfkit)

| Nie rób | Rób |
|---------|-----|
| Helvetica dla PL znaków | DejaVu lub inny Unicode font |
| PDF inline w route | Dedykowany `PdfService` |

---

## Git / Workflow

| Nie rób | Rób |
|---------|-----|
| Commit bez sprawdzenia | `pnpm lint && pnpm build` przed commit |
| Push do main bez review | Feature branch → PR → merge |
| `*.backup` w repo | Użyj git branches |

---

## Claude Code

1. **Jedno zadanie naraz** - nie dawaj wielu zadań, gubi kontekst
2. **Naprawiaj błędy od razu** - nie ignoruj, kaskadują
3. **Self-review** - poproś: "Zrecenzuj swoją pracę"
4. **Regularne skanowanie** - `grep -r "any" apps/` co tydzień

---

## Checklist przed PR

### Build & Lint
- [ ] `pnpm lint` - brak błędów
- [ ] `pnpm build` - kompiluje się
- [ ] Brak `any` w nowym kodzie

### Backend
- [ ] Transakcje dla operacji multi-step
- [ ] Optimistic locking dla concurrent updates (version field)
- [ ] State machine validation dla status transitions
- [ ] Warehouse stock validation przed produkcją
- [ ] Money stored as Int (grosze/centy), nie Float

### Frontend
- [ ] Dynamic imports z `.then(m => m.default)`
- [ ] Hooks na początku komponentu
- [ ] Optional chaining dla nested properties

### Database
- [ ] Migracje używają `ALTER TABLE`, nie `DROP TABLE`
- [ ] Migracje mają timestamp w nazwie folderu
- [ ] Indeksy dodane dla kolumn używanych w WHERE (>5 razy)
- [ ] Brak redundantnych indeksów (@@unique już ma index)

### Edge Cases & Memory
- [ ] Scheduled cleanup dla time-based resources (locks, sessions)
- [ ] Periodic cleanup dla in-memory maps/caches
- [ ] No memory leaks (setInterval cleared on shutdown)
