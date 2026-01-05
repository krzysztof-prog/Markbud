# Edge Cases Analysis - AKROBUD System

> **Data analizy:** 2025-12-31
> **Wersja systemu:** Next.js 15.5.7, Fastify 4.x, Prisma 5.x, SQLite

## Spis treści

1. [Data Validation & Input Boundaries](#1-data-validation--input-boundaries)
2. [Concurrency & Race Conditions](#2-concurrency--race-conditions)
3. [Data Integrity & Database Relationships](#3-data-integrity--database-relationships)
4. [File Operations & Imports](#4-file-operations--imports)
5. [Date/Time & Timezone Handling](#5-datetime--timezone-handling)
6. [Numeric Precision & Overflow](#6-numeric-precision--overflow)
7. [Business Logic Edge Cases](#7-business-logic-edge-cases)
8. [Security & Authorization](#8-security--authorization)
9. [Error Handling & Recovery](#9-error-handling--recovery)
10. [Performance & Scalability](#10-performance--scalability)

---

## 1. Data Validation & Input Boundaries

### 1.1 Order Number Whitespace Normalization

**Severity:** 🟡 Medium
**Location:** [apps/api/src/validators/order.ts:14-19](apps/api/src/validators/order.ts#L14-L19)

**Problem:**
```typescript
const orderNumberSchema = z.string().trim()
  .regex(/^[\w\s-]+$/);
```

- `.trim()` normalizuje leading/trailing whitespace
- Ale wewnętrzne spacje są akceptowane
- Możliwe duplikaty: `"54222"` vs `"54222 "` vs `"54 222"`
- Brak case sensitivity handling: `"54222-A"` vs `"54222-a"`

**Scenariusz:**
```typescript
// Te wszystkie mogą być uznane za różne zlecenia:
"54222"
"54222 "
" 54222"
"54-222"
"54222-A"
"54222-a"
```

**Sugestia:**
```typescript
const orderNumberSchema = z.string()
  .trim()
  .transform(s => s.toUpperCase().replace(/\s+/g, ''))  // Normalizacja
  .regex(/^[\w-]+$/, 'Niedozwolone znaki w numerze zlecenia')
  .min(1, 'Numer zlecenia nie może być pusty')
  .max(50, 'Numer zlecenia zbyt długi');
```

---

### 1.2 Financial Value Boundaries

**Severity:** 🟡 Medium
**Location:** [apps/api/src/validators/order.ts:21-26](apps/api/src/validators/order.ts#L21-L26)

**Problem:**
```typescript
const financialValueSchema = z.number()
  .nonnegative()
  .max(999999999.99);
```

- Schema przyjmuje `number` ale Prisma używa `Int` (grosze?)
- Brak walidacji precyzji dziesiętnej (np. 0.001 vs 0.01)
- Brak informacji o jednostce (PLN w groszach? EUR w centach?)
- Overflow przy konwersji EUR↔PLN

**Scenariusz:**
```typescript
// Input: 100000.999 EUR
// Expected: 10000100 (grosze)
// Actual: 10000099.9 (float precision loss)

// Conversion overflow:
const eurValue = 999999999.99;
const plnRate = 450; // 4.50 PLN/EUR
const plnValue = eurValue * plnRate; // Przekracza MAX_SAFE_INTEGER?
```

**Sugestia:**
```typescript
// Zawsze przechowuj jako grosze/centy (Int)
const financialValueSchema = z.number()
  .int('Wartość musi być całkowita (w groszach)')
  .nonnegative('Wartość nie może być ujemna')
  .max(2147483647, 'Wartość zbyt duża'); // Int32 max

// Lub validation z precision:
const financialValueEuroSchema = z.number()
  .nonnegative()
  .refine(
    n => Number.isInteger(n * 100),
    'Maksymalna precyzja: 2 miejsca po przecinku'
  )
  .transform(n => Math.round(n * 100)); // Konwersja do centów
```

---

### 1.3 Pagination Boundary Cases

**Severity:** 🟢 Low
**Location:** [apps/api/src/validators/common.ts](apps/api/src/validators/common.ts)

**Problem:**
- Brak walidacji max page/limit
- Możliwe DoS przez `?page=999999&limit=999999`
- SQLite OFFSET performance degradation przy dużych page numbers

**Scenariusz:**
```typescript
GET /api/orders?page=100000&limit=10000
// → OFFSET 1000000000 LIMIT 10000
// → SQLite timeout lub OOM
```

**Sugestia:**
```typescript
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  // Dodaj cursor-based pagination dla dużych datasets
  cursor: z.string().optional(),
});
```

---

## 2. Concurrency & Race Conditions

### 2.1 OkucStock Version Field Unused

**Severity:** 🔴 Critical
**Location:** [apps/api/prisma/schema.prisma:769-779](apps/api/prisma/schema.prisma#L769-L779)

**Problem:**
```prisma
model OkucStock {
  version         Int      @default(0)  // ⚠️ Field istnieje ale NIE jest używany!
}
```

- `WarehouseStock` używa optimistic locking z `version`
- `OkucStock` ma pole `version` ale **brak implementacji**
- Concurrent updates na stanie okuć mogą prowadzić do race conditions

**Scenariusz:**
```typescript
// Thread 1: Odczyt stanu = 100, version = 5
const stock1 = await prisma.okucStock.findUnique({ where: { id: 1 } });

// Thread 2: Odczyt stanu = 100, version = 5
const stock2 = await prisma.okucStock.findUnique({ where: { id: 1 } });

// Thread 1: Update do 90
await prisma.okucStock.update({
  where: { id: 1 },
  data: { currentQuantity: 90 }  // ❌ Brak version check!
});

// Thread 2: Update do 80
await prisma.okucStock.update({
  where: { id: 1 },
  data: { currentQuantity: 80 }  // ❌ Nadpisuje change z Thread 1!
});

// Final state: 80 (powinno być 70 lub error)
```

**Sugestia:**
```typescript
// Implementacja identyczna jak dla WarehouseStock
import { withOptimisticLockRetry, OptimisticLockError } from '../utils/optimistic-locking.js';

async updateOkucStock(articleId: number, newQuantity: number, expectedVersion?: number) {
  return withOptimisticLockRetry(async () => {
    const current = await prisma.okucStock.findFirst({
      where: { articleId },
    });

    if (!current) throw new NotFoundError('Stock');

    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new OptimisticLockError(
        'Stock został zmodyfikowany przez inny proces',
        current.version
      );
    }

    return prisma.okucStock.update({
      where: { id: current.id, version: current.version },
      data: {
        currentQuantity: newQuantity,
        version: { increment: 1 },
      },
    });
  });
}
```

---

### 2.2 Import Lock Cleanup Race Condition

**Severity:** 🟠 High
**Location:** [apps/api/src/services/importLockService.ts:220-240](apps/api/src/services/importLockService.ts#L220-L240)

**Problem:**
```typescript
async checkLock(folderPath: string) {
  const lock = await this.prisma.importLock.findUnique({ ... });

  const isExpired = new Date() > lock.expiresAt;
  if (isExpired) {
    // ❌ Delete poza transaction - race condition!
    await this.prisma.importLock.delete({ where: { id: lock.id } });
    return null;
  }
}
```

**Scenariusz:**
```typescript
// Thread A: checkLock() → lock expired → rozpoczyna delete
// Thread B: checkLock() → lock expired → rozpoczyna delete
// Thread A: delete success
// Thread B: delete fails (P2025: Record not found)

// Lub:
// Thread A: checkLock() → lock expired → rozpoczyna delete
// Thread B: acquireLock() → próbuje utworzyć nowy lock
// Thread B: unique constraint violation (lock jeszcze istnieje)
```

**Sugestia:**
```typescript
async checkLock(folderPath: string): Promise<ImportLockWithUser | null> {
  return this.prisma.$transaction(async (tx) => {
    const lock = await tx.importLock.findUnique({
      where: { folderPath },
      include: { user: { select: { name: true } } },
    });

    if (!lock) return null;

    const isExpired = new Date() > lock.expiresAt;
    if (isExpired) {
      await tx.importLock.delete({ where: { id: lock.id } });
      return null;
    }

    return lock;
  });
}
```

---

### 2.3 ImportLock Cleanup Memory Leak

**Severity:** 🟡 Medium
**Location:** [apps/api/src/services/importLockService.ts:261-285](apps/api/src/services/importLockService.ts#L261-L285)

**Problem:**
- `cleanupExpiredLocks()` istnieje ale **nie jest automatycznie wywoływany**
- Brak cron job / scheduler
- Expired locks pozostają w DB i zajmują miejsce
- W długim terminie → degradacja performance

**Sugestia:**
```typescript
// apps/api/src/index.ts
import cron from 'node-cron';

// Cleanup co 15 minut
cron.schedule('*/15 * * * *', async () => {
  try {
    const lockService = new ImportLockService(prisma);
    const deletedCount = await lockService.cleanupExpiredLocks();
    logger.info(`Cleanup: deleted ${deletedCount} expired import locks`);
  } catch (error) {
    logger.error('Import lock cleanup failed', error);
  }
});
```

---

### 2.4 Concurrent Delivery Order Addition

**Severity:** 🟡 Medium
**Location:** [apps/api/src/repositories/DeliveryRepository.ts](apps/api/src/repositories/DeliveryRepository.ts)

**Problem:**
- Dodawanie zleceń do dostawy bez transaction wrappera
- Możliwy duplicate przy concurrent requests

**Scenariusz:**
```typescript
// User 1 i User 2 jednocześnie klikają "Dodaj zlecenie 54222 do dostawy 10"
// Thread A: Check if exists → not found
// Thread B: Check if exists → not found
// Thread A: Create DeliveryOrder
// Thread B: Create DeliveryOrder
// Result: Unique constraint violation lub duplicate
```

**Sugestia:**
```typescript
async addOrderToDelivery(deliveryId: number, orderId: number) {
  return this.prisma.$transaction(async (tx) => {
    // Atomic check-and-create
    const existing = await tx.deliveryOrder.findUnique({
      where: {
        deliveryId_orderId: { deliveryId, orderId }
      }
    });

    if (existing) {
      throw new ConflictError('Zlecenie już znajduje się w tej dostawie');
    }

    const maxPosition = await tx.deliveryOrder.aggregate({
      where: { deliveryId },
      _max: { position: true }
    });

    return tx.deliveryOrder.create({
      data: {
        deliveryId,
        orderId,
        position: (maxPosition._max.position ?? 0) + 1
      }
    });
  });
}
```

---

## 3. Data Integrity & Database Relationships

### 3.1 Cascade Delete Chains

**Severity:** 🔴 Critical
**Location:** [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma) (multiple)

**Problem:**
Usunięcie `Order` → **CASCADE** usuwa:
- `DeliveryOrder` (OK)
- `OrderRequirement` (OK)
- `OrderWindow` (OK)
- `Note` (⚠️ może zawierać ważne informacje)
- `GlassOrderItem` (⚠️ reference do order przez orderNumber string)

**Scenariusz:**
```typescript
// Admin przypadkowo usuwa zlecenie
await prisma.order.delete({ where: { id: 123 } });

// CASCADE usuwa:
// - 5 requirements (brak śladu co było zamówione)
// - 10 windows (brak śladu wymiarów)
// - 3 notes (utrata historii komunikacji z klientem)
// - Powiązania z GlassOrderItem przez orderNumber

// Nie ma SOFT DELETE - dane przepadają permanentnie!
```

**Sugestia:**
```typescript
// 1. Soft delete pattern
model Order {
  deletedAt DateTime? @map("deleted_at")
  deletedBy Int?      @map("deleted_by")

  @@index([deletedAt])
}

// 2. Audit trail
model OrderAudit {
  id          Int      @id @default(autoincrement())
  orderId     Int
  action      String   // 'delete', 'archive', 'restore'
  snapshot    String   // JSON snapshot przed usunięciem
  performedBy Int
  performedAt DateTime @default(now())
}

// 3. Change cascade to Restrict dla krytycznych relacji
model Note {
  order Order? @relation(fields: [orderId], references: [id], onDelete: Restrict)
}
```

---

### 3.2 Orphaned Records przez SetNull

**Severity:** 🟠 High
**Location:** [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma)

**Problem:**
```prisma
model GlassDeliveryItem {
  glassOrderId Int? @map("glass_order_id")
  glassOrder   GlassOrder? @relation(fields: [glassOrderId], references: [id], onDelete: SetNull)
}

model OkucDemand {
  orderId Int? @map("order_id")
  order   Order? @relation(fields: [orderId], references: [id], onDelete: SetNull)
}

model PendingOrderPrice {
  importId   Int? @map("import_id")
  fileImport FileImport? @relation(fields: [importId], references: [id], onDelete: SetNull)
}
```

**Scenariusz:**
```typescript
// 1. GlassDeliveryItem staje się orphaned
await prisma.glassOrder.delete({ where: { id: 5 } });
// → GlassDeliveryItem { glassOrderId: null }
// → Nie wiadomo do jakiego zamówienia należy

// 2. OkucDemand bez orderId
await prisma.order.delete({ where: { id: 123 } });
// → OkucDemand { orderId: null }
// → Zapotrzebowanie bez przypisania do zlecenia

// 3. PendingOrderPrice orphaned
await prisma.fileImport.delete({ where: { id: 10 } });
// → PendingOrderPrice { importId: null }
// → Utrata śledzenia źródła danych
```

**Sugestia:**
```typescript
// 1. Background job do cleanup orphaned records
async cleanupOrphanedRecords() {
  // GlassDeliveryItems bez glassOrderId
  const orphanedItems = await prisma.glassDeliveryItem.findMany({
    where: { glassOrderId: null, matchStatus: 'pending' }
  });

  // Log for manual review
  logger.warn(`Found ${orphanedItems.length} orphaned glass delivery items`);

  // OkucDemands bez orderId i source = 'order'
  const orphanedDemands = await prisma.okucDemand.deleteMany({
    where: { orderId: null, source: 'order' }
  });

  logger.info(`Deleted ${orphanedDemands.count} orphaned okuc demands`);
}

// 2. Lub zmień na Restrict + manual cleanup
onDelete: Restrict  // Force manual decision
```

---

### 3.3 Unique Constraint Violation Handling

**Severity:** 🟡 Medium
**Location:** Multiple locations

**Problem:**
```prisma
@@unique([profileId, colorId])
@@unique([orderId, schucoDeliveryId])
@@unique([glassOrderId, position])
```

- Brak konsekwentnego handling Prisma P2002 errors
- Niektóre miejsca throwują generic error zamiast user-friendly message

**Scenariusz:**
```typescript
// User próbuje dodać duplicate
await prisma.warehouseStock.create({
  data: { profileId: 1, colorId: 2, currentStockBeams: 100 }
});

// Error: "Unique constraint failed on the fields: (`profile_id`,`color_id`)"
// ❌ Niezrozumiałe dla użytkownika
```

**Sugestia:**
```typescript
// Centralized error handler
function handlePrismaError(error: unknown, context: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const fields = error.meta?.target as string[] | undefined;
      throw new ConflictError(
        `Rekord już istnieje dla ${fields?.join(', ') || 'podanych wartości'}`,
        { context, fields }
      );
    }
    if (error.code === 'P2025') {
      throw new NotFoundError(context);
    }
  }
  throw error;
}
```

---

## 4. File Operations & Imports

### 4.1 File Size Validation Bypass

**Severity:** 🟠 High
**Location:** [apps/api/src/utils/file-validation.ts:28](apps/api/src/utils/file-validation.ts#L28)

**Problem:**
```typescript
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
```

- Frontend i backend mają validation
- Ale **Puppeteer/Schuco scraping** może pobrać dowolnie duże pliki
- CSV parsing bez streaming → cały plik w pamięci

**Scenariusz:**
```typescript
// Schuco scraper pobiera 100MB CSV
const schucoData = await page.download('.csv');
// ❌ Brak size check

// CSV parser wczytuje całość do pamięci
const rows = fs.readFileSync(filepath, 'utf-8').split('\n');
// → OOM error przy dużych plikach
```

**Sugestia:**
```typescript
// 1. Streaming CSV parser
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';

async function parseCSVStream(filepath: string, maxRows = 100000) {
  const parser = createReadStream(filepath)
    .pipe(parse({ delimiter: ',', from_line: 2 }));

  const rows = [];
  let rowCount = 0;

  for await (const row of parser) {
    if (++rowCount > maxRows) {
      throw new ValidationError(`Plik przekracza limit ${maxRows} wierszy`);
    }
    rows.push(row);
  }

  return rows;
}

// 2. Schuco download size check
const response = await page.evaluate(() => {
  const link = document.querySelector('a.download-csv');
  return fetch(link.href, { method: 'HEAD' }).then(r => ({
    size: parseInt(r.headers.get('content-length') || '0'),
    type: r.headers.get('content-type')
  }));
});

if (response.size > MAX_FILE_SIZE) {
  throw new ValidationError(`Plik zbyt duży: ${(response.size / 1024 / 1024).toFixed(2)}MB`);
}
```

---

### 4.2 Filename Sanitization Edge Cases

**Severity:** 🟡 Medium
**Location:** [apps/api/src/services/import/importValidationService.ts](apps/api/src/services/import/importValidationService.ts)

**Problem:**
- Path traversal: `../../etc/passwd`
- Null bytes: `file\0.txt`
- Reserved names (Windows): `CON.csv`, `PRN.pdf`, `NUL.txt`
- Unicode normalization: `café.pdf` vs `café.pdf` (NFD vs NFC)

**Scenariusz:**
```typescript
// Path traversal attempt
uploadFile('../../sensitive/data.db', buffer);
// → Może zapisać poza uploads/

// Null byte injection
uploadFile('invoice.pdf\0.exe', buffer);
// → Może ominąć extension validation

// Reserved name
uploadFile('CON.csv', buffer);
// → Windows error

// Unicode homograph
uploadFile('pаyment.pdf', buffer);  // 'а' to Cyrillic
// → Może oszukać użytkowników
```

**Sugestia:**
```typescript
import path from 'path';

function sanitizeFilename(filename: string): string {
  // 1. Normalize Unicode
  let safe = filename.normalize('NFC');

  // 2. Remove path separators and null bytes
  safe = safe.replace(/[/\\:\0]/g, '_');

  // 3. Remove leading dots
  safe = safe.replace(/^\.+/, '');

  // 4. Limit length
  safe = safe.slice(0, 255);

  // 5. Check Windows reserved names
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  const basename = path.parse(safe).name;
  if (reserved.test(basename)) {
    safe = `_${safe}`;
  }

  // 6. Ensure has extension
  if (!path.extname(safe)) {
    safe += '.unknown';
  }

  return safe;
}
```

---

### 4.3 Concurrent Folder Import

**Severity:** 🟡 Medium
**Location:** [apps/api/src/services/importService.ts:576](apps/api/src/services/importService.ts#L576)

**Problem:**
```typescript
// Import lock prevents concurrent imports of SAME folder
// But what about DIFFERENT folders with SAME files?

// Folder A: /imports/user1/54222_uzyte_bele.csv
// Folder B: /imports/user2/54222_uzyte_bele.csv

// Both import concurrently → duplicate order creation?
```

**Scenariusz:**
```typescript
// Thread A: Import z folderu /user1/
const preview1 = await parseCSV('/user1/54222_uzyte_bele.csv');
// orderNumber: "54222"

// Thread B: Import z folderu /user2/
const preview2 = await parseCSV('/user2/54222_uzyte_bele.csv');
// orderNumber: "54222"

// Thread A: Create order "54222"
// Thread B: Create order "54222"
// → Unique constraint violation

// LUB jeśli jeden succeed:
// → Drugi failuje z cryptic error
```

**Sugestia:**
```typescript
// 1. Lock na orderNumber zamiast folderPath
async importWithOrderLock(orderNumber: string, userId: number, action: () => Promise<void>) {
  const lockService = new ImportLockService(prisma);
  const lock = await lockService.acquireLock(`order:${orderNumber}`, userId);

  try {
    await action();
  } finally {
    if (lock) {
      await lockService.releaseLock(lock.id);
    }
  }
}

// 2. Atomic upsert zamiast check-then-create
async importOrder(data: OrderData) {
  return prisma.order.upsert({
    where: { orderNumber: data.orderNumber },
    update: { ...data, updatedAt: new Date() },
    create: data
  });
}
```

---

## 5. Date/Time & Timezone Handling

### 5.1 SQLite Timezone Loss

**Severity:** 🔴 Critical
**Location:** Multiple locations using `Date` with SQLite

**Problem:**
```typescript
// JavaScript
const deliveryDate = new Date('2025-01-15T10:00:00+01:00'); // CET
await prisma.delivery.create({ data: { deliveryDate } });

// SQLite storage (no timezone info)
// "2025-01-15 09:00:00.000"  ← UTC-converted string

// Later retrieval
const delivery = await prisma.delivery.findUnique(...);
console.log(delivery.deliveryDate);
// → Date object w LOCAL timezone (może być inny!)

// Comparisons fail
const isSameDay = delivery.deliveryDate.getDate() === 15;
// → może być false w zależności od timezone
```

**Scenariusz:**
```typescript
// Server timezone: UTC
// User timezone: Europe/Warsaw (UTC+1)

// User wybiera datę: 2025-01-15 (midnight jego czasu)
const userDate = new Date('2025-01-15T00:00:00+01:00');

// Zapisane w DB jako UTC:
// "2025-01-14T23:00:00.000Z"

// User później widzi:
// "14 stycznia" ← dzień wcześniej!
```

**Sugestia:**
```typescript
// 1. Zawsze używaj UTC dla date-only values
function toUTCDateOnly(date: Date | string): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// 2. Store dates as ISO string in UTC
model Delivery {
  deliveryDate String @map("delivery_date") // "2025-01-15" (date-only)
}

// 3. Frontend: explicit timezone handling
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';

function displayDate(dateStr: string) {
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return formatInTimeZone(dateStr, userTz, 'yyyy-MM-dd');
}

// 4. Validation: ensure dates are start-of-day UTC
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
```

---

### 5.2 Week Number Calculation Inconsistency

**Severity:** 🟡 Medium
**Location:** [apps/api/src/utils/date-helpers.ts:234](apps/api/src/utils/date-helpers.ts#L234)

**Problem:**
```typescript
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // ...
}
```

- Używa UTC ale input `date` może być w local timezone
- ISO week vs US week (niedziela vs poniedziałek jako start)
- Cross-year weeks (2024-W01 może zawierać dni z 2023)

**Scenariusz:**
```typescript
// Koniec roku
const date1 = new Date('2024-12-30'); // Monday
const week1 = getWeekNumber(date1); // → 2025-W01

// Import z OkucDemand expectedWeek: "2024-W53"
// vs calendar pokazuje "2025-W01"
// → Mismatch w UI
```

**Sugestia:**
```typescript
import { getISOWeek, parseISO } from 'date-fns';

// Consistently używaj date-fns dla ISO weeks
export function getWeekNumber(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const year = d.getFullYear();
  const week = getISOWeek(d);

  // Handle cross-year weeks
  if (week === 1 && d.getMonth() === 11) {
    return `${year + 1}-W${week.toString().padStart(2, '0')}`;
  }
  if (week >= 52 && d.getMonth() === 0) {
    return `${year - 1}-W${week.toString().padStart(2, '0')}`;
  }

  return `${year}-W${week.toString().padStart(2, '0')}`;
}
```

---

### 5.3 Date Comparison Without Normalization

**Severity:** 🟡 Medium
**Location:** Multiple locations

**Problem:**
```typescript
// Delivery filtering by date range
const deliveries = await prisma.delivery.findMany({
  where: {
    deliveryDate: {
      gte: new Date(startDate),  // ⚠️ Includes time!
      lte: new Date(endDate)     // ⚠️ Excludes same day!
    }
  }
});
```

**Scenariusz:**
```typescript
// User wybiera zakres: 2025-01-15 do 2025-01-20

// Frontend wysyła:
startDate = "2025-01-15T08:30:00.000Z"  // User's current time
endDate = "2025-01-20T08:30:00.000Z"

// DB query:
WHERE delivery_date >= "2025-01-15 08:30:00"
  AND delivery_date <= "2025-01-20 08:30:00"

// Dostawy z 2025-01-20 po 08:30 nie są included!
// Dostawy z 2025-01-15 przed 08:30 nie są included!
```

**Sugestia:**
```typescript
// Backend normalization
function normalizeDateRange(start: string, end: string) {
  const startDate = new Date(start);
  startDate.setUTCHours(0, 0, 0, 0);

  const endDate = new Date(end);
  endDate.setUTCHours(23, 59, 59, 999);

  return { startDate, endDate };
}

// Or use date-only strings
const deliveries = await prisma.$queryRaw`
  SELECT * FROM deliveries
  WHERE DATE(delivery_date) >= ${startDate}
    AND DATE(delivery_date) <= ${endDate}
`;
```

---

## 6. Numeric Precision & Overflow

### 6.1 parseInt Without Radix

**Severity:** 🟡 Medium
**Location:** [apps/api/src/validators/glass.ts:12](apps/api/src/validators/glass.ts#L12), [schuco.ts:11](apps/api/src/validators/schuco.ts#L11)

**Problem:**
```typescript
const num = parseInt(val, 10);  // ✅ OK
const num = parseInt(val);      // ❌ Missing radix
```

**Scenariusz:**
```typescript
// Leading zeros interpreted as octal in old JS
parseInt('08');  // → 0 (octal interpretation)
parseInt('08', 10);  // → 8 (decimal)

// Hex strings
parseInt('0x10');  // → 16
parseInt('0x10', 10);  // → 0
```

**Sugestia:**
```typescript
// ESLint rule
"radix": ["error", "always"]

// Zod schema
z.string().transform((v, ctx) => {
  const num = Number(v);
  if (!Number.isFinite(num)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Nieprawidłowa liczba'
    });
    return z.NEVER;
  }
  return Math.floor(num);
})
```

---

### 6.2 Float to Int Conversion Loss

**Severity:** 🟠 High
**Location:** Database schema - money fields

**Problem:**
```prisma
model Order {
  valuePln Int? @map("value_pln")  // Grosze?
  valueEur Int? @map("value_eur")  // Centy?
}

model PendingOrderPrice {
  valueNetto  Int  // Grosze?
  valueBrutto Int? // Grosze?
}
```

- Brak dokumentacji czy wartości są w groszach
- Frontend może wysyłać złotówki zamiast groszy
- PDF parser może zwracać float

**Scenariusz:**
```typescript
// PDF parser
const parsed = { valueNetto: 1250.50 };  // 1250.50 PLN

// Service
await prisma.pendingOrderPrice.create({
  data: {
    valueNetto: parsed.valueNetto  // ❌ 1250.5 → 1250 (truncation!)
  }
});

// Expected: 125050 groszy
// Actual: 1250 groszy (12.50 PLN) - BŁĄD!
```

**Sugestia:**
```typescript
// 1. Explicit conversion functions
function plnToGrosze(pln: number): number {
  return Math.round(pln * 100);
}

function groszeToPlN(grosze: number): number {
  return grosze / 100;
}

// 2. Type safety
type Grosze = number & { __brand: 'grosze' };
type PLN = number & { __brand: 'pln' };

// 3. Schema comment
model Order {
  valuePln Int? @map("value_pln")  // in grosze (1 PLN = 100 grosze)
  valueEur Int? @map("value_eur")  // in cents (1 EUR = 100 cents)
}

// 4. Validation
const financialValueSchema = z.number()
  .refine(n => Number.isInteger(n * 100), 'Max 2 decimal places')
  .transform(plnToGrosze);
```

---

### 6.3 Currency Conversion Overflow

**Severity:** 🟡 Medium
**Location:** Anywhere EUR↔PLN conversion happens

**Problem:**
```typescript
const maxValue = 999999999.99;  // Max from validator
const eurToPlnRate = 450; // 4.50 PLN/EUR (stored as grosze)

const plnValue = Math.round(maxValue * eurToPlnRate / 100);
// → 4499999999.955 → rounds to 4500000000
// → Exceeds Int32 max (2147483647)
// → Overflow!
```

**Scenariusz:**
```typescript
// Large EUR order
const orderEur = 999999999; // centy
const rate = 450; // 4.50 PLN/EUR

// Conversion
const orderPln = Math.round(orderEur * rate / 100);
// → 4499999995

// Prisma insert
await prisma.order.update({
  data: { valuePln: orderPln }
});
// → SQLite Int overflow lub truncation
```

**Sugestia:**
```typescript
// 1. Use BigInt for large monetary values
model Order {
  valuePln BigInt? @map("value_pln")  // Can store larger values
  valueEur BigInt? @map("value_eur")
}

// 2. Validate before conversion
function convertEurToPlnGrosze(eurCents: number, rate: number): number {
  const plnGrosze = Math.round(eurCents * rate / 100);

  if (plnGrosze > Number.MAX_SAFE_INTEGER) {
    throw new ValidationError('Wartość po konwersji przekracza maksymalną');
  }

  return plnGrosze;
}

// 3. Or use Decimal type (requires different DB)
// Prisma Decimal works with PostgreSQL, MySQL
```

---

## 7. Business Logic Edge Cases

### 7.1 Order Status Transitions Unvalidated

**Severity:** 🟠 High
**Location:** No status transition validation found

**Problem:**
```typescript
// Brak state machine - możliwe nielegalne transitions:
// completed → new
// archived → in_progress
// deleted → completed
```

**Scenariusz:**
```typescript
// Order lifecycle: new → in_progress → completed → archived

// User accidentally clicks "Nowe" na completed order
await prisma.order.update({
  where: { id: 123 },
  data: { status: 'new' }  // ❌ Invalid transition!
});

// Consequences:
// - Delivery may reference "new" order
// - Production metrics corrupted
// - Invoicing confusion
```

**Sugestia:**
```typescript
type OrderStatus = 'new' | 'in_progress' | 'completed' | 'archived';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ['in_progress', 'archived'],
  in_progress: ['completed', 'new'],  // Can revert to new
  completed: ['archived'],
  archived: [],  // Terminal state
};

function validateStatusTransition(from: OrderStatus, to: OrderStatus): void {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new ValidationError(
      `Niedozwolona zmiana statusu: ${from} → ${to}`,
      { from, to, allowed: VALID_TRANSITIONS[from] }
    );
  }
}

// In service
async updateOrderStatus(orderId: number, newStatus: OrderStatus) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  validateStatusTransition(order.status as OrderStatus, newStatus);

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      ...(newStatus === 'completed' && { completedAt: new Date() })
    }
  });
}
```

---

### 7.2 Delivery Without Orders

**Severity:** 🟡 Medium
**Location:** Delivery creation logic

**Problem:**
- Możliwość utworzenia dostawy bez żadnych zleceń
- Empty delivery → optymalizacja palet failuje
- Protokół PDF zawiera puste tabele

**Scenariusz:**
```typescript
// User tworzy nową dostawę
await prisma.delivery.create({
  data: {
    deliveryDate: new Date('2025-01-20'),
    status: 'planned'
  }
});

// Later: User próbuje wygenerować protocol
const delivery = await getDeliveryById(123);
// delivery.deliveryOrders = []

// PDF generation
generateProtocol(delivery);
// → Empty tables, no content
```

**Sugestia:**
```typescript
// 1. Validation przy generowaniu protokołu
async generateProtocol(deliveryId: number) {
  const delivery = await getDeliveryWithOrders(deliveryId);

  if (delivery.deliveryOrders.length === 0) {
    throw new ValidationError('Nie można wygenerować protokołu dla pustej dostawy');
  }

  // ...
}

// 2. Prevent status change to 'loading' without orders
async updateDeliveryStatus(deliveryId: number, newStatus: string) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { deliveryOrders: true }
  });

  if (newStatus === 'loading' && delivery.deliveryOrders.length === 0) {
    throw new ValidationError('Dodaj zlecenia przed rozpoczęciem załadunku');
  }

  // ...
}
```

---

### 7.3 Negative Stock After Demand

**Severity:** 🟠 High
**Location:** [apps/api/src/services/warehouse-service.ts](apps/api/src/services/warehouse-service.ts)

**Problem:**
```typescript
// Obliczenie afterDemand = currentStock - demand
// Może być ujemne ale brak walidacji

const row: WarehouseRow = {
  currentStock: 50,
  demand: 100,
  afterDemand: -50,  // ❌ Negative!
  isNegative: true
};
```

**Scenariusz:**
```typescript
// Profile: Beam 123, Color: RAL9016
// Stock: 50 beams
// Active orders need: 100 beams

// User próbuje rozpocząć produkcję
await updateOrderStatus(orderId, 'in_progress');

// ❌ Brak sprawdzenia czy materiały są dostępne
// → Produkcja started z niewystarczającym zapasem
// → Opóźnienia, chaos

// Powinno:
if (afterDemand < 0 && !hasWarehouseOrder) {
  throw new ValidationError(
    `Niewystarczający zapas ${profileNumber} ${colorCode}. ` +
    `Brakuje ${Math.abs(afterDemand)} belek. ` +
    `Złóż zamówienie do dostawcy przed rozpoczęciem produkcji.`
  );
}
```

**Sugestia:**
```typescript
// Warehouse shortage validation
async validateMaterialAvailability(orderId: number): Promise<ValidationResult> {
  const requirements = await prisma.orderRequirement.findMany({
    where: { orderId },
    include: { profile: true, color: true }
  });

  const shortages: Shortage[] = [];

  for (const req of requirements) {
    const stock = await prisma.warehouseStock.findUnique({
      where: { profileId_colorId: { profileId: req.profileId, colorId: req.colorId } }
    });

    if (!stock || stock.currentStockBeams < req.beamsCount) {
      shortages.push({
        profileNumber: req.profile.number,
        colorCode: req.color.code,
        required: req.beamsCount,
        available: stock?.currentStockBeams ?? 0,
        shortage: req.beamsCount - (stock?.currentStockBeams ?? 0)
      });
    }
  }

  return {
    isValid: shortages.length === 0,
    shortages
  };
}

// Before starting production
const validation = await validateMaterialAvailability(orderId);
if (!validation.isValid) {
  throw new ValidationError('Niewystarczające zapasy', {
    shortages: validation.shortages
  });
}
```

---

### 7.4 Pallet Optimization Without Profile Depths

**Severity:** 🟡 Medium
**Location:** [apps/api/src/services/delivery/DeliveryOptimizationService.ts:195](apps/api/src/services/delivery/DeliveryOptimizationService.ts#L195)

**Problem:**
```typescript
if (missingProfiles.size > 0) {
  // Throw error - optimization can't continue
}
```

- Nowe profile types mogą być dodane bez depth configuration
- Optymalizacja failuje hard zamiast używać default

**Scenariusz:**
```typescript
// Admin dodaje nowy profil
await prisma.profile.create({
  data: {
    number: 'NEW-PROFILE-2025',
    name: 'Nowy profil',
    // ❌ Zapomniał dodać ProfileDepth
  }
});

// Later: User dodaje zlecenie z tym profilem
// User próbuje optymalizować dostawę
// → Error: "Missing profile depths for: NEW-PROFILE-2025"
// → Cała optymalizacja failuje
```

**Sugestia:**
```typescript
// 1. Default depth value
const DEFAULT_PROFILE_DEPTH_MM = 100;

async getProfileDepth(profileType: string): Promise<number> {
  const depth = await prisma.profileDepth.findUnique({
    where: { profileType }
  });

  if (!depth) {
    logger.warn(`Missing profile depth for ${profileType}, using default ${DEFAULT_PROFILE_DEPTH_MM}mm`);
    return DEFAULT_PROFILE_DEPTH_MM;
  }

  return depth.depthMm;
}

// 2. Validation przy tworzeniu profilu
async createProfile(data: CreateProfileInput) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.create({ data });

    // Auto-create default profile depth
    await tx.profileDepth.create({
      data: {
        profileType: profile.number,
        depthMm: DEFAULT_PROFILE_DEPTH_MM,
        description: 'Auto-generated default depth'
      }
    });

    return profile;
  });
}
```

---

## 8. Security & Authorization

### 8.1 Missing User Context in Operations

**Severity:** 🟠 High
**Location:** Multiple services

**Problem:**
- Wiele operacji nie zapisuje `userId` mimo że pole istnieje w schema
- Brak audit trail kto co zrobił

**Scenariusz:**
```prisma
model WarehouseHistory {
  recordedById Int? @map("recorded_by_id")  // ⚠️ Optional!
}

model Note {
  createdById Int? @map("created_by_id")  // ⚠️ Optional!
}
```

```typescript
// Ktoś usuwa zlecenie
await prisma.order.delete({ where: { id: 123 } });

// Audit trail:
// ❌ Brak informacji KTO usunął
// ❌ Brak timestampu KIEDY usunął
// ❌ Niemożność odtworzenia historii zmian
```

**Sugestia:**
```typescript
// 1. Require userId in all mutation services
class WarehouseService {
  constructor(
    private repository: WarehouseRepository,
    private currentUserId: number  // ✅ Required
  ) {}

  async updateStock(profileId: number, colorId: number, newStock: number) {
    return this.repository.updateStock({
      profileId,
      colorId,
      newStock,
      updatedById: this.currentUserId  // ✅ Always recorded
    });
  }
}

// 2. Middleware injects userId from JWT
fastify.decorateRequest('userId', null);

fastify.addHook('preHandler', async (request, reply) => {
  const token = extractToken(request);
  if (token) {
    const decoded = decodeToken(token);
    request.userId = decoded.userId;
  }
});

// 3. Make audit fields required
model WarehouseHistory {
  recordedById Int @map("recorded_by_id")  // ✅ Required
  recordedAt   DateTime @default(now())
}
```

---

### 8.2 WebSocket Memory Leak - Rate Limit Map

**Severity:** 🟡 Medium
**Location:** [apps/api/src/plugins/websocket.ts:32](apps/api/src/plugins/websocket.ts#L32)

**Problem:**
```typescript
const connectionRateLimits = new Map<string, RateLimitInfo>();

// ❌ Map nigdy nie jest czyszczony!
// Każde połączenie dodaje entry
// Disconnected connections pozostają w Map
// → Memory leak w long-running server
```

**Scenariusz:**
```typescript
// Day 1: 100 users connect → 100 entries in Map
// Day 2: 200 users connect → 300 entries (100 old + 200 new)
// Day 30: 6000 users total → Map has 6000 entries
// → Memory usage: ~1MB just for rate limiting
// → Eventually: OOM
```

**Sugestia:**
```typescript
// 1. Cleanup on disconnect
connection.socket.on('close', () => {
  activeConnections.delete(connection as AuthenticatedConnection);

  // Cleanup rate limit entry
  const connectionId = `${connection.userId}-${connection.socket.remoteAddress}`;
  connectionRateLimits.delete(connectionId);

  logger.debug('WebSocket disconnected and cleaned up', { connectionId });
});

// 2. Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, limit] of connectionRateLimits.entries()) {
    if (now > limit.resetAt + 60000) {  // 1 minute grace period
      connectionRateLimits.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired rate limit entries`);
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

---

### 8.3 WebSocket Missing Heartbeat

**Severity:** 🟡 Medium
**Location:** [apps/api/src/plugins/websocket.ts](apps/api/src/plugins/websocket.ts)

**Problem:**
- Brak ping/pong mechanism
- Dead connections remain in `activeConnections`
- Broadcast wysyła do dead connections

**Scenariusz:**
```typescript
// User's browser crashes
// → TCP connection remains open (timeout: 2 hours default)
// → activeConnections still contains this connection
// → broadcasts try to send to dead connection
// → Error or hang

// After 1000 dead connections:
// → broadcast becomes slow
// → Real users experience lag
```

**Sugestia:**
```typescript
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 35000;  // 35 seconds

connection.socket.on('open', () => {
  const heartbeatTimer = setInterval(() => {
    if (connection.socket.readyState === connection.socket.OPEN) {
      connection.socket.ping();
    }
  }, HEARTBEAT_INTERVAL);

  let pongReceived = true;

  connection.socket.on('pong', () => {
    pongReceived = true;
  });

  const timeoutTimer = setInterval(() => {
    if (!pongReceived) {
      logger.warn('WebSocket heartbeat timeout, closing connection');
      connection.socket.close();
    }
    pongReceived = false;
  }, HEARTBEAT_TIMEOUT);

  connection.socket.on('close', () => {
    clearInterval(heartbeatTimer);
    clearInterval(timeoutTimer);
  });
});
```

---

## 9. Error Handling & Recovery

### 9.1 Partial Transaction Rollback

**Severity:** 🟠 High
**Location:** Multiple transaction implementations

**Problem:**
```typescript
// Transaction with multiple async operations
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ ... });

  // External API call - NOT rolled back if fails!
  await sendNotificationEmail(order);

  const delivery = await tx.delivery.create({ ... });
});
```

**Scenariusz:**
```typescript
// Transaction starts
const order = await tx.order.create({ ... });  // ✅ Success

// External service called
await sendNotificationEmail(order);  // ❌ Timeout after 30s

// Transaction already committed Order!
// → Order exists in DB
// → No email sent
// → Inconsistent state
```

**Sugestia:**
```typescript
// 1. Separate transactions from side effects
async createOrderWithNotification(data: OrderData) {
  // Transaction: only DB operations
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({ data });

    await tx.orderRequirement.createMany({
      data: data.requirements
    });

    return newOrder;
  });

  // Side effects: after transaction committed
  try {
    await sendNotificationEmail(order);
  } catch (error) {
    // Log but don't rollback - order is already created
    logger.error('Failed to send notification', { orderId: order.id, error });

    // Queue for retry
    await notificationQueue.add({ orderId: order.id, type: 'order_created' });
  }

  return order;
}

// 2. Idempotent retry mechanism
interface NotificationJob {
  orderId: number;
  type: string;
  attempts: number;
}

async function processNotificationQueue() {
  const jobs = await getFailedNotifications();

  for (const job of jobs) {
    if (job.attempts < 3) {
      try {
        await sendNotificationEmail(job.orderId);
        await markNotificationSuccess(job.id);
      } catch (error) {
        await incrementAttempts(job.id);
      }
    }
  }
}
```

---

### 9.2 Silent Error Swallowing

**Severity:** 🟡 Medium
**Location:** Multiple `.catch()` handlers

**Problem:**
```typescript
// importLockService.ts:234
await this.prisma.importLock.delete({ where: { id: lock.id } })
  .catch((error) => {
    // Log but don't throw - another process may have deleted it
    logger.warn('Failed to delete expired lock during check', {
      lockId: lock.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });

// ⚠️ Wszystkie błędy są swallowed - nawet unexpected ones
```

**Scenariusz:**
```typescript
// Database connection lost
await prisma.importLock.delete({ ... });
// → PrismaClientKnownRequestError: Connection timeout

// .catch() logs warning but continues
// → Function returns as if delete succeeded
// → Lock remains in DB
// → Next import may hit "already locked" error
```

**Sugestia:**
```typescript
// Only catch expected errors
await this.prisma.importLock.delete({ where: { id: lock.id } })
  .catch((error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        // Record not found - expected, safe to ignore
        logger.debug('Lock already deleted', { lockId: lock.id });
        return;
      }
    }

    // Unexpected error - rethrow
    logger.error('Unexpected error deleting lock', { lockId: lock.id, error });
    throw error;
  });
```

---

## 10. Performance & Scalability

### 10.1 N+1 Query Problem

**Severity:** 🟠 High
**Location:** Multiple repositories and services

**Problem:**
```typescript
// Get all orders
const orders = await prisma.order.findMany();

// For each order, fetch requirements (N queries!)
for (const order of orders) {
  const requirements = await prisma.orderRequirement.findMany({
    where: { orderId: order.id }
  });
  // ...
}

// Total queries: 1 + N
```

**Scenariusz:**
```typescript
// Dashboard loads 100 orders
// Each order needs requirements, windows, delivery info
// → 1 query for orders
// → 100 queries for requirements
// → 100 queries for windows
// → 100 queries for deliveries
// = 301 queries!
// → Page load time: 5+ seconds
```

**Sugestia:**
```typescript
// Use Prisma includes
const orders = await prisma.order.findMany({
  include: {
    requirements: {
      include: {
        profile: true,
        color: true
      }
    },
    windows: true,
    deliveryOrders: {
      include: {
        delivery: true
      }
    }
  }
});

// Total: 1 query with JOINs
// Page load: <1 second
```

---

### 10.2 Bulk Operations Without Batching

**Severity:** 🟡 Medium
**Location:** 32 files using updateMany/deleteMany

**Problem:**
```typescript
// Update 10,000 orders at once
await prisma.order.updateMany({
  where: { status: 'new' },
  data: { status: 'archived' }
});

// ⚠️ Single transaction locks table
// ⚠️ May timeout
// ⚠️ Blocks other operations
```

**Scenariusz:**
```typescript
// Admin clicks "Archiwuj wszystkie stare zlecenia"
const result = await prisma.order.updateMany({
  where: {
    createdAt: { lt: new Date('2024-01-01') },
    status: 'completed'
  },
  data: { status: 'archived', archivedAt: new Date() }
});

// Affects 5000+ orders
// → SQLite locks entire orders table
// → Other users can't create/update orders
// → Request timeout after 30s
// → Partial update - some archived, some not
```

**Sugestia:**
```typescript
async function bulkUpdateWithBatching<T>(
  items: T[],
  batchSize: number,
  updateFn: (batch: T[]) => Promise<unknown>
): Promise<{ total: number; success: number; failed: number }> {
  const results = { total: items.length, success: 0, failed: 0 };

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    try {
      await updateFn(batch);
      results.success += batch.length;
    } catch (error) {
      logger.error(`Batch ${i / batchSize + 1} failed`, error);
      results.failed += batch.length;
    }

    // Give database a break between batches
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

// Usage
const orderIds = await prisma.order.findMany({
  where: { status: 'completed', createdAt: { lt: oneYearAgo } },
  select: { id: true }
});

const results = await bulkUpdateWithBatching(
  orderIds,
  100,  // 100 orders per batch
  async (batch) => {
    await prisma.order.updateMany({
      where: { id: { in: batch.map(o => o.id) } },
      data: { status: 'archived', archivedAt: new Date() }
    });
  }
);

logger.info('Bulk archive completed', results);
```

---

### 10.3 Missing Database Indexes

**Severity:** 🟡 Medium
**Location:** Various queries

**Problem:**
```typescript
// Frequently used queries without indexes

// 1. Filter by multiple fields
WHERE status = 'new' AND archived_at IS NULL

// 2. Date range queries
WHERE delivery_date >= ? AND delivery_date <= ?

// 3. Foreign key lookups without index
WHERE created_by_id = ?
```

**Sugestia:**
```prisma
model Order {
  // Composite indexes for common query patterns
  @@index([status, archivedAt, createdAt])
  @@index([deliveryDate, status])
  @@index([client, status])
}

model WarehouseHistory {
  // Add index for userId lookups
  @@index([recordedById])
  @@index([recordedAt, changeType])
}

model Note {
  // Missing index
  @@index([createdById])
  @@index([orderId, createdAt])
}
```

---

## Podsumowanie i Priorytety

### 🔴 Critical (Immediate Action Required)

1. **OkucStock Optimistic Locking** - Implement version field usage
2. **SQLite Timezone Loss** - Standardize on UTC date-only strings
3. **Cascade Delete Audit** - Implement soft delete + audit trail

### 🟠 High (Plan for Next Sprint)

4. **Import Lock Cleanup Race** - Use transactions
5. **Negative Stock Validation** - Prevent production without materials
6. **User Context Missing** - Require userId in all mutations
7. **N+1 Queries** - Add includes to common queries
8. **Float to Int Money** - Document and enforce grosze/centy

### 🟡 Medium (Backlog)

9. **Order Status Transitions** - Implement state machine
10. **WebSocket Memory Leak** - Add cleanup on disconnect
11. **Bulk Operations** - Add batching for large updates
12. **File Size Bypass** - Add streaming parsers
13. **Week Number Inconsistency** - Use date-fns consistently

### 🟢 Low (Nice to Have)

14. **Pagination Limits** - Add max page/limit
15. **Database Indexes** - Add missing composite indexes
16. **WebSocket Heartbeat** - Implement ping/pong
17. **Silent Error Swallowing** - Only catch expected errors

---

## Następne Kroki

1. **Code Review** - Przejrzyj ten dokument z zespołem
2. **Priorytetyzacja** - Wybierz top 5 do implementacji
3. **Testy** - Dodaj testy dla zidentyfikowanych edge cases
4. **Dokumentacja** - Zaktualizuj [anti-patterns.md](anti-patterns.md)
5. **Monitoring** - Dodaj alerty dla critical issues

**Narzędzia do rozważenia:**
- Sentry/error tracking dla production errors
- Database query analyzer dla N+1 detection
- Load testing dla bulk operations
- Type-safe schemas (Zod) dla wszystkich inputs
