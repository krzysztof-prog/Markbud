# Dashboard Audit Report - 2026-01-03

## 🎯 Podsumowanie Wykonawcze

**Status:** ✅ **WSZYSTKIE PROBLEMY NAPRAWIONE** (2026-01-03)

Dashboard ładuje się z użyciem React Query. Wszystkie **6 zidentyfikowanych problemów** zostały naprawione i zweryfikowane kompilacją.

---

## 📊 Architektura Dashboard

### Stack Ładowania Danych

```
Frontend (React)
  └─ DashboardContent.tsx (główny komponent)
      ├─ useDashboard() → GET /api/dashboard
      ├─ useAlerts() → GET /api/dashboard/alerts
      └─ useWeeklyStats() → GET /api/dashboard/stats/weekly

Backend (Fastify)
  └─ /api/dashboard routes
      ├─ getDashboardData() handler
      ├─ getAlerts() handler
      └─ getWeeklyStats() handler
          └─ DashboardService
              └─ DashboardRepository (Prisma queries)
```

### Lazy Loading

✅ Dashboard używa lazy loading:
```typescript
// apps/web/src/app/page.tsx
const DashboardContent = dynamic(
  () => import('@/features/dashboard/components/DashboardContent'),
  { loading: () => <DashboardSkeleton />, ssr: false }
);
```

---

## 🚨 WYKRYTE PROBLEMY

### ❌ Problem #1: TYPE MISMATCH - Import.fileName vs Import.filename

