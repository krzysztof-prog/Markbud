# Dashboard Routes Refactoring Plan

**Date:** 2025-12-30
**Target File:** `apps/api/src/routes/dashboard.ts` (401 lines)
**Author:** Architecture Refactoring Assistant
**Status:** Planning Phase

---

## Executive Summary

The `dashboard.ts` file currently contains 401 lines mixing route definitions, business logic, and database queries directly in route handlers. This violates the project's established layered architecture pattern (Routes → Handlers → Services → Repositories) and creates several maintainability, testability, and performance issues.

**Key Objectives:**
1. Extract business logic into dedicated Handler and Service layers
2. Optimize database queries and aggregations for better performance
3. Improve code reusability and testability
4. Maintain backward compatibility with existing API contracts
5. Add proper error handling and validation

**Estimated Effort:** 6-8 hours
**Risk Level:** Medium (high test coverage needed due to complex aggregations)

---

## Current State Analysis

### File Structure
```
dashboard.ts (401 lines)
├── GET /                    (lines 7-94)   - Main dashboard data
├── GET /alerts              (lines 96-168)  - Alert system
├── GET /stats/weekly        (lines 170-259) - Weekly statistics (OPTIMIZED with raw SQL)
├── GET /stats/monthly       (lines 261-322) - Monthly statistics
├── Helper: getWeekNumber()  (lines 325-333)
├── Helper: getShortages()   (lines 349-394) - Material shortages (OPTIMIZED with raw SQL)
└── Helper: calculatePriority() (lines 397-401)
```

### Identified Issues

#### Critical Issues
1. **Violation of Layered Architecture** (Lines 7-322)
   - All business logic embedded directly in route handlers
   - No separation of concerns
   - Difficult to test individual components
   - Code duplication across routes

2. **Missing Input Validation** (Lines 7, 96, 171, 262)
   - No Zod schema validation for query parameters
   - Direct access to `request.query` without type safety
   - Potential for runtime errors

3. **Inconsistent Error Handling** (Lines 87-93, 252-258)
   - Generic 500 errors without proper error classification
   - No use of custom error classes (NotFoundError, ValidationError)
   - Error messages exposed in responses

#### Major Issues
4. **Direct Prisma Access in Routes** (Lines 10-65)
   - Routes directly import and use `prisma` instance
   - Violates Repository pattern
   - Makes unit testing impossible without database

5. **Code Duplication** (Lines 53, 102, 349)
   - `getShortages()` called from multiple places
   - Similar aggregation patterns repeated
   - Date manipulation logic duplicated

6. **Performance Concerns**
   - Multiple sequential database queries (lines 10-65)
   - Could be parallelized with `Promise.all()`
   - Some queries already optimized with raw SQL (good!)

7. **Missing Type Definitions**
   - Response types not explicitly defined
   - Makes frontend integration harder
   - No OpenAPI/Swagger documentation

#### Minor Issues
8. **Helper Functions in Route File** (Lines 325-401)
   - Utility functions mixed with route definitions
   - Should be extracted to utils directory

9. **Hard-coded Business Rules** (Lines 84, 397-401)
   - Magic numbers (5, 7 days, priority thresholds)
   - Should be configurable via settings or constants

10. **Inconsistent Date Handling** (Lines 15-16, 133-136, 173-184)
    - Multiple ways of calculating date ranges
    - Potential timezone issues

---

## Proposed Architecture

### New File Structure
```
apps/api/src/
├── routes/
│   └── dashboard.ts              (40-50 lines, route definitions only)
├── handlers/
│   └── dashboardHandler.ts       (100-120 lines, HTTP layer)
├── services/
│   └── dashboardService.ts       (200-250 lines, business logic)
├── repositories/
│   └── DashboardRepository.ts    (150-180 lines, database access)
├── validators/
│   └── dashboard.ts              (40-50 lines, Zod schemas)
└── utils/
    └── date-helpers.ts           (50-60 lines, date utilities)
```

### Layered Responsibilities

#### Layer 1: Routes (`dashboard.ts`)
- Register Fastify endpoints
- Apply middleware (auth)
- Delegate to Handler
- ~40-50 lines

