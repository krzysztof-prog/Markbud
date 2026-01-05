# DeliveryService Refactoring Plan

## Implementation Status (Updated 2025-12-31)

| Phase | Service | Status | Notes |
|-------|---------|--------|-------|
| Phase 1 | DeliveryEventEmitter | COMPLETED | Event emission centralized |
| Phase 2 | DeliveryNumberGenerator | COMPLETED | Number generation isolated |
| Phase 3 | DeliveryStatisticsService | COMPLETED | Analytics extracted |
| Phase 4 | DeliveryCalendarService | COMPLETED | Calendar data aggregation extracted |
| Phase 5 | DeliveryOrderService | COMPLETED | Order-delivery associations extracted |
| Phase 6 | DeliveryService Simplification | COMPLETED | Orchestrator pattern implemented |
| Phase 7 | Integration Testing | PENDING | Tests need to be verified |

**New Services Added:**
- DeliveryOptimizationService - Pallet packing algorithms wrapper
- DeliveryNotificationService - WebSocket and email notifications

**Current Line Count**: 446 lines (down from 682)
- Target was 200 lines but file now acts as true orchestrator
- All complex logic delegated to sub-services
- Most methods are thin wrappers delegating to specialized services

---

## Executive Summary

The `deliveryService.ts` file contains **682 lines** and handles multiple responsibilities including delivery CRUD operations, calendar data aggregation, statistics generation, and order management. While more manageable than importService, it still violates SRP and mixes business logic with data aggregation concerns. This plan proposes splitting it into focused services following the layered architecture pattern.

**Priority**: MEDIUM - Important for performance and maintainability, but not blocking.

**Estimated Effort**: 3-4 days for full refactoring with tests.

---

## Current State Analysis

### Lines of Code
- **Total**: 682 lines
- **Class definition**: ~650 lines
- **Imports/Types**: ~30 lines

### Main Responsibilities

1. **Delivery CRUD Operations** (25% of code)
   - Create, read, update, delete deliveries
   - Generate delivery numbers
   - Manage delivery status

2. **Order-Delivery Associations** (20% of code)
   - Add orders to deliveries
   - Remove orders from deliveries
   - Reorder delivery orders
   - Move orders between deliveries
   - Validate variant conflicts

3. **Calendar Data Aggregation** (15% of code)
   - Get calendar data for month
   - Batch calendar data for multiple months
   - Combine deliveries, working days, holidays

4. **Statistics & Analytics** (30% of code)
   - Profile requirements aggregation
   - Windows stats by weekday
   - Monthly windows stats
   - Monthly profile stats

5. **Delivery Items Management** (5% of code)
   - Add custom items (glass, frames, etc.)
   - Remove items

6. **Batch Operations** (5% of code)
   - Complete orders in bulk
   - Bulk update delivery dates
   - Protocol data generation

### Dependencies

**External Dependencies**:
- `DeliveryRepository`
- `deliveryTotalsService`
- `OrderVariantService`
- `CsvParser` (for order number parsing)
- `event-emitter`
- `date-helpers`
- Prisma client

**Database Tables Accessed**:
- `deliveries`
- `delivery_orders`
- `orders`
- `order_requirements`
- `order_windows`
- `working_days`
- `holidays`

### Test Coverage
- Current: ~30% (basic CRUD tests only)
- Target: 85%+

---

## Problems Identified

### 1. Mixed Concerns (Major)

**Issue**: Service handles both business logic AND data aggregation
- CRUD operations (business logic)
- Statistics calculations (analytics)
- Calendar data transformation (presentation)

**Impact**:
- Hard to test analytics separately
- Business logic coupled to reporting
- Cannot optimize statistics queries independently

### 2. Heavy Statistics Methods (Major)

**Issue**: Large methods doing complex aggregations:
- `getProfileRequirements()` - 55 lines
- `getWindowsStatsByWeekday()` - 58 lines
- `getMonthlyWindowsStats()` - 34 lines
- `getMonthlyProfileStats()` - 60 lines

**Impact**:
- Hard to test edge cases
- Difficult to optimize performance
- Cannot reuse aggregation logic

### 3. Calendar Data Complexity (Medium)

**Issue**: `getCalendarDataBatch()` orchestrates multiple queries
- Fetches calendar data for multiple months
- Combines deliveries, working days, holidays
- Complex promise orchestration

**Impact**:
- Performance issues with large date ranges
- Hard to cache effectively
- Difficult to add new data sources

### 4. Variant Conflict Logic Embedded (Medium)

**Issue**: `addOrderToDelivery()` has variant checking logic
- Direct use of `OrderVariantService`
- Business rules mixed with data manipulation
- Hard to test variant scenarios

