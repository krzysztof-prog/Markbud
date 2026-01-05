# Przykład użycia komponentów Stan Magazynu

## StockTable + StockSummaryCards

```typescript
'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StockTable, StockSummaryCards } from '@/features/okuc/components';
import { okucStockApi } from '@/features/okuc/api/okucApi';
import { useToast } from '@/components/ui/use-toast';
import type { OkucStock } from '@/types/okuc';

export const StockManagementPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pobierz stany magazynowe
  const { data: stocks = [], isLoading: isLoadingStocks } = useQuery({
    queryKey: ['okuc', 'stock'],
    queryFn: () => okucStockApi.getAll(),
  });

  // Pobierz podsumowanie
  const { data: summary = [], isLoading: isLoadingSummary } = useQuery({
    queryKey: ['okuc', 'stock', 'summary'],
    queryFn: () => okucStockApi.getSummary(),
  });

  // Mutacja aktualizacji stanu
  const updateMutation = useMutation({
    mutationFn: ({ id, quantity, version }: { id: number; quantity: number; version: number }) =>
      okucStockApi.update(id, { quantity, version }),
    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Zaktualizowano stan magazynowy',
      });
      queryClient.invalidateQueries({ queryKey: ['okuc', 'stock'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd',
        description: `Nie udało się zaktualizować: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Handler aktualizacji
  const handleUpdateStock = (id: number, quantity: number) => {
    const stock = stocks.find((s) => s.id === id);
    if (!stock) return;

    updateMutation.mutate({
      id,
      quantity,
      version: stock.version,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Stan Magazynu</h1>

      {/* Podsumowanie */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Podsumowanie</h2>
        <StockSummaryCards summary={summary} isLoading={isLoadingSummary} />
      </section>

      {/* Tabela stanów */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Stany magazynowe</h2>
        <StockTable
          stocks={stocks}
          isLoading={isLoadingStocks}
          onUpdate={handleUpdateStock}
          isUpdatingId={updateMutation.isPending ? updateMutation.variables?.id : undefined}
        />
      </section>
    </div>
  );
};

export default StockManagementPage;
```

## Filtry (opcjonalnie)

```typescript
// Dodaj filtry do tabeli
const [filters, setFilters] = useState({
  warehouseType: undefined as 'pvc' | 'alu' | undefined,
  belowMin: false,
});

const { data: stocks = [], isLoading } = useQuery({
  queryKey: ['okuc', 'stock', filters],
  queryFn: () => okucStockApi.getAll(filters),
});
```

## Typy Badge w StockTable

- **Czerwony** (`variant="destructive"`) - Ilość < minStock (KRYTYCZNY)
- **Żółty** (`bg-yellow-100`) - Ilość < maxStock (OSTRZEŻENIE)
- **Zielony** (`bg-green-100`) - Ilość >= maxStock (OK)

## Sortowanie w StockTable

Wszystkie kolumny są sortowalne:
- Artykuł (articleId)
- Magazyn (warehouseType + subWarehouse)
- Ilość (currentQuantity)
- Ostatnia zmiana (updatedAt)

Kliknięcie na nagłówek zmienia kierunek sortowania (↑ / ↓).

## Inline Edit w StockTable

1. Kliknij ikonę `Edit` (ołówek)
2. Wpisz nową ilość (tylko >= 0)
3. Kliknij `Check` (✓) aby zapisać lub `X` aby anulować
4. Podczas zapisywania (isPending) - przyciski zablokowane
5. Tylko jeden wiersz na raz może być edytowany

## Layout Responsive (StockSummaryCards)

- **Mobile** (< 768px): Stack (karty pod sobą)
- **Tablet** (768px - 1024px): Grid 2 kolumny
- **Desktop** (>= 1024px): Grid 3 kolumny