#### Layer 2: Handler (`dashboardHandler.ts`)
- Validate input with Zod schemas
- Call service methods
- Format HTTP responses
- Handle HTTP-specific concerns
- ~100-120 lines

#### Layer 3: Service (`dashboardService.ts`)
- Implement business logic
- Orchestrate repository calls
- Apply business rules
- Emit events if needed
- ~200-250 lines

#### Layer 4: Repository (`DashboardRepository.ts`)
- Execute database queries
- Raw SQL for complex aggregations
- Return typed data structures
- ~150-180 lines

---

## Detailed Refactoring Plan

### Phase 1: Setup & Validation (Est. 1 hour)

#### Step 1.1: Create Validator Schemas
**File:** `apps/api/src/validators/dashboard.ts`

```typescript
import { z } from 'zod';

// Query schema for /stats/monthly
export const monthlyStatsQuerySchema = z.object({
  month: z.string().regex(/^([1-9]|1[0-2])$/).optional(), // 1-12
  year: z.string().regex(/^\d{4}$/).optional(),             // YYYY
});

export type MonthlyStatsQuery = z.infer<typeof monthlyStatsQuerySchema>;

// Query schema for /stats/weekly (currently no params, but for future)
export const weeklyStatsQuerySchema = z.object({
  weeksCount: z.string().regex(/^[1-9]\d*$/).optional().default('8'), // Default 8 weeks
});

export type WeeklyStatsQuery = z.infer<typeof weeklyStatsQuerySchema>;

// Alerts query schema (for future filtering)
export const alertsQuerySchema = z.object({
  type: z.enum(['shortage', 'import', 'delivery']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
});

export type AlertsQuery = z.infer<typeof alertsQuerySchema>;
```

**Testing:**
- Create `dashboard.test.ts` with schema validation tests
- Test valid and invalid inputs
- Ensure proper type inference

---

### Phase 2: Repository Layer (Est. 2 hours)

#### Step 2.1: Create DashboardRepository
**File:** `apps/api/src/repositories/DashboardRepository.ts`

