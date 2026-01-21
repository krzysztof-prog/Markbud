# Error Handling & Recovery

> **Powrót do:** [Edge Cases README](./README.md) | [Oryginalny dokument](../EDGE_CASES_ANALYSIS.md)

---

## 9.1 Partial Transaction Rollback

**Severity:** HIGH
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
const order = await tx.order.create({ ... });  // Success

// External service called
await sendNotificationEmail(order);  // Timeout after 30s

// Transaction already committed Order!
// -> Order exists in DB
// -> No email sent
// -> Inconsistent state
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

## 9.2 Silent Error Swallowing

**Severity:** Medium
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

// Wszystkie bledy sa swallowed - nawet unexpected ones
```

**Scenariusz:**
```typescript
// Database connection lost
await prisma.importLock.delete({ ... });
// -> PrismaClientKnownRequestError: Connection timeout

// .catch() logs warning but continues
// -> Function returns as if delete succeeded
// -> Lock remains in DB
// -> Next import may hit "already locked" error
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