**Impact**:
- Cannot test variant logic separately
- Hard to change variant rules
- Duplicate validation code

### 5. Date Helpers Overuse (Minor)

**Issue**: Heavy reliance on date-helpers utils
- Many imports from date-helpers
- Complex date calculations inline

**Impact**:
- Hard to understand date logic
- Difficult to handle timezone edge cases

### 6. Event Emission Scattered (Minor)

**Issue**: Events emitted throughout methods
- No consistent pattern
- Easy to forget emitting events
- Hard to track what events are emitted

**Impact**:
- Inconsistent real-time updates
- Debugging WebSocket issues difficult

---

## Proposed Structure

### Module Breakdown

```
services/
├── delivery/
│   ├── DeliveryService.ts                  [CRUD + orchestration - 200 lines]
│   ├── DeliveryOrderService.ts             [Order associations - 180 lines]
│   ├── DeliveryCalendarService.ts          [Calendar data - 150 lines]
│   ├── DeliveryStatisticsService.ts        [Analytics - 250 lines]
│   ├── DeliveryNumberGenerator.ts          [Number generation - 80 lines]
│   └── DeliveryEventEmitter.ts             [Event handling - 60 lines]
├── deliveryTotalsService.ts                [Keep as-is]
└── (other existing services)
```

---

## Module Details

### 1. DeliveryService (Orchestrator + CRUD)

**Responsibilities**:
- Core CRUD operations
- Delivery lifecycle management
- Orchestrate complex operations
- Delegate to specialized services

**Methods**:
```typescript
class DeliveryService {
  constructor(
    private repository: DeliveryRepository,
    private orderService: DeliveryOrderService,
    private calendarService: DeliveryCalendarService,
    private statisticsService: DeliveryStatisticsService,
    private numberGenerator: DeliveryNumberGenerator,
    private eventEmitter: DeliveryEventEmitter,
    private totalsService: DeliveryTotalsService
  ) {}

  // CRUD Operations
  async getAllDeliveries(filters: DeliveryFilters)
  async getDeliveryById(id: number)
  async createDelivery(data: CreateDeliveryData)
  async updateDelivery(id: number, data: UpdateDeliveryData)
  async deleteDelivery(id: number)

  // Bulk operations (delegates)
  async bulkUpdateDeliveryDates(fromDate, toDate, yearOffset)
  async getProtocolData(deliveryId: number)

  // Delegates to specialized services
  async addOrderToDelivery(deliveryId, orderId) // -> DeliveryOrderService
  async getCalendarData(year, month) // -> DeliveryCalendarService
  async getWindowsStatsByWeekday(monthsBack) // -> DeliveryStatisticsService
}
```

**Estimated Lines**: ~200 (down from 682)

**Key Improvements**:
- Focused on core CRUD
- Clear delegation to specialized services
- Centralized event emission

---

### 2. DeliveryOrderService

**Responsibilities**:
- Manage order-delivery associations
- Handle variant conflict validation
- Reorder delivery orders
- Move orders between deliveries

**Methods**:
```typescript
class DeliveryOrderService {
  constructor(
    private repository: DeliveryRepository,
    private variantService: OrderVariantService,
    private csvParser: CsvParser,
    private eventEmitter: DeliveryEventEmitter
  ) {}

  async addOrderToDelivery(deliveryId: number, orderId: number)
  async removeOrderFromDelivery(deliveryId: number, orderId: number)
  async reorderDeliveryOrders(deliveryId: number, orderIds: number[])
  async moveOrderBetweenDeliveries(sourceId, targetId, orderId)
  async completeDeliveryOrders(deliveryId: number, productionDate: string)

  private async validateVariantConflict(orderId: number): Promise<void>
  private async validateOrderBelongsToDelivery(deliveryId, orderId): Promise<void>
}
```

**Estimated Lines**: ~180

**Key Improvements**:
- Variant validation extracted to private method
- Clear validation before state changes
- Atomic operations with transactions
- Consistent event emission

---

### 3. DeliveryCalendarService

**Responsibilities**:
- Aggregate calendar data
- Combine deliveries, working days, holidays
- Optimize batch queries

**Methods**:
```typescript
class DeliveryCalendarService {
  constructor(
    private repository: DeliveryRepository
  ) {}

  async getCalendarData(year: number, month: number): Promise<CalendarData>

  async getCalendarDataBatch(
    months: Array<{ month: number; year: number }>
  ): Promise<BatchCalendarData>

  private async fetchDeliveriesForMonths(months): Promise<Delivery[]>
  private async fetchWorkingDaysForMonths(months): Promise<WorkingDay[]>
  private async fetchHolidaysForYears(years): Promise<Holiday[]>
  private combineCalendarData(deliveries, workingDays, holidays): BatchCalendarData
}
```

