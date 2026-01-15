'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Zap, Check } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useSetStandardDay, usePositions } from '../hooks/useTimesheets';
import type { WorkerDaySummary, BulkWorkerEntry } from '../types';
import { formatDateLong } from '../helpers/dateHelpers';

// Klucze localStorage
const STORAGE_KEY_HOURS = 'timesheets_standard_day_hours';
const STORAGE_KEY_WORKERS = 'timesheets_standard_day_workers';

interface SetStandardDialogProps {
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: WorkerDaySummary[];
}

export const SetStandardDialog: React.FC<SetStandardDialogProps> = ({
  date,
  open,
  onOpenChange,
  workers,
}) => {
  const { toast } = useToast();
  const setStandardDay = useSetStandardDay();
  const { data: positions = [] } = usePositions(true);

  // Wczytaj zapisane godziny z localStorage
  const getSavedHours = (): number => {
    if (typeof window === 'undefined') return 8;
    const saved = localStorage.getItem(STORAGE_KEY_HOURS);
    if (saved) {
      const hours = parseFloat(saved);
      if (!isNaN(hours) && hours >= 0 && hours <= 24) {
        return hours;
      }
    }
    return 8;
  };

  // Wczytaj zapisanych pracowników z localStorage
  const getSavedWorkerIds = (): number[] => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_KEY_WORKERS);
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids)) {
          return ids.filter((id): id is number => typeof id === 'number');
        }
      } catch {
        // Ignoruj błędy parsowania
      }
    }
    return [];
  };

  // Domyślne godziny
  const [defaultHours, setDefaultHours] = useState(getSavedHours);

  // Zaznaczeni pracownicy
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<number>>(() => {
    const savedIds = getSavedWorkerIds();
    // Jeśli mamy zapisane ID, użyj ich (filtrując tylko pracowników bez wpisu)
    if (savedIds.length > 0) {
      const workersWithoutEntryIds = new Set(
        workers.filter((w) => !w.entry).map((w) => w.worker.id)
      );
      // Zwróć tylko te ID które są w savedIds I nie mają wpisu
      const validIds = savedIds.filter((id) => workersWithoutEntryIds.has(id));
      if (validIds.length > 0) {
        return new Set(validIds);
      }
    }
    // Domyślnie wszyscy bez wpisu
    return new Set(workers.filter((w) => !w.entry).map((w) => w.worker.id));
  });

  // Reset stanu gdy dialog się otwiera
  useEffect(() => {
    if (open) {
      // Wczytaj zapisane wartości
      setDefaultHours(getSavedHours());

      const savedIds = getSavedWorkerIds();
      const workersWithoutEntryIds = new Set(
        workers.filter((w) => !w.entry).map((w) => w.worker.id)
      );

      if (savedIds.length > 0) {
        // Filtruj tylko pracowników którzy nie mają wpisu
        const validIds = savedIds.filter((id) => workersWithoutEntryIds.has(id));
        if (validIds.length > 0) {
          setSelectedWorkerIds(new Set(validIds));
        } else {
          // Jeśli wszyscy zapisani mają wpisy, zaznacz wszystkich bez wpisów
          setSelectedWorkerIds(workersWithoutEntryIds);
        }
      } else {
        // Brak zapisanych - zaznacz wszystkich bez wpisów
        setSelectedWorkerIds(workersWithoutEntryIds);
      }
    }
  }, [open, workers]);

  // Zapisz godziny do localStorage przy zmianie
  const handleHoursChange = useCallback((value: number) => {
    const hours = Math.max(0, Math.min(24, value));
    setDefaultHours(hours);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_HOURS, hours.toString());
    }
  }, []);

  // Zapisz wybór pracowników do localStorage przy zmianie
  const saveSelectedWorkers = useCallback((ids: Set<number>) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WORKERS, JSON.stringify(Array.from(ids)));
    }
  }, []);

  // Liczba wybranych
  const selectedCount = selectedWorkerIds.size;
  const workersWithoutEntry = workers.filter((w) => !w.entry);
  const allSelected = selectedCount === workersWithoutEntry.length && workersWithoutEntry.length > 0;

  // Toggle pojedynczego pracownika
  const handleToggleWorker = useCallback((workerId: number) => {
    setSelectedWorkerIds((prev) => {
      const next = new Set(prev);
      if (next.has(workerId)) {
        next.delete(workerId);
      } else {
        next.add(workerId);
      }
      saveSelectedWorkers(next);
      return next;
    });
  }, [saveSelectedWorkers]);

  // Zaznacz/odznacz wszystkich
  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedWorkerIds(new Set());
      saveSelectedWorkers(new Set());
    } else {
      const allIds = new Set(workersWithoutEntry.map((w) => w.worker.id));
      setSelectedWorkerIds(allIds);
      saveSelectedWorkers(allIds);
    }
  }, [allSelected, workersWithoutEntry, saveSelectedWorkers]);

  // Znajdź domyślne stanowisko dla pracownika
  const getDefaultPositionId = useCallback(
    (worker: WorkerDaySummary['worker']) => {
      // Szukaj stanowiska o nazwie pasującej do defaultPosition
      const position = positions.find(
        (p) =>
          p.name.toLowerCase() === worker.defaultPosition.toLowerCase() ||
          p.shortName?.toLowerCase() === worker.defaultPosition.toLowerCase()
      );
      return position?.id ?? positions[0]?.id;
    },
    [positions]
  );

  // Obsługa zapisu
  const handleSave = useCallback(async () => {
    if (selectedCount === 0) {
      toast({
        title: 'Błąd',
        description: 'Wybierz przynajmniej jednego pracownika',
        variant: 'destructive',
      });
      return;
    }

    // Przygotuj wpisy
    const entries: BulkWorkerEntry[] = workers
      .filter((w) => selectedWorkerIds.has(w.worker.id))
      .map((w) => ({
        workerId: w.worker.id,
        positionId: getDefaultPositionId(w.worker),
        productiveHours: defaultHours,
      }));

    try {
      await setStandardDay.mutateAsync({
        date,
        defaultProductiveHours: defaultHours,
        entries,
      });

      toast({
        title: 'Zapisano',
        description: `Ustawiono standardowy dzień dla ${entries.length} pracowników`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Błąd',
        description: (error as Error).message || 'Nie udało się zapisać',
        variant: 'destructive',
      });
    }
  }, [
    selectedCount,
    workers,
    selectedWorkerIds,
    date,
    defaultHours,
    getDefaultPositionId,
    setStandardDay,
    toast,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Ustaw standardowy dzień
          </DialogTitle>
          <DialogDescription>
            Szybkie ustawienie {defaultHours}h produkcyjnych dla wybranych
            pracowników na {formatDateLong(date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Domyślne godziny */}
          <div className="space-y-1.5">
            <Label htmlFor="defaultHours">Godziny produkcyjne</Label>
            <Input
              id="defaultHours"
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={defaultHours}
              onChange={(e) => handleHoursChange(parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Wartość zapamiętywana na stałe
            </p>
          </div>

          {/* Lista pracowników */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pracownicy bez wpisu</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleToggleAll}
                disabled={workersWithoutEntry.length === 0}
              >
                {allSelected ? 'Odznacz wszystkich' : 'Zaznacz wszystkich'}
              </Button>
            </div>

            {workersWithoutEntry.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Wszyscy pracownicy mają już wpisy na ten dzień
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1 border rounded-md p-2">
                {workersWithoutEntry.map((w) => (
                  <label
                    key={w.worker.id}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedWorkerIds.has(w.worker.id)}
                      onCheckedChange={() => handleToggleWorker(w.worker.id)}
                    />
                    <span className="text-sm">
                      {w.worker.firstName} {w.worker.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {w.worker.defaultPosition}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Wybór pracowników zapamiętywany na stałe
            </p>
          </div>

          {/* Info o pracownikach z wpisami */}
          {workers.filter((w) => w.entry).length > 0 && (
            <p className="text-xs text-muted-foreground">
              {workers.filter((w) => w.entry).length} pracowników ma już wpisy i
              nie zostanie nadpisanych
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              setStandardDay.isPending ||
              selectedCount === 0 ||
              workersWithoutEntry.length === 0
            }
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            {setStandardDay.isPending
              ? 'Zapisywanie...'
              : `Zapisz (${selectedCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SetStandardDialog;
