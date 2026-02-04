/**
 * Moduł Schuco - publiczne API
 *
 * Eksportuje wszystkie komponenty, hooki i helpery
 * potrzebne do obsługi dostaw Schuco.
 */

// Komponenty
export {
  DeliveryListTab,
  UpcomingDeliveriesTab,
  DeliveryHistoryTab,
  FetchLogsTab,
  ArchiveTab,
  StatusCard,
  CriticalErrorAlert,
  DeliveryItemsExpander,
} from './components';

// Hooki
export {
  useDeliveryPagination,
  useDeliveryActions,
  useSchucoData,
  useSchucoRealtimeProgress,
  SCHUCO_QUERY_KEYS,
  // Hooki dla pozycji zamówień
  useSchucoItems,
  useSchucoItemsStats,
  useSchucoItemsFetchRunning,
  useSchucoItemsFetch,
  useSchucoItemsClearOldChanges,
  useSchucoItemsSchedulerStatus,
  useSchucoItemsSchedulerControl,
  useSchucoItemsAutoFetch,
} from './hooks';

// Helpery
export {
  FIELD_LABELS,
  getShippingStatusBadgeClass,
  getRowChangeClasses,
  parseChangedFieldsInfo,
  hasDeliveryWeekChanged,
  countDeliveryChanges,
  filterDeliveriesByQuery,
  calculateDisplayRange,
  formatDatePL,
  formatDuration,
} from './helpers/deliveryHelpers';

// Typy
export type {
  SchucoDelivery,
  SchucoFetchLog,
  SchucoRefreshResponse,
  SchucoDeliveriesResponse,
  SchucoDeliveryLink,
  SchucoSyncLinksResponse,
  ChangedFieldInfo,
  DeliveryChangeCounts,
  SchucoStatistics,
  WeekData,
  WeekDelivery,
  ByWeekResponse,
  PaginationState,
  PaginationProps,
  ArchivedDelivery,
  ArchiveResponse,
  ArchiveStats,
} from './types';
