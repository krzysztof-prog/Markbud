'use client';

import React from 'react';
import { AlertTriangle, Tag, Euro, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import { useAlerts, useGlassSuffixConflicts, useMarkOrderGlassDelivered } from '../api/mojaPracaApi';
import type { OrderWithoutPrice, DeliveryWithLabelIssues, GlassSuffixConflict } from '../types';

/**
 * Sekcja alertów na stronie "Moja Praca"
 * Wyświetla:
 * 1. Zlecenia Akrobud w produkcji bez cen
 * 2. Dostawy z problemami etykiet
 *
 * Widoczne dla: autora zleceń + admin + kierownik
 */
export function AlertsSection() {
  const { data: alerts, isLoading } = useAlerts();
  const { data: glassSuffixConflicts = [] } = useGlassSuffixConflicts();

  const hasAnyAlert = alerts?.hasAlerts || glassSuffixConflicts.length > 0;

  // Nie pokazuj nic podczas ładowania lub gdy brak alertów
  if (isLoading || !hasAnyAlert) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Alerty o zleceniach bez cen */}
      {alerts && alerts.ordersWithoutPrice.length > 0 && (
        <OrdersWithoutPriceAlert orders={alerts.ordersWithoutPrice} />
      )}

      {/* Alerty o problemach z etykietami */}
      {alerts && alerts.deliveriesWithLabelIssues.length > 0 && (
        <LabelIssuesAlert deliveries={alerts.deliveriesWithLabelIssues} />
      )}

      {/* Konflikty szyb z sufiksem */}
      {glassSuffixConflicts.length > 0 && (
        <GlassSuffixConflictsAlert conflicts={glassSuffixConflicts} />
      )}
    </div>
  );
}

/**
 * Alert o zleceniach Akrobud bez cen
 */
function OrdersWithoutPriceAlert({ orders }: { orders: OrderWithoutPrice[] }) {
  return (
    <Alert variant="destructive" className="border-orange-500 bg-orange-50">
      <Euro className="h-4 w-4" />
      <AlertTitle className="text-orange-800">
        Zlecenia Akrobud w produkcji bez cen ({orders.length})
      </AlertTitle>
      <AlertDescription className="text-orange-700">
        <ul className="mt-2 space-y-1 list-disc list-inside">
          {orders.map((order) => (
            <li key={order.id} className="text-sm">
              <span className="font-medium">{order.orderNumber}</span>
              {order.documentAuthor && (
                <span className="text-orange-600 ml-2">
                  ({order.documentAuthor})
                </span>
              )}
              {order.deliveryDate && (
                <span className="text-orange-500 ml-2 text-xs">
                  dostawa: {formatDate(order.deliveryDate)}
                  {order.deliveryNumber && ` (${order.deliveryNumber})`}
                </span>
              )}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Alert o problemach z etykietami
 */
function LabelIssuesAlert({ deliveries }: { deliveries: DeliveryWithLabelIssues[] }) {
  return (
    <Alert variant="destructive" className="border-red-500 bg-red-50">
      <Tag className="h-4 w-4" />
      <AlertTitle className="text-red-800">
        Dostawy z problemami etykiet ({deliveries.length})
      </AlertTitle>
      <AlertDescription className="text-red-700">
        <ul className="mt-2 space-y-2">
          {deliveries.map((delivery) => (
            <li key={delivery.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  Dostawa {delivery.deliveryNumber || `#${delivery.id}`}
                </span>
                <span className="text-red-500">
                  ({formatDate(delivery.deliveryDate)})
                </span>
                <span className="text-xs text-red-400">
                  {delivery.akrobudOrdersCount} zleceń Akrobud
                </span>
              </div>
              <ul className="ml-4 mt-1 text-sm text-red-600 list-disc list-inside">
                {delivery.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Alert o zleceniach z sufiksem gdzie szyby zamówione ale niedostarczone
 */
function GlassSuffixConflictsAlert({ conflicts }: { conflicts: GlassSuffixConflict[] }) {
  const markDeliveredMutation = useMarkOrderGlassDelivered();
  const { toast } = useToast();

  const handleConfirm = (orderId: number, orderNumber: string) => {
    markDeliveredMutation.mutate(orderId, {
      onSuccess: () => {
        toast({
          title: 'Potwierdzono dostawę',
          description: `Szyby dla ${orderNumber} oznaczone jako dostarczone`,
        });
      },
      onError: (error) => {
        toast({
          title: 'Błąd',
          description: error instanceof Error ? error.message : 'Nie udało się potwierdzić dostawy',
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <Alert className="border-orange-400 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">
        Szyby po terminie dostawy ({conflicts.length})
      </AlertTitle>
      <AlertDescription className="text-orange-700">
        <p className="text-xs mb-2">
          Zlecenia z sufiksem — szyby mogły przyjść na zlecenie bazowe (bez sufiksu).
        </p>
        <ul className="space-y-2">
          {conflicts.map((c) => {
            const missing = c.orderedGlassCount - c.deliveredGlassCount;
            return (
              <li key={c.orderId} className="text-sm border-b border-orange-200 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-orange-900">{c.orderNumber}</span>
                      {c.client && (
                        <span className="text-orange-700 text-xs">{c.client}</span>
                      )}
                    </div>
                    <div className="text-xs text-orange-600 mt-0.5">
                      <span>
                        W zleceniu: {c.totalGlasses} szyb | Zamówiono: {c.orderedGlassCount} | Przyszło: {c.deliveredGlassCount}
                      </span>
                      <span className="font-semibold text-red-600 ml-1">
                        (brak {missing})
                      </span>
                      <span className="ml-2">
                        → mogły przyjść do <span className="font-medium">{c.baseOrderNumber}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handleConfirm(c.orderId, c.orderNumber)}
                      disabled={markDeliveredMutation.isPending}
                      className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                      title={`Potwierdź że szyby dla ${c.orderNumber} przyszły (np. do ${c.baseOrderNumber})`}
                    >
                      {markDeliveredMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                      Potwierdź dostawę
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Formatuje datę ISO do formatu DD.MM.YYYY
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default AlertsSection;
