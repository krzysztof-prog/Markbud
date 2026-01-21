# Data Integrity & Database Relationships

> **Powrót do:** [Edge Cases README](./README.md) | [Oryginalny dokument](../EDGE_CASES_ANALYSIS.md)

---

## 3.1 Cascade Delete Chains

**Severity:** CRITICAL
**Location:** [../../apps/api/prisma/schema.prisma](../../apps/api/prisma/schema.prisma) (multiple)

**Problem:**
Usuniecie `Order` -> **CASCADE** usuwa:
- `DeliveryOrder` (OK)
- `OrderRequirement` (OK)
- `OrderWindow` (OK)
- `Note` (moze zawierac wazne informacje)
- `GlassOrderItem` (reference do order przez orderNumber string)

**Scenariusz:**
```typescript
// Admin przypadkowo usuwa zlecenie
await prisma.order.delete({ where: { id: 123 } });

// CASCADE usuwa:
// - 5 requirements (brak sladu co bylo zamowione)
// - 10 windows (brak sladu wymiarow)
// - 3 notes (utrata historii komunikacji z klientem)
// - Powiazania z GlassOrderItem przez orderNumber

// Nie ma SOFT DELETE - dane przepadaja permanentnie!
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
  snapshot    String   // JSON snapshot przed usunieciem
  performedBy Int
  performedAt DateTime @default(now())
}

// 3. Change cascade to Restrict dla krytycznych relacji
model Note {
  order Order? @relation(fields: [orderId], references: [id], onDelete: Restrict)
}
```

---

## 3.2 Orphaned Records przez SetNull

**Severity:** HIGH
**Location:** [../../apps/api/prisma/schema.prisma](../../apps/api/prisma/schema.prisma)

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
// 1. GlassDeliveryItem staje sie orphaned
await prisma.glassOrder.delete({ where: { id: 5 } });
// -> GlassDeliveryItem { glassOrderId: null }
// -> Nie wiadomo do jakiego zamowienia nalezy

// 2. OkucDemand bez orderId
await prisma.order.delete({ where: { id: 123 } });
// -> OkucDemand { orderId: null }
// -> Zapotrzebowanie bez przypisania do zlecenia

// 3. PendingOrderPrice orphaned
await prisma.fileImport.delete({ where: { id: 10 } });
// -> PendingOrderPrice { importId: null }
// -> Utrata sledzenia zrodla danych
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

// 2. Lub zmien na Restrict + manual cleanup
onDelete: Restrict  // Force manual decision
```

---

## 3.3 Unique Constraint Violation Handling

**Severity:** Medium
**Location:** Multiple locations

**Problem:**
```prisma
@@unique([profileId, colorId])
@@unique([orderId, schucoDeliveryId])
@@unique([glassOrderId, position])
```

- Brak konsekwentnego handling Prisma P2002 errors
- Niektore miejsca throwuja generic error zamiast user-friendly message

**Scenariusz:**
```typescript
// User probuje dodac duplicate
await prisma.warehouseStock.create({
  data: { profileId: 1, colorId: 2, currentStockBeams: 100 }
});

// Error: "Unique constraint failed on the fields: (`profile_id`,`color_id`)"
// Niezrozumiale dla uzytkownika
```

**Sugestia:**
```typescript
// Centralized error handler
function handlePrismaError(error: unknown, context: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const fields = error.meta?.target as string[] | undefined;
      throw new ConflictError(
        `Rekord juz istnieje dla ${fields?.join(', ') || 'podanych wartosci'}`,
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