```typescript
import { PrismaClient, Prisma } from '@prisma/client';

export interface ShortageResult {
  profileId: number;
  profileNumber: string;
  colorId: number;
  colorCode: string;
  colorName: string;
  currentStock: number;
  demand: number;
  afterDemand: number;
  shortage: number;
}

export interface WeekStatResult {
  deliveryDate: string;
  deliveriesCount: number;
  ordersCount: number;
  windowsCount: number;
}

export interface DashboardStats {
  activeOrders: number;
  upcomingDeliveriesCount: number;
  pendingImportsCount: number;
  shortagesCount: number;
}

export class DashboardRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get count of active (non-archived) orders
   */
  async getActiveOrdersCount(): Promise<number> {
    return this.prisma.order.count({
      where: { archivedAt: null },
    });
  }

  /**
   * Get upcoming deliveries within date range
   */
  async getUpcomingDeliveries(from: Date, to: Date) {
    return this.prisma.delivery.findMany({
      where: {
        deliveryDate: { gte: from, lte: to },
        status: { in: ['planned', 'in_preparation', 'ready'] },
      },
      select: {
        id: true,
        deliveryDate: true,
        status: true,
        _count: {
          select: { deliveryOrders: true },
        },
      },
      orderBy: { deliveryDate: 'asc' },
    });
  }

  /**
   * Get pending file imports
   */
  async getPendingImports(limit = 10) {
    return this.prisma.fileImport.findMany({
      where: { status: 'pending' },
      select: {
        id: true,
        filename: true,
        fileType: true,
        status: true,
        createdAt: true,
        errorMessage: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get count of pending imports
   */
  async getPendingImportsCount(): Promise<number> {
    return this.prisma.fileImport.count({
      where: { status: 'pending' },
    });
  }

  /**
   * Get recent orders (non-archived)
   */
  async getRecentOrders(limit = 5) {
    return this.prisma.order.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        valuePln: true,
      },
    });
  }

  /**
   * Get material shortages using optimized raw SQL
   * PERFORMANCE: Single query with LEFT JOIN instead of multiple queries
   */
  async getShortages(): Promise<ShortageResult[]> {
    return this.prisma.$queryRaw<ShortageResult[]>`
      SELECT
        ws.profile_id as "profileId",
        p.number as "profileNumber",
        ws.color_id as "colorId",
        c.code as "colorCode",
        c.name as "colorName",
        ws.current_stock_beams as "currentStock",
        COALESCE(SUM(req.beams_count), 0) as demand,
        (ws.current_stock_beams - COALESCE(SUM(req.beams_count), 0)) as "afterDemand",
        ABS(ws.current_stock_beams - COALESCE(SUM(req.beams_count), 0)) as shortage
      FROM warehouse_stock ws
      INNER JOIN profiles p ON p.id = ws.profile_id
      INNER JOIN colors c ON c.id = ws.color_id
      LEFT JOIN order_requirements req ON
        req.profile_id = ws.profile_id
        AND req.color_id = ws.color_id
      LEFT JOIN orders o ON o.id = req.order_id
        AND o.archived_at IS NULL
        AND o.status NOT IN ('archived', 'completed')
      GROUP BY
        ws.profile_id,
        ws.color_id,
        ws.current_stock_beams,
        p.number,
        c.code,
        c.name
      HAVING (ws.current_stock_beams - COALESCE(SUM(req.beams_count), 0)) < 0
      ORDER BY shortage DESC
    `;
  }

  /**
   * Get deliveries count for today
   */
  async getTodayDeliveriesCount(today: Date, tomorrow: Date): Promise<number> {
    return this.prisma.delivery.count({
      where: {
        deliveryDate: { gte: today, lt: tomorrow },
        status: { in: ['planned', 'in_preparation'] },
      },
    });
  }

  /**
   * Get weekly statistics using optimized raw SQL
   * PERFORMANCE: Single GROUP BY query instead of deep Prisma nesting
   */
  async getWeeklyStats(startDate: Date, endDate: Date): Promise<WeekStatResult[]> {
    return this.prisma.$queryRaw<WeekStatResult[]>`
      SELECT
        DATE(datetime(d.delivery_date/1000, 'unixepoch')) as "deliveryDate",
        COUNT(DISTINCT d.id) as "deliveriesCount",
        COUNT(DISTINCT do.order_id) as "ordersCount",
        COALESCE(SUM(ow.quantity), 0) as "windowsCount"
      FROM deliveries d
      LEFT JOIN delivery_orders do ON do.delivery_id = d.id
      LEFT JOIN order_windows ow ON ow.order_id = do.order_id
      WHERE d.delivery_date >= ${startDate}
        AND d.delivery_date < ${endDate}
      GROUP BY DATE(datetime(d.delivery_date/1000, 'unixepoch'))
      ORDER BY d.delivery_date ASC
    `;
  }

  /**
   * Get monthly order statistics
   */
  async getMonthlyOrders(startDate: Date, endDate: Date) {
    return this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        valuePln: true,
        valueEur: true,
        windows: {
          select: { quantity: true },
        },
      },
    });
  }

  /**
   * Get monthly deliveries count
   */
  async getMonthlyDeliveriesCount(startDate: Date, endDate: Date): Promise<number> {
    return this.prisma.delivery.count({
      where: {
        deliveryDate: { gte: startDate, lte: endDate },
      },
    });
  }
}
```

**Testing:**
- Unit tests for each repository method
- Mock PrismaClient
- Test raw SQL queries with realistic data
- Verify performance with EXPLAIN QUERY PLAN

**Dependencies:**
- Create test database fixtures
- Setup Vitest mocks for PrismaClient

---

### Phase 3: Service Layer (Est. 2-3 hours)

#### Step 3.1: Create DashboardService
**File:** `apps/api/src/services/dashboardService.ts`

