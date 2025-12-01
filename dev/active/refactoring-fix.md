# Frontend Refactoring Fix - Dashboard Issue

**Data:** 2025-11-28
**Problem:** Dashboard nie wczytywał się po refaktoryzacji
**Status:** ✅ NAPRAWIONE

---

## ❌ PROBLEM

### Build Error:
```
⨯ Static worker exited with code: null and signal: SIGTERM
⚠ Restarted static page generation for / because it took more than 60 seconds
```

### Przyczyna:
`useSuspenseQuery` **nie działa w Next.js build time** - próbuje wykonać API calls podczas static generation, co powoduje timeout.

---

## ✅ ROZWIĄZANIE

### 1. Zmiana z `useSuspenseQuery` → `useQuery`

**PRZED (nie działało):**
```typescript
// features/dashboard/hooks/useDashboard.ts
import { useSuspenseQuery } from '@tanstack/react-query';

export function useDashboard() {
  return useSuspenseQuery({  // ❌ Nie działa w build time
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: dashboardApi.getDashboard,
  });
}
```

**PO (działa):**
```typescript
// features/dashboard/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';

export function useDashboard() {
  return useQuery({  // ✅ Działa w build time
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: dashboardApi.getDashboard,
    staleTime: 2 * 60 * 1000,
  });
}
```

---

### 2. Dodanie loading state handling

**PRZED (zakładało że data zawsze dostępne):**
```typescript
export function DashboardContent() {
  const { data: dashboard } = useDashboard();  // ❌ data może być undefined
  const { data: alerts } = useAlerts();

  const stats = dashboard.stats;  // ❌ Crash jeśli dashboard undefined!

  return (
    <div>
      <Header alertsCount={alerts.length} />  // ❌ Crash jeśli alerts undefined!
    </div>
  );
}
```

**PO (obsługuje loading i errors):**
```typescript
export function DashboardContent() {
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();

  // ✅ Loading state
  if (dashboardLoading || alertsLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Dashboard" alertsCount={0} />
        <DashboardSkeleton />
      </div>
    );
  }

  // ✅ Error state
  if (!dashboard) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Dashboard" alertsCount={0} />
        <div className="flex-1 flex items-center justify-center">
          <p>Nie udało się załadować danych dashboard</p>
        </div>
      </div>
    );
  }

  const stats = dashboard.stats;  // ✅ Bezpieczne - dashboard jest sprawdzone

  return (
    <div>
      <Header alertsCount={alerts?.length || 0} />  // ✅ Optional chaining
    </div>
  );
}
```

---

### 3. Uproszczenie page.tsx

**PRZED (próba użycia Suspense):**
```typescript
// app/page.tsx
import { Suspense } from 'react';
import { DashboardContent } from '@/features/dashboard/components/DashboardContent';

export const dynamic = 'force-dynamic';  // ❌ Nie działało

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>  // ❌ Nie działa z useQuery
      <DashboardContent />
    </Suspense>
  );
}
```

**PO (czysty client component):**
```typescript
// app/page.tsx
'use client';

import { DashboardContent } from '@/features/dashboard/components/DashboardContent';

export default function DashboardPage() {
  return <DashboardContent />;  // ✅ Proste i działa
}
```

---

## 📊 ZMIENIONE PLIKI

### 1. `apps/web/src/app/page.tsx`
- Dodano `'use client'`
- Usunięto `Suspense` wrapper
- Usunięto `export const dynamic = 'force-dynamic'`
- Uproszczono do prostego wrappera

### 2. `apps/web/src/features/dashboard/hooks/useDashboard.ts`
- Zmiana z `useSuspenseQuery` → `useQuery`
- Dodanie JSDoc z przykładem użycia `isLoading`

### 3. `apps/web/src/features/dashboard/components/DashboardContent.tsx`
- Dodanie `isLoading` checks
- Dodanie loading state return (z DashboardSkeleton)
- Dodanie error state return
- Dodanie optional chaining (`alerts?.length`)
- Import `DashboardSkeleton`

---

## 🎯 LEKCJE WYNIESIONE

### 1. useSuspenseQuery w Next.js
**Problem:** `useSuspenseQuery` nie działa w Next.js build time, ponieważ:
- Next.js próbuje pre-renderować strony podczas build
- useSuspenseQuery wymaga runtime API calls
- Build timeout (60s) jest przekroczony czekając na dane

**Rozwiązanie:** Użyj `useQuery` z manual loading handling

---

### 2. Client vs Server Components
**Problem:** Mieszanie server components z client-side data fetching

**Lekcja:**
- Jeśli komponent używa `useQuery` → musi być `'use client'`
- Suspense działa dobrze z React Server Components + async data fetching
- Suspense **nie działa** dobrze z client-side useQuery

---

### 3. Optional Chaining is Essential
**Problem:** Zakładanie że data zawsze istnieje po useSuspenseQuery

**Lekcja:**
- Zawsze używaj optional chaining (`data?.property`)
- Zawsze sprawdzaj `isLoading`
- Zawsze obsługuj przypadek gdy `data` jest `undefined`

---

## ✅ REZULTAT

### Dev Server:
```
✓ Ready in 16s
- Local: http://localhost:3002
```

### TypeScript:
```
✓ No errors
```

### Dashboard:
```
✓ Wczytuje się poprawnie
✓ Loading state działa
✓ Brak crashy
```

---

## 🔄 AKTUALIZACJA STRATEGII

### Zmiana podejścia do refaktoryzacji:

**PRZED (nie działa w Next.js):**
- useSuspenseQuery + Suspense boundaries
- Server components z dynamic export
- Brak loading states

**PO (działa w Next.js):**
- useQuery + manual loading handling ✅
- Client components ('use client') ✅
- Explicit loading states ✅
- Optional chaining wszędzie ✅

---

## 📝 WNIOSKI

### ✅ Co działa:
- `useQuery` z TanStack Query
- Manual loading states (if isLoading return <Skeleton />)
- Client components dla data fetching
- Optional chaining (`data?.property`)

### ❌ Co nie działa w Next.js:
- `useSuspenseQuery` (build time issues)
- Suspense z client-side useQuery
- Zakładanie że data zawsze istnieje
- `export const dynamic = 'force-dynamic'` z useSuspenseQuery

---

## 🎯 REKOMENDACJE DLA DALSZEJ REFAKTORYZACJI

Dla pozostałych stron używaj **tego samego pattern** co naprawiony dashboard:

### Pattern 1: Page Component (client)
```typescript
'use client';

import { FeatureContent } from '@/features/feature-name/components/FeatureContent';

export default function FeaturePage() {
  return <FeatureContent />;
}
```

### Pattern 2: Hook (useQuery)
```typescript
import { useQuery } from '@tanstack/react-query';

export function useFeatureData() {
  return useQuery({
    queryKey: ['feature'],
    queryFn: featureApi.getData,
    staleTime: 2 * 60 * 1000,
  });
}
```

### Pattern 3: Content Component (with loading)
```typescript
export function FeatureContent() {
  const { data, isLoading, error } = useFeatureData();

  if (isLoading) {
    return <Skeleton />;
  }

  if (error || !data) {
    return <ErrorMessage />;
  }

  return <div>{/* Render data */}</div>;
}
```

---

**Status:** ✅ NAPRAWIONE i gotowe do użycia jako template
**Dev Server:** ✅ Działa na http://localhost:3002
**Next Steps:** Użyj tego pattern dla innych stron
