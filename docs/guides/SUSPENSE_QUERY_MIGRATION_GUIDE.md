# 🔄 Migration Guide: useQuery → useSuspenseQuery

**Data:** 2025-12-31
**Priorytet:** ŚREDNI
**Estimated effort:** 8-16h (zależnie od ilości komponentów)
**Impact:** Lepsze UX, brak layout shift, spójne loading states

---

## 📋 Cel

Migracja z `useQuery` na `useSuspenseQuery` zgodnie z **frontend-dev-guidelines**:

> **Rule #7: Suspense for Loading**
> Use Suspense boundaries, not early returns
>
> **Rule #2: useSuspenseQuery**
> PRIMARY PATTERN: useSuspenseQuery
> - Use with Suspense boundaries
> - Cache-first strategy
> - Replaces `isLoading` checks
> - Type-safe with generics

---

## 🎯 Zalety useSuspenseQuery

### Przed (useQuery):
```typescript
function MyComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  });

  if (isLoading) {
    return <LoadingSkeleton />; // ❌ Layout shift
  }

  if (error) {
    return <ErrorMessage />; // ❌ Layout shift
  }

  return <DataView data={data} />;
}
```

**Problemy:**
- ❌ Layout shift podczas ładowania
- ❌ Early returns powodują migotanie UI
- ❌ Każdy komponent musi obsługiwać loading/error samodzielnie
- ❌ Niekonsekwentne loading states w aplikacji

### Po (useSuspenseQuery):
```typescript
function MyComponent() {
  const { data } = useSuspenseQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  });

  return <DataView data={data} />; // ✅ data zawsze defined
}

// W parent component:
<Suspense fallback={<LoadingSkeleton />}>
  <ErrorBoundary fallback={<ErrorMessage />}>
    <MyComponent />
  </ErrorBoundary>
</Suspense>
```

**Zalety:**
- ✅ Brak layout shift - skeleton zajmuje miejsce od razu
- ✅ Brak early returns - czytelniejszy kod
- ✅ Centralized loading/error handling
- ✅ TypeScript wie że `data` jest defined
- ✅ Spójne UX w całej aplikacji

---

## 🔍 Identyfikacja Komponentów do Migracji

### Statystyka obecnego stanu:

```bash
# Policz użycia useQuery
grep -r "useQuery" apps/web/src --include="*.tsx" --include="*.ts" | wc -l
# Rezultat: ~45 plików

# Policz użycia useSuspenseQuery
grep -r "useSuspenseQuery" apps/web/src --include="*.tsx" --include="*.ts" | wc -l
# Rezultat: ~5 plików

# Oblicz coverage
Coverage: 10% (5/50)
```

### Priorytety migracji:

#### 🔴 Priorytet WYSOKI (main pages):

1. **DostawyPageContent** - `apps/web/src/app/dostawy/DostawyPageContent.tsx`
   - Używa: `useQuery` dla deliveries-calendar-batch
   - Impact: Główna strona dostaw
   - Users: Wszyscy użytkownicy

2. **DashboardContent** - `apps/web/src/features/dashboard/components/DashboardContent.tsx`
   - Używa: `useQuery` dla dashboard stats
   - Impact: Strona główna
   - Users: Wszyscy użytkownicy

3. **OrdersPage** - `apps/web/src/app/zestawienia/zlecenia/page.tsx`
   - Używa: `useQuery` dla orders list
   - Impact: Raportowanie
   - Users: Managers, Admin

#### 🟡 Priorytet ŚREDNI (feature components):

4. **WarehouseComponents** - `apps/web/src/features/warehouse/`
   - Magazyn, remanent
   - Impact: Operacje magazynowe

5. **GlassComponents** - `apps/web/src/features/glass/`
   - Zamówienia szyb, dostawy szyb
   - Impact: Śledzenie szyb

#### 🟢 Priorytet NISKI (optional):

6. **Settings pages**
7. **Minor features**

---

## 📝 Wzorzec Migracji

### Krok 1: Podstawowa migracja

**Przed:**
```typescript
// DostawyPageContent.tsx
import { useQuery } from '@tanstack/react-query';

export default function DostawyPageContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['deliveries-calendar-batch', filters.monthsToFetch],
    queryFn: () => deliveriesApi.getCalendarBatch(filters.monthsToFetch),
  });

  const deliveries = data?.deliveries || [];
  const unassignedOrders = data?.unassignedOrders || [];

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div>
      <DeliveryCalendar deliveries={deliveries} />
      <UnassignedOrders orders={unassignedOrders} />
    </div>
  );
}
```