```typescript
import { DashboardRepository, ShortageResult } from '../repositories/DashboardRepository.js';
import { getWeekNumber, getDateRange, getMonthRange } from '../utils/date-helpers.js';

export interface DashboardData {
  stats: {
    activeOrders: number;
    upcomingDeliveriesCount: number;
    pendingImportsCount: number;
    shortagesCount: number;
  };
  upcomingDeliveries: Array<{
    id: number;
    deliveryDate: string;
    status: string;
    ordersCount: number;
    weekNumber: number;
  }>;
  pendingImports: any[];
  shortages: Array<ShortageResult & { priority: string }>;
  recentOrders: any[];
}

export interface Alert {
  id: number;
  type: 'shortage' | 'import' | 'delivery';
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  details: string;
  timestamp: string;
  data?: any;
}

export interface WeeklyStat {
  weekNumber: number;
  startDate: string;
  endDate: string;
  deliveriesCount: number;
  ordersCount: number;
  windows: number;
  sashes: number;
  glasses: number;
}

export interface MonthlyStat {
  month: number;
  year: number;
  totalOrders: number;
  totalWindows: number;
  totalValuePln: number;
  totalValueEur: number;
  totalDeliveries: number;
}

export class DashboardService {
  constructor(private repository: DashboardRepository) {}

  /**
   * Get main dashboard data
   * PERFORMANCE: Parallelized queries with Promise.all
   */
  async getDashboardData(): Promise<DashboardData> {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // PERFORMANCE: Execute all queries in parallel
    const [
      activeOrdersCount,
      upcomingDeliveries,
      pendingImports,
      shortagesRaw,
      recentOrders,
    ] = await Promise.all([
      this.repository.getActiveOrdersCount(),
      this.repository.getUpcomingDeliveries(now, weekFromNow),
      this.repository.getPendingImports(10),
      this.repository.getShortages(),
      this.repository.getRecentOrders(5),
    ]);

    // Calculate shortages with priority
    const shortages = shortagesRaw.map(s => ({
      ...s,
      demand: Number(s.demand),
      shortage: Number(s.shortage),
      priority: this.calculatePriority(Number(s.afterDemand)),
    }));

    return {
      stats: {
        activeOrders: activeOrdersCount,
        upcomingDeliveriesCount: upcomingDeliveries.length,
        pendingImportsCount: pendingImports.length,
        shortagesCount: shortages.length,
      },
      upcomingDeliveries: upcomingDeliveries.map(d => ({
        id: d.id,
        deliveryDate: d.deliveryDate.toISOString(),
        status: d.status,
        ordersCount: d._count.deliveryOrders,
        weekNumber: getWeekNumber(d.deliveryDate),
      })),
      pendingImports,
      shortages: shortages.slice(0, 5), // Top 5 shortages
      recentOrders,
    };
  }

  /**
   * Get dashboard alerts
   * PERFORMANCE: Parallelized queries
   */
  async getAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    let alertIdCounter = 1;

    const { today, tomorrow } = getDateRange('today');

    // PERFORMANCE: Execute queries in parallel
    const [shortages, pendingImportsCount, todayDeliveriesCount] = await Promise.all([
      this.repository.getShortages(),
      this.repository.getPendingImportsCount(),
      this.repository.getTodayDeliveriesCount(today, tomorrow),
    ]);

    // Add shortage alerts
    for (const shortage of shortages) {
      alerts.push({
        id: alertIdCounter++,
        type: 'shortage',
        priority: this.calculatePriority(Number(shortage.afterDemand)),
        message: `Brak profilu ${shortage.profileNumber} w kolorze ${shortage.colorName}`,
        details: `Brakuje ${shortage.shortage} bel`,
        timestamp: new Date().toISOString(),
        data: shortage,
      });
    }

    // Add import alerts
    if (pendingImportsCount > 0) {
      alerts.push({
        id: alertIdCounter++,
        type: 'import',
        priority: 'medium',
        message: `${pendingImportsCount} plik(ów) oczekuje na import`,
        details: 'Sprawdź zakładkę importów',
        timestamp: new Date().toISOString(),
      });
    }

    // Add delivery alerts
    if (todayDeliveriesCount > 0) {
      alerts.push({
        id: alertIdCounter++,
        type: 'delivery',
        priority: 'high',
        message: `${todayDeliveriesCount} dostawa(y) zaplanowana na dziś`,
        details: 'Sprawdź kalendarz dostaw',
        timestamp: new Date().toISOString(),
      });
    }

    // Sort by priority
    return this.sortAlertsByPriority(alerts);
  }

  /**
   * Get weekly statistics for N weeks
   */
  async getWeeklyStats(weeksCount = 8): Promise<{ weeks: WeeklyStat[] }> {
    const { startOfWeek } = getDateRange('currentWeek');
    const endDate = new Date(startOfWeek);
    endDate.setDate(startOfWeek.getDate() + (weeksCount * 7));

    // Fetch aggregated data from repository
    const weekStats = await this.repository.getWeeklyStats(startOfWeek, endDate);

    // Group by weeks in JavaScript (fast, data already aggregated)
    const weeks: WeeklyStat[] = [];
    for (let i = 0; i < weeksCount; i++) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(startOfWeek.getDate() + (i * 7));

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Find deliveries in this week (from pre-aggregated data)
      const weekData = weekStats.filter(stat => {
        if (!stat.deliveryDate) return false;
        const date = new Date(stat.deliveryDate + 'T00:00:00.000Z');
        return date >= weekStart && date <= weekEnd;
      });

      const windows = weekData.reduce((sum, s) => sum + Number(s.windowsCount), 0);
      const deliveries = weekData.reduce((sum, s) => sum + Number(s.deliveriesCount), 0);

      weeks.push({
        weekNumber: i + 1,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        deliveriesCount: deliveries,
        ordersCount: weekData.reduce((sum, s) => sum + Number(s.ordersCount), 0),
        windows,
        sashes: windows,  // Assumption: 1 window = 1 sash
        glasses: windows, // Assumption: 1 window = 1 glass
      });
    }

    return { weeks };
  }

  /**
   * Get monthly statistics
   */
  async getMonthlyStats(month?: number, year?: number): Promise<MonthlyStat> {
    const now = new Date();
    const targetMonth = month !== undefined ? month - 1 : now.getMonth();
    const targetYear = year !== undefined ? year : now.getFullYear();

    const { startDate, endDate } = getMonthRange(targetYear, targetMonth);

    // PERFORMANCE: Execute in parallel
    const [orders, deliveriesCount] = await Promise.all([
      this.repository.getMonthlyOrders(startDate, endDate),
      this.repository.getMonthlyDeliveriesCount(startDate, endDate),
    ]);

    // Calculate aggregates
    let totalWindows = 0;
    let totalValuePln = 0;
    let totalValueEur = 0;

    for (const order of orders) {
      totalWindows += order.windows.reduce((sum, w) => sum + w.quantity, 0);
      totalValuePln += parseFloat(order.valuePln?.toString() || '0');
      totalValueEur += parseFloat(order.valueEur?.toString() || '0');
    }

    return {
      month: targetMonth + 1,
      year: targetYear,
      totalOrders: orders.length,
      totalWindows,
      totalValuePln,
      totalValueEur,
      totalDeliveries: deliveriesCount,
    };
  }

  /**
   * Calculate shortage priority based on after-demand value
   * BUSINESS RULE: Configurable thresholds
   */
  private calculatePriority(afterDemand: number): 'critical' | 'high' | 'medium' {
    // TODO: Move to settings/configuration
    const CRITICAL_THRESHOLD = -10;
    const HIGH_THRESHOLD = -5;

    if (afterDemand < CRITICAL_THRESHOLD) return 'critical';
    if (afterDemand < HIGH_THRESHOLD) return 'high';
    return 'medium';
  }

  /**
   * Sort alerts by priority
   */
  private sortAlertsByPriority(alerts: Alert[]): Alert[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return alerts.sort(
      (a, b) =>
        (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4)
    );
  }
}
```

