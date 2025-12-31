'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeliveryCheckbox } from './DeliveryCheckbox';
import { OrderCheckbox } from './OrderCheckbox';
import { ordersApi, deliveriesApi } from '@/lib/api';
import type { Order, Delivery } from '@/types';
import type { BulkUpdateStatusData } from '@/types/manager';
import { Loader2, AlertCircle, CheckCircle2, Package, FileCheck } from 'lucide-react';

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

  // State dla zaznaczonych zleceń i dostaw
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<number>>(new Set());

  // Data produkcji (domyślnie dzisiaj)
  const [productionDate, setProductionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Fetch zleceń w produkcji
  const { data: ordersData = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['orders', 'in-production'],
    queryFn: () => ordersApi.getAll({ status: 'in_progress' }),
  });

  // Fetch dostaw w produkcji
  const { data: deliveriesData = [], isLoading: deliveriesLoading } = useQuery<Delivery[]>({
    queryKey: ['deliveries', 'in-production'],
    queryFn: () => deliveriesApi.getAll({ status: 'in_progress' }),
  });

  // Mutation do bulk update statusu zleceń
  const bulkUpdateMutation = useMutation({
    mutationFn: (updateData: BulkUpdateStatusData) => ordersApi.bulkUpdateStatus(updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setSelectedOrderIds(new Set());
      setSelectedDeliveryIds(new Set());
    },
  });

  // Mutation do zakończenia wszystkich zleceń w dostawie
  const completeDeliveryMutation = useMutation({
    mutationFn: ({ deliveryId, date }: { deliveryId: number; date: string }) =>
      deliveriesApi.completeAllOrders(deliveryId, { productionDate: date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setSelectedDeliveryIds(new Set());
    },
  });

  // Obsługa zaznaczania pojedynczego zlecenia
  const handleOrderToggle = (orderId: number, checked: boolean) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  // Obsługa zaznaczania całej dostawy
  const handleDeliveryToggle = (deliveryId: number, checked: boolean) => {
    setSelectedDeliveryIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(deliveryId);
      } else {
        newSet.delete(deliveryId);
      }
      return newSet;
    });
  };

  // Obsługa zakończenia zleceń
  const handleCompleteOrders = async () => {
    // Zakończ pojedyncze zlecenia
    if (selectedOrderIds.size > 0) {
      await bulkUpdateMutation.mutateAsync({
        orderIds: Array.from(selectedOrderIds),
        status: 'completed',
        productionDate,
      });
    }

    // Zakończ dostawy (wszystkie zlecenia w dostawie)
    if (selectedDeliveryIds.size > 0) {
      await Promise.all(
        Array.from(selectedDeliveryIds).map((deliveryId) =>
          completeDeliveryMutation.mutateAsync({ deliveryId, date: productionDate })
        )
      );
    }
  };

  // Filtrowanie zleceń - tylko te, które NIE są przypisane do żadnej dostawy w produkcji
  const standaloneOrders = React.useMemo(() => {
    // Zbierz wszystkie orderId z dostaw w produkcji
    const deliveryOrderIds = new Set<number>();
    deliveriesData.forEach((delivery) => {
      delivery.deliveryOrders?.forEach((dOrder) => {
        deliveryOrderIds.add(dOrder.order.id);
      });
    });

    // Zwróć tylko zlecenia, które NIE są w dostawach
    return ordersData.filter((order) => !deliveryOrderIds.has(order.id));
  }, [ordersData, deliveriesData]);

  const isLoading = ordersLoading || deliveriesLoading;
  const totalSelected = selectedOrderIds.size + selectedDeliveryIds.size;
  const hasSelection = totalSelected > 0;
  const isPending = bulkUpdateMutation.isPending || completeDeliveryMutation.isPending;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Ładowanie zleceń w produkcji...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Nagłówek z licznikiem, datą i przyciskiem akcji */}
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

      {/* Success notification */}
      {(bulkUpdateMutation.isSuccess || completeDeliveryMutation.isSuccess) && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Pomyślnie oznaczono zlecenia jako wyprodukowane
          </AlertDescription>
        </Alert>
      )}

      {/* Error notification */}
      {(bulkUpdateMutation.isError || completeDeliveryMutation.isError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Błąd podczas zapisywania. Spróbuj ponownie.
          </AlertDescription>
        </Alert>
      )}

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
              {deliveriesData.map((delivery) => (
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
              {standaloneOrders.map((order) => (
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
    </div>
  );
};

export default CompleteOrdersTab;
