'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { schucoApi } from '@/lib/api';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MobileScrollHint } from '@/components/ui/mobile-scroll-hint';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import {
  RefreshCw,
  Warehouse,
  Truck,
  Package,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  PenLine,
  Timer,
  AlertTriangle,
  Calendar,
  CalendarClock,
  Trash2,
} from 'lucide-react';
import type { SchucoDelivery, SchucoFetchLog, SchucoDeliveriesResponse } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 100;

// Field name translations for display
const FIELD_LABELS: Record<string, string> = {
  shippingStatus: 'Status wysyłki',
  deliveryWeek: 'Tydzień dostawy',
  deliveryType: 'Rodzaj dostawy',
  tracking: 'Śledzenie',
  complaint: 'Reklamacja',
  orderType: 'Rodzaj zamówienia',
  totalAmount: 'Suma',
};

// Shipping status colors
const getShippingStatusBadge = (status: string) => {
  switch (status) {
    case 'Całkowicie dostarczone':
      return 'bg-green-600 text-white';
    case 'Potwierdzona dostawa':
      return 'bg-blue-600 text-white';
    case 'Częściowo dostarczono':
      return 'bg-amber-500 text-white';
    case 'Zlecenie anulowane':
      return 'bg-red-600 text-white';
    default:
      return 'bg-slate-200 text-slate-700';
  }
};