**Testing:**
- Unit tests mocking DashboardRepository
- Test business logic isolation
- Test parallel query execution
- Test error handling scenarios

---

### Phase 4: Handler Layer (Est. 1 hour)

#### Step 4.1: Create DashboardHandler
**File:** `apps/api/src/handlers/dashboardHandler.ts`

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from '../services/dashboardService.js';
import {
  monthlyStatsQuerySchema,
  weeklyStatsQuerySchema,
  alertsQuerySchema,
} from '../validators/dashboard.js';

export class DashboardHandler {
  constructor(private service: DashboardService) {}

  /**
   * GET / - Main dashboard data
   */
  async getDashboard(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const data = await this.service.getDashboardData();
    return reply.send(data);
  }

  /**
   * GET /alerts - Dashboard alerts
   */
  async getAlerts(
    request: FastifyRequest<{ Querystring: { type?: string; priority?: string } }>,
    reply: FastifyReply
  ) {
    const validated = alertsQuerySchema.parse(request.query);
    const alerts = await this.service.getAlerts();

    // TODO: Apply filters from validated query if needed
    return reply.send(alerts);
  }

  /**
   * GET /stats/weekly - Weekly statistics
   */
  async getWeeklyStats(
    request: FastifyRequest<{ Querystring: { weeksCount?: string } }>,
    reply: FastifyReply
  ) {
    const validated = weeklyStatsQuerySchema.parse(request.query);
    const weeksCount = parseInt(validated.weeksCount || '8', 10);
    const stats = await this.service.getWeeklyStats(weeksCount);
    return reply.send(stats);
  }