**Po:**
```typescript
// DostawyPageContent.tsx
import { useSuspenseQuery } from '@tanstack/react-query';

function DostawyPageContentInner() {
  const { data } = useSuspenseQuery({
    queryKey: ['deliveries-calendar-batch', filters.monthsToFetch],
    queryFn: () => deliveriesApi.getCalendarBatch(filters.monthsToFetch),
  });

  // ✅ TypeScript wie że data jest defined
  const deliveries = data.deliveries;
  const unassignedOrders = data.unassignedOrders;

  return (
    <div>
      <DeliveryCalendar deliveries={deliveries} />
      <UnassignedOrders orders={unassignedOrders} />
    </div>
  );
}

// ✅ Wrapper z Suspense + ErrorBoundary
export default function DostawyPageContent() {
  return (
    <ErrorBoundary fallback={<ErrorMessage />}>
      <Suspense fallback={<DeliveriesPageSkeleton />}>
        <DostawyPageContentInner />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

### Krok 2: Utworzenie skeleton loaders

**Plik:** `apps/web/src/components/loaders/page-skeletons.tsx`

```typescript
import { Skeleton } from '@/components/ui/skeleton';

export function DeliveriesPageSkeleton() {
  return (
    <div className="flex flex-col h-full p-6 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2 flex-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>

      {/* Unassigned orders */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-10 w-64" />

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
```

---

### Krok 3: ErrorBoundary component

**Plik:** `apps/web/src/components/error-boundary.tsx`

```typescript
'use client';

import { Component, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Wystąpił błąd</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>
                {this.state.error?.message || 'Nie udało się załadować danych'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  window.location.reload();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Odśwież stronę
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 🔧 Przykłady Migracji

### Przykład 1: DostawyPageContent (KOMPLETNY)

**Przed:**
```typescript
// apps/web/src/app/dostawy/DostawyPageContent.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { deliveriesApi } from '@/lib/api';

export default function DostawyPageContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['deliveries-calendar-batch', filters.monthsToFetch],
    queryFn: () => deliveriesApi.getCalendarBatch(filters.monthsToFetch),
  });

  if (isLoading) {
    return <div className="p-6">Ładowanie...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Błąd: {error.message}</div>;
  }

  const deliveries = data?.deliveries || [];
  const unassignedOrders = data?.unassignedOrders || [];

  return (
    <div className="flex flex-1 overflow-hidden">
      <DeliveryCalendar deliveries={deliveries} /* ... */ />
      <UnassignedOrdersPanel orders={unassignedOrders} /* ... */ />
    </div>
  );
}
```

**Po:**
```typescript
// apps/web/src/app/dostawy/DostawyPageContent.tsx
'use client';

import { Suspense } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { deliveriesApi } from '@/lib/api';
import { ErrorBoundary } from '@/components/error-boundary';
import { DeliveriesPageSkeleton } from '@/components/loaders/page-skeletons';

// ✅ Component z data fetching
function DostawyPageContentInner({ filters }: DostawyPageContentProps) {
  // ✅ useSuspenseQuery - data zawsze defined
  const { data } = useSuspenseQuery({
    queryKey: ['deliveries-calendar-batch', filters.monthsToFetch],
    queryFn: () => deliveriesApi.getCalendarBatch(filters.monthsToFetch),
  });

  // ✅ Brak default values - TypeScript wie że data.deliveries istnieje
  const deliveries = data.deliveries;
  const unassignedOrders = data.unassignedOrders;

  return (
    <div className="flex flex-1 overflow-hidden">
      <DeliveryCalendar deliveries={deliveries} /* ... */ />
      <UnassignedOrdersPanel orders={unassignedOrders} /* ... */ />
    </div>
  );
}

// ✅ Wrapper z Suspense + ErrorBoundary
export default function DostawyPageContent(props: DostawyPageContentProps) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<DeliveriesPageSkeleton />}>
        <DostawyPageContentInner {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Wynik:**
- ✅ Brak layout shift
- ✅ Skeleton loader od początku
- ✅ Centralized error handling
- ✅ Czytelniejszy kod (brak if statements)

---

### Przykład 2: Dashboard (z multiple queries)

**Przed:**
```typescript
function DashboardContent() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: ordersApi.getRecent,
  });

  if (statsLoading || ordersLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div>
      <StatsCards stats={stats} />
      <RecentOrders orders={orders} />
    </div>
  );
}
```

**Po:**
```typescript
function DashboardContentInner() {
  // ✅ Multiple useSuspenseQuery - wszystkie suspendują razem
  const { data: stats } = useSuspenseQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: orders } = useSuspenseQuery({
    queryKey: ['recent-orders'],
    queryFn: ordersApi.getRecent,
  });

  return (
    <div>
      <StatsCards stats={stats} />
      <RecentOrders orders={orders} />
    </div>
  );
}

export default function DashboardContent() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<DashboardPageSkeleton />}>
        <DashboardContentInner />
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Rezultat:**
- ✅ Oba queries suspendują razem
- ✅ Jeden skeleton dla całej strony
- ✅ Brak kombinowania loading states

