/**
 * OKUC API Client - Public exports
 *
 * Centralne eksporty klientów API dla modułu OKUC (DualStock)
 *
 * Struktura po refaktoryzacji:
 * - okucArticlesApi.ts - Artykuły CRUD + aliasy + import/export
 * - okucStockApi.ts - Stan magazynowy + historia
 * - okucDemandApi.ts - Zapotrzebowanie
 * - okucOrdersApi.ts - Zamówienia do dostawcy
 * - okucProportionsApi.ts - Proporcje między artykułami
 * - okucLocationsApi.ts - Lokalizacje magazynowe
 */

export { okucArticlesApi } from './okucArticlesApi';
export { okucStockApi } from './okucStockApi';
export { okucDemandApi } from './okucDemandApi';
export { okucOrdersApi } from './okucOrdersApi';
export { okucProportionsApi } from './okucProportionsApi';
export { okucLocationsApi } from './okucLocationsApi';
export { okucReplacementsApi } from './okucReplacementsApi';