  /**
   * GET /stats/monthly - Monthly statistics
   */
  async getMonthlyStats(
    request: FastifyRequest<{ Querystring: { month?: string; year?: string } }>,
    reply: FastifyReply
  ) {
    const validated = monthlyStatsQuerySchema.parse(request.query);
    const month = validated.month ? parseInt(validated.month, 10) : undefined;
    const year = validated.year ? parseInt(validated.year, 10) : undefined;

    const stats = await this.service.getMonthlyStats(month, year);
    return reply.send(stats);
  }
}
```

**Testing:**
- Integration tests with mocked service
- Test HTTP response formats
- Test validation error handling

---

### Phase 5: Utilities Extraction (Est. 30 min)

#### Step 5.1: Create Date Helpers
**File:** `apps/api/src/utils/date-helpers.ts`

```typescript
/**
 * Get ISO week number from date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return weekNum;
}

/**
 * Get date ranges for common periods
 */
export function getDateRange(period: 'today' | 'tomorrow' | 'currentWeek' | 'nextWeek') {
  const now = new Date();

  switch (period) {
    case 'today': {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { today, tomorrow };
    }

    case 'currentWeek': {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() + daysToMonday);
      return { startOfWeek };
    }

    default:
      throw new Error(`Unknown period: ${period}`);
  }
}

/**
 * Get month date range
 */
export function getMonthRange(year: number, monthIndex: number) {
  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 0);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}
```

**Testing:**
- Unit tests for each date utility
- Test edge cases (month boundaries, leap years, timezones)

---

### Phase 6: Routes Refactoring (Est. 1 hour)

#### Step 6.1: Refactor dashboard.ts
**File:** `apps/api/src/routes/dashboard.ts` (NEW - ~40 lines)

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { verifyAuth } from '../middleware/auth.js';
import { DashboardHandler } from '../handlers/dashboardHandler.js';
import { DashboardService } from '../services/dashboardService.js';
import { DashboardRepository } from '../repositories/DashboardRepository.js';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // Initialize layered dependencies
  const repository = new DashboardRepository(prisma);
  const service = new DashboardService(repository);
  const handler = new DashboardHandler(service);

  // GET /api/dashboard - Main dashboard data
  fastify.get(
    '/',
    { preHandler: verifyAuth },
    async (request, reply) => handler.getDashboard(request, reply)
  );

  // GET /api/dashboard/alerts - Alerts
  fastify.get(
    '/alerts',
    { preHandler: verifyAuth },
    async (request, reply) => handler.getAlerts(request, reply)
  );

  // GET /api/dashboard/stats/weekly - Weekly statistics
  fastify.get(
    '/stats/weekly',
    { preHandler: verifyAuth },
    async (request, reply) => handler.getWeeklyStats(request, reply)
  );

  // GET /api/dashboard/stats/monthly - Monthly statistics
  fastify.get(
    '/stats/monthly',
    { preHandler: verifyAuth },
    async (request, reply) => handler.getMonthlyStats(request, reply)
  );
};
```

**Migration Strategy:**
1. Keep old `dashboard.ts` as `dashboard.old.ts` temporarily
2. Run both endpoints in parallel (different routes for testing)
3. Compare responses for consistency
4. Switch over when verified
5. Remove old file after 1 week

