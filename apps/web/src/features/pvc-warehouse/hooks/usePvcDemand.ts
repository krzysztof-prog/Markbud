/**
 * Hook do pobierania zapotrzebowania PVC
 */

import { useQuery } from '@tanstack/react-query';
import { pvcWarehouseApi, type GetDemandParams } from '../api/pvcWarehouseApi';

export const PVC_DEMAND_QUERY_KEY = 'pvc-warehouse-demand';

export function usePvcDemand(params?: GetDemandParams) {
  return useQuery({
    queryKey: [PVC_DEMAND_QUERY_KEY, params],
    queryFn: () => pvcWarehouseApi.getDemand(params),
  });
}
