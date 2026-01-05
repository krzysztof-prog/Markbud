# Frontend Refactoring Plan - AKROBUD

**Utworzony:** 2025-11-28
**Status:** Proposal
**Czas realizacji:** 5-7 dni roboczych
**Poziom trudności:** Medium-High

---

## Executive Summary

Frontend AKROBUD ma solidne fundamenty (TanStack Query, Tailwind, Shadcn UI), ale brakuje mu **architektury i best practices** opisanych w `frontend-dev-guidelines`.

**Główne problemy:**
- ❌ Brak struktury `features/` - kod nieorganizowany wg domeny
- ❌ Masywne użycie `any` (20+ miejsc) - brak type-safety
- ❌ Monolityczny `lib/api.ts` (324 linie)
- ❌ Brak `useSuspenseQuery` - layout shift w UI
- ❌ Mega komponenty (`dostawy/page.tsx` - 1165 linii!)
- ❌ Brak `React.lazy` - wszystko ładuje się synchronicznie
- ❌ Brak dedicated `types/` - typy rozproszone

**Wynik analizy:** 3.7/10 vs frontend-dev-guidelines

---

## Faza 1: Struktura i Types (2-3 dni)

### Krok 1.1: Stwórz strukturę features/

**Cel:** Organizacja kodu wg domeny (deliveries, warehouse, orders, imports, dashboard)

**Plan działania:**

```bash
# Stwórz strukturę katalogów
mkdir -p src/features/dashboard/{api,components,hooks,types}
mkdir -p src/features/deliveries/{api,components,hooks,types,helpers}
mkdir -p src/features/warehouse/{api,components,hooks,types}
mkdir -p src/features/orders/{api,components,hooks,types}
mkdir -p src/features/imports/{api,components,hooks,types}
mkdir -p src/features/archive/{api,components,hooks,types}
mkdir -p src/features/settings/{api,components,hooks,types}
mkdir -p src/types
```

**Docelowa struktura:**
```
src/
  features/
    dashboard/
      api/
        dashboardApi.ts         # API calls dla dashboard
      components/
        DashboardContent.tsx    # Główny komponent
        StatsCards.tsx          # Karty ze statystykami
        AlertsList.tsx          # Lista alertów
        PendingImports.tsx      # Pending imports widget
        UpcomingDeliveries.tsx  # Upcoming deliveries widget
      hooks/
        useDashboard.ts         # Custom hook z useSuspenseQuery
      types/
        index.ts                # TypeScript types
      index.ts                  # Public exports

    deliveries/
      api/
        deliveriesApi.ts        # API calls
      components/
        DeliveriesList.tsx      # Lista dostaw
        DeliveryCard.tsx        # Karta pojedynczej dostawy
        DroppableDelivery.tsx   # Drag&drop delivery
        DraggableOrder.tsx      # Drag&drop order
        DeliveryCalendar.tsx    # Kalendarz dostaw
      hooks/
        useDeliveries.ts
        useDeliveryDragDrop.ts
      helpers/
        deliveryCalculations.ts # Kalkulacje dla dostaw
        deliveryFormatters.ts   # Formatowanie dat, etc.
      types/
        index.ts                # Delivery, DraggableData, etc.
      index.ts

    warehouse/
      api/
        warehouseApi.ts
      components/
        WarehouseTable.tsx
        StockCard.tsx
        ColorTabs.tsx
      hooks/
        useWarehouse.ts
      types/
        index.ts
      index.ts

    orders/
      api/
        ordersApi.ts
      components/
        OrdersList.tsx
        OrderCard.tsx
        OrderDetail.tsx
      hooks/
        useOrders.ts
      types/
        index.ts
      index.ts

    imports/
      api/
        importsApi.ts
      components/
        ImportsList.tsx
        ImportUpload.tsx
        ImportHistory.tsx
      hooks/
        useImports.ts
      types/
        index.ts
      index.ts

    archive/
      api/
        archiveApi.ts
      components/
        ArchivedOrdersList.tsx
      hooks/
        useArchive.ts
      types/
        index.ts
      index.ts

    settings/
      api/
        settingsApi.ts
      components/
        ProfilesSettings.tsx
        ColorsSettings.tsx
        WorkingDaysSettings.tsx
        OkucSettings.tsx
      hooks/
        useSettings.ts
      types/
        index.ts
      index.ts

  types/
    api.ts              # Wspólne typy API (ApiResponse, ApiError)
    common.ts           # Wspólne typy (ID, Timestamp, etc.)
    index.ts            # Re-exports

  components/
    ui/                 # Shadcn UI components (bez zmian)
    layout/             # Layout components (Header, Sidebar, etc.)
    loaders/            # Loading skeletons
    charts/             # Reusable charts

  hooks/
    useRealtimeSync.ts  # Global hooks (bez zmian)
    useToastNotifications.ts

  lib/
    api-client.ts       # Axios client (bez zmian)
    utils.ts            # Utilities (bez zmian)
    queryClient.ts      # React Query client (bez zmian)
```

