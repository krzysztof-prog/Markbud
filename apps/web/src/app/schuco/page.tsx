'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { schucoApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import {
  RefreshCw,
  Search,
  Package,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Truck,
  Calendar
} from 'lucide-react';
import type { SchucoDelivery, SchucoFetchLog } from '@/types';

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function SchucoPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Reset page when search changes
  useEffect(() => {
    if (debouncedSearchQuery) {
      setCurrentPage(1);
    }
  }, [debouncedSearchQuery]);

  // Fetch deliveries with pagination
  const { data: deliveriesData, isLoading: loadingDeliveries } = useQuery({
    queryKey: ['schuco-deliveries', currentPage],
    queryFn: () => schucoApi.getDeliveries(currentPage, 100),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch status
  const { data: status, isLoading: loadingStatus } = useQuery({
    queryKey: ['schuco-status'],
    queryFn: schucoApi.getStatus,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 30000,
  });

  // Fetch logs
  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['schuco-logs'],
    queryFn: schucoApi.getLogs,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Refresh mutation with error handling
  const refreshMutation = useMutation({
    mutationFn: () => schucoApi.refresh(true), // Always headless for this page
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schuco-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['schuco-status'] });
      queryClient.invalidateQueries({ queryKey: ['schuco-logs'] });

      toast({
        variant: 'success',
        title: 'Odświeżanie zakończone',
        description: `Pobrano ${data.recordsCount} rekordów w ${(data.durationMs / 1000).toFixed(1)}s`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Błąd odświeżania',
        description: error.message || 'Nie udało się pobrać danych ze Schuco',
      });
    },
  });

  const handleRefresh = () => {
    setShowConfirmDialog(true);
  };

  const confirmRefresh = () => {
    setShowConfirmDialog(false);
    refreshMutation.mutate();
  };

  // Memoized helper functions
  const getStatusColor = useCallback((status: string) => {
    if (status.includes('Wysłane') || status.includes('Dostarczone')) return 'text-green-600';
    if (status.includes('W drodze')) return 'text-blue-600';
    if (status.includes('magazynie')) return 'text-yellow-600';
    return 'text-slate-600';
  }, []);

  const getChangeTypeBadge = useCallback((changeType: SchucoDelivery['changeType']) => {
    if (changeType === 'new') {
      return <Badge variant="default" className="text-xs">Nowe</Badge>;
    }
    if (changeType === 'updated') {
      return <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">Zmienione</Badge>;
    }
    return null;
  }, []);

  // Filter deliveries by search query with memoization
  const filteredDeliveries = useMemo(() => {
    if (!deliveriesData?.data) return [];
    if (!debouncedSearchQuery) return deliveriesData.data;

    const query = debouncedSearchQuery.toLowerCase();
    return deliveriesData.data.filter((delivery) =>
      delivery.orderNumber.toLowerCase().includes(query) ||
      delivery.projectNumber.toLowerCase().includes(query) ||
      delivery.orderName.toLowerCase().includes(query)
    );
  }, [deliveriesData?.data, debouncedSearchQuery]);

  // Count deliveries by status for tabs
  const deliveriesCount = useMemo(() => filteredDeliveries?.length || 0, [filteredDeliveries]);
  const logsCount = useMemo(() => logs.length, [logs.length]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Schuco - Tracking dostaw" />

      <main className="p-6 space-y-6">
        {/* Status Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Ostatnie pobieranie
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStatus ? (
                <div className="text-sm text-slate-500">Ładowanie...</div>
              ) : status ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {status.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : status.status === 'error' ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className="text-sm font-semibold">
                      {status.status === 'success' ? 'Sukces' : status.status === 'error' ? 'Błąd' : 'W trakcie'}
                    </span>
                  </div>
                  {status.completedAt && (
                    <div className="text-xs text-slate-600">
                      {new Date(status.completedAt).toLocaleString('pl-PL')}
                    </div>
                  )}
                  {status.durationMs && (
                    <div className="text-xs text-slate-500">
                      Czas: {(status.durationMs / 1000).toFixed(1)}s
                    </div>
                  )}
                  {status.recordsCount !== null && (
                    <div className="text-xs text-slate-500">
                      Rekordów: {status.recordsCount}
                      {status.newRecords !== null && ` (${status.newRecords} nowych, ${status.updatedRecords} zaktualizowanych)`}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-500">Brak danych</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Liczba dostaw
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {deliveriesData?.total || 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Wszystkich zamówień
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Akcje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
                className="w-full"
                size="sm"
              >
                {refreshMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Odświeżanie...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Odśwież teraz
                  </>
                )}
              </Button>
              {refreshMutation.isPending && (
                <div className="space-y-2 mt-2">
                  <Progress value={33} className="h-1" />
                  <div className="text-xs text-slate-500 text-center">
                    Pobieranie danych... Może potrwać do 3 minut
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Confirm Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Potwierdź odświeżanie</DialogTitle>
              <DialogDescription>
                Odświeżanie danych ze Schuco może potrwać do 3 minut. Czy chcesz kontynuować?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Anuluj
              </Button>
              <Button onClick={confirmRefresh}>
                Kontynuuj
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Main Content Tabs */}
        <Tabs defaultValue="deliveries" className="space-y-4">
          <TabsList>
            <TabsTrigger value="deliveries">
              Dostawy
              {deliveriesCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {deliveriesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs">
              Historia pobierań
              {logsCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {logsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Lista dostaw Schuco</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Szukaj po numerze..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDeliveries ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-24" />
                        <Skeleton className="h-12 w-32" />
                        <Skeleton className="h-12 flex-1" />
                        <Skeleton className="h-12 w-40" />
                        <Skeleton className="h-12 w-20" />
                      </div>
                    ))}
                  </div>
                ) : !filteredDeliveries || filteredDeliveries.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    {searchQuery ? 'Nie znaleziono dostaw pasujących do zapytania' : 'Brak dostaw'}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium">Data</th>
                            <th className="text-left p-3 font-medium">Zamówienie</th>
                            <th className="text-left p-3 font-medium">Projekt</th>
                            <th className="text-left p-3 font-medium">Nazwa</th>
                            <th className="text-left p-3 font-medium">Status</th>
                            <th className="text-left p-3 font-medium">Tydzień</th>
                            <th className="text-left p-3 font-medium">Tracking</th>
                            <th className="text-left p-3 font-medium">Kwota</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDeliveries.map((delivery) => (
                            <tr
                              key={delivery.id}
                              className="border-b hover:bg-slate-50 transition-colors"
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-slate-400" />
                                  {delivery.orderDate}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{delivery.orderNumber}</span>
                                  {getChangeTypeBadge(delivery.changeType)}
                                </div>
                              </td>
                              <td className="p-3 text-slate-600">{delivery.projectNumber}</td>
                              <td className="p-3">
                                <div className="max-w-xs truncate" title={delivery.orderName}>
                                  {delivery.orderName}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className={`flex items-center gap-1 ${getStatusColor(delivery.shippingStatus)}`}>
                                  <Truck className="h-4 w-4" />
                                  <span>{delivery.shippingStatus}</span>
                                </div>
                              </td>
                              <td className="p-3 text-slate-600">{delivery.deliveryWeek || '-'}</td>
                              <td className="p-3">
                                {delivery.tracking ? (
                                  <span className="text-blue-600 font-mono text-xs">{delivery.tracking}</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-3 text-slate-600">{delivery.totalAmount || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {deliveriesData && deliveriesData.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="text-sm text-slate-600">
                          Strona {deliveriesData.page} z {deliveriesData.totalPages}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            Poprzednia
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(deliveriesData.totalPages, p + 1))}
                            disabled={currentPage === deliveriesData.totalPages}
                          >
                            Następna
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historia pobierań</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-40" />
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-10 flex-1" />
                      </div>
                    ))}
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">Brak historii</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Data</th>
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Trigger</th>
                          <th className="text-left p-3 font-medium">Rekordów</th>
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
                            <td className="p-3 text-slate-600">
                              {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}
                            </td>
                            <td className="p-3 text-red-600 text-xs">
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

        {/* Delivery Details Modal - TODO: Implement if needed */}
      </main>
    </div>
  );
}
