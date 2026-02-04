'use client';

/**
 * BlockedItemsAlert - Sekcja "Dlaczego 🔴?" w widoku dostaw
 *
 * Wyświetla powody blokad/ostrzeżeń dla dostawy, gdy status nie jest 'ready'.
 * Pobiera dane z API readiness i pokazuje listę blokad/ostrzeżeń.
 */

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { deliveriesApi, type ReadinessResult } from '@/lib/api';

interface BlockedItemsAlertProps {
  deliveryId: number;
}

export function BlockedItemsAlert({ deliveryId }: BlockedItemsAlertProps) {
  const { data } = useQuery<ReadinessResult>({
    queryKey: ['delivery-readiness', deliveryId],
    queryFn: () => deliveriesApi.getReadiness(deliveryId),
    staleTime: 60000, // 1 minuta cache
  });

  // Nie pokazuj nic gdy brak danych lub status OK
  if (!data || data.status === 'ready' || data.status === 'pending') {
    return null;
  }

  const isBlocked = data.status === 'blocked';
  const items = isBlocked ? data.blocking : data.warnings;

  // Nie pokazuj gdy brak elementów do wyświetlenia
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Alert
      variant={isBlocked ? 'destructive' : 'default'}
      className={isBlocked ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'}
    >
      <div className="flex items-center gap-2">
        {isBlocked ? (
          <XCircle className="h-4 w-4 text-red-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        )}
        <AlertTitle
          className={`text-sm font-medium ${isBlocked ? 'text-red-800' : 'text-yellow-800'}`}
        >
          {isBlocked
            ? `Dostawa zablokowana (${items.length})`
            : `Ostrzeżenia (${items.length})`}
        </AlertTitle>
      </div>
      <AlertDescription className={isBlocked ? 'text-red-700' : 'text-yellow-700'}>
        <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
          {items.map((item, idx) => (
            <li key={idx}>{item.message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export default BlockedItemsAlert;
