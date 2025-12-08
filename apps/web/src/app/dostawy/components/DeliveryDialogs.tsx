'use client';

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
import { formatDate, cn } from '@/lib/utils';
import { Truck } from 'lucide-react';
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
