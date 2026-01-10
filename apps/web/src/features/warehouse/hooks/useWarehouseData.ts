import { useQuery } from '@tanstack/react-query';
import { warehouseApi } from '@/lib/api';
import type { WarehouseDataResponse } from '@/types/warehouse';

export function useWarehouseData(colorId: number | null) {
  return useQuery<WarehouseDataResponse>({
    queryKey: ['warehouse', colorId],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- enabled check guarantees colorId is not null
    queryFn: () => warehouseApi.getByColor(colorId!),
    enabled: !!colorId,
  });
}