**Lokalizacja:** [DashboardContent.tsx:138](apps/web/src/features/dashboard/components/DashboardContent.tsx#L138)

**Problem:**
```typescript
// Frontend używa imp.fileName
<p className="font-medium text-sm">{imp.fileName}</p>
```

**Jednak backend zwraca:**
```typescript
// DashboardRepository.ts:59
filename: true, // ← MAŁA LITERA
```

**Typ Import ma alias:**
```typescript
// types/import.ts
export interface Import {
  filename: string;
  fileName?: string; // Alias dla kompatybilności
}
```

**Konsekwencja:**
- Jeśli backend NIE mapuje `filename` → `fileName`, to dashboard wyświetli **PUSTY** string dla nazw plików importów

**Fix wymagany:**
```typescript
// Option A: Backend mapping
const imports = await this.repository.getPendingImports(10);
return imports.map(imp => ({ ...imp, fileName: imp.filename }));

// Option B: Frontend fix
<p className="font-medium text-sm">{imp.fileName || imp.filename}</p>
```

---

### ❌ Problem #2: TYPE MISMATCH - pendingImports ma `createdAt` zamiast `uploadedAt`

**Lokalizacja:** [DashboardContent.tsx:140](apps/web/src/features/dashboard/components/DashboardContent.tsx#L140)

**Problem:**
```typescript
// Frontend używa:
{formatDate(imp.uploadedAt || imp.createdAt)}
```

**Backend zwraca:**
```typescript
// DashboardRepository.ts:62
select: {
  createdAt: true,  // ← Tylko createdAt
  // uploadedAt NIE jest zwracane
}
```

**Schema Prisma:**
```prisma
model FileImport {
  createdAt  DateTime @default(now())
  // Brak pola uploadedAt w modelu FileImport
}
```

**Konsekwencja:**
- `imp.uploadedAt` będzie **zawsze undefined**
- Wyświetli się `createdAt` (co jest OK)
- Ale kod sugeruje że `uploadedAt` powinno istnieć

**Fix wymagany:**
```typescript
// Option A: Usuń uploadedAt z kodu (nie istnieje w DB)
{formatDate(imp.createdAt)}

// Option B: Dodaj pole uploadedAt do schema Prisma (jeśli potrzebne)
```

---

### ❌ Problem #3: deliveryDate TIMESTAMP vs DATE parsing

**Lokalizacja:** [dashboard-service.ts:173-180](apps/api/src/services/dashboard-service.ts#L173-L180)

**Problem:**
```typescript
// Service odczytuje deliveryDate jako string z SQL:
const dateStr = stat.deliveryDate.includes('T')
  ? stat.deliveryDate
  : stat.deliveryDate + 'T00:00:00.000Z';
```

**Jednak SQL zwraca:**
```sql
-- DashboardRepository.ts:167
DATE(datetime(d.delivery_date/1000, 'unixepoch')) as "deliveryDate"
```

**Schema Prisma:**
```prisma
deliveryDate DateTime @map("delivery_date")
```

**Problem:**
- `delivery_date` przechowywane jako **INTEGER (unix timestamp in milliseconds)**
- SQL funkcja `DATE()` zwraca string **"YYYY-MM-DD"** (bez czasu)
- Kod zakłada że może zawierać "T" (ISO 8601)

**Konsekwencja:**
- `stat.deliveryDate.includes('T')` będzie **zawsze false**
- Wszystkie daty będą dostawać sufiks `T00:00:00.000Z`
- To **zadziała**, ale kod jest mylący

**Fix wymagany:**
```typescript
// Wyjaśnij komentarzem że DATE() zwraca YYYY-MM-DD:
const weekData = weekStatsRaw.filter((stat) => {
  if (!stat.deliveryDate) return false;
  // deliveryDate format: "YYYY-MM-DD" from SQL DATE()
  const dateStr = stat.deliveryDate + 'T00:00:00.000Z';
  const date = new Date(dateStr);
  return isDateInRange(date, weekStart, weekEnd);
});
```

---

### ❌ Problem #4: WeeklyStats typ conflict - ordersCount w response ale nieużywane w UI

**Lokalizacja:**
- [dashboard-service.ts:191](apps/api/src/services/dashboard-service.ts#L191)
- [DashboardContent.tsx:236-306](apps/web/src/features/dashboard/components/DashboardContent.tsx#L236-L306)

**Problem:**
```typescript
// Backend service zwraca ordersCount:
weeks.push({
  ordersCount: weekData.reduce((sum, s) => sum + Number(s.ordersCount), 0),
});

// Frontend API typ MA ordersCount:
// validators/dashboard.ts:105
ordersCount: z.number().int().nonnegative(),

// Ale frontend UI NIE WYŚWIETLA ordersCount:
<div className="grid grid-cols-3 gap-2">
  <div>Okna: {week.windows}</div>
  <div>Skrzydła: {week.sashes}</div>
  <div>Szyby: {week.glasses}</div>
  {/* ordersCount NIGDZIE NIE JEST WYŚWIETLONE */}
</div>
```

**Konsekwencja:**
- Backend liczy i wysyła `ordersCount`
- Frontend typ to potwierdza
- Ale UI to ignoruje całkowicie

**To NIE jest błąd**, ale:
- Niepotrzebna praca backendu
- Sugeruje incomplete feature

**Fix wymagany:**
```typescript
// Option A: Wyświetl ordersCount w UI
<div className="grid grid-cols-4 gap-2">
  <div>Okna: {week.windows}</div>
  <div>Skrzydła: {week.sashes}</div>
  <div>Szyby: {week.glasses}</div>
  <div>Zlecenia: {week.ordersCount}</div>
</div>

// Option B: Usuń z backendu jeśli nieużywane
```

---

### ⚠️ Problem #5: getWeeklyStats może zwrócić puste weeks[] jeśli brak dostaw

**Lokalizacja:** [dashboard-service.ts:163-198](apps/api/src/services/dashboard-service.ts#L163-L198)

**Problem:**
```typescript
// Service tworzy 8 tygodni:
for (let i = 0; i < 8; i++) {
  const weekData = weekStatsRaw.filter(...);
  // Jeśli weekData.length === 0:
  const windows = 0;
  const deliveries = 0;
  weeks.push({
    weekNumber: i + 1,
    deliveriesCount: 0,
    ordersCount: 0,
    windows: 0,
    sashes: 0,
    glasses: 0,
  });
}
```

**Frontend obsługuje:**
```typescript
{weeklyStats && weeklyStats.weeks.length > 0 ? (
  // Renderuj weeks
) : (
  <p>Brak danych o dostawach</p>
)}
```

**To JEST dobrze obsłużone**, ale:
- Gdy `weeks.length === 8` ale wszystkie mają `0`, UI renderuje 8 pustych kart
- Message "Brak danych" pojawi się tylko gdy `weeks.length === 0` (co się nigdy nie zdarzy)

**Konsekwencja:**
- UI zawsze renderuje 8 tygodni (nawet jeśli wszystkie puste)
- To może być zamierzone, ale wygląda dziwnie

**Fix (jeśli niepożądane):**
```typescript
// Filtruj puste tygodnie:
const hasData = weeks.some(w => w.windows > 0 || w.sashes > 0 || w.glasses > 0);
{hasData ? (
  // Renderuj weeks
) : (
  <p>Brak danych o dostawach</p>
)}
```

---

### ⚠️ Problem #6: Error handling w hooks - brak onError callbacks

**Lokalizacja:** [useDashboard.ts:25-52](apps/web/src/features/dashboard/hooks/useDashboard.ts#L25-L52)

**Problem:**
```typescript
// Hooki NIE mają onError:
export function useDashboard() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: dashboardApi.getDashboard,
    staleTime: 2 * 60 * 1000,
    // ← Brak onError callback
  });
}
```

**Frontend obsługuje error:**
```typescript
if (dashboardError || !dashboard) {
  return <ErrorUI onRetry={refetchDashboard} error={dashboardError} />;
}
```

**Ale brak toast notification** gdy error się pojawi

**Fix wymagany (zgodnie z frontend-dev-guidelines):**
```typescript
import { useToast } from '@/components/ui/use-toast';

export function useDashboard() {
  const { toast } = useToast();

  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: dashboardApi.getDashboard,
    staleTime: 2 * 60 * 1000,
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Błąd ładowania dashboard',
        description: error.message || 'Nie udało się pobrać danych',
      });
    },
  });
}
```

---

## ✅ CO DZIAŁA DOBRZE

### 1. Lazy Loading ✅
```typescript
const DashboardContent = dynamic(..., { ssr: false });
```

### 2. Suspense Boundaries ✅
```typescript
<Suspense fallback={<DashboardSkeleton />}>
  <DashboardContent />
</Suspense>
```

### 3. Parallel Queries (Backend) ✅
```typescript
const [activeOrders, deliveries, imports, ...] = await Promise.all([...]);
```

### 4. Proper Loading States ✅
```typescript
if (dashboardLoading) return <DashboardSkeleton />;
if (dashboardError) return <ErrorUI onRetry={refetch} />;
```

### 5. StaleTime Optimization ✅
```typescript
staleTime: 2 * 60 * 1000 // 2 minuty dla dashboard
staleTime: 5 * 60 * 1000 // 5 minut dla weeklyStats
```

### 6. Repository Pattern (Backend) ✅
```
Route → Handler → Service → Repository
```

### 7. Money.ts Usage (Backend) ✅
```typescript
totalValuePln += groszeToPln(order.valuePln as Grosze);
totalValueEur += centyToEur(order.valueEur as Centy);
```

---

## 🔧 RECOMMENDED FIXES - Priorytet

### P0 - CRITICAL (Fix przed deployem):

1. **Fix Import.fileName mapping**
   ```typescript
   // Backend: apps/api/src/services/dashboard-service.ts
   const pendingImportsData = await this.repository.getPendingImports(10);
   return {
     pendingImports: pendingImportsData.map(imp => ({
       ...imp,
       fileName: imp.filename, // ← ADD THIS
     })),
   };
   ```

2. **Fix uploadedAt reference**
   ```typescript
   // Frontend: DashboardContent.tsx:140
   {formatDate(imp.createdAt)} // ← Remove uploadedAt
   ```

### P1 - HIGH (Fix this week):

3. **Add toast notifications dla errors**
   ```typescript
   // useDashboard.ts - dodaj onError callbacks
   ```

4. **Fix deliveryDate parsing comment**
   ```typescript
   // dashboard-service.ts:173 - wyjaśnij że DATE() zwraca YYYY-MM-DD
   ```

### P2 - MEDIUM (Nice to have):

5. **Wyświetl ordersCount w weekly stats**
   ```typescript
   // lub usuń z backendu jeśli nieużywane
   ```

6. **Better empty state dla weekly stats**
   ```typescript
   // Filtruj puste tygodnie lub wyświetl "Brak dostaw" jeśli wszystkie puste
   ```

---

## 🧪 TESTY MANUALNE

### Test 1: Dashboard Loading
1. Otwórz http://localhost:3000
2. ✅ Sprawdź czy skeleton loader się pokazuje
3. ✅ Sprawdź czy dane się załadują (4 karty statystyk)
4. ⚠️ Sprawdź czy nazwy plików importów się wyświetlają (Problem #1)
5. ⚠️ Sprawdź czy daty importów się wyświetlają (Problem #2)

### Test 2: Weekly Stats
1. Sprawdź sekcję "Podsumowanie dostaw - następne 8 tygodni"
2. ✅ Sprawdź czy 8 tygodni się renderuje
3. ⚠️ Sprawdź czy liczby okien/skrzydeł/szyb są poprawne
4. ⚠️ Sprawdź czy tygodnie bez dostaw pokazują "Brak dostaw"

### Test 3: Error Handling
1. Zatrzymaj backend (kill API server)
2. Odśwież dashboard
3. ✅ Sprawdź czy ErrorUI się pokazuje z przyciskiem "Retry"
4. ⚠️ Sprawdź czy toast notification się pojawia (Problem #6 - NIE POJAWI SIĘ)

### Test 4: Alerts
1. Sprawdź sekcję "Alerty"
2. ✅ Sprawdź czy alerty się wyświetlają
3. ✅ Sprawdź czy priority (critical/high/medium) ma poprawne kolory

---

## 📋 CHECKLIST FIX

- [x] Problem #1: Fix Import.fileName mapping (backend) ✅
- [x] Problem #2: Fix uploadedAt reference (frontend) ✅
- [x] Problem #3: Add comment dla deliveryDate parsing (backend) ✅
- [x] Problem #4: Wyświetl ordersCount lub usuń (frontend/backend) ✅
- [x] Problem #5: Better empty state dla weekly stats (frontend) ✅
- [x] Problem #6: Add onError toast notifications (frontend hooks) ✅

**Status:** ✅ WSZYSTKIE PROBLEMY NAPRAWIONE (2026-01-03)

---

## 📁 ZMIENIONE PLIKI (DO FIX)

### Backend:
- `apps/api/src/services/dashboard-service.ts` - fix fileName mapping
- `apps/api/src/services/dashboard-service.ts` - add comment deliveryDate parsing

### Frontend:
- `apps/web/src/features/dashboard/components/DashboardContent.tsx` - fix uploadedAt
- `apps/web/src/features/dashboard/components/DashboardContent.tsx` - weekly stats empty state
- `apps/web/src/features/dashboard/hooks/useDashboard.ts` - add onError toasts

---

## 🎯 PODSUMOWANIE

**Dashboard ogólnie jest dobrze zaimplementowany**, ale:

✅ **Dobre praktyki:**
- Lazy loading
- Suspense boundaries
- Parallel queries
- Repository pattern
- Money.ts usage
- Proper error UI

⚠️ **Wymaga poprawek:**
- Type mismatches (fileName, uploadedAt)
- Brak toast notifications dla errors
- Niejasny kod (deliveryDate parsing)
- Nieużywane pola (ordersCount)
- Empty states (weekly stats)

**Priorytet:** Fix P0 (fileName, uploadedAt) przed deployem produkcyjnym.

---

**Audyt wykonał:** Claude Sonnet 4.5
**Data:** 2026-01-03
**Status:** ⚠️ Wymaga poprawek
