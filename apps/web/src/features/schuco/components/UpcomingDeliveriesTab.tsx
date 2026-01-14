'use client';

/**
 * Zakładka z nadchodzącymi dostawami pogrupowanymi według tygodnia
 *
 * Wyświetla dostawy, które jeszcze nie minęły (bieżący tydzień + przyszłość).
 * Każdy tydzień jest rozwijalny (Collapsible).
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeekData } from '../types';
import { getShippingStatusBadgeClass } from '../helpers/deliveryHelpers';

interface UpcomingDeliveriesTabProps {
  /** Dane tygodni z dostawami */
  weeks: WeekData[] | undefined;
  /** Czy dane się ładują */
  isLoading: boolean;
}

/**
 * Komponent zakładki nadchodzących dostaw
 */
export const UpcomingDeliveriesTab: React.FC<UpcomingDeliveriesTabProps> = ({
  weeks,
  isLoading,
}) => {
  // Filtruj tylko nadchodzące tygodnie (bieżący tydzień + przyszłość)
  const upcomingWeeks = useMemo(() => {
    if (!weeks) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming: WeekData[] = [];

    for (const weekData of weeks) {
      const weekStart = weekData.weekStart ? new Date(weekData.weekStart) : null;

      if (!weekStart) {
        // Brak daty = traktuj jako nadchodzące
        upcoming.push(weekData);
        continue;
      }

      // Tydzień kończy się 7 dni po rozpoczęciu
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (weekEnd >= today) {
        // Tydzień jeszcze trwa lub jest w przyszłości
        upcoming.push(weekData);
      }
    }

    // Sortuj od najbliższego (rosnąco)
    return upcoming.sort((a, b) => {
      if (!a.weekStart && !b.weekStart) return 0;
      if (!a.weekStart) return 1;
      if (!b.weekStart) return -1;
      return new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime();
    });
  }, [weeks]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <TableSkeleton rows={5} columns={4} />
        </CardContent>
      </Card>
    );
  }

  if (!weeks || weeks.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={<Calendar className="h-12 w-12" />}
            title="Brak danych"
            description="Nie znaleziono zamówień z przypisanym tygodniem dostawy."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <CardTitle>Nadchodzące dostawy</CardTitle>
            <Badge variant="secondary">
              {upcomingWeeks.length} {upcomingWeeks.length === 1 ? 'tydzień' : 'tygodni'}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Kliknij na nagłówek tygodnia aby rozwinąć/zwinąć listę zamówień
        </p>
      </CardHeader>
      <CardContent>
        {upcomingWeeks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Brak nadchodzących dostaw</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingWeeks.map((weekData) => (
              <CollapsibleWeek key={weekData.week} weekData={weekData} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Rozwijany tydzień z listą dostaw
 */
interface CollapsibleWeekProps {
  weekData: WeekData;
}

const CollapsibleWeek: React.FC<CollapsibleWeekProps> = ({ weekData }) => {
  const weekStart = weekData.weekStart ? new Date(weekData.weekStart) : null;

  // Sprawdź czy to bieżący tydzień
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isCurrentWeek =
    weekStart &&
    weekStart <= today &&
    new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) > today;

  return (
    <Collapsible
      defaultOpen={isCurrentWeek || false}
      className={cn(
        'border rounded-lg overflow-hidden',
        isCurrentWeek && 'border-blue-500 border-2 shadow-md'
      )}
    >
      {/* Nagłówek tygodnia */}
      <CollapsibleTrigger className="w-full">
        <div
          className={cn(
            'px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-200/50 transition-colors',
            isCurrentWeek ? 'bg-blue-100' : 'bg-slate-100'
          )}
        >
          <div className="flex items-center gap-3">
            <ChevronDown className="h-5 w-5 text-slate-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            <h3 className="font-semibold text-lg">{weekData.week}</h3>
            {isCurrentWeek && (
              <Badge className="bg-blue-600">Bieżący tydzień</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {weekData.count}{' '}
              {weekData.count === 1
                ? 'zamówienie'
                : weekData.count < 5
                  ? 'zamówienia'
                  : 'zamówień'}
            </Badge>
            {weekStart && (
              <span className="text-sm text-slate-500">
                od{' '}
                {weekStart.toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      {/* Lista zamówień */}
      <CollapsibleContent>
        <div className="divide-y border-t">
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
                <Badge className={getShippingStatusBadgeClass(delivery.shippingStatus)}>
                  {delivery.shippingStatus}
                </Badge>
                {delivery.totalAmount && (
                  <span className="font-semibold text-sm">{delivery.totalAmount}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default UpcomingDeliveriesTab;