**Estimated Lines**: ~150

**Key Improvements**:
- Separated calendar aggregation logic
- Optimized batch queries
- Easier to cache
- Can add more data sources without changing DeliveryService

---

### 4. DeliveryStatisticsService

**Responsibilities**:
- Calculate delivery statistics
- Aggregate windows/sashes/glasses
- Profile usage analytics
- Weekday analysis

**Methods**:
```typescript
class DeliveryStatisticsService {
  constructor(
    private repository: DeliveryRepository
  ) {}

  // Profile statistics
  async getProfileRequirements(fromDate?: string): Promise<ProfileRequirement[]>
  async getMonthlyProfileStats(monthsBack: number): Promise<MonthlyProfileStats>

  // Windows statistics
  async getWindowsStatsByWeekday(monthsBack: number): Promise<WeekdayStats>
  async getMonthlyWindowsStats(monthsBack: number): Promise<MonthlyWindowsStats>

  // Helper methods
  private aggregateProfileUsage(deliveries): Map<string, ProfileUsage>
  private calculateWeekdayAverages(stats): WeekdayStats
  private groupByMonth(deliveries, monthsBack): Map<string, Delivery[]>
}
```

**Estimated Lines**: ~250

**Key Improvements**:
- All statistics in one place
- Easier to add new metrics
- Can optimize queries independently
- Reusable aggregation helpers

---

### 5. DeliveryNumberGenerator

**Responsibilities**:
- Generate unique delivery numbers
- Handle concurrent number generation
- Format delivery numbers

**Methods**:
```typescript
class DeliveryNumberGenerator {
  constructor(private prisma: PrismaClient) {}

  async generateDeliveryNumber(deliveryDate: Date): Promise<string>

  private async getNextSequenceForDate(date: Date): Promise<number>
  private formatDeliveryNumber(date: Date, sequence: number): string
  private toRomanNumeral(num: number): string
}
```

**Estimated Lines**: ~80

**Key Improvements**:
- Extracted number generation logic
- Clear transaction handling
- Row locking for concurrency safety
- Easy to change numbering scheme

**Current Implementation**:
```typescript
// Uses transaction with FOR UPDATE lock
async generateDeliveryNumber(deliveryDate: Date): Promise<string> {
  const datePrefix = formatPolishDate(deliveryDate);
  const { start, end } = getDayRange(deliveryDate);

  return prisma.$transaction(async (tx) => {
    const result = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM deliveries
      WHERE delivery_date >= ${start.getTime()}
        AND delivery_date <= ${end.getTime()}
      FOR UPDATE
    `;

    const count = Number(result[0]?.count || 0n) + 1;
    const suffix = toRomanNumeral(count);

    return `${datePrefix}_${suffix}`;
  });
}
```

---

### 6. DeliveryEventEmitter

**Responsibilities**:
- Centralize event emission
- Ensure consistent event data
- Track what events are emitted

**Methods**:
```typescript
class DeliveryEventEmitter {
  emitDeliveryCreated(delivery: Delivery): void
  emitDeliveryUpdated(delivery: { id: number }): void
  emitDeliveryDeleted(deliveryId: number): void
  emitOrderAddedToDelivery(deliveryId: number, orderId: number): void
  emitOrderRemovedFromDelivery(deliveryId: number, orderId: number): void
  emitOrderMovedBetweenDeliveries(sourceId, targetId, orderId): void

