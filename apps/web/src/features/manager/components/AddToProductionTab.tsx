'use client';

import React, { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { DeliveryCheckbox } from './DeliveryCheckbox';
import { OrderCheckbox } from './OrderCheckbox';
import { managerApi } from '../api/managerApi';
import { useProductionSelection } from '../hooks/useProductionSelection';
import { getTodayISOString } from '../helpers/dateHelpers';
import { UPCOMING_ORDERS_LABEL } from '../helpers/constants';
import type { ForProductionData } from '@/types/manager';
import { Loader2, AlertCircle, CheckCircle2, Calendar, Package, Clock } from 'lucide-react';

/**
 * Zakładka "Dodaj do produkcji" - Panel Kierownika
 *
 * Wyświetla 4 sekcje:
 * 1. Najbliższe dostawy AKROBUD (checkbox na całą dostawę lub pojedyncze zlecenia)
 * 2. Zlecenia przeterminowane (deadline < dzisiaj, klient NIE-AKROBUD)
 * 3. Zlecenia na najbliższe 2 tygodnie (deadline w ciągu 14 dni, klient NIE-AKROBUD)
 * 4. Zlecenia prywatne (wszystkie inne zlecenia nie-AKROBUD bez terminu lub z dalszym terminem)
 *
 * Kierownik może zaznaczyć wiele zleceń/dostaw i zmienić status na "in_progress"
 */
export const AddToProductionTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Custom hook dla selection logic
  const {
    selectedOrderIds,
    selectedDeliveryIds,
    handleOrderToggle,
    handleDeliveryToggle,
    reset,
    totalSelected,
    hasSelection,
  } = useProductionSelection();

  // Fetch danych do produkcji
  const { data, isLoading, error } = useQuery<ForProductionData>({
    queryKey: ['orders', 'for-production'],
    queryFn: () => managerApi.getForProduction(),
  });

  // Mutation do bulk update statusu z optimistic update
  const bulkUpdateMutation = useMutation({
    mutationFn: (orderIds: number[]) =>
      managerApi.bulkUpdateStatus({
        orderIds,
        status: 'in_progress',
        productionDate: getTodayISOString(),
      }),
    onMutate: async (orderIds) => {
      await queryClient.cancelQueries({ queryKey: ['orders', 'for-production'] });
      const previous = queryClient.getQueryData(['orders', 'for-production']);

      queryClient.setQueryData(['orders', 'for-production'], (old: ForProductionData | undefined) => {
        if (!old) return old;
        const orderIdSet = new Set(orderIds);
        return {
          ...old,
          overdueOrders: old.overdueOrders.filter((o) => !orderIdSet.has(o.id)),
          upcomingOrders: old.upcomingOrders.filter((o) => !orderIdSet.has(o.id)),
          privateOrders: old.privateOrders.filter((o) => !orderIdSet.has(o.id)),
        };
      });

      return { previous };
    },
    onSuccess: (data) => {
      reset();
      toast({
        title: 'Sukces',
        description: `Dodano ${data.length} zleceń do produkcji`,
      });
    },
    onError: (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['orders', 'for-production'], context.previous);
      }
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się dodać do produkcji',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });

  // Obsługa dodania do produkcji z useCallback
  const handleAddToProduction = useCallback(() => {
    if (selectedOrderIds.size === 0) return;
    bulkUpdateMutation.mutate(Array.from(selectedOrderIds));
  }, [selectedOrderIds, bulkUpdateMutation]);

  // Delivery toggle wrapper z delivery object
  const handleDeliveryToggleWithData = useCallback(
    (deliveryId: number, checked: boolean) => {
      const delivery = data?.upcomingDeliveries.find((d) => d.id === deliveryId);
      handleDeliveryToggle(deliveryId, checked, delivery);
    },
    [data?.upcomingDeliveries, handleDeliveryToggle]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Nagłówek z licznikiem i przyciskiem akcji - ZAWSZE WIDOCZNY */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dodaj do produkcji</h2>
          <p className="text-sm text-gray-500 mt-1">
            Zaznacz zlecenia lub całe dostawy, które chcesz przekazać do produkcji
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasSelection && (
            <Badge variant="secondary" className="text-base px-4 py-2">
              Zaznaczono: {totalSelected} {totalSelected === 1 ? 'zlecenie' : 'zleceń'}
            </Badge>
          )}
          <Button
            onClick={handleAddToProduction}
            disabled={!hasSelection || bulkUpdateMutation.isPending}
            size="lg"
          >
            {bulkUpdateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Dodawanie...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Dodaj do produkcji
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Błąd podczas ładowania zleceń: {error instanceof Error ? error.message : 'Nieznany błąd'}
          </AlertDescription>
        </Alert>
      )}

      {/* CONDITIONAL RENDERING zamiast early returns - zawsze ten sam layout */}
      {isLoading ? (
        <>
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </>
      ) : (
        <>
          {/* Sekcja 1: Najbliższe dostawy AKROBUD */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <CardTitle>Najbliższe dostawy AKROBUD</CardTitle>
                <Badge variant="outline">{data?.upcomingDeliveries.length || 0} dostaw</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!data?.upcomingDeliveries.length ? (
                <p className="text-gray-500 text-center py-4">Brak zaplanowanych dostaw</p>
              ) : (
                <div className="space-y-3">
                  {data.upcomingDeliveries.map((delivery) => (
                    <DeliveryCheckbox
                      key={delivery.id}
                      delivery={delivery}
                      checked={selectedDeliveryIds.has(delivery.id)}
                      onChange={handleDeliveryToggleWithData}
                      onOrderToggle={handleOrderToggle}
                      selectedOrderIds={selectedOrderIds}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sekcja 2: Zlecenia przeterminowane */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-700">Zlecenia przeterminowane</CardTitle>
                <Badge variant="destructive">{data?.overdueOrders.length || 0} zleceń</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!data?.overdueOrders.length ? (
                <p className="text-gray-500 text-center py-4">Brak przeterminowanych zleceń</p>
              ) : (
                <div className="space-y-2">
                  {data.overdueOrders.map((order) => (
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

          {/* Sekcja 3: Zlecenia na najbliższe 2 tygodnie */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <CardTitle>{UPCOMING_ORDERS_LABEL}</CardTitle>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  {data?.upcomingOrders.length || 0} zleceń
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!data?.upcomingOrders.length ? (
                <p className="text-gray-500 text-center py-4">Brak zleceń w najbliższym czasie</p>
              ) : (
                <div className="space-y-2">
                  {data.upcomingOrders.map((order) => (
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

          {/* Sekcja 4: Zlecenia prywatne */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <CardTitle>Zlecenia prywatne</CardTitle>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {data?.privateOrders.length || 0} zleceń
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!data?.privateOrders.length ? (
                <p className="text-gray-500 text-center py-4">Brak zleceń prywatnych</p>
              ) : (
                <div className="space-y-2">
                  {data.privateOrders.map((order) => (
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
    </div>
  );
};

export default AddToProductionTab;
