# Delivery Service Refactoring Plan

**Date:** 2025-12-30
**Target:** `apps/api/src/services/deliveryService.ts` (682 lines)
**Objective:** Split monolithic service into focused, maintainable modules

---

## Executive Summary

The `DeliveryService` class has grown to 682 lines with multiple responsibilities spanning CRUD operations, calendar management, statistics aggregation, order orchestration, and protocol generation. This refactoring plan proposes splitting it into 4 specialized services following the Single Responsibility Principle while maintaining backward compatibility.

**Current Issues:**
- **Single Responsibility Violation**: One class handles CRUD, analytics, calendar, validation, and orchestration
- **Testing Complexity**: 440+ line test file covering disparate functionality
- **Cognitive Load**: Developers must understand 20+ methods across different domains
- **Maintenance Risk**: Changes to analytics affect CRUD operations (tight coupling)
- **Code Duplication**: Similar date handling and aggregation logic across methods

**Target Metrics:**
- Main service: ~200 lines (70% reduction)
- Each specialized service: 100-200 lines
- Improved test isolation and coverage
- Zero breaking changes to API layer

---

## Current State Analysis

### File Structure

```
deliveryService.ts (682 lines)
├── Dependencies (8 imports)
│   ├── DeliveryRepository
│   ├── OrderVariantService
│   ├── deliveryTotalsService
│   ├── CsvParser
│   ├── event-emitter functions
│   └── date-helpers (11 functions)
├── CRUD Operations (9 methods, ~200 lines)
│   ├── getAllDeliveries
│   ├── getDeliveryById
│   ├── createDelivery
│   ├── updateDelivery
│   ├── deleteDelivery
│   ├── generateDeliveryNumber (private)
│   ├── addItemToDelivery
│   ├── removeItemFromDelivery
│   └── bulkUpdateDeliveryDates
├── Order Management (5 methods, ~150 lines)
│   ├── addOrderToDelivery
│   ├── removeOrderFromDelivery
│   ├── reorderDeliveryOrders
│   ├── moveOrderBetweenDeliveries
│   └── completeDelivery
├── Calendar & Scheduling (2 methods, ~80 lines)
│   ├── getCalendarData
│   └── getCalendarDataBatch
├── Analytics & Statistics (4 methods, ~200 lines)
│   ├── getProfileRequirements
│   ├── getWindowsStatsByWeekday
│   ├── getMonthlyWindowsStats
│   └── getMonthlyProfileStats
└── Protocol Generation (1 method, ~50 lines)
    └── getProtocolData
```

### Dependency Graph

```
DeliveryService
├── DeliveryRepository (database access)
├── OrderVariantService (variant conflict checking)
├── deliveryTotalsService (totals calculation)
├── CsvParser (order number parsing)
├── event-emitter (WebSocket events)
└── prisma (direct access for transactions)
```

### Identified Code Smells

1. **Large Class** (682 lines): Violates SRP, hard to maintain
2. **Feature Envy**: Methods like `getWindowsStatsByWeekday` perform extensive data aggregation (should be in analytics service)
3. **Primitive Obsession**: Date strings passed around instead of Date objects
4. **Shotgun Surgery**: Adding calendar features requires changes across multiple methods
5. **Divergent Change**: Different reasons to change (CRUD vs analytics vs scheduling)
6. **Long Method**: `getMonthlyProfileStats` is 75+ lines with complex logic
7. **Data Clumps**: `month`, `year` parameters always travel together
8. **Inappropriate Intimacy**: Direct `prisma` access bypasses repository layer (line 97)

---

## Proposed Architecture

### Module Structure

```
services/delivery/
├── deliveryService.ts                    # Main orchestrator (200 lines)
├── delivery-order-manager.ts             # Order assignment logic (150 lines)
├── delivery-calendar-service.ts          # Calendar & scheduling (120 lines)
├── delivery-analytics-service.ts         # Statistics & reporting (180 lines)
└── delivery-validation-service.ts        # Business rule validation (100 lines)
```

### Responsibility Matrix

| Module | Responsibilities | Public Methods | Lines |
|--------|-----------------|----------------|-------|
| **DeliveryService** | CRUD operations, orchestration, high-level workflows | 9 | ~200 |
| **DeliveryOrderManager** | Order assignment, reordering, movement, variant checking | 5 | ~150 |
| **DeliveryCalendarService** | Calendar data, working days, holidays, batch queries | 3 | ~120 |
| **DeliveryAnalyticsService** | Statistics, aggregations, profile requirements | 4 | ~180 |
| **DeliveryValidationService** | Business rules, constraints, duplicate detection | 3 | ~100 |

---

## Detailed Module Specifications

### 1. DeliveryService (Main Orchestrator)

**File:** `services/delivery/deliveryService.ts`

**Purpose:** High-level CRUD operations and service orchestration

**Methods:**
```typescript
class DeliveryService {
  // Dependencies
  constructor(
    private repository: DeliveryRepository,
    private orderManager: DeliveryOrderManager,
    private calendarService: DeliveryCalendarService,
    private analyticsService: DeliveryAnalyticsService,
    private validationService: DeliveryValidationService
  )

  // Core CRUD (delegates to repository + adds business logic)
  async getAllDeliveries(filters): PaginatedResponse
  async getDeliveryById(id: number): Delivery
  async createDelivery(data): Delivery
  async updateDelivery(id: number, data): Delivery
  async deleteDelivery(id: number): void
  async bulkUpdateDeliveryDates(fromDate, toDate, yearOffset): UpdateResult

  // Items management
  async addItemToDelivery(deliveryId, data): DeliveryItem
  async removeItemFromDelivery(deliveryId, itemId): void

  // Protocol (delegates to analytics)
  async getProtocolData(deliveryId: number): ProtocolData
}
```

**Key Changes:**
- Remove direct statistics methods (delegate to analytics)
- Remove order management (delegate to order manager)
- Remove calendar logic (delegate to calendar service)
- Keep CRUD + orchestration only

**Dependencies:**
- DeliveryRepository
- DeliveryOrderManager (for protocol data)
- DeliveryAnalyticsService (for protocol data)
- deliveryTotalsService
- event-emitter

---

### 2. DeliveryOrderManager

**File:** `services/delivery/delivery-order-manager.ts`

**Purpose:** Manage order-delivery relationships, positions, and movements

**Methods:**
```typescript
class DeliveryOrderManager {
  constructor(
    private repository: DeliveryRepository,
    private variantService: OrderVariantService,
    private csvParser: CsvParser
  )

  // Order assignment with variant checking
  async addOrderToDelivery(deliveryId, orderId): DeliveryOrder
  async removeOrderFromDelivery(deliveryId, orderId): void
  async reorderDeliveryOrders(deliveryId, orderIds[]): Result
  async moveOrderBetweenDeliveries(sourceId, targetId, orderId): DeliveryOrder
  async completeDelivery(deliveryId, productionDate): CompleteResult

  // Private helpers
  private async validateOrderNotInDelivery(orderId): void
  private async checkVariantConflicts(orderNumber): void
}
```

**Key Logic:**
- Variant conflict detection (lines 137-195)
- Atomic position management (lines 205-234)
- Order movement with transaction safety (lines 236-254)
- Batch order completion (lines 273-294)

**Business Rules:**
1. One order variant per delivery (enforced)
2. Positions must be sequential and unique
3. Movement is atomic (delete + create in transaction)
4. Duplicate orderIds rejected

**Events Emitted:**
- `emitDeliveryUpdated`
- `emitOrderUpdated`

---

### 3. DeliveryCalendarService

**File:** `services/delivery/delivery-calendar-service.ts`

**Purpose:** Calendar data aggregation, working days, holidays

