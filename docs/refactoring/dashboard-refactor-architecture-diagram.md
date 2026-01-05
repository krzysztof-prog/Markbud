# Dashboard Refactoring - Architecture Diagrams

## Current Architecture (Before)

```
┌─────────────────────────────────────────────────────────────┐
│                    dashboard.ts (401 lines)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Route: GET /                                          │ │
│  │  ├─ Direct Prisma queries (10+ queries)               │ │
│  │  ├─ Business logic (date calculations, aggregations)  │ │
│  │  ├─ Helper calls: getShortages()                      │ │
│  │  └─ Response formatting                               │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Route: GET /alerts                                    │ │
│  │  ├─ Helper calls: getShortages()                      │ │
│  │  ├─ Direct Prisma queries                             │ │
│  │  ├─ Alert creation logic                              │ │
│  │  ├─ Priority sorting                                   │ │
│  │  └─ Response formatting                               │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Route: GET /stats/weekly                              │ │
│  │  ├─ Date range calculations                           │ │
│  │  ├─ Raw SQL query (OPTIMIZED)                         │ │
│  │  ├─ JavaScript aggregations                            │ │
│  │  └─ Response formatting                               │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Route: GET /stats/monthly                             │ │
│  │  ├─ Query parameter parsing (no validation)           │ │
│  │  ├─ Direct Prisma queries                             │ │
│  │  ├─ Manual aggregations                                │ │
│  │  └─ Response formatting                               │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Helper Functions (mixed in same file)                │ │
│  │  ├─ getWeekNumber()                                    │ │
│  │  ├─ getShortages() - Raw SQL                          │ │
│  │  └─ calculatePriority()                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Prisma (SQLite) │
                   └─────────────────┘

PROBLEMS:
❌ No separation of concerns
❌ No input validation
❌ Not testable (direct DB access)
❌ Code duplication
❌ Sequential queries (slow)
❌ Mixed responsibilities
```

---

## Target Architecture (After)

