/**
 * OKUC Hooks - Public exports
 *
 * Centralne eksporty React Query hooks dla modulu OKUC (DualStock)
 */

// ============================================================================
// ARTICLES
// ============================================================================
export {
  // Query keys
  okucArticlesKeys,

  // Articles hooks
  useOkucArticles,
  useOkucArticle,
  useCreateOkucArticle,
  useUpdateOkucArticle,
  useDeleteOkucArticle,
  useOkucArticleAliases,

  // Pending review hooks (dla nowych artykulow z importu)
  useOkucArticlesPendingReview,
  useBatchUpdateOrderClass,

  // Hook do przypisywania lokalizacji do artykulu
  useUpdateArticleLocation,
} from './useOkucArticles';

// ============================================================================
// LOCATIONS (Lokalizacje magazynowe - zarzadzane w Ustawieniach)
// ============================================================================
export {
  // Query keys
  okucLocationsKeys,

  // Locations hooks
  useOkucLocations,
  useCreateOkucLocation,
  useUpdateOkucLocation,
  useDeleteOkucLocation,
  useReorderOkucLocations,
  useOkucLocationMutations,
} from './useOkucLocations';

// ============================================================================
// STOCK
// ============================================================================
export {
  // Query keys
  okucStockKeys,

  // Stock hooks
  useOkucStock,
  useOkucStockSummary,
  useOkucStockBelowMinimum,
  useOkucStockById,
  useOkucStockByArticle,
  useOkucStockHistory,
  useUpdateOkucStock,
  useAdjustOkucStock,
} from './useOkucStock';

// ============================================================================
// DEMAND
// ============================================================================
export {
  // Query keys
  okucDemandKeys,

  // Demand hooks
  useOkucDemands,
  useOkucDemandSummary,
  useOkucDemandById,
  useCreateOkucDemand,
  useUpdateOkucDemand,
  useDeleteOkucDemand,
} from './useOkucDemand';

// ============================================================================
// ORDERS
// ============================================================================
export {
  // Query keys
  okucOrdersKeys,

  // Orders hooks
  useOkucOrders,
  useOkucOrder,
  useOkucOrdersStats,
  useCreateOkucOrder,
  useUpdateOkucOrder,
  useSendOkucOrder,
  useConfirmOkucOrderDelivery,
  useDeleteOkucOrder,
} from './useOkucOrders';
