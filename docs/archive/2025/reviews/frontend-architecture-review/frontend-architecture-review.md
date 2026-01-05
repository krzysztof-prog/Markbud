# Frontend Architecture Review - AKROBUD

**Last Updated:** 2025-12-30

## Executive Summary

Przegląd architektury frontendu w `apps/web/src` ujawnia **dobrze zorganizowaną strukturę feature-based** z kilkoma **krytycznymi problemami** wymagającymi natychmiastowej uwagi oraz szereg możliwości optymalizacji. System wykorzystuje nowoczesny stack (Next.js 15, React Query, TypeScript), ale wymaga konsekwentnego stosowania wzorców i usunięcia duplikacji.

### Ocena ogólna: 7/10

**Mocne strony:**
- Przejrzysta struktura feature-based w `/features`
- Poprawne użycie React Query dla zarządzania stanem serwerowym
- Solidna konfiguracja TypeScript strict mode
- Dobre wykorzystanie dynamic imports w większości przypadków
- Skuteczny WebSocket real-time sync

**Słabe strony:**
- **KRYTYCZNE:** Duplikacja komponentów modali i tabel
- **WAŻNE:** Niekonwencjonalne umiejscowienie hooków i komponentów w `/app`
- Masywny plik `api.ts` (884 linii) duplikujący API z features
- Brak konsekwencji w organizacji komponentów
- Niewykorzystany potencjał cachowania React Query

---

## Critical Issues (MUST FIX)

### 1. DUPLIKACJA KOMPONENTÓW MODALI

**Lokalizacja:** `apps/web/src/components/orders/`

```
OrderVariantConflictModal.tsx     (15,397 bajtów)
order-variant-conflict-modal.tsx  (7,270 bajtów)  ← DUPLIKAT
```

**Problem:**
Dwa różne komponenty o **identycznej funkcjonalności** (konflikt wariantów zlecenia), różniące się tylko nazwą pliku i implementacją. To prowadzi do:
- Niejasności, którego komponentu używać
- Potencjalnych bugów przy modyfikacjach
- Zwiększonego rozmiaru bundle
- Trudności w maintenance

**Dowód duplikacji:**
```bash
$ diff -u OrderVariantConflictModal.tsx order-variant-conflict-modal.tsx | head -30
--- OrderVariantConflictModal.tsx
+++ order-variant-conflict-modal.tsx
@@ -4,431 +4,201 @@
 import {
   Dialog,
   DialogContent,
-  DialogDescription,
-  DialogFooter,
   DialogHeader,
   DialogTitle,
+  DialogDescription,
+  DialogFooter,
 } from '@/components/ui/dialog';
```

**Zalecana akcja:**
1. Określić, która wersja jest używana w kodzie
2. Usunąć nieużywaną wersję
3. Zmienić nazwę pozostałej na kebab-case (`order-variant-conflict-modal.tsx`)
4. Sprawdzić wszystkie importy i zaktualizować

**Sprawdź użycie:**
```bash
grep -r "OrderVariantConflictModal\|order-variant-conflict-modal" apps/web/src/app
```

---

### 2. NADMIERNA DUPLIKACJA KOMPONENTÓW TABEL

**Lokalizacja:** `apps/web/src/components/tables/`

```
DataTable.tsx          (2,862 bajty)
SimpleTable.tsx        (2,891 bajty)
StickyTable.tsx        (4,134 bajty)
Table.tsx              (4,881 bajty)  ← "Unified" component
VirtualizedTable.tsx   (4,586 bajty)
```

**Problem:**
Pięć różnych komponentów tabel z częściowo pokrywającą się funkcjonalnością. `index.tsx` wskazuje, że `Table.tsx` ma być "unified" komponentem, ale legacy komponenty nadal istnieją:

```typescript
// apps/web/src/components/tables/index.tsx
// Unified table component (recommended)
export { Table } from './Table';

// Legacy components (deprecated - use Table instead)
export { DataTable } from './DataTable';
export { StickyTable } from './StickyTable';
export { SimpleTable } from './SimpleTable';
```

