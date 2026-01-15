'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PalletStockEntry } from '../types/index';
import { PALLET_TYPE_LABELS } from '../types/index';

interface CorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: PalletStockEntry | null;
  onSave: (newMorningStock: number, reason: string) => void;
  isPending: boolean;
}

/**
 * Dialog do korekty stanu porannego palety
 * Wymaga podania nowego stanu oraz powodu korekty (min 3 znaki)
 */
export const CorrectionDialog: React.FC<CorrectionDialogProps> = ({
  open,
  onOpenChange,
  entry,
  onSave,
  isPending,
}) => {
  const [newStock, setNewStock] = useState<number>(0);
  const [reason, setReason] = useState<string>('');

  // Reset stanu gdy dialog się otwiera z nowym entry
  useEffect(() => {
    if (open && entry) {
      setNewStock(entry.morningStock);
      setReason(entry.morningNote || '');
    }
  }, [open, entry]);

  // Walidacja powodu - min 3 znaki
  const isReasonValid = reason.trim().length >= 3;
  const isStockValid = newStock >= 0;
  const canSave = isReasonValid && isStockValid && !isPending;

  const handleSave = () => {
    if (canSave) {
      onSave(newStock, reason.trim());
    }
  };

  if (!entry) return null;

  const typeName = PALLET_TYPE_LABELS[entry.type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Korekta stanu porannego
          </DialogTitle>
          <DialogDescription>
            Korekta stanu porannego dla palety: <strong>{typeName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informacja o wyliczonym stanie */}
          <div className="bg-muted/50 rounded-md p-3 text-sm">
            <p>
              Aktualny wyliczony stan poranny:{' '}
              <span className="font-medium">{entry.morningStock}</span>
            </p>
            {entry.morningCorrected && (
              <p className="text-orange-600 mt-1 text-xs">
                Ten stan był już wcześniej skorygowany
              </p>
            )}
          </div>

          {/* Input dla nowego stanu */}
          <div className="space-y-2">
            <Label htmlFor="newStock">Nowy stan poranny</Label>
            <Input
              id="newStock"
              type="number"
              min={0}
              value={newStock}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setNewStock(isNaN(val) ? 0 : Math.max(0, val));
              }}
              className="w-full"
            />
            {!isStockValid && (
              <p className="text-xs text-red-500">
                Stan musi być liczbą nieujemną
              </p>
            )}
          </div>

          {/* Textarea dla powodu */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Powód korekty <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Opisz powód korekty (min. 3 znaki)..."
              rows={3}
              className="resize-none"
            />
            {reason.length > 0 && !isReasonValid && (
              <p className="text-xs text-red-500">
                Powód musi mieć co najmniej 3 znaki
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
          >
            {isPending ? 'Zapisywanie...' : 'Zapisz korektę'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CorrectionDialog;
