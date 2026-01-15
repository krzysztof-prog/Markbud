'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Lock,
  AlertTriangle,
  Settings,
  Info,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PalletRow } from './PalletRow';
import { AlertSettingsDialog } from './AlertSettingsDialog';
import {
  usePalletDay,
  usePalletDayMutation,
  useCloseDayMutation,
  usePalletAlertConfig,
} from '../hooks/usePalletStock';
import type {
  ProductionPalletType,
} from '../types/index';
import { PALLET_TYPE_LABELS } from '../types/index';

// Helpers dla dat
const formatDateISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateISO = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateLong = (dateString: string): string => {
  const date = parseDateISO(dateString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('pl-PL', options);
};

const isToday = (dateString: string): boolean => {
  return dateString === formatDateISO(new Date());
};

interface PalletDayViewProps {
  initialDate?: string;
}

/**
 * Główny widok dnia dla modułu paletówek
 * Wyświetla tabelę z 5 typami palet: Stan poranny | Użyte | Zrobione
 *
 * LOGIKA:
 * - Stan poranny = domyślnie: poprzedni poranny - poprzednie użyte (kierownik może zmienić strzałkami)
 * - Użyte = wpisuje kierownik
 * - Zrobione = stan poranny DZISIAJ - stan poranny POPRZEDNIEGO DNIA + użyte
 */
export const PalletDayView: React.FC<PalletDayViewProps> = ({
  initialDate,
}) => {
  const { toast } = useToast();

  // Stan daty
  const [date, setDate] = useState<string>(initialDate || formatDateISO(new Date()));

  // Stan lokalnych edycji - przechowuje used (użyte) i morningStock (stan poranny)
  const [localUsed, setLocalUsed] = useState<Map<ProductionPalletType, number>>(
    new Map()
  );
  const [localMorningStock, setLocalMorningStock] = useState<Map<ProductionPalletType, number>>(
    new Map()
  );

  // Stan dialogów i paneli
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // Queries
  const { data: dayData, isLoading, error } = usePalletDay(date);
  const { data: alertConfigs = [] } = usePalletAlertConfig();

  // Mutations
  const saveMutation = usePalletDayMutation();
  const closeMutation = useCloseDayMutation();

  // Czy dzień można edytować (tylko status OPEN)
  const isEditable = useMemo(() => {
    if (!dayData) return false;
    return dayData.status === 'OPEN';
  }, [dayData]);

  // Mapa progów alertów
  const thresholdMap = useMemo(() => {
    const map = new Map<ProductionPalletType, number>();
    alertConfigs.forEach((config) => {
      map.set(config.type, config.criticalThreshold);
    });
    return map;
  }, [alertConfigs]);

  // Oblicz wpisy z lokalnymi zmianami (used i morningStock)
  const entriesWithLocalChanges = useMemo(() => {
    if (!dayData?.entries) return [];

    return dayData.entries.map((entry) => {
      const localUsedValue = localUsed.get(entry.type);
      const localMorningValue = localMorningStock.get(entry.type);

      const newMorningStock = localMorningValue ?? entry.morningStock;
      const newUsed = localUsedValue ?? entry.used;

      // Oblicz produced lokalnie: morningStock (dziś) - previousMorningStock + used
      const newProduced = newMorningStock - entry.previousMorningStock + newUsed;

      return {
        ...entry,
        morningStock: newMorningStock,
        used: newUsed,
        produced: newProduced,
      };
    });
  }, [dayData?.entries, localUsed, localMorningStock]);

  // Czy są niezapisane zmiany
  const hasUnsavedChanges = localUsed.size > 0 || localMorningStock.size > 0;

  // Nawigacja między dniami
  const handlePrevDay = useCallback(() => {
    const current = parseDateISO(date);
    current.setDate(current.getDate() - 1);
    setDate(formatDateISO(current));
    setLocalUsed(new Map());
    setLocalMorningStock(new Map());
  }, [date]);

  const handleNextDay = useCallback(() => {
    const current = parseDateISO(date);
    current.setDate(current.getDate() + 1);
    setDate(formatDateISO(current));
    setLocalUsed(new Map());
    setLocalMorningStock(new Map());
  }, [date]);

  const handleToday = useCallback(() => {
    setDate(formatDateISO(new Date()));
    setLocalUsed(new Map());
    setLocalMorningStock(new Map());
  }, []);

  // Obsługa zmiany wartości used w wierszu
  const handleUsedChange = useCallback(
    (type: ProductionPalletType, value: number) => {
      setLocalUsed((prev) => {
        const newMap = new Map(prev);
        newMap.set(type, value);
        return newMap;
      });
    },
    []
  );

  // Obsługa zmiany stanu porannego strzałkami
  const handleMorningStockChange = useCallback(
    (type: ProductionPalletType, value: number) => {
      setLocalMorningStock((prev) => {
        const newMap = new Map(prev);
        newMap.set(type, value);
        return newMap;
      });
    },
    []
  );

  // Zapisanie zmian - wysyłamy used i morningStock, backend obliczy produced
  const handleSave = useCallback(async () => {
    if (!dayData || !hasUnsavedChanges) return;

    // Przygotuj wpisy - type, used i morningStock
    const entries = dayData.entries.map((entry) => {
      const localUsedValue = localUsed.get(entry.type);
      const localMorningValue = localMorningStock.get(entry.type);
      return {
        type: entry.type,
        used: localUsedValue ?? entry.used,
        morningStock: localMorningValue ?? entry.morningStock,
      };
    });

    try {
      await saveMutation.mutateAsync({ date, entries });
      setLocalUsed(new Map());
      setLocalMorningStock(new Map());
      toast({
        title: 'Zapisano',
        description: 'Dane dnia zostały zapisane',
      });
    } catch (err) {
      toast({
        title: 'Błąd',
        description: (err as Error).message || 'Nie udało się zapisać danych',
        variant: 'destructive',
      });
    }
  }, [dayData, hasUnsavedChanges, localUsed, localMorningStock, date, saveMutation, toast]);

  // Zamknięcie dnia
  const handleCloseDay = useCallback(async () => {
    if (!dayData || dayData.status === 'CLOSED') return;

    // Najpierw zapisz niezapisane zmiany
    if (hasUnsavedChanges) {
      await handleSave();
    }

    try {
      await closeMutation.mutateAsync(date);
      toast({
        title: 'Dzień zamknięty',
        description: 'Dzień został zamknięty. Edycja nie jest już możliwa.',
      });
    } catch (err) {
      toast({
        title: 'Błąd',
        description: (err as Error).message || 'Nie udało się zamknąć dnia',
        variant: 'destructive',
      });
    }
  }, [dayData, hasUnsavedChanges, handleSave, closeMutation, date, toast]);

  // Alerty poniżej tabeli - teraz bazują na stanie porannym
  const activeAlerts = useMemo(() => {
    if (!dayData?.alerts) return [];
    return dayData.alerts;
  }, [dayData?.alerts]);

  // Renderowanie
  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-500">
          Błąd ładowania danych: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  const isTodayDate = isToday(date);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            {/* Nawigacja i data */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevDay}
                  aria-label="Poprzedni dzień"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextDay}
                  aria-label="Następny dzień"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <CardTitle
                  className={cn(
                    'text-base md:text-lg capitalize',
                    isTodayDate && 'text-blue-600'
                  )}
                >
                  {formatDateLong(date)}
                </CardTitle>
                {isTodayDate && (
                  <span className="text-xs text-blue-600">Dzisiaj</span>
                )}
              </div>
            </div>

            {/* Status i przyciski */}
            <div className="flex items-center gap-2 flex-wrap">
              {!isTodayDate && (
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Dziś
                </Button>
              )}

              {dayData && (
                <Badge
                  variant={dayData.status === 'OPEN' ? 'default' : 'secondary'}
                >
                  {dayData.status === 'OPEN' ? 'Otwarty' : 'Zamknięty'}
                </Badge>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSettingsOpen(true)}
                className="gap-1"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Progi alertów</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Panel informacyjny - jak działa moduł */}
          <div className="mb-4 border rounded-lg bg-blue-50/50">
            <button
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-blue-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2 text-blue-700">
                <Info className="h-4 w-4" />
                <span className="text-sm font-medium">Jak działa moduł paletówek?</span>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-blue-700 transition-transform',
                  isInfoExpanded && 'rotate-180'
                )}
              />
            </button>

            {isInfoExpanded && (
              <div className="px-4 pb-4 text-sm text-gray-700 space-y-3">
                <div className="border-t border-blue-100 pt-3">
                  <h4 className="font-semibold text-blue-800 mb-2">Jak obliczane są wartości:</h4>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="font-medium text-blue-700 min-w-[100px]">Stan poranny:</span>
                      <span>Automatycznie = stan poranny z poprzedniego dnia - użyte z poprzedniego dnia. Możesz zmienić strzałkami w górę/dół.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium text-blue-700 min-w-[100px]">Użyte:</span>
                      <span>Wpisz ile palet zostało użytych w ciągu dnia.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium text-blue-700 min-w-[100px]">Zrobione:</span>
                      <span>Obliczane automatycznie = stan poranny (dziś) - stan poranny (wczoraj) + użyte.</span>
                    </li>
                  </ul>
                </div>

                <div className="border-t border-blue-100 pt-3">
                  <h4 className="font-semibold text-blue-800 mb-2">Co musisz uzupełnić:</h4>
                  <ol className="space-y-1 ml-4 list-decimal list-inside">
                    <li>Rano sprawdź <strong>stan poranny</strong> - jeśli się zgadza, zostaw. Jeśli nie - skoryguj strzałkami.</li>
                    <li>W ciągu dnia uzupełniaj kolumnę <strong>Użyte</strong> (ile palet zużyto).</li>
                    <li><strong>Zrobione</strong> obliczy się automatycznie.</li>
                    <li>Na koniec dnia kliknij <strong>Zapisz</strong>, a potem możesz <strong>Zamknąć dzień</strong>.</li>
                  </ol>
                </div>

                <div className="border-t border-blue-100 pt-3 text-xs text-gray-500">
                  <strong>Przykład:</strong> Wczoraj stan poranny = 10, użyte = 3. Dziś automatycznie stan poranny = 7 (10 - 3).
                  Jeśli dziś użyjesz 2, a jutro rano będzie 8 palet, to "Zrobione" = 8 - 7 + 2 = 3 (wyprodukowano 3 palety).
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Tabela - nagłówek (bez Stan końcowy) */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px]">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left px-3 py-2 text-xs md:text-sm font-medium text-muted-foreground w-[120px]">
                        Typ
                      </th>
                      <th className="text-center px-3 py-2 text-xs md:text-sm font-medium text-muted-foreground">
                        Stan poranny
                      </th>
                      <th className="text-center px-3 py-2 text-xs md:text-sm font-medium text-muted-foreground">
                        Użyte
                      </th>
                      <th className="text-center px-3 py-2 text-xs md:text-sm font-medium text-muted-foreground">
                        Zrobione
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Wiersze tabeli */}
                    {entriesWithLocalChanges.map((entry) => (
                      <PalletRow
                        key={entry.type}
                        entry={entry}
                        isEditable={isEditable}
                        threshold={thresholdMap.get(entry.type) ?? 10}
                        onUsedChange={(value) => handleUsedChange(entry.type, value)}
                        onMorningStockChange={(value) => handleMorningStockChange(entry.type, value)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Alerty - teraz bazują na stanie porannym */}
              {activeAlerts.length > 0 && (
                <div className="mt-4 space-y-2">
                  {activeAlerts.map((alert, index) => (
                    <div
                      key={`${alert.type}-${index}`}
                      className={cn(
                        'flex items-center gap-2 text-sm p-2 rounded-md',
                        alert.severity === 'critical'
                          ? 'text-red-600 bg-red-50'
                          : 'text-orange-600 bg-orange-50'
                      )}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        <strong>{PALLET_TYPE_LABELS[alert.type]}:</strong> Stan poranny ({alert.currentStock}) poniżej progu ({alert.threshold})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Przyciski akcji */}
              {isEditable && (
                <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || saveMutation.isPending}
                    className="gap-1"
                  >
                    <Save className="h-4 w-4" />
                    {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleCloseDay}
                    disabled={closeMutation.isPending}
                    className="gap-1"
                  >
                    <Lock className="h-4 w-4" />
                    {closeMutation.isPending ? 'Zamykanie...' : 'Zamknij dzień'}
                  </Button>
                </div>
              )}

              {/* Info dla dni zamkniętych */}
              {!isEditable && dayData && dayData.status === 'CLOSED' && (
                <div className="mt-4 text-sm text-muted-foreground text-center">
                  <span>
                    Dzień zamknięty{' '}
                    {dayData.closedAt &&
                      `(${new Date(dayData.closedAt).toLocaleString('pl-PL')})`}
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog ustawień alertów */}
      <AlertSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </TooltipProvider>
  );
};

export default PalletDayView;
