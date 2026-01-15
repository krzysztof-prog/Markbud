'use client';

import React, { useState } from 'react';
import { CalendarView, DayView, formatDateISO } from '@/features/timesheets';

/**
 * Zakładka Godzinówki - moduł zarządzania czasem pracy
 *
 * Składa się z:
 * - CalendarView po lewej (wybór dnia)
 * - DayView po prawej (szczegóły dnia)
 */
export const TimeTrackerTab: React.FC = () => {
  // Stan wybranego dnia - domyślnie dzisiaj
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateISO(new Date())
  );

  return (
    <div className="h-full flex gap-4 p-4">
      {/* Kalendarz - lewa strona */}
      <div className="w-80 shrink-0">
        <CalendarView
          onDaySelect={setSelectedDate}
          selectedDate={selectedDate}
        />
      </div>

      {/* Szczegóły dnia - prawa strona */}
      <div className="flex-1 overflow-auto">
        <DayView
          date={selectedDate}
          onDateChange={setSelectedDate}
        />
      </div>
    </div>
  );
};

export default TimeTrackerTab;
