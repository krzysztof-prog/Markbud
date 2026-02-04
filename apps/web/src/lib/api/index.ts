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
export type {
  ReadinessResult,
  ReadinessSignal,
  ReadinessCheckResult,
  ChecklistItem,
  AggregatedReadinessStatus,
} from './orders';

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

// Settings (Colors, Profiles, Working Days, Currency, Profile Depths, Steel, etc.)
export {
  colorsApi,
  profilesApi,
  workingDaysApi,
  settingsApi,
  currencyConfigApi,
  profileDepthsApi,
  steelApi,
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

// Gmail IMAP
export { gmailApi } from './gmail';
export type { GmailStatus, GmailFetchLog, GmailFetchResult, GmailTestResult } from './gmail';

// Users
export { usersApi } from './users';
export type { User, CreateUserData, UpdateUserData } from './users';
