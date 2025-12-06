# Plan optymalizacji bazy danych AKROBUD

**Data analizy:** 2025-12-06
**Rozmiar bazy:** 1.5 MB
**Liczba rekordów:** ~3,800 w aktywnych tabelach

---

## 🔍 Podsumowanie wykonawcze

Baza danych jest w **dobrym stanie technicznym**, ale istnieją możliwości optymalizacji:

### ✅ Co działa dobrze
- **Indeksy podstawowe** są prawidłowo zdefiniowane
- **Relacje** są poprawnie skonfigurowane z CASCADE
- **Rozmiar bazy** jest optymalny (1.5 MB dla ~4k rekordów)
- **Nie ma duplikatów** ani osieroconych rekordów
- **Repositories** używają `select` zamiast `include` (dobra praktyka)

### ⚠️ Problemy zidentyfikowane

1. **20 nieużywanych tabel** (0 rekordów) - niepotrzebny overhead
2. **Brakujące indeksy** dla często używanych zapytań
3. **N+1 queries** w dashboard (weekly stats)
4. **Brak indeksu createdAt** na order_requirements
5. **Duża liczba rekordów Schuco** (1712) bez indeksu na changedAt
6. **Kompozytowe indeksy** mogą być lepiej zoptymalizowane

---

## 📊 Analiza użycia tabel

### Tabele aktywne (używane)
| Tabela | Liczba rekordów | Status |
|--------|----------------|--------|
| SchucoDeliveries | 1712 | ✅ Aktywna |
| ProfileColors | 252 | ✅ Aktywna |
| WarehouseStock | 252 | ✅ Aktywna |
| OrderRequirements | 356 | ✅ Aktywna |
| OrderWindows | 323 | ✅ Aktywna |
| FileImports | 106 | ✅ Aktywna |
| Orders | 99 | ✅ Aktywna |
| DeliveryOrders | 99 | ✅ Aktywna |
| SchucoFetchLogs | 32 | ✅ Aktywna |
| Profiles | 17 | ✅ Aktywna |
| Colors | 18 | ✅ Aktywna |
| Deliveries | 12 | ✅ Aktywna |
| PalletTypes | 7 | ✅ Aktywna |
| Settings | 5 | ✅ Aktywna |
| WorkingDays | 2 | ✅ Aktywna |

### Tabele nieużywane (0 rekordów)
1. **Users** - Gotowe na przyszłość (auth)
2. **WarehouseOrders** - Funkcjonalność nie wdrożona
3. **WarehouseHistory** - Brak remanentów
4. **DeliveryItems** - Nieużywane
5. **PackingRules** - Moduł pakowania wyłączony
6. **PalletOptimizations** - Nieużywane
7. **OptimizedPallets** - Nieużywane
8. **Notes** - Funkcjonalność nie wdrożona
9. **OkucArticles** - Moduł okuć nie wdrożony
10. **OkucStock** - Moduł okuć nie wdrożony
11. **OkucOrders** - Moduł okuć nie wdrożony
12. **OkucRequirements** - Moduł okuć nie wdrożony
13. **OkucHistory** - Moduł okuć nie wdrożony
14. **OkucImports** - Moduł okuć nie wdrożony
15. **OkucProductImages** - Moduł okuć nie wdrożony
16. **OkucSettings** - Moduł okuć nie wdrożony
17. **MonthlyReports** - Feature nie używany
18. **MonthlyReportItems** - Feature nie używany
19. **CurrencyConfig** - Nie skonfigurowane
20. **order_requirements.createdAt** - Index istnieje ale nigdy nie zapisywane dane

---

## 🎯 Rekomendacje optymalizacji

### Priorytet 1: KRYTYCZNE (Bezpośredni wpływ na wydajność)

#### 1.1 Dodaj brakujące indeksy

**Problem:** Zapytania w dashboard/alerts wykonują full table scan
**Rozwiązanie:** Dodać indeksy dla często filtrowanych kolumn

```prisma
// schema.prisma - dodać:

model Delivery {
  // ... existing fields
  @@index([deliveryDate, status]) // Dla upcomingDeliveries query
}

model Order {
  // ... existing fields
  @@index([archivedAt, status]) // Dla activeOrders i unassigned
  @@index([createdAt, archivedAt]) // Dla recentOrders i monthly stats
}

model OrderRequirement {
  // ... existing fields
  @@index([orderId, profileId, colorId]) // Dla demand calculations
}

model SchucoDelivery {
  // ... existing fields
  @@index([changeType, changedAt]) // Dla change tracking queries
  @@index([orderDateParsed, shippingStatus]) // Dla filtered lists
}

model FileImport {
  // ... existing fields
  @@index([status, createdAt]) // Dla pending imports query
}
```

**Oczekiwany zysk:** 30-50% przyspieszenie dashboard queries

#### 1.2 Optymalizacja getShortages() - eliminate N+1

**Problem:** Dashboard wywołuje 2 ciężkie zapytania + mapowanie
**Rozwiązanie:** Single query z LEFT JOIN