```
┌────────────────────────────────────────────────────────────────────┐
│                     LAYER 1: ROUTES                                │
│                    dashboard.ts (~40 lines)                        │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  GET /              → handler.getDashboard()                 │ │
│  │  GET /alerts        → handler.getAlerts()                    │ │
│  │  GET /stats/weekly  → handler.getWeeklyStats()              │ │
│  │  GET /stats/monthly → handler.getMonthlyStats()             │ │
│  │                                                               │ │
│  │  Responsibilities:                                            │ │
│  │  ✓ Route registration                                        │ │
│  │  ✓ Middleware application (auth)                             │ │
│  │  ✓ Dependency injection                                      │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│                     LAYER 2: VALIDATORS                            │
│                   dashboard.ts (~40 lines)                         │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  monthlyStatsQuerySchema   (Zod)                             │ │
│  │  weeklyStatsQuerySchema    (Zod)                             │ │
│  │  alertsQuerySchema         (Zod)                             │ │
│  │                                                               │ │
│  │  Responsibilities:                                            │ │
│  │  ✓ Input validation                                          │ │
│  │  ✓ Type inference                                            │ │
│  │  ✓ Type safety                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│                     LAYER 3: HANDLERS                              │
│                 dashboardHandler.ts (~100 lines)                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  getDashboard()                                               │ │
│  │  ├─ Validate input (Zod)                                     │ │
│  │  ├─ Call service.getDashboardData()                          │ │
│  │  └─ Format HTTP response                                     │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │  getAlerts()                                                  │ │
│  │  ├─ Validate input (Zod)                                     │ │
│  │  ├─ Call service.getAlerts()                                 │ │
│  │  └─ Format HTTP response                                     │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │  getWeeklyStats()                                             │ │
│  │  ├─ Validate input (Zod)                                     │ │
│  │  ├─ Call service.getWeeklyStats()                            │ │
│  │  └─ Format HTTP response                                     │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │  getMonthlyStats()                                            │ │
│  │  ├─ Validate input (Zod)                                     │ │
│  │  ├─ Call service.getMonthlyStats()                           │ │
│  │  └─ Format HTTP response                                     │ │
│  │                                                               │ │
│  │  Responsibilities:                                            │ │
│  │  ✓ Request validation                                        │ │
│  │  ✓ HTTP-specific concerns                                    │ │
│  │  ✓ Response formatting                                       │ │
│  │  ✓ Status code management                                    │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│                     LAYER 4: SERVICES                              │
│                 dashboardService.ts (~250 lines)                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  getDashboardData()                                           │ │
│  │  ├─ Parallel execution: Promise.all([...])                   │ │
│  │  │  ├─ repo.getActiveOrdersCount()                           │ │
│  │  │  ├─ repo.getUpcomingDeliveries()                          │ │
│  │  │  ├─ repo.getPendingImports()                              │ │
│  │  │  ├─ repo.getShortages()                                   │ │
│  │  │  └─ repo.getRecentOrders()                                │ │
│  │  ├─ Apply business logic (priority calculation)              │ │
│  │  ├─ Transform data                                            │ │
│  │  └─ Return typed result                                      │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │  getAlerts()                                                  │ │
│  │  ├─ Parallel execution: Promise.all([...])                   │ │
│  │  │  ├─ repo.getShortages()                                   │ │
│  │  │  ├─ repo.getPendingImportsCount()                         │ │
│  │  │  └─ repo.getTodayDeliveriesCount()                        │ │
│  │  ├─ Build alert objects                                      │ │
│  │  ├─ Apply priority sorting                                   │ │
│  │  └─ Return typed alerts                                      │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │  getWeeklyStats()                                             │ │
│  │  ├─ Calculate date ranges (util)                             │ │
│  │  ├─ repo.getWeeklyStats()                                    │ │
│  │  ├─ Group by weeks (JavaScript)                              │ │
│  │  └─ Return typed weekly stats                                │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │  getMonthlyStats()                                            │ │
│  │  ├─ Calculate date ranges (util)                             │ │
│  │  ├─ Parallel: [repo.getMonthlyOrders(), repo.getMonthly...] │ │
│  │  ├─ Aggregate calculations                                   │ │
│  │  └─ Return typed monthly stats                               │ │
│  │                                                               │ │
│  │  Responsibilities:                                            │ │
│  │  ✓ Business logic orchestration                              │ │
│  │  ✓ Multiple repository coordination                          │ │
│  │  ✓ Data transformation                                       │ │
│  │  ✓ Business rule enforcement                                 │ │
│  │  ✓ Performance optimization (parallel queries)               │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│                     LAYER 5: REPOSITORIES                          │
│              DashboardRepository.ts (~180 lines)                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Database Query Methods:                                      │ │
│  │                                                               │ │
│  │  getActiveOrdersCount()        → prisma.order.count()        │ │
│  │  getUpcomingDeliveries()       → prisma.delivery.findMany()  │ │
│  │  getPendingImports()           → prisma.fileImport.findMany()│ │
│  │  getPendingImportsCount()      → prisma.fileImport.count()   │ │
│  │  getRecentOrders()             → prisma.order.findMany()     │ │
│  │  getTodayDeliveriesCount()     → prisma.delivery.count()     │ │
│  │  getMonthlyOrders()            → prisma.order.findMany()     │ │
│  │  getMonthlyDeliveriesCount()   → prisma.delivery.count()     │ │
│  │                                                               │ │
│  │  Optimized Raw SQL Queries:                                   │ │
│  │                                                               │ │
│  │  getShortages()                → prisma.$queryRaw<...>`      │ │
│  │    ├─ Single query with GROUP BY                             │ │
│  │    ├─ LEFT JOINs                                              │ │
│  │    └─ Aggregations at DB level                               │ │
│  │                                                               │ │
│  │  getWeeklyStats()              → prisma.$queryRaw<...>`      │ │
│  │    ├─ Single query with GROUP BY                             │ │
│  │    ├─ Date functions                                          │ │
│  │    └─ Aggregations at DB level                               │ │
│  │                                                               │ │
│  │  Responsibilities:                                            │ │
│  │  ✓ Database access only                                      │ │
│  │  ✓ Query optimization                                        │ │
│  │  ✓ Type-safe data retrieval                                  │ │
│  │  ✓ No business logic                                         │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Prisma (SQLite) │
                   └─────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                     UTILITIES (Cross-cutting)                      │
│                   date-helpers.ts (~60 lines)                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  getWeekNumber()       - ISO week calculation                │ │
│  │  getDateRange()        - Common date ranges                  │ │
│  │  getMonthRange()       - Month boundaries                    │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘

BENEFITS:
✅ Separation of concerns
✅ Input validation (Zod)
✅ Highly testable (mockable layers)
✅ No code duplication
✅ Parallel queries (3x faster)
✅ Clear responsibilities
✅ Type safety throughout
```

