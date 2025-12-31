'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DeliveryCheckbox } from './DeliveryCheckbox';
import { OrderCheckbox } from './OrderCheckbox';
import { ordersApi } from '@/lib/api';
import type { ForProductionData, BulkUpdateStatusData } from '@/types/manager';
import { Loader2, AlertCircle, CheckCircle2, Calendar, Package, Clock } from 'lucide-react';

/**
 * Zakładka "Dodaj do produkcji" - Panel Kierownika
 *
 * Wyświetla 4 sekcje:
 * 1. Najbliższe dostawy AKROBUD (checkbox na całą dostawę lub pojedyncze zlecenia)
 * 2. Zlecenia przeterminowane (deadline < dzisiaj)
 * 3. Zlecenia na najbliższe 2 tygodnie (deadline w ciągu 14 dni)
 * 4. Zlecenia prywatne (nie przypisane do żadnej dostawy)
 *
 * Kierownik może zaznaczyć wiele zleceń/dostaw i zmienić status na "in_progress"
 */
export const AddToProductionTab: React.FC = () => {
  const queryClient = useQueryClient();

  // State dla zaznaczonych zleceń i dostaw
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<number>>(new Set());

  // Fetch danych do produkcji
  const { data, isLoading, error } = useQuery<ForProductionData>({
    queryKey: ['orders', 'for-production'],
    queryFn: () => ordersApi.getForProduction(),
  });

  // Mutation do bulk update statusu
  const bulkUpdateMutation = useMutation({
    mutationFn: (updateData: BulkUpdateStatusData) => ordersApi.bulkUpdateStatus(updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setSelectedOrderIds(new Set());
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

    // Zaznacz/odznacz wszystkie zlecenia w dostawie
    const delivery = data?.upcomingDeliveries.find((d) => d.id === deliveryId);
    if (delivery?.deliveryOrders) {
      const orderIds = delivery.deliveryOrders.map((dOrder) => dOrder.order.id);
      setSelectedOrderIds((prev) => {
        const newSet = new Set(prev);
        if (checked) {
          orderIds.forEach((id) => newSet.add(id));
        } else {
          orderIds.forEach((id) => newSet.delete(id));
        }
        return newSet;
      });
    }
  };

  // Obsługa dodania do produkcji
  const handleAddToProduction = () => {
    const today = new Date().toISOString().split('T')[0];
    bulkUpdateMutation.mutate({
      orderIds: Array.from(selectedOrderIds),
      status: 'in_progress',
      productionDate: today,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Ładowanie zleceń...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Błąd podczas ładowania zleceń: {error instanceof Error ? error.message : 'Nieznany błąd'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalSelected = selectedOrderIds.size;
  const hasSelection = totalSelected > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Nagłówek z licznikiem i przyciskiem akcji */}
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

      {/* Success notification */}
      {bulkUpdateMutation.isSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Pomyślnie dodano {bulkUpdateMutation.data?.length || 0} zleceń do produkcji
          </AlertDescription>
        </Alert>
      )}

      {/* Error notification */}
      {bulkUpdateMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {bulkUpdateMutation.error instanceof Error
              ? bulkUpdateMutation.error.message
              : 'Błąd podczas dodawania do produkcji'}
          </AlertDescription>
        </Alert>
      )}

      {/* Sekcja 1: Najbliższe dostawy AKROBUD */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <CardTitle>Najbliższe dostawy AKROBUD</CardTitle>
            <Badge variant="outline">
              {data?.upcomingDeliveries.length || 0} dostaw
            </Badge>
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
                  onChange={handleDeliveryToggle}
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
            <Badge variant="destructive">
              {data?.overdueOrders.length || 0} zleceń
            </Badge>
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
            <CardTitle>Zlecenia na najbliższe 2 tygodnie</CardTitle>
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
    </div>
  );
};

export default AddToProductionTab;