---

### Phase 7: Testing & Documentation (Est. 1 hour)

#### Step 7.1: Comprehensive Test Coverage

**Repository Tests:** `apps/api/src/repositories/DashboardRepository.test.ts`
- Test all database queries
- Mock PrismaClient
- Verify raw SQL execution
- Test edge cases (empty results, large datasets)

**Service Tests:** `apps/api/src/services/dashboardService.test.ts`
- Mock repository
- Test business logic isolation
- Test parallel execution
- Test error propagation

**Handler Tests:** `apps/api/src/handlers/dashboardHandler.test.ts`
- Mock service
- Test HTTP responses
- Test validation errors
- Test status codes

**Integration Tests:** `apps/api/src/routes/dashboard.integration.test.ts`
- Test full request/response cycle
- Test with real database (test fixtures)
- Performance benchmarks

#### Step 7.2: Update API Documentation
- Add OpenAPI/Swagger annotations
- Document response schemas
- Add example requests/responses
- Update `docs/API_DOCUMENTATION.md`

---

## Performance Optimizations

### Already Implemented (Keep)
1. Raw SQL for `getShortages()` - Single query with GROUP BY
2. Raw SQL for `getWeeklyStats()` - Avoids N+1 queries
3. Aggregation at database level

### New Optimizations
1. **Parallel Query Execution**
   ```typescript
   // BEFORE: Sequential (slow)
   const orders = await getOrders();
   const deliveries = await getDeliveries();
   const imports = await getImports();

   // AFTER: Parallel (3x faster)
   const [orders, deliveries, imports] = await Promise.all([
     getOrders(),
     getDeliveries(),
     getImports(),
   ]);
   ```

2. **Database Indexes** (if not already present)
   ```sql
   -- For delivery queries
   CREATE INDEX idx_deliveries_date_status ON deliveries(delivery_date, status);

   -- For order queries
   CREATE INDEX idx_orders_created_archived ON orders(created_at, archived_at);

   -- For import queries
   CREATE INDEX idx_imports_status ON file_imports(status, created_at);
   ```

3. **Response Caching** (future enhancement)
   - Cache dashboard stats for 30 seconds
   - Cache weekly stats for 5 minutes
   - Invalidate on data changes

---

## Risk Assessment & Mitigation

### High Risk Areas

#### Risk 1: Breaking API Contracts
**Impact:** Frontend breaks
**Probability:** Medium
**Mitigation:**
- Maintain exact response format
- Add integration tests comparing old vs new responses
- Deploy with feature flag
- Monitor error rates after deployment

