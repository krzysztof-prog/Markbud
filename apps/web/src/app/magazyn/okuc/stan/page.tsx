/**
 * Strona stanu magazynu OKUC
 *
 * Moduł: DualStock (Okucia PVC + ALU)
 * Funkcje:
 * - Podgląd stanów magazynowych z client-side filtering
 * - Edycja ilości (quantity)
 * - Karty z podsumowaniem stanów
 * - Filtrowanie po magazynie, podmagazynie i minimum
 *
 * Filtry:
 * - Magazyn (wszystkie/PVC/ALU)
 * - Podmagazyn (wszystkie/produkcja/bufor/gabaryty) - tylko gdy PVC
 * - Checkbox: "Tylko poniżej minimum"
 */

'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Filter } from 'lucide-react';
import { StockTable } from '@/features/okuc/components/StockTable';
import { StockSummaryCards } from '@/features/okuc/components/StockSummaryCards';
import {
  useOkucStock,
  useOkucStockSummary,
  useUpdateOkucStock,
} from '@/features/okuc/hooks/useOkucStock';
import type { WarehouseType, SubWarehouse } from '@/types/okuc';

export default function OkucStockPage() {
  // === STATE - Filtry ===
  const [warehouseType, setWarehouseType] = useState<'all' | WarehouseType>('all');
  const [subWarehouse, setSubWarehouse] = useState<'all' | NonNullable<SubWarehouse>>('all');
  const [belowMinOnly, setBelowMinOnly] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | undefined>(undefined);

  // === DATA FETCHING ===
  const { data: allStocks = [], isLoading, error } = useOkucStock();
  const { data: summaryData = [] } = useOkucStockSummary(
    warehouseType === 'all' ? undefined : warehouseType
  );

  // === MUTATIONS ===
  const updateMutation = useUpdateOkucStock({
    onSuccess: () => {
      setIsDeletingId(undefined);
    },
    onError: () => {
      setIsDeletingId(undefined);
    },
  });

  // === CLIENT-SIDE FILTERING ===
  const filteredStocks = useMemo(() => {
    let result = [...allStocks];

    // Filtr po typie magazynu
    if (warehouseType !== 'all') {
      result = result.filter((stock) => stock.warehouseType === warehouseType);
    }

    // Filtr po podmagazynie (tylko dla PVC)
    if (subWarehouse !== 'all' && warehouseType === 'pvc') {
      result = result.filter((stock) => stock.subWarehouse === subWarehouse);
    }

    // Filtr "tylko poniżej minimum"
    if (belowMinOnly) {
      result = result.filter((stock) => {
        const minStock = stock.minStock ?? 0;
        return stock.currentQuantity < minStock;
      });
    }

    return result;
  }, [allStocks, warehouseType, subWarehouse, belowMinOnly]);

  // === EVENT HANDLERS ===
  const handleUpdateStock = (
    id: number,
    quantity: number,
    version: number,
    reason?: string
  ) => {
    setIsDeletingId(id);
    updateMutation.mutate({
      id,
      data: { quantity, reason },
      version,
    });
  };

  // === COMPUTED VALUES ===
  const totalCount = allStocks.length;
  const filteredCount = filteredStocks.length;
  const showSubWarehouseFilter = warehouseType === 'pvc';

  // === RENDER ===
  return (
    <div className="flex flex-col h-full">
      <Header title="Stan magazynu okuć" />

      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-6">
          <Breadcrumb
            items={[
              { label: 'Magazyn', href: '/magazyn' },
              { label: 'OKUC', href: '/magazyn/okuc' },
              { label: 'Stan magazynu', icon: <Package className="h-4 w-4" /> },
            ]}
          />
        </div>

        {/* Karty podsumowujące */}
        <StockSummaryCards summary={summaryData} isLoading={isLoading} />

        {/* Filtry */}
        <div className="bg-card border rounded-lg p-4 mb-4 mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Filtry</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Magazyn */}
            <div className="space-y-2">
              <Label htmlFor="warehouseType">Magazyn</Label>
              <Select
                value={warehouseType}
                onValueChange={(v) => {
                  setWarehouseType(v as 'all' | WarehouseType);
                  // Reset podmagazynu gdy zmieniamy magazyn
                  if (v !== 'pvc') {
                    setSubWarehouse('all');
                  }
                }}
              >
                <SelectTrigger id="warehouseType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="pvc">PVC</SelectItem>
                  <SelectItem value="alu">ALU</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Podmagazyn - pokazuj tylko gdy PVC */}
            {showSubWarehouseFilter && (
              <div className="space-y-2">
                <Label htmlFor="subWarehouse">Podmagazyn</Label>
                <Select
                  value={subWarehouse}
                  onValueChange={(v) => setSubWarehouse(v as 'all' | NonNullable<SubWarehouse>)}
                >
                  <SelectTrigger id="subWarehouse">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    <SelectItem value="production">Produkcja</SelectItem>
                    <SelectItem value="buffer">Bufor</SelectItem>
                    <SelectItem value="gabaraty">Gabaryty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Checkbox: tylko poniżej minimum */}
            <div className="space-y-2">
              <Label htmlFor="belowMinOnly" className="invisible">
                Tylko poniżej minimum
              </Label>
              <div className="flex items-center space-x-2 h-10">
                <Checkbox
                  id="belowMinOnly"
                  checked={belowMinOnly}
                  onCheckedChange={(checked) => setBelowMinOnly(checked === true)}
                />
                <Label
                  htmlFor="belowMinOnly"
                  className="text-sm font-normal cursor-pointer"
                >
                  Tylko poniżej minimum
                </Label>
              </div>
            </div>
          </div>

          {/* Licznik */}
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Znaleziono: <strong>{filteredCount}</strong> pozycji (z{' '}
              <strong>{totalCount}</strong> wszystkich)
            </p>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Ładowanie stanów magazynowych...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4">
            <p className="text-sm text-destructive">
              <strong>Błąd:</strong> {(error as Error).message}
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !error && (
          <StockTable
            stocks={filteredStocks}
            onUpdate={handleUpdateStock}
            isUpdatingId={isDeletingId}
          />
        )}
      </div>
    </div>
  );
}
