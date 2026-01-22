/**
 * Hook do pobierania RW (zużycie wewnętrzne) PVC
 */

import { useQuery } from '@tanstack/react-query';
import { pvcWarehouseApi, type GetRwParams } from '../api/pvcWarehouseApi';

export const PVC_RW_QUERY_KEY = 'pvc-warehouse-rw';

export function usePvcRw(params?: GetRwParams) {
  return useQuery({
    queryKey: [PVC_RW_QUERY_KEY, params],
    queryFn: () => pvcWarehouseApi.getRw(params),
  });
}
