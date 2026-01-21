# Performance & Scalability

> **Powrót do:** [Edge Cases README](./README.md) | [Oryginalny dokument](../EDGE_CASES_ANALYSIS.md)

---

## 10.1 N+1 Query Problem

**Severity:** HIGH
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
// -> 1 query for orders
// -> 100 queries for requirements
// -> 100 queries for windows
// -> 100 queries for deliveries
// = 301 queries!
// -> Page load time: 5+ seconds
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

## 10.2 Bulk Operations Without Batching

**Severity:** Medium
**Location:** 32 files using updateMany/deleteMany

**Problem:**
```typescript
// Update 10,000 orders at once
await prisma.order.updateMany({
  where: { status: 'new' },
  data: { status: 'archived' }
});

// Single transaction locks table
// May timeout
// Blocks other operations
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
// -> SQLite locks entire orders table
// -> Other users can't create/update orders
// -> Request timeout after 30s
// -> Partial update - some archived, some not
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

## 10.3 Missing Database Indexes

**Severity:** Medium
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
