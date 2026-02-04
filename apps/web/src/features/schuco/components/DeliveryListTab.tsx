'use client';

/**
 * Zakładka z listą dostaw Schuco
 *
 * Zawiera:
 * - Nagłówek z licznikiem i wyszukiwarką
 * - Legendę zmian
 * - Tabelę dostaw z tooltipami dla zmienionych wierszy
 * - Paginację
 */

import React, { useState, useMemo, useDeferredValue, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MobileScrollHint } from '@/components/ui/mobile-scroll-hint';
import {
  Truck,
  Package,
  Sparkles,
  PenLine,
  CalendarClock,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  ListChecks,
  ListX,
} from 'lucide-react';
import { DeliveryItemsExpander } from './DeliveryItemsExpander';
import { cn } from '@/lib/utils';
import type { SchucoDelivery } from '@/types/schuco';
import {
  getShippingStatusBadgeClass,
  getRowChangeClasses,
  parseChangedFieldsInfo,
  hasDeliveryWeekChanged,
  countDeliveryChanges,
  filterDeliveriesByQuery,
} from '../helpers/deliveryHelpers';

interface DeliveryListTabProps {
  /** Lista wszystkich dostaw (z aktualnej strony) */
  deliveries: SchucoDelivery[];
  /** Całkowita liczba dostaw */
  total: number;
  /** Czy dane się ładują */
  isLoading: boolean;
  /** Aktualna strona */
  currentPage: number;
  /** Całkowita liczba stron */
  totalPages: number;
  /** Numer pierwszego elementu na stronie */
  startItem: number;
  /** Numer ostatniego elementu na stronie */
  endItem: number;
  /** Callback zmiany strony */
  onPageChange: (page: number) => void;
  /** Callback odświeżenia danych */
  onRefresh: () => void;
}

/**
 * Komponent zakładki z listą dostaw
 */
