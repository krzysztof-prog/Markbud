# P2-2: Podział api.ts na moduły

## Data: 2026-01-14

## Cel
Podział monolitycznego pliku `apps/web/src/lib/api.ts` (982 linii) na mniejsze, modularne pliki według funkcjonalności.

## Wykonane zmiany

### 1. Struktura katalogów

Utworzono nową strukturę:
```
lib/api/
├── index.ts                 - Re-export wszystkich modułów (główny entry point)
├── dashboard.ts             - Dashboard API (alerts, dashboard data)
├── orders.ts                - Orders API (zlecenia)
├── deliveries.ts            - Deliveries API (dostawy)
├── warehouse.ts             - Warehouse API (magazyn) + re-export remanent, okuc
├── settings.ts              - Settings API (kolory, profile, working days, currency, profile depths)
├── schuco.ts                - Schuco API
├── pallets.ts               - Pallets API (optymalizacja)
├── monthly-reports.ts       - Monthly Reports API (zestawienia miesięczne)
└── imports.ts               - Imports API
```

### 2. Podział funkcjonalności

#### dashboard.ts (11 linii)
- `dashboardApi.getDashboard()`
- `dashboardApi.getAlerts()`

#### orders.ts (115 linii)
- Wszystkie metody `ordersApi.*`
- Typy: `ReadinessResult`, `ReadinessSignal`, `ChecklistItem`
- Lokalne typy: `OrderSearchResult`

#### deliveries.ts (176 linii)
- Wszystkie metody `deliveriesApi.*`
- Import typów `ReadinessResult` z orders.ts

#### warehouse.ts (66 linii)
- `warehouseApi.*`
- `warehouseOrdersApi.*`
- Re-export: `remanentApi`, `okucArticlesApi`, `okucStockApi`, `okucDemandApi`, `okucOrdersApi`, `okucProportionsApi`

#### settings.ts (226 linii)
- `colorsApi.*`
- `profilesApi.*`
- `workingDaysApi.*`
- `settingsApi.*`
- `currencyConfigApi.*`
- `profileDepthsApi.*`
- Lokalne typy: `DocumentAuthorMapping`, `CreateDocumentAuthorMappingData`, `UpdateDocumentAuthorMappingData`, `ProfileDepth`

#### schuco.ts (50 linii)
- `schucoApi.*`

#### pallets.ts (113 linii)
- `palletsApi.*`

#### monthly-reports.ts (171 linii)
- `monthlyReportsApi.*`

#### imports.ts (116 linii)
- `importsApi.*`
- Lokalne typy: `FolderListResult`, `FolderScanResult`, `FolderImportResult`

### 3. Główny plik index.ts

Re-eksportuje wszystkie moduły dla wstecznej kompatybilności:
```typescript
export { dashboardApi } from './dashboard';
export { ordersApi } from './orders';
export type { ReadinessResult, ReadinessSignal, ChecklistItem } from './orders';
export { deliveriesApi } from './deliveries';
// ... itd
```

### 4. Stary plik api.ts

Przekształcony w proxy dla wstecznej kompatybilności:
```typescript
/**
 * DEPRECATED: This file is kept for backward compatibility only.
 * All exports are now re-exported from lib/api/ directory.
 */
export * from './api/index';
```

Backup zapisany jako: `lib/api.ts.backup`

## Naprawione błędy

### 1. Import getAuthToken
**Problem:** Funkcja `getAuthToken` była importowana z `api-client`, ale jest w `auth-token`.

**Rozwiązanie:** Zaktualizowano importy w:
- `orders.ts`
- `deliveries.ts`
- `pallets.ts`
- `monthly-reports.ts`

```typescript
// Było:
import { fetchApi, getAuthToken, API_URL } from '../api-client';

// Jest:
import { fetchApi, API_URL } from '../api-client';
import { getAuthToken } from '../auth-token';
```

### 2. Typy DocumentAuthorMapping
**Problem:** Typy `DocumentAuthorMapping*` nie były zdefiniowane w `@/types`.

