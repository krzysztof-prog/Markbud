'use client';

import { useRouter } from 'next/navigation';
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
import {
  CheckCircle2,
  FileText,
  Trash2,
  Plus,
  X,
  Package,
  // ScanLine, // nieużywane obecnie
} from 'lucide-react';
import { CheckLabelsButton } from '@/features/label-checks';
import {
  DraggableOrderWithContextMenu,
  UnassignedOrdersDropzone,
} from '../../DragDropComponents';
import type { Delivery } from '@/types/delivery';

interface DeliveryDetailsDialogProps {
  delivery: Delivery | null;
  onClose: () => void;
  onDelete: (delivery: Delivery) => void;
  onShowCompleteDialog: () => void;
  onShowAddItemDialog: () => void;
  onViewOrder: (orderId: number, orderNumber: string) => void;
  onRemoveOrder: (deliveryId: number, orderId: number) => void;
  onMoveOrder: (sourceDeliveryId: number, targetDeliveryId: number, orderId: number) => void;
  onDeleteItem: (deliveryId: number, itemId: number) => void;
  downloadProtocol: (deliveryId: number) => void;
  isDownloading: boolean;
  availableDeliveries: Delivery[];
}

export function DeliveryDetailsDialog({
  delivery,
  onClose,
  onDelete,
  onShowCompleteDialog,
  onShowAddItemDialog,
  onViewOrder,
  onRemoveOrder,
  onMoveOrder,
  onDeleteItem,
  downloadProtocol,
  isDownloading,
  availableDeliveries,
}: DeliveryDetailsDialogProps) {
  const router = useRouter();

  if (!delivery) return null;

  const hasOrders = delivery.deliveryOrders && delivery.deliveryOrders.length > 0;

  return (
    <Dialog open={!!delivery} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Szczegoly dostawy</DialogTitle>
        </DialogHeader>

        {/* Action buttons at top */}
        <div className="flex flex-wrap gap-2 pb-4 border-b">
          {hasOrders && (
            <>
              <Button variant="default" size="sm" onClick={onShowCompleteDialog}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Zlecenia zakonczone
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/dostawy/${delivery.id}/optymalizacja`)}
              >
                <Package className="h-4 w-4 mr-2" />
                Optymalizuj palety
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadProtocol(delivery.id)}
                disabled={isDownloading}
              >
                <FileText className="h-4 w-4 mr-2" />
                {isDownloading ? 'Generuje...' : 'Protokol odbioru'}
              </Button>
              <CheckLabelsButton deliveryId={delivery.id} />
            </>
          )}
          <Button variant="destructive" size="sm" onClick={() => onDelete(delivery)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Usun dostawe
          </Button>
        </div>

        {/* Dialog content with scrolling */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-4">
            {/* Delivery info grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Data</p>
                <p className="font-medium">{formatDate(delivery.deliveryDate)}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Status</p>
                <Badge variant={delivery.status === 'completed' ? 'success' : 'secondary'}>
                  {delivery.status === 'planned'
                    ? 'Zaplanowana'
                    : delivery.status === 'in_progress'
                    ? 'W trakcie'
                    : delivery.status === 'completed'
                    ? 'Zrealizowana'
                    : delivery.status}
                </Badge>
              </div>

              {delivery.deliveryNumber && (
                <div>
                  <p className="text-sm text-slate-500">Numer dostawy</p>
                  <p className="font-medium text-lg">{delivery.deliveryNumber}</p>
                </div>
              )}

              {delivery.notes && (
                <div className="col-span-2">
                  <p className="text-sm text-slate-500">Notatki</p>
                  <p className="text-sm">{delivery.notes}</p>
                </div>
              )}
            </div>

            {/* Orders section */}
            <div>
              <p className="text-sm text-slate-500 mb-2">
                Zlecenia ({delivery.deliveryOrders?.length || 0})
              </p>
              {hasOrders ? (
                <UnassignedOrdersDropzone>
                  <div className="space-y-2">
                    {delivery.deliveryOrders?.map((item) => (
                      <DraggableOrderWithContextMenu
                        key={item.order.id}
                        order={item.order}
                        deliveryId={delivery.id}
                        onView={() => onViewOrder(item.order.id, item.order.orderNumber)}
                        onRemove={() => onRemoveOrder(delivery.id, item.order.id)}
                        availableDeliveries={availableDeliveries.map((d: Delivery) => ({
                          id: d.id,
                          deliveryDate: d.deliveryDate,
                          deliveryNumber: d.deliveryNumber,
                        }))}
                        onMoveToDelivery={(orderId, targetDeliveryId) => {
                          if (targetDeliveryId) {
                            onMoveOrder(delivery.id, targetDeliveryId, orderId);
                          }
                        }}
                      />
                    ))}
                  </div>
                </UnassignedOrdersDropzone>
              ) : (
                <p className="text-sm text-slate-400">Brak zlecen</p>
              )}
            </div>

            {/* Additional items section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500">
                  Dodatkowe artykuly ({delivery.deliveryItems?.length || 0})
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onShowAddItemDialog}
                  className="h-6 px-2"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {delivery.deliveryItems && delivery.deliveryItems.length > 0 ? (
                <div className="space-y-2">
                  {delivery.deliveryItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded bg-green-50 text-sm"
                    >
                      <div>
                        <span className="font-medium">{item.quantity}x</span>{' '}
                        <span className="text-slate-600">{item.description}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {item.itemType === 'glass'
                            ? 'Szyby'
                            : item.itemType === 'sash'
                            ? 'Skrzydla'
                            : item.itemType === 'frame'
                            ? 'Ramy'
                            : 'Inne'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteItem(delivery.id, item.id)}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Brak dodatkowych artykulow</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer with close button */}
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Zamknij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
