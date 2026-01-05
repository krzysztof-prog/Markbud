# 📊 Stan Dynamic Imports - Analiza Bieżąca

**Data:** 2026-01-02
**Status analizy:** ✅ COMPLETED

---

## ✅ Co JUŻ JEST Zaimplementowane

### 1. **Panel Kierownika** (`app/kierownik/page.tsx`) ✅
**Status:** DOSKONALE zaimplementowane

```typescript
// ✅ Wszystkie 6 tabs lazy-loaded z proper syntax
const AddToProductionTab = dynamic(
  () => import('@/features/manager/components/AddToProductionTab')
    .then((mod) => ({ default: mod.AddToProductionTab })),
  { loading: () => <TabLoader />, ssr: false }
);
// + CompleteOrdersTab, TimeTrackerTab, PalletsTab, BZTab, MonthlyReportContent
```

**Komponenty lazy-loaded:**
- ✅ AddToProductionTab
- ✅ CompleteOrdersTab
- ✅ TimeTrackerTab
- ✅ PalletsTab
- ✅ BZTab
- ✅ MonthlyReportContent

**Skeleton:** ✅ TabLoader custom component

---

### 2. **Dashboard** (`app/page.tsx`) ✅
**Status:** DOBRZE zaimplementowane

```typescript
// ✅ DashboardContent lazy-loaded
const DashboardContent = dynamic(
  () => import('@/features/dashboard/components/DashboardContent').then((mod) => mod.default),
  { loading: () => <DashboardSkeleton />, ssr: false }
);
```

**Skeleton:** ✅ DashboardSkeleton component

---

### 3. **Dostawy Page** (`app/dostawy/page.tsx`) ✅
**Status:** Page wrapper lazy-loaded

```typescript
// ✅ DostawyPageContent lazy-loaded
const DostawyPageContent = dynamic(
  () => import('./DostawyPageContent').then((mod) => mod.default),
  { loading: () => <TableSkeleton />, ssr: false }
);
```

**Skeleton:** ✅ TableSkeleton component

---

## ❌ Co WYMAGA Dodania

### 1. **DostawyPageContent.tsx** - Ciężkie Komponenty ❌

**Problem:** Wszystkie ciężkie komponenty załadowane statycznie

```typescript
// ❌ STATYCZNE IMPORTY (obecnie)
import { DeliveriesListView } from './components/DeliveriesListView';      // 12KB
import { DeliveryCalendar } from './components/DeliveryCalendar';          // 12KB
import { DeliveryDialogs } from './components/DeliveryDialogs';            // 23KB (!!)
import { UnassignedOrdersPanel } from './components/UnassignedOrdersPanel';// 5KB
import { BulkUpdateDatesDialog } from './components/BulkUpdateDatesDialog';// 4KB
import { OrderDetailModal } from '@/components/orders/order-detail-modal'; // ~10KB
import { WindowStatsDialog } from '@/components/window-stats-dialog';      // ~8KB
```

**Łącznie:** ~74KB załadowane od razu!

**Priorytet:** 🔴 WYSOKI

---

### 2. **Magazyn Pages** - Brak Lazy Loading ❌

#### `app/magazyn/akrobud/page.tsx`
```typescript
// ❌ Brak dynamic imports
import { WarehouseContent } from '@/features/warehouse/...';
```

#### `app/magazyn/dostawy-schuco/page.tsx`
```typescript
// Częściowo - wymaga sprawdzenia
```

**Priorytet:** 🟡 ŚREDNI

---

### 3. **Inne Pages** - Do Sprawdzenia

- `app/archiwum/page.tsx` - ?
- `app/dostawy-szyb/page.tsx` - ?
- `app/importy/page.tsx` - ?
- `app/szyby/page.tsx` - ?
- `app/ustawienia/page.tsx` - ?
- `app/zestawienia/zlecenia/page.tsx` - ?

**Priorytet:** 🟢 NISKI

---

