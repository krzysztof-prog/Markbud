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
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog';
import { Archive, AlertTriangle, Calendar, CheckCircle } from 'lucide-react';
import type { FinalizeMonthResponse } from '@/types/warehouse';
import { useContextualToast } from '@/hooks/useContextualToast';

interface FinalizeMonthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinalize: (month: string, archive: boolean) => void;
  isPending: boolean;
  previewData?: FinalizeMonthResponse | null;
}

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

function getMonthName(monthString: string): string {
  const [year, month] = monthString.split('-');
  const monthIndex = parseInt(month) - 1;
  return `${MONTH_NAMES[monthIndex]} ${year}`;
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
  const [showDestructiveDialog, setShowDestructiveDialog] = useState(false);
  const { showContextualToast } = useContextualToast();

  const handlePreview = () => {
    onFinalize(month, false);
  };

  const handleArchiveClick = () => {
    // Show warning if no preview data
    if (!previewData || previewData.ordersCount === 0) {
      showContextualToast({
        title: 'Brak danych do archiwacji',
        message: 'Nie znaleziono zleceń do zarchiwizowania w wybranym miesiącu',
        reason: 'Najpierw wykonaj podgląd, aby sprawdzić które zlecenia zostaną zarchiwizowane',
        variant: 'warning',
        action: {
          label: 'Wykonaj podgląd',
          onClick: handlePreview
        }
      });
      return;
    }

    setShowDestructiveDialog(true);
  };

  const handleConfirmArchive = async () => {
    onFinalize(month, true);
    setShowDestructiveDialog(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const monthName = getMonthName(month);
  const confirmText = 'FINALIZUJ';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" aria-hidden="true" />
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
                aria-describedby="month-help"
              />
              <p id="month-help" className="text-xs text-slate-500">
                Zlecenia z polem completedAt w tym miesiącu zostaną zarchiwizowane
              </p>
            </div>

            {/* Preview results */}
            {previewData && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg border" role="region" aria-label="Podgląd archiwizacji">
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
                          <div className="flex flex-wrap gap-1" role="list">
                            {previewData.orderNumbers.map((num) => (
                              <span
                                key={num}
                                className="text-xs px-2 py-1 bg-white border rounded font-mono"
                                role="listitem"
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
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg" role="alert">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
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
              onClick={handleArchiveClick}
              disabled={isPending || !previewData || previewData.ordersCount === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isPending ? 'Archiwizowanie...' : 'Archiwizuj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Destructive Action Dialog */}
      <DestructiveActionDialog
        open={showDestructiveDialog}
        onOpenChange={setShowDestructiveDialog}
        title={`Finalizacja miesiąca - ${monthName}`}
        description="Ta akcja zarchiwizuje wszystkie zlecenia z wybranego miesiąca i utworzy snapshot stanu magazynu"
        actionType="finalize"
        confirmText={confirmText}
        isLoading={isPending}
        consequences={[
          `${previewData?.ordersCount || 0} zleceń zostanie przeniesionych do archiwum`,
          'Zarchiwizowane zlecenia znikną z widoku głównego',
          'Zlecenia nie będą mogły być edytowane po archiwizacji',
          'Możesz cofnąć finalizację używając funkcji "Cofnij ostatni remanent"',
          'Stan magazynu zostanie zapisany jako snapshot na koniec miesiąca'
        ]}
        affectedItems={previewData?.orderNumbers?.map(num => ({
          id: num,
          label: `Zlecenie #${num}`
        }))}
        previewData={
          previewData && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-slate-600">Zlecenia do archiwizacji</p>
                    <p className="text-lg font-semibold">{previewData.ordersCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-slate-600">Miesiąc</p>
                    <p className="text-lg font-semibold">{monthName}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-slate-600 mb-1">Numery zleceń do archiwizacji:</p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {previewData.orderNumbers?.slice(0, 10).map(num => (
                    <span key={num} className="text-xs px-2 py-1 bg-slate-100 rounded font-mono">
                      {num}
                    </span>
                  ))}
                  {previewData.orderNumbers && previewData.orderNumbers.length > 10 && (
                    <span className="text-xs px-2 py-1 bg-slate-200 rounded">
                      +{previewData.orderNumbers.length - 10} więcej
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        }
        onConfirm={handleConfirmArchive}
      />
    </>
  );
}
