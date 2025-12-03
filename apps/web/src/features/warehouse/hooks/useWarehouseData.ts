import { useQuery } from '@tanstack/react-query';
import { warehouseApi } from '@/lib/api';
import type { WarehouseDataResponse } from '@/types/warehouse';

export function useWarehouseData(colorId: number | null) {
  return useQuery<WarehouseDataResponse>({
    queryKey: ['warehouse', colorId],
    queryFn: () => warehouseApi.getByColor(colorId!),
    enabled: !!colorId,
  });
}