**Analiza użycia:**
Trzeba sprawdzić, czy legacy komponenty są nadal używane w kodzie produkcyjnym.

**Zalecana akcja:**
1. Przeprowadzić audit użycia każdego komponentu tabeli
2. Zmigrować wszystkie użycia do `Table.tsx`
3. Usunąć `DataTable`, `SimpleTable`, `StickyTable` jeśli nie są używane
4. Rozważyć zachowanie `VirtualizedTable` tylko jeśli jest niezbędny dla dużych zbiorów danych
5. Zaktualizować dokumentację w `docs/guides/table-component-migration.md`

---

### 3. MASYWNY PLIK api.ts - CENTRALIZACJA VS FEATURE-BASED

**Lokalizacja:** `apps/web/src/lib/api.ts` (884 linie)

**Problem:**
Istnieje **duża duplikacja** między centralnym `api.ts` a feature-specific API w `/features/*/api/*.ts`:

```typescript
// apps/web/src/lib/api.ts (884 linii)
export const ordersApi = { ... }
export const deliveriesApi = { ... }
export const warehouseApi = { ... }
// ... 15+ więcej API objects

// apps/web/src/features/orders/api/ordersApi.ts (102 linie)
export const ordersApi = { ... }  // ← DUPLIKAT FUNKCJONALNOŚCI

// apps/web/src/features/deliveries/api/deliveriesApi.ts (118 linii)
export const deliveriesApi = { ... }  // ← DUPLIKAT FUNKCJONALNOŚCI
```

**Analiza:**
- `api.ts`: 884 linie zawierające **wszystkie** API endpoints
- Features API files: łącznie ~710 linii zawierających **podzbiory** tych samych endpoints
- Prowadzi to do **two sources of truth** dla API

**To narusza zasadę DRY i feature-based architecture.**

**Przykład konfliktu:**
```typescript
// W apps/web/src/lib/api.ts
export const ordersApi = {
  getAll: (params?) => fetchApi<Order[]>('/api/orders...'),
  getById: (id) => fetchApi<Order>(`/api/orders/${id}`),
  // ... 10+ więcej metod
}

// W apps/web/src/features/orders/api/ordersApi.ts
export const ordersApi = {
  getAll: (params?) => fetchApi<Order[]>('/api/orders...'),
  getById: (id) => fetchApi<Order>(`/api/orders/${id}`),
  // ... te same metody
}
```

**Konsekwencje:**
- Zmiana endpointu wymaga aktualizacji w **dwóch miejscach**
- Niejasne, którego API używać (central vs feature)
- Zwiększony rozmiar bundle (duplikacja kodu)
- Trudniejszy refactoring

**Zalecane rozwiązanie - Opcja A (Preferowana):**

**Usunąć centralne API, używać tylko feature-based:**

```typescript
// ZAMIAST importu z centralnego api.ts
import { ordersApi } from '@/lib/api';

// UŻYJ feature-based API
import { ordersApi } from '@/features/orders/api/ordersApi';
```

**Korzyści:**
- Jedna źródło prawdy dla każdego API
- Lepsze code splitting (Next.js zaimportuje tylko potrzebne API)
- Zgodne z feature-based architecture
- Łatwiejszy refactoring per-feature

**Migracja:**
1. Znaleźć wszystkie importy z `@/lib/api`
2. Zastąpić importami z odpowiednich features
3. Usunąć duplikaty z `api.ts`
4. Zachować w `api.ts` tylko shared utilities (jeśli są)

**Zalecane rozwiązanie - Opcja B (Kompromis):**

**Re-exportuj z centralnego API:**

```typescript
// apps/web/src/lib/api.ts
// Re-export feature APIs (single source of truth)
export { ordersApi } from '@/features/orders/api/ordersApi';
export { deliveriesApi } from '@/features/deliveries/api/deliveriesApi';
export { warehouseApi } from '@/features/warehouse/api/warehouseApi';
// ... etc

// Keep only shared utilities here
export { fetchApi, uploadFile, fetchBlob, API_URL } from './api-client';
```

**Korzyści:**
- Zachowana wygoda importu z jednego miejsca
- Eliminacja duplikacji kodu
- Features jako single source of truth
- Możliwość stopniowej migracji