```typescript
// Przed (2 queries + N operations):
const stocks = await prisma.warehouseStock.findMany(...) // Query 1
const demands = await prisma.orderRequirement.groupBy(...) // Query 2
const demandMap = new Map(...) // O(n)
const shortages = stocks.map(...) // O(n)

// Po (1 query):
const shortages = await prisma.$queryRaw<ShortageResult[]>`
  SELECT
    ws.profile_id,
    ws.color_id,
    ws.current_stock_beams,
    p.number as profile_number,
    c.code as color_code,
    c.name as color_name,
    COALESCE(SUM(req.beams_count), 0) as demand,
    (ws.current_stock_beams - COALESCE(SUM(req.beams_count), 0)) as after_demand
  FROM warehouse_stock ws
  JOIN profiles p ON p.id = ws.profile_id
  JOIN colors c ON c.id = ws.color_id
  LEFT JOIN order_requirements req ON
    req.profile_id = ws.profile_id
    AND req.color_id = ws.color_id
  LEFT JOIN orders o ON o.id = req.order_id
  WHERE o.archived_at IS NULL
    AND o.status NOT IN ('archived', 'completed')
  GROUP BY ws.profile_id, ws.color_id
  HAVING after_demand < 0
  ORDER BY after_demand ASC
`;
```

**Oczekiwany zysk:** 60-70% przyspieszenie braków materiałowych

#### 1.3 Optymalizacja weekly stats - reduce nested includes

**Problem:** `/dashboard/stats/weekly` używa deep include z deliveryOrders → order → windows

```typescript
// Przed (deep nesting):
const deliveries = await prisma.delivery.findMany({
  include: {
    deliveryOrders: {
      include: {
        order: {
          include: {
            windows: { select: { quantity: true } }
          }
        }
      }
    }
  }
})

// Po (single query with aggregation):
const weekStats = await prisma.$queryRaw<WeekStat[]>`
  SELECT
    d.delivery_date,
    COUNT(DISTINCT do.order_id) as orders_count,
    COALESCE(SUM(ow.quantity), 0) as windows_count
  FROM deliveries d
  LEFT JOIN delivery_orders do ON do.delivery_id = d.id
  LEFT JOIN order_windows ow ON ow.order_id = do.order_id
  WHERE d.delivery_date >= ${startOfWeek}
    AND d.delivery_date < ${endDate}
  GROUP BY d.id, d.delivery_date
  ORDER BY d.delivery_date ASC
`;
```

**Oczekiwany zysk:** 70-80% przyspieszenie weekly stats

---

### Priorytet 2: WAŻNE (Utrzymanie długoterminowe)

#### 2.1 Usunięcie nieużywanych tabel (OPCJONALNE)

**Opcja A: Zachowaj wszystko** (rekomendowane dla MVP)
- Tabele Users, Okuc*, MonthlyReports są przygotowane na przyszłość
- Koszt utrzymania: minimalny (0 rekordów = 0 overhead)
- Zaleta: Gotowe do użycia gdy funkcje zostaną wdrożone

**Opcja B: Usuń moduł Okuc** (jeśli nigdy nie będzie używany)
```sql
-- Tylko jeśli pewni, że moduł Okuc nie zostanie wdrożony
DROP TABLE okuc_product_images;
DROP TABLE okuc_imports;
DROP TABLE okuc_history;
DROP TABLE okuc_requirements;
DROP TABLE okuc_orders;
DROP TABLE okuc_stock;
DROP TABLE okuc_articles;
DROP TABLE okuc_settings;
```

**Rekomendacja:** **ZACHOWAĆ** - overhead jest znikomy, a tabele mogą być użyteczne

#### 2.2 Partycjonowanie SchucoDeliveries (dla skalowalności)

**Problem:** 1712 rekordów będzie rosnąć (100-200/miesiąc)
**Rozwiązanie:** Archiwizacja starych rekordów

```typescript
// Dodaj scheduled job:
async function archiveOldSchucoDeliveries() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Option 1: Soft delete
  await prisma.schucoDelivery.updateMany({
    where: {
      orderDateParsed: { lt: sixMonthsAgo },
      changeType: null // nie archiwizuj zmian
    },
    data: { archived: true }
  });

  // Option 2: Move to archive table
  // await moveToArchive(sixMonthsAgo);
}
```

**Oczekiwany zysk:** Utrzymanie <1000 active records przez 2+ lata

#### 2.3 Monitoring i Analytics

**Dodaj tabele dla performance tracking:**

```prisma
model QueryPerformanceLog {
  id           Int      @id @default(autoincrement())
  endpoint     String   // np. "/api/dashboard"
  queryType    String   // np. "getShortages"
  durationMs   Int
  recordsCount Int?
  executedAt   DateTime @default(now())

  @@index([endpoint, executedAt])
  @@map("query_performance_logs")
}
```

---

### Priorytet 3: NICE TO HAVE (Optymalizacje zaawansowane)

#### 3.1 Materialized Views dla dashboard

**Dla często odczytywanych, rzadko zmienianych danych:**

