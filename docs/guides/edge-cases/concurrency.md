# Concurrency & Race Conditions

> **Powrót do:** [Edge Cases README](./README.md) | [Oryginalny dokument](../EDGE_CASES_ANALYSIS.md)

---

## 2.1 OkucStock Version Field Unused

**Severity:** CRITICAL
**Location:** [../../apps/api/prisma/schema.prisma:769-779](../../apps/api/prisma/schema.prisma#L769-L779)

**Problem:**
```prisma
model OkucStock {
  version         Int      @default(0)  // Field istnieje ale NIE jest uzywany!
}
```

- `WarehouseStock` uzywa optimistic locking z `version`
- `OkucStock` ma pole `version` ale **brak implementacji**
- Concurrent updates na stanie okuc moga prowadzic do race conditions

**Scenariusz:**
```typescript
// Thread 1: Odczyt stanu = 100, version = 5
const stock1 = await prisma.okucStock.findUnique({ where: { id: 1 } });

// Thread 2: Odczyt stanu = 100, version = 5
const stock2 = await prisma.okucStock.findUnique({ where: { id: 1 } });

// Thread 1: Update do 90
await prisma.okucStock.update({
  where: { id: 1 },
  data: { currentQuantity: 90 }  // Brak version check!
});

// Thread 2: Update do 80
await prisma.okucStock.update({
  where: { id: 1 },
  data: { currentQuantity: 80 }  // Nadpisuje change z Thread 1!
});

// Final state: 80 (powinno byc 70 lub error)
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
        'Stock zostal zmodyfikowany przez inny proces',
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

## 2.2 Import Lock Cleanup Race Condition

**Severity:** HIGH
**Location:** [../../apps/api/src/services/importLockService.ts:220-240](../../apps/api/src/services/importLockService.ts#L220-L240)

**Problem:**
```typescript
async checkLock(folderPath: string) {
  const lock = await this.prisma.importLock.findUnique({ ... });

  const isExpired = new Date() > lock.expiresAt;
  if (isExpired) {
    // Delete poza transaction - race condition!
    await this.prisma.importLock.delete({ where: { id: lock.id } });
    return null;
  }
}
```

**Scenariusz:**
```typescript
// Thread A: checkLock() -> lock expired -> rozpoczyna delete
// Thread B: checkLock() -> lock expired -> rozpoczyna delete
// Thread A: delete success
// Thread B: delete fails (P2025: Record not found)

// Lub:
// Thread A: checkLock() -> lock expired -> rozpoczyna delete
// Thread B: acquireLock() -> probuje utworzyc nowy lock
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

## 2.3 ImportLock Cleanup Memory Leak

**Severity:** Medium
**Location:** [../../apps/api/src/services/importLockService.ts:261-285](../../apps/api/src/services/importLockService.ts#L261-L285)

**Problem:**
- `cleanupExpiredLocks()` istnieje ale **nie jest automatycznie wywolywany**
- Brak cron job / scheduler
- Expired locks pozostaja w DB i zajmuja miejsce
- W dlugim terminie -> degradacja performance

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

## 2.4 Concurrent Delivery Order Addition

**Severity:** Medium
**Location:** [../../apps/api/src/repositories/DeliveryRepository.ts](../../apps/api/src/repositories/DeliveryRepository.ts)

**Problem:**
- Dodawanie zlecen do dostawy bez transaction wrappera
- Mozliwy duplicate przy concurrent requests

**Scenariusz:**
```typescript
// User 1 i User 2 jednoczesnie klikaja "Dodaj zlecenie 54222 do dostawy 10"
// Thread A: Check if exists -> not found
// Thread B: Check if exists -> not found
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
      throw new ConflictError('Zlecenie juz znajduje sie w tej dostawie');
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
