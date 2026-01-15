'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Settings } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { usePalletAlertConfig, useAlertConfigMutation } from '../hooks/usePalletStock';
import type { PalletAlertConfig, ProductionPalletType } from '../types/index';
import { PALLET_TYPE_LABELS, PALLET_TYPES } from '../types/index';

// Domyślny próg alertu
const DEFAULT_THRESHOLD = 10;

interface AlertSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog do ustawień progów alertów dla poszczególnych typów palet
 */
export const AlertSettingsDialog: React.FC<AlertSettingsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();

  // Query i mutation
  const { data: alertConfigs = [], isLoading } = usePalletAlertConfig(open);
  const saveMutation = useAlertConfigMutation();

  // Stan lokalny dla edycji
  const [localThresholds, setLocalThresholds] = useState<Map<ProductionPalletType, number>>(
    new Map()
  );

  // Inicjalizacja stanu lokalnego gdy dane się załadują lub dialog się otworzy
  useEffect(() => {
    if (open && alertConfigs.length > 0) {
      const map = new Map<ProductionPalletType, number>();
      alertConfigs.forEach((config) => {
        map.set(config.type, config.criticalThreshold);
      });
      // Uzupełnij brakujące typy domyślnym progiem
      PALLET_TYPES.forEach((type) => {
        if (!map.has(type)) {
          map.set(type, DEFAULT_THRESHOLD);
        }
      });
      setLocalThresholds(map);
    } else if (open && alertConfigs.length === 0 && !isLoading) {
      // Jeśli brak konfiguracji, ustaw domyślne
      const map = new Map<ProductionPalletType, number>();
      PALLET_TYPES.forEach((type) => {
        map.set(type, DEFAULT_THRESHOLD);
      });
      setLocalThresholds(map);
    }
  }, [open, alertConfigs, isLoading]);

  // Obsługa zmiany progu
  const handleThresholdChange = useCallback((type: ProductionPalletType, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setLocalThresholds((prev) => {
        const newMap = new Map(prev);
        newMap.set(type, numValue);
        return newMap;
      });
    } else if (value === '') {
      setLocalThresholds((prev) => {
        const newMap = new Map(prev);
        newMap.set(type, 0);
        return newMap;
      });
    }
  }, []);

  // Zapisanie ustawień
  const handleSave = useCallback(async () => {
    const configs: PalletAlertConfig[] = PALLET_TYPES.map((type) => ({
      id: 0, // Będzie ignorowane przy zapisie
      type,
      criticalThreshold: localThresholds.get(type) ?? DEFAULT_THRESHOLD,
    }));

    try {
      await saveMutation.mutateAsync(configs);
      toast({
        title: 'Zapisano',
        description: 'Progi alertów zostały zaktualizowane',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Błąd',
        description: (error as Error).message || 'Nie udało się zapisać ustawień',
        variant: 'destructive',
      });
    }
  }, [localThresholds, saveMutation, toast, onOpenChange]);

  // Reset do domyślnych
  const handleReset = useCallback(() => {
    const map = new Map<ProductionPalletType, number>();
    PALLET_TYPES.forEach((type) => {
      map.set(type, DEFAULT_THRESHOLD);
    });
    setLocalThresholds(map);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Ustawienia alertów
          </DialogTitle>
          <DialogDescription>
            Ustaw progi alertów dla poszczególnych typów palet. Alert pojawi się gdy
            stan końcowy spadnie poniżej progu.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">
              Ładowanie...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ palety</TableHead>
                  <TableHead className="text-center w-[100px]">Próg alertu</TableHead>
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
                        value={localThresholds.get(type) ?? DEFAULT_THRESHOLD}
                        onChange={(e) => handleThresholdChange(type, e.target.value)}
                        className="w-20 text-center h-8 mx-auto"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={saveMutation.isPending}
          >
            Resetuj do domyślnych
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
              disabled={saveMutation.isPending || isLoading}
            >
              {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AlertSettingsDialog;
