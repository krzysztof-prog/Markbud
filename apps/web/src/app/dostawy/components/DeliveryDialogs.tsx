'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog';
import { formatDate, cn } from '@/lib/utils';
import {
  Truck,
  Calendar,
  Package,
  CheckCircle2,
  FileText,
  Trash2,
  Plus,
  X,
} from 'lucide-react';
import {
  DraggableOrderWithContextMenu,
  UnassignedOrdersDropzone,
} from '../DragDropComponents';
import type { Delivery } from '@/types/delivery';

interface NewDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newDeliveryDate: string;
  setNewDeliveryDate: (date: string) => void;
  newDeliveryNotes: string;
  setNewDeliveryNotes: (notes: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  errors: { deliveryDate?: string };
  touched: { deliveryDate?: boolean };
  onValidate: (field: string, value: string) => void;
  onTouch: (field: string) => void;
  onReset: () => void;
}

export function NewDeliveryDialog({
  open,
  onOpenChange,
  newDeliveryDate,
  setNewDeliveryDate,
  newDeliveryNotes,
  setNewDeliveryNotes,
  onSubmit,
  isPending,
  errors,
  touched,
  onValidate,
  onTouch,
  onReset,
}: NewDeliveryDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          setNewDeliveryDate('');
          setNewDeliveryNotes('');
          onReset();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowa dostawa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium block mb-1">
              Data dostawy <span className="text-red-600">*</span>
            </label>
            <Input
              type="date"
              value={newDeliveryDate}
              onChange={(e) => {
                setNewDeliveryDate(e.target.value);
                onValidate('deliveryDate', e.target.value);
              }}
              onBlur={() => onTouch('deliveryDate')}
              className={cn(
                touched.deliveryDate && errors.deliveryDate && 'border-red-500 focus-visible:ring-red-500'
              )}
              aria-invalid={touched.deliveryDate && !!errors.deliveryDate}
              aria-describedby={
                touched.deliveryDate && errors.deliveryDate ? 'delivery-date-error' : undefined
              }
            />
            {touched.deliveryDate && errors.deliveryDate && (
              <p id="delivery-date-error" className="text-sm text-red-600 mt-1">
                {errors.deliveryDate}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Notatki (opcjonalne)</label>
            <Input
              value={newDeliveryNotes}
              onChange={(e) => setNewDeliveryNotes(e.target.value)}
              placeholder="np. Transport własny"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Anuluj
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? 'Tworzę...' : 'Utwórz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DestructiveDeleteDeliveryDialogProps {
  delivery: Delivery | null;
  onClose: () => void;
  onConfirm: (id: number) => void;
  isPending: boolean;
}

export function DestructiveDeleteDeliveryDialog({
  delivery,
  onClose,
  onConfirm,
  isPending,
}: DestructiveDeleteDeliveryDialogProps) {
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
interface DeleteConfirmDialogProps {
  deliveryId: number | null;
  onClose: () => void;
  onConfirm: (id: number) => void;
  isPending: boolean;
}

export function DeleteConfirmDialog({
  deliveryId,
  onClose,
  onConfirm,
  isPending,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={!!deliveryId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Potwierdź usunięcie</DialogTitle>
        </DialogHeader>
        <p className="py-4">Czy na pewno chcesz usunąć tę dostawę? Tej operacji nie można cofnąć.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={() => deliveryId && onConfirm(deliveryId)}
            disabled={isPending}
          >
            Usuń
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newItem: { itemType: string; description: string; quantity: number };
  setNewItem: (item: { itemType: string; description: string; quantity: number }) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function AddItemDialog({
  open,
  onOpenChange,
  newItem,
  setNewItem,
  onSubmit,
  isPending,
}: AddItemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj dodatkowy artykuł</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium block mb-1">Typ artykułu</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={newItem.itemType}
              onChange={(e) => setNewItem({ ...newItem, itemType: e.target.value })}
            >
              <option value="glass">Szyby</option>
              <option value="sash">Skrzydła</option>
              <option value="frame">Ramy</option>
              <option value="other">Inne</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Opis</label>
            <Input
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              placeholder="np. Szyby hartowane 6mm"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Ilość</label>
            <Input
              type="number"
              min="1"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={onSubmit} disabled={!newItem.description || isPending}>
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CompleteOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productionDate: string;
  setProductionDate: (date: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function CompleteOrdersDialog({
  open,
  onOpenChange,
  productionDate,
  setProductionDate,
  onSubmit,
  isPending,
}: CompleteOrdersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Oznacz zlecenia jako zakończone</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-slate-500 mb-4">
            Wszystkie zlecenia z tej dostawy zostaną oznaczone jako wyprodukowane z podaną datą.
          </p>
          <div>
            <label className="text-sm font-medium block mb-1">Data wyprodukowania</label>
            <Input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={onSubmit} disabled={!productionDate || isPending}>
            Zakończ zlecenia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delivery Details Dialog - shows full details of a selected delivery
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
