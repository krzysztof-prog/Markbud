/**
 * Hook do pobierania zamówień Schuco dla magazynu PVC
 */

import { useQuery } from '@tanstack/react-query';
import { pvcWarehouseApi, type GetOrdersParams } from '../api/pvcWarehouseApi';

export const pvcOrdersKeys = {
  all: ['pvc-orders'] as const,
  list: (params?: GetOrdersParams) => [...pvcOrdersKeys.all, 'list', params] as const,
};

export function usePvcOrders(params?: GetOrdersParams) {
  return useQuery({
    queryKey: pvcOrdersKeys.list(params),
    queryFn: () => pvcWarehouseApi.getOrders(params),
  });
}
