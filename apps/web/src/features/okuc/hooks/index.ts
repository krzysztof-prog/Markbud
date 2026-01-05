/**
 * OKUC Hooks - Public exports
 *
 * Centralne eksporty React Query hooks dla modułu OKUC (DualStock)
 */

export {
  // Query keys
  okucArticlesKeys,
  okucStockKeys,
  okucDemandKeys,
  okucOrdersKeys,
  okucProportionsKeys,

  // Articles hooks
  useOkucArticles,
  useOkucArticle,
  useCreateOkucArticle,
  useUpdateOkucArticle,
  useDeleteOkucArticle,
  useOkucArticleAliases,

  // Stock hooks
  useOkucStock,
  useOkucStockByWarehouse,
  useUpdateOkucStock,
  useOkucStockHistory,

  // Demand hooks
  useOkucDemands,
  useCreateOkucDemand,
  useUpdateOkucDemand,
  useDeleteOkucDemand,

  // Orders hooks (placeholder - będą w useOkucOrders)
  // useOkucOrders,
  // useOkucOrder,
  // useCreateOkucOrder,
  // useUpdateOkucOrder,
  // useSendOkucOrder,
  // useConfirmOkucOrderDelivery,

  // Proportions hooks (placeholder)
  // useOkucProportions,
  // useUpdateOkucProportion,
} from './useOkucArticles';

// Orders hooks - Import z useOkucOrders
export {
  okucOrdersKeys,
  useOkucOrders,
  useOkucOrder,
  useOkucOrdersStats,
  useCreateOkucOrder,
  useUpdateOkucOrder,
  useSendOkucOrder,
  useConfirmOkucOrderDelivery,
  useDeleteOkucOrder,
} from './useOkucOrders';
