'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { X, Save, Trash2, AlertTriangle, Thermometer, Umbrella, UserX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  usePositions,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  useSetAbsenceRange,
} from '../hooks/useTimesheets';
import type { WorkerDaySummary, NonProductiveTaskInput, SpecialWorkInput, AbsenceType } from '../types';
import { ABSENCE_LABELS } from '../types';
import { formatHours, roundToHalfHour, getEndOfWeek, isFirstDayOfWeek } from '../helpers/dateHelpers';
import { NonProductiveSection } from './NonProductiveSection';
import { SpecialWorkSection } from './SpecialWorkSection';
import { AbsenceWeekDialog } from './AbsenceWeekDialog';

// Komponent ProgressBar z customowym kolorem
interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color: 'green' | 'amber' | 'blue' | 'purple';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, max, color }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const colorClasses = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{formatHours(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn('h-full transition-all', colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface WorkerEditPanelProps {
  date: string;
  workerData: WorkerDaySummary;
  onClose: () => void;
}

export const WorkerEditPanel: React.FC<WorkerEditPanelProps> = ({
  date,
  workerData,
  onClose,
}) => {
  const { worker, entry } = workerData;
  const { toast } = useToast();

  // Stan formularza
  const [positionId, setPositionId] = useState<number | null>(
    entry?.positionId ?? null
  );
  const [productiveHours, setProductiveHours] = useState<number>(
    entry?.productiveHours ?? 8
  );
  const [absenceType, setAbsenceType] = useState<AbsenceType | null>(
    entry?.absenceType ?? null
  );
  const [notes, setNotes] = useState<string>(entry?.notes ?? '');
  const [nonProductiveTasks, setNonProductiveTasks] = useState<
    NonProductiveTaskInput[]
  >(
    entry?.nonProductiveTasks?.map((t) => ({
      taskTypeId: t.taskTypeId,
      hours: t.hours,
      notes: t.notes,
    })) ?? []
  );
  const [specialWorks, setSpecialWorks] = useState<SpecialWorkInput[]>(
    entry?.specialWorks?.map((sw) => ({
      specialTypeId: sw.specialTypeId,
      hours: sw.hours,
      notes: sw.notes,
    })) ?? []
  );

  // Stan dialogu tygodniowego
  const [weekDialogOpen, setWeekDialogOpen] = useState(false);
  const [pendingAbsenceType, setPendingAbsenceType] = useState<AbsenceType | null>(null);

  // Pobieranie stanowisk
  const { data: positions = [] } = usePositions(true);

  // Mutacje
  const createEntry = useCreateTimeEntry();
  const updateEntry = useUpdateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();
  const setAbsenceRange = useSetAbsenceRange();

  const isPending =
    createEntry.isPending || updateEntry.isPending || deleteEntry.isPending || setAbsenceRange.isPending;

  // Synchronizacja stanu gdy zmienia się wpis
  useEffect(() => {
    setPositionId(entry?.positionId ?? null);
    setProductiveHours(entry?.productiveHours ?? 8);
    setAbsenceType(entry?.absenceType ?? null);
    setNotes(entry?.notes ?? '');
    setNonProductiveTasks(
      entry?.nonProductiveTasks?.map((t) => ({
        taskTypeId: t.taskTypeId,
        hours: t.hours,
        notes: t.notes,
      })) ?? []
    );
    setSpecialWorks(
      entry?.specialWorks?.map((sw) => ({
        specialTypeId: sw.specialTypeId,
        hours: sw.hours,
        notes: sw.notes,
      })) ?? []
    );
  }, [entry]);

  // Suma godzin
  const totalNonProductiveHours = nonProductiveTasks.reduce(
    (sum, t) => sum + t.hours,
    0
  );
  const totalSpecialHours = specialWorks.reduce(
    (sum, sw) => sum + sw.hours,
    0
  );
  const totalHours = productiveHours + totalNonProductiveHours;
  const isOverLimit = totalHours > 24;

  // Sprawdzenie czy stanowisko zostało zmienione z domyślnego
  const isPositionChanged = useMemo(() => {
    if (!positionId) return false;
    const selectedPosition = positions.find((p) => p.id === positionId);
    if (!selectedPosition) return false;
    return (
      selectedPosition.name.toLowerCase() !== worker.defaultPosition.toLowerCase() &&
      selectedPosition.shortName?.toLowerCase() !== worker.defaultPosition.toLowerCase()
    );
  }, [positionId, positions, worker.defaultPosition]);

  // Znajdź domyślne stanowisko pracownika
  const getDefaultPositionId = useCallback(() => {
    const defaultPos = positions.find(
      (p) =>
        p.name.toLowerCase() === worker.defaultPosition.toLowerCase() ||
        p.shortName?.toLowerCase() === worker.defaultPosition.toLowerCase()
    );
    return defaultPos?.id ?? positions[0]?.id ?? null;
  }, [positions, worker.defaultPosition]);

  // Obsługa kliknięcia przycisku nieobecności
  const handleAbsenceClick = useCallback((type: AbsenceType) => {
    // Dla Choroba i Urlop - sprawdź czy pierwszy dzień tygodnia
    if ((type === 'SICK' || type === 'VACATION') && isFirstDayOfWeek(date)) {
      setPendingAbsenceType(type);
      setWeekDialogOpen(true);
    } else {
      // Ustaw nieobecność tylko na ten dzień
      setAbsenceType(type);
    }
  }, [date]);

  // Obsługa potwierdzenia pojedynczego dnia
  const handleConfirmSingleDay = useCallback(() => {
    if (pendingAbsenceType) {
      setAbsenceType(pendingAbsenceType);
    }
    setWeekDialogOpen(false);
    setPendingAbsenceType(null);
  }, [pendingAbsenceType]);

  // Obsługa potwierdzenia całego tygodnia
  const handleConfirmWholeWeek = useCallback(async () => {
    if (!pendingAbsenceType) return;

    const effectivePositionId = positionId ?? getDefaultPositionId();
    if (!effectivePositionId) {
      toast({
        title: 'Błąd',
        description: 'Nie można znaleźć stanowiska',
        variant: 'destructive',
      });
      setWeekDialogOpen(false);
      setPendingAbsenceType(null);
      return;
    }

    try {
      await setAbsenceRange.mutateAsync({
        workerId: worker.id,
        positionId: effectivePositionId,
        absenceType: pendingAbsenceType,
        fromDate: date,
        toDate: getEndOfWeek(date),
      });
      toast({
        title: 'Zapisano',
        description: `${ABSENCE_LABELS[pendingAbsenceType]} ustawiony do końca tygodnia`,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: (error as Error).message || 'Nie udało się zapisać',
        variant: 'destructive',
      });
    }
    setWeekDialogOpen(false);
    setPendingAbsenceType(null);
  }, [pendingAbsenceType, positionId, getDefaultPositionId, worker.id, date, setAbsenceRange, toast, onClose]);

  // Anuluj nieobecność
  const handleClearAbsence = useCallback(() => {
    setAbsenceType(null);
  }, []);

  // Obsługa zapisu
  const handleSave = useCallback(async () => {
    const effectivePositionId = positionId ?? getDefaultPositionId();

    if (!effectivePositionId) {
      toast({
        title: 'Błąd',
        description: 'Wybierz stanowisko',
        variant: 'destructive',
      });
      return;
    }

    // Gdy nieobecność - nie waliduj godzin
    if (!absenceType && isOverLimit) {
      toast({
        title: 'Błąd',
        description: 'Suma godzin nie może przekraczać 24',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (entry) {
        // Aktualizacja istniejącego wpisu
        await updateEntry.mutateAsync({
          id: entry.id,
          data: {
            positionId: effectivePositionId,
            productiveHours: absenceType ? 0 : productiveHours,
            absenceType,
            notes: notes || null,
            nonProductiveTasks: absenceType ? [] : nonProductiveTasks,
            specialWorks: absenceType ? [] : specialWorks,
          },
        });
        toast({
          title: 'Zapisano',
          description: absenceType
            ? `Ustawiono: ${ABSENCE_LABELS[absenceType]}`
            : 'Wpis został zaktualizowany',
        });
      } else {
        // Tworzenie nowego wpisu
        await createEntry.mutateAsync({
          date,
          workerId: worker.id,
          positionId: effectivePositionId,
          productiveHours: absenceType ? 0 : productiveHours,
          absenceType,
          notes: notes || null,
          nonProductiveTasks: absenceType ? [] : nonProductiveTasks,
          specialWorks: absenceType ? [] : specialWorks,
        });
        toast({
          title: 'Zapisano',
          description: absenceType
            ? `Ustawiono: ${ABSENCE_LABELS[absenceType]}`
            : 'Wpis został utworzony',
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: (error as Error).message || 'Nie udało się zapisać',
        variant: 'destructive',
      });
    }
  }, [
    entry,
    date,
    worker.id,
    positionId,
    getDefaultPositionId,
    productiveHours,
    absenceType,
    notes,
    nonProductiveTasks,
    specialWorks,
    isOverLimit,
    createEntry,
    updateEntry,
    toast,
    onClose,
  ]);

  // Obsługa usuwania
  const handleDelete = useCallback(async () => {
    if (!entry) return;

    if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) return;

    try {
      await deleteEntry.mutateAsync(entry.id);
      toast({
        title: 'Usunięto',
        description: 'Wpis został usunięty',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: (error as Error).message || 'Nie udało się usunąć',
        variant: 'destructive',
      });
    }
  }, [entry, deleteEntry, toast, onClose]);

  // Zmiana godzin produkcyjnych
  const handleProductiveHoursChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value) || 0;
      setProductiveHours(roundToHalfHour(Math.max(0, Math.min(24, value))));
    },
    []
  );

  return (
    <>
      <Card className="w-[420px] flex-shrink-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {worker.firstName} {worker.lastName}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Przyciski nieobecności */}
          <div className="space-y-1.5">
            <Label>Nieobecność</Label>
            <div className="flex gap-2">
              <Button
                variant={absenceType === 'SICK' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex-1 gap-1',
                  absenceType === 'SICK' && 'bg-red-600 hover:bg-red-700'
                )}
                onClick={() => handleAbsenceClick('SICK')}
                disabled={isPending}
              >
                <Thermometer className="h-4 w-4" />
                Choroba
              </Button>
              <Button
                variant={absenceType === 'VACATION' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex-1 gap-1',
                  absenceType === 'VACATION' && 'bg-blue-600 hover:bg-blue-700'
                )}
                onClick={() => handleAbsenceClick('VACATION')}
                disabled={isPending}
              >
                <Umbrella className="h-4 w-4" />
                Urlop
              </Button>
              <Button
                variant={absenceType === 'ABSENT' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex-1 gap-1',
                  absenceType === 'ABSENT' && 'bg-gray-600 hover:bg-gray-700'
                )}
                onClick={() => handleAbsenceClick('ABSENT')}
                disabled={isPending}
              >
                <UserX className="h-4 w-4" />
                Nieobecność
              </Button>
            </div>
            {absenceType && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={handleClearAbsence}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Anuluj nieobecność
              </Button>
            )}
          </div>

          {/* Informacja o nieobecności */}
          {absenceType && (
            <div className={cn(
              'p-3 rounded-lg text-center font-medium',
              absenceType === 'SICK' && 'bg-red-100 text-red-800',
              absenceType === 'VACATION' && 'bg-blue-100 text-blue-800',
              absenceType === 'ABSENT' && 'bg-gray-100 text-gray-800',
            )}>
              {ABSENCE_LABELS[absenceType]}
            </div>
          )}

          {/* Pola edycji - ukryte gdy nieobecność */}
          {!absenceType && (
            <>
              {/* Stanowisko */}
              <div className="space-y-1.5">
                <Label htmlFor="position">Stanowisko</Label>
                <Select
                  value={positionId?.toString() ?? ''}
                  onValueChange={(val) => setPositionId(parseInt(val))}
                >
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Wybierz stanowisko" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id.toString()}>
                        {pos.name}
                        {pos.shortName && ` (${pos.shortName})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isPositionChanged && (
                  <div className="flex items-center gap-1 text-amber-600 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Zmienione z domyślnego ({worker.defaultPosition})</span>
                  </div>
                )}
              </div>

              {/* Godziny produkcyjne */}
              <div className="space-y-1.5">
                <Label htmlFor="productiveHours">Godziny produkcyjne</Label>
                <Input
                  id="productiveHours"
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={productiveHours}
                  onChange={handleProductiveHoursChange}
                />
              </div>

              {/* Sekcja nieprodukcyjna */}
              <NonProductiveSection
                tasks={nonProductiveTasks}
                onChange={setNonProductiveTasks}
              />

              {/* Sekcja nietypówek */}
              <SpecialWorkSection
                specialWorks={specialWorks}
                onChange={setSpecialWorks}
              />

              {/* Podsumowanie godzin z Progress Bars */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                <h4 className="font-medium text-sm">Struktura dnia pracy</h4>

                <div className="space-y-2">
                  <ProgressBar
                    label="Produkcyjne"
                    value={productiveHours}
                    max={12}
                    color="green"
                  />
                  <ProgressBar
                    label="Nieprodukcyjne"
                    value={totalNonProductiveHours}
                    max={12}
                    color="amber"
                  />
                  {totalSpecialHours > 0 && (
                    <ProgressBar
                      label="Nietypówki"
                      value={totalSpecialHours}
                      max={12}
                      color="purple"
                    />
                  )}
                </div>

                <div className="border-t pt-2 flex justify-between font-medium text-sm">
                  <span>RAZEM:</span>
                  <span
                    className={cn(
                      isOverLimit && 'text-red-600',
                      !isOverLimit && totalHours > 8 && 'text-purple-600'
                    )}
                  >
                    {formatHours(totalHours)}
                  </span>
                </div>
              </div>

              {isOverLimit && (
                <p className="text-xs text-red-600">
                  Suma godzin nie może przekraczać 24h
                </p>
              )}
            </>
          )}

          {/* Notatki */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notatki (opcjonalne)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Dodatkowe informacje..."
            />
          </div>

          {/* Przyciski akcji */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isPending || (!absenceType && isOverLimit)}
              className="flex-1 gap-1"
            >
              <Save className="h-4 w-4" />
              {isPending ? 'Zapisywanie...' : 'Zapisz'}
            </Button>

            {entry && (
              <Button
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog tygodniowy */}
      {pendingAbsenceType && (
        <AbsenceWeekDialog
          open={weekDialogOpen}
          onOpenChange={setWeekDialogOpen}
          absenceType={pendingAbsenceType}
          fromDate={date}
          toDate={getEndOfWeek(date)}
          onConfirmSingleDay={handleConfirmSingleDay}
          onConfirmWholeWeek={handleConfirmWholeWeek}
        />
      )}
    </>
  );
};

export default WorkerEditPanel;