  // Batch events
  emitDeliveriesUpdated(deliveryIds: number[]): void
}
```

**Estimated Lines**: ~60

**Key Improvements**:
- Single place for all delivery events
- Consistent event structure
- Easy to add logging/monitoring
- Can batch events for performance

---

## Implementation Steps

### Phase 1: Extract Event Emitter (Day 1, 4 hours)
**Goal**: Centralize event emission logic

1. Create `DeliveryEventEmitter.ts`
   - Extract event emission methods
   - Add consistent event data structure
   - Add tests

2. Update `DeliveryService` to use emitter
   - Inject emitter as dependency
   - Replace direct emitX() calls
   - Verify events still work

**Deliverable**: Event emitter with tests

**Risk**: LOW - Simple extraction

---

### Phase 2: Extract Number Generator (Day 1, 4 hours)
**Goal**: Isolate number generation logic

1. Create `DeliveryNumberGenerator.ts`
   - Move `generateDeliveryNumber()`
   - Keep transaction logic
   - Add tests for concurrency

2. Update `DeliveryService.createDelivery()`
   - Use number generator
   - Update tests

**Deliverable**: Number generator with concurrency tests

**Risk**: LOW - Logic already isolated in private method

---

### Phase 3: Extract Statistics Service (Day 2, Full Day)
**Goal**: Separate analytics from CRUD

1. Create `DeliveryStatisticsService.ts`
   - Move `getProfileRequirements()`
   - Move `getWindowsStatsByWeekday()`
   - Move `getMonthlyWindowsStats()`
   - Move `getMonthlyProfileStats()`
   - Extract helper methods for aggregation
   - Add comprehensive tests

2. Update `DeliveryService`
   - Inject statistics service
   - Delegate stats calls
   - Update handler tests

**Deliverable**: Statistics service with tests

**Risk**: MEDIUM - Complex aggregation logic

---

### Phase 4: Extract Calendar Service (Day 3, 4 hours)
**Goal**: Isolate calendar data aggregation

1. Create `DeliveryCalendarService.ts`
   - Move `getCalendarData()`
   - Move `getCalendarDataBatch()`
   - Extract helper methods
   - Add tests

2. Update `DeliveryService`
   - Inject calendar service
   - Delegate calendar calls

**Deliverable**: Calendar service with tests

**Risk**: LOW - Already well-structured

---

### Phase 5: Extract Order Service (Day 3, 4 hours)
**Goal**: Separate order-delivery associations

1. Create `DeliveryOrderService.ts`
   - Move `addOrderToDelivery()`
   - Move `removeOrderFromDelivery()`
   - Move `reorderDeliveryOrders()`
   - Move `moveOrderBetweenDeliveries()`
   - Move `completeDeliveryOrders()`
   - Extract variant validation
   - Add tests

2. Update `DeliveryService`
   - Inject order service
   - Delegate order operations

**Deliverable**: Order service with tests

**Risk**: MEDIUM - Variant validation complex

---

### Phase 6: Simplify Main Service (Day 4, 4 hours)
**Goal**: Reduce DeliveryService to orchestrator + CRUD

1. Review `DeliveryService`
   - Ensure CRUD operations remain
   - All complex logic delegated
   - Add integration tests

2. Update all handlers
   - Verify no breaking changes
   - Update imports if needed

**Deliverable**: Simplified DeliveryService (~200 lines)

**Risk**: LOW - If previous phases done correctly

---

### Phase 7: Integration Testing (Day 4, 4 hours)
**Goal**: Ensure all pieces work together

1. Create integration tests
   - Full delivery lifecycle
   - Order operations
   - Statistics calculations
   - Calendar data fetching

2. Performance testing
   - Batch calendar queries
   - Large statistics calculations

**Deliverable**: Integration test suite

**Risk**: LOW - Services loosely coupled

---

## Breaking Changes

### API Changes
**None** - All public methods maintain same signature.

### Internal Changes
- Constructor parameters change (dependency injection)
- Private methods move to new services
- Tests need updates

---

## Testing Strategy

### Unit Tests (Target: 85% coverage)

**Per Module**:
```
DeliveryEventEmitter: 100% coverage
  - All event types
  - Event data structure
  - Batch events

DeliveryNumberGenerator: 95% coverage
  - Number generation
  - Concurrent requests
  - Date edge cases
  - Roman numeral conversion

DeliveryStatisticsService: 85% coverage
  - Profile aggregation
  - Windows stats
  - Monthly calculations
  - Weekday analysis
  - Edge cases (no data)

DeliveryCalendarService: 90% coverage
  - Single month
  - Batch months
  - Data combination
  - Missing data handling

DeliveryOrderService: 85% coverage
  - Add/remove orders
  - Reordering
  - Move between deliveries
  - Variant validation
  - Error scenarios

DeliveryService: 80% coverage
  - CRUD operations
  - Orchestration logic
  - Error handling
