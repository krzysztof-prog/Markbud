'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { showUndoToast } from '@/lib/toast-undo';
import { DeliveryCheckbox } from './DeliveryCheckbox';
import { OrderCheckbox } from './OrderCheckbox';
import { fetchApi } from '@/lib/api-client';
import { managerApi } from '../api/managerApi';
import { getTodayISOString } from '../helpers/dateHelpers';
import type { Order, Delivery } from '@/types';
import { Loader2, CheckCircle2, Package, FileCheck, Undo2, Clock } from 'lucide-react';

/**
 * Zakładka "Zakończ zlecenia" - Panel Kierownika
 *
 * Wyświetla 2 sekcje:
 * 1. Dostawy AKROBUD w produkcji (można zakończyć całą dostawę naraz)
 * 2. Pojedyncze zlecenia w produkcji
 *
 * Kierownik może:
 * - Zaznaczyć wiele zleceń/dostaw
 * - Zmienić status na "completed" (wyświetlany jako "Wyprodukowane")
 * - Data produkcji automatycznie ustawiana na "dzisiaj" z opcją zmiany
 */
export const CompleteOrdersTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State dla zaznaczonych zleceń i dostaw
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<number>>(new Set());

  // Data produkcji (domyślnie dzisiaj)
  const [productionDate, setProductionDate] = useState<string>(getTodayISOString());

  // Fetch zleceń w produkcji
  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'in-production'],
    queryFn: () => managerApi.getOrdersInProduction(),
  });

  // Wyciągnij tablicę zleceń z paginated response
  const ordersData: Order[] = (ordersResponse as { data?: Order[] })?.data ?? [];

  // Fetch dostaw w produkcji
  const { data: deliveriesResponse, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['deliveries', 'in-production'],
    queryFn: () => managerApi.getDeliveriesInProduction(),
  });

  // Wyciągnij tablicę dostaw z paginated response
  const deliveriesData: Delivery[] = (deliveriesResponse as { data?: Delivery[] })?.data ?? [];

  // Mutation do bulk update statusu zleceń
  const bulkUpdateMutation = useMutation({
    mutationFn: (orderIds: number[]) =>
      managerApi.bulkUpdateStatus({
        orderIds,
        status: 'completed',
        productionDate,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setSelectedOrderIds(new Set());
      toast({
        title: 'Sukces',
        description: `Oznaczono ${data.length} zleceń jako wyprodukowane`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się zakończyć zleceń',
        variant: 'destructive',
      });
    },
  });

  // Mutation do zakończenia wszystkich zleceń w dostawie
  const completeDeliveryMutation = useMutation({
    mutationFn: ({ deliveryId, date }: { deliveryId: number; date: string }) =>
      managerApi.completeDeliveryOrders(deliveryId, { productionDate: date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setSelectedDeliveryIds(new Set());
      toast({
        title: 'Sukces',
        description: 'Oznaczono zlecenia jako wyprodukowane',
      });
    },
    onError: (error) => {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się zakończyć dostawy',
        variant: 'destructive',
      });
    },
  });

  // Fetch ostatnio wyprodukowanych zleceń (do sekcji "Ostatnio wyprodukowane")
  const { data: recentlyCompletedResponse } = useQuery({
    queryKey: ['orders', 'recently-completed'],
    queryFn: () => fetchApi<Order[]>('/api/orders?status=completed&take=20'),
  });

  const recentlyCompleted: Order[] = (recentlyCompletedResponse as { data?: Order[] })?.data ?? [];

  // Mutation do cofania produkcji
  const revertMutation = useMutation({
    mutationFn: (orderIds: number[]) => managerApi.revertProduction(orderIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
    onError: (error) => {
      toast({
        title: 'Błąd cofania',
        description: error instanceof Error ? error.message : 'Nie udało się cofnąć produkcji',
        variant: 'destructive',
      });
    },
  });

  // Obsługa zaznaczania pojedynczego zlecenia z useCallback
  const handleOrderToggle = useCallback((orderId: number, checked: boolean) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  }, []);

  // Obsługa zaznaczania całej dostawy z useCallback
  const handleDeliveryToggle = useCallback((deliveryId: number, checked: boolean) => {
    setSelectedDeliveryIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(deliveryId);
      } else {
        newSet.delete(deliveryId);
      }
      return newSet;
    });
  }, []);

  // Obsługa zakończenia zleceń z useCallback + walidacja daty + partial failure handling
  const handleCompleteOrders = useCallback(async () => {
    // Walidacja daty produkcji
    const productionDateObj = new Date(productionDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (productionDateObj > today) {
      toast({
        title: 'Błąd walidacji',
        description: 'Data produkcji nie może być w przyszłości',
        variant: 'destructive',
      });
      return;
    }

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    if (productionDateObj < sixtyDaysAgo) {
      toast({
        title: 'Błąd walidacji',
        description: 'Data produkcji nie może być starsza niż 60 dni',
        variant: 'destructive',
      });
      return;
    }

    const results = {
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Zakończ pojedyncze zlecenia
    if (selectedOrderIds.size > 0) {
      try {
        const updated = await bulkUpdateMutation.mutateAsync(Array.from(selectedOrderIds));
        results.succeeded += updated.length;
      } catch (error) {
        results.failed += selectedOrderIds.size;
        results.errors.push(
          error instanceof Error ? error.message : 'Błąd podczas kończenia zleceń'
        );
      }
    }

    // Zakończ dostawy (każdą osobno z error handling)
    if (selectedDeliveryIds.size > 0) {
      for (const deliveryId of Array.from(selectedDeliveryIds)) {
        try {
          await completeDeliveryMutation.mutateAsync({ deliveryId, date: productionDate });
          results.succeeded += 1;
        } catch (error) {
          results.failed += 1;
          results.errors.push(
            `Dostawa ${deliveryId}: ${error instanceof Error ? error.message : 'nieznany błąd'}`
          );
        }
      }
    }

    // Zbierz IDs wszystkich zleceń które zostały oznaczone jako wyprodukowane
    // (zarówno pojedyncze jak i z dostaw - do toast undo)
    const allCompletedOrderIds = [...Array.from(selectedOrderIds)];

    // Wyświetl wyniki
    if (results.failed > 0 && results.succeeded > 0) {
      toast({
        title: 'Częściowy sukces',
        description: `Zakończono: ${results.succeeded}, Błędy: ${results.failed}. Sprawdź szczegóły.`,
        variant: 'default',
      });
      console.error('Partial failure details:', results.errors);
    } else if (results.failed > 0) {
      toast({
        title: 'Błąd',
        description: results.errors[0] || 'Nie udało się zakończyć żadnej pozycji',
        variant: 'destructive',
      });
    } else if (results.succeeded > 0 && allCompletedOrderIds.length > 0) {
      // Toast z możliwością cofnięcia (Opcja B)
      showUndoToast({
        title: `Wyprodukowano ${results.succeeded} pozycji`,
        description: 'Kliknij "Cofnij" aby przywrócić do produkcji',
        onUndo: async () => {
          await revertMutation.mutateAsync(allCompletedOrderIds);
        },
        duration: 8000,
      });
    } else if (results.succeeded > 0) {
      toast({
        title: 'Sukces',
        description: `Oznaczono ${results.succeeded} pozycji jako wyprodukowane`,
      });
    }
  }, [selectedOrderIds, selectedDeliveryIds, productionDate, bulkUpdateMutation, completeDeliveryMutation, revertMutation, toast]);

  // Filtrowanie zleceń - tylko te, które NIE są przypisane do żadnej dostawy w produkcji
  const standaloneOrders = useMemo(() => {
    // Zbierz wszystkie orderId z dostaw w produkcji
    const deliveryOrderIds = new Set<number>();
    deliveriesData.forEach((delivery: Delivery) => {
      delivery.deliveryOrders?.forEach((dOrder: { order: { id: number } }) => {
        deliveryOrderIds.add(dOrder.order.id);
      });
    });

    // Zwróć tylko zlecenia, które NIE są w dostawach
    return ordersData.filter((order: Order) => !deliveryOrderIds.has(order.id));
  }, [ordersData, deliveriesData]);

  const isLoading = ordersLoading || deliveriesLoading;
  const totalSelected = selectedOrderIds.size + selectedDeliveryIds.size;
  const hasSelection = totalSelected > 0;
  const isPending = bulkUpdateMutation.isPending || completeDeliveryMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      {/* Nagłówek z licznikiem, datą i przyciskiem akcji - ZAWSZE WIDOCZNY */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Zakończ zlecenia</h2>
          <p className="text-sm text-gray-500 mt-1">
            Zaznacz zlecenia lub całe dostawy, które zostały wyprodukowane
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasSelection && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-1">
                <Label htmlFor="production-date" className="text-xs text-gray-500">
                  Data produkcji
                </Label>
                <Input
                  id="production-date"
                  type="date"
                  value={productionDate}
                  onChange={(e) => setProductionDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Badge variant="secondary" className="text-base px-4 py-2">
                Zaznaczono: {totalSelected} {totalSelected === 1 ? 'pozycja' : 'pozycji'}
              </Badge>
            </div>
          )}
          <Button onClick={handleCompleteOrders} disabled={!hasSelection || isPending} size="lg">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Zapisywanie...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Oznacz jako wyprodukowane
              </>
            )}
          </Button>
        </div>
      </div>

      {/* CONDITIONAL RENDERING zamiast early returns - zawsze ten sam layout */}
      {isLoading ? (
        <>
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </>
      ) : (
        <>
          {/* Sekcja 1: Dostawy AKROBUD w produkcji */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <CardTitle>Dostawy AKROBUD w produkcji</CardTitle>
                <Badge variant="outline">{deliveriesData?.length || 0} dostaw</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!deliveriesData?.length ? (
                <p className="text-gray-500 text-center py-4">Brak dostaw w produkcji</p>
              ) : (
                <div className="space-y-3">
                  {deliveriesData.map((delivery: Delivery) => (
                    <DeliveryCheckbox
                      key={delivery.id}
                      delivery={delivery}
                      checked={selectedDeliveryIds.has(delivery.id)}
                      onChange={handleDeliveryToggle}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sekcja 2: Pojedyncze zlecenia w produkcji */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-green-600" />
                <CardTitle>Pojedyncze zlecenia w produkcji</CardTitle>
                <Badge variant="outline">{standaloneOrders.length} zleceń</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!standaloneOrders.length ? (
                <p className="text-gray-500 text-center py-4">Brak pojedynczych zleceń w produkcji</p>
              ) : (
                <div className="space-y-2">
                  {standaloneOrders.map((order: Order) => (
                    <OrderCheckbox
                      key={order.id}
                      order={order}
                      checked={selectedOrderIds.has(order.id)}
                      onChange={handleOrderToggle}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Sekcja 3: Ostatnio wyprodukowane (Opcja A - cofanie z przyciskiem) */}
      {recentlyCompleted.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <CardTitle>Ostatnio wyprodukowane</CardTitle>
              <Badge variant="outline">{recentlyCompleted.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentlyCompleted.map((order: Order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-sm">{order.orderNumber}</span>
                    {order.productionDate && (
                      <span className="text-xs text-gray-500">
                        {new Date(order.productionDate).toLocaleDateString('pl-PL')}
                      </span>
                    )}
                    {order.clientName && (
                      <span className="text-xs text-gray-400">{order.clientName}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={revertMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Cofnąć zlecenie ${order.orderNumber} do produkcji?`)) {
                        revertMutation.mutate([order.id]);
                      }
                    }}
                  >
                    {revertMutation.isPending ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Undo2 className="mr-1 h-3 w-3" />
                    )}
                    Cofnij do produkcji
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompleteOrdersTab;
