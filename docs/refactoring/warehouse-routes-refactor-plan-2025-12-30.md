# Warehouse Routes Refactoring Plan

**Date:** 2025-12-30
**Target File:** `apps/api/src/routes/warehouse.ts` (708 LOC)
**Architecture:** Routes → Handlers → Services → Repositories
**Estimated Total Effort:** ~8-12 hours

---

## Executive Summary

The `warehouse.ts` file contains 708 lines of monolithic route definitions with embedded business logic, database queries, and complex data transformations. This violates the layered architecture pattern used throughout the codebase and makes the code difficult to test, maintain, and extend.

**Key Issues:**
- All business logic is embedded in route handlers (anti-pattern)
- Direct Prisma calls in routes (should be in Repository)
- Complex data transformations mixed with HTTP logic
- No separation of concerns
- Difficult to unit test without mocking Fastify
- Inconsistent with other refactored modules (orders, deliveries)

**Goals:**
1. Extract business logic to WarehouseService
2. Move all database queries to WarehouseRepository
3. Create slim handlers for HTTP concerns only
4. Add comprehensive Zod validation schemas
5. Maintain 100% backward compatibility
6. Enable proper unit testing

---

## Current State Analysis

### File Structure
```
warehouse.ts (708 LOC)
├── GET    /:colorId                    (137 LOC) - Complex aggregation
├── PUT    /:colorId/:profileId         (37 LOC)  - Stock update
├── POST   /monthly-update              (76 LOC)  - Inventory + archiving
├── GET    /history/:colorId            (26 LOC)  - History by color
├── GET    /history                     (26 LOC)  - All history
├── POST   /rollback-inventory          (101 LOC) - Complex rollback logic
├── GET    /shortages                   (85 LOC)  - Shortage calculation
├── GET    /:colorId/average            (99 LOC)  - Monthly averages
└── POST   /finalize-month              (75 LOC)  - Month finalization
```

### Existing Infrastructure

**Already Created (Partial Implementation):**
- `handlers/warehouseHandler.ts` (34 LOC) - Only 2 methods (getStock, updateStock)
- `services/warehouseService.ts` (72 LOC) - Only 2 methods (getStock, updateStock)
- `repositories/WarehouseRepository.ts` (136 LOC) - Basic CRUD with optimistic locking
- `validators/warehouse.ts` (23 LOC) - Minimal schemas

**Coverage:** ~2.5% of warehouse.ts functionality is refactored

---

## Identified Issues and Opportunities

### Critical Issues (Priority: HIGH)

#### 1. Business Logic in Routes
**Location:** Lines 7-136, 179-263, 327-431, 435-518, 522-624, 627-707
**Severity:** Critical
**Type:** Structural

**Problem:**
```typescript
// ❌ CURRENT: Complex business logic in route
fastify.get('/:colorId', async (request) => {
  const stocks = await prisma.warehouseStock.findMany({ /* ... */ });
  const demands = await prisma.orderRequirement.groupBy({ /* ... */ });
  const demandMap = new Map(/* complex transformation */);
  const pendingOrders = /* ... */;
  const receivedOrders = /* ... */;
  // 130+ lines of logic...
});
```

**Impact:** Untestable, violates SRP, inconsistent with codebase standards

#### 2. Direct Database Access in Routes
**Location:** All routes (lines 11, 31, 58, 89, 95, 149, etc.)
**Severity:** Critical
**Type:** Structural

**Problem:** Direct `prisma.*` calls bypass repository pattern

#### 3. Missing Input Validation
**Location:** Lines 179-263 (monthly-update), 327-431 (rollback-inventory)
**Severity:** Major
**Type:** Security/Validation

**Problem:**
```typescript
// ❌ No Zod validation
fastify.post('/monthly-update', async (request) => {
  const { colorId, updates } = request.body; // Unvalidated!
});
```

#### 4. Transaction Logic in Routes
**Location:** Lines 194-240 (monthly-update), 365-425 (rollback-inventory)
**Severity:** Major
**Type:** Structural

**Problem:** Complex Prisma transactions should be in Service layer

#### 5. Complex Data Aggregation
**Location:** Lines 31-55 (demand calculation), 466-516 (shortages)
**Severity:** Major
**Type:** Structural

**Problem:** Multi-step aggregations with Maps and groupBy in route handlers

### Major Issues (Priority: MEDIUM)

#### 6. Event Emission Inconsistency
**Location:** Line 174
**Severity:** Medium
**Type:** Behavioral

**Problem:** Only one route emits events (`emitWarehouseStockUpdated`), others don't

#### 7. Hardcoded Business Rules
**Location:** Lines 89-92 (lowThreshold), 349-357 (24h rollback limit), 510 (priority levels)
**Severity:** Medium
**Type:** Maintainability

**Problem:** Business constants scattered throughout code

#### 8. Duplicate Query Patterns
**Location:** Lines 274-295, 304-324 (history queries)
**Severity:** Minor
**Type:** Code Smell (DRY violation)

#### 9. Magic Numbers
**Location:** Lines 92, 292, 322, 339, 362, 399, 400
**Severity:** Minor
**Type:** Code Quality

**Examples:** `10` (threshold), `100` (limit), `60000` (1 minute ms), `24` (hours)

### Code Smells

#### 10. Long Methods
**Severity:** Minor
**Type:** Code Smell

Routes with 75-137 lines of logic (should be <20 lines)

#### 11. Feature Envy
**Location:** Lines 47-55, 70-86, 104-113
**Severity:** Minor
**Type:** Code Smell

