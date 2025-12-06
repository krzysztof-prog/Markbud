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

export default function DostawySchucoPage() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [showBrowser, setShowBrowser] = useState(false); // Default: hidden browser (headless: true)

  // Fetch deliveries with pagination
  const { data: deliveriesData, isLoading: isLoadingDeliveries } = useQuery<SchucoDeliveriesResponse>({
    queryKey: ['schuco-deliveries', currentPage],
    queryFn: () => schucoApi.getDeliveries(currentPage, PAGE_SIZE),
  });

  // Fetch status
  const { data: status } = useQuery<SchucoFetchLog>({
    queryKey: ['schuco-status'],
    queryFn: () => schucoApi.getStatus(),
  });

  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: () => schucoApi.refresh(!showBrowser), // Invert: showBrowser=false means headless=true
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schuco-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['schuco-status'] });
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
      return 'bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500';
    }
    if (delivery.changeType === 'updated') {
      return 'bg-amber-50 hover:bg-amber-100 border-l-4 border-l-amber-500';
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

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <Header title="Dostawy Schuco">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/magazyn">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót do menu
            </Link>
          </Button>
        </Header>

        <div className="px-6 pt-4">
          <Breadcrumb
            items={[
              { label: 'Magazyn', href: '/magazyn', icon: <Warehouse className="h-4 w-4" /> },
              { label: 'Dostawy Schuco' },
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
                    <p className="text-sm text-slate-500">Rekordów</p>
                    <p className="font-semibold text-lg">{status.recordsCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Nowe</p>
                    <div className="flex items-center gap-2 mt-1">
                      {status.newRecords != null && status.newRecords > 0 ? (
                        <Badge className="bg-green-600">
                          <Sparkles className="h-3 w-3 mr-1" />
                          +{status.newRecords}
                        </Badge>
                      ) : (
                        <span className="font-semibold text-lg text-slate-400">0</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Zmienione</p>
                    <div className="flex items-center gap-2 mt-1">
                      {status.updatedRecords != null && status.updatedRecords > 0 ? (
                        <Badge className="bg-amber-500">
                          <PenLine className="h-3 w-3 mr-1" />
                          {status.updatedRecords}
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

          {/* Deliveries Table */}
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
                    <table className="w-full text-sm min-w-[1200px]">
                      <thead className="bg-slate-50 border-b sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">
                            Data zamówienia
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">
                            Nr zamówienia
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">
                            Zlecenie
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">
                            Status wysyłki
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">
                            Tydzień dostawy
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-900">
                            Rodzaj zamówienia
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
                              <td className="px-4 py-3">{delivery.orderName}</td>
                              <td className="px-4 py-3">
                                <Badge className={getShippingStatusBadge(delivery.shippingStatus)}>{delivery.shippingStatus}</Badge>
                              </td>
                              <td className="px-4 py-3">{delivery.deliveryWeek || '-'}</td>
                              <td className="px-4 py-3">{delivery.orderType || '-'}</td>
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
        </div>
      </div>
    </TooltipProvider>
  );
}
