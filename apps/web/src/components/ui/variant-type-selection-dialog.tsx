'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VariantType = 'correction' | 'additional_file';

interface VariantTypeSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Numer zlecenia wariantu który próbujemy dodać (np. "53335-a") */
  orderNumber: string;
  /** Numer zlecenia oryginału (np. "53335") */
  conflictingOrderNumber: string;
  /** Dostawa do której przypisany jest oryginał */
  originalDelivery: {
    deliveryId: number;
    deliveryNumber: string;
  };
  /** Dostawa do której próbujemy dodać wariant */
  targetDeliveryId: number;
  /** Callback wywołany po wyborze typu wariantu */
  onConfirm: (variantType: VariantType) => void | Promise<void>;
  /** Czy operacja jest w toku */
  isLoading?: boolean;
}

/**
 * P1-3: Dialog wyboru typu wariantu zlecenia
 *
 * Wyświetlany gdy użytkownik próbuje dodać wariant zlecenia (np. 53335-a) do dostawy,
 * a oryginał (53335) jest już w innej dostawie.
 *
 * Umożliwia wybór:
 * - 'correction' - korekta (musi być w tej samej dostawie co oryginał)
 * - 'additional_file' - dodatkowy plik (może być w innej dostawie)
 */
export const VariantTypeSelectionDialog: React.FC<VariantTypeSelectionDialogProps> = ({
  open,
  onOpenChange,
  orderNumber,
  conflictingOrderNumber,
  originalDelivery,
  targetDeliveryId,
  onConfirm,
  isLoading = false
}) => {
  const [selectedType, setSelectedType] = useState<VariantType | null>(null);

  // Sprawdź czy próbujemy dodać do tej samej dostawy co oryginał
  const isSameDelivery = originalDelivery.deliveryId === targetDeliveryId;

  const handleConfirm = async () => {
    if (!selectedType) return;
    await onConfirm(selectedType);
    setSelectedType(null); // Reset selection
  };

  const handleCancel = () => {
    setSelectedType(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <FileText className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <DialogTitle>Wybierz typ wariantu zlecenia</DialogTitle>
              <DialogDescription className="mt-1">
                Zlecenie <span className="font-semibold">{orderNumber}</span> jest wariantem zlecenia{' '}
                <span className="font-semibold">{conflictingOrderNumber}</span>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info o oryginalnym zleceniu */}
          <Alert>
            <Info className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              Zlecenie bazowe <span className="font-semibold">{conflictingOrderNumber}</span>{' '}
              jest przypisane do dostawy{' '}
              <span className="font-semibold">{originalDelivery.deliveryNumber}</span>.
            </AlertDescription>
          </Alert>

          {/* Radio group do wyboru typu */}
          <RadioGroup value={selectedType || ''} onValueChange={(value) => setSelectedType(value as VariantType)}>
            <div className="space-y-3">
              {/* Option 1: Korekta */}
              <div
                className={cn(
                  'border rounded-lg p-4 cursor-pointer transition-colors',
                  selectedType === 'correction'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => setSelectedType('correction')}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem
                    value="correction"
                    id="correction"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="correction"
                      className="font-semibold text-base cursor-pointer"
                    >
                      Korekta oryginału
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      To jest poprawiona wersja zlecenia bazowego. Korekty muszą być w tej samej dostawie co oryginał.
                    </p>

                    {/* Warning gdy próbujemy dodać korekję do innej dostawy */}
                    {selectedType === 'correction' && !isSameDelivery && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        <AlertDescription>
                          <p className="font-semibold">Uwaga!</p>
                          <p className="mt-1">
                            Wybrałeś "Korekta", ale próbujesz dodać zlecenie do innej dostawy niż oryginał.
                            Korekty muszą być w dostawie{' '}
                            <span className="font-semibold">{originalDelivery.deliveryNumber}</span>.
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 2: Dodatkowy plik */}
              <div
                className={cn(
                  'border rounded-lg p-4 cursor-pointer transition-colors',
                  selectedType === 'additional_file'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => setSelectedType('additional_file')}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem
                    value="additional_file"
                    id="additional_file"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="additional_file"
                      className="font-semibold text-base cursor-pointer"
                    >
                      Dodatkowy plik
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      To jest dodatkowy plik do zamówienia (np. okna z innego etapu). Może być w innej dostawie.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>

          {/* Info o konsekwencjach wyboru */}
          {selectedType && (
            <Alert>
              <Info className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                {selectedType === 'correction' ? (
                  <>
                    <p className="font-semibold">Co się stanie po potwierdzeniu:</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {isSameDelivery ? (
                        <>
                          <li>• Zlecenie {orderNumber} zostanie dodane do dostawy {originalDelivery.deliveryNumber}</li>
                          <li>• Będzie oznaczone jako "korekta" zlecenia {conflictingOrderNumber}</li>
                        </>
                      ) : (
                        <li className="text-red-600">
                          • <strong>Błąd</strong>: Nie można dodać korekty do innej dostawy.
                          Wybierz "Dodatkowy plik" lub zmień dostawę docelową na {originalDelivery.deliveryNumber}.
                        </li>
                      )}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Co się stanie po potwierdzeniu:</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• Zlecenie {orderNumber} zostanie dodane do wybranej dostawy</li>
                      <li>• Będzie oznaczone jako "dodatkowy plik" do zlecenia {conflictingOrderNumber}</li>
                      <li>• Może być w innej dostawie niż oryginał</li>
                    </ul>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t pt-4 flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedType || isLoading || (selectedType === 'correction' && !isSameDelivery)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? 'Zapisuję...' : 'Potwierdź wybór'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VariantTypeSelectionDialog;
