'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ordersApi } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Archive, RotateCcw, Trash2, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import type { Order } from '@/types';

export default function ArchiwumPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300); // 300ms debounce

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', 'archived'],
    queryFn: () => ordersApi.getAll({ archived: 'true' }),
  });

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

  const filteredOrders = orders?.filter((order: Order) =>
    order.orderNumber.toLowerCase().includes(debouncedSearch.toLowerCase())
  ) || [];

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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Szukaj zlecenia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-md text-sm w-64"
              />
            </div>
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
                      <tr key={order.id} className={`border-t hover:bg-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
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
                          {order.valuePln ? formatCurrency(parseFloat(order.valuePln), 'PLN') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {order.valueEur ? formatCurrency(parseFloat(order.valueEur), 'EUR') : '-'}
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
                                if (confirm('Czy na pewno chcesz usunąć to zlecenie? Tej operacji nie można cofnąć.')) {
                                  deleteMutation.mutate(order.id);
                                }
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
    </div>
  );
}