**Czas:** 1-2 godziny (stworzenie struktury)

---

### Krok 1.2: Stwórz centralne type definitions

**Cel:** Wyeliminować 20+ użyć `any`, stworzyć type-safe API

**Pliki do stworzenia:**

#### 1. `src/types/common.ts`
```typescript
/**
 * Wspólne typy używane w całej aplikacji
 */

export type ID = number;
export type Timestamp = string; // ISO 8601

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Status = 'active' | 'archived' | 'pending' | 'completed';
```

#### 2. `src/types/dashboard.ts`
```typescript
import type { ID, Timestamp, Priority } from './common';
import type { Import } from './import';
import type { Delivery } from './delivery';

export interface DashboardStats {
  activeOrders: number;
  upcomingDeliveriesCount: number;
  pendingImportsCount: number;
  shortagesCount: number;
}

export interface Alert {
  id: ID;
  message: string;
  details?: string;
  priority: Priority;
  timestamp: Timestamp;
  type: 'shortage' | 'delivery' | 'import' | 'system';
}

export interface DashboardResponse {
  stats: DashboardStats;
  pendingImports: Import[];
  upcomingDeliveries: Delivery[];
}
```

#### 3. `src/types/delivery.ts`
```typescript
import type { ID, Timestamp } from './common';
import type { Order } from './order';

export interface Delivery {
  id: ID;
  weekNumber: number;
  year: number;
  deliveryDate: Timestamp;
  colorId: ID;
  isUnassigned?: boolean;
  orders?: Order[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DeliveryCalendarData {
  deliveries: Delivery[];
  monthsData: MonthData[];
}

export interface MonthData {
  month: number;
  year: number;
  weeks: WeekData[];
}

export interface WeekData {
  weekNumber: number;
  startDate: string;
  endDate: string;
  deliveries: Delivery[];
}

// Drag & Drop types
export interface DraggableData {
  orderId: ID;
  orderNumber: string;
  deliveryId?: ID;
  sourceDeliveryId?: ID;
}

export interface DroppableData {
  deliveryId: ID;
  isUnassigned?: boolean;
}
```

#### 4. `src/types/order.ts`
```typescript
import type { ID, Timestamp, Status } from './common';
import type { Requirement } from './requirement';

export interface Order {
  id: ID;
  orderNumber: string;
  clientName?: string;
  deliveryId?: ID;
  priority?: number;
  status: Status;
  archivedAt?: Timestamp;
  requirements?: Requirement[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OrderWithRequirements extends Order {
  requirements: Requirement[];
}
```

#### 5. `src/types/warehouse.ts`
```typescript
import type { ID } from './common';

export interface WarehouseStock {
  id: ID;
  profileId: ID;
  colorId: ID;
  quantity: number;
  profile?: {
    id: ID;
    number: string;
    name: string;
  };
  color?: {
    id: ID;
    name: string;
    code: string;
  };
}

export interface WarehouseStockWithCalculations extends WarehouseStock {
  demand: number;
  afterDemand: number;
  shortage: number;
}
```

#### 6. `src/types/import.ts`
```typescript
import type { ID, Timestamp, Status } from './common';

export interface Import {
  id: ID;
  fileName: string;
  fileType: 'uzyte_bele' | 'okuc_csv' | 'other';
  status: Status;
  uploadedAt: Timestamp;
  processedAt?: Timestamp;
  error?: string;
  recordsCount?: number;
}
```

#### 7. `src/types/index.ts`
```typescript
// Re-export wszystkich typów
export * from './common';
export * from './dashboard';
export * from './delivery';
export * from './order';
export * from './warehouse';
export * from './import';
export * from './requirement';
export * from './profile';
export * from './color';
```

