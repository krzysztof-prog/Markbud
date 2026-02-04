'use client';

/**
 * DeliveryAlerts - Komponent wyświetlający alerty o zablokowanych dostawach
 *
 * Nasłuchuje window events (emitowanych przez useRealtimeSync) i wyświetla
 * powiadomienia o dostawach które są zablokowane i mają być wysłane jutro.
 *
 * Używany globalnie w aplikacji (np. w layout).
 *
 * UWAGA: Ten komponent NIE tworzy własnego połączenia WebSocket.
 * Zamiast tego nasłuchuje eventów z useRealtimeSync który jest singleton w providers.tsx
 */

import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, X, Truck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface DeliveryAlertData {
  type: 'blocked_tomorrow';
  deliveryId: number;
  deliveryNumber: string | null;
  deliveryDate: string;
  blockingCount: number;
  blockingReasons: string[];
  timestamp: string;
}

interface AlertState extends DeliveryAlertData {
  dismissed: boolean;
}

export function DeliveryAlerts() {
  const [alerts, setAlerts] = useState<AlertState[]>([]);

  // Nasłuchuj window events emitowanych przez useRealtimeSync
  useEffect(() => {
    const handleDeliveryAlert = (event: CustomEvent<{ type: string; data: DeliveryAlertData }>) => {
      const eventData = event.detail.data;

      // Sprawdź czy to alert o zablokowanej dostawie na jutro
      if (eventData.type === 'blocked_tomorrow') {
        // Sprawdź czy alert już istnieje
        setAlerts((prev) => {
          const exists = prev.some((a) => a.deliveryId === eventData.deliveryId && !a.dismissed);
          if (exists) return prev;

          return [...prev, { ...eventData, dismissed: false }];
        });
      }
    };

    window.addEventListener('delivery-alert', handleDeliveryAlert as EventListener);
    return () => {
      window.removeEventListener('delivery-alert', handleDeliveryAlert as EventListener);
    };
  }, []);

  // Zamknij alert
  const dismissAlert = useCallback((deliveryId: number) => {
    setAlerts((prev) =>
      prev.map((a) => (a.deliveryId === deliveryId ? { ...a, dismissed: true } : a))
    );

    // Usuń po animacji
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.deliveryId !== deliveryId));
    }, 300);
  }, []);

  // Zamknij wszystkie
  const dismissAll = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, dismissed: true })));
    setTimeout(() => setAlerts([]), 300);
  }, []);

  // Filtruj widoczne alerty
  const visibleAlerts = alerts.filter((a) => !a.dismissed);

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {/* Przycisk "Zamknij wszystkie" gdy więcej niż 1 alert */}
      {visibleAlerts.length > 1 && (
        <div className="flex justify-end mb-1">
          <Button variant="ghost" size="sm" onClick={dismissAll} className="text-xs">
            Zamknij wszystkie ({visibleAlerts.length})
          </Button>
        </div>
      )}

      {/* Lista alertów */}
      {visibleAlerts.map((alert) => (
        <Alert
          key={alert.deliveryId}
          variant="destructive"
          className="shadow-lg border-red-400 bg-red-50 animate-in slide-in-from-right-5"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <AlertTitle className="flex items-center justify-between text-red-800">
                <span className="flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  Dostawa {alert.deliveryNumber || `#${alert.deliveryId}`} zablokowana!
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(alert.deliveryId)}
                  className="h-6 w-6 p-0 hover:bg-red-200"
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </AlertTitle>
              <AlertDescription className="text-xs text-red-700 mt-1">
                <p className="font-medium mb-1">
                  Dostawa na jutro (
                  {new Date(alert.deliveryDate).toLocaleDateString('pl-PL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                  ) ma {alert.blockingCount} blokad:
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  {alert.blockingReasons.slice(0, 3).map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                  {alert.blockingReasons.length > 3 && (
                    <li className="text-red-500 italic">
                      ...i {alert.blockingReasons.length - 3} więcej
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
}

export default DeliveryAlerts;