---

## Data Flow Diagram

### Example: GET /api/dashboard

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP GET /api/dashboard
       │
       ▼
┌─────────────────────────────────────────┐
│  ROUTE: dashboard.ts                    │
│  ├─ Apply middleware: verifyAuth       │
│  └─ Delegate to handler.getDashboard()  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  HANDLER: dashboardHandler.ts           │
│  ├─ Validate input (none for GET /)    │
│  └─ Call service.getDashboardData()     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  SERVICE: dashboardService.ts                        │
│  ├─ Parallel execution:                              │
│  │   Promise.all([                                   │
│  │     repo.getActiveOrdersCount(),     ─────┐      │
│  │     repo.getUpcomingDeliveries(),    ─────┤      │
│  │     repo.getPendingImports(),        ─────┤      │
│  │     repo.getShortages(),             ─────┤      │
│  │     repo.getRecentOrders()           ─────┤      │
│  │   ])                                       │      │
│  │                                             │      │
│  ├─ Apply business logic:                     │      │
│  │   ├─ Calculate priorities                  │      │
│  │   ├─ Map data structures                   │      │
│  │   └─ Add week numbers                      │      │
│  │                                             │      │
│  └─ Return: DashboardData                     │      │
└──────────────┬────────────────────────────────┘      │
               │                                        │
               ▼                                        │
┌──────────────────────────────────────────────────────┘
│  REPOSITORY: DashboardRepository.ts
│  ├─ Query 1: prisma.order.count({...})
│  ├─ Query 2: prisma.delivery.findMany({...})
│  ├─ Query 3: prisma.fileImport.findMany({...})
│  ├─ Query 4: prisma.$queryRaw<ShortageResult[]>`...`
│  └─ Query 5: prisma.order.findMany({...})
└──────────────┬────────────────────────────────
               │ (All queries run in PARALLEL)
               │
               ▼
       ┌───────────────┐
       │ Prisma Client │
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │ SQLite Database│
       └───────┬───────┘
               │
               │ Results returned up the stack
               │
               ▼
┌──────────────────────────────────────────┐
│  HANDLER: Format HTTP Response           │
│  {                                        │
│    stats: {...},                         │
│    upcomingDeliveries: [...],            │
│    pendingImports: [...],                │
│    shortages: [...],                     │
│    recentOrders: [...]                   │
│  }                                        │
└──────────────┬───────────────────────────┘
               │
               ▼
       ┌──────────────┐
       │    Client    │
       │  (200 OK)    │
       └──────────────┘
```

---

## Performance Comparison

### Before: Sequential Execution
```
Time: ════════════════════════════ (5000ms)

Query 1: ══════ (1000ms)
         └─ Wait
Query 2:        ══════ (1000ms)
                └─ Wait
Query 3:               ══════ (1000ms)
                       └─ Wait
Query 4:                      ═══════ (1200ms)
                              └─ Wait
Query 5:                             ════ (800ms)

Total: 5000ms
```

### After: Parallel Execution
```
Time: ══════════ (1200ms)

Query 1: ══════ (1000ms)  ┐
Query 2: ══════ (1000ms)  │
Query 3: ══════ (1000ms)  ├─ Promise.all()
Query 4: ═══════ (1200ms) │ (slowest determines total time)
Query 5: ════ (800ms)     ┘

Total: 1200ms (4x FASTER!)
```

---

## Test Coverage Visualization

```
┌─────────────────────────────────────────────────────────┐
│                    TEST PYRAMID                         │
│                                                          │
│                        ┌──┐                             │
│                        │E2│  Integration Tests          │
│                        │E2│  (5-10 tests)               │
│                        └──┘  - Full request cycle       │
│                       ┌────┐                            │
│                       │ IT │  Integration Tests         │
│                       │ IT │  (10-15 tests)             │
│                       │ IT │  - Handler + Service + Repo│
│                       └────┘                            │
│                   ┌──────────┐                          │
│                   │   UNIT   │  Unit Tests              │
│                   │   UNIT   │  (40-50 tests)           │
│                   │   UNIT   │  - Repository (isolated) │
│                   │   UNIT   │  - Service (mocked repo) │
│                   │   UNIT   │  - Handler (mocked svc)  │
│                   │   UNIT   │  - Validators            │
│                   │   UNIT   │  - Utilities             │
│                   └──────────┘                          │
│                                                          │
│  Target Coverage: 90%+                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Migration Strategy

