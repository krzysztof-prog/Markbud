'use client';

/**
 * Strona archiwum zleceń
 * Pokazuje zarchiwizowane zlecenia pogrupowane po latach (rok wyprodukowania)
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { ordersApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Archive, ArchiveRestore, RefreshCw, Calendar, Package } from 'lucide-react';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/lib/toast-helpers';
import { formatDate } from '@/lib/utils';
import { groszeToPln, type Grosze } from '@/lib/money';

// Rozszerzony typ Order z completedAt
interface ArchiveOrder {
  id: number;
  orderNumber: string;
  client?: string | null;
  system?: string | null;
  valuePln?: number | string | null;
  completedAt?: string | null;
  archivedAt?: string | null;
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ArchiwumPage() {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [unarchiveOrderId, setUnarchiveOrderId] = useState<number | null>(null);

  // Pobierz dostępne lata
  const { data: yearsData, isLoading: isLoadingYears } = useQuery({
    queryKey: ['archive-years'],
    queryFn: ordersApi.getArchiveYears,
  });

  // Ustaw pierwszy rok jako domyślny gdy dane się załadują
  const years = yearsData ?? [];
  const activeYear = selectedYear ?? years[0]?.year ?? new Date().getFullYear();

  // Pobierz zlecenia dla wybranego roku
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['archived-orders', activeYear],
    queryFn: () => ordersApi.getArchivedByYear(activeYear, { limit: 500 }),
    enabled: !!activeYear,
  });

  const orders = (ordersData?.orders ?? []) as ArchiveOrder[];
  const totalOrders = ordersData?.total ?? 0;

  // Mutacja odarchiwizacji
  const unarchiveMutation = useMutation({
    mutationFn: (orderId: number) => ordersApi.unarchive(orderId),
    onSuccess: () => {
      showSuccessToast('Zlecenie przywrócone', 'Zlecenie zostało przywrócone do aktywnych');
      queryClient.invalidateQueries({ queryKey: ['archived-orders'] });
      queryClient.invalidateQueries({ queryKey: ['archive-years'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setUnarchiveOrderId(null);
    },
    onError: () => {
      showErrorToast('Błąd', 'Nie udało się odarchiwizować zlecenia');
    },
  });

  // Mutacja ręcznego uruchomienia archiwizacji
  const triggerArchiveMutation = useMutation({
    mutationFn: ordersApi.triggerArchive,
    onSuccess: (result) => {
      if (result.archivedCount > 0) {
        showSuccessToast('Archiwizacja zakończona', `Zarchiwizowano ${result.archivedCount} zleceń`);
        queryClient.invalidateQueries({ queryKey: ['archived-orders'] });
        queryClient.invalidateQueries({ queryKey: ['archive-years'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      } else {
        showInfoToast('Brak zleceń', 'Nie ma zleceń do archiwizacji');
      }
    },
    onError: () => {
      showErrorToast('Błąd', 'Błąd podczas archiwizacji');
    },
  });

  // Statystyki dla aktywnego roku
  const stats = useMemo(() => {
    if (!orders.length) return { total: 0, totalValuePln: 0 };

    const totalValuePln = orders.reduce((sum, order) => {
      const value = typeof order.valuePln === 'string' ? parseInt(order.valuePln, 10) : (order.valuePln ?? 0);
      return sum + value;
    }, 0);

    return {
      total: totalOrders,
      totalValuePln,
    };
  }, [orders, totalOrders]);

  const handleUnarchive = (orderId: number) => {
    setUnarchiveOrderId(orderId);
  };

  const confirmUnarchive = () => {
    if (unarchiveOrderId) {
      unarchiveMutation.mutate(unarchiveOrderId);
    }
  };

  return (
    <>
      <Header title="Archiwum zleceń" />
      <main className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Archive className="h-8 w-8 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold">Archiwum zleceń</h1>
              <p className="text-sm text-muted-foreground">
                Zlecenia zarchiwizowane automatycznie 60 dni po wyprodukiwaniu
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => triggerArchiveMutation.mutate()}
            disabled={triggerArchiveMutation.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${triggerArchiveMutation.isPending ? 'animate-spin' : ''}`} />
            {triggerArchiveMutation.isPending ? 'Archiwizuję...' : 'Archiwizuj teraz'}
          </Button>
        </div>

        {/* Zakładki lat */}
        {isLoadingYears ? (
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </div>
        ) : years.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Archiwum jest puste</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Zlecenia są automatycznie archiwizowane 60 dni po wyprodukiwaniu.
                Gdy będą dostępne, pojawią się tutaj pogrupowane według roku.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v, 10))}>
            <TabsList className="mb-6">
              {years.map((yearData) => (
                <TabsTrigger key={yearData.year} value={yearData.year.toString()} className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {yearData.year}
                  <Badge variant="secondary" className="ml-1">
                    {yearData.count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {years.map((yearData) => (
              <TabsContent key={yearData.year} value={yearData.year.toString()}>
                {/* Statystyki roku */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Zleceń w {yearData.year}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        {stats.total}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Łączna wartość PLN
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {groszeToPln(stats.totalValuePln as Grosze).toLocaleString('pl-PL', {
                          style: 'currency',
                          currency: 'PLN',
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Rok wyprodukowania
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-muted-foreground">
                        {yearData.year}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela zleceń */}
                {isLoadingOrders ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : orders.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <p className="text-muted-foreground">Brak zleceń w tym roku</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nr zlecenia</TableHead>
                            <TableHead>Klient</TableHead>
                            <TableHead>System</TableHead>
                            <TableHead>Wyprodukowano</TableHead>
                            <TableHead>Zarchiwizowano</TableHead>
                            <TableHead className="text-right">Wartość PLN</TableHead>
                            <TableHead className="w-[100px]">Akcje</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.map((order) => (
                            <ArchiveTableRow
                              key={order.id}
                              order={order}
                              onUnarchive={handleUnarchive}
                              isUnarchiving={unarchiveMutation.isPending}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>

      {/* Dialog potwierdzenia odarchiwizacji */}
      <AlertDialog open={!!unarchiveOrderId} onOpenChange={() => setUnarchiveOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Przywrócić zlecenie?</AlertDialogTitle>
            <AlertDialogDescription>
              Zlecenie zostanie przywrócone do aktywnych zleceń.
              Będzie widoczne w zestawieniu zleceń.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unarchiveMutation.isPending}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnarchive}
              disabled={unarchiveMutation.isPending}
            >
              {unarchiveMutation.isPending ? 'Przywracam...' : 'Przywróć'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Komponent wiersza tabeli
function ArchiveTableRow({
  order,
  onUnarchive,
  isUnarchiving,
}: {
  order: ArchiveOrder;
  onUnarchive: (id: number) => void;
  isUnarchiving: boolean;
}) {
  // Bezpieczne parsowanie valuePln
  const valuePlnNum = typeof order.valuePln === 'string'
    ? parseInt(order.valuePln, 10)
    : (order.valuePln ?? 0);

  return (
    <TableRow>
      <TableCell className="font-medium">{order.orderNumber}</TableCell>
      <TableCell>{order.client || '-'}</TableCell>
      <TableCell>{order.system || '-'}</TableCell>
      <TableCell>
        {order.completedAt ? formatDate(order.completedAt) : '-'}
      </TableCell>
      <TableCell>
        {order.archivedAt ? formatDate(order.archivedAt) : '-'}
      </TableCell>
      <TableCell className="text-right">
        {valuePlnNum
          ? groszeToPln(valuePlnNum as Grosze).toLocaleString('pl-PL', {
              style: 'currency',
              currency: 'PLN',
            })
          : '-'}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onUnarchive(order.id)}
          disabled={isUnarchiving}
          title="Przywróć do aktywnych"
        >
          <ArchiveRestore className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