```

### Integration Tests

**Critical Flows**:
1. Create delivery → Add orders → Reorder → Complete
2. Get calendar data → Multiple months → Verify all data present
3. Calculate statistics → Verify aggregations correct
4. Move order between deliveries → Verify state consistent
5. Concurrent delivery creation → Verify unique numbers

---

## Risk Assessment

### High Risk Areas

**None** - This refactoring is lower risk than importService

### Medium Risk Areas

1. **Statistics Service Extraction** (Phase 3)
   - **Risk**: Complex aggregations, easy to break
   - **Mitigation**: Comprehensive tests, compare old vs new results
   - **Contingency**: Keep old methods commented until verified

2. **Order Service Variant Validation** (Phase 5)
   - **Risk**: Variant logic is critical
   - **Mitigation**: Extract validation to testable method, add edge case tests
   - **Contingency**: Rollback if validation breaks

### Low Risk Areas

1. Event Emitter (Phase 1) - Simple delegation
2. Number Generator (Phase 2) - Already isolated
3. Calendar Service (Phase 4) - Well-structured

---

## Success Metrics

### Code Quality Metrics

- **Lines per file**: Target <250 lines (from 682)
- **Cyclomatic complexity**: Target <8 per method (from 15+)
- **Test coverage**: Target 85%+ (from 30%)
- **Number of responsibilities**: 1 per class (from 6)

### Performance Metrics

- **Calendar batch query time**: Same or better
- **Statistics calculation time**: No regression
- **Memory usage**: No significant increase

### Maintainability Metrics

- **Time to add new statistic**: <2 hours (vs 4+ hours)
- **Time to understand module**: <20 min per module
- **Code review time**: <1 hour per PR

---

## Dependencies & Migration

### Service Dependencies Graph

```
DeliveryService (orchestrator + CRUD)
  ├─> DeliveryOrderService
  │     ├─> DeliveryRepository
  │     ├─> OrderVariantService
  │     ├─> CsvParser
  │     └─> DeliveryEventEmitter
  │
  ├─> DeliveryCalendarService
  │     └─> DeliveryRepository
  │
  ├─> DeliveryStatisticsService
  │     └─> DeliveryRepository
  │
  ├─> DeliveryNumberGenerator
  │     └─> PrismaClient
  │
  ├─> DeliveryEventEmitter
  │     └─> event-emitter (global)
  │
  └─> DeliveryTotalsService (existing)
```

### Backward Compatibility

**Handlers remain unchanged**:
```typescript
// deliveryHandler.ts - NO CHANGES NEEDED
async getDeliveryById(request, reply) {
  const delivery = await this.deliveryService.getDeliveryById(id)
  return delivery
}
```

---

## Code Examples

### Before (Current)

```typescript
// deliveryService.ts - 682 lines
class DeliveryService {
  async getMonthlyWindowsStats(monthsBack: number) {
    // 34 lines of complex date/aggregation logic
    const today = new Date();
    const monthRanges = [];
    for (let i = 0; i < monthsBack; i++) {
      // ... date calculations
    }

    const stats = await Promise.all(
      monthRanges.map(async (range) => {
        const deliveries = await this.repository.getDeliveriesWithWindows(...)
        // ... aggregation logic
      })
    );

    return { stats: stats.reverse() };
  }
}
```

### After (Refactored)

```typescript
// DeliveryService.ts - 200 lines (orchestrator)
class DeliveryService {
  constructor(
    private statisticsService: DeliveryStatisticsService,
    // ... other services
  ) {}

  async getMonthlyWindowsStats(monthsBack: number) {
    return this.statisticsService.getMonthlyWindowsStats(monthsBack);
  }
}

// DeliveryStatisticsService.ts - 250 lines (focused)
class DeliveryStatisticsService {
  async getMonthlyWindowsStats(monthsBack: number) {
    // Extract month ranges
    const monthRanges = this.generateMonthRanges(monthsBack);

    // Fetch data in parallel
    const stats = await this.calculateMonthlyStats(monthRanges);

    return { stats: stats.reverse() };
  }

  private generateMonthRanges(monthsBack: number) {
    // Clear helper method
    const today = new Date();
    const ranges = [];
    for (let i = 0; i < monthsBack; i++) {
      ranges.push(this.createMonthRange(today, i));
    }
    return ranges;
  }

  private async calculateMonthlyStats(ranges) {
    return Promise.all(
      ranges.map(range => this.calculateStatsForMonth(range))
    );
  }

  private async calculateStatsForMonth(range) {
    const deliveries = await this.repository.getDeliveriesWithWindows(
      range.startDate,
      range.endDate
    );

    return this.aggregateWindowStats(deliveries, range);
  }
}
```

**Benefits**:
- Statistics logic isolated and testable
- Helper methods extracted
- Clear data flow
- Easy to add new statistics

---

## Conclusion

This refactoring plan transforms a 682-line service with mixed concerns into 6 focused modules. The work is broken into 7 phases over 4 days, with lower risk than the importService refactoring.

**Expected Benefits**:
- 85%+ test coverage (from 30%)
- <250 lines per file (from 682)
- Clear separation of analytics from CRUD
- Easier to add new statistics
- Better performance through focused optimization

**Next Action**: Approve plan and start Phase 1 (event emitter extraction).