**Methods:**
```typescript
class DeliveryCalendarService {
  constructor(private repository: DeliveryRepository)

  // Calendar queries
  async getCalendarData(year: number, month: number): CalendarData
  async getCalendarDataBatch(months: MonthYear[]): BatchCalendarData
  async getWorkingDaysForMonth(year: number, month: number): WorkingDay[]
  async getHolidaysForYear(year: number): Holiday[]

  // Private helpers
  private async aggregateMultipleMonths(months): AggregatedData
}
```

**Key Logic:**
- Single month calendar data (lines 299-301)
- Batch calendar optimization (lines 307-340)
- Working days integration
- Holiday calculation (delegated to repository)

**Data Structures:**
```typescript
interface CalendarData {
  deliveries: Delivery[]
  unassignedOrders: Order[]
}

interface BatchCalendarData extends CalendarData {
  workingDays: WorkingDay[]
  holidays: Holiday[]
}

interface MonthYear {
  month: number  // 1-12
  year: number
}
```

**Performance Optimization:**
- Parallel Promise.all for multiple months
- Single query for unassigned orders
- Cached holiday calculation

---

### 4. DeliveryAnalyticsService

**File:** `services/delivery/delivery-analytics-service.ts`

**Purpose:** Statistical analysis, reporting, aggregations

**Methods:**
```typescript
class DeliveryAnalyticsService {
  constructor(private repository: DeliveryRepository)

  // Profile analytics
  async getProfileRequirements(fromDate?: Date): ProfileRequirement[]

  // Window/sash/glass statistics
  async getWindowsStatsByWeekday(monthsBack: number): WeekdayStats
  async getMonthlyWindowsStats(monthsBack: number): MonthlyStats
  async getMonthlyProfileStats(monthsBack: number): ProfileUsageStats

  // Private aggregation helpers
  private aggregateProfilesByDelivery(deliveries): ProfileMap
  private calculateWeekdayAverages(deliveries): WeekdayAverages
  private buildMonthRanges(monthsBack: number): DateRange[]
}
```

**Key Logic:**
- Profile requirement aggregation with beam calculation (lines 345-395)
- Weekday statistics with Polish day names (lines 400-457)
- Monthly window/sash/glass trends (lines 462-512)
- Monthly profile usage breakdown (lines 517-592)

**Data Transformations:**
1. **Profile Requirements**: Aggregates by delivery → profile → color, sums beams + meters
2. **Weekday Stats**: Groups by day of week (0-6), calculates averages
3. **Monthly Stats**: Time-series data for deliveries, windows, sashes, glasses
4. **Profile Stats**: Top profiles by usage with color breakdown

**Return Types:**
```typescript
interface ProfileRequirement {
  deliveryId: number
  deliveryDate: string
  profileId: number
  colorCode: string
  totalBeams: number
}

interface WeekdayStats {
  stats: {
    weekday: number
    weekdayName: string
    deliveriesCount: number
    totalWindows: number
    avgWindowsPerDelivery: number
    // ... other metrics
  }[]
  periodStart: Date
  periodEnd: Date
}
```

---

### 5. DeliveryValidationService

**File:** `services/delivery/delivery-validation-service.ts`

**Purpose:** Business rule validation and constraint checking

**Methods:**
```typescript
class DeliveryValidationService {
  constructor(
    private repository: DeliveryRepository,
    private csvParser: CsvParser
  )

  // Delivery number validation
  async generateDeliveryNumber(deliveryDate: Date): Promise<string>
  async validateDeliveryNumberUnique(number: string): boolean

  // Order validation
  async validateOrderIdsUnique(orderIds: number[]): void
  async validateOrdersBelongToDelivery(deliveryId, orderIds): void
  async validateDeliveryExists(deliveryId: number): Delivery

  // Private helpers
  private async getNextSequenceNumber(date: Date): Promise<number>
}
```

**Key Logic:**
- Delivery number generation with race condition prevention (lines 91-111)
- Duplicate order detection (lines 206-211)
- Order ownership validation (lines 218-230)
- Existence checks with NotFoundError

**Transaction Safety:**
- Uses `FOR UPDATE` lock for sequence generation
- Atomic number assignment in transaction

---

## Method Migration Map

### From DeliveryService → DeliveryOrderManager

| Current Method | Line Range | New Location | Breaking Changes |
|---------------|------------|--------------|------------------|
| `addOrderToDelivery` | 137-195 | DeliveryOrderManager | None - delegated |
| `removeOrderFromDelivery` | 197-203 | DeliveryOrderManager | None - delegated |
| `reorderDeliveryOrders` | 205-234 | DeliveryOrderManager | None - delegated |
| `moveOrderBetweenDeliveries` | 236-254 | DeliveryOrderManager | None - delegated |
| `completeDelivery` | 273-294 | DeliveryOrderManager | None - delegated |

### From DeliveryService → DeliveryCalendarService

| Current Method | Line Range | New Location | Breaking Changes |
|---------------|------------|--------------|------------------|
| `getCalendarData` | 299-301 | DeliveryCalendarService | None - delegated |
| `getCalendarDataBatch` | 307-340 | DeliveryCalendarService | None - delegated |

### From DeliveryService → DeliveryAnalyticsService

| Current Method | Line Range | New Location | Breaking Changes |
|---------------|------------|--------------|------------------|
| `getProfileRequirements` | 345-395 | DeliveryAnalyticsService | None - delegated |
| `getWindowsStatsByWeekday` | 400-457 | DeliveryAnalyticsService | None - delegated |
| `getMonthlyWindowsStats` | 462-512 | DeliveryAnalyticsService | None - delegated |
| `getMonthlyProfileStats` | 517-592 | DeliveryAnalyticsService | None - delegated |

### From DeliveryService → DeliveryValidationService

| Current Method | Line Range | New Location | Breaking Changes |
|---------------|------------|--------------|------------------|
| `generateDeliveryNumber` (private) | 91-111 | DeliveryValidationService | None - internal only |

### Remaining in DeliveryService

| Method | Line Range | Reason |
|--------|------------|--------|
| `getAllDeliveries` | 40-48 | Core CRUD |
| `getDeliveryById` | 50-64 | Core CRUD |
| `createDelivery` | 66-84 | Core CRUD |
| `updateDelivery` | 113-126 | Core CRUD |
| `deleteDelivery` | 128-135 | Core CRUD |
| `addItemToDelivery` | 256-265 | Item management (small) |
| `removeItemFromDelivery` | 267-271 | Item management (small) |
| `bulkUpdateDeliveryDates` | 598-638 | Bulk operation (special case) |
| `getProtocolData` | 643-681 | Orchestrates analytics + repository |

---

## Interface Definitions

### Shared Types (create new file: `services/delivery/types.ts`)