---

## Important Improvements (SHOULD FIX)

### 4. HOOKI I KOMPONENTY W /app ZAMIAST /features

**Problem:**
Logika biznesowa (hooks, mutations) znajduje się w `apps/web/src/app/*/hooks/` zamiast w `apps/web/src/features/*/hooks/`.

**Przykłady:**

```
apps/web/src/app/importy/hooks/useImportMutations.ts
apps/web/src/app/ustawienia/hooks/useSettingsMutations.ts
apps/web/src/app/dostawy/components/DeliveriesListView.tsx
```

**To narusza feature-based architecture:**

```
✅ POPRAWNE:
apps/web/src/features/imports/
├── api/importsApi.ts
├── hooks/
│   ├── useImports.ts
│   └── useImportMutations.ts  ← tutaj powinny być
└── components/
    └── ImportsList.tsx

❌ OBECNE (NIEPOPRAWNE):
apps/web/src/app/importy/
├── hooks/
│   └── useImportMutations.ts  ← źle, powinno być w features
├── components/
│   ├── CsvImportPanel.tsx     ← źle, powinno być w features
│   ├── PdfImportPanel.tsx
│   └── ImportPreviewCard.tsx
└── page.tsx                    ← OK, to route

apps/web/src/features/imports/
├── api/importsApi.ts           ← OK
└── hooks/useImports.ts         ← niepełne, brakuje mutations
```

**Dlaczego to problem:**

1. **Zmniejsza reusability** - hooks w `/app` są związane z routingiem, trudniej ich użyć gdzie indziej
2. **Narusza separation of concerns** - `/app` powinno zawierać tylko routing i page layouts
3. **Utrudnia testowanie** - logika biznesowa powinna być w features, łatwo testowalna
4. **Niekonsekwentne** - niektóre features mają hooks w `/features`, inne w `/app`

**Przykład niekonsekwencji:**

```typescript
// ✅ Deliveries - DOBRZE (hooks w features)
apps/web/src/features/deliveries/hooks/
├── useDeliveries.ts
└── useDeliveryMutations.ts

// ❌ Imports - ŹLE (hooks w app)
apps/web/src/app/importy/hooks/
└── useImportMutations.ts
// Brakuje w features/imports/hooks/
```

**Zalecana akcja:**

1. Przenieś wszystkie hooks z `/app/*/hooks/` do `/features/*/hooks/`
2. Przenieś domain-specific komponenty z `/app/*/components/` do `/features/*/components/`
3. W `/app/*` zachowaj tylko:
   - `page.tsx` (route component)
   - Page-specific layout components jeśli konieczne
   - Lazy loading wrappers

**Plan migracji:**

```typescript
// KROK 1: Przenieś hooks
apps/web/src/app/importy/hooks/useImportMutations.ts
→ apps/web/src/features/imports/hooks/useImportMutations.ts

// KROK 2: Zaktualizuj importy w page.tsx
// apps/web/src/app/importy/page.tsx
- import { useImportMutations } from './hooks/useImportMutations';
+ import { useImportMutations } from '@/features/imports/hooks/useImportMutations';

// KROK 3: Usuń stary plik
```

---

### 5. DYNAMICZNE IMPORTY - DOBRE, ALE NIEPEŁNE

**Obecny stan: DOBRY**

Większość pages używa poprawnego wzorca Next.js 15:

```typescript
// ✅ apps/web/src/app/page.tsx
const DashboardContent = dynamic(
  () => import('@/features/dashboard/components/DashboardContent').then((mod) => mod.default),
  {
    loading: () => <DashboardSkeleton />,
    ssr: false,
  }
);
```

**Problem: Niepełna implementacja**

Tylko **5 z ~20 pages** używa dynamic imports:
- `page.tsx` (dashboard)
- `dostawy/page.tsx`
- `magazyn/akrobud/szczegoly/page.tsx`
- `magazyn/dostawy-schuco/page.tsx`
- `dashboard-wrapper.tsx`

**Pozostałe pages (15+) ładują komponenty synchronicznie:**