Routes building complex Maps and data structures (should be in Service)

#### 12. Primitive Obsession
**Location:** Lines 508-510
**Severity:** Minor
**Type:** Code Smell

Priority calculated inline: `'critical' : 'high' : 'medium'` should be a utility

---

## Proposed Refactoring Plan

### Phase 1: Foundation & Validation (2-3 hours)

**Goal:** Set up validation schemas and type safety

#### Step 1.1: Create Comprehensive Zod Schemas
**File:** `apps/api/src/validators/warehouse.ts`
**Estimated LOC:** +120 lines

**Actions:**
1. Create schema for GET /:colorId params and response
2. Create schema for PUT /:colorId/:profileId
3. Create schema for POST /monthly-update
4. Create schema for POST /rollback-inventory
5. Create schema for GET /shortages
6. Create schema for GET /:colorId/average
7. Create schema for POST /finalize-month

**Code Example:**
```typescript
// Add to warehouse.ts
export const getWarehouseByColorParamsSchema = z.object({
  colorId: z.string().regex(/^\d+$/, 'Color ID must be numeric'),
});

export const monthlyUpdateBodySchema = z.object({
  colorId: z.number().int().positive(),
  updates: z.array(
    z.object({
      profileId: z.number().int().positive(),
      actualStock: z.number().int().nonnegative(),
    })
  ).min(1),
});

export const rollbackInventoryBodySchema = z.object({
  colorId: z.number().int().positive(),
});

export const averageQuerySchema = z.object({
  months: z.string().regex(/^\d+$/).optional().default('6'),
});

export const finalizeMonthBodySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),
  archive: z.boolean().optional(),
});

// Response types
export type WarehouseTableData = z.infer<typeof warehouseTableDataSchema>;
export type MonthlyUpdateResult = z.infer<typeof monthlyUpdateResultSchema>;
// ... etc
```

**Acceptance Criteria:**
- All request params, query, and body inputs have Zod schemas
- All response types are typed
- Input validation errors return 400 with clear messages

---

### Phase 2: Repository Layer (3-4 hours)

**Goal:** Move all database queries to WarehouseRepository

#### Step 2.1: Extend WarehouseRepository
**File:** `apps/api/src/repositories/WarehouseRepository.ts`
**Current:** 136 LOC
**Estimated Addition:** +280 lines
**Final Size:** ~420 LOC

**New Methods to Add:**

1. **getWarehouseTableData(colorId: number)**
   - Combines: stocks, demands, warehouse orders, color info
   - Returns: Formatted table data
   - ~80 LOC

2. **getWarehouseHistory(colorId?: number, limit?: number)**
   - Fetches warehouse history with filters
   - ~25 LOC

3. **createMonthlyInventory(colorId, updates)**
   - Transactional update with history
   - ~60 LOC

4. **archiveCompletedOrdersByColor(colorId)**
   - Auto-archive completed orders
   - ~20 LOC

5. **rollbackLastInventory(colorId)**
   - Complex rollback with validation
   - ~80 LOC

6. **getShortages()**
   - Calculate material shortages across all stocks
   - ~50 LOC

7. **getMonthlyAverageUsage(colorId, months)**
   - Calculate average monthly profile usage
   - ~70 LOC

8. **finalizeMonth(month, archive?)**
   - Preview or archive orders by month
   - ~40 LOC

