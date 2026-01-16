'use client';

import React, { useState, useCallback } from 'react';
import { PalletCalendarView } from '@/features/pallets/components/PalletCalendarView';
import { PalletDayView } from '@/features/pallets/components/PalletDayView';
import { PalletMonthView } from '@/features/pallets/components/PalletMonthView';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';

type ViewMode = 'day' | 'month';

// Helper do formatowania daty
const formatDateISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Zakładka Paletówki - zarządzanie stanem palet
 *
 * Layout:
 * - Kalendarz po lewej (wybór dnia, oznaczenie zamkniętych)
 * - Widok dzienny po prawej (edycja stanów)
 * - Możliwość przełączenia na widok miesięczny (podsumowanie)
 */
export const PalletsTab: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<string>(formatDateISO(new Date()));

  // Wybór dnia z kalendarza
  const handleDaySelect = useCallback((date: string) => {
    setSelectedDate(date);
    setViewMode('day');
  }, []);

  // Przełączanie na widok miesięczny
  const handleShowMonthView = useCallback(() => {
    setViewMode('month');
  }, []);

  // Przełączanie na widok dzienny
  const handleShowDayView = useCallback((date?: string) => {
    if (date) {
      setSelectedDate(date);
    }
    setViewMode('day');
  }, []);

  return (
    <div className="h-full flex gap-4 p-4">
      {/* Kalendarz - lewa strona */}
      <div className="w-80 shrink-0">
        <PalletCalendarView
          onDaySelect={handleDaySelect}
          selectedDate={selectedDate}
        />

        {/* Przycisk widoku miesięcznego pod kalendarzem */}
        <div className="mt-4">
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            className="w-full gap-2"
            onClick={handleShowMonthView}
          >
            <BarChart3 className="h-4 w-4" />
            Podsumowanie miesiąca
          </Button>
        </div>
      </div>

      {/* Szczegóły dnia / Podsumowanie miesiąca - prawa strona */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'day' ? (
          <PalletDayView
            key={selectedDate}
            initialDate={selectedDate}
            onShowMonthView={handleShowMonthView}
          />
        ) : (
          <PalletMonthView onDayClick={handleShowDayView} />
        )}
      </div>
    </div>
  );
};

export default PalletsTab;