export default function DostawySchucoPageContent() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [showBrowser, setShowBrowser] = useState(false); // Default: hidden browser (headless: true)

  // Fetch deliveries with pagination
  const { data: deliveriesData, isLoading: isLoadingDeliveries } = useQuery<SchucoDeliveriesResponse>({
    queryKey: ['schuco-deliveries', 'v2', currentPage], // v2 forces cache reset
    queryFn: () => schucoApi.getDeliveries(currentPage, PAGE_SIZE),
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Fetch status
  const { data: status } = useQuery<SchucoFetchLog>({
    queryKey: ['schuco-status'],
    queryFn: () => schucoApi.getStatus(),
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ['schuco-statistics'],
    queryFn: () => schucoApi.getStatistics(),
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch logs
  const { data: logs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['schuco-logs'],
    queryFn: () => schucoApi.getLogs(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch deliveries by week
  const { data: byWeekData, isLoading: isLoadingByWeek } = useQuery({
    queryKey: ['schuco-by-week'],
    queryFn: () => schucoApi.getByWeek(),
    staleTime: 0,
    refetchOnMount: true,
  });

  // Cleanup pending mutation
  const cleanupPendingMutation = useMutation({
    mutationFn: () => schucoApi.cleanupPending(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schuco-logs'] });
      queryClient.invalidateQueries({ queryKey: ['schuco-status'] });
      showSuccessToast('Wyczyszczono', data.message);
    },
    onError: (error) => {
      showErrorToast('Błąd czyszczenia', getErrorMessage(error));
    },
  });

  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: () => schucoApi.refresh(!showBrowser), // Invert: showBrowser=false means headless=true
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schuco-deliveries', 'v2'] });
      queryClient.invalidateQueries({ queryKey: ['schuco-status'] });
      queryClient.invalidateQueries({ queryKey: ['schuco-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['schuco-logs'] });
      queryClient.invalidateQueries({ queryKey: ['schuco-by-week'] });
      setCurrentPage(1); // Reset to first page
      const changesInfo = data.newRecords || data.updatedRecords
        ? ` (Nowe: ${data.newRecords || 0}, Zmienione: ${data.updatedRecords || 0})`
        : '';
      showSuccessToast(
        'Dane odświeżone',
        `Pobrano ${data.recordsCount} rekordów w ${(data.durationMs / 1000).toFixed(1)}s${changesInfo}`
      );
    },
    onError: (error) => {
      showErrorToast('Błąd odświeżania', getErrorMessage(error));
    },
  });

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const deliveries = deliveriesData?.data || [];
  const totalPages = deliveriesData?.totalPages || 1;
  const total = deliveriesData?.total || 0;

  // DEBUG: Log change types
  console.log('Deliveries with changes:', deliveries.filter(d => d.changeType).map(d => ({
    orderNumber: d.orderNumber,
    changeType: d.changeType,
    changedFields: d.changedFields
  })));

  // Count changed records
  const changedCounts = useMemo(() => {
    const counts = { new: 0, updated: 0 };
    deliveries.forEach((d) => {
      if (d.changeType === 'new') counts.new++;
      else if (d.changeType === 'updated') counts.updated++;
    });
    return counts;
  }, [deliveries]);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);
  const goToLastPage = () => goToPage(totalPages);

  // Calculate display range
  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, total);

  // Get row classes based on change type
  const getRowClasses = (delivery: SchucoDelivery) => {
    if (delivery.changeType === 'new') {
      return 'bg-green-100 hover:bg-green-200 border-l-4 border-l-green-600';
    }
    if (delivery.changeType === 'updated') {
      return 'bg-orange-100 hover:bg-orange-200 border-l-4 border-l-orange-600';
    }
    return null; // Return null to allow baseStripeBg to be used
  };

  // Parse changed fields for tooltip
  const getChangedFieldsInfo = (delivery: SchucoDelivery): { field: string; oldValue: string | null }[] => {
    if (!delivery.changedFields || !delivery.previousValues) return [];
    try {
      const fields = JSON.parse(delivery.changedFields) as string[];
      const prevValues = JSON.parse(delivery.previousValues) as Record<string, string | null>;
      return fields.map((field) => ({
        field: FIELD_LABELS[field] || field,
        oldValue: prevValues[field],
      }));
    } catch {
      return [];
    }
  };

  // Sprawdź czy tydzień dostawy się zmienił
  const hasDeliveryWeekChanged = (delivery: SchucoDelivery): boolean => {
    if (!delivery.changedFields || delivery.changeType !== 'updated') return false;
    try {
      const fields = JSON.parse(delivery.changedFields) as string[];
      return fields.includes('deliveryWeek');
    } catch {
      return false;
    }
  };

  // Policz pending logi
  const pendingLogsCount = useMemo(() => {
    return logs.filter((log) => log.status === 'pending').length;
  }, [logs]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <Header title="Dostawy Schuco">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót do dashboardu
            </Link>
          </Button>
        </Header>

        <div className="px-6 pt-4">
          <Breadcrumb
            items={[
              { label: 'Dostawy Schuco', icon: <Truck className="h-4 w-4" /> },
            ]}
          />
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {/* Critical Error Alert Banner */}
          {status?.status === 'error' && (
            <div className="mb-6 p-4 bg-red-600 text-white rounded-lg shadow-lg animate-pulse">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold">Błąd pobierania danych Schuco!</h3>
                  <p className="text-red-100 mt-1">
                    Ostatnie automatyczne pobranie danych nie powiodło się.
                    {status.errorMessage && (
                      <span className="block mt-1 text-sm">
                        Szczegóły: {status.errorMessage}
                      </span>
                    )}
                  </p>
                  <p className="text-red-200 text-sm mt-2">
                    Data próby: {new Date(status.startedAt).toLocaleString('pl-PL')}
                  </p>
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshMutation.isPending}
                  variant="secondary"
                  className="bg-white text-red-600 hover:bg-red-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                  Spróbuj ponownie
                </Button>
              </div>
            </div>
          )}

          {/* Status Card */}
          {status && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Status ostatniego pobrania</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="show-browser"
                        checked={showBrowser}
                        onCheckedChange={(checked: boolean | 'indeterminate') => setShowBrowser(!!checked)}
                      />
                      <Label htmlFor="show-browser" className="text-sm cursor-pointer">
                        Pokaż przeglądarkę
                      </Label>
                    </div>
                    <Button
                      onClick={handleRefresh}
                      disabled={refreshMutation.isPending}
                      size="sm"
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                      {refreshMutation.isPending ? 'Pobieram...' : 'Odśwież dane'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      {status.status === 'success' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <Badge variant="default" className="bg-green-600">Sukces</Badge>
                        </>
                      ) : status.status === 'error' ? (
                        <>
                          <XCircle className="h-4 w-4 text-red-600" />
                          <Badge variant="destructive">Błąd</Badge>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <Badge variant="secondary">W trakcie</Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">W ostatnim pobraniu</p>
                    <p className="font-semibold text-lg">{status.recordsCount || 0}</p>
                  </div>
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
                  <div>
                    <p className="text-sm text-slate-500">Data pobrania</p>
                    <p className="font-semibold text-sm">
                      {new Date(status.startedAt).toLocaleString('pl-PL')}
                    </p>
                  </div>
                </div>
                {status.errorMessage && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <strong>Błąd:</strong> {status.errorMessage}
                  </div>
                )}
                {/* Schedule info */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  <Timer className="h-4 w-4 inline mr-2" />
                  Automatyczne pobieranie: <strong>8:00, 12:00, 15:00</strong> (codziennie)
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content with Tabs */}
          <Tabs defaultValue="deliveries" className="space-y-4">
            <TabsList>
              <TabsTrigger value="deliveries">
                Dostawy
                {total > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {total}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="by-week">
                <Calendar className="h-4 w-4 mr-1" />
                Tygodniowy plan
                {byWeekData?.weeks && byWeekData.weeks.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {byWeekData.weeks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="logs">
                Historia pobrań
                {logs.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {logs.length}
                  </Badge>
                )}
                {pendingLogsCount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {pendingLogsCount} pending
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Deliveries Tab */}
            <TabsContent value="deliveries" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-blue-600" />
                      <CardTitle>Lista zamówień ({total})</CardTitle>
                  {/* Change indicators */}
                  {(changedCounts.new > 0 || changedCounts.updated > 0) && (
                    <div className="flex items-center gap-2 ml-4">
                      {changedCounts.new > 0 && (
                        <Badge className="bg-green-600">
                          <Sparkles className="h-3 w-3 mr-1" />
                          {changedCounts.new} nowe
                        </Badge>
                      )}
                      {changedCounts.updated > 0 && (
                        <Badge className="bg-amber-500">
                          <PenLine className="h-3 w-3 mr-1" />
                          {changedCounts.updated} zmienione
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                {total > 0 && (
                  <p className="text-sm text-slate-500">
                    Wyświetlono {startItem}-{endItem} z {total} (strona {currentPage} z {totalPages})
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDeliveries ? (
                <TableSkeleton rows={10} columns={7} />
              ) : !deliveries || deliveries.length === 0 ? (
                <EmptyState
                  icon={<Package className="h-12 w-12" />}
                  title="Brak dostaw"
                  description="Nie znaleziono danych o dostawach Schuco. Kliknij 'Odśwież dane' aby pobrać dane ze strony Schuco."
                  action={{
                    label: 'Odśwież dane',
                    onClick: handleRefresh,
                  }}
                />
              ) : (
                <>
                  {/* Legend */}
                  <div className="mb-4 flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-50 border-l-4 border-l-green-500 rounded-sm" />
                      <span>Nowe zamówienie</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-amber-50 border-l-4 border-l-amber-500 rounded-sm" />
                      <span>Zmienione (kliknij by zobaczyć szczegóły)</span>
                    </div>
                  </div>
                  <MobileScrollHint />
                  <div className="overflow-x-auto max-w-full max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead className="bg-slate-50 border-b sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">
                            Data zamówienia
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">
                            Nr zamówienia
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">
                            Tydzień dostawy
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">
                            Zlecenie
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">
                            Status wysyłki
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-900">
                            Suma
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveries.map((delivery: SchucoDelivery, index: number) => {
                          const changesInfo = getChangedFieldsInfo(delivery);
                          const baseStripeBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-100';
                          const changeClasses = getRowClasses(delivery);
                          const rowContent = (
                            <tr
                              key={delivery.id}
                              className={cn(
                                'border-b transition-colors',
                                changeClasses ? changeClasses : `${baseStripeBg} hover:bg-slate-50`
                              )}
                            >
                              <td className="px-4 py-3">
                                {delivery.orderDate}
                                {delivery.changeType === 'new' && (
                                  <Badge className="ml-2 bg-green-600 text-xs">NOWE</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono">{delivery.orderNumber}</td>
                              <td className="px-4 py-3">
                                <span className="flex items-center gap-1">
                                  {delivery.deliveryWeek || '-'}
                                  {hasDeliveryWeekChanged(delivery) && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full cursor-help">
                                          <CalendarClock className="h-3 w-3" />
                                          nowa data!
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Tydzień dostawy został zmieniony</p>
                                        {(() => {
                                          const info = getChangedFieldsInfo(delivery);
                                          const weekChange = info.find(i => i.field === 'Tydzień dostawy');
                                          return weekChange ? (
                                            <p className="text-slate-400">
                                              Poprzednio: <span className="line-through">{weekChange.oldValue || '(brak)'}</span>
                                            </p>
                                          ) : null;
                                        })()}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3">{delivery.orderName}</td>
                              <td className="px-4 py-3">
                                <Badge className={getShippingStatusBadge(delivery.shippingStatus)}>{delivery.shippingStatus}</Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                {delivery.totalAmount || '-'}
                              </td>
                            </tr>
                          );

                          // Wrap updated rows with tooltip
                          if (delivery.changeType === 'updated' && changesInfo.length > 0) {
                            return (
                              <Tooltip key={delivery.id}>
                                <TooltipTrigger asChild>{rowContent}</TooltipTrigger>
                                <TooltipContent side="top" className="max-w-sm">
                                  <div className="text-xs">
                                    <p className="font-semibold mb-2">Zmienione pola:</p>
                                    <ul className="space-y-1">
                                      {changesInfo.map((change, idx) => (
                                        <li key={idx}>
                                          <span className="font-medium">{change.field}:</span>{' '}
                                          <span className="text-slate-500 line-through">
                                            {change.oldValue || '(brak)'}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                    <p className="mt-2 text-slate-500">
                                      Zmieniono: {delivery.changedAt
                                        ? new Date(delivery.changedAt).toLocaleString('pl-PL')
                                        : '-'}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          }

                          return rowContent;
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-slate-500">
                        Strona {currentPage} z {totalPages}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToFirstPage}
                          disabled={currentPage === 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousPage}
                          disabled={currentPage === 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {/* Page numbers */}
                        <div className="flex items-center gap-1 mx-2">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => goToPage(pageNum)}
                                className="h-8 w-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToLastPage}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Week Tab - Tygodniowy plan dostaw */}
        <TabsContent value="by-week" className="space-y-4">
          {isLoadingByWeek ? (
            <Card>
              <CardContent className="pt-6">
                <TableSkeleton rows={5} columns={4} />
              </CardContent>
            </Card>
          ) : !byWeekData?.weeks || byWeekData.weeks.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={<Calendar className="h-12 w-12" />}
                  title="Brak danych"
                  description="Nie znaleziono zamówień z przypisanym tygodniem dostawy."
                />
              </CardContent>
            </Card>
          ) : (() => {
            // Podziel tygodnie na nadchodzące i przeszłe
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const upcomingWeeks: typeof byWeekData.weeks = [];
            const pastWeeks: typeof byWeekData.weeks = [];

            for (const weekData of byWeekData.weeks) {
              const weekStart = weekData.weekStart ? new Date(weekData.weekStart) : null;
              if (!weekStart) {
                upcomingWeeks.push(weekData); // brak daty = traktuj jako nadchodzące
                continue;
              }

              // Tydzień kończy się 7 dni po rozpoczęciu
              const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

              if (weekEnd >= today) {
                // Tydzień jeszcze trwa lub jest w przyszłości
                upcomingWeeks.push(weekData);
              } else {
                // Tydzień już minął
                pastWeeks.push(weekData);
              }
            }

            // Sortuj nadchodzące od najbliższego (rosnąco)
            upcomingWeeks.sort((a, b) => {
              if (!a.weekStart && !b.weekStart) return 0;
              if (!a.weekStart) return 1;
              if (!b.weekStart) return -1;
              return new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime();
            });

            // Sortuj przeszłe od najnowszego (malejąco)
            pastWeeks.sort((a, b) => {
              if (!a.weekStart && !b.weekStart) return 0;
              if (!a.weekStart) return 1;
              if (!b.weekStart) return -1;
              return new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime();
            });

            // Ogranicz do 5 najbliższych
            const displayUpcoming = upcomingWeeks.slice(0, 5);

            // Renderer dla pojedynczego tygodnia
            const renderWeek = (weekData: typeof byWeekData.weeks[0], isPast: boolean = false) => {
              const weekStart = weekData.weekStart ? new Date(weekData.weekStart) : null;
              const isCurrentWeek = weekStart &&
                weekStart <= today &&
                new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) > today;

              return (
                <div
                  key={weekData.week}
                  className={cn(
                    'border rounded-lg overflow-hidden',
                    isCurrentWeek && 'border-blue-500 border-2 shadow-md',
                    isPast && 'opacity-70'
                  )}
                >
                  {/* Nagłówek tygodnia */}
                  <div className={cn(
                    'px-4 py-3 flex items-center justify-between',
                    isCurrentWeek ? 'bg-blue-100' : isPast ? 'bg-slate-200' : 'bg-slate-100'
                  )}>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{weekData.week}</h3>
                      {isCurrentWeek && (
                        <Badge className="bg-blue-600">Bieżący tydzień</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {weekData.count} {weekData.count === 1 ? 'zamówienie' :
                          weekData.count < 5 ? 'zamówienia' : 'zamówień'}
                      </Badge>
                      {weekStart && (
                        <span className="text-sm text-slate-500">
                          od {weekStart.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lista zamówień */}
                  <div className="divide-y">
                    {weekData.deliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        className={cn(
                          'px-4 py-2 flex items-center justify-between hover:bg-slate-50',
                          delivery.changeType === 'new' && 'bg-green-50',
                          delivery.changeType === 'updated' && 'bg-orange-50'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-sm">{delivery.orderNumber}</span>
                          <span className="text-slate-600">{delivery.orderName}</span>
                          {delivery.changeType === 'new' && (
                            <Badge className="bg-green-600 text-xs">NOWE</Badge>
                          )}
                          {delivery.changeType === 'updated' && (
                            <Badge className="bg-orange-500 text-xs">ZMIENIONE</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getShippingStatusBadge(delivery.shippingStatus)}>
                            {delivery.shippingStatus}
                          </Badge>
                          {delivery.totalAmount && (
                            <span className="font-semibold text-sm">{delivery.totalAmount}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            };

            return (
              <>
                {/* Nadchodzące dostawy - max 5 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <CardTitle>Nadchodzące dostawy</CardTitle>
                      </div>
                      {upcomingWeeks.length > 5 && (
                        <Badge variant="outline" className="text-slate-500">
                          +{upcomingWeeks.length - 5} więcej tygodni
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {displayUpcoming.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Brak nadchodzących dostaw</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {displayUpcoming.map((weekData) => renderWeek(weekData, false))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Historia - przeszłe tygodnie */}
                {pastWeeks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-slate-500" />
                        <CardTitle className="text-slate-600">Historia dostaw</CardTitle>
                        <Badge variant="secondary">{pastWeeks.length} {pastWeeks.length === 1 ? 'tydzień' : 'tygodni'}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {pastWeeks.map((weekData) => renderWeek(weekData, true))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Historia pobrań</CardTitle>
                {pendingLogsCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cleanupPendingMutation.mutate()}
                    disabled={cleanupPendingMutation.isPending}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <Trash2 className={cn('h-4 w-4 mr-2', cleanupPendingMutation.isPending && 'animate-spin')} />
                    Wyczyść {pendingLogsCount} pending
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <TableSkeleton rows={5} columns={6} />
              ) : logs.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-12 w-12" />}
                  title="Brak historii"
                  description="Nie znaleziono historii pobierań danych ze Schuco."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Data</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Trigger</th>
                        <th className="text-left p-3 font-medium">Rekordów</th>
                        <th className="text-left p-3 font-medium">Nowe</th>
                        <th className="text-left p-3 font-medium">Zmienione</th>
                        <th className="text-left p-3 font-medium">Czas</th>
                        <th className="text-left p-3 font-medium">Błąd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-slate-50">
                          <td className="p-3">
                            {log.startedAt && new Date(log.startedAt).toLocaleString('pl-PL')}
                          </td>
                          <td className="p-3">
                            {log.status === 'success' ? (
                              <Badge variant="default" className="bg-green-600">Sukces</Badge>
                            ) : log.status === 'error' ? (
                              <Badge variant="destructive">Błąd</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant={log.triggerType === 'manual' ? 'default' : 'secondary'}>
                              {log.triggerType === 'manual' ? 'Ręczny' : 'Automatyczny'}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-600">{log.recordsCount || '-'}</td>
                          <td className="p-3">
                            {log.newRecords != null && log.newRecords > 0 ? (
                              <Badge className="bg-green-600 text-xs">+{log.newRecords}</Badge>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            {log.updatedRecords != null && log.updatedRecords > 0 ? (
                              <Badge className="bg-orange-500 text-xs">{log.updatedRecords}</Badge>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">
                            {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}
                          </td>
                          <td className="p-3 text-red-600 text-xs max-w-xs truncate">
                            {log.errorMessage || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