**Code Example:**
```typescript
// Add to WarehouseRepository.ts
async getWarehouseTableData(colorId: number) {
  // Fetch stocks
  const stocks = await this.prisma.warehouseStock.findMany({
    where: { colorId },
    select: {
      id: true,
      profileId: true,
      colorId: true,
      currentStockBeams: true,
      initialStockBeams: true,
      updatedAt: true,
      profile: {
        select: { id: true, number: true },
      },
      color: {
        select: { id: true, code: true },
      },
    },
    orderBy: { profile: { number: 'asc' } },
  });

  // Fetch demands from active orders
  const demands = await this.prisma.orderRequirement.groupBy({
    by: ['profileId'],
    where: {
      colorId,
      order: {
        archivedAt: null,
        status: { notIn: ['archived', 'completed'] },
      },
    },
    _sum: {
      beamsCount: true,
      meters: true,
    },
  });

  // Fetch warehouse orders
  const warehouseOrders = await this.prisma.warehouseOrder.findMany({
    where: {
      colorId,
      status: { in: ['pending', 'received'] },
    },
    orderBy: { expectedDeliveryDate: 'asc' },
  });

  // Fetch color info
  const color = await this.prisma.color.findUnique({
    where: { id: colorId },
    select: { id: true, code: true, name: true, hexColor: true, type: true },
  });

  // Return raw data (transformation happens in Service)
  return {
    stocks,
    demands,
    warehouseOrders,
    color,
  };
}

async createMonthlyInventory(
  colorId: number,
  updates: Array<{ profileId: number; actualStock: number }>
) {
  return this.prisma.$transaction(async (tx) => {
    const results = [];

    for (const update of updates) {
      // Get current stock in transaction
      const currentStock = await tx.warehouseStock.findUnique({
        where: {
          profileId_colorId: {
            profileId: update.profileId,
            colorId,
          },
        },
      });

      const calculatedStock = currentStock?.currentStockBeams || 0;
      const difference = update.actualStock - calculatedStock;

      // Save to history
      await tx.warehouseHistory.create({
        data: {
          profileId: update.profileId,
          colorId,
          calculatedStock,
          actualStock: update.actualStock,
          difference,
          changeType: 'monthly_inventory',
        },
      });

      // Update stock
      await tx.warehouseStock.update({
        where: {
          profileId_colorId: {
            profileId: update.profileId,
            colorId,
          },
        },
        data: {
          currentStockBeams: update.actualStock,
          initialStockBeams: calculatedStock,
          version: { increment: 1 },
        },
      });

      results.push({
        profileId: update.profileId,
        calculatedStock,
        actualStock: update.actualStock,
        difference,
      });
    }

    return results;
  });
}

async rollbackLastInventory(colorId: number) {
  // Fetch last inventory records
  const lastRecords = await this.prisma.warehouseHistory.findMany({
    where: {
      colorId,
      changeType: 'monthly_inventory'
    },
    orderBy: { recordedAt: 'desc' },
    take: 100,
  });

  if (lastRecords.length === 0) {
    return null; // No records to rollback
  }

  const latestDate = lastRecords[0].recordedAt;

  // Check if not older than 24h
  const hoursSince = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60);
  if (hoursSince >= 24) {
    throw new ValidationError(
      `Cannot rollback inventory older than 24h (${hoursSince.toFixed(1)}h ago)`
    );
  }

  // Find all records from same inventory session (within 1 minute)
  const inventoryRecords = lastRecords.filter((record) => {
    const timeDiff = Math.abs(latestDate.getTime() - record.recordedAt.getTime());
    return timeDiff < 60000; // 1 minute
  });

  // Rollback in transaction
  return this.prisma.$transaction(async (tx) => {
    const results = [];

    for (const record of inventoryRecords) {
      // Restore stock
      await tx.warehouseStock.update({
        where: {
          profileId_colorId: {
            profileId: record.profileId,
            colorId: record.colorId,
          },
        },
        data: {
          currentStockBeams: record.calculatedStock,
          version: { increment: 1 },
        },
      });

      // Delete history entry
      await tx.warehouseHistory.delete({
        where: { id: record.id },
      });

      results.push({
        profileId: record.profileId,
        restoredStock: record.calculatedStock,
      });
    }

    // Restore archived orders
    const archivedOrders = await tx.order.findMany({
      where: {
        status: 'archived',
        archivedAt: {
          gte: new Date(latestDate.getTime() - 60000),
          lte: new Date(latestDate.getTime() + 60000),
        },
        requirements: {
          some: { colorId },
        },
      },
    });

    if (archivedOrders.length > 0) {
      await tx.order.updateMany({
        where: {
          id: { in: archivedOrders.map((o) => o.id) },
        },
        data: {
          status: 'completed',
          archivedAt: null,
        },
      });
    }

    return {
      rolledBackRecords: results,
      restoredOrdersCount: archivedOrders.length,
      inventoryDate: latestDate,
    };
  });
}
```

**Acceptance Criteria:**
- All database queries moved from routes to repository
- Transactions properly isolated in repository methods
- Methods return raw data (no business logic)
- Proper error handling for not found cases
- Optimistic locking where applicable

---

### Phase 3: Service Layer (2-3 hours)

**Goal:** Extract business logic and data transformations

#### Step 3.1: Extend WarehouseService
**File:** `apps/api/src/services/warehouseService.ts`
**Current:** 72 LOC
**Estimated Addition:** +250 lines
**Final Size:** ~320 LOC

**New Methods to Add:**

1. **getWarehouseByColor(colorId: number)**
   - Orchestrates: repository data + transformations
   - Applies: demand calculations, low stock detection
   - Returns: Formatted table data with color info
   - ~60 LOC

2. **updateStockByProfileColor(colorId, profileId, currentStockBeams)**
   - Validates input
   - Updates stock with optimistic locking
   - Emits warehouse stock updated event
   - ~30 LOC

3. **performMonthlyInventory(colorId, updates)**
   - Validates updates
   - Calls repository for transactional update
   - Auto-archives completed orders
   - Emits events
   - ~40 LOC

4. **getWarehouseHistory(colorId?, limit?)**
   - Fetches history with defaults
   - ~15 LOC

5. **rollbackInventory(colorId)**
   - Validates rollback eligibility
   - Calls repository rollback
   - Emits events
   - ~30 LOC

6. **getShortages()**
   - Fetches data from repository
   - Calculates priority levels
   - Sorts by severity
   - ~40 LOC

7. **getMonthlyAverageUsage(colorId, months)**
   - Validates input
   - Fetches usage data
   - Calculates averages and statistics
   - ~50 LOC

8. **finalizeMonth(month, archive?)**
   - Validates month format
   - Preview or execute archiving
   - ~25 LOC