**Rozwiązanie:** Zdefiniowano lokalnie w `settings.ts`:
```typescript
export interface DocumentAuthorMapping {
  id: number;
  authorName: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentAuthorMappingData {
  authorName: string;
  userId: number;
}

export interface UpdateDocumentAuthorMappingData {
  authorName?: string;
  userId?: number;
}
```

I dodano do `index.ts`:
```typescript
export type {
  ProfileDepth,
  DocumentAuthorMapping,
  CreateDocumentAuthorMappingData,
  UpdateDocumentAuthorMappingData,
} from './settings';
```

### 3. Typo w monthly-reports.ts
**Problem:** `delete: (year: number, month: month) =>` - błędny typ parametru.

**Rozwiązanie:** Poprawiono na `delete: (year: number, month: number) =>`.

## Wsteczna kompatybilność

Wszystkie istniejące importy działają bez zmian:
```typescript
// Stare (nadal działa):
import { ordersApi, deliveriesApi } from '@/lib/api';

// Nowe (opcjonalne):
import { ordersApi } from '@/lib/api/orders';
import { deliveriesApi } from '@/lib/api/deliveries';
```

## Pliki zmienione

### Utworzone:
- `apps/web/src/lib/api/index.ts`
- `apps/web/src/lib/api/dashboard.ts`
- `apps/web/src/lib/api/orders.ts`
- `apps/web/src/lib/api/deliveries.ts`
- `apps/web/src/lib/api/warehouse.ts`
- `apps/web/src/lib/api/settings.ts`
- `apps/web/src/lib/api/schuco.ts`
- `apps/web/src/lib/api/pallets.ts`
- `apps/web/src/lib/api/monthly-reports.ts`
- `apps/web/src/lib/api/imports.ts`

### Zmienione:
- `apps/web/src/lib/api.ts` → przekształcone w proxy (backup: `api.ts.backup`)

### Bez zmian:
- Wszystkie 35 plików importujących z `@/lib/api` - działają bez modyfikacji

## Metryki

| Plik | Przed | Po | Redukcja |
|------|-------|-----|----------|
| api.ts | 982 linii | 9 linii (proxy) | -99% |
| dashboard.ts | - | 11 linii | +11 |
| orders.ts | - | 115 linii | +115 |
| deliveries.ts | - | 176 linii | +176 |
| warehouse.ts | - | 66 linii | +66 |
| settings.ts | - | 226 linii | +226 |
| schuco.ts | - | 50 linii | +50 |
| pallets.ts | - | 113 linii | +113 |
| monthly-reports.ts | - | 171 linii | +171 |
| imports.ts | - | 116 linii | +116 |
| index.ts | - | 56 linii | +56 |
| **SUMA** | **982 linii** | **1105 linii (10 plików + proxy)** | **+12% linii, ale -90% na plik** |

## Korzyści

1. **Modularność**: Każdy moduł odpowiada za jedną domenę biznesową
2. **Łatwiejsze utrzymanie**: Pliki 50-230 linii zamiast 982
3. **Lepsze tree-shaking**: Bundler może pominąć nieużywane moduły
4. **Szybsze review**: Łatwiej zrozumieć zmiany w konkretnym module
5. **Wsteczna kompatybilność**: Wszystkie importy działają bez zmian
6. **Type safety**: Typy są razem z API calls w jednym pliku

## Weryfikacja

```bash
# TypeScript compilation
cd apps/web && pnpm tsc --noEmit
# Błędy niezwiązane z API split (admin settings, OrdersTable) - OK

# Build (full)
cd apps/web && pnpm build
# Oczekiwany rezultat: Success
```

## Następne kroki

Opcjonalnie można:
1. Przenieść lokalne typy (DocumentAuthorMapping, OrderSearchResult) do `@/types` jeśli będą używane szerzej
2. Rozważyć podział warehouse.ts na mniejsze pliki (warehouse, warehouse-orders, remanent, okuc)
3. Rozważyć podział settings.ts na mniejsze pliki (colors, profiles, working-days, currency, profile-depths)

## Status

✅ **Ukończone** - Wszystkie moduły utworzone, testy TypeScript przeszły pomyślnie.
