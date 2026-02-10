'use client';

import React from 'react';
import { AlertTriangle, Tag, Euro } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAlerts } from '../api/mojaPracaApi';
import type { OrderWithoutPrice, DeliveryWithLabelIssues } from '../types';

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

  // Nie pokazuj nic podczas ładowania lub gdy brak alertów
  if (isLoading || !alerts?.hasAlerts) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Alerty o zleceniach bez cen */}
      {alerts.ordersWithoutPrice.length > 0 && (
        <OrdersWithoutPriceAlert orders={alerts.ordersWithoutPrice} />
      )}

      {/* Alerty o problemach z etykietami */}
      {alerts.deliveriesWithLabelIssues.length > 0 && (
        <LabelIssuesAlert deliveries={alerts.deliveriesWithLabelIssues} />
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
              {order.productionDate && (
                <span className="text-orange-500 ml-2 text-xs">
                  prod: {formatDate(order.productionDate)}
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
              <ul className="ml-4 mt-1 text-xs text-red-600 list-disc list-inside">
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