**Code Example:**
```typescript
// Add to WarehouseService.ts
async getWarehouseByColor(colorId: number) {
  // Fetch data from repository
  const { stocks, demands, warehouseOrders, color } =
    await this.repository.getWarehouseTableData(colorId);

  if (!color) {
    throw new NotFoundError('Color');
  }

  // Build demand map
  const demandMap = new Map(
    demands.map((d) => [
      d.profileId,
      {
        beams: d._sum.beamsCount || 0,
        meters: parseFloat(d._sum.meters?.toString() || '0'),
      },
    ])
  );

  // Separate pending and received orders
  const pendingOrders = warehouseOrders.filter((o) => o.status === 'pending');
  const receivedOrders = warehouseOrders.filter((o) => o.status === 'received');

  // Build orders maps
  const pendingOrdersMap = this.groupOrdersByProfile(pendingOrders);
  const receivedOrdersMap = this.groupOrdersByProfile(receivedOrders);

  // Get low stock threshold
  const lowThreshold = await this.getLowStockThreshold();

  // Transform to table data
  const tableData = stocks.map((stock) => {
    const demand = demandMap.get(stock.profileId) || { beams: 0, meters: 0 };
    const afterDemand = stock.currentStockBeams - demand.beams;
    const pendingOrdersList = pendingOrdersMap.get(stock.profileId) || [];
    const receivedOrdersList = receivedOrdersMap.get(stock.profileId) || [];

    const totalOrderedBeams = pendingOrdersList.reduce(
      (sum, order) => sum + order.orderedBeams,
      0
    );
    const nearestDeliveryDate =
      pendingOrdersList.length > 0 ? pendingOrdersList[0].expectedDeliveryDate : null;

    return {
      profileId: stock.profileId,
      profileNumber: stock.profile.number,
      currentStock: stock.currentStockBeams,
      initialStock: stock.initialStockBeams,
      demand: demand.beams,
      demandMeters: demand.meters,
      afterDemand,
      orderedBeams: totalOrderedBeams,
      expectedDeliveryDate: nearestDeliveryDate,
      pendingOrders: pendingOrdersList,
      receivedOrders: receivedOrdersList,
      isLow: stock.currentStockBeams <= lowThreshold,
      isNegative: afterDemand < 0,
      updatedAt: stock.updatedAt,
    };
  });

  return {
    color,
    data: tableData,
  };
}

async performMonthlyInventory(
  colorId: number,
  updates: Array<{ profileId: number; actualStock: number }>
) {
  // Validate all updates
  for (const update of updates) {
    if (update.actualStock < 0) {
      throw new ValidationError(
        `Actual stock cannot be negative (profile ${update.profileId})`
      );
    }
  }

  // Perform inventory update in repository (transactional)
  const results = await this.repository.createMonthlyInventory(colorId, updates);

  // Auto-archive completed orders
  const archivedCount = await this.repository.archiveCompletedOrdersByColor(colorId);

  // Emit event
  emitWarehouseInventoryCompleted({ colorId, updates: results });

  return {
    updates: results,
    archivedOrdersCount: archivedCount,
  };
}

async rollbackInventory(colorId: number) {
  const result = await this.repository.rollbackLastInventory(colorId);

  if (!result) {
    throw new NotFoundError('No inventory history to rollback');
  }

  // Emit event
  emitWarehouseInventoryRolledBack({
    colorId,
    inventoryDate: result.inventoryDate,
    restoredOrdersCount: result.restoredOrdersCount,
  });

  return {
    success: true,
    message: `Rolled back inventory from ${result.inventoryDate.toISOString()}`,
    ...result,
  };
}

async getShortages() {
  const data = await this.repository.getShortagesData();

  // Calculate shortages with priority
  const shortages = data
    .map((item) => {
      const afterDemand = item.currentStock - item.demand;

      if (afterDemand >= 0) {
        return null; // No shortage
      }

      return {
        profileId: item.profileId,
        profileNumber: item.profileNumber,
        colorId: item.colorId,
        colorCode: item.colorCode,
        colorName: item.colorName,
        currentStock: item.currentStock,
        demand: item.demand,
        shortage: Math.abs(afterDemand),
        orderedBeams: item.orderedBeams,
        expectedDeliveryDate: item.expectedDeliveryDate,
        priority: this.calculateShortagePriority(afterDemand),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.shortage || 0) - (a?.shortage || 0));

  return shortages;
}

// Private helper methods
private groupOrdersByProfile(orders: any[]) {
  const map = new Map<number, any[]>();
  orders.forEach((order) => {
    if (!map.has(order.profileId)) {
      map.set(order.profileId, []);
    }
    map.get(order.profileId)!.push(order);
  });
  return map;
}

private async getLowStockThreshold(): Promise<number> {
  const setting = await this.prisma.setting.findUnique({
    where: { key: 'lowStockThreshold' },
  });
  return parseInt(setting?.value || '10');
}

private calculateShortagePriority(afterDemand: number): 'critical' | 'high' | 'medium' {
  if (afterDemand < -10) return 'critical';
  if (afterDemand < -5) return 'high';
  return 'medium';
}
```

**Acceptance Criteria:**
- All business logic moved from routes to service
- Service methods orchestrate repository calls
- Data transformations handled in service
- Events emitted for state changes
- Clear error messages with domain exceptions

---

### Phase 4: Handler Layer (1-2 hours)

**Goal:** Create slim handlers for HTTP concerns

#### Step 4.1: Extend WarehouseHandler
**File:** `apps/api/src/handlers/warehouseHandler.ts`
**Current:** 34 LOC
**Estimated Addition:** +150 lines
**Final Size:** ~185 LOC

**New Methods to Add:**

1. **getWarehouseByColor(request, reply)** - ~15 LOC
2. **updateStockByProfileColor(request, reply)** - ~15 LOC
3. **performMonthlyInventory(request, reply)** - ~20 LOC
4. **getWarehouseHistory(request, reply)** - ~15 LOC
5. **rollbackInventory(request, reply)** - ~15 LOC
6. **getShortages(request, reply)** - ~10 LOC
7. **getMonthlyAverageUsage(request, reply)** - ~20 LOC
8. **finalizeMonth(request, reply)** - ~20 LOC

