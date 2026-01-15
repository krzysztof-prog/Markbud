'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { Truck } from 'lucide-react';
import type { Delivery } from '@/types/delivery';

interface AssignOrderDialogProps {
  orderToAssign: { id: number; orderNumber: string } | null;
  onClose: () => void;
  deliveries: Delivery[];
  onAssign: (deliveryId: number, orderId: number) => void;
  isPending: boolean;
}

export function AssignOrderDialog({
  orderToAssign,
  onClose,
  deliveries,
  onAssign,
  isPending,
}: AssignOrderDialogProps) {
  return (
    <Dialog open={!!orderToAssign} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj zlecenie do dostawy</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-slate-500 mb-4">
            Wybierz dostawę dla zlecenia{' '}
            <span className="font-mono font-medium">{orderToAssign?.orderNumber}</span>:
          </p>
          {deliveries.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {deliveries.map((delivery: Delivery) => (
                <button
                  key={delivery.id}
                  className="w-full p-3 rounded-lg border bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                  onClick={() => {
                    if (orderToAssign) {
                      onAssign(delivery.id, orderToAssign.id);
                    }
                  }}
                  disabled={isPending}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{formatDate(delivery.deliveryDate)}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {delivery.deliveryOrders?.length || 0} zleceń
                    </Badge>
                  </div>
                  {delivery.notes && (
                    <p className="text-xs text-slate-500 mt-1 ml-6">{delivery.notes}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              Brak dostaw w tym miesiącu. Utwórz nową dostawę klikając na dzień w kalendarzu.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
