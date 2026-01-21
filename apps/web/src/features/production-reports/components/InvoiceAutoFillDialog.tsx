'use client';

import React, { useState } from 'react';
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
import { AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { useInvoiceAutoFillPreview, useExecuteInvoiceAutoFill } from '../hooks';
import { useToast } from '@/hooks/useToast';

interface InvoiceAutoFillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  sourceOrderId: number;
  sourceOrderNumber: string;
  initialInvoiceNumber?: string;
}

/**
 * Dialog auto-fill numeru faktury dla zleceń z tą samą datą dostawy
 *
 * Funkcjonalność:
 * 1. Pobiera preview - które zlecenia zostaną zaktualizowane
 * 2. Pokazuje konflikty (zlecenia z istniejącym innym numerem FV)
 * 3. Daje opcję: pomiń konflikty / nadpisz wszystko
 */
export const InvoiceAutoFillDialog: React.FC<InvoiceAutoFillDialogProps> = ({
  isOpen,
  onClose,
  year,
  month,
  sourceOrderId,
  sourceOrderNumber,
  initialInvoiceNumber = '',
}) => {
  const { toast } = useToast();
  const [invoiceNumber, setInvoiceNumber] = useState(initialInvoiceNumber);
  const [skipConflicts, setSkipConflicts] = useState(true);

  // Pobierz preview
  const {
    data: preview,
    isLoading: isLoadingPreview,
    error: previewError,
  } = useInvoiceAutoFillPreview(year, month, sourceOrderId, isOpen);

  // Mutacja do wykonania auto-fill
  const executeAutoFill = useExecuteInvoiceAutoFill({
    onSuccess: (result) => {
      toast({
        title: 'Auto-fill zakończony',
        description: `Zaktualizowano: ${result.updatedCount}, pominięto: ${result.skippedCount}`,
      });
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!invoiceNumber.trim()) {
      toast({
        title: 'Błąd',
        description: 'Podaj numer faktury',
        variant: 'destructive',
      });
      return;
    }

    executeAutoFill.mutate({
      year,
      month,
      sourceOrderId,
      invoiceNumber: invoiceNumber.trim(),
      skipConflicts,
    });
  };

  const handleClose = () => {
    if (!executeAutoFill.isPending) {
      setInvoiceNumber(initialInvoiceNumber);
      setSkipConflicts(true);
      onClose();
    }
  };

  // Oblicz ile zleceń będzie zaktualizowanych
  const ordersToUpdateCount = preview
    ? skipConflicts
      ? preview.ordersToUpdate.filter((o) => !o.hasConflict).length
      : preview.ordersToUpdate.length
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Auto-fill numeru faktury
          </DialogTitle>
          <DialogDescription>
            Uzupełnij numer FV dla zleceń z tą samą datą dostawy co {sourceOrderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Input numeru FV */}
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Numer faktury</Label>
            <Input
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="np. FV/2026/01/001"
              disabled={executeAutoFill.isPending}
            />
          </div>

          {/* Loading */}
          {isLoadingPreview && (
            <div className="text-center py-4 text-muted-foreground">
              Ładowanie podglądu...
            </div>
          )}

          {/* Error */}
          {previewError && (
            <div className="text-center py-4 text-destructive">
              Błąd: {previewError instanceof Error ? previewError.message : 'Nieznany błąd'}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <>
              {/* Data dostawy */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm">
                  <span className="font-medium">Data dostawy: </span>
                  {new Date(preview.deliveryDate).toLocaleDateString('pl-PL')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Znaleziono {preview.totalOrders} zleceń z tą datą dostawy
                </p>
              </div>

              {/* Lista zleceń */}
              {preview.ordersToUpdate.length > 0 && (
                <div className="space-y-2">
                  <Label>Zlecenia do zaktualizowania:</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2">Nr zlecenia</th>
                          <th className="text-left p-2">Klient</th>
                          <th className="text-left p-2">Aktualny FV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.ordersToUpdate.map((order) => (
                          <tr
                            key={order.orderId}
                            className={
                              order.hasConflict
                                ? 'bg-amber-50 dark:bg-amber-950/30'
                                : ''
                            }
                          >
                            <td className="p-2 font-mono">{order.orderNumber}</td>
                            <td className="p-2 truncate max-w-[120px]" title={order.client || '-'}>
                              {order.client || '-'}
                            </td>
                            <td className="p-2">
                              {order.currentInvoiceNumber ? (
                                <span className="flex items-center gap-1 text-amber-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  {order.currentInvoiceNumber}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Konflikty */}
              {preview.conflictCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {preview.conflictCount} zleceń ma już inny numer FV
                    </span>
                  </div>

                  {/* Opcje konfliktu */}
                  <div className="space-y-2 pl-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conflictOption"
                        checked={skipConflicts}
                        onChange={() => setSkipConflicts(true)}
                        disabled={executeAutoFill.isPending}
                        className="accent-primary"
                      />
                      <span className="text-sm">
                        Pomiń zlecenia z istniejącym FV (zaktualizuj tylko puste)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conflictOption"
                        checked={!skipConflicts}
                        onChange={() => setSkipConflicts(false)}
                        disabled={executeAutoFill.isPending}
                        className="accent-primary"
                      />
                      <span className="text-sm">
                        Nadpisz wszystko (zamień istniejące numery FV)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Podsumowanie */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>
                  Zostanie zaktualizowanych: <strong>{ordersToUpdateCount}</strong> zleceń
                </span>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={executeAutoFill.isPending}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              executeAutoFill.isPending ||
              isLoadingPreview ||
              !invoiceNumber.trim() ||
              ordersToUpdateCount === 0
            }
          >
            {executeAutoFill.isPending ? 'Zapisywanie...' : `Uzupełnij ${ordersToUpdateCount} zleceń`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceAutoFillDialog;
