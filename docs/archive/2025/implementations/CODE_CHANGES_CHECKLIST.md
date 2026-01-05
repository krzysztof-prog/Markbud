# Code Changes Checklist - userId NOT NULL Migration

After applying the migration, review and update the following code locations to ensure userId is always provided.

## 1. WarehouseHistory (recordedById)

### Files to Check:
- [ ] `apps/api/src/repositories/WarehouseRepository.ts`
- [ ] `apps/api/src/services/warehouseService.ts`
- [ ] Any code that creates warehouse history records

### Pattern to Find:
```typescript
prisma.warehouseHistory.create({
  data: {
    // Check if recordedById is provided
  }
})
```

### Required Change:
```typescript
// Add recordedById parameter
async createHistory(
  profileId: number,
  colorId: number,
  data: HistoryData,
  userId: number // ADD THIS
) {
  return prisma.warehouseHistory.create({
    data: {
      ...data,
      recordedById: userId // REQUIRED
    }
  })
}
```

## 2. WarehouseStock (updatedById)

### Files to Check:
- [ ] `apps/api/src/repositories/WarehouseRepository.ts`
- [ ] `apps/api/src/services/warehouseService.ts`
- [ ] `apps/api/src/handlers/warehouseHandler.ts`

### Pattern to Find:
```typescript
prisma.warehouseStock.create({
  data: {
    // Check if updatedById is provided
  }
})

prisma.warehouseStock.update({
  data: {
    // Check if updatedById is updated
  }
})
```

### Required Change:
```typescript
async updateStock(
  profileId: number,
  colorId: number,
  quantity: number,
  userId: number // ADD THIS
) {
  return prisma.warehouseStock.upsert({
    where: { profileId_colorId: { profileId, colorId } },
    create: {
      profileId,
      colorId,
      currentStockBeams: quantity,
      updatedById: userId // REQUIRED
    },
    update: {
      currentStockBeams: quantity,
      updatedById: userId // REQUIRED
    }
  })
}
```

## 3. WarehouseOrder (createdById)

### Files to Check:
- [ ] `apps/api/src/routes/warehouse-orders.ts`
- [ ] `apps/api/src/handlers/warehouseHandler.ts`
- [ ] Any code that creates warehouse orders

### Pattern to Find:
```typescript
prisma.warehouseOrder.create({
  data: {
    // Check if createdById is provided
  }
})
```

### Required Change:
```typescript
async createOrder(
  orderData: OrderData,
  userId: number // ADD THIS
) {
  return prisma.warehouseOrder.create({
    data: {
      ...orderData,
      createdById: userId // REQUIRED
    }
  })
}
```

## 4. OkucHistory (recordedById)

### Files to Check:
- [ ] Any okuc history creation code
- [ ] Remanent/inventory check processes

### Required Change:
```typescript
async recordOkucHistory(
  articleId: number,
  historyData: OkucHistoryData,
  userId: number // ADD THIS
) {
  return prisma.okucHistory.create({
    data: {
      ...historyData,
      recordedById: userId // REQUIRED
    }
  })
}
```

## 5. OkucStock (updatedById)

### Files to Check:
- [ ] Okuc stock management code
- [ ] Stock update handlers

### Required Change:
```typescript
async updateOkucStock(
  articleId: number,
  quantity: number,
  userId: number // ADD THIS
) {
  return prisma.okucStock.upsert({
    where: { articleId },
    create: {
      articleId,
      currentQuantity: quantity,
      updatedById: userId // REQUIRED
    },
    update: {
      currentQuantity: quantity,
      updatedById: userId // REQUIRED
    }
  })
}
```

## 6. OkucOrder (createdById)

### Files to Check:
- [ ] Okuc order creation handlers
- [ ] Order management services

### Required Change:
```typescript
async createOkucOrder(
  orderData: OkucOrderData,
  userId: number // ADD THIS
) {
  return prisma.okucOrder.create({
    data: {
      ...orderData,
      createdById: userId // REQUIRED
    }
  })
}
```

