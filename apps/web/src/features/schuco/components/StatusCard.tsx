'use client';

/**
 * Karta statusu ostatniego pobrania danych Schuco
 *
 * Wyświetla:
 * - Status ostatniego pobrania (sukces/błąd/w trakcie)
 * - Statystyki: ilość rekordów, nowe, zmienione
 * - Opcje: checkbox pokazywania przeglądarki, filtr dni, przycisk odświeżania
 * - Info o harmonogramie automatycznego pobierania
 * - REAL-TIME: Progress bar podczas pobierania przez WebSocket
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  PenLine,
  Timer,
  CalendarDays,
  Check,
  Loader2,
  StopCircle,
  Download,
  Package,
  X,
  ChevronDown,
  Calendar,
  ListChecks,
  Zap,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import { schucoApi } from '@/lib/api/schuco';
import type { SchucoFetchLog } from '@/types/schuco';
import type { SchucoStatistics } from '../types';
import { formatDatePL } from '../helpers/deliveryHelpers';
import { useSchucoRealtimeProgress } from '../hooks/useSchucoRealtimeProgress';
import {
  useSchucoItemsFetch,
  useSchucoItemsStats,
} from '../hooks/useSchucoItems';

interface StatusCardProps {
  /** Status ostatniego pobrania */
  status: SchucoFetchLog;
  /** Statystyki zmian */
  statistics: SchucoStatistics | undefined;
  /** Czy trwa odświeżanie */
  isRefreshing: boolean;
  /** Czy pokazywać przeglądarkę podczas odświeżania */
  showBrowser: boolean;
  /** Callback zmiany opcji pokazywania przeglądarki */
  onShowBrowserChange: (show: boolean) => void;
  /** Callback odświeżenia danych */
  onRefresh: () => void;
}

/**
 * Komponent karty statusu
 */
