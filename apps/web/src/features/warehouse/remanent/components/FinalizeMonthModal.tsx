'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Archive, AlertTriangle } from 'lucide-react';
import type { FinalizeMonthResponse } from '@/types/warehouse';

interface FinalizeMonthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinalize: (month: string, archive: boolean) => void;
  isPending: boolean;
  previewData?: FinalizeMonthResponse | null;
}

export function FinalizeMonthModal({
  open,
  onOpenChange,
  onFinalize,
  isPending,
  previewData,
}: FinalizeMonthModalProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthNum = now.getMonth() + 1;
    return `${year}-${monthNum.toString().padStart(2, '0')}`;
  });

  const handlePreview = () => {
    onFinalize(month, false);
  };

  const handleArchive = () => {
    onFinalize(month, true);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Finalizuj miesiąc
          </DialogTitle>
          <DialogDescription>
            Archiwizuj wykonane zlecenia z wybranego miesiąca
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Month selector */}
          <div className="space-y-2">
            <Label htmlFor="month">Wybierz miesiąc</Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-slate-500">
              Zlecenia z polem completedAt w tym miesiącu zostaną zarchiwizowane
            </p>
          </div>

          {/* Preview results */}
          {previewData && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
              <h4 className="font-semibold text-sm">Podgląd archiwizacji</h4>

              {previewData.ordersCount === 0 ? (
                <p className="text-sm text-slate-600">
                  Brak zleceń do zarchiwizowania w wybranym miesiącu.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-sm font-medium">Zlecenia do archiwizacji</span>
                    <span className="font-semibold text-blue-700">
                      {previewData.ordersCount}
                    </span>
                  </div>

                  {previewData.orderNumbers && previewData.orderNumbers.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-600">Numery zleceń:</p>
                      <div className="max-h-32 overflow-y-auto">
                        <div className="flex flex-wrap gap-1">
                          {previewData.orderNumbers.map((num) => (
                            <span
                              key={num}
                              className="text-xs px-2 py-1 bg-white border rounded font-mono"
                            >
                              {num}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <strong>Uwaga:</strong> Archiwizacja ukryje zlecenia z widoku głównego.
              Możesz je przywrócić cofając ostatni remanent.
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Anuluj
          </Button>
          <Button variant="secondary" onClick={handlePreview} disabled={isPending}>
            {isPending ? 'Ładowanie...' : 'Podgląd'}
          </Button>
          <Button
            onClick={handleArchive}
            disabled={isPending || !previewData || previewData.ordersCount === 0}
          >
            {isPending ? 'Archiwizowanie...' : 'Archiwizuj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
