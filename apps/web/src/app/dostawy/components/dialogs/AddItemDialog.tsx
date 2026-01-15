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