**Czas:** 2-3 godziny (stworzenie wszystkich typów)

---

### Krok 1.3: Rozbij monolityczny lib/api.ts

**Cel:** Podzielić 324-linijkowy `lib/api.ts` na feature-specific API services

**Plan działania:**

#### Przykład: Dashboard API

**PRZED (lib/api.ts):**
```typescript
export const dashboardApi = {
  getDashboard: () => fetchApi<any>('/api/dashboard'),
  getAlerts: () => fetchApi<any[]>('/api/dashboard/alerts'),
};
```

**PO (features/dashboard/api/dashboardApi.ts):**
```typescript
import { fetchApi } from '@/lib/api-client';
import type { DashboardResponse, Alert } from '../types';

/**
 * API service for dashboard-related operations
 */
export const dashboardApi = {
  /**
   * Fetch dashboard data (stats, pending imports, upcoming deliveries)
   */
  getDashboard: () =>
    fetchApi<DashboardResponse>('/api/dashboard'),

  /**
   * Fetch all alerts
   */
  getAlerts: () =>
    fetchApi<Alert[]>('/api/dashboard/alerts'),

  /**
   * Mark alert as read
   */
  markAlertAsRead: (alertId: number) =>
    fetchApi<void>(`/api/dashboard/alerts/${alertId}/read`, {
      method: 'PATCH',
    }),
};
```

**Podobnie dla innych features:**
- `features/deliveries/api/deliveriesApi.ts`
- `features/warehouse/api/warehouseApi.ts`
- `features/orders/api/ordersApi.ts`
- `features/imports/api/importsApi.ts`
- `features/settings/api/settingsApi.ts`

**Czas:** 2-3 godziny (wszystkie API services)

---

## Faza 2: Modernizacja Data Fetching (1-2 dni)

### Krok 2.1: Zamień useQuery na useSuspenseQuery

**Cel:** Wyeliminować layout shift, uprościć kod (bez `if (isLoading)`)

**Pattern PRZED:**
```typescript
// ❌ AKTUALNE (app/page.tsx)
export default function DashboardPage() {
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getDashboard,
  });

  if (error) {
    showErrorToast('Błąd ładowania danych', getErrorMessage(error));
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Dashboard" alertsCount={0} />
        <DashboardSkeleton />
      </div>
    );
  }

  const stats = dashboard?.stats || { /* defaults */ };

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" alertsCount={alerts?.length || 0} />
      {/* 200+ linii... */}
    </div>
  );
}
```

**Pattern PO:**
```typescript
// ✅ NOWE (app/page.tsx)
import { Suspense } from 'react';
import { DashboardContent } from '@/features/dashboard/components/DashboardContent';
import { DashboardSkeleton } from '@/components/loaders/DashboardSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DashboardPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </ErrorBoundary>
  );
}

// ✅ NOWE (features/dashboard/components/DashboardContent.tsx)
import { useSuspenseQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardResponse } from '../types';

export function DashboardContent() {
  // Bez isLoading, bez error - Suspense i ErrorBoundary obsługują
  const { data } = useSuspenseQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getDashboard,
  });

  const stats = data.stats;

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" alertsCount={data.alerts.length} />
      {/* 200+ linii, ale bez loading checks */}
    </div>
  );
}
```

**Korzyści:**
- ✅ Brak layout shift (Suspense utrzymuje strukturę)
- ✅ Mniej boilerplate (bez `if (isLoading)`)
- ✅ Lepsze UX (szkielet w tym samym miejscu co content)
- ✅ Type-safe (data jest DashboardResponse, nie `any | undefined`)

**Do zmiany:**
- [ ] `app/page.tsx` (Dashboard)
- [ ] `app/dostawy/page.tsx` (Deliveries) - **PRIORYTET** (1165 linii!)
- [ ] `app/magazyn/page.tsx` (Warehouse)
- [ ] `app/importy/page.tsx` (Imports)
- [ ] `app/archiwum/page.tsx` (Archive)
- [ ] `app/ustawienia/page.tsx` (Settings)

**Czas:** 1 dzień (wszystkie pages)

---

### Krok 2.2: Stwórz custom hooks z useSuspenseQuery

**Cel:** Enkapsulacja logiki pobierania danych, reusability

**Przykład: Dashboard Hook**

