'use client';

/**
 * Zakładka z historią dostaw pogrupowaną według tygodnia
 *
 * Wyświetla dostawy, które już minęły (przeszłe tygodnie).
 * Każdy tydzień jest rozwijalny (Collapsible), domyślnie zwinięty.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Clock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeekData } from '../types';
import { getShippingStatusBadgeClass } from '../helpers/deliveryHelpers';

interface DeliveryHistoryTabProps {
  /** Dane tygodni z dostawami */
  weeks: WeekData[] | undefined;
  /** Czy dane się ładują */
  isLoading: boolean;
}

/**
 * Komponent zakładki historii dostaw
 */
export const DeliveryHistoryTab: React.FC<DeliveryHistoryTabProps> = ({
  weeks,
  isLoading,
}) => {
  // Filtruj tylko przeszłe tygodnie
  const pastWeeks = useMemo(() => {
    if (!weeks) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const past: WeekData[] = [];

    for (const weekData of weeks) {
      const weekStart = weekData.weekStart ? new Date(weekData.weekStart) : null;

      // Brak daty = pomijamy w historii
      if (!weekStart) continue;

      // Tydzień kończy się 7 dni po rozpoczęciu
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (weekEnd < today) {
        // Tydzień już minął
        past.push(weekData);
      }
    }

    // Sortuj od najnowszego (malejąco)
    return past.sort((a, b) => {
      if (!a.weekStart && !b.weekStart) return 0;
      if (!a.weekStart) return 1;
      if (!b.weekStart) return -1;
      return new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime();
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
            icon={<Clock className="h-12 w-12" />}
            title="Brak historii"
            description="Nie znaleziono historycznych dostaw."
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
            <Clock className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-slate-600">Historia dostaw</CardTitle>
            <Badge variant="secondary">
              {pastWeeks.length} {pastWeeks.length === 1 ? 'tydzień' : 'tygodni'}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Kliknij na nagłówek tygodnia aby rozwinąć/zwinąć listę zamówień
        </p>
      </CardHeader>
      <CardContent>
        {pastWeeks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Brak historii dostaw</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastWeeks.map((weekData) => (
              <CollapsibleWeekHistory key={weekData.week} weekData={weekData} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Rozwijany tydzień z historią dostaw (domyślnie zwinięty)
 */
interface CollapsibleWeekHistoryProps {
  weekData: WeekData;
}

const CollapsibleWeekHistory: React.FC<CollapsibleWeekHistoryProps> = ({
  weekData,
}) => {
  const weekStart = weekData.weekStart ? new Date(weekData.weekStart) : null;

  return (
    <Collapsible
      defaultOpen={false}
      className="border rounded-lg overflow-hidden opacity-80"
    >
      {/* Nagłówek tygodnia */}
      <CollapsibleTrigger className="w-full">
        <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-200/50 transition-colors bg-slate-100">
          <div className="flex items-center gap-3">
            <ChevronDown className="h-5 w-5 text-slate-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            <h3 className="font-semibold text-lg text-slate-600">{weekData.week}</h3>
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
                  year: 'numeric',
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

export default DeliveryHistoryTab;
