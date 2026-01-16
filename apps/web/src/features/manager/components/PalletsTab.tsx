'use client';

import React, { useState, useCallback } from 'react';
import { PalletMonthView } from '@/features/pallets/components/PalletMonthView';
import { PalletDayView } from '@/features/pallets/components/PalletDayView';

type ViewMode = 'day' | 'month';

/**
 * Zakładka Paletówki - zarządzanie stanem palet
 * Domyślnie pokazuje widok dzienny z możliwością przełączenia na miesięczny
 */
export const PalletsTab: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  // Przełączanie na widok miesięczny
  const handleShowMonthView = useCallback(() => {
    setViewMode('month');
  }, []);

  // Przełączanie na widok dzienny (opcjonalnie z wybraną datą)
  const handleShowDayView = useCallback((date?: string) => {
    setSelectedDate(date);
    setViewMode('day');
  }, []);

  return (
    <div className="h-full overflow-auto">
      {viewMode === 'day' ? (
        <PalletDayView
          initialDate={selectedDate}
          onShowMonthView={handleShowMonthView}
        />
      ) : (
        <PalletMonthView
          onDayClick={handleShowDayView}
        />
      )}
    </div>
  );
};

export default PalletsTab;