```typescript
// features/dashboard/hooks/useDashboard.ts
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardResponse } from '../types';

export const DASHBOARD_QUERY_KEY = ['dashboard'] as const;

/**
 * Hook do pobierania danych dashboard z Suspense
 *
 * @example
 * ```tsx
 * function DashboardContent() {
 *   const { data, refetch } = useDashboard();
 *   return <div>{data.stats.activeOrders}</div>;
 * }
 * ```
 */
export function useDashboard() {
  return useSuspenseQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: dashboardApi.getDashboard,
    staleTime: 2 * 60 * 1000, // 2 minuty
  });
}

/**
 * Hook do invalidacji cache dashboard
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
  };
}
```

**Podobnie:**
- `features/deliveries/hooks/useDeliveries.ts`
- `features/warehouse/hooks/useWarehouse.ts`
- `features/orders/hooks/useOrders.ts`
- `features/imports/hooks/useImports.ts`

**Czas:** 3-4 godziny (wszystkie hooks)

---

## Faza 3: Rozbicie Mega Komponentów (1-2 dni)

### Krok 3.1: Refaktoryzacja dostawy/page.tsx (1165 linii!)

**Cel:** Podzielić mega komponent na mniejsze, lazy-loaded parts

**STRUKTURA PRZED:**
```
app/dostawy/page.tsx (1165 linii)
  ├─ Imports (20 linii)
  ├─ State management (30 linii)
  ├─ Data fetching (50 linii)
  ├─ DragDrop handlers (200 linii)
  ├─ Helper functions (100 linii)
  ├─ DragDropComponents (300 linii inline)
  ├─ Calendar rendering (400 linii)
  └─ Modals & dialogs (65 linii)
```

**STRUKTURA PO:**
```
app/dostawy/page.tsx (50 linii)
  └─ Import & Suspense wrapper

features/deliveries/
  ├─ components/
  │   ├─ DeliveriesContent.tsx (150 linii - główna logika)
  │   ├─ DeliveryCalendar.tsx (250 linii - kalendarz)
  │   ├─ DroppableDelivery.tsx (100 linii - droppable)
  │   ├─ DraggableOrder.tsx (80 linii - draggable)
  │   ├─ UnassignedOrders.tsx (120 linii - nieprzypisane)
  │   ├─ DeliveryModals.tsx (150 linii - modals)
  │   └─ PendingImportsAlert.tsx (50 linii)
  ├─ hooks/
  │   ├─ useDeliveries.ts (50 linii)
  │   ├─ useDeliveryDragDrop.ts (150 linii - drag&drop logic)
  │   └─ useDeliveryCalendar.ts (100 linii - calendar logic)
  ├─ helpers/
  │   ├─ deliveryCalculations.ts (80 linii)
  │   ├─ deliveryFormatters.ts (50 linii)
  │   └─ workingDaysHelpers.ts (60 linii)
  └─ types/
      └─ index.ts (50 linii - typy zamiast any)
```

**Plan refaktoryzacji:**

#### 1. Stwórz page wrapper (app/dostawy/page.tsx):
```typescript
import { Suspense } from 'react';
import { DeliveriesContent } from '@/features/deliveries/components/DeliveriesContent';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DostawyPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<TableSkeleton />}>
        <DeliveriesContent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

#### 2. Wydziel główną logikę (features/deliveries/components/DeliveriesContent.tsx):
```typescript
'use client';

import React from 'react';
import { useDeliveries } from '../hooks/useDeliveries';
import { useDeliveryDragDrop } from '../hooks/useDeliveryDragDrop';
import { useDeliveryCalendar } from '../hooks/useDeliveryCalendar';
import { DeliveryCalendar } from './DeliveryCalendar';
import { UnassignedOrders } from './UnassignedOrders';
import { DeliveryModals } from './DeliveryModals';
import { Header } from '@/components/layout/header';

export function DeliveriesContent() {
  const { data } = useDeliveries();
  const dragDropHandlers = useDeliveryDragDrop();
  const calendarData = useDeliveryCalendar(data);

  return (
    <div className="flex flex-col h-full">
      <Header title="Dostawy" />

      <div className="flex gap-4 p-4">
        <UnassignedOrders
          orders={data.unassignedOrders}
          {...dragDropHandlers}
        />

        <DeliveryCalendar
          calendarData={calendarData}
          {...dragDropHandlers}
        />
      </div>

      <DeliveryModals {...dragDropHandlers} />
    </div>
  );
}
```

#### 3. Stwórz dedykowane hooks:

**features/deliveries/hooks/useDeliveryDragDrop.ts:**
```typescript
import { useState, useCallback } from 'react';
import { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveriesApi } from '../api/deliveriesApi';
import type { DraggableData, DroppableData } from '../types';