export const StatusCard: React.FC<StatusCardProps> = ({
  status,
  statistics,
  isRefreshing,
  showBrowser,
  onShowBrowserChange,
  onRefresh,
}) => {
  const queryClient = useQueryClient();

  // Hook do real-time progress przez WebSocket
  const realtimeProgress = useSchucoRealtimeProgress();

  // Aktywny postęp = z WebSocket lub z props
  const showProgress = isRefreshing || realtimeProgress.isActive;

  // Pobierz aktualne ustawienie dni filtra
  const { data: filterDaysData } = useQuery({
    queryKey: ['schuco', 'filter-days'],
    queryFn: schucoApi.getFilterDays,
    staleTime: 60000, // 1 minuta
  });

  // Pobierz aktualne ustawienie konkretnej daty filtra
  const { data: filterDateData } = useQuery({
    queryKey: ['schuco', 'filter-date'],
    queryFn: schucoApi.getFilterDate,
    staleTime: 60000, // 1 minuta
  });

  // Stan lokalny dla edycji dni
  const [editDays, setEditDays] = useState<string>('');
  const [isEditingDays, setIsEditingDays] = useState(false);

  // Stan lokalny dla edycji daty
  const [editDate, setEditDate] = useState<string>('');
  const [isEditingDate, setIsEditingDate] = useState(false);

  // Synchronizuj stan lokalny z danymi z API - dni
  useEffect(() => {
    if (filterDaysData?.days && !isEditingDays) {
      setEditDays(filterDaysData.days.toString());
    }
  }, [filterDaysData?.days, isEditingDays]);

  // Synchronizuj stan lokalny z danymi z API - data
  useEffect(() => {
    if (!isEditingDate) {
      setEditDate(filterDateData?.date || '');
    }
  }, [filterDateData?.date, isEditingDate]);

  // Mutacja do zapisania ustawienia dni
  const updateFilterDaysMutation = useMutation({
    mutationFn: (days: number) => schucoApi.setFilterDays(days),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schuco', 'filter-days'] });
      queryClient.invalidateQueries({ queryKey: ['schuco', 'filter-date'] }); // dni czyszczą datę
      toast({ variant: 'success', title: data.message });
      setIsEditingDays(false);
      setEditDate(''); // Wyczyść lokalny stan daty
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Błąd podczas zapisywania ustawienia' });
    },
  });

  // Mutacja do zapisania ustawienia daty
  const updateFilterDateMutation = useMutation({
    mutationFn: (date: string) => schucoApi.setFilterDate(date),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schuco', 'filter-date'] });
      toast({ variant: 'success', title: data.message });
      setIsEditingDate(false);
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Błąd podczas zapisywania daty' });
    },
  });

  // Mutacja do wyczyszczenia daty (powrót do filtra dni)
  const clearFilterDateMutation = useMutation({
    mutationFn: () => schucoApi.clearFilterDate(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schuco', 'filter-date'] });
      toast({ variant: 'success', title: data.message });
      setEditDate('');
      setIsEditingDate(false);
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Błąd podczas czyszczenia daty' });
    },
  });

  // Mutacja do anulowania importu
  const cancelImportMutation = useMutation({
    mutationFn: () => schucoApi.cancelImport(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schuco'] });
      if (data.cancelled) {
        toast({ variant: 'success', title: data.message });
      } else {
        toast({ variant: 'default', title: data.message });
      }
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Błąd podczas anulowania importu' });
    },
  });

  // Handler zapisu dni
  const handleSaveDays = () => {
    const days = parseInt(editDays, 10);
    if (isNaN(days) || days < 7 || days > 365) {
      toast({ variant: 'destructive', title: 'Liczba dni musi być między 7 a 365' });
      return;
    }
    updateFilterDaysMutation.mutate(days);
  };

  // Handler zapisu daty
  const handleSaveDate = () => {
    if (!editDate) {
      toast({ variant: 'destructive', title: 'Wybierz datę' });
      return;
    }
    // Walidacja formatu YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(editDate)) {
      toast({ variant: 'destructive', title: 'Nieprawidłowy format daty (YYYY-MM-DD)' });
      return;
    }
    updateFilterDateMutation.mutate(editDate);
  };

  // Handler czyszczenia daty (powrót do filtra dni)
  const handleClearDate = () => {
    clearFilterDateMutation.mutate();
  };

  // Sprawdź czy wartość się zmieniła
  const daysChanged = filterDaysData?.days?.toString() !== editDays;
  const dateChanged = (filterDateData?.date || '') !== editDate;

  // Czy jest ustawiona konkretna data (ma priorytet)
  const hasFilterDate = !!filterDateData?.date;

  // Pobieranie pozycji zamówień
  const itemsStats = useSchucoItemsStats();
  const fetchItemsMutation = useSchucoItemsFetch();

  // Stan dla dialogu wyboru daty
  const [isFromDateDialogOpen, setIsFromDateDialogOpen] = useState(false);
  const [fromDateValue, setFromDateValue] = useState<string>('');

  // Handler pobierania pozycji - brakujące (domyślne)
  const handleFetchMissing = () => {
    fetchItemsMutation.mutate(
      { mode: 'missing', limit: 100 },
      {
        onSuccess: (result) => {
          toast({
            variant: 'success',
            title: 'Pozycje pobrane',
            description: `Pobrano ${result.newItems + result.updatedItems} pozycji dla ${result.processedDeliveries} zamówień`,
          });
          queryClient.invalidateQueries({ queryKey: ['schuco', 'items'] });
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Błąd pobierania pozycji',
            description: error.message || 'Nie udało się pobrać pozycji',
          });
        },
      }
    );
  };

  // Handler pobierania wszystkich pozycji
  const handleFetchAll = () => {
    fetchItemsMutation.mutate(
      { mode: 'all', limit: 500 },
      {
        onSuccess: (result) => {
          toast({
            variant: 'success',
            title: 'Wszystkie pozycje pobrane',
            description: `Pobrano ${result.newItems + result.updatedItems} pozycji dla ${result.processedDeliveries} zamówień`,
          });
          queryClient.invalidateQueries({ queryKey: ['schuco', 'items'] });
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Błąd pobierania pozycji',
            description: error.message || 'Nie udało się pobrać pozycji',
          });
        },
      }
    );
  };

  // Handler pobierania od daty
  const handleFetchFromDate = () => {
    if (!fromDateValue) {
      toast({ variant: 'destructive', title: 'Wybierz datę' });
      return;
    }
    setIsFromDateDialogOpen(false);
    fetchItemsMutation.mutate(
      { mode: 'from-date', fromDate: fromDateValue, limit: 500 },
      {
        onSuccess: (result) => {
          toast({
            variant: 'success',
            title: 'Pozycje pobrane od daty',
            description: `Pobrano ${result.newItems + result.updatedItems} pozycji dla ${result.processedDeliveries} zamówień`,
          });
          queryClient.invalidateQueries({ queryKey: ['schuco', 'items'] });
          setFromDateValue('');
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Błąd pobierania pozycji',
            description: error.message || 'Nie udało się pobrać pozycji',
          });
        },
      }
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-base">Status ostatniego pobrania</CardTitle>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Checkbox pokazywania przeglądarki */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-browser"
                checked={showBrowser}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  onShowBrowserChange(!!checked)
                }
              />
              <Label htmlFor="show-browser" className="text-sm cursor-pointer">
                Pokaż przeglądarkę
              </Label>
            </div>

            {/* Sekcja filtra daty */}
            <div className="flex items-center gap-3 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600 cursor-help">Filtr:</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Data startowa lub liczba dni wstecz</p>
                  <p className="text-xs text-slate-400">Data ma priorytet nad dniami</p>
                </TooltipContent>
              </Tooltip>

              {/* Filtr konkretna data */}
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor="filter-date" className="text-xs text-slate-500 cursor-help">
                      Od daty:
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Pobieraj zamówienia od tej konkretnej daty</p>
                    <p className="text-xs text-slate-400">Ma priorytet nad liczbą dni</p>
                  </TooltipContent>
                </Tooltip>
                <Input
                  id="filter-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => {
                    setEditDate(e.target.value);
                    setIsEditingDate(true);
                  }}
                  onBlur={() => {
                    if (!dateChanged) {
                      setIsEditingDate(false);
                    }
                  }}
                  className={`w-36 h-8 text-sm ${hasFilterDate ? 'border-blue-400 bg-blue-50' : ''}`}
                />
                {dateChanged && editDate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={handleSaveDate}
                    disabled={updateFilterDateMutation.isPending}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                )}
                {hasFilterDate && !dateChanged && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={handleClearDate}
                        disabled={clearFilterDateMutation.isPending}
                      >
                        <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Wyczyść datę (użyj filtra dni)</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <span className="text-xs text-slate-400">lub</span>

              {/* Filtr dni wstecz */}
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor="filter-days" className="text-xs text-slate-500 cursor-help">
                      Ostatnie:
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ile dni wstecz pobierać zamówienia</p>
                    <p className="text-xs text-slate-400">Używane gdy nie ma konkretnej daty</p>
                  </TooltipContent>
                </Tooltip>
                <Input
                  id="filter-days"
                  type="number"
                  min={7}
                  max={365}
                  value={editDays}
                  onChange={(e) => {
                    setEditDays(e.target.value);
                    setIsEditingDays(true);
                  }}
                  onBlur={() => {
                    if (!daysChanged) {
                      setIsEditingDays(false);
                    }
                  }}
                  className={`w-16 h-8 text-sm ${!hasFilterDate ? 'border-blue-400 bg-blue-50' : ''}`}
                />
                <span className="text-xs text-slate-500">dni</span>
                {daysChanged && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={handleSaveDays}
                    disabled={updateFilterDaysMutation.isPending}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                )}
              </div>
            </div>

            {/* Przycisk odświeżania lub zatrzymania */}
            {showProgress ? (
              <Button
                onClick={() => cancelImportMutation.mutate()}
                disabled={cancelImportMutation.isPending}
                size="sm"
                variant="destructive"
                className="gap-2"
              >
                {cancelImportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <StopCircle className="h-4 w-4" />
                )}
                Zatrzymaj
              </Button>
            ) : (
              <Button
                onClick={onRefresh}
                disabled={showProgress}
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Odśwież dane
              </Button>
            )}
          </div>
        </div>

        {/* Real-time progress bar podczas pobierania */}
        {showProgress && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {realtimeProgress.stage || 'Pobieranie danych...'}
              </span>
              <span className="font-medium">{realtimeProgress.progress}%</span>
            </div>
            <Progress value={realtimeProgress.progress} className="h-2" />
            {realtimeProgress.details && (
              <p className="text-xs text-slate-500">{realtimeProgress.details}</p>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Grid ze statystykami */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Status */}
          <div>
            <p className="text-sm text-slate-500">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <StatusIndicator status={status.status} />
            </div>
          </div>

          {/* Ilość rekordów */}
          <div>
            <p className="text-sm text-slate-500">W ostatnim pobraniu</p>
            <p className="font-semibold text-lg">{status.recordsCount || 0}</p>
          </div>

          {/* Nowe */}
          <div>
            <p className="text-sm text-slate-500">Nowe (łącznie)</p>
            <div className="flex items-center gap-2 mt-1">
              {statistics?.new != null && statistics.new > 0 ? (
                <Badge className="bg-green-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  +{statistics.new}
                </Badge>
              ) : (
                <span className="font-semibold text-lg text-slate-400">0</span>
              )}
            </div>
          </div>

          {/* Zmienione */}
          <div>
            <p className="text-sm text-slate-500">Zmienione (łącznie)</p>
            <div className="flex items-center gap-2 mt-1">
              {statistics?.updated != null && statistics.updated > 0 ? (
                <Badge className="bg-orange-500">
                  <PenLine className="h-3 w-3 mr-1" />
                  {statistics.updated}
                </Badge>
              ) : (
                <span className="font-semibold text-lg text-slate-400">0</span>
              )}
            </div>
          </div>

          {/* Data pobrania */}
          <div>
            <p className="text-sm text-slate-500">Data pobrania</p>
            <p className="font-semibold text-sm">
              {formatDatePL(status.startedAt)}
            </p>
          </div>
        </div>

        {/* Komunikat błędu */}
        {status.errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            <strong>Błąd:</strong> {status.errorMessage}
          </div>
        )}

        {/* Sekcja pobierania pozycji zamówień */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-slate-600" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">Pozycje zamówień (artykuły)</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={() => {
                          queryClient.invalidateQueries({ queryKey: ['schuco', 'items', 'stats'] });
                          toast({ variant: 'default', title: 'Odświeżam statystyki...' });
                        }}
                        disabled={itemsStats.isFetching}
                      >
                        <RefreshCw className={`h-3 w-3 ${itemsStats.isFetching ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Odśwież statystyki</TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-slate-500">
                  {itemsStats.data ? (
                    <>
                      Pobrane: <strong>{itemsStats.data.withItems}</strong> / {itemsStats.data.totalDeliveries} zamówień
                      {' '}({itemsStats.data.totalItems} pozycji)
                      {itemsStats.data.withoutItems > 0 && (
                        <span className="ml-2 text-amber-600">
                          ({itemsStats.data.withoutItems} do pobrania)
                        </span>
                      )}
                    </>
                  ) : (
                    'Ładowanie statystyk...'
                  )}
                </p>
                {/* Status auto-pobierania pozycji */}
                <p className="text-xs text-slate-400 mt-0.5">
                  Auto-pobieranie:{' '}
                  <span className="text-green-600 font-medium">
                    automatyczne (1h po pobraniu zamówień)
                  </span>
                </p>
              </div>
            </div>

            {/* Dropdown menu z opcjami pobierania */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={fetchItemsMutation.isPending || showProgress}
                  className="gap-2"
                >
                  {fetchItemsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {fetchItemsMutation.isPending ? 'Pobieranie...' : 'Pobierz pozycje'}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Pobierz brakujące */}
                <DropdownMenuItem onClick={handleFetchMissing} disabled={fetchItemsMutation.isPending}>
                  <ListChecks className="h-4 w-4 mr-2 text-blue-600" />
                  <div>
                    <p className="font-medium">Pobierz brakujące</p>
                    <p className="text-xs text-slate-500">Tylko zamówienia bez pozycji</p>
                  </div>
                </DropdownMenuItem>

                {/* Pobierz wszystkie */}
                <DropdownMenuItem onClick={handleFetchAll} disabled={fetchItemsMutation.isPending}>
                  <Download className="h-4 w-4 mr-2 text-green-600" />
                  <div>
                    <p className="font-medium">Pobierz wszystkie</p>
                    <p className="text-xs text-slate-500">Nadpisz wszystkie pozycje</p>
                  </div>
                </DropdownMenuItem>

                {/* Pobierz od daty */}
                <DropdownMenuItem
                  onClick={() => setIsFromDateDialogOpen(true)}
                  disabled={fetchItemsMutation.isPending}
                >
                  <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                  <div>
                    <p className="font-medium">Pobierz od daty</p>
                    <p className="text-xs text-slate-500">Od wybranej daty zamówienia</p>
                  </div>
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Dialog wyboru daty */}
        <Dialog open={isFromDateDialogOpen} onOpenChange={setIsFromDateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Pobierz pozycje od daty</DialogTitle>
              <DialogDescription>
                Wybierz datę zamówienia. Zostaną pobrane pozycje dla wszystkich zamówień
                od tej daty do dziś.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="from-date-picker">Data zamówienia:</Label>
              <Input
                id="from-date-picker"
                type="date"
                value={fromDateValue}
                onChange={(e) => setFromDateValue(e.target.value)}
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsFromDateDialogOpen(false);
                  setFromDateValue('');
                }}
              >
                Anuluj
              </Button>
              <Button
                onClick={handleFetchFromDate}
                disabled={!fromDateValue || fetchItemsMutation.isPending}
              >
                {fetchItemsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Pobierz
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Info o harmonogramie */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <Timer className="h-4 w-4 inline mr-2" />
          Automatyczne pobieranie: <strong>8:00, 12:00, 15:00</strong> (codziennie)
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Wskaźnik statusu (ikona + badge)
 */
interface StatusIndicatorProps {
  status: SchucoFetchLog['status'];
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  switch (status) {
    case 'success':
      return (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <Badge variant="default" className="bg-green-600">
            Sukces
          </Badge>
        </>
      );
    case 'error':
      return (
        <>
          <XCircle className="h-4 w-4 text-red-600" />
          <Badge variant="destructive">Błąd</Badge>
        </>
      );
    default:
      return (
        <>
          <Clock className="h-4 w-4 text-yellow-600" />
          <Badge variant="secondary">W trakcie</Badge>
        </>
      );
  }
};

export default StatusCard;
