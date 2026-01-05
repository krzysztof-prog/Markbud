# 🚀 Plan Implementacji Dynamic Imports w Next.js 15

**Data:** 2025-12-31
**Priorytet:** WYSOKI
**Estimated effort:** 4-8h
**Impact:** Bundle size reduction ~30-40%, lepsze FCP i TTI

---

## 📋 Cel

Dodanie lazy loading dla ciężkich komponentów zgodnie z wytycznymi:
- **frontend-dev-guidelines**: "Lazy Load Everything Heavy"
- **CLAUDE.md**: Dynamic imports w Next.js 15 wymagają explicit default export

---

## ⚠️ Krytyczna Zasada Next.js 15

```typescript
// ✅ POPRAWNIE - Next.js 15 wymaga explicit default export
const Component = dynamic(
  () => import('./Component').then((mod) => mod.default),
  {
    loading: () => <LoadingSkeleton />,
    ssr: false
  }
);

// ❌ BŁĄD - powoduje runtime error w Next.js 15
const Component = dynamic(() => import('./Component'));
```

---

## 🎯 Faza 1: Identyfikacja Komponentów (1h)

### Komponenty do lazy loadingu (priorytetyzacja):

#### 🔴 Priorytet WYSOKI (>100KB lub ciężkie obliczenia):

1. **DeliveryCalendar** (`apps/web/src/app/dostawy/components/DeliveryCalendar.tsx`)
   - Powód: Duży komponent kalendarzowy z logiką drag-and-drop
   - Estimated size: ~150KB
   - Użycie: Page `/dostawy`

2. **DataTable components** (wszystkie instancje TanStack Table)
   - `apps/web/src/features/deliveries/components/DeliveriesListView.tsx`
   - Powód: TanStack Table + sorting + filtering
   - Estimated size: ~200KB
   - Użycie: Wiele stron (deliveries, orders, warehouse)

3. **Charts** (Recharts)
   - `apps/web/src/features/dashboard/components/DashboardContent.tsx`
   - Powód: Recharts library (~300KB)
   - Estimated size: ~300KB
   - Użycie: Dashboard

#### 🟡 Priorytet ŚREDNI (50-100KB):

4. **Dialogs/Modals z formularzami**
   - `DeliveryDetailsDialog` - `apps/web/src/app/dostawy/components/DeliveryDialogs.tsx`
   - `AddItemDialog`
   - `CompleteOrdersDialog`
   - Powód: React Hook Form + Zod + Shadcn/ui
   - Estimated size: ~80KB każdy

5. **OrderDetailModal**
   - `apps/web/src/components/orders/order-detail-modal.tsx`
   - Powód: Złożony modal z wieloma datami
   - Estimated size: ~100KB

6. **PalletOptimization**
   - `apps/web/src/app/dostawy/[id]/optymalizacja/page.tsx`
   - Powód: Złożone obliczenia + wizualizacja
   - Estimated size: ~120KB

#### 🟢 Priorytet NISKI (nice to have):

7. **GlobalSearch**
   - `apps/web/src/components/search/GlobalSearch.tsx`
   - Powód: Używany rzadko
   - Estimated size: ~50KB

---

## 🔧 Faza 2: Utworzenie Skeleton Loaders (2h)

### 2.1. Podstawowe skeletony

Utworzyć: `apps/web/src/components/loaders/skeletons.tsx`

```typescript
import { Skeleton } from '@/components/ui/skeleton';

// Calendar skeleton
export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}

// DataTable skeleton
export function DataTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" /> {/* Header */}
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// Dialog skeleton
export function DialogSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-6 w-48" /> {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

---

## 🚀 Faza 3: Implementacja Dynamic Imports (3-4h)

### 3.1. DeliveryCalendar

**Plik:** `apps/web/src/app/dostawy/DostawyPageContent.tsx`

**Przed:**
```typescript
import { DeliveryCalendar } from './components/DeliveryCalendar';

