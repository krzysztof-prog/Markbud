/**
 * Hook do pobierania stanu magazynowego PVC
 */

import { useQuery } from '@tanstack/react-query';
import { pvcWarehouseApi, type GetStockParams } from '../api/pvcWarehouseApi';

export const PVC_STOCK_QUERY_KEY = 'pvc-warehouse-stock';

export function usePvcStock(params?: GetStockParams) {
  return useQuery({
    queryKey: [PVC_STOCK_QUERY_KEY, params],
    queryFn: () => pvcWarehouseApi.getStock(params),
  });
}