**Code Example:**
```typescript
// Add to WarehouseHandler.ts
async getWarehouseByColor(
  request: FastifyRequest<{ Params: { colorId: string } }>,
  reply: FastifyReply
) {
  const { colorId } = getWarehouseByColorParamsSchema.parse(request.params);
  const data = await this.service.getWarehouseByColor(parseInt(colorId));
  return reply.send(data);
}

async updateStockByProfileColor(
  request: FastifyRequest<{
    Params: { colorId: string; profileId: string };
    Body: { currentStockBeams: number };
  }>,
  reply: FastifyReply
) {
  const params = updateStockByProfileColorParamsSchema.parse(request.params);
  const body = updateStockBodySchema.parse(request.body);

  const stock = await this.service.updateStockByProfileColor(
    parseInt(params.colorId),
    parseInt(params.profileId),
    body.currentStockBeams
  );

  return reply.send(stock);
}

async performMonthlyInventory(
  request: FastifyRequest<{ Body: MonthlyInventoryInput }>,
  reply: FastifyReply
) {
  const validated = monthlyUpdateBodySchema.parse(request.body);
  const result = await this.service.performMonthlyInventory(
    validated.colorId,
    validated.updates
  );
  return reply.send(result);
}

async rollbackInventory(
  request: FastifyRequest<{ Body: { colorId: number } }>,
  reply: FastifyReply
) {
  const { colorId } = rollbackInventoryBodySchema.parse(request.body);
  const result = await this.service.rollbackInventory(colorId);
  return reply.send(result);
}

async getShortages(request: FastifyRequest, reply: FastifyReply) {
  const shortages = await this.service.getShortages();
  return reply.send(shortages);
}

async getMonthlyAverageUsage(
  request: FastifyRequest<{
    Params: { colorId: string };
    Querystring: { months?: string };
  }>,
  reply: FastifyReply
) {
  const { colorId } = getWarehouseByColorParamsSchema.parse(request.params);
  const { months } = averageQuerySchema.parse(request.query);

  const data = await this.service.getMonthlyAverageUsage(
    parseInt(colorId),
    parseInt(months)
  );

  return reply.send(data);
}

async finalizeMonth(
  request: FastifyRequest<{ Body: FinalizeMonthInput }>,
  reply: FastifyReply
) {
  const validated = finalizeMonthBodySchema.parse(request.body);
  const result = await this.service.finalizeMonth(
    validated.month,
    validated.archive
  );
  return reply.send(result);
}
```

**Acceptance Criteria:**
- Handlers only contain HTTP concerns
- All validation done via Zod schemas
- Proper HTTP status codes
- Consistent error handling via middleware
- Each handler method <25 LOC

---

### Phase 5: Routes Refactoring (1-2 hours)

**Goal:** Convert routes to use handlers

#### Step 5.1: Refactor warehouse.ts
**File:** `apps/api/src/routes/warehouse.ts`
**Current:** 708 LOC
**Target:** ~120 LOC (83% reduction)

**Actions:**
1. Import WarehouseHandler
2. Initialize handler with service instance
3. Replace inline logic with handler method calls
4. Keep route definitions clean and declarative

**Code Example:**
```typescript
// Refactored warehouse.ts
import type { FastifyPluginAsync } from 'fastify';
import { WarehouseHandler } from '../handlers/warehouseHandler.js';
import { WarehouseService } from '../services/warehouseService.js';
import { WarehouseRepository } from '../repositories/WarehouseRepository.js';
import { prisma } from '../index.js';

export const warehouseRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize dependencies
  const repository = new WarehouseRepository(prisma);
  const service = new WarehouseService(repository);
  const handler = new WarehouseHandler(service);

  // GET /api/warehouse/:colorId - warehouse table for color
  fastify.get('/:colorId', {
    schema: {
      tags: ['warehouse'],
      params: getWarehouseByColorParamsSchema,
      response: {
        200: warehouseTableResponseSchema,
      },
    },
    handler: handler.getWarehouseByColor.bind(handler),
  });

  // PUT /api/warehouse/:colorId/:profileId - update stock
  fastify.put('/:colorId/:profileId', {
    schema: {
      tags: ['warehouse'],
      params: updateStockByProfileColorParamsSchema,
      body: updateStockBodySchema,
      response: {
        200: warehouseStockResponseSchema,
      },
    },
    handler: handler.updateStockByProfileColor.bind(handler),
  });

  // POST /api/warehouse/monthly-update - monthly inventory
  fastify.post('/monthly-update', {
    schema: {
      tags: ['warehouse'],
      body: monthlyUpdateBodySchema,
      response: {
        200: monthlyUpdateResultSchema,
      },
    },
    handler: handler.performMonthlyInventory.bind(handler),
  });

  // GET /api/warehouse/history/:colorId - history by color
  fastify.get('/history/:colorId', {
    schema: {
      tags: ['warehouse'],
      params: getWarehouseByColorParamsSchema,
      querystring: historyQuerySchema,
      response: {
        200: z.array(warehouseHistoryItemSchema),
      },
    },
    handler: handler.getWarehouseHistory.bind(handler),
  });

  // GET /api/warehouse/history - all history
  fastify.get('/history', {
    schema: {
      tags: ['warehouse'],
      querystring: historyQuerySchema,
      response: {
        200: z.array(warehouseHistoryItemSchema),
      },
    },
    handler: handler.getWarehouseHistory.bind(handler),
  });

  // POST /api/warehouse/rollback-inventory - rollback last inventory
  fastify.post('/rollback-inventory', {
    schema: {
      tags: ['warehouse'],
      body: rollbackInventoryBodySchema,
      response: {
        200: rollbackInventoryResultSchema,
        400: errorResponseSchema,
        404: errorResponseSchema,
      },
    },
    handler: handler.rollbackInventory.bind(handler),
  });

  // GET /api/warehouse/shortages - material shortages
  fastify.get('/shortages', {
    schema: {
      tags: ['warehouse'],
      response: {
        200: z.array(shortageItemSchema),
      },
    },
    handler: handler.getShortages.bind(handler),
  });

  // GET /api/warehouse/:colorId/average - monthly average usage
  fastify.get('/:colorId/average', {
    schema: {
      tags: ['warehouse'],
      params: getWarehouseByColorParamsSchema,
      querystring: averageQuerySchema,
      response: {
        200: averageUsageResponseSchema,
      },
    },
    handler: handler.getMonthlyAverageUsage.bind(handler),
  });

  // POST /api/warehouse/finalize-month - finalize month
  fastify.post('/finalize-month', {
    schema: {
      tags: ['warehouse'],
      body: finalizeMonthBodySchema,
      response: {
        200: finalizeMonthResultSchema,
      },
    },
    handler: handler.finalizeMonth.bind(handler),
  });
};
```