## 7. OkucRequirement (recordedById)

### Files to Check:
- [ ] Okuc requirement tracking code
- [ ] Import handlers for RW/PW documents

### Required Change:
```typescript
async createRequirement(
  requirementData: RequirementData,
  userId: number // ADD THIS
) {
  return prisma.okucRequirement.create({
    data: {
      ...requirementData,
      recordedById: userId // REQUIRED
    }
  })
}
```

## 8. OkucImport (createdById)

### Files to Check:
- [ ] Import handlers
- [ ] File upload processing

### Required Change:
```typescript
async createImport(
  importData: ImportData,
  userId: number // ADD THIS
) {
  return prisma.okucImport.create({
    data: {
      ...importData,
      createdById: userId // REQUIRED
    }
  })
}
```

## 9. Note (createdById)

### Files to Check:
- [ ] Note creation handlers
- [ ] Order note services

### Required Change:
```typescript
async createNote(
  orderId: number,
  content: string,
  userId: number // ADD THIS
) {
  return prisma.note.create({
    data: {
      orderId,
      content,
      createdById: userId // REQUIRED
    }
  })
}
```

## Getting userId in Handlers

### From Fastify Request:
```typescript
// In handler
async function handler(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user?.id;

  if (!userId) {
    throw new UnauthorizedError('User not authenticated');
  }

  // Pass to service
  await service.create(data, userId);
}
```

### For System Operations:
```typescript
const SYSTEM_USER_ID = 1;

// In cron jobs, migrations, automated processes
await service.create(data, SYSTEM_USER_ID);
```

## Testing Checklist

After making changes, test:

- [ ] Create warehouse history - success with userId
- [ ] Create warehouse history - error without userId
- [ ] Update warehouse stock - success with userId
- [ ] Create warehouse order - success with userId
- [ ] Create okuc history - success with userId
- [ ] Update okuc stock - success with userId
- [ ] Create okuc order - success with userId
- [ ] Create okuc requirement - success with userId
- [ ] Create okuc import - success with userId
- [ ] Create note - success with userId
- [ ] System operations use SYSTEM_USER_ID

## TypeScript Errors to Watch For

After updating schema, you may see TypeScript errors like:

```
Argument of type '{ profileId: number; colorId: number; ... }'
is not assignable to parameter of type '...'.
Property 'recordedById' is missing in type ...
```

This is GOOD - it means TypeScript is catching places where userId is missing!

## Search Commands

Find all create operations for affected tables:

```bash
# Search for creates
grep -r "warehouseHistory.create" apps/api/src/
grep -r "warehouseStock.create" apps/api/src/
grep -r "warehouseOrder.create" apps/api/src/
grep -r "okucHistory.create" apps/api/src/
grep -r "okucStock.create" apps/api/src/
grep -r "okucOrder.create" apps/api/src/
grep -r "okucRequirement.create" apps/api/src/
grep -r "okucImport.create" apps/api/src/
grep -r "note.create" apps/api/src/

# Search for updates (stock tables)
grep -r "warehouseStock.update" apps/api/src/
grep -r "okucStock.update" apps/api/src/
```

## Summary

**Total Tables**: 9
**Total Files to Potentially Update**: 10-20 (depends on codebase)
**Breaking Changes**: Yes - will cause TypeScript errors until fixed
**Backwards Compatible**: No - must update all code

## Status Tracking

- [ ] Migration applied
- [ ] Schema updated
- [ ] Prisma client regenerated
- [ ] TypeScript errors identified
- [ ] WarehouseHistory code updated
- [ ] WarehouseStock code updated
- [ ] WarehouseOrder code updated
- [ ] OkucHistory code updated
- [ ] OkucStock code updated
- [ ] OkucOrder code updated
- [ ] OkucRequirement code updated
- [ ] OkucImport code updated
- [ ] Note code updated
- [ ] All tests passing
- [ ] Manual testing complete
- [ ] Changes committed