```typescript
// ❌ apps/web/src/app/importy/page.tsx
// Brak dynamic import - wszystko załadowane synchronicznie
import { FolderImportSection } from './components';
import { useImportMutations } from './hooks/useImportMutations';

export default function ImportyPage() {
  // Ciężki komponent bez lazy loading
}
```

**Konsekwencje:**
- Większy initial bundle size
- Wolniejsze Time to Interactive (TTI)
- Zmarnowany potencjał code splitting

**Zalecana akcja:**

Dodaj dynamic imports do wszystkich ciężkich pages:

```typescript
// apps/web/src/app/importy/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';

const ImportyPageContent = dynamic(
  () => import('./ImportyPageContent').then((mod) => mod.default),
  {
    loading: () => <TableSkeleton />,
    ssr: false,
  }
);

export default function ImportyPage() {
  return <ImportyPageContent />;
}

// Utwórz ImportyPageContent.tsx z obecną logiką
```

**Priorytetyzuj pages:**
1. `/importy` - duża logika importu, wiele komponentów
2. `/ustawienia` - wiele tabów, masywny kod
3. `/magazyn/*` - ciężkie tabele
4. `/zestawienia/*` - raporty, wykresy

---

### 6. REACT QUERY - DOBRA KONFIGURACJA, ALE NIEOPTYMALNA

**Obecna konfiguracja: SOLIDNA**

```typescript
// apps/web/src/app/providers.tsx
staleTime: 5 * 60 * 1000,      // 5 minut
gcTime: 30 * 60 * 1000,        // 30 minut
refetchOnWindowFocus: false,
refetchOnMount: false,
refetchOnReconnect: true,
```

**Problem 1: Hardcoded query keys**

Liczne miejsca używają hardcoded stringów zamiast query key factories:

```typescript
// ❌ apps/web/src/features/deliveries/hooks/useDeliveryMutations.ts
queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-continuous'] });
queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] });

// ❌ apps/web/src/app/importy/page.tsx
queryKey: ['imports']
queryKey: ['available-folders']
queryKey: ['import-preview', previewId]
```

**Problem z tym podejściem:**
- Łatwo o literówki
- Brak type safety
- Trudniejszy refactoring
- Ryzyko niepoprawnej invalidacji cache

**Rozwiązanie: Query key factories**

```typescript
// apps/web/src/features/imports/hooks/queryKeys.ts
export const importsKeys = {
  all: ['imports'] as const,
  lists: () => [...importsKeys.all, 'list'] as const,
  list: (filters: string) => [...importsKeys.lists(), { filters }] as const,
  details: () => [...importsKeys.all, 'detail'] as const,
  detail: (id: number) => [...importsKeys.details(), id] as const,
  preview: (id: number) => [...importsKeys.all, 'preview', id] as const,
  folders: () => ['available-folders'] as const,
} as const;

// Użycie:
queryKey: importsKeys.preview(previewId)
queryClient.invalidateQueries({ queryKey: importsKeys.all })
```

**Korzyści:**
- Type safety
- Łatwiejsze wyszukiwanie użyć
- Centralizacja query keys
- Hierarchiczna invalidacja

**Problem 2: Brak wykorzystania optimistic updates**

Tylko `deliveries` używa optimistic updates w mutations:

```typescript
// ✅ apps/web/src/features/deliveries/hooks/useDeliveryMutations.ts
onMutate: async (newDelivery) => {
  await queryClient.cancelQueries({ queryKey: [CALENDAR_QUERY_KEY] });
  const previousData = queryClient.getQueryData([CALENDAR_QUERY_KEY]);

  queryClient.setQueryData([CALENDAR_QUERY_KEY], (old) => {
    // ... optimistic update
  });

  return { previousData };
},
```

**Inne features tego nie robią:**

```typescript
// ❌ apps/web/src/app/importy/hooks/useImportMutations.ts
export function useApproveMutation() {
  return useMutation({
    mutationFn: (data) => importsApi.approve(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      // Brak optimistic update - czekamy na pełny refetch
    },
  });
}
```

**Konsekwencje:**
- Wolniejsze UX (czekanie na serwer)
- Brak instant feedback
- Niepotrzebne loading states

