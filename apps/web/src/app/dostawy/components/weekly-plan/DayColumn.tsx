'use client';

import React, { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';
import { deliveriesApi } from '@/features/deliveries/api/deliveriesApi';
import type { WeeklyPlanDay, WeeklyPlanNietypowka, WeeklyPlanPrivateOrder } from '@/features/deliveries/api/deliveriesApi';
import { DeliveryCard } from './DeliveryCard';
import { PrivateOrdersSection } from './PrivateOrdersSection';
import { NietypowkiSection } from './NietypowkiSection';

interface DayColumnProps {
  day: WeeklyPlanDay;
  onViewOrder: (id: number, num: string) => void;
}

function formatDayHeader(date: string, dayName: string): string {
  const d = new Date(date + 'T12:00:00');
  const formatted = d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
  return `${dayName} ${formatted}`;
}

export function DayColumn({ day, onViewOrder }: DayColumnProps) {
  const queryClient = useQueryClient();
  // Porównaj z lokalną datą (unika przesunięcia UTC po północy)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday = day.date === todayStr;

  const createDeliveryMutation = useMutation({
    mutationFn: () => deliveriesApi.create({ deliveryDate: day.date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
      showSuccessToast('Nowa dostawa utworzona');
    },
    onError: (err: Error) => {
      showErrorToast(`Błąd: ${err.message}`);
    },
  });

  // Agreguj prywatne i nietypówki ze wszystkich dostaw dnia
  const firstDeliveryId = day.deliveries[0]?.id;

  const allPrywatne = useMemo<WeeklyPlanPrivateOrder[]>(
    () => day.deliveries.flatMap((d) => d.prywatne),
    [day.deliveries]
  );

  const allNietypowki = useMemo<WeeklyPlanNietypowka[]>(
    () => day.deliveries.flatMap((d) => d.nietypowki),
    [day.deliveries]
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Nagłówek dnia */}
      <div
        className={`px-3 py-2 rounded-t-lg text-sm font-semibold text-center ${
          isToday
            ? 'bg-blue-100 text-blue-800 border-b-2 border-blue-500'
            : 'bg-slate-100 text-slate-700'
        }`}
      >
        {formatDayHeader(day.date, day.dayName)}
      </div>

      {/* Dostawy */}
      {day.deliveries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg min-h-[100px]">
          Brak dostawy
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {day.deliveries.map((delivery) => (
            <DeliveryCard key={delivery.id} delivery={delivery} dayDate={day.date} onViewOrder={onViewOrder} />
          ))}
        </div>
      )}

      {/* Prywatne i nietypówki — zawsze widoczne */}
      <div className="border border-slate-200 rounded-lg bg-white shadow-sm">
        <PrivateOrdersSection deliveryId={firstDeliveryId} prywatne={allPrywatne} />
        <NietypowkiSection deliveryId={firstDeliveryId} nietypowki={allNietypowki} />
      </div>

      {/* Przycisk tworzenia nowej dostawy */}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-slate-400 hover:text-slate-600 w-full"
        onClick={() => createDeliveryMutation.mutate()}
        disabled={createDeliveryMutation.isPending}
      >
        {createDeliveryMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
        ) : (
          <Plus className="h-3.5 w-3.5 mr-1" />
        )}
        Nowa dostawa
      </Button>

      {/* Suma szkleń dnia */}
      {day.deliveries.length > 0 && (
        <div className="text-xs text-center text-slate-500 font-medium border-t border-slate-200 pt-1">
          Dzień: {day.dayTotalWindows} okien &middot; {day.dayTotalSashes} skrz. &middot; {day.dayTotalGlass} szyb
        </div>
      )}
    </div>
  );
}
