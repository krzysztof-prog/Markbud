'use client';

/**
 * Zakładka z archiwum zrealizowanych dostaw Schuco
 *
 * Wyświetla dostawy zarchiwizowane (status "Potwierdzona dostawa" > 3 miesiące).
 * Archiwizacja odbywa się automatycznie o 2:00 w nocy.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Archive, ChevronLeft, ChevronRight, Play, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { schucoApi } from '@/lib/api/schuco';
import { useToast } from '@/components/ui/use-toast';
import type { ArchiveResponse, ArchiveStats } from '../types';
import { getShippingStatusBadgeClass, formatDatePL } from '../helpers/deliveryHelpers';

const ARCHIVE_PAGE_SIZE = 50;

/**
 * Komponent zakładki archiwum
 */
export const ArchiveTab: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Pobierz dane archiwum
  const {
    data: archiveData,
    isLoading: isLoadingArchive,
  } = useQuery<ArchiveResponse>({
    queryKey: ['schuco', 'archive', currentPage],
    queryFn: () => schucoApi.getArchive(currentPage, ARCHIVE_PAGE_SIZE),
  });

  // Pobierz statystyki archiwum
  const {
    data: stats,
    isLoading: isLoadingStats,
  } = useQuery<ArchiveStats>({
    queryKey: ['schuco', 'archive', 'stats'],
    queryFn: () => schucoApi.getArchiveStats(),
  });

  // Mutacja do ręcznego uruchomienia archiwizacji
  const runArchiveMutation = useMutation({
    mutationFn: () => schucoApi.runArchive(),
    onSuccess: (data) => {
      toast({
        title: 'Archiwizacja zakończona',
        description: data.message,
      });
      // Odśwież dane archiwum
      queryClient.invalidateQueries({ queryKey: ['schuco', 'archive'] });
      queryClient.invalidateQueries({ queryKey: ['schuco', 'deliveries'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd archiwizacji',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const items = archiveData?.items || [];
  const total = archiveData?.total || 0;
  const totalPages = archiveData?.totalPages || 1;

  // Oblicz zakres wyświetlanych elementów
  const startItem = total > 0 ? (currentPage - 1) * ARCHIVE_PAGE_SIZE + 1 : 0;
  const endItem = Math.min(currentPage * ARCHIVE_PAGE_SIZE, total);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-slate-600">Archiwum dostaw</CardTitle>
            {!isLoadingStats && stats && (
              <Badge variant="secondary">
                {stats.totalArchived} zarchiwizowanych
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runArchiveMutation.mutate()}
            disabled={runArchiveMutation.isPending}
            className="gap-2"
          >
            <Play className={cn('h-4 w-4', runArchiveMutation.isPending && 'animate-spin')} />
            {runArchiveMutation.isPending ? 'Archiwizuję...' : 'Uruchom archiwizację'}
          </Button>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Zrealizowane dostawy (status &quot;Potwierdzona dostawa&quot;) starsze niż 3 miesiące.
          Archiwizacja automatyczna codziennie o 2:00.
        </p>
        {!isLoadingStats && stats?.oldestArchived && (
          <p className="text-xs text-slate-400 mt-1">
            <Clock className="h-3 w-3 inline mr-1" />
            Najstarsza archiwizacja: {formatDatePL(stats.oldestArchived)}
            {stats.newestArchived && stats.oldestArchived !== stats.newestArchived && (
              <> | Najnowsza: {formatDatePL(stats.newestArchived)}</>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoadingArchive ? (
          <TableSkeleton rows={10} columns={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Archive className="h-12 w-12" />}
            title="Brak zarchiwizowanych dostaw"
            description="Dostawy ze statusem &quot;Potwierdzona dostawa&quot; starsze niż 3 miesiące zostaną automatycznie zarchiwizowane."
          />
        ) : (
          <>
            {/* Tabela archiwum */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Nr zamówienia</th>
                    <th className="text-left p-3 font-medium">Nazwa</th>
                    <th className="text-left p-3 font-medium">Data zamówienia</th>
                    <th className="text-left p-3 font-medium">Tydzień dostawy</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Kwota</th>
                    <th className="text-left p-3 font-medium">Data archiwizacji</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-mono text-sm">{item.orderNumber}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">
                        {item.orderName}
                      </td>
                      <td className="p-3 text-slate-500">{item.orderDate}</td>
                      <td className="p-3 text-slate-500">{item.deliveryWeek || '-'}</td>
                      <td className="p-3">
                        <Badge className={getShippingStatusBadgeClass(item.shippingStatus)}>
                          {item.shippingStatus}
                        </Badge>
                      </td>
                      <td className="p-3 font-semibold text-sm">
                        {item.totalAmount || '-'}
                      </td>
                      <td className="p-3 text-slate-400 text-xs">
                        {formatDatePL(item.archivedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginacja */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-slate-500">
                  Wyświetlam {startItem}-{endItem} z {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Poprzednia
                  </Button>
                  <span className="text-sm text-slate-600">
                    Strona {currentPage} z {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Następna
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ArchiveTab;
