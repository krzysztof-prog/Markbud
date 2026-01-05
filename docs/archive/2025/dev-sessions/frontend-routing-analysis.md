# Frontend Routing Analysis - AKROBUD

**Data:** 2025-11-28
**Framework:** Next.js 14 App Router
**Status:** ✅ Działający routing, ⚠️ Potrzebuje refaktoryzacji

---

## 📋 STRUKTURA ROUTINGU

### App Router File Structure:

```
apps/web/src/app/
├── layout.tsx                              (31 linii) - Root layout
├── providers.tsx                           - React Query + Toaster
├── page.tsx                               (28 linii) ✅ ZREFAKTORYZOWANE
│
├── dostawy/
│   └── page.tsx                          (1166 linii) ⚠️ NAJWIĘKSZY PLIK
│
├── magazyn/
│   ├── page.tsx                           (88 linii) - Overview
│   ├── akrobud/
│   │   └── page.tsx                      (699 linii) ⚠️ DUŻY
│   ├── profile-na-dostawy/
│   │   └── page.tsx                       (31 linii)
│   ├── pvc/
│   │   └── page.tsx                       (46 linii)
│   └── okuc/
│       └── page.tsx                      (313 linii)
│
├── zestawienia/
│   ├── page.tsx                          (181 linii)
│   └── zlecenia/
│       └── page.tsx                      (818 linii) ⚠️ DUŻY
│
├── importy/
│   └── page.tsx                          (687 linii) ⚠️ DUŻY
│
├── archiwum/
│   └── page.tsx                          (142 linii)
│
└── ustawienia/
    └── page.tsx                          (880 linii) ⚠️ DUŻY
```

---

## 🗺️ MAPA ROUTÓW

### Publiczne Routes:

| Route | Nazwa | Komponent | Linie | Status |
|-------|-------|-----------|-------|--------|
| `/` | Dashboard | `page.tsx` | 28 | ✅ Zrefaktoryzowane |
| `/dostawy` | Dostawy | `dostawy/page.tsx` | 1166 | ⚠️ Do refaktoryzacji |
| `/magazyn` | Magazyn Overview | `magazyn/page.tsx` | 88 | 🟡 Do refaktoryzacji |
| `/magazyn/akrobud` | Magazyn Akrobud | `magazyn/akrobud/page.tsx` | 699 | ⚠️ Do refaktoryzacji |
| `/magazyn/profile-na-dostawy` | Profile na dostawy | `magazyn/profile-na-dostawy/page.tsx` | 31 | 🟢 OK |
| `/magazyn/pvc` | Magazyn PVC | `magazyn/pvc/page.tsx` | 46 | 🟢 OK |
| `/magazyn/okuc` | Magazyn Okuć | `magazyn/okuc/page.tsx` | 313 | 🟡 Do refaktoryzacji |
| `/zestawienia` | Zestawienie miesięczne | `zestawienia/page.tsx` | 181 | 🟡 Do refaktoryzacji |
| `/zestawienia/zlecenia` | Zestawienie zleceń | `zestawienia/zlecenia/page.tsx` | 818 | ⚠️ Do refaktoryzacji |
| `/importy` | Importy | `importy/page.tsx` | 687 | ⚠️ Do refaktoryzacji |
| `/archiwum` | Archiwum | `archiwum/page.tsx` | 142 | 🟡 Do refaktoryzacji |
| `/ustawienia` | Ustawienia | `ustawienia/page.tsx` | 880 | ⚠️ Do refaktoryzacji |

**Total routes:** 12

---

## 📊 STATYSTYKI ROZMIARU

### Rozmiary page.tsx files:

```
1166 linii - dostawy/page.tsx           ⚠️ KRYTYCZNY (1166L!)
 880 linii - ustawienia/page.tsx        ⚠️ BARDZO DUŻY
 818 linii - zestawienia/zlecenia/...   ⚠️ BARDZO DUŻY
 699 linii - magazyn/akrobud/page.tsx   ⚠️ DUŻY
 687 linii - importy/page.tsx           ⚠️ DUŻY
 313 linii - magazyn/okuc/page.tsx      🟡 ŚREDNI
 181 linii - zestawienia/page.tsx       🟡 ŚREDNI
 142 linii - archiwum/page.tsx          🟡 ŚREDNI
  88 linii - magazyn/page.tsx           🟢 OK
  46 linii - magazyn/pvc/page.tsx       🟢 OK
  31 linii - magazyn/profile-na-dostawy/page.tsx  🟢 OK
  28 linii - page.tsx (dashboard)       ✅ WZOROWY (zrefaktoryzowany!)
```

