'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
// Badge import - może być używany w przyszłości
// import { Badge } from '@/components/ui/badge';
import { ordersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { formatGrosze, formatCenty, type Grosze, type Centy } from '@/lib/money';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { useDebounce } from '@/hooks/useDebounce';
import type { Order } from '@/types';

export default function ArchiwumPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300); // 300ms debounce
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<{ id: number; number: string } | null>(null);

  // API zwraca PaginatedResponse { data: Order[], total, skip, take }
  const { data: response, isLoading } = useQuery({
    queryKey: ['orders', 'archived'],
    queryFn: () => ordersApi.getAll({ archived: 'true' }),
  });

  const orders = response?.data ?? [];

  const unarchiveMutation = useMutation({
    mutationFn: ordersApi.unarchive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ordersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const filteredOrders = orders.filter((order: Order) =>
    order.orderNumber.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <Header title="Archiwum" />

      <div className="flex-1 p-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Zarchiwizowane zlecenia
            </CardTitle>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Szukaj zlecenia..."
              className="w-64"
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : filteredOrders?.length > 0 ? (
              <div className="rounded border overflow-hidden overflow-y-auto max-h-[600px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left">Nr zlecenia</th>
                      <th className="px-4 py-3 text-left">Data utworzenia</th>
                      <th className="px-4 py-3 text-left">Data archiwizacji</th>
                      <th className="px-4 py-3 text-right">Wartość PLN</th>
                      <th className="px-4 py-3 text-right">Wartość EUR</th>
                      <th className="px-4 py-3 text-center">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order: Order, index: number) => (
                      <tr key={order.id} className={`border-t hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium">{order.orderNumber}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {order.archivedAt ? formatDate(order.archivedAt) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {/* valuePln jest w groszach */}
                          {order.valuePln ? formatGrosze(order.valuePln as Grosze) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {/* valueEur jest w centach */}
                          {order.valueEur ? formatCenty(order.valueEur as Centy) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unarchiveMutation.mutate(order.id)}
                              disabled={unarchiveMutation.isPending}
                              title="Przywróć z archiwum"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setOrderToDelete({ id: order.id, number: order.orderNumber });
                                setDeleteDialogOpen(true);
                              }}
                              disabled={deleteMutation.isPending}
                              title="Usuń permanentnie"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <Archive className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500">
                  {searchTerm ? 'Nie znaleziono zleceń' : 'Archiwum jest puste'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog potwierdzenia usunięcia */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Usuń zlecenie"
        description={`Czy na pewno chcesz usunąć zlecenie ${orderToDelete?.number || ''}? Tej operacji nie można cofnąć.`}
        confirmText="Usuń"
        onConfirm={() => {
          if (orderToDelete) {
            deleteMutation.mutate(orderToDelete.id);
            setOrderToDelete(null);
          }
        }}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