export function useDeliveryDragDrop() {
  const [activeDragItem, setActiveDragItem] = useState<DraggableData | null>(null);
  const queryClient = useQueryClient();

  const assignOrderMutation = useMutation({
    mutationFn: deliveriesApi.assignOrderToDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      // Toast success
    },
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DraggableData;
    setActiveDragItem(data);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveDragItem(null);
      return;
    }

    const activeData = active.data.current as DraggableData;
    const overData = over.data.current as DroppableData;

    assignOrderMutation.mutate({
      orderId: activeData.orderId,
      deliveryId: overData.deliveryId,
    });

    setActiveDragItem(null);
  }, [assignOrderMutation]);

  return {
    activeDragItem,
    handleDragStart,
    handleDragEnd,
  };
}
```

**Czas na dostawy/page.tsx refactor:** 4-6 godzin

---

### Krok 3.2: Dodaj React.lazy dla heavy components

**Cel:** Code splitting - zmniejszenie initial bundle size

**Komponenty do lazy loading:**
1. `DeliveryCalendar` (duży komponent z kalendarzem)
2. `ProfileDeliveryTable` (300+ linii)
3. DragDrop components (jeśli ciężkie)
4. Charts/Analytics components

**Przykład:**

```typescript
// app/dostawy/page.tsx
import { lazy, Suspense } from 'react';

const DeliveriesContent = lazy(() =>
  import('@/features/deliveries/components/DeliveriesContent')
    .then(m => ({ default: m.DeliveriesContent }))
);