**Zalecana akcja:**
Dodaj optimistic updates do wszystkich mutations, które modyfikują listy:
- Imports approve/reject
- Settings CRUD
- Warehouse stock updates
- Orders CRUD

---

## Minor Suggestions (NICE TO HAVE)

### 7. WEBSOCKET REAL-TIME SYNC - DOBRZE ZAIMPLEMENTOWANY

**Obecny stan: BARDZO DOBRY**

```typescript
// apps/web/src/hooks/useRealtimeSync.ts
// Solidna implementacja z:
- Automatycznym reconnect
- Heartbeat monitoring
- Query invalidation
- Toast notifications
- Token authentication
```

**Drobne sugestie:**

1. **Ekstrahuj konfigurację WebSocket**

```typescript
// apps/web/src/lib/websocket-config.ts
export const WS_CONFIG = {
  url: process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:4000',
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatTimeout: 35000,
} as const;
```

2. **Dodaj metryki reconnect**

```typescript
// Poinformuj użytkownika o problemach z połączeniem
if (reconnectAttemptsRef.current > 3) {
  showWarningToast(
    'Problemy z połączeniem',
    `Próba ponownego połączenia ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`
  );
}
```

---

### 8. TYPY - SOLIDNA STRUKTURA

**Obecny stan: DOBRY**

```
apps/web/src/types/
├── api.ts
├── color.ts
├── common.ts
├── dashboard.ts
├── delivery.ts
├── import.ts
├── index.ts          ← Re-exports wszystkiego
├── okuc.ts
├── order.ts
├── pallet.ts
├── profile.ts
├── requirement.ts
├── schuco.ts
├── settings.ts
└── warehouse.ts
```

**Zalety:**
- Podział domenowy (per-feature)
- Centralne re-exporty w `index.ts`
- Spójne konwencje nazewnictwa

**Sugestia: Rozważ przeniesienie typów do features**

Dla pełnej feature-based architecture:

```
apps/web/src/features/orders/
├── api/ordersApi.ts
├── hooks/useOrders.ts
├── components/OrderCard.tsx
└── types.ts  ← Typy specyficzne dla orders
```

**Ale zachowaj shared types w `/types`:**

```typescript
// apps/web/src/types/common.ts
export type ID = number | string;
export type Timestamp = string;
export type Status = 'pending' | 'completed' | 'error';
```

**Wybór:** To decyzja architekturalna - obecne podejście (centralne typy) jest również poprawne.

---

### 9. STRUKTURA KOMPONENTÓW - NIESPÓJNA

**Problem:**

Komponenty są rozproszone w trzech lokalizacjach:

1. `apps/web/src/components/` - ogólne, reusable
2. `apps/web/src/features/*/components/` - feature-specific
3. `apps/web/src/app/*/components/` - page-specific (❌ powinno być w features)

**Przykład niespójności:**

```
// Komponenty dla importów są w 3 miejscach:

apps/web/src/components/imports/
└── ImportConflictModal.tsx

apps/web/src/features/imports/
└── (brak components/)  ❌

apps/web/src/app/importy/components/
├── CsvImportPanel.tsx
├── PdfImportPanel.tsx
├── FolderImportSection.tsx
├── ImportPreviewCard.tsx
├── ImportHistoryTable.tsx
└── UploadStatus.tsx
```

**To jest źle zorganizowane:**
- `ImportConflictModal` w `/components/imports/` - pojedynczy komponent
- Wszystkie inne w `/app/importy/components/` - powinny być w features
- Brak niczego w `/features/imports/components/` - gdzie powinna być logika

**Zalecana organizacja:**

```
apps/web/src/features/imports/
├── api/importsApi.ts
├── hooks/
│   ├── useImports.ts
│   └── useImportMutations.ts
└── components/
    ├── CsvImportPanel.tsx
    ├── PdfImportPanel.tsx
    ├── FolderImportSection.tsx
    ├── ImportPreviewCard.tsx
    ├── ImportHistoryTable.tsx
    ├── ImportConflictModal.tsx
    └── UploadStatus.tsx

apps/web/src/app/importy/
└── page.tsx  (tylko routing)
```

