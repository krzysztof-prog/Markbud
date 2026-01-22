/**
 * Hook do pobierania statystyk systemów PVC
 */

import { useQuery } from '@tanstack/react-query';
import { pvcWarehouseApi } from '../api/pvcWarehouseApi';

export const PVC_SYSTEMS_QUERY_KEY = 'pvc-warehouse-systems';

export function usePvcSystems() {
  return useQuery({
    queryKey: [PVC_SYSTEMS_QUERY_KEY],
    queryFn: () => pvcWarehouseApi.getSystems(),
  });
}
