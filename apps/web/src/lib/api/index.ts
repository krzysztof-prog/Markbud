/**
 * Unified API module - Main entry point
 *
 * All API methods are re-exported here for backward compatibility.
 * Uses shared fetchApi from api-client.ts for consistent error handling.
 */

// Dashboard
export { dashboardApi } from './dashboard';

// Orders
export { ordersApi } from './orders';
export type { ReadinessResult, ReadinessSignal, ChecklistItem } from './orders';

// Deliveries
export { deliveriesApi } from './deliveries';

// Warehouse
export {
  warehouseApi,
  warehouseOrdersApi,
  remanentApi,
  okucArticlesApi,
  okucStockApi,
  okucDemandApi,
  okucOrdersApi,
  okucProportionsApi,
} from './warehouse';

// Settings (Colors, Profiles, Working Days, Currency, Profile Depths, etc.)
export {
  colorsApi,
  profilesApi,
  workingDaysApi,
  settingsApi,
  currencyConfigApi,
  profileDepthsApi,
} from './settings';
export type {
  ProfileDepth,
  DocumentAuthorMapping,
  CreateDocumentAuthorMappingData,
  UpdateDocumentAuthorMappingData,
} from './settings';

// Schuco
export { schucoApi } from './schuco';

// Pallets
export { palletsApi } from './pallets';

// Monthly Reports
export { monthlyReportsApi } from './monthly-reports';

// Imports
export { importsApi } from './imports';