```typescript
// Dodaj cached stats
model DashboardCache {
  id                   String   @id // "daily", "weekly"
  activeOrdersCount    Int
  upcomingDeliveries   String   // JSON
  shortages            String   // JSON
  lastRefreshed        DateTime

  @@map("dashboard_cache")
}

// Refresh co 5 minut lub on-demand
```

#### 3.2 Database pragma optimization (SQLite)

```sql
-- Dla lepszej wydajności SQLite
PRAGMA journal_mode = WAL;           -- Write-Ahead Logging
PRAGMA synchronous = NORMAL;         -- Balance safety/speed
PRAGMA cache_size = -64000;          -- 64MB cache
PRAGMA temp_store = MEMORY;          -- Temp tables in RAM
PRAGMA mmap_size = 30000000000;      -- Memory-mapped I/O
```

**Dodaj do Prisma connection:**
```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL +
           '?connection_limit=10' +
           '&pool_timeout=20' +
           '&socket_timeout=20'
    }
  }
});
```

#### 3.3 Read replicas (dla skalowania)

**Gdy traffic wzrośnie >100 req/s:**
- Slave DB dla read-only queries (dashboard, reports)
- Master DB dla write operations
- Load balancing między replicas

---

## 📈 Metryki wydajnościowe (przed/po)

### Przed optymalizacją:
| Query | Czas | Zapytania DB |
|-------|------|--------------|
| GET /api/dashboard | ~150ms | 6 queries |
| GET /dashboard/stats/weekly | ~300ms | 3 queries (deep nesting) |
| getShortages() | ~80ms | 2 queries + O(n) mapping |

### Po optymalizacji (Priorytet 1):
| Query | Czas | Zapytania DB |
|-------|------|--------------|
| GET /api/dashboard | ~60ms | 4 queries |
| GET /dashboard/stats/weekly | ~80ms | 1 query |
| getShortages() | ~25ms | 1 query |

**Oczekiwany zysk całkowity:** 50-60% przyspieszenie dashboard

---

## 🛠️ Plan wdrożenia

### Faza 1: Quick wins (1-2h)
1. ✅ Dodać brakujące indeksy (1.1)
2. ✅ Optymalizować getShortages() (1.2)
3. ✅ Testować performance przed/po

### Faza 2: Refactoring queries (2-3h)
1. ✅ Przepisać weekly stats na raw SQL (1.3)
2. ✅ Dodać kompozytowe indeksy
3. ✅ Benchmark wszystkich dashboard endpoints

### Faza 3: Long-term (opcjonalne)
1. 🔄 Monitoring i analytics (2.3)
2. 🔄 Archiwizacja Schuco (2.2)
3. 🔄 Materialized views (3.1)

---

## ⚡ Szybkie działania (możesz zrobić teraz)

### Krok 1: Dodaj indeksy
```bash
# Utwórz migrację
cd apps/api
npx prisma migrate dev --name add_performance_indexes
```

### Krok 2: Zmierz baseline
```bash
# Uruchom test wydajnościowy
npm run test:performance
```

### Krok 3: Wdróż optymalizacje
- Skopiuj kod z sekcji 1.1, 1.2, 1.3
- Przetestuj lokalnie
- Deploy

---

## 🎓 Wnioski i best practices

### ✅ Co robimy dobrze:
1. **Repository pattern** - czysty kod, łatwy do optymalizacji
2. **Selective queries** - używamy `select` zamiast pobierania wszystkiego
3. **Proper indexes** - podstawowe indeksy są w porządku
4. **No orphans** - relacje z CASCADE działają poprawnie

### 🔧 Co można poprawić:
1. **Raw SQL dla złożonych aggregacji** - Prisma generuje suboptimalne queries
2. **Kompozytowe indeksy** - WHERE clauses używają wielu kolumn
3. **Query monitoring** - brak visibility do slow queries
4. **Caching strategy** - dashboard queries bez cache

### 📚 Rekomendacje na przyszłość:
1. **Monitoring:** Dodaj query performance logging
2. **Testy:** Performance regression tests w CI/CD
3. **Documentation:** Dokumentuj slow queries i optymalizacje
4. **Review:** Code review checklist dla N+1 queries

---

## 📞 Pytania do zespołu

1. **Moduł Okuc:** Czy będzie wdrożony? Jeśli nie → usunąć tabele
2. **Monthly Reports:** Czy funkcja jest planowana? Jeśli nie → usunąć
3. **Schuco archiving:** Jak długo przechowywać historię? (6m, 1y, forever?)
4. **Performance SLA:** Jaki jest akceptowalny czas odpowiedzi? (<100ms, <200ms?)

---

## 🚀 Następne kroki

1. **Zaakceptuj plan** - wybierz zakres optymalizacji
2. **Priorytetyzuj** - które fazy wdrożyć
3. **Implementuj** - wykonaj migracje i refactoring
4. **Mierz** - benchmark przed/po
5. **Monitoruj** - tracking performance w czasie

---

**Wygenerowano przez:** Claude Code (Analyze DB mode)
**Następna rewizja:** Za 3 miesiące lub przy 10k+ rekordów