### Statystyki:

- **Średnia wielkość:** 423 linii
- **Największy plik:** 1166 linii (dostawy)
- **Najmniejszy plik:** 28 linii (dashboard - po refaktoryzacji!)
- **Pliki >500 linii:** 5 (42%)
- **Pliki <100 linii:** 4 (33%)

---

## 🎯 NAWIGACJA W APLIKACJI

### Sidebar Navigation (z `components/layout/sidebar.tsx`):

```typescript
const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard
  },
  {
    name: 'Magazyn',
    href: '/magazyn',
    icon: Package,
    subItems: [
      { name: 'Magazyn Akrobud', href: '/magazyn/akrobud', icon: Warehouse },
      { name: 'Profile na dostawy', href: '/magazyn/profile-na-dostawy', icon: Package },
      { name: 'Magazyn PVC', href: '/magazyn/pvc', icon: Box },
      { name: 'Magazyn Okuć', href: '/magazyn/okuc', icon: Lock },
    ]
  },
  { name: 'Dostawy', href: '/dostawy', icon: Truck },
  { name: 'Zestawienie miesięczne', href: '/zestawienia', icon: FileText },
  { name: 'Zestawienie zleceń', href: '/zestawienia/zlecenia', icon: FileText },
  { name: 'Importy', href: '/importy', icon: FolderInput },
  { name: 'Archiwum', href: '/archiwum', icon: Archive },
  { name: 'Ustawienia', href: '/ustawienia', icon: Settings },
];
```

**Features:**
- ✅ Collapsible sidebar (mobile responsive)
- ✅ Active route highlighting
- ✅ Nested menu items (Magazyn)
- ✅ Icons dla każdej sekcji
- ✅ Mobile menu z overlay

---

## 🏗️ LAYOUT STRUCTURE

### Root Layout (`app/layout.tsx`):

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto bg-slate-50 md:ml-0">
                {children}
              </main>
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

**Features:**
- ✅ ErrorBoundary na top level
- ✅ Providers (React Query + Toaster)
- ✅ Responsive layout (flex)
- ✅ Overflow handling
- ✅ Polish language (`lang="pl"`)

---

## 📝 PROVIDERS SETUP

