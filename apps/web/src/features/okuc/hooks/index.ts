/**
 * OKUC Hooks - Public exports
 *
 * Centralne eksporty React Query hooks dla modułu OKUC (DualStock)
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
} from './useOkucArticles';

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
