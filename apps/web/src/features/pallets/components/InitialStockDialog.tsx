'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Package } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { usePalletInitialStocks, useSetInitialStocksMutation } from '../hooks/usePalletStock';
import { getTodayWarsaw } from '@/lib/date-utils';
import type { ProductionPalletType } from '../types/index';
import { PALLET_TYPE_LABELS, PALLET_TYPES } from '../types/index';

// Domyślny stan początkowy
const DEFAULT_INITIAL_STOCK = 0;

interface InitialStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog do ustawienia stanów początkowych palet (tylko admin)
 * Pozwala ustawić datę startową i ilości dla każdego typu palety
 */
export const InitialStockDialog: React.FC<InitialStockDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();

  // Query i mutation
  const { data: initialStocks = [], isLoading } = usePalletInitialStocks(open);
  const saveMutation = useSetInitialStocksMutation();

  // Stan lokalny dla edycji
  const [localStocks, setLocalStocks] = useState<Map<ProductionPalletType, number>>(
    new Map()
  );
  const [startDate, setStartDate] = useState<string>('');
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  // Inicjalizacja stanu lokalnego gdy dane się załadują lub dialog się otworzy
  useEffect(() => {
    if (open && initialStocks.length > 0) {
      const map = new Map<ProductionPalletType, number>();
      initialStocks.forEach((stock) => {
        map.set(stock.type as ProductionPalletType, stock.initialStock);
      });
      // Uzupełnij brakujące typy domyślnym stanem
      PALLET_TYPES.forEach((type) => {
        if (!map.has(type)) {
          map.set(type, DEFAULT_INITIAL_STOCK);
        }
      });
      setLocalStocks(map);
      // Użyj daty z pierwszego wpisu (wszystkie mają tę samą)
      // startDate to string z API w formacie ISO - split('T')[0] jest poprawny
      if (initialStocks[0]?.startDate) {
        setStartDate(initialStocks[0].startDate.split('T')[0]);
      }
      setHasExistingConfig(true);
    } else if (open && initialStocks.length === 0 && !isLoading) {
      // Jeśli brak konfiguracji, ustaw domyślne
      const map = new Map<ProductionPalletType, number>();
      PALLET_TYPES.forEach((type) => {
        map.set(type, DEFAULT_INITIAL_STOCK);
      });
      setLocalStocks(map);
      // Domyślna data - dziś
      setStartDate(getTodayWarsaw());
      setHasExistingConfig(false);
    }
  }, [open, initialStocks, isLoading]);

  // Obsługa zmiany stanu
  const handleStockChange = useCallback((type: ProductionPalletType, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setLocalStocks((prev) => {
        const newMap = new Map(prev);
        newMap.set(type, numValue);
        return newMap;
      });
    } else if (value === '') {
      setLocalStocks((prev) => {
        const newMap = new Map(prev);
        newMap.set(type, 0);
        return newMap;
      });
    }
  }, []);

  // Zapisanie ustawień
  const handleSave = useCallback(async () => {
    if (!startDate) {
      toast({
        title: 'Błąd',
        description: 'Wybierz datę startową',
        variant: 'destructive',
      });
      return;
    }

    const stocks = PALLET_TYPES.map((type) => ({
      type,
      initialStock: localStocks.get(type) ?? DEFAULT_INITIAL_STOCK,
    }));

    try {
      await saveMutation.mutateAsync({
        startDate,
        stocks,
      });
      toast({
        title: 'Zapisano',
        description: 'Stany początkowe zostały zaktualizowane',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Błąd',
        description: (error as Error).message || 'Nie udało się zapisać ustawień',
        variant: 'destructive',
      });
    }
  }, [startDate, localStocks, saveMutation, toast, onOpenChange]);

  // Reset do zera
  const handleReset = useCallback(() => {
    const map = new Map<ProductionPalletType, number>();
    PALLET_TYPES.forEach((type) => {
      map.set(type, DEFAULT_INITIAL_STOCK);
    });
    setLocalStocks(map);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stan początkowy palet
          </DialogTitle>
          <DialogDescription>
            Ustaw datę od której system liczy oraz początkowe stany magazynowe
            dla każdego typu palety.
          </DialogDescription>
        </DialogHeader>

        {hasExistingConfig && (
          <Alert variant="default" className="border-yellow-500 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              Uwaga: Zmiana stanów początkowych wpłynie na wszystkie obliczenia
              od daty startowej. Upewnij się, że wpisujesz prawidłowe wartości.
            </AlertDescription>
          </Alert>
        )}

        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">
              Ładowanie...
            </div>
          ) : (
            <>
              {/* Data startowa */}
              <div className="space-y-2">
                <Label htmlFor="startDate" className="font-medium">
                  Data startowa (od kiedy liczymy)
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  System będzie używał tych stanów jako punktu wyjścia dla dni od tej daty.
                </p>
              </div>

              {/* Tabela stanów */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Typ palety</TableHead>
                    <TableHead className="text-center w-[120px]">Stan początkowy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PALLET_TYPES.map((type) => (
                    <TableRow key={type}>
                      <TableCell className="font-medium">
                        {PALLET_TYPE_LABELS[type]}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={0}
                          value={localStocks.get(type) ?? DEFAULT_INITIAL_STOCK}
                          onChange={(e) => handleStockChange(type, e.target.value)}
                          className="w-24 text-center h-8 mx-auto"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={saveMutation.isPending}
          >
            Wyzeruj wszystkie
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || isLoading || !startDate}
            >
              {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InitialStockDialog;