export default function DostawyPageContent() {
  return (
    <div>
      <DeliveryCalendar {...props} />
    </div>
  );
}
```

**Po:**
```typescript
import dynamic from 'next/dynamic';
import { CalendarSkeleton } from '@/components/loaders/skeletons';

const DeliveryCalendar = dynamic(
  () => import('./components/DeliveryCalendar').then((mod) => mod.DeliveryCalendar),
  {
    loading: () => <CalendarSkeleton />,
    ssr: false
  }
);

export default function DostawyPageContent() {
  return (
    <div>
      <DeliveryCalendar {...props} />
    </div>
  );
}
```

**UWAGA:** Upewnij się, że `DeliveryCalendar.tsx` eksportuje:
```typescript
// ✅ Named export
export function DeliveryCalendar({ ... }) { ... }

// ✅ Default export (jeśli używasz default w dynamic)
export default DeliveryCalendar;
```

---

### 3.2. DeliveriesListView (DataTable)

**Plik:** `apps/web/src/app/dostawy/DostawyPageContent.tsx`

**Przed:**
```typescript
import { DeliveriesListView } from './components/DeliveriesListView';
```

**Po:**
```typescript
const DeliveriesListView = dynamic(
  () => import('./components/DeliveriesListView').then((mod) => mod.DeliveriesListView),
  {
    loading: () => <DataTableSkeleton rows={20} />,
    ssr: false
  }
);
```

---

### 3.3. Dialogs

**Plik:** `apps/web/src/app/dostawy/DostawyPageContent.tsx`

**Przed:**
```typescript
import {
  DestructiveDeleteDeliveryDialog,
  AddItemDialog,
  CompleteOrdersDialog,
  DeliveryDetailsDialog,
} from './components/DeliveryDialogs';
```

**Po:**
```typescript
// Lazy load dialogs - renderują się tylko gdy otwarte
const DeliveryDetailsDialog = dynamic(
  () => import('./components/DeliveryDialogs').then((mod) => mod.DeliveryDetailsDialog),
  {
    loading: () => <DialogSkeleton />,
    ssr: false
  }
);

const AddItemDialog = dynamic(
  () => import('./components/DeliveryDialogs').then((mod) => mod.AddItemDialog),
  {
    loading: () => <DialogSkeleton />,
    ssr: false
  }
);

const CompleteOrdersDialog = dynamic(
  () => import('./components/DeliveryDialogs').then((mod) => mod.CompleteOrdersDialog),
  {
    loading: () => <DialogSkeleton />,
    ssr: false
  }
);

const DestructiveDeleteDeliveryDialog = dynamic(
  () => import('./components/DeliveryDialogs').then((mod) => mod.DestructiveDeleteDeliveryDialog),
  {
    loading: () => <DialogSkeleton />,
    ssr: false
  }
);
```

---

### 3.4. Dashboard Charts

**Plik:** `apps/web/src/features/dashboard/components/DashboardContent.tsx`

**Przed:**
```typescript
import { BarChart, LineChart } from 'recharts';
```

**Po:**
```typescript
import dynamic from 'next/dynamic';

const BarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

const LineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);
```

---

### 3.5. OrderDetailModal

**Plik:** `apps/web/src/app/dostawy/DostawyPageContent.tsx`

**Przed:**
```typescript
import { OrderDetailModal } from '@/components/orders/order-detail-modal';
```

**Po:**
```typescript
const OrderDetailModal = dynamic(
  () => import('@/components/orders/order-detail-modal').then((mod) => mod.OrderDetailModal),
  {
    loading: () => <DialogSkeleton />,
    ssr: false
  }
);
```

---

## ✅ Faza 4: Testing & Verification (1-2h)

### 4.1. Checklist testów:

- [ ] **Build passes:** `pnpm build` bez błędów
- [ ] **Runtime test:** Wszystkie komponenty renderują się poprawnie
- [ ] **Loading states:** Skeleton loaders pokazują się podczas lazy load
- [ ] **Modals open:** Dialogi otwierają się bez błędów
- [ ] **Navigation:** Przejścia między stronami działają

### 4.2. Bundle analysis:

```bash
# Przed zmianami
pnpm build
# Zapisz rozmiary bundle w BEFORE.txt