#### Risk 2: Performance Regression
**Impact:** Slower dashboard loading
**Probability:** Low (we're adding optimizations)
**Mitigation:**
- Benchmark before/after
- Add performance tests
- Monitor query execution time
- Keep raw SQL optimizations

#### Risk 3: Data Inconsistency
**Impact:** Wrong statistics displayed
**Probability:** Low
**Mitigation:**
- Extensive unit tests
- Compare results with current implementation
- Manual QA testing
- Gradual rollout

### Medium Risk Areas

#### Risk 4: Complex Business Logic Errors
**Impact:** Wrong priority calculations, incorrect aggregations
**Probability:** Medium
**Mitigation:**
- Preserve exact business logic from original
- Test edge cases thoroughly
- Add assertions for business rules
- Code review by domain expert

---

## Testing Strategy

### Unit Tests
- **Repository:** 90%+ coverage
  - All database queries
  - Raw SQL edge cases
  - Empty result sets
  - Large datasets

- **Service:** 95%+ coverage
  - Business logic isolation
  - Priority calculations
  - Date manipulations
  - Parallel execution

- **Handler:** 90%+ coverage
  - Validation
  - HTTP responses
  - Error handling

### Integration Tests
- Full request/response cycle
- Real database (SQLite in-memory)
- Test all endpoints
- Compare with current implementation

### Performance Tests
- Benchmark query execution time
- Test with realistic data volumes
- Monitor memory usage
- Test concurrent requests

### Manual QA Checklist
- [ ] Dashboard loads correctly
- [ ] Statistics match old implementation
- [ ] Alerts display properly
- [ ] Weekly stats render correctly
- [ ] Monthly stats filter works
- [ ] Performance is same or better
- [ ] Error handling works
- [ ] Auth middleware functions

---

## Success Metrics

### Code Quality
- [ ] Reduced file size: 401 → ~40 lines (routes)
- [ ] Test coverage: 0% → 90%+
- [ ] Layered architecture compliance: 100%
- [ ] No `any` types
- [ ] No ESLint warnings

### Performance
- [ ] Dashboard load time: ≤ current performance
- [ ] Parallel queries: 2-3x faster than sequential
- [ ] Memory usage: No regression
- [ ] Query count: Reduced or same

### Maintainability
- [ ] Code duplication: Eliminated
- [ ] Reusable components: Repository, Service
- [ ] Documentation: Complete
- [ ] Type safety: 100%

---

## Implementation Timeline

### Day 1 (3-4 hours)
- Phase 1: Validators (1 hour)
- Phase 2: Repository (2 hours)
- Phase 5: Utilities (30 min)

### Day 2 (4-5 hours)
- Phase 3: Service (2-3 hours)
- Phase 4: Handler (1 hour)
- Phase 6: Routes (1 hour)

### Day 3 (2-3 hours)
- Phase 7: Testing (1.5 hours)
- Integration testing (1 hour)
- Documentation (30 min)

**Total Estimated Time:** 8-10 hours over 3 days

---

## Rollback Plan

### If Issues Arise
1. **Keep old implementation** as `dashboard.old.ts`
2. **Feature flag** to switch between old/new
3. **Monitoring** for error rates
4. **Quick rollback** by reverting route registration

### Rollback Procedure
```bash
# Step 1: Revert route registration
git checkout HEAD~1 apps/api/src/index.ts

# Step 2: Restart API
pnpm dev:api

# Step 3: Monitor logs
tail -f logs/api.log

# Step 4: If stable, create hotfix branch
git checkout -b hotfix/dashboard-rollback
git commit -m "Rollback dashboard refactoring"
```

---

## Future Enhancements

### Phase 8 (Optional)
1. **Response Caching**
   - Redis/in-memory cache
   - TTL: 30s for stats, 5min for weekly
   - Cache invalidation on data changes

2. **Configurable Thresholds**
   - Move magic numbers to settings
   - Admin UI for priority thresholds
   - Configurable date ranges

3. **Advanced Filtering**
   - Filter alerts by type/priority
   - Filter deliveries by status
   - Search functionality

4. **Real-time Updates**
   - WebSocket for live stats
   - Server-Sent Events for alerts
   - Optimistic UI updates

5. **Export Functionality**
   - Export stats to Excel
   - PDF reports
   - Email digests

---

## Appendix

### A. File Changes Summary
```
NEW FILES:
+ apps/api/src/handlers/dashboardHandler.ts        (100-120 lines)
+ apps/api/src/services/dashboardService.ts        (200-250 lines)
+ apps/api/src/repositories/DashboardRepository.ts (150-180 lines)
+ apps/api/src/validators/dashboard.ts             (40-50 lines)
+ apps/api/src/utils/date-helpers.ts               (50-60 lines)

+ apps/api/src/handlers/dashboardHandler.test.ts   (150-200 lines)
+ apps/api/src/services/dashboardService.test.ts   (200-250 lines)
+ apps/api/src/repositories/DashboardRepository.test.ts (150-200 lines)
+ apps/api/src/utils/date-helpers.test.ts          (100-120 lines)

MODIFIED FILES:
~ apps/api/src/routes/dashboard.ts                 (401 → 40 lines)

TOTAL:
  Production code: ~620 lines (net reduction of ~20 lines, but better organized)
  Test code: ~650 lines (new)
```

### B. Breaking Changes
**None** - API contracts maintained exactly

### C. Dependencies
No new dependencies required

### D. Database Migrations
None required (only query optimizations)

---

## Sign-off

**Reviewed by:** _________________
**Approved by:** _________________
**Implementation start:** _________________
**Target completion:** _________________

---

**Document Version:** 1.0
**Last Updated:** 2025-12-30
**Next Review:** After Phase 7 completion