---

### 10. API CLIENT - SOLIDNY, DROBNE SUGESTIE

**Obecny stan: BARDZO DOBRY**

```typescript
// apps/web/src/lib/api-client.ts
- Timeout handling (3.5 min)
- Authentication (JWT token)
- Error handling (network, timeout, HTTP)
- File upload support
- Binary download (fetchBlob)
```

**Drobne sugestie:**

1. **Dodaj retry logic dla network errors**

```typescript
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
  retries = 2
): Promise<T> {
  try {
    // ... existing code
  } catch (error) {
    if (retries > 0 && error instanceof TypeError) {
      // Network error - retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchApi<T>(endpoint, options, retries - 1);
    }
    throw error;
  }
}
```

2. **Ekstrahuj timeout do config**

```typescript
// apps/web/src/lib/api-config.ts
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  timeout: 210000, // 3.5 minutes
  maxFileSize: 10 * 1024 * 1024, // 10MB
} as const;
```

---

## Architecture Considerations

### 11. FEATURE-BASED vs PAGE-BASED - HYBRYDOWE PODEJŚCIE

**Obecny stan: MIESZANY**

Projekt częściowo stosuje feature-based architecture, ale nie konsekwentnie.

**Analiza struktury:**

```
✅ DOBRZE - Feature-based:
apps/web/src/features/
├── dashboard/
│   ├── api/dashboardApi.ts
│   ├── hooks/useDashboard.ts
│   └── components/DashboardContent.tsx
├── deliveries/
│   ├── api/deliveriesApi.ts
│   ├── hooks/useDeliveries.ts, useDeliveryMutations.ts
│   └── utils/, helpers/
└── pallets/
    ├── api/palletsApi.ts
    ├── hooks/usePalletOptimization.ts
    └── components/, utils/

❌ ŹLE - Page-based (powinno być w features):
apps/web/src/app/
├── importy/
│   ├── components/  ← 6 komponentów (powinny być w features/imports)
│   └── hooks/       ← useImportMutations (powinien być w features/imports)
├── ustawienia/
│   ├── components/  ← 7 komponentów (powinny być w features/settings)
│   └── hooks/       ← useSettingsMutations (powinien być w features/settings)
└── dostawy/
    └── components/  ← 8 komponentów (powinny być w features/deliveries)
```

**Konsekwencje mieszanego podejścia:**

1. **Trudne wyszukiwanie** - "Gdzie jest logika importów? W `/features` czy `/app`?"
2. **Niespójna reusability** - niektóre features łatwo użyć ponownie, inne nie
3. **Trudniejsze testowanie** - logika w `/app` jest związana z routingiem
4. **Zwiększone coupling** - page-specific components ciężko wyizolować

**Zalecana akcja: Pełna migracja do feature-based**

```
DOCELOWA STRUKTURA:

apps/web/src/
├── app/                          ← TYLKO routing
│   ├── layout.tsx
│   ├── page.tsx                  ← Lazy load z features
│   ├── importy/
│   │   └── page.tsx              ← Lazy load z features/imports
│   └── dostawy/
│       └── page.tsx              ← Lazy load z features/deliveries
│
├── features/                     ← CAŁA logika biznesowa
│   ├── imports/
│   │   ├── api/importsApi.ts
│   │   ├── hooks/
│   │   │   ├── useImports.ts
│   │   │   └── useImportMutations.ts
│   │   └── components/
│   │       ├── CsvImportPanel.tsx
│   │       ├── PdfImportPanel.tsx
│   │       ├── FolderImportSection.tsx
│   │       └── ImportConflictModal.tsx
│   └── deliveries/
│       ├── api/deliveriesApi.ts
│       ├── hooks/
│       ├── components/
│       └── utils/
│
├── components/                   ← TYLKO shared, reusable UI
│   ├── ui/                       ← Shadcn/ui primitives
│   ├── layout/                   ← Header, Sidebar
│   ├── loaders/                  ← Skeletons
│   └── tables/                   ← Generic table components
│
├── hooks/                        ← TYLKO shared hooks
│   ├── useDebounce.ts
│   ├── useFormValidation.ts
│   └── useToast.ts
│
├── lib/                          ← TYLKO utilities
│   ├── api-client.ts
│   ├── utils.ts
│   └── toast-helpers.ts
│
└── types/                        ← Shared types
    ├── common.ts
    └── index.ts
```

