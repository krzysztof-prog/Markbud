'use client';

/**
 * Komponent do wyboru daty dostawy i przypisania zlecenia do dostawy
 * Wyświetlany jako Popover z Calendar + lista dostaw na wybraną datę
 */

import React, { useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Pencil, Truck, Plus, CalendarIcon, Loader2 } from 'lucide-react';
import type { DeliveryForDate } from '@/features/deliveries/api/deliveriesApi';

// ================================
// Props
// ================================

interface DeliveryDatePickerProps {
  /** Wyświetlana data (sformatowana) */
  displayDate: string | null;
  /** Obecna data dostawy (ISO) - do ustawienia initialDate w kalendarzu */
  currentDate: string | null;
  /** Czy zlecenie jest przypisane do dostawy */
  isAssignedToDelivery: boolean;
  /** Liczba dostaw, do których przypisane jest zlecenie */
  deliveryCount: number;
  /** Czy popover jest otwarty */
  isOpen: boolean;
  /** Callback: otwórz popover */
  onOpen: () => void;
  /** Callback: zamknij popover */
  onClose: () => void;
  /** Wybrana data z kalendarza */
  selectedDate: Date | undefined;
  /** Zmień wybraną datę */
  onDateSelect: (date: Date | undefined) => void;
  /** Dostawy na wybraną datę */
  deliveriesForDate: DeliveryForDate[];
  /** Czy ładowanie dostaw */
  isLoadingDeliveries: boolean;
  /** Przypisz do istniejącej dostawy */
  onAssignToDelivery: (deliveryId: number) => void;
  /** Utwórz nową dostawę i przypisz */
  onCreateAndAssign: () => void;
  /** Ustaw tylko termin realizacji (bez przypisania do dostawy) */
  onSetDeadlineOnly: () => void;
  /** Czy mutacja w toku */
  isPending: boolean;
  /** ID obecnej dostawy (żeby oznaczyć ją w liście) */
  currentDeliveryId: number | null;
}

// ================================
// Komponent
// ================================

export const DeliveryDatePicker: React.FC<DeliveryDatePickerProps> = ({
  displayDate,
  isAssignedToDelivery,
  deliveryCount,
  isOpen,
  onOpen,
  onClose,
  selectedDate,
  onDateSelect,
  deliveriesForDate,
  isLoadingDeliveries,
  onAssignToDelivery,
  onCreateAndAssign,
  onSetDeadlineOnly,
  isPending,
  currentDeliveryId,
}) => {
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      onOpen();
    } else {
      onClose();
    }
  }, [onOpen, onClose]);

  // Trigger - wygląd zależy od tego czy jest przypisane do dostawy
  const trigger = isAssignedToDelivery ? (
    // Przypisane do dostawy - niebieska data z ikoną edycji
    <button
      type="button"
      className="group flex flex-col items-start gap-1 cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors"
    >
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-blue-700">
          {displayDate || '-'}
        </span>
        <Pencil className="h-3 w-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {deliveryCount > 1 && (
        <span className="text-xs text-slate-400">
          ({deliveryCount} dostaw)
        </span>
      )}
    </button>
  ) : (
    // Nie przypisane - szary tekst z ikoną edycji (jak obecna kolumna deadline)
    <button
      type="button"
      className="group flex items-center gap-2 justify-between w-full cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 transition-colors"
    >
      <span className="text-muted-foreground">{displayDate || '-'}</span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <div className="flex flex-col">
          {/* Kalendarz */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
          />

          {/* Panel z dostępnymi dostawami na wybraną datę */}
          {selectedDate && (
            <div className="border-t p-3 space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Dostawy na wybrany dzień
              </p>

              {isLoadingDeliveries ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ładowanie...
                </div>
              ) : deliveriesForDate.length > 0 ? (
                <div className="space-y-1">
                  {deliveriesForDate.map((delivery) => {
                    const isCurrent = delivery.id === currentDeliveryId;
                    return (
                      <button
                        key={delivery.id}
                        onClick={() => onAssignToDelivery(delivery.id)}
                        disabled={isPending || isCurrent}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
                          isCurrent
                            ? 'bg-blue-50 text-blue-700 cursor-default'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Truck className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 text-left">
                          {delivery.deliveryNumber || `Dostawa #${delivery.id}`}
                        </span>
                        <span className="text-xs text-slate-400">
                          {delivery.ordersCount} zl.
                        </span>
                        {isCurrent && (
                          <span className="text-xs text-blue-500 font-medium">obecna</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-1">
                  Brak dostaw na ten dzień
                </p>
              )}

              {/* Akcje */}
              <div className="flex flex-col gap-1 pt-1 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateAndAssign}
                  disabled={isPending}
                  className="w-full justify-start gap-2"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Nowa dostawa na ten dzień
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSetDeadlineOnly}
                  disabled={isPending}
                  className="w-full justify-start gap-2 text-muted-foreground"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Tylko termin (bez dostawy)
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DeliveryDatePicker;