## 📋 Plan Implementacji

### Faza 1: DostawyPageContent (PRIORYTET 🔴)

**Cel:** Lazy load ciężkich komponentów w DostawyPageContent

**Komponenty do migracji:**
1. ✅ DeliveryDialogs (23KB) - największy, MUSI być lazy
2. ✅ DeliveryCalendar (12KB)
3. ✅ DeliveriesListView (12KB)
4. ✅ OrderDetailModal (10KB)
5. ✅ WindowStatsDialog (8KB)
6. ✅ UnassignedOrdersPanel (5KB)
7. ✅ BulkUpdateDatesDialog (4KB)

**Łączny impact:** ~74KB → lazy loaded

---

### Faza 2: Skeleton Loaders

**Istniejące:**
- ✅ TabLoader (kierownik)
- ✅ DashboardSkeleton
- ✅ TableSkeleton

**Do utworzenia:**
- ❌ CalendarSkeleton (dla DeliveryCalendar)
- ❌ DialogSkeleton (dla modali)
- ❌ PanelSkeleton (dla UnassignedOrdersPanel)

---

### Faza 3: Magazyn & Pozostałe Pages

**Do sprawdzenia i ewentualnie dodania lazy loading**

---

## 🎯 Priorytetyzacja

### Teraz (dziś):
1. ✅ DostawyPageContent - lazy load 7 ciężkich komponentów
2. ✅ Utworzyć brakujące skeletony

### Później (opcjonalne):
3. Magazyn pages
4. Pozostałe pages

---

## 📊 Oczekiwane Rezultaty

### Przed (szacunki):

| Bundle | Rozmiar |
|--------|---------|
| Main chunk | ~800KB |
| /dostawy page | ~250KB (z 74KB ciężkich komponentów) |

### Po implementacji Fazy 1:

| Bundle | Rozmiar |
|--------|---------|
| Main chunk | ~800KB → ~726KB (-74KB) |
| /dostawy initial | ~176KB (-30%) |
| Lazy chunks | 7x separate chunks (load on demand) |

**Impact:**
- ✅ /dostawy ładuje się 30% szybciej
- ✅ Initial bundle -74KB
- ✅ Komponenty ładują się tylko gdy potrzebne

---

## 🔧 Szczegóły Techniczne

### Obecny Syntax (POPRAWNY ✅):

Projekt JUŻ UŻYWA poprawnego syntax dla Next.js 15:

```typescript
// ✅ Explicit default export
dynamic(
  () => import('./Component').then((mod) => mod.default),
  { loading: () => <Skeleton />, ssr: false }
);

// ✅ Named export z wrappingiem
dynamic(
  () => import('./Component').then((mod) => ({ default: mod.ComponentName })),
  { loading: () => <Skeleton />, ssr: false }
);
```

**To jest zgodne z wymaganiami Next.js 15!**

---

## ✅ Mocne Strony Obecnej Implementacji

1. ✅ **Poprawny syntax** - `.then((mod) => ...)` używany konsekwentnie
2. ✅ **Loading states** - każdy lazy component ma skeleton
3. ✅ **SSR disabled** - `ssr: false` dla client components
4. ✅ **Custom skeletony** - dedykowane loaders (TabLoader, DashboardSkeleton)

---

## 📝 Następne Kroki

1. **Dodać dynamic imports do DostawyPageContent**
   - DeliveryDialogs (23KB) - priorytet #1
   - DeliveryCalendar (12KB) - priorytet #2
   - DeliveriesListView (12KB) - priorytet #3
   - Pozostałe (24KB) - priorytet #4

2. **Utworzyć skeletony**
   - CalendarSkeleton
   - DialogSkeleton
   - PanelSkeleton

3. **Test & Measure**
   - Bundle size analysis
   - Performance metrics

---

**Status:** Ready to implement ✅
**Estimated time:** 2-3h dla Fazy 1
**Impact:** HIGH (74KB lazy loaded)