**Korzyści pełnej feature-based architektury:**

1. **Łatwiejsze skalowanie** - nowe features są izolowane
2. **Lepsza reusability** - każdy feature to standalone moduł
3. **Prostsze testowanie** - features są niezależne od routingu
4. **Klarowna odpowiedzialność** - `/app` = routing, `/features` = logika
5. **Możliwość wydzielenia features** - w przyszłości łatwo przenieść do monorepo packages

---

## Next Steps

### Priorytetyzacja napraw (według ważności):

#### Faza 1: CRITICAL (tydzień 1)
1. ✅ **Usunąć duplikaty modali** - `OrderVariantConflictModal` vs `order-variant-conflict-modal`
2. ✅ **Audit komponentów tabel** - ustalić, które są używane, usunąć nieużywane
3. ✅ **Rozwiązać duplikację api.ts** - wybrać Opcję A lub B, zaimplementować

#### Faza 2: IMPORTANT (tydzień 2-3)
4. ✅ **Przenieść hooks z /app do /features** - imports, settings, deliveries
5. ✅ **Przenieść komponenty z /app do /features** - page-specific → feature-specific
6. ✅ **Dodać dynamic imports** - do wszystkich ciężkich pages
7. ✅ **Zaimplementować query key factories** - dla type safety

#### Faza 3: NICE TO HAVE (tydzień 4+)
8. ⚠️ **Dodać optimistic updates** - do wszystkich mutations
9. ⚠️ **Rozważyć przeniesienie typów** - do features (opcjonalne)
10. ⚠️ **Dodać monitoring WebSocket** - metryki reconnect

---

## Podsumowanie - Konkretne rekomendacje

### Co zachować (dobre praktyki):
1. ✅ Feature-based structure w `/features` (gdzie istnieje)
2. ✅ React Query configuration i persistence
3. ✅ Dynamic imports w większości pages (poprawny wzorzec Next.js 15)
4. ✅ WebSocket real-time sync
5. ✅ API client z timeout i error handling
6. ✅ TypeScript strict mode

### Co naprawić (krytyczne):
1. ❌ Duplikacja komponentów (modale, tabele)
2. ❌ Duplikacja API (api.ts vs features/*/api)
3. ❌ Hooks i komponenty w /app zamiast /features

### Co ulepszyć (ważne):
1. ⚠️ Konsekwentne stosowanie feature-based architecture
2. ⚠️ Query key factories zamiast hardcoded strings
3. ⚠️ Dynamic imports we wszystkich pages
4. ⚠️ Optimistic updates w mutations

### Metryki sukcesu:
- [ ] Zero duplikacji komponentów
- [ ] Jeden źródło prawdy dla API (features lub re-export)
- [ ] Wszystkie hooks i komponenty domenowe w /features
- [ ] 100% pages używa dynamic imports
- [ ] Type-safe query keys we wszystkich features
- [ ] Bundle size reduction o ~20% (dzięki code splitting)

---

## Ostateczna ocena

**Architektura: 7/10**

Projekt ma **solidne fundamenty** (React Query, TypeScript, WebSocket, Next.js 15), ale cierpi na **niespójności implementacyjne** i **duplikację kodu**. Główne problemy są **łatwe do naprawienia** i nie wymagają dużych refaktorów - głównie przenoszenie plików i usuwanie duplikatów.

**Po naprawie Critical + Important issues, ocena wzrośnie do 9/10.**

**Największy priorytet:** Usunąć duplikacje i przenieść logikę z `/app` do `/features` - to fundamentalna zmiana, która ułatwi wszystkie przyszłe rozwoje.

---

**Przygotował:** Claude Code Review Agent
**Data:** 2025-12-30
**Następna recenzja:** Po implementacji Fazy 1 (tydzień 1)