**Acceptance Criteria:**
- Routes file reduced to ~120 LOC
- No business logic in routes
- All routes use handler methods
- Swagger schemas defined for all endpoints
- Route structure matches other refactored modules

---

### Phase 6: Testing & Documentation (2 hours)

**Goal:** Ensure quality and maintainability

#### Step 6.1: Unit Tests
**Files:**
- `apps/api/src/services/warehouseService.test.ts` (new, ~200 LOC)
- `apps/api/src/repositories/WarehouseRepository.test.ts` (new, ~150 LOC)
- `apps/api/src/handlers/warehouseHandler.test.ts` (new, ~100 LOC)

**Test Coverage:**
- Service layer: All business logic paths
- Repository layer: All database operations
- Handler layer: Validation and HTTP responses
- Edge cases: Empty results, invalid inputs, optimistic locking conflicts

**Example Test:**
```typescript
// warehouseService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WarehouseService } from './warehouseService';
import { WarehouseRepository } from '../repositories/WarehouseRepository';

describe('WarehouseService', () => {
  let service: WarehouseService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      getWarehouseTableData: vi.fn(),
      updateStock: vi.fn(),
      createMonthlyInventory: vi.fn(),
      // ... other mocks
    };
    service = new WarehouseService(mockRepository);
  });

  describe('getWarehouseByColor', () => {
    it('should return formatted table data with demand calculations', async () => {
      mockRepository.getWarehouseTableData.mockResolvedValue({
        stocks: [
          { profileId: 1, currentStockBeams: 50, profile: { number: 'P001' } },
        ],
        demands: [{ profileId: 1, _sum: { beamsCount: 20, meters: 100 } }],
        warehouseOrders: [],
        color: { id: 1, code: 'RAL9016', name: 'White' },
      });

      const result = await service.getWarehouseByColor(1);

      expect(result.color).toEqual({ id: 1, code: 'RAL9016', name: 'White' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        profileId: 1,
        currentStock: 50,
        demand: 20,
        afterDemand: 30,
        isNegative: false,
      });
    });

    it('should throw NotFoundError if color does not exist', async () => {
      mockRepository.getWarehouseTableData.mockResolvedValue({
        stocks: [],
        demands: [],
        warehouseOrders: [],
        color: null,
      });

      await expect(service.getWarehouseByColor(999)).rejects.toThrow(
        'Color not found'
      );
    });
  });

  describe('performMonthlyInventory', () => {
    it('should validate negative stock values', async () => {
      const updates = [{ profileId: 1, actualStock: -5 }];

      await expect(
        service.performMonthlyInventory(1, updates)
      ).rejects.toThrow('Actual stock cannot be negative');
    });

    it('should return update results and archived count', async () => {
      mockRepository.createMonthlyInventory.mockResolvedValue([
        { profileId: 1, calculatedStock: 50, actualStock: 48, difference: -2 },
      ]);
      mockRepository.archiveCompletedOrdersByColor.mockResolvedValue(3);

      const result = await service.performMonthlyInventory(1, [
        { profileId: 1, actualStock: 48 },
      ]);

      expect(result.updates).toHaveLength(1);
      expect(result.archivedOrdersCount).toBe(3);
    });
  });

  // ... more tests
});
```

#### Step 6.2: Integration Tests
**File:** `apps/api/src/routes/warehouse.integration.test.ts` (new, ~150 LOC)

**Coverage:**
- End-to-end route testing
- Database interactions
- Transaction rollback scenarios
- Event emission verification

#### Step 6.3: Update Documentation
**Files:**
- `docs/api/warehouse-endpoints.md` (update)
- `README.md` (update API section)

**Content:**
- Endpoint documentation
- Request/response examples
- Business rules explanation
- Migration notes

---

## Risk Assessment and Mitigation

### High Risks

#### Risk 1: Breaking Changes to Frontend
**Probability:** Medium
**Impact:** High

**Mitigation:**
- Maintain exact same API response formats
- Create integration tests matching current behavior
- Test with actual frontend before deployment
- Add API version header for future breaking changes

#### Risk 2: Transaction Deadlocks
**Probability:** Low
**Impact:** High

**Mitigation:**
- Use optimistic locking where appropriate
- Keep transaction scopes minimal
- Add transaction timeout limits
- Test concurrent operations

