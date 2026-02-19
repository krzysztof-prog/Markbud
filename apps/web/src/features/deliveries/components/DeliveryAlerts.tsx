'use client';

/**
 * DeliveryAlerts - Komponent wyświetlający alerty gotowości najbliższych dostaw
 *
 * Pokazuje tylko negatywne wyniki: brak szyb, problemy z etykietami.
 * Nie pokazuje pozytywnych komunikatów.
 *
 * Nasłuchuje window events (emitowanych przez useRealtimeSync).
 */

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, X, Truck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface DeliveryIssue {
  deliveryId: number;
  deliveryNumber: string | null;
  deliveryDate: string;
  issues: string[];
}

interface ReadinessAlertData {
  type: 'readiness_issues';
  deliveries: DeliveryIssue[];
  timestamp: string;
}

export function DeliveryAlerts() {
  const [deliveries, setDeliveries] = useState<DeliveryIssue[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleDeliveryAlert = (event: CustomEvent<{ type: string; data: ReadinessAlertData }>) => {
      const eventData = event.detail.data;

      if (eventData.type === 'readiness_issues') {
        // Pokaż tylko dostawy z problemami
        setDeliveries(eventData.deliveries);
        // Resetuj dismissed przy nowych danych
        if (eventData.deliveries.length > 0) {
          setDismissed(false);
        }
      }
    };

    window.addEventListener('delivery-alert', handleDeliveryAlert as EventListener);
    return () => {
      window.removeEventListener('delivery-alert', handleDeliveryAlert as EventListener);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (dismissed || deliveries.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert className="shadow-lg border-amber-400 bg-amber-50">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <AlertTitle className="flex items-center justify-between text-amber-800">
              <span className="flex items-center gap-1 text-sm">
                <Truck className="h-4 w-4" />
                Gotowość dostaw
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismiss}
                className="h-6 w-6 p-0 hover:bg-amber-200 shrink-0"
              >
                <X className="h-4 w-4 text-amber-600" />
              </Button>
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-700 mt-1.5 space-y-1.5">
              {deliveries.map((d, idx) => (
                <div
                  key={d.deliveryId}
                  className={idx > 0 ? 'border-t border-amber-200 pt-1.5' : ''}
                >
                  <p className="font-semibold text-amber-800">
                    {d.deliveryNumber || `#${d.deliveryId}`}
                    {' — '}
                    {new Date(d.deliveryDate).toLocaleDateString('pl-PL', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                  <ul className="list-disc list-inside mt-0.5">
                    {d.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  );
}

export default DeliveryAlerts;