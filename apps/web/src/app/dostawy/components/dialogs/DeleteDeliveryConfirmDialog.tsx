'use client';

import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog';
import { formatDate } from '@/lib/utils';
import { Calendar, Package } from 'lucide-react';
import type { Delivery } from '@/types/delivery';

interface DeleteDeliveryConfirmDialogProps {
  delivery: Delivery | null;
  onClose: () => void;
  onConfirm: (id: number) => void;
  isPending: boolean;
}

export function DeleteDeliveryConfirmDialog({
  delivery,
  onClose,
  onConfirm,
  isPending,
}: DeleteDeliveryConfirmDialogProps) {
  const confirmText = 'USUŃ';

  if (!delivery) return null;

  const orderCount = delivery.deliveryOrders?.length || 0;
  const hasOrders = orderCount > 0;

  return (
    <DestructiveActionDialog
      open={!!delivery}
      onOpenChange={(open) => !open && onClose()}
      title={`Usuwanie dostawy - ${formatDate(delivery.deliveryDate)}`}
      description="Ta akcja trwale usunie dostawę z systemu"
      actionType="delete"
      confirmText={confirmText}
      isLoading={isPending}
      consequences={[
        'Dostawa zostanie trwale usunięta z systemu',
        hasOrders ? `${orderCount} zlecenie(ń) zostanie odpiętych od dostawy` : 'Brak przypisanych zleceń',
        'Odpięte zlecenia wrócą do listy nieprzypisanych',
        'Historia powiązanych zleceń pozostanie zachowana',
        'Tej operacji nie można cofnąć',
      ]}
      affectedItems={
        hasOrders
          ? delivery.deliveryOrders?.map((dOrder) => ({
              id: dOrder.order?.id?.toString() || '',
              label: `Zlecenie #${dOrder.order?.orderNumber || 'N/A'}`,
            }))
          : undefined
      }
      previewData={
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-600">Data dostawy</p>
                <p className="text-lg font-semibold">{formatDate(delivery.deliveryDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-600" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-600">Przypisane zlecenia</p>
                <p className="text-lg font-semibold">{orderCount}</p>
              </div>
            </div>
          </div>

          {delivery.notes && (
            <div className="pt-2 border-t">
              <p className="text-xs text-slate-600 mb-1">Notatki:</p>
              <p className="text-sm text-slate-700">{delivery.notes}</p>
            </div>
          )}

          {hasOrders && delivery.deliveryOrders && (
            <div className="pt-2 border-t">
              <p className="text-xs text-slate-600 mb-1">Zlecenia do odpięcia:</p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {delivery.deliveryOrders.slice(0, 10).map((dOrder) => (
                  <span
                    key={dOrder.order.id}
                    className="text-xs px-2 py-1 bg-slate-100 rounded font-mono"
                  >
                    {dOrder.order?.orderNumber || 'N/A'}
                  </span>
                ))}
                {delivery.deliveryOrders.length > 10 && (
                  <span className="text-xs px-2 py-1 bg-slate-200 rounded">
                    +{delivery.deliveryOrders.length - 10} więcej
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      }
      onConfirm={() => onConfirm(delivery.id)}
    />
  );
}

// Legacy component for backward compatibility
interface LegacyDeleteConfirmDialogProps {
  deliveryId: number | null;
  onClose: () => void;
  onConfirm: (id: number) => void;
  isPending: boolean;
}

export function LegacyDeleteConfirmDialog({
  deliveryId,
  onClose,
  onConfirm,
  isPending,
}: LegacyDeleteConfirmDialogProps) {
  return (
    <DestructiveActionDialog
      open={!!deliveryId}
      onOpenChange={(open) => !open && onClose()}
      title="Potwierdź usunięcie"
      description="Czy na pewno chcesz usunąć tę dostawę? Tej operacji nie można cofnąć."
      actionType="delete"
      confirmText="USUŃ"
      isLoading={isPending}
      consequences={[
        'Dostawa zostanie trwale usunięta',
        'Tej operacji nie można cofnąć',
      ]}
      onConfirm={() => { if (deliveryId) onConfirm(deliveryId); }}
    />
  );
}
