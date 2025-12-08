# Implementacja optymalizacji bazy danych - Szczegółowe kroki

## 📋 Spis treści
1. [Migracja: Dodanie indeksów](#migracja-dodanie-indeksów)
2. [Refactoring: getShortages()](#refactoring-getshortages)
3. [Refactoring: Weekly Stats](#refactoring-weekly-stats)
4. [Testy wydajnościowe](#testy-wydajnościowe)
5. [Monitoring](#monitoring)

---

## 1. Migracja: Dodanie indeksów

### Krok 1: Aktualizacja schema.prisma

```prisma
// apps/api/prisma/schema.prisma

// Delivery model - dodać indeksy
model Delivery {
  // ... existing fields ...

  @@index([deliveryDate, status], name: "idx_delivery_date_status")
  @@index([status, deliveryDate], name: "idx_status_delivery_date")
}

// Order model - dodać indeksy
model Order {
  // ... existing fields ...

  @@index([archivedAt, status], name: "idx_archived_status")
  @@index([createdAt, archivedAt], name: "idx_created_archived")
  @@index([status, archivedAt], name: "idx_status_archived")
}

// OrderRequirement model - dodać indeks kompozytowy
model OrderRequirement {
  // ... existing fields ...

  // Zmień istniejący index na kompozytowy
  @@index([orderId, profileId, colorId], name: "idx_order_profile_color")
}

// SchucoDelivery model - dodać indeksy
model SchucoDelivery {
  // ... existing fields ...

  @@index([changeType, changedAt], name: "idx_change_type_changed_at")
  @@index([orderDateParsed, shippingStatus], name: "idx_order_date_status")
  @@index([shippingStatus, orderDateParsed], name: "idx_status_order_date")
}

// FileImport model - dodać indeks kompozytowy
model FileImport {
  // ... existing fields ...

  @@index([status, createdAt], name: "idx_status_created")
}
```

### Krok 2: Wygeneruj migrację

```bash
cd apps/api
npx prisma migrate dev --name add_performance_indexes
```

### Krok 3: Zweryfikuj migrację

```bash
# Sprawdź wygenerowany SQL
cat prisma/migrations/<timestamp>_add_performance_indexes/migration.sql

# Powinien zawierać:
# CREATE INDEX "idx_delivery_date_status" ON "deliveries"("delivery_date", "status");
# CREATE INDEX "idx_archived_status" ON "orders"("archived_at", "status");
# itd.
```

### Krok 4: Zastosuj migrację

```bash
# Development
npx prisma migrate deploy

# Production (gdy gotowe)
NODE_ENV=production npx prisma migrate deploy
```

---

## 2. Refactoring: getShortages()

### Lokalizacja: `apps/api/src/routes/dashboard.ts`

### Przed (2 queries + O(n) operations):

```typescript
async function getShortages() {
  const stocks = await prisma.warehouseStock.findMany({
    select: {
      profileId: true,
      colorId: true,
      currentStockBeams: true,
      profile: {
        select: { id: true, number: true },
      },
      color: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  const demands = await prisma.orderRequirement.groupBy({
    by: ['profileId', 'colorId'],
    where: {
      order: {
        archivedAt: null,
        status: { notIn: ['archived', 'completed'] },
      },
    },
    _sum: {
      beamsCount: true,
    },
  });

  const demandMap = new Map(
    demands.map((d) => [`${d.profileId}-${d.colorId}`, d._sum.beamsCount || 0])
  );

  const shortages = stocks
    .map((stock) => {
      const key = `${stock.profileId}-${stock.colorId}`;
      const demand = demandMap.get(key) || 0;
      const afterDemand = stock.currentStockBeams - demand;

      if (afterDemand < 0) {
        return {
          profileId: stock.profileId,
          profileNumber: stock.profile.number,
          colorId: stock.colorId,
          colorCode: stock.color.code,
          colorName: stock.color.name,
          currentStock: stock.currentStockBeams,
          demand,
          shortage: Math.abs(afterDemand),
          priority:
            afterDemand < -10 ? 'critical' : afterDemand < -5 ? 'high' : 'medium',
        };
      }
      return null;
    })
    .filter(Boolean);

  return shortages.sort((a, b) => (b?.shortage || 0) - (a?.shortage || 0));
}
```

### Po (1 query z raw SQL):

```typescript
interface ShortageResult {
  profileId: number;
  profileNumber: string;
  colorId: number;
  colorCode: string;
  colorName: string;
  currentStock: number;
  demand: number;
  shortage: number;
  afterDemand: number;
}

async function getShortages() {
  const shortages = await prisma.$queryRaw<ShortageResult[]>`
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
    GROUP BY ws.profile_id, ws.color_id, ws.current_stock_beams, p.number, c.code, c.name
    HAVING (ws.current_stock_beams - COALESCE(SUM(req.beams_count), 0)) < 0
    ORDER BY shortage DESC
  `;

  return shortages.map((s) => ({
    profileId: s.profileId,
    profileNumber: s.profileNumber,
    colorId: s.colorId,
    colorCode: s.colorCode,
    colorName: s.colorName,
    currentStock: s.currentStock,
    demand: s.demand,
    shortage: s.shortage,
    priority: s.afterDemand < -10 ? 'critical' : s.afterDemand < -5 ? 'high' : 'medium',
  }));
}
```

---

## 3. Refactoring: Weekly Stats

### Lokalizacja: `apps/api/src/routes/dashboard.ts`

### Przed (deep nesting with include):

```typescript
fastify.get('/stats/weekly', async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + daysToMonday);

  const endDate = new Date(startOfWeek);
  endDate.setDate(startOfWeek.getDate() + 56);

  const deliveries = await prisma.delivery.findMany({
    where: {
      deliveryDate: {
        gte: startOfWeek,
        lt: endDate,
      },
    },
    include: {
      deliveryOrders: {
        include: {
          order: {
            include: {
              windows: {
                select: { quantity: true },
              },
            },
          },
        },
      },
    },
    orderBy: { deliveryDate: 'asc' },
  });

  // Grupuj dostawy po tygodniach (complex logic...)
  const weeks: any[] = [];
  for (let i = 0; i < 8; i++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(startOfWeek.getDate() + (i * 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekDeliveries = deliveries.filter((d) => {
      const deliveryDate = new Date(d.deliveryDate);
      return deliveryDate >= weekStart && deliveryDate <= weekEnd;
    });

    let windows = 0;
    let sashes = 0;
    let glasses = 0;

    weekDeliveries.forEach((delivery) => {
      delivery.deliveryOrders.forEach((dOrder: any) => {
        const orderWindows = dOrder.order.windows?.reduce(
          (sum: number, w: any) => sum + (w.quantity || 0),
          0
        ) || 0;

        windows += orderWindows;
        sashes += orderWindows;
        glasses += orderWindows;
      });
    });

    weeks.push({
      weekNumber: i + 1,
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      deliveriesCount: weekDeliveries.length,
      windows,
      sashes,
      glasses,
    });
  }

  return { weeks };
});
```

### Po (single raw SQL query):

```typescript
interface WeeklyStats {
  weekNumber: number;
  startDate: string;
  endDate: string;
  deliveriesCount: number;
  ordersCount: number;
  windows: number;
}

fastify.get('/stats/weekly', async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + daysToMonday);

  const endDate = new Date(startOfWeek);
  endDate.setDate(startOfWeek.getDate() + 56);

  // Single query for all 8 weeks
  const weekStats = await prisma.$queryRaw<Array<{
    deliveryDate: Date;
    deliveriesCount: number;
    ordersCount: number;
    windowsCount: number;
  }>>`
    SELECT
      DATE(d.delivery_date) as "deliveryDate",
      COUNT(DISTINCT d.id) as "deliveriesCount",
      COUNT(DISTINCT do.order_id) as "ordersCount",
      COALESCE(SUM(ow.quantity), 0) as "windowsCount"
    FROM deliveries d
    LEFT JOIN delivery_orders do ON do.delivery_id = d.id
    LEFT JOIN order_windows ow ON ow.order_id = do.order_id
    WHERE d.delivery_date >= ${startOfWeek}
      AND d.delivery_date < ${endDate}
    GROUP BY DATE(d.delivery_date)
    ORDER BY d.delivery_date ASC
  `;

  // Grupuj po tygodniach w JavaScript (szybkie, bo już zagregowane)
  const weeks: WeeklyStats[] = [];
  for (let i = 0; i < 8; i++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(startOfWeek.getDate() + (i * 7));

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekData = weekStats.filter((stat) => {
      const date = new Date(stat.deliveryDate);
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
      sashes: windows, // Assumption: 1 window = 1 sash
      glasses: windows, // Assumption: 1 window = 1 glass
    });
  }

  return { weeks };
});
```

---

## 4. Testy wydajnościowe

### Utwórz plik: `apps/api/src/tests/performance/dashboard.perf.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { performance } from 'node:perf_hooks';

const prisma = new PrismaClient();

describe('Dashboard Performance Tests', () => {
  beforeAll(async () => {
    // Seed test data if needed
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('getShortages should complete in <50ms', async () => {
    const start = performance.now();

    // Wywołaj zoptymalizowaną funkcję
    const shortages = await getShortagesOptimized();

    const duration = performance.now() - start;

    console.log(`✅ getShortages: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(50);
  });

  it('weeklyStats should complete in <100ms', async () => {
    const start = performance.now();

    // Wywołaj endpoint
    const stats = await getWeeklyStatsOptimized();

    const duration = performance.now() - start;

    console.log(`✅ weeklyStats: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(100);
  });

  it('full dashboard load should complete in <200ms', async () => {
    const start = performance.now();

    // Wszystkie queries z dashboard
    const [activeOrders, upcomingDeliveries, pendingImports, shortages] = await Promise.all([
      prisma.order.count({ where: { archivedAt: null } }),
      prisma.delivery.findMany({ where: { deliveryDate: { gte: new Date() } }, take: 5 }),
      prisma.fileImport.count({ where: { status: 'pending' } }),
      getShortagesOptimized(),
    ]);

    const duration = performance.now() - start;

    console.log(`✅ Full dashboard: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(200);
  });
});

// Helper functions
async function getShortagesOptimized() {
  return await prisma.$queryRaw`
    SELECT
      ws.profile_id,
      p.number,
      ws.color_id,
      c.code,
      c.name,
      ws.current_stock_beams,
      COALESCE(SUM(req.beams_count), 0) as demand
    FROM warehouse_stock ws
    JOIN profiles p ON p.id = ws.profile_id
    JOIN colors c ON c.id = ws.color_id
    LEFT JOIN order_requirements req ON req.profile_id = ws.profile_id AND req.color_id = ws.color_id
    LEFT JOIN orders o ON o.id = req.order_id AND o.archived_at IS NULL
    GROUP BY ws.profile_id, ws.color_id
    HAVING (ws.current_stock_beams - COALESCE(SUM(req.beams_count), 0)) < 0
  `;
}

async function getWeeklyStatsOptimized() {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  const endDate = new Date(startOfWeek);
  endDate.setDate(startOfWeek.getDate() + 56);

  return await prisma.$queryRaw`
    SELECT
      DATE(d.delivery_date) as delivery_date,
      COUNT(DISTINCT d.id) as deliveries_count,
      COALESCE(SUM(ow.quantity), 0) as windows_count
    FROM deliveries d
    LEFT JOIN delivery_orders do ON do.delivery_id = d.id
    LEFT JOIN order_windows ow ON ow.order_id = do.order_id
    WHERE d.delivery_date >= ${startOfWeek} AND d.delivery_date < ${endDate}
    GROUP BY DATE(d.delivery_date)
  `;
}
```

### Uruchom testy:

```bash
cd apps/api
npm run test -- dashboard.perf.test.ts
```

---

## 5. Monitoring

### Dodaj middleware do logowania slow queries

Utwórz: `apps/api/src/middleware/queryMonitoring.ts`

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { performance } from 'node:perf_hooks';

export interface QueryLog {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: Date;
  slow: boolean;
}

const queryLogs: QueryLog[] = [];
const SLOW_QUERY_THRESHOLD = 200; // ms

export async function queryMonitoringMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const start = performance.now();

  reply.addHook('onSend', async () => {
    const duration = performance.now() - start;
    const isSlow = duration > SLOW_QUERY_THRESHOLD;

    const log: QueryLog = {
      endpoint: request.url,
      method: request.method,
      duration,
      timestamp: new Date(),
      slow: isSlow,
    };

    queryLogs.push(log);

    // Keep only last 1000 logs
    if (queryLogs.length > 1000) {
      queryLogs.shift();
    }

    // Log slow queries
    if (isSlow) {
      console.warn(`🐌 SLOW QUERY: ${request.method} ${request.url} - ${duration.toFixed(2)}ms`);
    }
  });
}

// Endpoint do podglądu statystyk
export function getQueryStats() {
  const totalQueries = queryLogs.length;
  const slowQueries = queryLogs.filter((l) => l.slow).length;
  const avgDuration =
    queryLogs.reduce((sum, l) => sum + l.duration, 0) / totalQueries || 0;

  const slowest = [...queryLogs]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10);

  return {
    totalQueries,
    slowQueries,
    slowPercentage: ((slowQueries / totalQueries) * 100).toFixed(2),
    avgDuration: avgDuration.toFixed(2),
    slowest,
  };
}
```

### Dodaj do głównego serwera:

```typescript
// apps/api/src/index.ts

import { queryMonitoringMiddleware, getQueryStats } from './middleware/queryMonitoring.js';

// Dodaj middleware
fastify.addHook('onRequest', queryMonitoringMiddleware);

// Dodaj endpoint monitoringu
fastify.get('/api/monitoring/query-stats', async () => {
  return getQueryStats();
});
```

### Użycie:

```bash
# Sprawdź statystyki
curl http://localhost:3001/api/monitoring/query-stats

# Powinno zwrócić:
# {
#   "totalQueries": 145,
#   "slowQueries": 3,
#   "slowPercentage": "2.07",
#   "avgDuration": "45.32",
#   "slowest": [...]
# }
```

---

## 📊 Checklist implementacji

### Faza 1: Indeksy (30 min)
- [ ] Zaktualizuj `schema.prisma` z nowymi indeksami
- [ ] Wygeneruj migrację `npx prisma migrate dev`
- [ ] Zweryfikuj wygenerowany SQL
- [ ] Zastosuj migrację `npx prisma migrate deploy`
- [ ] Sprawdź czy indeksy zostały utworzone

### Faza 2: Refactoring getShortages (1h)
- [ ] Utwórz backup funkcji
- [ ] Napisz raw SQL query
- [ ] Dodaj type safety (interface)
- [ ] Przetestuj wyniki (compare old vs new)
- [ ] Uruchom performance test
- [ ] Deploy

### Faza 3: Refactoring weeklyStats (1h)
- [ ] Utwórz backup funkcji
- [ ] Napisz raw SQL query
- [ ] Dodaj agregację w JS
- [ ] Przetestuj wyniki
- [ ] Uruchom performance test
- [ ] Deploy

### Faza 4: Monitoring (30 min)
- [ ] Dodaj middleware
- [ ] Dodaj endpoint `/api/monitoring/query-stats`
- [ ] Przetestuj
- [ ] Dodaj do dashboard (opcjonalne)

### Faza 5: Verification (30 min)
- [ ] Uruchom wszystkie testy performance
- [ ] Compare before/after metrics
- [ ] Sprawdź logi slow queries
- [ ] Update dokumentację

---

## 🎯 Metryki sukcesu

### KPIs do zmierzenia:

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| Dashboard load time | ~150ms | <80ms | ⏳ |
| getShortages() | ~80ms | <30ms | ⏳ |
| weeklyStats | ~300ms | <100ms | ⏳ |
| Slow queries % | ? | <5% | ⏳ |
| DB size | 1.5MB | <2MB | ✅ |

---

## 🚨 Rollback plan

Jeśli coś pójdzie nie tak:

```bash
# Wycofaj ostatnią migrację
cd apps/api
npx prisma migrate resolve --rolled-back <migration_name>

# Przywróć poprzednią wersję kodu
git revert <commit_hash>

# Restart serwera
pm2 restart api
```

---

**Autor:** Claude Code Database Optimizer
**Data:** 2025-12-06
**Wersja:** 1.0
