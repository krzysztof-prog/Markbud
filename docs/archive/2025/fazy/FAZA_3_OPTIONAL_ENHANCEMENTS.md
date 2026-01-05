# FAZA 3 - OPTIONAL ENHANCEMENTS

**Data:** 2025-12-29
**Status:** 📋 PLANNED (Optional)
**Priority:** LOW (Production ready bez tej fazy)

---

## 🎯 CEL

FAZA 3 to **opcjonalne ulepszenia** które zwiększą jakość kodu, ale NIE są wymagane do działania systemu.

**Ważne:** System jest już production-ready po FAZIE 1 i FAZIE 2. Ta faza to "nice to have".

---

## 📋 PLAN ULEPSZEŃ

### P3.1 - Transaction Integration (MEDIUM)

**Co:** Zastosuj `withTransaction()` w services wymagających atomowych operacji.

**Gdzie:**

#### 1. deliveryService.createDelivery()
**Obecny kod:**
```typescript
const delivery = await this.repository.create({ ... });
await this.repository.addOrders(deliveryId, orders);
await this.repository.addItems(deliveryId, items);
// ❌ Jeśli addItems() failuje, delivery + orders są utworzone (partial state)
```

**Po refactoringu:**
```typescript
const delivery = await withTransaction(prisma, async (tx) => {
  const delivery = await tx.delivery.create({ ... });
  await tx.deliveryOrder.createMany({ data: orders });
  await tx.deliveryItem.createMany({ data: items });
  return delivery;
});
// ✅ All or nothing - rollback on error
```

#### 2. importService.processImport()
**Obecny kod:**
```typescript
const fileImport = await prisma.fileImport.create({ ... });
for (const orderData of parsedData) {
  await prisma.order.create({ ... });
  await prisma.orderRequirement.createMany({ ... });
}
// ❌ Partial import możliwy przy errorze w środku pętli
```

**Po refactoringu:**
```typescript
await withTransaction(prisma, async (tx) => {
  const fileImport = await tx.fileImport.create({ ... });
  for (const orderData of parsedData) {
    const order = await tx.order.create({ ... });
    await tx.orderRequirement.createMany({ ... });
  }
});
// ✅ Rollback całego importu przy errorze
```

#### 3. warehouseService.recordHistory()
**Obecny kod:**
```typescript
await prisma.warehouseStock.update({ ... });
await prisma.warehouseHistory.create({ ... });
// ❌ Stock updated, history NOT created = inconsistent state
```

**Po refactoringu:**
```typescript
await withTransaction(prisma, async (tx) => {
  await tx.warehouseStock.update({ ... });
  await tx.warehouseHistory.create({ ... });
});
// ✅ Atomowa operacja - stock + history razem
```

#### 4. glassDeliveryService.createGlassDelivery()
**Obecny kod:**
```typescript
const delivery = await prisma.glassDelivery.create({ ... });
await prisma.glassDeliveryItem.createMany({ ... });
// ❌ Delivery bez items możliwe
```

**Po refactoringu:**
```typescript
await withTransaction(prisma, async (tx) => {
  const delivery = await tx.glassDelivery.create({ ... });
  await tx.glassDeliveryItem.createMany({ ... });
  return delivery;
});
// ✅ Delivery + items razem
```

**Estimated Time:** 2-3 godziny
**Risk:** LOW (transaction utility już gotowy)
**Benefit:** Eliminuje partial failures, zwiększa data consistency

---

### P3.2 - parseInt Validation Helper (LOW)

**Co:** Stwórz helper do bezpiecznego parsowania ID z request params.

**Problem:**
```typescript
// ❌ Obecny kod w handlers:
const id = parseInt(request.params.id);
// NaN jeśli params.id = "abc" - może powodować bugs
```

**Rozwiązanie:**

#### Utility File: `src/utils/validation.ts`
```typescript
import { ValidationError } from './errors.js';

/**
 * Safely parse ID from request params
 * @throws ValidationError if invalid
 */
export function parseId(value: string | unknown, fieldName = 'ID'): number {
  const id = parseInt(String(value), 10);

  if (isNaN(id) || id <= 0) {
    throw new ValidationError(`Invalid ${fieldName}: must be positive integer`);
  }

  return id;
}

/**
 * Parse optional ID (allows null/undefined)
 */
export function parseOptionalId(value: string | unknown | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return parseId(value);
}

/**
 * Parse array of IDs
 */
export function parseIds(values: (string | unknown)[]): number[] {
  return values.map((v, i) => parseId(v, `ID at index ${i}`));
}
```

#### Usage w Handlers:
```typescript
import { parseId } from '../utils/validation.js';

// Before:
const deliveryId = parseInt(request.params.id);  // ❌ Unsafe

// After:
const deliveryId = parseId(request.params.id);   // ✅ Safe, throws ValidationError
```

**Gdzie zastosować:**
- `deliveryHandler.ts` - GET/PUT/DELETE/:id endpoints
- `orderHandler.ts` - All :id routes
- `warehouseHandler.ts` - Stock operations
- `glassDeliveryHandler.ts` - Glass operations
- ~10+ handlers total