### `app/providers.tsx`:

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minuty
            gcTime: 10 * 60 * 1000,   // 10 minut
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
```

**Features:**
- ✅ React Query setup (TanStack Query)
- ✅ Sensible defaults (2min staleTime, 10min gcTime)
- ✅ Toast notifications (Shadcn UI)
- ✅ No refetch on window focus (better UX)

---

## 🔍 ANALIZA PROBLEMATYCZNYCH STRON

### 1. `/dostawy` (1166 linii) - **NAJWIĘKSZY PROBLEM** ⚠️

**Problemy:**
- ❌ 1166 linii w jednym pliku
- ❌ 14+ useState hooks
- ❌ 3+ useQuery hooks
- ❌ 5+ useMutation hooks
- ❌ Complex drag & drop logic (dnd-kit)
- ❌ Calendar logic (weeks, months, working days)
- ❌ Multiple dialogi (tworzenie, usuwanie, items)
- ❌ Inline types (interface Delivery w środku pliku)

**Co zawiera:**
- Kalendarz dostaw (200+ linii)
- Drag & Drop components (300+ linii inline)
- Unassigned orders list (100+ linii)
- Dialogi: NewDelivery, DeleteConfirm, AddItem, Complete (200+ linii)
- Mutations: create, delete, remove order, add order, add item (200+ linii)
- Working days & holidays logic (100+ linii)

**Rekomendacja:**
- Wydzielić do `features/deliveries/`
- Podzielić na komponenty (DeliveryCalendar, DragDropComponents, Dialogs)
- Wydzielić hooks (useDeliveryDragDrop, useDeliveryMutations)
- Wydzielić helpers (workingDaysHelpers, dateHelpers) ✅ (już zrobione)

---

### 2. `/ustawienia` (880 linii) - **BARDZO DUŻY** ⚠️

**Problemy:**
- ❌ 880 linii w jednym pliku
- ❌ Multiple sekcje w jednym komponencie:
  - Profile settings
  - Colors settings
  - Working days settings
  - Okuc settings
- ❌ Multiple dialogi i formularze
- ❌ Complex state management

**Co zawiera:**
- Profile management (create, edit, delete) - 200+ linii
- Colors management (RAL codes) - 200+ linii
- Working days calendar - 200+ linii
- Okuc settings - 200+ linii

**Rekomendacja:**
- Wydzielić do `features/settings/components/`
- Podzielić na komponenty:
  - ProfilesSettings.tsx
  - ColorsSettings.tsx
  - WorkingDaysSettings.tsx
  - OkucSettings.tsx

---

### 3. `/zestawienia/zlecenia` (818 linii) - **BARDZO DUŻY** ⚠️

**Problemy:**
- ❌ 818 linii w jednym pliku
- ❌ Complex table logic
- ❌ Filtering & sorting
- ❌ Multiple columns & calculations

**Rekomendacja:**
- Wydzielić do `features/orders/components/OrdersTable.tsx`
- Użyć TanStack Table dla lepszej struktury
- Wydzielić helpers dla calculations

---

### 4. `/magazyn/akrobud` (699 linii) - **DUŻY** ⚠️

**Problemy:**
- ❌ 699 linii w jednym pliku
- ❌ Complex warehouse logic
- ❌ Color tabs (multiple colors)
- ❌ Monthly updates form
- ❌ Stock calculations

**Rekomendacja:**
- Wydzielić do `features/warehouse/components/`
- Podzielić na komponenty:
  - WarehouseTable.tsx
  - ColorTabs.tsx
  - MonthlyUpdateForm.tsx
  - StockCalculations.tsx

---

### 5. `/importy` (687 linii) - **DUŻY** ⚠️

**Problemy:**
- ❌ 687 linii w jednym pliku
- ❌ File upload logic
- ❌ Preview modal
- ❌ Import approval flow
- ❌ Multiple file types handling

**Rekomendacja:**
- Wydzielić do `features/imports/components/`
- Podzielić na komponenty:
  - ImportsList.tsx
  - ImportUpload.tsx
  - ImportPreviewModal.tsx
  - ImportApprovalFlow.tsx

---

## ✅ DOBRE PRAKTYKI ZAOBSERWOWANE

### 1. Next.js App Router Usage ✅
- Używa Next.js 14 App Router (nowoczesny routing)
- File-based routing (czytelne URL → file mapping)
- Nested routes (magazyn/akrobud, zestawienia/zlecenia)

### 2. Layout Separation ✅
- Root layout z ErrorBoundary i Providers
- Sidebar component wydzielony
- Responsive design

### 3. React Query Setup ✅
- Sensible defaults (staleTime, gcTime)
- QueryClientProvider na top level
- No refetch on window focus

### 4. TypeScript ✅
- `Metadata` export dla SEO
- Typed navigation items
- Type safety w komponencie Sidebar

---

## ⚠️ PROBLEMY DO NAPRAWIENIA

### 1. Brak Lazy Loading ⚠️
**Problem:** Wszystkie strony ładują się synchronicznie

**Rozwiązanie:**
```typescript
// app/dostawy/page.tsx
import { lazy, Suspense } from 'react';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

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

---

### 2. Brak Error Boundaries per-route ⚠️
**Problem:** Tylko global ErrorBoundary w layout

**Rozwiązanie:** Dodać `error.tsx` dla każdej route:
```typescript
// app/dostawy/error.tsx
'use client';

export default function DostawyError({ error, reset }: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h2>Błąd ładowania dostaw</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Spróbuj ponownie</button>
    </div>
  );
}
```

---

### 3. Brak Loading States per-route ⚠️
**Problem:** Brak `loading.tsx` dla długo ładujących się stron

**Rozwiązanie:** Dodać `loading.tsx`:
```typescript
// app/dostawy/loading.tsx
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { Header } from '@/components/layout/header';

export default function DostawyLoading() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Dostawy" />
      <TableSkeleton />
    </div>
  );
}
```

---

### 4. Brak Nested Layouts ⚠️
**Problem:** Wspólne elementy (header, breadcrumbs) duplikowane w każdej stronie

**Rozwiązanie:** Dodać layout dla magazyn:
```typescript
// app/magazyn/layout.tsx
import { Header } from '@/components/layout/header';
import { Breadcrumb } from '@/components/ui/breadcrumb';

export default function MagazynLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <Header title="Magazyn" />
      <Breadcrumb />
      {children}
    </div>
  );
}
```

---

## 🎯 PLAN REFAKTORYZACJI ROUTINGU

### Priorytet 1: Dodaj brakujące Next.js files ⚠️

Dla każdej głównej route (`/dostawy`, `/magazyn`, `/importy`, etc.):

1. **loading.tsx** - Loading state
```typescript
export default function Loading() {
  return <Skeleton />;
}
```

2. **error.tsx** - Error boundary
```typescript
'use client';
export default function Error({ error, reset }) {
  return <ErrorUI error={error} reset={reset} />;
}
```

