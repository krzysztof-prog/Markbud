'use client';

/**
 * LogisticsItemsList - Środkowa kolumna layoutu 3-strefowego
 *
 * Wyświetla listę pozycji wybranej dostawy.
 * Pokazuje status, numer projektu, ilość i podstawowe info o zleceniu.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, CheckCircle2, XCircle, Clock, Ban, AlertTriangle, CalendarX2, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { logisticsApi } from '../api/logisticsApi';
import {
  type ItemStatus,
  type DateMismatchItem,
  type MissingDeliveryDateItem,
  ITEM_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
  formatDeliveryCode,
} from '../types';

// ========== Props ==========

interface LogisticsItemsListProps {
  /** Kod wybranej dostawy */
  deliveryCode: string | null;
  /** Callback wyboru pozycji do wyświetlenia szczegółów */
  onItemSelect?: (itemId: number) => void;
}

// ========== Komponenty pomocnicze ==========

function StatusIcon({ status }: { status: ItemStatus }) {
  switch (status) {
    case 'ok':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'blocked':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'waiting':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'excluded':
      return <Ban className="h-4 w-4 text-gray-500" />;
    default:
      return null;
  }
}

function ListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <Package className="h-12 w-12 text-slate-300 mb-3" />
      <p className="text-muted-foreground">Wybierz dostawę z listy po lewej</p>
    </div>
  );
}

// ========== Główny komponent ==========

export function LogisticsItemsList({ deliveryCode, onItemSelect }: LogisticsItemsListProps) {
  // Pobierz dane dostawy
  const { data: mailList, isLoading, error } = useQuery({
    queryKey: ['logistics', 'delivery', deliveryCode],
    queryFn: () => logisticsApi.getLatestVersion(deliveryCode!),
    enabled: !!deliveryCode,
  });

  // WAŻNE: useMemo MUSI być przed early returns (Rules of Hooks)
  // Mapa niezgodności dat (itemId -> info o niezgodności)
  const dateMismatchMap = useMemo(() => {
    const map = new Map<number, DateMismatchItem>();
    if (mailList?.dateMismatchItems) {
      for (const mismatch of mailList.dateMismatchItems) {
        map.set(mismatch.itemId, mismatch);
      }
    }
    return map;
  }, [mailList?.dateMismatchItems]);

  // Mapa brakujących dat dostawy (itemId -> info o brakującej dacie)
  const missingDeliveryDateMap = useMemo(() => {
    const map = new Map<number, MissingDeliveryDateItem>();
    if (mailList?.missingDeliveryDateItems) {
      for (const missing of mailList.missingDeliveryDateItems) {
        map.set(missing.itemId, missing);
      }
    }
    return map;
  }, [mailList?.missingDeliveryDateItems]);

  // Brak wybranej dostawy
  if (!deliveryCode) {
    return (
      <Card className="h-full flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center">
          <EmptyState />
        </CardContent>
      </Card>
    );
  }

  // Ładowanie
  if (isLoading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="py-3 px-4 border-b flex-shrink-0">
          <CardTitle className="text-sm">Pozycje dostawy</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <ListSkeleton />
        </CardContent>
      </Card>
    );
  }

  // Błąd
  if (error || !mailList) {
    return (
      <Card className="h-full flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600">Błąd ładowania pozycji</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = mailList.items ?? [];

  // Statystyki statusów
  const statusCounts = items.reduce(
    (acc, item) => {
      acc[item.itemStatus] = (acc[item.itemStatus] || 0) + 1;
      return acc;
    },
    {} as Record<ItemStatus, number>
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 px-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">{formatDeliveryCode(deliveryCode)}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {items.length} pozycji • v{mailList.version}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              mailList.deliveryStatus === 'ready' && 'bg-green-50 text-green-700 border-green-200',
              mailList.deliveryStatus === 'blocked' && 'bg-red-50 text-red-700 border-red-200',
              mailList.deliveryStatus === 'conditional' && 'bg-yellow-50 text-yellow-700 border-yellow-200'
            )}
          >
            {mailList.deliveryStatus === 'ready' ? '🟢' : mailList.deliveryStatus === 'blocked' ? '🔴' : '🟠'}{' '}
            {DELIVERY_STATUS_LABELS[mailList.deliveryStatus]}
          </Badge>
        </div>

        {/* Pasek statusów */}
        <div className="flex gap-2 mt-2">
          {statusCounts.ok && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              {statusCounts.ok} OK
            </Badge>
          )}
          {statusCounts.blocked && (
            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
              {statusCounts.blocked} zablok.
            </Badge>
          )}
          {statusCounts.waiting && (
            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
              {statusCounts.waiting} oczek.
            </Badge>
          )}
          {statusCounts.excluded && (
            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
              {statusCounts.excluded} wył.
            </Badge>
          )}
          {mailList.hasDateMismatch && dateMismatchMap.size > 0 && (
            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
              <CalendarX2 className="h-3 w-3 mr-1" />
              {dateMismatchMap.size} data≠
            </Badge>
          )}
          {mailList.hasMissingDeliveryDate && missingDeliveryDateMap.size > 0 && (
            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
              <Calendar className="h-3 w-3 mr-1" />
              {missingDeliveryDateMap.size} brak daty
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Package className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-muted-foreground">Brak pozycji</p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => {
              const dateMismatch = dateMismatchMap.get(item.id);
              const missingDeliveryDate = missingDeliveryDateMap.get(item.id);
              return (
              <div
                key={item.id}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all',
                  'hover:bg-slate-50 hover:border-slate-200',
                  item.itemStatus === 'blocked' && 'border-red-200 bg-red-50/50',
                  dateMismatch && 'border-orange-300 bg-orange-50/50',
                  missingDeliveryDate && 'border-red-300 bg-red-50/50'
                )}
                onClick={() => onItemSelect?.(item.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusIcon status={item.itemStatus} />
                    <span className="font-mono text-sm font-medium truncate">
                      {item.projectNumber}
                    </span>
                    {/* Ikona niezgodności daty z tooltipem */}
                    {dateMismatch && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CalendarX2 className="h-4 w-4 text-orange-600 flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-medium text-orange-700">Niezgodność daty!</p>
                            <p className="text-xs">{dateMismatch.reason}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {/* Ikona brakującej daty dostawy z tooltipem */}
                    {missingDeliveryDate && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Calendar className="h-4 w-4 text-red-600 flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-medium text-red-700">Brak daty dostawy!</p>
                            <p className="text-xs">{missingDeliveryDate.reason}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    x{item.quantity}
                  </Badge>
                </div>

                {/* Info o zleceniu */}
                <div className="mt-1.5 text-xs text-muted-foreground">
                  {item.order ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.order.orderNumber}</span>
                      {item.order.client && (
                        <span className="truncate">{item.order.client}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-yellow-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Nie przypisano do zlecenia
                    </span>
                  )}
                </div>

                {/* Status badge */}
                <div className="mt-1.5">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      ITEM_STATUS_COLORS[item.itemStatus]
                    )}
                  >
                    {ITEM_STATUS_LABELS[item.itemStatus]}
                  </span>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LogisticsItemsList;