export default function DostawyPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <DeliveriesContent />
    </Suspense>
  );
}
```

**Czas:** 1-2 godziny (dodanie lazy loading)

---

## Faza 4: Performance Optimization (1 dzień)

### Krok 4.1: Dodaj React.memo dla expensive components

**Cel:** Zmniejszenie niepotrzebnych re-renders

**Komponenty do memoization:**
1. `DroppableDelivery` - renderuje się wiele razy
2. `DraggableOrder` - każdy order w liście
3. `StockCard` - w warehouse table
4. `OrderCard` - w orders list

**Przykład:**

**PRZED:**
```typescript
export function DraggableOrder({ order, onDrag }: Props) {
  return (
    <div className="...">
      {order.orderNumber} - {order.clientName}
    </div>
  );
}
```

**PO:**
```typescript
export const DraggableOrder = React.memo(function DraggableOrder({
  order,
  onDrag
}: Props) {
  return (
    <div className="...">
      {order.orderNumber} - {order.clientName}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - tylko re-render gdy order się zmienił
  return prevProps.order.id === nextProps.order.id &&
         prevProps.order.updatedAt === nextProps.order.updatedAt;
});
```

**Czas:** 2-3 godziny (wszystkie expensive components)

---

### Krok 4.2: useCallback dla event handlers

**Cel:** Stabilne referencje funkcji (zapobiega re-renderom children)

**Gdzie dodać:**
- Wszystkie onClick handlers przekazywane do children
- Drag&drop handlers
- Form submission handlers

**Przykład:**

**PRZED:**
```typescript
function DeliveriesContent() {
  const handleOrderClick = (orderId: number) => {
    // logic
  };

  return <OrdersList onOrderClick={handleOrderClick} />;
}
```

**PO:**
```typescript
function DeliveriesContent() {
  const handleOrderClick = useCallback((orderId: number) => {
    // logic
  }, []); // Stabilna referencja

  return <OrdersList onOrderClick={handleOrderClick} />;
}
```

**Czas:** 1-2 godziny (wszystkie handlers)

---

### Krok 4.3: useMemo dla expensive calculations

**Cel:** Cache wyników expensive operations

**Gdzie dodać:**
- Calculations w ProfileDeliveryTable
- Filtrowanie dużych list
- Sortowanie arrays
- Format transformations

**Przykład:**

**PRZED:**
```typescript
function WarehouseTable({ stocks }: Props) {
  // To się wykonuje przy każdym renderze!
  const sortedStocks = stocks
    .filter(s => s.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity)
    .map(s => ({
      ...s,
      afterDemand: s.quantity - calculateDemand(s),
    }));

  return <Table data={sortedStocks} />;
}
```

**PO:**
```typescript
function WarehouseTable({ stocks }: Props) {
  const sortedStocks = useMemo(() => {
    return stocks
      .filter(s => s.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .map(s => ({
        ...s,
        afterDemand: s.quantity - calculateDemand(s),
      }));
  }, [stocks]); // Tylko gdy stocks się zmieni

  return <Table data={sortedStocks} />;
}
```

**Czas:** 1-2 godziny (wszystkie calculations)

---

## Faza 5: Final Polish (1 dzień)

### Krok 5.1: Error Boundaries per-route

**Cel:** Graceful error handling, nie crash całej aplikacji

**Plan:**

#### 1. Stwórz ErrorBoundary component:
```typescript
// components/ErrorBoundary.tsx
'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // TODO: Send to Sentry
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Coś poszło nie tak</h2>
          <p className="text-gray-600 mb-4">
            {this.state.error?.message || 'Wystąpił nieoczekiwany błąd'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Odśwież stronę
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 2. Użyj w każdej route:
```typescript
// app/dostawy/page.tsx
export default function DostawyPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<TableSkeleton />}>
        <DeliveriesContent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Czas:** 1-2 godziny

---

### Krok 5.2: Dark Mode Support (opcjonalne)

**Cel:** Lepsze UX, modern feel

**Plan:**

#### 1. Dodaj theme provider (jeśli brak):
```typescript
// providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {/* existing providers */}
      {children}
    </ThemeProvider>
  );
}
```

#### 2. Dodaj dark: prefixes do TailwindCSS:
```typescript
// Przykład
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <Card className="bg-white dark:bg-gray-800">
    <CardHeader className="border-b dark:border-gray-700">
      ...
    </CardHeader>
  </Card>
</div>
```

#### 3. Theme toggle w Header:
```typescript
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

**Czas:** 2-3 godziny (opcjonalne)

---

### Krok 5.3: Dokumentacja i cleanup

**Cel:** Czytelny kod, łatwy onboarding

**Plan:**
1. Dodaj JSDoc do wszystkich public APIs
2. Dodaj README.md dla każdego feature
3. Usuń console.logs
4. Usuń commented code
5. Sprawdź brak eslint warnings

**Przykład JSDoc:**
```typescript
/**
 * Hook do pobierania i zarządzania dostawami
 *
 * @returns {Object} deliveries data i helper functions
 * @example
 * ```tsx
 * function DeliveriesList() {
 *   const { data, refetch } = useDeliveries();
 *   return <div>{data.deliveries.length} dostaw</div>;
 * }
 * ```
 */
export function useDeliveries() {
  // ...
}
```

**Czas:** 1-2 godziny

---

## Podsumowanie Timeline

| Faza | Zadanie | Czas | Priority |
|------|---------|------|----------|
| **1** | Struktura features/ | 1-2h | 🔴 CRITICAL |
| **1** | Type definitions | 2-3h | 🔴 CRITICAL |
| **1** | Rozbić api.ts | 2-3h | 🔴 CRITICAL |
| **2** | useSuspenseQuery | 1 dzień | 🟠 HIGH |
| **2** | Custom hooks | 3-4h | 🟠 HIGH |
| **3** | Refactor dostawy/page | 4-6h | 🟠 HIGH |
| **3** | React.lazy | 1-2h | 🟡 MEDIUM |
| **4** | React.memo | 2-3h | 🟡 MEDIUM |
| **4** | useCallback | 1-2h | 🟡 MEDIUM |
| **4** | useMemo | 1-2h | 🟡 MEDIUM |
| **5** | ErrorBoundaries | 1-2h | 🟡 MEDIUM |
| **5** | Dark mode | 2-3h | 🟢 LOW (optional) |
| **5** | Docs & cleanup | 1-2h | 🟢 LOW |
| **TOTAL** | | **5-7 dni** | |

---

## Checklist Postępu

### Faza 1: Struktura ✅
- [ ] Stwórz katalogi features/
- [ ] Stwórz katalog types/
- [ ] Stwórz wszystkie type definitions
- [ ] Rozbij lib/api.ts na feature APIs
- [ ] Przetestuj kompilację TypeScript

### Faza 2: Data Fetching ✅
- [ ] Zamień useQuery na useSuspenseQuery (dashboard)
- [ ] Zamień useQuery na useSuspenseQuery (deliveries)
- [ ] Zamień useQuery na useSuspenseQuery (warehouse)
- [ ] Zamień useQuery na useSuspenseQuery (imports)
- [ ] Zamień useQuery na useSuspenseQuery (archive)
- [ ] Zamień useQuery na useSuspenseQuery (settings)
- [ ] Stwórz custom hooks dla każdego feature
- [ ] Przetestuj loading states

### Faza 3: Komponenty ✅
- [ ] Refactor dostawy/page.tsx (rozbić na komponenty)
- [ ] Wydziel DeliveryCalendar
- [ ] Wydziel DragDrop logic do hooks
- [ ] Dodaj React.lazy dla heavy components
- [ ] Przetestuj lazy loading

### Faza 4: Performance ✅
- [ ] Dodaj React.memo (DraggableOrder)
- [ ] Dodaj React.memo (DroppableDelivery)
- [ ] Dodaj React.memo (StockCard, OrderCard)
- [ ] Dodaj useCallback dla handlers
- [ ] Dodaj useMemo dla calculations
- [ ] Sprawdź React DevTools Profiler

### Faza 5: Polish ✅
- [ ] Dodaj ErrorBoundary component
- [ ] Dodaj ErrorBoundaries per-route
- [ ] (Optional) Dodaj dark mode
- [ ] Dodaj JSDoc do APIs
- [ ] Cleanup (console.logs, comments)
- [ ] Przejrzyj eslint warnings

---

## Metryki Sukcesu

**Przed refaktoryzacją:**
- Score: 3.7/10 vs guidelines
- Użycie `any`: 20+ miejsc
- Największy komponent: 1165 linii (dostawy/page.tsx)
- Bundle size: ? (do zmierzenia)
- Struktura: Flat, nieorganizowana

**Po refaktoryzacji (cel):**
- Score: 8-9/10 vs guidelines ✅
- Użycie `any`: 0 miejsc ✅
- Największy komponent: <200 linii ✅
- Bundle size: -20-30% (lazy loading) ✅
- Struktura: features/, type-safe ✅

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking changes during refactor | Medium | High | Git branch, incremental commits |
| Type errors after migration | High | Medium | Stopniowa migracja, testy |
| Performance regression | Low | Medium | React DevTools profiling |
| Lost functionality | Low | High | Functional testing przed merge |

---

## Rekomendacje Implementacji

### Strategia Rollout:

**Option A: Feature-by-feature (RECOMMENDED)**
1. Tydzień 1: Dashboard + types
2. Tydzień 2: Deliveries (największy)
3. Tydzień 3: Warehouse + Orders
4. Tydzień 4: Imports + Archive + Settings

**Option B: Layer-by-layer**
1. Tydzień 1: Wszystkie typy + API services
2. Tydzień 2: Wszystkie useSuspenseQuery
3. Tydzień 3: Wszystkie komponenty
4. Tydzień 4: Performance + polish

**Zalecam Option A** - mniejsze ryzyko, łatwiejsze testowanie

### Git Workflow:

```bash
# Utwórz branch
git checkout -b refactor/frontend-architecture

# Małe commity
git commit -m "feat: add type definitions for dashboard"
git commit -m "refactor: migrate dashboard to features structure"
git commit -m "refactor: dashboard useSuspenseQuery migration"

# Co tydzień merge do develop
git checkout develop
git merge refactor/frontend-architecture

# Po całej refaktoryzacji
git checkout main
git merge develop
```

---

## Następne Kroki

1. **Review tego planu** z zespołem
2. **Wybierz strategię** (Option A lub B)
3. **Stwórz branch** refactor/frontend-architecture
4. **Start z Faza 1** (struktura + types)
5. **Daily commits** - małe, incremental changes
6. **Testy po każdej fazie** - functional testing
7. **Merge co tydzień** - do develop branch

---

## Pytania?

Jeśli masz pytania lub potrzebujesz pomocy z implementacją:
1. Przeczytaj `frontend-dev-guidelines` skill
2. Zobacz przykłady w tym planie
3. Sprawdź plik backend-code-review.md (inspiracja)

**Powodzenia!** 🚀

---

**Autor:** Claude Code (Frontend Analysis Agent)
**Data:** 2025-11-28
**Wersja:** 1.0
**Status:** Ready for implementation