---

## 🚨 Potencjalne Problemy i Rozwiązania

### Problem 1: "Property 'x' does not exist on type 'undefined'"

**Przyczyna:** TypeScript nie rozumie że useSuspenseQuery zawsze zwraca data

**Rozwiązanie:**
```typescript
// ❌ Może powodować błąd TypeScript
const { data } = useSuspenseQuery(...);

// ✅ Explicit type annotation
const { data } = useSuspenseQuery<DeliveryCalendarData>({
  queryKey: ['deliveries'],
  queryFn: deliveriesApi.getCalendarBatch,
});
```

---

### Problem 2: Nested Suspense boundaries

**Problem:** Wiele poziomów Suspense może powodować kaskaduję ładowanie

**Rozwiązanie:**
```typescript
// ❌ Nested Suspense - kaskaduję loading
<Suspense fallback={<PageSkeleton />}>
  <PageHeader />
  <Suspense fallback={<DataSkeleton />}>
    <DataComponent />
  </Suspense>
</Suspense>

// ✅ Single Suspense - wszystko ładuje się razem
<Suspense fallback={<PageSkeleton />}>
  <PageHeader />
  <DataComponent />
</Suspense>
```

---

### Problem 3: Conditional queries

**Problem:** `enabled` option nie działa z useSuspenseQuery

**Rozwiązanie:**
```typescript
// ❌ useSuspenseQuery z enabled nie ma sensu
const { data } = useSuspenseQuery({
  queryKey: ['data', id],
  queryFn: () => fetchData(id),
  enabled: !!id, // ← Nie używaj enabled
});

// ✅ Conditional rendering z Suspense
{id ? (
  <Suspense fallback={<Skeleton />}>
    <DataComponent id={id} />
  </Suspense>
) : (
  <EmptyState />
)}

// Wewnątrz DataComponent:
const { data } = useSuspenseQuery({
  queryKey: ['data', id],
  queryFn: () => fetchData(id),
  // Brak enabled - id zawsze istnieje w tym komponencie
});
```

---

## 📊 Plan Migracji

### Faza 1: Infrastruktura (2h)

- [ ] Utworzyć ErrorBoundary component
- [ ] Utworzyć page skeletons (DeliveriesPageSkeleton, DashboardPageSkeleton)
- [ ] Dodać do `components/loaders/`

### Faza 2: Main pages (4-6h)

- [ ] Migrować DostawyPageContent
- [ ] Migrować DashboardContent
- [ ] Migrować OrdersPage
- [ ] Testy UX (brak layout shift)

### Faza 3: Feature components (2-4h)

- [ ] Migrować WarehouseComponents
- [ ] Migrować GlassComponents
- [ ] Testy funkcjonalności

### Faza 4: Cleanup (1-2h)

- [ ] Usunąć stare loading states
- [ ] Aktualizować dokumentację
- [ ] Code review

---

## ✅ Definition of Done

- [ ] ErrorBoundary component utworzony
- [ ] Page skeletons utworzone
- [ ] Main pages (3) zmigrowane
- [ ] Feature components (5+) zmigrowane
- [ ] Wszystkie testy przechodzą
- [ ] Brak layout shift w UX
- [ ] Bundle size nie wzrósł
- [ ] Dokumentacja zaktualizowana

---

## 🧪 Testing Checklist

### Manual testing:

- [ ] Throttle network (Slow 3G) → skeleton pokazuje się
- [ ] Refresh page → skeleton → content (brak layout shift)
- [ ] Error simulation → ErrorBoundary pokazuje się
- [ ] Multiple queries → ładują się razem

### Automated testing:

```typescript
// Test example
it('renders skeleton while loading', async () => {
  render(
    <QueryClientProvider client={queryClient}>
      <DostawyPageContent />
    </QueryClientProvider>
  );

  // Should show skeleton immediately
  expect(screen.getByTestId('deliveries-skeleton')).toBeInTheDocument();

  // Wait for data
  await waitFor(() => {
    expect(screen.getByTestId('delivery-calendar')).toBeInTheDocument();
  });

  // Skeleton should be gone
  expect(screen.queryByTestId('deliveries-skeleton')).not.toBeInTheDocument();
});
```

---

## 📚 Referencje

- **TanStack Query Docs:** [useSuspenseQuery](https://tanstack.com/query/latest/docs/react/guides/suspense)
- **React Docs:** [Suspense](https://react.dev/reference/react/Suspense)
- **Frontend Guidelines:** `docs/.claude/skills/frontend-dev-guidelines/resources/data-fetching.md`
- **Complete Examples:** `docs/.claude/skills/frontend-dev-guidelines/resources/complete-examples.md`

---

**Status:** 📝 GUIDE COMPLETE
**Next step:** Implementacja według planu
**Estimated total time:** 8-16h