#### Risk 3: Data Loss During Refactor
**Probability:** Very Low
**Impact:** Critical

**Mitigation:**
- No database schema changes required
- All operations preserve existing behavior
- Thorough testing before deployment
- Database backup before deployment

### Medium Risks

#### Risk 4: Performance Regression
**Probability:** Low
**Impact:** Medium

**Mitigation:**
- Repository methods use same queries as current code
- No N+1 query issues introduced
- Add performance tests
- Monitor query execution times

#### Risk 5: Event Emission Inconsistency
**Probability:** Medium
**Impact:** Low

**Mitigation:**
- Audit all state-changing operations
- Emit events consistently from service layer
- Document which operations emit events
- Add event emission tests

### Low Risks

#### Risk 6: Increased Code Complexity
**Probability:** Low
**Impact:** Low

**Mitigation:**
- Follow established patterns from other modules
- Clear separation of concerns reduces cognitive load
- Better testability improves long-term maintainability

---

## Testing Strategy

### Unit Tests

**WarehouseService (Priority: HIGH)**
- All business logic methods
- Edge cases (empty results, invalid inputs)
- Error handling
- Event emission
- Target: 90%+ coverage

**WarehouseRepository (Priority: HIGH)**
- All database operations
- Transaction behavior
- Optimistic locking
- Target: 85%+ coverage

**WarehouseHandler (Priority: MEDIUM)**
- Request validation
- Response formatting
- Error scenarios
- Target: 80%+ coverage

### Integration Tests

**Routes (Priority: HIGH)**
- End-to-end endpoint testing
- Database state verification
- Transaction rollback scenarios
- Concurrent request handling

### Manual Testing

**QA Checklist:**
1. Test each endpoint with valid inputs
2. Test with invalid inputs (expect 400 errors)
3. Test rollback inventory with 24h+ old data (expect 400)
4. Test monthly inventory with concurrent updates
5. Verify WebSocket events are emitted
6. Test shortages calculation with edge cases
7. Verify month finalization preview vs. execute
8. Test warehouse table with zero demands
9. Test with missing color (expect 404)

---

## Success Metrics

### Code Quality
- Routes file: 708 LOC → ~120 LOC (83% reduction)
- Cyclomatic complexity: <10 per function
- Test coverage: >85% overall
- Zero `any` types
- Zero ESLint warnings

### Architecture
- 100% routes use handlers
- 100% business logic in services
- 100% database queries in repositories
- Full Zod validation coverage
- Consistent error handling

### Performance
- No query performance regression
- Transaction time <500ms
- API response time <200ms (p95)

### Maintainability
- Clear separation of concerns
- Self-documenting code
- Comprehensive test suite
- Updated documentation

---

## Migration Plan

### Development Phase
1. Create feature branch: `refactor/warehouse-layered-architecture`
2. Implement phases 1-6 incrementally
3. Run test suite after each phase
4. Code review after phases 2, 4, and 6

### Pre-Deployment
1. Full integration test suite
2. Load testing (concurrent requests)
3. Frontend compatibility testing
4. Database backup
5. Rollback plan prepared

### Deployment
1. Deploy during low-traffic window
2. Monitor error rates and response times
3. Verify WebSocket events
4. Check database query performance
5. Frontend smoke tests

### Post-Deployment
1. Monitor for 24 hours
2. Address any issues immediately
3. Document lessons learned
4. Update team on changes

---

## Rollback Plan

### Immediate Rollback (if critical issues)
1. Revert Git commit
2. Redeploy previous version
3. Verify system stability
4. Investigate root cause

### Partial Rollback (if specific endpoint fails)
1. Revert specific route handler
2. Keep infrastructure changes
3. Add feature flag for new code path
4. Fix issue in development

---

## Step-by-Step Implementation Checklist

### Phase 1: Foundation & Validation
- [ ] Create `getWarehouseByColorParamsSchema` (~5 LOC)
- [ ] Create `updateStockByProfileColorParamsSchema` (~10 LOC)
- [ ] Create `updateStockBodySchema` (~5 LOC)
- [ ] Create `monthlyUpdateBodySchema` (~15 LOC)
- [ ] Create `rollbackInventoryBodySchema` (~5 LOC)
- [ ] Create `historyQuerySchema` (~5 LOC)
- [ ] Create `averageQuerySchema` (~5 LOC)
- [ ] Create `finalizeMonthBodySchema` (~10 LOC)
- [ ] Create response type schemas (~60 LOC)
- [ ] Export all types (~10 LOC)

### Phase 2: Repository Layer
- [ ] Add `getWarehouseTableData(colorId)` (~80 LOC)
- [ ] Add `getWarehouseHistory(colorId?, limit?)` (~25 LOC)
- [ ] Add `createMonthlyInventory(colorId, updates)` (~60 LOC)
- [ ] Add `archiveCompletedOrdersByColor(colorId)` (~20 LOC)
- [ ] Add `rollbackLastInventory(colorId)` (~80 LOC)
- [ ] Add `getShortagesData()` (~50 LOC)
- [ ] Add `getMonthlyAverageUsageData(colorId, months)` (~70 LOC)
- [ ] Add `finalizeMonthData(month, archive?)` (~40 LOC)
- [ ] Add helper methods (~15 LOC)