export const DeliveryListTab: React.FC<DeliveryListTabProps> = ({
  deliveries: allDeliveries,
  total,
  isLoading,
  currentPage,
  totalPages,
  startItem,
  endItem,
  onPageChange,
  onRefresh,
}) => {
  // Stan wyszukiwarki
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Filtrowanie dostaw po wyszukiwanym tekście
  const deliveries = useMemo(
    () => filterDeliveriesByQuery(allDeliveries, deferredSearchQuery),
    [allDeliveries, deferredSearchQuery]
  );

  // Zliczanie zmian
  const changedCounts = useMemo(() => countDeliveryChanges(deliveries), [deliveries]);

  // Czyszczenie wyszukiwania
  const handleClearSearch = useCallback(() => setSearchQuery(''), []);

  // Nawigacja paginacji
  const goToFirstPage = useCallback(() => onPageChange(1), [onPageChange]);
  const goToPreviousPage = useCallback(
    () => onPageChange(currentPage - 1),
    [onPageChange, currentPage]
  );
  const goToNextPage = useCallback(
    () => onPageChange(currentPage + 1),
    [onPageChange, currentPage]
  );
  const goToLastPage = useCallback(
    () => onPageChange(totalPages),
    [onPageChange, totalPages]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            <CardTitle>Lista zamówień ({total})</CardTitle>

            {/* Wskaźniki zmian */}
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

          {/* Wyszukiwarka */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Szukaj nr zamówienia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Informacja o wyświetlanych elementach */}
        <div className="flex items-center justify-between">
          {total > 0 && !searchQuery && (
            <p className="text-sm text-slate-500">
              Wyświetlono {startItem}-{endItem} z {total} (strona {currentPage} z{' '}
              {totalPages})
            </p>
          )}
          {searchQuery && (
            <p className="text-sm text-slate-500">
              Znaleziono {deliveries.length} z {total} zamówień
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={10} columns={7} />
        ) : !deliveries || deliveries.length === 0 ? (
          searchQuery ? (
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              title="Brak wyników"
              description={`Nie znaleziono zamówień dla "${searchQuery}"`}
              action={{
                label: 'Wyczyść wyszukiwanie',
                onClick: handleClearSearch,
              }}
            />
          ) : (
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title="Brak dostaw"
              description="Nie znaleziono danych o dostawach Schuco. Kliknij 'Odśwież dane' aby pobrać dane ze strony Schuco."
              action={{
                label: 'Odśwież dane',
                onClick: onRefresh,
              }}
            />
          )
        ) : (
          <>
            {/* Legenda */}
            <div className="mb-4 flex items-center gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-50 border-l-4 border-l-green-500 rounded-sm" />
                <span>Nowe zamówienie</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-50 border-l-4 border-l-amber-500 rounded-sm" />
                <span>Zmienione (kliknij by zobaczyć szczegóły)</span>
              </div>
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-green-600" />
                <span>Pozycje pobrane</span>
              </div>
              <div className="flex items-center gap-2">
                <ListX className="h-4 w-4 text-slate-400" />
                <span>Brak pozycji</span>
              </div>
            </div>

            <MobileScrollHint />

            {/* Tabela dostaw */}
            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-slate-50 border-b sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-3 text-center font-semibold text-slate-900 w-10">
                      {/* Kolumna rozwijania */}
                    </th>
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
                  {deliveries.map((delivery, index) => (
                    <DeliveryRow
                      key={delivery.id}
                      delivery={delivery}
                      index={index}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginacja */}
            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                canGoPrevious={currentPage > 1}
                canGoNext={currentPage < totalPages}
                onFirstPage={goToFirstPage}
                onPreviousPage={goToPreviousPage}
                onNextPage={goToNextPage}
                onLastPage={goToLastPage}
                onPageChange={onPageChange}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Pojedynczy wiersz tabeli dostaw z możliwością rozwinięcia pozycji
 */
interface DeliveryRowProps {
  delivery: SchucoDelivery;
  index: number;
}

const DeliveryRow: React.FC<DeliveryRowProps> = ({ delivery, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const changesInfo = parseChangedFieldsInfo(delivery);
  const baseStripeBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-100';
  const changeClasses = getRowChangeClasses(delivery);
  const weekChanged = hasDeliveryWeekChanged(delivery);
  const hasChanges = delivery.changeType === 'updated' && changesInfo.length > 0;

  // Toggle rozwinięcia
  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Tooltip content dla zmienionych wierszy
  const changesContent = hasChanges ? (
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
        Zmieniono:{' '}
        {delivery.changedAt
          ? new Date(delivery.changedAt).toLocaleString('pl-PL')
          : '-'}
      </p>
    </div>
  ) : null;

  return (
    <>
      <tr
        className={cn(
          'border-b transition-colors',
          changeClasses ? changeClasses : `${baseStripeBg} hover:bg-slate-50`,
          isExpanded && 'bg-blue-50/50'
        )}
      >
        {/* Przycisk rozwijania + status pozycji */}
        <td className="px-2 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={handleToggle}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
              title={isExpanded ? 'Zwiń pozycje' : 'Rozwiń pozycje'}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              )}
            </button>
            {/* Ikona statusu pozycji */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  {(delivery._count?.items || delivery.itemsFetchedAt) ? (
                    <ListChecks className="h-4 w-4 text-green-600" />
                  ) : (
                    <ListX className="h-4 w-4 text-slate-400" />
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {(delivery._count?.items || delivery.itemsFetchedAt)
                  ? `Pobrano ${delivery._count?.items || ''} pozycji`
                  : 'Brak pobranych pozycji'}
              </TooltipContent>
            </Tooltip>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="flex items-center gap-1">
            {delivery.orderDate}
            {delivery.changeType === 'new' && (
              <Badge className="ml-2 bg-green-600 text-xs">NOWE</Badge>
            )}
            {/* Ikona info z tooltipem dla zmienionych wierszy */}
            {hasChanges && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600 cursor-help ml-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm">
                  {changesContent}
                </TooltipContent>
              </Tooltip>
            )}
          </span>
        </td>
        <td className="px-4 py-3 font-mono">{delivery.orderNumber}</td>
        <td className="px-4 py-3">
          <span className="flex items-center gap-1">
            {delivery.deliveryWeek || '-'}
            {weekChanged && (
              <DeliveryWeekChangedBadge delivery={delivery} />
            )}
          </span>
        </td>
        <td className="px-4 py-3">{delivery.orderName}</td>
        <td className="px-4 py-3">
          <Badge className={getShippingStatusBadgeClass(delivery.shippingStatus)}>
            {delivery.shippingStatus}
          </Badge>
        </td>
        <td className="px-4 py-3 text-right font-semibold">
          {delivery.totalAmount || '-'}
        </td>
      </tr>

      {/* Rozwinięty rząd z pozycjami zamówienia */}
      {isExpanded && (
        <tr className="bg-slate-50/80">
          <td colSpan={7} className="px-4 py-4">
            <DeliveryItemsExpander
              deliveryId={delivery.id}
              orderNumber={delivery.orderNumber}
              itemsFetchedAt={delivery.itemsFetchedAt}
            />
          </td>
        </tr>
      )}
    </>
  );
};

/**
 * Badge informujący o zmianie tygodnia dostawy
 */
interface DeliveryWeekChangedBadgeProps {
  delivery: SchucoDelivery;
}

const DeliveryWeekChangedBadge: React.FC<DeliveryWeekChangedBadgeProps> = ({
  delivery,
}) => {
  const changesInfo = parseChangedFieldsInfo(delivery);
  const weekChange = changesInfo.find((i) => i.field === 'Tydzień dostawy');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full cursor-help">
          <CalendarClock className="h-3 w-3" />
          nowa data!
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Tydzień dostawy został zmieniony</p>
        {weekChange && (
          <p className="text-slate-400">
            Poprzednio:{' '}
            <span className="line-through">
              {weekChange.oldValue || '(brak)'}
            </span>
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

/**
 * Kontrolki paginacji
 */
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onFirstPage: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onLastPage: () => void;
  onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  canGoPrevious,
  canGoNext,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
  onPageChange,
}) => {
  // Generowanie numerów stron do wyświetlenia
  const pageNumbers = useMemo(() => {
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
      if (totalPages <= 5) {
        return i + 1;
      } else if (currentPage <= 3) {
        return i + 1;
      } else if (currentPage >= totalPages - 2) {
        return totalPages - 4 + i;
      } else {
        return currentPage - 2 + i;
      }
    });
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t">
      <div className="text-sm text-slate-500">
        Strona {currentPage} z {totalPages}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onFirstPage}
          disabled={!canGoPrevious}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={!canGoPrevious}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-2">
          {pageNumbers.map((pageNum) => (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              className="h-8 w-8 p-0"
            >
              {pageNum}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!canGoNext}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onLastPage}
          disabled={!canGoNext}
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DeliveryListTab;