3. **layout.tsx** (opcjonalnie) - Shared layout
```typescript
export default function Layout({ children }) {
  return <FeatureLayout>{children}</FeatureLayout>;
}
```

---

### Priorytet 2: Refaktoryzuj duże page.tsx files 🔥

**Kolejność według rozmiaru:**

1. ✅ **Dashboard (28L)** - DONE! (było 245L)
2. ⚠️ **Dostawy (1166L)** - Infrastructure gotowa, komponenty TODO
3. ⚠️ **Ustawienia (880L)** - TODO
4. ⚠️ **Zestawienia/Zlecenia (818L)** - TODO
5. ⚠️ **Magazyn/Akrobud (699L)** - TODO
6. ⚠️ **Importy (687L)** - TODO

**Dla każdego:**
- Przenieś do `features/{feature-name}/`
- Rozbij na mniejsze komponenty (<200L każdy)
- Użyj useSuspenseQuery
- Lazy load ciężkie komponenty

---

### Priorytet 3: Dodaj Lazy Loading 🚀

**Obecne (wszystkie sync):**
```typescript
// ❌ Wszystko ładuje się synchronicznie
export default function DostawyPage() {
  return <HugeComponent />;  // 1166 linii!
}
```

**Docelowe (lazy):**
```typescript
// ✅ Lazy loading + code splitting
import { lazy, Suspense } from 'react';

const DeliveriesContent = lazy(() => import('@/features/deliveries'));

export default function DostawyPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DeliveriesContent />
    </Suspense>
  );
}
```

**Benefit:** -30-40% initial bundle size

---

## 📈 OCZEKIWANE REZULTATY

### Po pełnej refaktoryzacji:

| Metryka | Przed | Po | Zmiana |
|---------|-------|-----|---------|
| **Największy page.tsx** | 1166L | <100L | -91% |
| **Średnia wielkość** | 423L | <80L | -81% |
| **Pliki >500L** | 5 (42%) | 0 (0%) | -100% |
| **Lazy loaded routes** | 0 | 12 | +100% |
| **Error boundaries** | 1 (global) | 13 (per-route) | +1200% |
| **Loading states** | 0 | 12 | +∞ |
| **Initial bundle** | ~2MB | ~1.4MB | -30% |

---

## 🏆 REKOMENDACJE

### Immediate Actions (Tydzień 1):
1. ✅ Dashboard - DONE!
2. ⚠️ Dodaj `loading.tsx` i `error.tsx` dla wszystkich routes
3. ⚠️ Refaktoryzuj `/magazyn/profile-na-dostawy` (31L - łatwy start)
4. ⚠️ Refaktoryzuj `/magazyn/pvc` (46L - łatwy start)

### Short Term (Tydzień 2-4):
5. ⚠️ Refaktoryzuj `/archiwum` (142L - średnia złożoność)
6. ⚠️ Refaktoryzuj `/zestawienia` (181L - średnia złożoność)
7. ⚠️ Refaktoryzuj `/magazyn` (88L - overview)
8. ⚠️ Refaktoryzuj `/magazyn/okuc` (313L - średnia)

### Medium Term (Miesiąc 2):
9. ⚠️ Refaktoryzuj `/importy` (687L - duża)
10. ⚠️ Refaktoryzuj `/magazyn/akrobud` (699L - duża)
11. ⚠️ Refaktoryzuj `/zestawienia/zlecenia` (818L - duża)
12. ⚠️ Refaktoryzuj `/ustawienia` (880L - bardzo duża)

### Long Term (Miesiąc 3):
13. ⚠️ Refaktoryzuj `/dostawy` (1166L - największa, najbardziej złożona)

---

## 📝 WNIOSKI

### ✅ Mocne strony:
- Next.js 14 App Router (nowoczesny)
- File-based routing (czytelne)
- React Query setup (sensible defaults)
- ErrorBoundary na top level
- Responsive sidebar z nested menu

### ⚠️ Do poprawy:
- **Rozmiary page.tsx** (5 plików >500L)
- **Brak lazy loading** (wszystko sync)
- **Brak per-route error boundaries**
- **Brak per-route loading states**
- **Brak nested layouts** (duplikacja kodu)

### 🎯 Najważniejsze zadanie:
**Refaktoryzacja dużych page.tsx files** (łącznie ~5000 linii do przeniesienia do features/)

---

**Status:** ✅ Analiza kompletna
**Następny krok:** Refaktoryzacja według planu (łatwe strony → trudne)
**Priorytet:** `/magazyn/profile-na-dostawy` i `/magazyn/pvc` (quick wins!)