### Phase 3: Service Layer
- [ ] Add `getWarehouseByColor(colorId)` (~60 LOC)
- [ ] Add `updateStockByProfileColor(colorId, profileId, stock)` (~30 LOC)
- [ ] Add `performMonthlyInventory(colorId, updates)` (~40 LOC)
- [ ] Add `getWarehouseHistory(colorId?, limit?)` (~15 LOC)
- [ ] Add `rollbackInventory(colorId)` (~30 LOC)
- [ ] Add `getShortages()` (~40 LOC)
- [ ] Add `getMonthlyAverageUsage(colorId, months)` (~50 LOC)
- [ ] Add `finalizeMonth(month, archive?)` (~25 LOC)
- [ ] Add private helper methods (~30 LOC)

### Phase 4: Handler Layer
- [ ] Add `getWarehouseByColor(request, reply)` (~15 LOC)
- [ ] Add `updateStockByProfileColor(request, reply)` (~15 LOC)
- [ ] Add `performMonthlyInventory(request, reply)` (~20 LOC)
- [ ] Add `getWarehouseHistory(request, reply)` (~15 LOC)
- [ ] Add `rollbackInventory(request, reply)` (~15 LOC)
- [ ] Add `getShortages(request, reply)` (~10 LOC)
- [ ] Add `getMonthlyAverageUsage(request, reply)` (~20 LOC)
- [ ] Add `finalizeMonth(request, reply)` (~20 LOC)

### Phase 5: Routes Refactoring
- [ ] Import dependencies (~10 LOC)
- [ ] Initialize handler (~5 LOC)
- [ ] Refactor GET /:colorId (~15 LOC)
- [ ] Refactor PUT /:colorId/:profileId (~12 LOC)
- [ ] Refactor POST /monthly-update (~12 LOC)
- [ ] Refactor GET /history/:colorId (~12 LOC)
- [ ] Refactor GET /history (~12 LOC)
- [ ] Refactor POST /rollback-inventory (~15 LOC)
- [ ] Refactor GET /shortages (~10 LOC)
- [ ] Refactor GET /:colorId/average (~15 LOC)
- [ ] Refactor POST /finalize-month (~12 LOC)

### Phase 6: Testing & Documentation
- [ ] Write WarehouseService unit tests (~200 LOC)
- [ ] Write WarehouseRepository unit tests (~150 LOC)
- [ ] Write WarehouseHandler unit tests (~100 LOC)
- [ ] Write integration tests (~150 LOC)
- [ ] Update API documentation
- [ ] Update README
- [ ] Create migration guide

---

## LOC Estimates Summary

| File | Current | Addition | Final | Change |
|------|---------|----------|-------|--------|
| `validators/warehouse.ts` | 23 | +120 | 143 | +521% |
| `repositories/WarehouseRepository.ts` | 136 | +280 | 416 | +206% |
| `services/warehouseService.ts` | 72 | +250 | 322 | +347% |
| `handlers/warehouseHandler.ts` | 34 | +150 | 184 | +441% |
| `routes/warehouse.ts` | 708 | -588 | 120 | -83% |
| **Tests (new)** | 0 | +600 | 600 | - |
| **Total** | 973 | +812 | 1785 | +83% |

**Key Metrics:**
- Routes reduction: 708 → 120 LOC (83% less code in routes)
- Total addition: ~812 LOC (mostly tests and proper layering)
- Test coverage: 600 LOC of tests for 1185 LOC of production code (51% ratio)

---

## Dependencies and Prerequisites

### Required Before Starting
- Existing error handling middleware (already in place)
- Existing event emitter utilities (already in place)
- Prisma client with warehouse schema (already in place)
- Zod validation (already in place)

### Optional Enhancements
- Performance monitoring/logging
- Metrics collection for warehouse operations
- API rate limiting for expensive operations
- WebSocket event batching

---

## Related Files to Review

### Similar Refactored Modules (for reference)
- `apps/api/src/routes/orders.ts`
- `apps/api/src/handlers/orderHandler.ts`
- `apps/api/src/services/orderService.ts`
- `apps/api/src/repositories/OrderRepository.ts`

### Shared Utilities
- `apps/api/src/utils/errors.ts` - Custom error classes
- `apps/api/src/utils/optimistic-locking.ts` - Optimistic locking helpers
- `apps/api/src/services/event-emitter.ts` - Event emission

### Database Schema
- `apps/api/prisma/schema.prisma` - WarehouseStock, WarehouseHistory models

---

## Estimated Timeline

**Phase 1 (Validation):** 2-3 hours
**Phase 2 (Repository):** 3-4 hours
**Phase 3 (Service):** 2-3 hours
**Phase 4 (Handler):** 1-2 hours
**Phase 5 (Routes):** 1-2 hours
**Phase 6 (Testing):** 2 hours

**Total:** 11-16 hours (spread over 2-3 days)

**Contingency:** +20% for unexpected issues (3 hours)

**Grand Total:** 14-19 hours

---

## Conclusion

This refactoring transforms the monolithic `warehouse.ts` from 708 lines of tangled route logic into a properly layered architecture following the established codebase patterns. The result will be:

1. **More maintainable** - clear separation of concerns
2. **More testable** - isolated layers with mocked dependencies
3. **More consistent** - matches orders, deliveries, and other refactored modules
4. **More robust** - proper validation, error handling, and transactions
5. **Better documented** - Swagger schemas and comprehensive tests

The investment of ~14-19 hours will pay dividends in reduced debugging time, faster feature development, and improved code quality going forward.

**Recommended Approach:** Implement incrementally over 2-3 days, with code reviews after phases 2, 4, and 6. Deploy during low-traffic period with comprehensive monitoring.