```typescript
// Date range utilities
export interface MonthYear {
  month: number  // 1-12
  year: number
}

export interface DateRange {
  month: number
  year: number
  startDate: Date
  endDate: Date
}

// Calendar data
export interface CalendarData {
  deliveries: Delivery[]
  unassignedOrders: Order[]
}

export interface BatchCalendarData extends CalendarData {
  workingDays: WorkingDay[]
  holidays: Holiday[]
}

// Analytics results
export interface ProfileRequirement {
  deliveryId: number
  deliveryDate: string
  profileId: number
  colorCode: string
  totalBeams: number
}

export interface WeekdayStats {
  stats: WeekdayStatEntry[]
  periodStart: Date
  periodEnd: Date
}

export interface WeekdayStatEntry {
  weekday: number
  weekdayName: string
  deliveriesCount: number
  totalWindows: number
  totalSashes: number
  totalGlasses: number
  avgWindowsPerDelivery: number
  avgSashesPerDelivery: number
  avgGlassesPerDelivery: number
}

export interface MonthlyStats {
  stats: MonthlyStatEntry[]
}

export interface MonthlyStatEntry {
  month: number
  year: number
  monthLabel: string
  deliveriesCount: number
  totalWindows: number
  totalSashes: number
  totalGlasses: number
}

export interface ProfileUsageStats {
  stats: MonthlyProfileEntry[]
}

export interface MonthlyProfileEntry {
  month: number
  year: number
  monthLabel: string
  deliveriesCount: number
  profiles: ProfileUsageDetail[]
}

export interface ProfileUsageDetail {
  profileId: number
  profileNumber: string
  profileName: string
  colorId: number
  colorCode: string
  colorName: string
  totalBeams: number
  totalMeters: number
  deliveryCount: number
}

// Order management
export interface CompleteDeliveryResult {
  success: boolean
  updatedOrders: number
}

export interface BulkUpdateResult {
  updated: number
  deliveries: {
    id: number
    oldDate: Date
    newDate: Date
    deliveryNumber: string
  }[]
}

// Protocol data
export interface ProtocolData {
  deliveryId: number
  deliveryDate: Date
  orders: {
    orderNumber: string
    windowsCount: number
    value: number
    isReclamation: boolean
  }[]
  totalWindows: number
  totalPallets: number
  totalValue: number
  generatedAt: Date
}
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1-2, Low Risk)

**Objective:** Create infrastructure without breaking existing code

**Tasks:**
1. Create directory structure: `services/delivery/`
2. Create shared types file: `services/delivery/types.ts`
3. Copy existing tests to `services/delivery/deliveryService.test.ts`
4. Create placeholder files for new services (empty classes)
5. Update imports in existing `deliveryService.ts` to reference types

**Acceptance Criteria:**
- All existing tests pass
- No changes to public API
- Type exports available for use

**Estimated Effort:** 2 hours

---

### Phase 2: Extract DeliveryValidationService (Day 2-3, Low Risk)

**Objective:** Isolate validation logic (minimal dependencies)

**Tasks:**
1. Create `delivery-validation-service.ts`
2. Move `generateDeliveryNumber` method (private → public)
3. Add validation helper methods
4. Update `DeliveryService.createDelivery` to use validation service
5. Write unit tests for validation service

**Code Example:**
```typescript
// services/delivery/delivery-validation-service.ts
export class DeliveryValidationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate unique delivery number in format DD.MM.YYYY_X
   * Uses transaction with row locking to prevent race conditions
   */
  async generateDeliveryNumber(deliveryDate: Date): Promise<string> {
    const datePrefix = formatPolishDate(deliveryDate);
    const { start, end } = getDayRange(deliveryDate);

    return this.prisma.$transaction(async (tx) => {
      const existingDeliveries = await tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM deliveries
        WHERE delivery_date >= ${start.getTime()}
          AND delivery_date <= ${end.getTime()}
        FOR UPDATE
      `;

      const count = Number(existingDeliveries[0]?.count || 0n) + 1;
      const suffix = toRomanNumeral(count);

      return `${datePrefix}_${suffix}`;
    });
  }

  async validateDeliveryExists(deliveryId: number): Promise<Delivery> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { deliveryOrders: true, deliveryItems: true }
    });

    if (!delivery) {
      throw new NotFoundError('Delivery');
    }

    return delivery;
  }
}
```

**Migration in DeliveryService:**
```typescript
// Before
async createDelivery(data) {
  const deliveryDate = parseDate(data.deliveryDate);
  let deliveryNumber = data.deliveryNumber;
  if (!deliveryNumber) {
    deliveryNumber = await this.generateDeliveryNumber(deliveryDate);
  }
  // ...
}

// After
async createDelivery(data) {
  const deliveryDate = parseDate(data.deliveryDate);
  let deliveryNumber = data.deliveryNumber;
  if (!deliveryNumber) {
    deliveryNumber = await this.validationService.generateDeliveryNumber(deliveryDate);
  }
  // ...
}
```

**Tests:**
```typescript
// services/delivery/delivery-validation-service.test.ts
describe('DeliveryValidationService', () => {
  it('should generate unique delivery numbers with Roman numerals', async () => {
    // Test concurrent calls don't create duplicates
  })

  it('should throw NotFoundError when delivery does not exist', async () => {
    // Test validation
  })
})
```

**Acceptance Criteria:**
- All existing delivery creation tests pass
- New validation tests achieve 100% coverage
- No changes to handler/route layer

**Estimated Effort:** 4 hours

---

### Phase 3: Extract DeliveryOrderManager (Day 3-5, Medium Risk)

**Objective:** Isolate order management logic

**Tasks:**
1. Create `delivery-order-manager.ts`
2. Move 5 order-related methods from DeliveryService
3. Inject dependencies (repository, variantService, csvParser)
4. Update DeliveryService to delegate to order manager
5. Update existing tests to test order manager directly
6. Add new tests for order manager edge cases

**Code Example:**
```typescript
// services/delivery/delivery-order-manager.ts
export class DeliveryOrderManager {
  constructor(
    private repository: DeliveryRepository,
    private variantService: OrderVariantService,
    private csvParser: CsvParser
  ) {}

  async addOrderToDelivery(deliveryId: number, orderId: number) {
    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // Check variant conflicts
    const { base: baseNumber } = this.csvParser.parseOrderNumber(order.orderNumber);
    const variantCheck = await this.variantService.checkVariantInDelivery(baseNumber);

    if (variantCheck.hasConflict) {
      throw new ValidationError(
        `Zlecenie ${variantCheck.conflictingOrder.orderNumber} jest już w dostawie`
      );
    }

    // Add order with atomic position calculation
    return this.repository.addOrderToDeliveryAtomic(deliveryId, orderId);
  }

  async reorderDeliveryOrders(deliveryId: number, orderIds: number[]) {
    // Validation logic from lines 206-230
    const uniqueOrderIds = [...new Set(orderIds)];
    if (uniqueOrderIds.length !== orderIds.length) {
      throw new ValidationError('Lista zleceń zawiera duplikaty');
    }

    // ... rest of validation

    await this.repository.reorderDeliveryOrders(deliveryId, uniqueOrderIds);
    return { success: true };
  }

  // ... other methods
}
```

**Migration in DeliveryService:**
```typescript
// Before
async addOrderToDelivery(deliveryId: number, orderId: number) {
  await this.getDeliveryById(deliveryId); // Verify exists
  const order = await prisma.order.findUnique(...);
  // ... 60 lines of logic
}

// After
async addOrderToDelivery(deliveryId: number, orderId: number) {
  await this.validationService.validateDeliveryExists(deliveryId);
  const result = await this.orderManager.addOrderToDelivery(deliveryId, orderId);

  // Emit events
  emitDeliveryUpdated({ id: deliveryId });
  emitOrderUpdated({ id: orderId });

  return result;
}
```

**Tests:**
```typescript
// services/delivery/delivery-order-manager.test.ts
describe('DeliveryOrderManager', () => {
  describe('addOrderToDelivery', () => {
    it('should prevent adding variant if base order already in delivery', async () => {
      // Test variant conflict detection
    })

    it('should calculate position atomically', async () => {
      // Test race condition prevention
    })
  })

  describe('reorderDeliveryOrders', () => {
    it('should reject duplicate order IDs', async () => {
      // Test validation
    })

    it('should reject orders not in delivery', async () => {
      // Test ownership check
    })
  })

  describe('moveOrderBetweenDeliveries', () => {
    it('should move order atomically in transaction', async () => {
      // Test transaction safety
    })
  })
})
```

**Acceptance Criteria:**
- All existing order management tests pass
- DeliveryService delegates successfully
- Events still emitted correctly
- Transaction safety maintained

**Estimated Effort:** 8 hours

---

### Phase 4: Extract DeliveryCalendarService (Day 5-6, Low Risk)

**Objective:** Isolate calendar and scheduling logic

**Tasks:**
1. Create `delivery-calendar-service.ts`
2. Move 2 calendar methods from DeliveryService
3. Update DeliveryService to delegate
4. Update handler to use service directly (optional optimization)
5. Write unit tests for calendar service

**Code Example:**
```typescript
// services/delivery/delivery-calendar-service.ts
export class DeliveryCalendarService {
  constructor(private repository: DeliveryRepository) {}

  async getCalendarData(year: number, month: number): Promise<CalendarData> {
    return this.repository.getCalendarData(year, month);
  }

  async getCalendarDataBatch(months: MonthYear[]): Promise<BatchCalendarData> {
    // Fetch all calendar data in parallel
    const calendarPromises = months.map(({ month, year }) =>
      this.repository.getCalendarData(year, month)
    );

    const calendarResults = await Promise.all(calendarPromises);

    // Aggregate data
    const allDeliveries = calendarResults.flatMap(r => r.deliveries || []);
    const unassignedOrders = calendarResults[0]?.unassignedOrders || [];

    // Get working days and holidays in parallel
    const [workingDaysResults, holidaysResults] = await Promise.all([
      Promise.all(months.map(({ month, year }) =>
        this.repository.getWorkingDays(month, year)
      )),
      Promise.all(
        Array.from(new Set(months.map(m => m.year))).map(year =>
          this.repository.getHolidays(year)
        )
      )
    ]);

    return {
      deliveries: allDeliveries,
      unassignedOrders,
      workingDays: workingDaysResults.flat(),
      holidays: holidaysResults.flat(),
    };
  }
}
```

**Acceptance Criteria:**
- Calendar queries return identical results
- Batch optimization maintained
- Parallel queries still work

**Estimated Effort:** 4 hours

---

### Phase 5: Extract DeliveryAnalyticsService (Day 6-8, Medium Risk)

**Objective:** Isolate all statistics and reporting logic

**Tasks:**
1. Create `delivery-analytics-service.ts`
2. Move 4 analytics methods from DeliveryService
3. Refactor common aggregation logic into private helpers
4. Update DeliveryService.getProtocolData to use analytics service
5. Write comprehensive unit tests for analytics

**Code Example:**
```typescript
// services/delivery/delivery-analytics-service.ts
export class DeliveryAnalyticsService {
  constructor(private repository: DeliveryRepository) {}

  async getProfileRequirements(fromDate?: Date): Promise<ProfileRequirement[]> {
    const deliveries = await this.repository.getDeliveriesWithRequirements(fromDate);

    const result: ProfileRequirement[] = [];

    deliveries.forEach((delivery) => {
      const profileMap = this.aggregateProfilesByDelivery(delivery);

      profileMap.forEach((data, key) => {
        const [profileIdStr, colorCode] = key.split('-');
        const profileId = parseInt(profileIdStr, 10);

        if (isNaN(profileId)) return;

        const beamsFromMeters = Math.ceil(data.meters / 6);
        const totalBeams = data.beams + beamsFromMeters;

        result.push({
          deliveryId: delivery.id,
          deliveryDate: delivery.deliveryDate.toISOString(),
          profileId,
          colorCode,
          totalBeams,
        });
      });
    });

    return result;
  }

  private aggregateProfilesByDelivery(delivery: any): Map<string, { beams: number; meters: number }> {
    const profileMap = new Map<string, { beams: number; meters: number }>();

    delivery.deliveryOrders.forEach((deliveryOrder) => {
      deliveryOrder.order.requirements.forEach((req) => {
        const key = `${req.profileId}-${req.color.code}`;
        const current = profileMap.get(key) || { beams: 0, meters: 0 };
        profileMap.set(key, {
          beams: current.beams + req.beamsCount,
          meters: current.meters + req.meters,
        });
      });
    });

    return profileMap;
  }

  async getWindowsStatsByWeekday(monthsBack: number): Promise<WeekdayStats> {
    const today = new Date();
    const startDate = startOfMonth(subMonths(today, monthsBack));
    const deliveries = await this.repository.getDeliveriesWithWindows(startDate);

    // Initialize weekday stats
    const weekdayStats = new Map<number, WeekdayStatEntry>();
    for (let i = 0; i < 7; i++) {
      weekdayStats.set(i, {
        weekday: i,
        weekdayName: POLISH_DAY_NAMES[i],
        deliveriesCount: 0,
        totalWindows: 0,
        totalSashes: 0,
        totalGlasses: 0,
        avgWindowsPerDelivery: 0,
        avgSashesPerDelivery: 0,
        avgGlassesPerDelivery: 0,
      });
    }

    // Aggregate data
    deliveries.forEach((delivery) => {
      const weekday = getDay(delivery.deliveryDate);
      const stats = weekdayStats.get(weekday)!;

      stats.deliveriesCount += 1;

      delivery.deliveryOrders.forEach((dOrder) => {
        stats.totalWindows += dOrder.order.totalWindows || 0;
        stats.totalSashes += dOrder.order.totalSashes || 0;
        stats.totalGlasses += dOrder.order.totalGlasses || 0;
      });
    });

    // Calculate averages
    const stats = Array.from(weekdayStats.values()).map(stat => ({
      ...stat,
      avgWindowsPerDelivery: stat.deliveriesCount > 0
        ? stat.totalWindows / stat.deliveriesCount
        : 0,
      avgSashesPerDelivery: stat.deliveriesCount > 0
        ? stat.totalSashes / stat.deliveriesCount
        : 0,
      avgGlassesPerDelivery: stat.deliveriesCount > 0
        ? stat.totalGlasses / stat.deliveriesCount
        : 0,
    }));

    return {
      stats,
      periodStart: startDate,
      periodEnd: today,
    };
  }

  // ... other analytics methods
}
```

**Tests:**
```typescript
// services/delivery/delivery-analytics-service.test.ts
describe('DeliveryAnalyticsService', () => {
  describe('getProfileRequirements', () => {
    it('should aggregate profile beams correctly', async () => {
      // Test beam + meter calculation
    })

    it('should group by profile and color', async () => {
      // Test aggregation
    })
  })

  describe('getWindowsStatsByWeekday', () => {
    it('should calculate weekday averages correctly', async () => {
      // Test statistics calculation
    })

    it('should handle empty deliveries', async () => {
      // Test edge case
    })
  })

  describe('getMonthlyProfileStats', () => {
    it('should sort profiles by usage', async () => {
      // Test sorting
    })
  })
})
```

**Acceptance Criteria:**
- All analytics endpoints return identical data
- Performance maintained (parallel queries)
- Protocol generation works with new analytics service

**Estimated Effort:** 8 hours

---

### Phase 6: Refactor Main Service (Day 8-9, Medium Risk)

**Objective:** Clean up DeliveryService to be thin orchestrator

**Tasks:**
1. Update constructor to inject all 4 new services
2. Replace method bodies with delegation calls
3. Keep event emission at service level
4. Update protocol data to use analytics service
5. Clean up unused imports
6. Update existing tests

**Code Example:**
```typescript
// services/delivery/deliveryService.ts (refactored)
export class DeliveryService {
  constructor(
    private repository: DeliveryRepository,
    private orderManager: DeliveryOrderManager,
    private calendarService: DeliveryCalendarService,
    private analyticsService: DeliveryAnalyticsService,
    private validationService: DeliveryValidationService
  ) {}

  // CRUD operations (kept simple)
  async getAllDeliveries(filters: DeliveryFilters) {
    return this.repository.findAll(filters);
  }

  async getDeliveryById(id: number) {
    const delivery = await this.repository.findById(id);
    if (!delivery) throw new NotFoundError('Delivery');

    const totals = await deliveryTotalsService.getDeliveryTotals(id);
    return { ...delivery, ...totals };
  }

  async createDelivery(data: CreateDeliveryDto) {
    const deliveryDate = parseDate(data.deliveryDate);

    let deliveryNumber = data.deliveryNumber;
    if (!deliveryNumber) {
      deliveryNumber = await this.validationService.generateDeliveryNumber(deliveryDate);
    }

    const delivery = await this.repository.create({
      deliveryDate,
      deliveryNumber,
      notes: data.notes,
    });

    emitDeliveryCreated(delivery);
    return delivery;
  }

  // Order management (delegate + emit events)
  async addOrderToDelivery(deliveryId: number, orderId: number) {
    await this.validationService.validateDeliveryExists(deliveryId);
    const result = await this.orderManager.addOrderToDelivery(deliveryId, orderId);

    emitDeliveryUpdated({ id: deliveryId });
    emitOrderUpdated({ id: orderId });

    return result;
  }

  async removeOrderFromDelivery(deliveryId: number, orderId: number) {
    await this.orderManager.removeOrderFromDelivery(deliveryId, orderId);

    emitDeliveryUpdated({ id: deliveryId });
    emitOrderUpdated({ id: orderId });
  }

  // Calendar (pure delegation)
  async getCalendarData(year: number, month: number) {
    return this.calendarService.getCalendarData(year, month);
  }

  async getCalendarDataBatch(months: MonthYear[]) {
    return this.calendarService.getCalendarDataBatch(months);
  }

  // Analytics (pure delegation)
  async getProfileRequirements(fromDate?: string) {
    return this.analyticsService.getProfileRequirements(parseDateSafe(fromDate));
  }

  async getWindowsStatsByWeekday(monthsBack: number) {
    return this.analyticsService.getWindowsStatsByWeekday(monthsBack);
  }

  // Protocol (orchestrate analytics + repository)
  async getProtocolData(deliveryId: number): Promise<ProtocolData> {
    const delivery = await this.repository.getDeliveryForProtocol(deliveryId);
    if (!delivery) throw new NotFoundError('Delivery');

    let totalWindows = 0;
    let totalValue = 0;

    const orders = delivery.deliveryOrders.map((dOrder) => {
      const windowsCount = dOrder.order.windows.reduce((sum, w) => sum + w.quantity, 0);
      totalWindows += windowsCount;

      const value = parseFloat(dOrder.order.valuePln?.toString() || '0');
      totalValue += value;

      return {
        orderNumber: dOrder.order.orderNumber,
        windowsCount,
        value,
        isReclamation: false,
      };
    });

    const totalPallets = await deliveryTotalsService.getTotalPallets(deliveryId);

    return {
      deliveryId,
      deliveryDate: delivery.deliveryDate,
      orders,
      totalWindows,
      totalPallets,
      totalValue,
      generatedAt: new Date(),
    };
  }
}
```

**Constructor Update in Handler:**
```typescript
// handlers/deliveryHandler.ts
export class DeliveryHandler {
  constructor(
    private service: DeliveryService,
    private protocolService?: DeliveryProtocolService
  ) {
    this.protocolService = protocolService || new DeliveryProtocolService();
  }

  // Methods unchanged - still delegate to service
}
```

**Service Instantiation:**
```typescript
// routes/deliveries.ts or index.ts
const repository = new DeliveryRepository(prisma);
const validationService = new DeliveryValidationService(prisma);
const orderManager = new DeliveryOrderManager(repository, variantService, csvParser);
const calendarService = new DeliveryCalendarService(repository);
const analyticsService = new DeliveryAnalyticsService(repository);

const deliveryService = new DeliveryService(
  repository,
  orderManager,
  calendarService,
  analyticsService,
  validationService
);

const deliveryHandler = new DeliveryHandler(deliveryService);
```

**Acceptance Criteria:**
- All handler tests pass without modification
- Service reduced to ~200 lines
- Clear separation of concerns
- Events still emitted correctly

**Estimated Effort:** 6 hours

---

### Phase 7: Update Tests (Day 9-10, Low Risk)

**Objective:** Comprehensive test coverage for all new services

**Tasks:**
1. Create test file for each new service
2. Move relevant tests from old deliveryService.test.ts
3. Add new edge case tests
4. Ensure integration tests still pass
5. Update test documentation

**Test Coverage Targets:**
- DeliveryService: 90% (CRUD + orchestration)
- DeliveryOrderManager: 95% (critical business logic)
- DeliveryCalendarService: 85% (mostly delegation)
- DeliveryAnalyticsService: 90% (complex aggregations)
- DeliveryValidationService: 100% (security-critical)

**New Test Files:**
```
services/delivery/
├── deliveryService.test.ts (updated, ~200 lines)
├── delivery-order-manager.test.ts (new, ~300 lines)
├── delivery-calendar-service.test.ts (new, ~150 lines)
├── delivery-analytics-service.test.ts (new, ~250 lines)
└── delivery-validation-service.test.ts (new, ~100 lines)
```

**Acceptance Criteria:**
- All existing tests pass
- New services have dedicated test files
- Test coverage >= 90% overall
- Integration tests validate service composition

**Estimated Effort:** 6 hours

---

### Phase 8: Documentation & Cleanup (Day 10, Low Risk)

**Objective:** Update documentation and remove deprecated code

**Tasks:**
1. Update README in `services/delivery/` directory
2. Add JSDoc comments to all public methods
3. Update API documentation (if exists)
4. Remove old commented code
5. Update CLAUDE.md with new structure
6. Create migration guide for other developers

**Documentation Structure:**
```markdown
# Delivery Services

## Overview
Modular delivery management system split into specialized services.

## Service Responsibilities

### DeliveryService
Main orchestrator for delivery CRUD operations...

### DeliveryOrderManager
Manages order-delivery relationships...

### DeliveryCalendarService
Provides calendar and scheduling data...

### DeliveryAnalyticsService
Statistical analysis and reporting...

### DeliveryValidationService
Business rule validation and constraints...

## Usage Examples

### Creating a Delivery
```typescript
const service = new DeliveryService(...);
const delivery = await service.createDelivery({
  deliveryDate: '2025-01-15',
  notes: 'Morning delivery'
});
```

### Adding Orders
```typescript
await service.addOrderToDelivery(deliveryId, orderId);
```

## Testing
Each service has dedicated unit tests...
```

**Acceptance Criteria:**
- README created with examples
- All public methods have JSDoc
- Migration guide available
- Old code removed

**Estimated Effort:** 3 hours

---

## Dependencies and Interfaces

### Service Dependency Graph

```
DeliveryService (orchestrator)
├── DeliveryRepository (database)
├── DeliveryOrderManager
│   ├── DeliveryRepository
│   ├── OrderVariantService
│   └── CsvParser
├── DeliveryCalendarService
│   └── DeliveryRepository
├── DeliveryAnalyticsService
│   └── DeliveryRepository
└── DeliveryValidationService
    └── PrismaClient (direct access for transactions)
```

### Handler Layer (No Changes)

```typescript
// handlers/deliveryHandler.ts
export class DeliveryHandler {
  constructor(
    private service: DeliveryService,
    private protocolService?: DeliveryProtocolService
  ) {}

  // All methods unchanged - still call service methods
  async getAll(request, reply) {
    const deliveries = await this.service.getAllDeliveries(validated);
    return reply.send(deliveries);
  }

  async getCalendar(request, reply) {
    const data = await this.service.getCalendarData(year, month);
    return reply.send(data);
  }

  // ... etc - no breaking changes
}
```

### Route Layer (No Changes)

```typescript
// routes/deliveries.ts
const deliveryService = createDeliveryService(); // Factory function
const deliveryHandler = new DeliveryHandler(deliveryService);

fastify.get('/api/deliveries', deliveryHandler.getAll.bind(deliveryHandler));
fastify.get('/api/deliveries/calendar', deliveryHandler.getCalendar.bind(deliveryHandler));
// ... etc - routes unchanged
```

---

## Breaking Changes Analysis

### API Layer: ZERO Breaking Changes

All handler methods remain unchanged. The refactoring is internal to the service layer.

**Proof:**
```typescript
// Before refactoring
class DeliveryHandler {
  async getAll(request, reply) {
    const deliveries = await this.service.getAllDeliveries(validated);
    return reply.send(deliveries);
  }
}

// After refactoring
class DeliveryHandler {
  async getAll(request, reply) {
    const deliveries = await this.service.getAllDeliveries(validated);
    return reply.send(deliveries);  // IDENTICAL - no breaking change
  }
}
```

### Service Layer: Constructor Changes Only

**Breaking Change:**
```typescript
// Before
const service = new DeliveryService(repository);

// After
const service = new DeliveryService(
  repository,
  orderManager,
  calendarService,
  analyticsService,
  validationService
);
```

**Mitigation: Factory Function**
```typescript
// services/delivery/factory.ts
export function createDeliveryService(prisma: PrismaClient): DeliveryService {
  const repository = new DeliveryRepository(prisma);
  const variantService = new OrderVariantService(prisma);
  const csvParser = new CsvParser();

  const validationService = new DeliveryValidationService(prisma);
  const orderManager = new DeliveryOrderManager(repository, variantService, csvParser);
  const calendarService = new DeliveryCalendarService(repository);
  const analyticsService = new DeliveryAnalyticsService(repository);

  return new DeliveryService(
    repository,
    orderManager,
    calendarService,
    analyticsService,
    validationService
  );
}

// Usage
const deliveryService = createDeliveryService(prisma);
```

### Test Layer: Import Path Changes

**Breaking Change:**
```typescript
// Before
import { DeliveryService } from '../services/deliveryService.js';

// After
import { DeliveryService } from '../services/delivery/deliveryService.js';
import { DeliveryOrderManager } from '../services/delivery/delivery-order-manager.js';
```

**Mitigation:**
- Update all imports in single commit
- Use IDE refactoring tools (VS Code: F2 rename)
- Run `pnpm lint` to catch missing imports

---

## Risk Assessment

### High Risk Areas

#### 1. Transaction Safety in DeliveryOrderManager

**Risk:** Moving `moveOrderBetweenDeliveries` transaction logic could introduce data inconsistency

**Current Implementation (lines 236-254):**
```typescript
async moveOrderBetweenDeliveries(sourceId, targetId, orderId) {
  return this.repository.moveOrderBetweenDeliveries(sourceId, targetId, orderId);
}
```

**Mitigation:**
- Keep transaction logic in repository
- Service only calls repository method
- Add integration test for concurrent moves
- Test rollback on failure

**Test:**
```typescript
it('should rollback transaction if target delivery insertion fails', async () => {
  // Mock repository to fail on create
  mockRepo.addOrderToDeliveryAtomic.mockRejectedValue(new Error('DB error'));

  await expect(
    orderManager.moveOrderBetweenDeliveries(1, 2, 5)
  ).rejects.toThrow();

  // Verify order still in source delivery
  const sourceDelivery = await getDeliveryById(1);
  expect(sourceDelivery.deliveryOrders).toContainEqual({ orderId: 5 });
});
```

#### 2. Event Emission Order

**Risk:** Moving event emission could break WebSocket real-time updates

**Current Pattern:**
```typescript
async addOrderToDelivery(deliveryId, orderId) {
  // ... business logic
  emitDeliveryUpdated({ id: deliveryId });
  emitOrderUpdated({ id: orderId });
  return deliveryOrder;
}
```

**Mitigation:**
- Keep all event emission in DeliveryService (orchestrator layer)
- New services do NOT emit events
- Document event emission responsibility clearly

**Principle:**
```
Repository: Database operations
Specialized Services: Business logic
Main Service: Orchestration + Events
```

#### 3. Variant Conflict Detection

**Risk:** Moving variant checking could break order-delivery constraint

**Current Flow:**
```
addOrderToDelivery
  ├── Get order from DB
  ├── Parse order number (52335-a → base: 52335)
  ├── Check if any variant already in delivery
  └── Throw ValidationError if conflict
```

**Mitigation:**
- Move entire flow to DeliveryOrderManager
- Keep OrderVariantService as injected dependency
- Add comprehensive tests for all variant scenarios

**Tests:**
```typescript
describe('variant conflict detection', () => {
  it('should prevent adding 52335-a if 52335 is in delivery', async () => {
    // Setup: 52335 in delivery 1
    // Attempt: Add 52335-a to delivery 1
    // Expect: ValidationError
  })

  it('should allow adding 52335-a if 52335-b is in different delivery', async () => {
    // Setup: 52335-b in delivery 1
    // Attempt: Add 52335-a to delivery 2
    // Expect: Success
  })
})
```

### Medium Risk Areas

#### 4. Calendar Batch Query Performance

**Risk:** Refactoring might break parallel query optimization

**Current Implementation (lines 307-340):**
```typescript
async getCalendarDataBatch(months) {
  const calendarPromises = months.map(({ month, year }) =>
    this.repository.getCalendarData(year, month)
  );
  const calendarResults = await Promise.all(calendarPromises);
  // ...
}
```

**Mitigation:**
- Keep Promise.all pattern in new service
- Add performance test to verify query count
- Benchmark before/after refactoring

**Performance Test:**
```typescript
it('should execute calendar queries in parallel', async () => {
  const spy = vi.spyOn(repository, 'getCalendarData');

  await calendarService.getCalendarDataBatch([
    { month: 1, year: 2025 },
    { month: 2, year: 2025 },
    { month: 3, year: 2025 }
  ]);

  // Verify all queries started before any completed
  expect(spy).toHaveBeenCalledTimes(3);
});
```

#### 5. Protocol Data Composition

**Risk:** Protocol generation depends on multiple services

**Current Flow:**
```
getProtocolData
  ├── repository.getDeliveryForProtocol (orders + windows)
  ├── Calculate totalWindows (loop)
  ├── Calculate totalValue (loop)
  └── deliveryTotalsService.getTotalPallets
```

**Mitigation:**
- Keep orchestration in DeliveryService
- Protocol generation = orchestration use case
- Validate output matches exactly

**Acceptance Test:**
```typescript
it('should generate identical protocol data before and after refactoring', async () => {
  const beforeData = await oldService.getProtocolData(1);
  const afterData = await newService.getProtocolData(1);

  expect(afterData).toEqual(beforeData);
});
```

### Low Risk Areas

#### 6. Analytics Aggregations

**Risk:** Complex Map operations might introduce bugs

**Mitigation:**
- Copy logic exactly (don't optimize during refactoring)
- Add unit tests with known data sets
- Compare output with existing system

#### 7. Date Helper Usage

**Risk:** Inconsistent date parsing across services

**Mitigation:**
- Centralize date parsing in types/utils
- Use strict typing (Date vs string)
- Document expected formats

---

## Testing Strategy

### Unit Tests

**Coverage Targets:**
- DeliveryService: 90%
- DeliveryOrderManager: 95% (critical paths)
- DeliveryCalendarService: 85%
- DeliveryAnalyticsService: 90%
- DeliveryValidationService: 100%

**Test Structure:**
```typescript
// Each service gets dedicated test file
describe('DeliveryOrderManager', () => {
  let orderManager: DeliveryOrderManager;
  let mockRepository: MockDeliveryRepository;
  let mockVariantService: MockOrderVariantService;

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockVariantService = createMockVariantService();
    orderManager = new DeliveryOrderManager(
      mockRepository,
      mockVariantService,
      new CsvParser()
    );
  });

  describe('addOrderToDelivery', () => {
    // Test cases...
  });
});
```

### Integration Tests

**Critical Flows:**
1. Create delivery → Add orders → Reorder → Complete
2. Add order with variant → Verify conflict detection
3. Move order between deliveries → Verify atomic transaction
4. Get calendar batch → Verify parallel queries
5. Get protocol data → Verify all data sources combined

**Example:**
```typescript
describe('Delivery Integration Tests', () => {
  it('should complete full delivery workflow', async () => {
    // 1. Create delivery
    const delivery = await service.createDelivery({
      deliveryDate: '2025-01-15'
    });

    // 2. Add orders
    await service.addOrderToDelivery(delivery.id, 1);
    await service.addOrderToDelivery(delivery.id, 2);

    // 3. Reorder
    await service.reorderDeliveryOrders(delivery.id, [2, 1]);

    // 4. Complete
    const result = await service.completeDelivery(delivery.id, '2025-01-15');

    expect(result.success).toBe(true);
    expect(result.updatedOrders).toBe(2);
  });
});
```

### Regression Tests

**Existing Test Suite:**
- 440 lines in `deliveryService.test.ts`
- All tests must pass after refactoring
- No test changes except imports

**Validation:**
```bash
# Before refactoring
pnpm test deliveryService.test.ts > before.txt

# After refactoring
pnpm test services/delivery/ > after.txt

# Compare
diff before.txt after.txt
# Expected: Only import path differences
```

### Performance Tests

**Benchmarks:**
```typescript
describe('Performance Benchmarks', () => {
  it('calendar batch query should complete in <500ms for 3 months', async () => {
    const start = Date.now();

    await calendarService.getCalendarDataBatch([
      { month: 1, year: 2025 },
      { month: 2, year: 2025 },
      { month: 3, year: 2025 }
    ]);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('analytics query should handle 1000 deliveries in <2s', async () => {
    // Performance test with large dataset
  });
});
```

---

## Migration Guide for Developers

### Step 1: Update Imports

**Before:**
```typescript
import { DeliveryService } from '../services/deliveryService.js';
```

**After:**
```typescript
import { DeliveryService } from '../services/delivery/deliveryService.js';
import { DeliveryOrderManager } from '../services/delivery/delivery-order-manager.js';
// ... other services as needed
```

### Step 2: Use Factory Function

**Before:**
```typescript
const repository = new DeliveryRepository(prisma);
const service = new DeliveryService(repository);
```

**After:**
```typescript
import { createDeliveryService } from '../services/delivery/factory.js';

const service = createDeliveryService(prisma);
```

### Step 3: Update Tests

**Before:**
```typescript
import { DeliveryService } from './deliveryService.js';

const service = new DeliveryService(mockRepository);
```

**After:**
```typescript
import { DeliveryService } from './delivery/deliveryService.js';
import { DeliveryOrderManager } from './delivery/delivery-order-manager.js';

// Option 1: Test service composition
const service = new DeliveryService(
  mockRepository,
  mockOrderManager,
  mockCalendarService,
  mockAnalyticsService,
  mockValidationService
);

// Option 2: Test individual service
const orderManager = new DeliveryOrderManager(
  mockRepository,
  mockVariantService,
  mockCsvParser
);
```

### Step 4: Direct Service Access (Optional)

If you need analytics directly without going through DeliveryService:

```typescript
import { DeliveryAnalyticsService } from '../services/delivery/delivery-analytics-service.js';

const analyticsService = new DeliveryAnalyticsService(repository);
const stats = await analyticsService.getWindowsStatsByWeekday(6);
```

---

## Success Metrics

### Quantitative Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| DeliveryService LOC | 682 | ~200 | <250 |
| Largest method LOC | 75 | <40 | <50 |
| Test file LOC | 440 | 200 (main) | <250 |
| Cyclomatic complexity (avg) | 8 | <5 | <6 |
| Test coverage | 85% | 92% | >90% |
| Number of responsibilities | 5 | 2 | 1-2 |

### Qualitative Metrics

**Maintainability:**
- ✅ Each service has single, clear responsibility
- ✅ New analytics features go to DeliveryAnalyticsService
- ✅ Calendar changes isolated from CRUD operations
- ✅ Order logic changes don't affect statistics

**Testability:**
- ✅ Each service can be tested in isolation
- ✅ Mock dependencies are minimal per service
- ✅ Test setup is simpler (fewer dependencies)
- ✅ Test failures point to specific service

**Developer Experience:**
- ✅ New developers understand service boundaries
- ✅ Code search shows clear module organization
- ✅ IDE autocomplete shows relevant methods only
- ✅ Documentation maps to actual code structure

---

## Rollback Plan

### If Issues Arise During Refactoring

**Phase 1-2 (Validation Service):**
- Low risk - simply revert commits
- No external dependencies changed

**Phase 3-5 (Order/Calendar/Analytics Services):**
- Keep old service file until new services proven
- Run both in parallel during transition
- Use feature flag to switch between implementations

**Example:**
```typescript
// Feature flag approach
const USE_NEW_SERVICES = process.env.DELIVERY_SERVICE_V2 === 'true';

const deliveryService = USE_NEW_SERVICES
  ? createDeliveryServiceV2(prisma)
  : new DeliveryService(repository); // old version
```

**Full Rollback Procedure:**
1. Set `DELIVERY_SERVICE_V2=false` in environment
2. Restart API server
3. Verify endpoints return correct data
4. Git revert refactoring commits
5. Restore old test file
6. Run full test suite

**Time to Rollback:** <15 minutes

---

## Timeline Summary

| Phase | Days | Risk | Effort | Dependencies |
|-------|------|------|--------|-------------|
| 1. Foundation | 0.5 | Low | 2h | None |
| 2. ValidationService | 0.5 | Low | 4h | Phase 1 |
| 3. OrderManager | 2 | Medium | 8h | Phase 2 |
| 4. CalendarService | 1 | Low | 4h | Phase 1 |
| 5. AnalyticsService | 2 | Medium | 8h | Phase 1 |
| 6. Main Service Refactor | 1 | Medium | 6h | Phases 2-5 |
| 7. Tests | 1 | Low | 6h | Phase 6 |
| 8. Documentation | 1 | Low | 3h | Phase 7 |

**Total: 10 days** (can be compressed to 6-7 days with focused work)

---

## Appendix

### A. Code Examples - Before vs After

#### Example 1: Adding Order to Delivery

**Before (all in DeliveryService):**
```typescript
async addOrderToDelivery(deliveryId: number, orderId: number) {
  // 1. Verify delivery exists
  const delivery = await this.getDeliveryById(deliveryId);

  // 2. Get order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true },
  });

  if (!order) {
    throw new NotFoundError('Order');
  }

  // 3. Check variants
  const { base: baseNumber } = this.csvParser.parseOrderNumber(order.orderNumber);
  const variantCheck = await this.variantService.checkVariantInDelivery(baseNumber);

  if (variantCheck.hasConflict && variantCheck.conflictingOrder) {
    throw new ValidationError(
      `Zlecenie ${variantCheck.conflictingOrder.orderNumber} już w dostawie`
    );
  }

  // 4. Add order
  const deliveryOrder = await this.repository.addOrderToDeliveryAtomic(deliveryId, orderId);

  // 5. Emit events
  emitDeliveryUpdated({ id: deliveryId });
  emitOrderUpdated({ id: orderId });

  return deliveryOrder;
}
```

**After (delegated):**
```typescript
// DeliveryService (orchestrator)
async addOrderToDelivery(deliveryId: number, orderId: number) {
  await this.validationService.validateDeliveryExists(deliveryId);
  const result = await this.orderManager.addOrderToDelivery(deliveryId, orderId);

  emitDeliveryUpdated({ id: deliveryId });
  emitOrderUpdated({ id: orderId });

  return result;
}

// DeliveryOrderManager (business logic)
async addOrderToDelivery(deliveryId: number, orderId: number) {
  const order = await this.getOrder(orderId);
  await this.checkVariantConflicts(order.orderNumber);
  return this.repository.addOrderToDeliveryAtomic(deliveryId, orderId);
}

private async checkVariantConflicts(orderNumber: string) {
  const { base } = this.csvParser.parseOrderNumber(orderNumber);
  const check = await this.variantService.checkVariantInDelivery(base);

  if (check.hasConflict) {
    throw new ValidationError(
      `Wariant zlecenia już w dostawie: ${check.conflictingOrder.orderNumber}`
    );
  }
}
```

**Benefits:**
- Clear separation: orchestration vs logic
- OrderManager testable without event system
- Variant logic isolated and reusable

#### Example 2: Getting Analytics

**Before (mixed responsibilities):**
```typescript
// DeliveryService handles CRUD AND analytics
async getMonthlyWindowsStats(monthsBack: number) {
  const today = new Date();

  const monthRanges = [];
  for (let i = 0; i < monthsBack; i++) {
    const targetMonth = subMonths(today, i);
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);
    monthRanges.push({
      month: monthStart.getMonth() + 1,
      year: monthStart.getFullYear(),
      startDate: monthStart,
      endDate: monthEnd,
    });
  }

  const stats = await Promise.all(
    monthRanges.map(async (range) => {
      const deliveries = await this.repository.getDeliveriesWithWindows(
        range.startDate,
        range.endDate
      );

      let totalWindows = 0;
      let totalSashes = 0;
      let totalGlasses = 0;

      deliveries.forEach((delivery) => {
        delivery.deliveryOrders.forEach((dOrder) => {
          totalWindows += dOrder.order.totalWindows || 0;
          totalSashes += dOrder.order.totalSashes || 0;
          totalGlasses += dOrder.order.totalGlasses || 0;
        });
      });

      return {
        month: range.month,
        year: range.year,
        monthLabel: `${range.year}-${String(range.month).padStart(2, '0')}`,
        deliveriesCount: deliveries.length,
        totalWindows,
        totalSashes,
        totalGlasses,
      };
    })
  );

  return { stats: stats.reverse() };
}
```

**After (specialized service):**
```typescript
// DeliveryService (delegation)
async getMonthlyWindowsStats(monthsBack: number) {
  return this.analyticsService.getMonthlyWindowsStats(monthsBack);
}

// DeliveryAnalyticsService (specialized logic)
async getMonthlyWindowsStats(monthsBack: number): Promise<MonthlyStats> {
  const monthRanges = this.buildMonthRanges(monthsBack);

  const stats = await Promise.all(
    monthRanges.map(range => this.getStatsForMonth(range))
  );

  return { stats: stats.reverse() };
}

private buildMonthRanges(monthsBack: number): DateRange[] {
  const today = new Date();
  const ranges: DateRange[] = [];

  for (let i = 0; i < monthsBack; i++) {
    const targetMonth = subMonths(today, i);
    ranges.push({
      month: targetMonth.getMonth() + 1,
      year: targetMonth.getFullYear(),
      startDate: startOfMonth(targetMonth),
      endDate: endOfMonth(targetMonth),
    });
  }

  return ranges;
}

private async getStatsForMonth(range: DateRange): Promise<MonthlyStatEntry> {
  const deliveries = await this.repository.getDeliveriesWithWindows(
    range.startDate,
    range.endDate
  );

  const totals = this.aggregateDeliveryTotals(deliveries);

  return {
    month: range.month,
    year: range.year,
    monthLabel: `${range.year}-${String(range.month).padStart(2, '0')}`,
    deliveriesCount: deliveries.length,
    ...totals,
  };
}

private aggregateDeliveryTotals(deliveries: any[]) {
  let totalWindows = 0;
  let totalSashes = 0;
  let totalGlasses = 0;

  deliveries.forEach((delivery) => {
    delivery.deliveryOrders.forEach((dOrder) => {
      totalWindows += dOrder.order.totalWindows || 0;
      totalSashes += dOrder.order.totalSashes || 0;
      totalGlasses += dOrder.order.totalGlasses || 0;
    });
  });

  return { totalWindows, totalSashes, totalGlasses };
}
```

**Benefits:**
- Analytics logic grouped together
- Helper methods properly scoped
- Easy to add new analytics without touching CRUD
- Better testability (mock repository only)

### B. File Size Comparison

**Before Refactoring:**
```
services/
└── deliveryService.ts           682 lines
    └── deliveryService.test.ts  440 lines
                                ────────
                           Total: 1122 lines
```

**After Refactoring:**
```
services/delivery/
├── deliveryService.ts                    200 lines
├── delivery-order-manager.ts             150 lines
├── delivery-calendar-service.ts          120 lines
├── delivery-analytics-service.ts         180 lines
├── delivery-validation-service.ts        100 lines
├── types.ts                              150 lines
├── factory.ts                             30 lines
├── README.md                              50 lines
├── deliveryService.test.ts               200 lines
├── delivery-order-manager.test.ts        300 lines
├── delivery-calendar-service.test.ts     150 lines
├── delivery-analytics-service.test.ts    250 lines
└── delivery-validation-service.test.ts   100 lines
                                         ────────
                                   Total: 1980 lines
```

**Analysis:**
- 76% increase in total lines (expected with better organization)
- Average file size: 150 lines (down from 682)
- Test files: 1000 lines (up from 440, better coverage)
- Better separation allows parallel development

### C. Dependency Injection Pattern

```typescript
// factory.ts - Encapsulates complex initialization
export function createDeliveryService(prisma: PrismaClient): DeliveryService {
  // Create shared dependencies
  const repository = new DeliveryRepository(prisma);
  const csvParser = new CsvParser();
  const variantService = new OrderVariantService(prisma);

  // Create specialized services
  const validationService = new DeliveryValidationService(prisma);
  const orderManager = new DeliveryOrderManager(
    repository,
    variantService,
    csvParser
  );
  const calendarService = new DeliveryCalendarService(repository);
  const analyticsService = new DeliveryAnalyticsService(repository);

  // Compose main service
  return new DeliveryService(
    repository,
    orderManager,
    calendarService,
    analyticsService,
    validationService
  );
}

// Usage in routes/index.ts
const deliveryService = createDeliveryService(prisma);
const deliveryHandler = new DeliveryHandler(deliveryService);

// Usage in tests (with mocks)
const deliveryService = new DeliveryService(
  mockRepository,
  mockOrderManager,
  mockCalendarService,
  mockAnalyticsService,
  mockValidationService
);
```

---

## Conclusion

This refactoring plan provides a comprehensive roadmap to transform the 682-line `DeliveryService` into a modular, maintainable architecture. By following the phased approach, we can minimize risk while maximizing code quality and developer experience.

**Key Takeaways:**
1. **Zero Breaking Changes** at API level
2. **Incremental Migration** reduces risk
3. **Clear Responsibilities** improve maintainability
4. **Better Testability** increases confidence
5. **Documented Rollback** ensures safety

**Next Steps:**
1. Review and approve this plan
2. Create feature branch: `refactor/delivery-service-modularization`
3. Begin Phase 1 (Foundation)
4. Iterate through phases with code reviews
5. Merge to main after all tests pass

**Questions for Team:**
1. Should we use feature flags for gradual rollout?
2. Any additional analytics methods needed before refactoring?
3. Preferred naming convention: `delivery-order-manager` vs `deliveryOrderManager`?
4. Should CalendarService be merged into AnalyticsService?

---

**Document Version:** 1.0
**Last Updated:** 2025-12-30
**Author:** Claude Sonnet 4.5
**Status:** Ready for Review