# Po zmianach
pnpm build
# Porównaj rozmiary - oczekiwane: 30-40% redukcja

# Analiza szczegółowa
npx @next/bundle-analyzer
```

### 4.3. Performance test:

Lighthouse CI przed i po:
- First Contentful Paint (FCP)
- Time to Interactive (TTI)
- Total Blocking Time (TBT)

---

## 🔄 Faza 5: Cache Cleanup (15min)

**KRYTYCZNE:** Po zmianach w dynamic imports:

```bash
# Windows
powershell -Command "Remove-Item -Path 'apps/web/.next' -Recurse -Force"
powershell -Command "Remove-Item -Path 'apps/web/node_modules/.cache' -Recurse -Force"

# Linux/Mac
rm -rf apps/web/.next
rm -rf apps/web/node_modules/.cache

# Rebuild
pnpm build
```

---

## 📊 Oczekiwane Rezultaty

### Bundle Size Reduction:

| Bundle | Przed | Po | Redukcja |
|--------|-------|-----|----------|
| Main chunk | ~800KB | ~500KB | **-37%** |
| Deliveries page | ~600KB | ~350KB | **-42%** |
| Dashboard | ~500KB | ~280KB | **-44%** |

### Performance Metrics:

| Metric | Przed | Po | Poprawa |
|--------|-------|-----|---------|
| FCP | 2.5s | 1.5s | **-40%** |
| TTI | 4.2s | 2.8s | **-33%** |
| TBT | 800ms | 400ms | **-50%** |

---

## 🚨 Potencjalne Problemy i Rozwiązania

### Problem 1: Runtime Error - "Element type is invalid"

**Przyczyna:** Niewłaściwe użycie `.then((mod) => mod.default)` gdy komponent ma named export

**Rozwiązanie:**
```typescript
// ❌ Jeśli komponent ma: export function MyComponent() {}
dynamic(() => import('./MyComponent').then((mod) => mod.default))

// ✅ Poprawnie:
dynamic(() => import('./MyComponent').then((mod) => mod.MyComponent))
```

---

### Problem 2: Loading state nie pokazuje się

**Przyczyna:** Bardzo szybkie ładowanie (cache)

**Rozwiązanie:** Test z slow 3G throttling w DevTools

---

### Problem 3: "Cannot access 'X' before initialization"

**Przyczyna:** Circular dependencies

**Rozwiązanie:** Przenieś dynamic() na wyższy poziom lub rozwiąż circular deps

---

## 📝 Notatki Implementacyjne

### Priorytetyzacja (co najpierw):

1. **START:** DeliveryCalendar (największy impact)
2. Charts (Recharts heavy)
3. DataTable components
4. Dialogs/Modals
5. **FINISH:** Pozostałe komponenty

### Testowanie stopniowe:

- Po każdej zmianie: `pnpm dev` → sprawdź czy działa
- Po każdych 2-3 komponentach: `pnpm build` → sprawdź bundle
- Na końcu: Full E2E test

---

## 🎯 Definition of Done

- [x] Raport zapisany w `docs/`
- [ ] Wszystkie ciężkie komponenty (>50KB) używają dynamic()
- [ ] Skeleton loaders utworzone i działają
- [ ] Build passes bez błędów
- [ ] Runtime test - wszystko działa
- [ ] Bundle size zmniejszony o min. 25%
- [ ] Performance metrics poprawione
- [ ] Cache wyczyszczony
- [ ] Dokumentacja zaktualizowana

---

**Plan przygotował:** Claude Sonnet 4.5
**Data:** 2025-12-31
**Estimated completion:** 4-8h (zależnie od ilości komponentów)