### Phase-by-Phase Deployment

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: Create new layers (no impact)                    │
│  ✓ Create validators/dashboard.ts                          │
│  ✓ Create repositories/DashboardRepository.ts              │
│  ✓ Create services/dashboardService.ts                     │
│  ✓ Create handlers/dashboardHandler.ts                     │
│  ✓ Create utils/date-helpers.ts                            │
│  ✓ Write comprehensive tests                                │
│                                                             │
│  Status: OLD API still active                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: Parallel deployment (both active)                │
│  ✓ Rename dashboard.ts → dashboard.old.ts                  │
│  ✓ Create new dashboard.ts with layered architecture       │
│  ✓ Register new routes at /api/dashboard-v2/*              │
│  ✓ Compare responses: old vs new                           │
│  ✓ Integration tests                                        │
│                                                             │
│  Status: Both APIs active for testing                      │
│  Routes:                                                    │
│    /api/dashboard/* (OLD)                                   │
│    /api/dashboard-v2/* (NEW)                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 3: Gradual switchover (feature flag)                │
│  ✓ Add feature flag: USE_NEW_DASHBOARD                     │
│  ✓ If flag=true → use new implementation                   │
│  ✓ If flag=false → use old implementation                  │
│  ✓ Enable for 10% of requests                              │
│  ✓ Monitor errors/performance                               │
│  ✓ Increase to 50%, then 100%                              │
│                                                             │
│  Status: Controlled rollout                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASE 4: Complete migration                               │
│  ✓ New implementation at 100%                              │
│  ✓ Monitor for 1 week                                       │
│  ✓ Remove feature flag                                      │
│  ✓ Remove dashboard.old.ts                                 │
│  ✓ Update documentation                                     │
│                                                             │
│  Status: Migration complete                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure Changes

### Before
```
apps/api/src/
├── routes/
│   └── dashboard.ts (401 lines) ❌ Monolithic
└── ...
```

### After
```
apps/api/src/
├── routes/
│   └── dashboard.ts (~40 lines) ✅ Clean
├── handlers/
│   ├── dashboardHandler.ts (~100 lines) ✅ New
│   └── dashboardHandler.test.ts (~150 lines) ✅ New
├── services/
│   ├── dashboardService.ts (~250 lines) ✅ New
│   └── dashboardService.test.ts (~200 lines) ✅ New
├── repositories/
│   ├── DashboardRepository.ts (~180 lines) ✅ New
│   └── DashboardRepository.test.ts (~150 lines) ✅ New
├── validators/
│   ├── dashboard.ts (~40 lines) ✅ New
│   └── dashboard.test.ts (~80 lines) ✅ New
└── utils/
    ├── date-helpers.ts (~60 lines) ✅ New
    └── date-helpers.test.ts (~100 lines) ✅ New
```

**Total:**
- Production: ~620 lines (vs 401, but properly organized)
- Tests: ~680 lines (NEW - 0% → 90%+ coverage)

---

## Monitoring & Metrics

### Key Metrics to Track

```
┌──────────────────────────────────────────────────────┐
│  Performance Metrics                                 │
├──────────────────────────────────────────────────────┤
│  • GET / response time         Target: < 500ms      │
│  • GET /alerts response time   Target: < 300ms      │
│  • GET /stats/weekly           Target: < 800ms      │
│  • GET /stats/monthly          Target: < 400ms      │
│  • Database query count        Target: ≤ 5 queries  │
│  • Memory usage                Target: < 50MB       │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Quality Metrics                                     │
├──────────────────────────────────────────────────────┤
│  • Test coverage              Target: > 90%         │
│  • Linting errors             Target: 0             │
│  • TypeScript errors          Target: 0             │
│  • Code duplication           Target: 0%            │
│  • Cyclomatic complexity      Target: < 10/method   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Reliability Metrics                                 │
├──────────────────────────────────────────────────────┤
│  • Error rate                 Target: < 0.1%        │
│  • 5xx errors                 Target: 0             │
│  • 4xx errors                 Target: < 1%          │
│  • Uptime                     Target: 99.9%         │
└──────────────────────────────────────────────────────┘
```

---

**Document Version:** 1.0
**Created:** 2025-12-30
**Related:** dashboard-refactor-plan-2025-12-30.md
