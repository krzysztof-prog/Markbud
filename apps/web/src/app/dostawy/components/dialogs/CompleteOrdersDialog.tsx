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