**Estimated Time:** 1-2 godziny
**Risk:** VERY LOW (simple refactoring)
**Benefit:** Eliminuje NaN bugs, better error messages

---

### P3.3 - Error Tracking & Monitoring (MEDIUM)

**Co:** Dodaj production-grade error tracking (Sentry lub podobne).

**Setup:**

#### 1. Install Sentry
```bash
pnpm add @sentry/node @sentry/browser
```

#### 2. Backend Integration (`src/index.ts`)
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Error handler middleware
fastify.setErrorHandler((error, request, reply) => {
  Sentry.captureException(error, {
    tags: {
      endpoint: request.url,
      method: request.method,
    },
  });

  // ... existing error handling
});
```

#### 3. Frontend Integration (`src/app/layout.tsx`)
```typescript
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// React error boundary
<Sentry.ErrorBoundary fallback={ErrorFallback}>
  {children}
</Sentry.ErrorBoundary>
```

**Benefit:**
- Production error tracking
- Performance monitoring
- User session replay
- Error alerts

**Estimated Time:** 3-4 godziny (setup + testing)
**Cost:** Free tier available (10k events/month)

---

### P3.4 - Automated Testing (HIGH VALUE)

**Co:** Dodaj automated tests dla critical paths.

**Test Suite Structure:**

#### Backend Tests (`apps/api/src/tests/`)
```typescript
// optimistic-locking.test.ts
describe('Optimistic Locking', () => {
  it('should retry on version conflict', async () => {
    // Test retry logic
  });

  it('should fail after max retries', async () => {
    // Test max retry limit
  });
});

// transaction.test.ts
describe('Transaction Wrapper', () => {
  it('should rollback on error', async () => {
    // Test rollback
  });

  it('should commit on success', async () => {
    // Test commit
  });
});

// WarehouseRepository.test.ts
describe('WarehouseRepository', () => {
  it('should update stock with version check', async () => {
    // Test optimistic lock
  });

  it('should throw OptimisticLockError on conflict', async () => {
    // Test conflict
  });
});
```

#### Frontend Tests (`apps/web/src/app/dostawy/__tests__/`)
```typescript
// DostawyPageContent.test.tsx
describe('DostawyPageContent', () => {
  it('should show error UI on API failure', () => {
    // Mock API error
    // Assert error UI rendered
  });

  it('should retry on button click', () => {
    // Test retry functionality
  });
});
```

**Test Commands:**
```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test optimistic-locking.test.ts

# Run with coverage
pnpm test:coverage
```

**Estimated Time:** 1 dzień (setup + write tests)
**Benefit:** Prevents regressions, safe refactoring

---

### P3.5 - Database Query Performance Monitoring (LOW)

**Co:** Monitor slow queries i database performance.

**Implementation:**

#### Prisma Middleware (`src/utils/prisma-logger.ts`)
```typescript
import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

export function addQueryLogging(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    const start = Date.now();
    const result = await next(params);
    const duration = Date.now() - start;

    // Log slow queries (> 1s)
    if (duration > 1000) {
      logger.warn('Slow query detected', {
        model: params.model,
        action: params.action,
        duration,
      });
    }

    return result;
  });
}
```

**Usage:**
```typescript
import { addQueryLogging } from './utils/prisma-logger.js';

const prisma = new PrismaClient();
addQueryLogging(prisma);
```

**Benefit:**
- Identify slow queries
- Database optimization opportunities
- Performance regression detection

**Estimated Time:** 1 godzina
**Risk:** VERY LOW

---

## 📊 PRIORYTET ULEPSZEŃ

| Enhancement | Priority | Time | Benefit | Risk |
|-------------|----------|------|---------|------|
| Transaction Integration | MEDIUM | 2-3h | HIGH | LOW |
| parseInt Validation | LOW | 1-2h | MEDIUM | VERY LOW |
| Error Tracking | MEDIUM | 3-4h | HIGH | LOW |
| Automated Testing | HIGH | 1 day | VERY HIGH | LOW |
| Performance Monitoring | LOW | 1h | MEDIUM | VERY LOW |

---

## 🚀 ZALECANA KOLEJNOŚĆ

Jeśli zdecydujesz się kontynuować:

1. **Automated Testing** (1 day) - Największy ROI, zapobiega regresji
2. **Transaction Integration** (2-3h) - Zwiększa data consistency
3. **Error Tracking** (3-4h) - Production visibility
4. **Performance Monitoring** (1h) - Easy win
5. **parseInt Validation** (1-2h) - Code quality

**Total Estimated Time:** 2-3 dni robocze

---

## ⚠️ WAŻNE

**System jest już production-ready po FAZIE 1 i FAZIE 2.**

FAZA 3 to ulepszenia jakości kodu i monitoring - NIE są wymagane do działania systemu.

Zdecyduj czy chcesz kontynuować, czy deploy'ować obecny stan.

---

**Daj znać jeśli chcesz zaimplementować którąś z tych opcji!**
