'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface CreateDeliveryDialogProps {
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
  onValidate: (field: 'deliveryDate', value: string) => boolean;
  onTouch: (field: 'deliveryDate') => void;
  onReset: () => void;
}

export function CreateDeliveryDialog({
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
}: CreateDeliveryDialogProps) {
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
              autoFocus
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
