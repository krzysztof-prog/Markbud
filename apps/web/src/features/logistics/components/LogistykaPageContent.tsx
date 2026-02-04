'use client';

/**
 * LogistykaPageContent - Główny komponent strony logistyki
 *
 * Layout 3-strefowy:
 * - Lewa kolumna (col-3): Kompaktowy kalendarz z listą dostaw
 * - Środkowa kolumna (col-5): Lista pozycji wybranej dostawy
 * - Prawa kolumna (col-4): Szczegóły lub Parser (przełączane tabami)
 *
 * Flow użytkownika:
 * 1. Użytkownik wybiera dostawę z kalendarza (lewa kolumna)
 * 2. Pozycje wyświetlają się w środkowej kolumnie
 * 3. Szczegóły/parser w prawej kolumnie
 * 4. Parser pozwala wkleić nowy mail i zapisać
 */

import { useState, useMemo, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

import { LogisticsLeftPanel } from './LogisticsLeftPanel';
import { LogisticsItemsList } from './LogisticsItemsList';
import { LogisticsRightPanel } from './LogisticsRightPanel';

import { useLogisticsCalendar } from '../hooks';
import { getTodayWarsaw, formatDateWarsaw, addDaysWarsaw } from '@/lib/date-utils';

// ========== Stałe ==========

/**
 * Oblicza zakres dat dla kalendarza (2 miesiące do przodu)
 */
function getDefaultDateRange(): { from: string; to: string } {
  const from = getTodayWarsaw();

  // 2 miesiące do przodu (~60 dni)
  const toDate = addDaysWarsaw(new Date(), 60);
  const to = formatDateWarsaw(toDate);

  return { from, to };
}

// ========== Główny komponent ==========

/**
 * Główna strona modułu logistyki - Layout 3-strefowy
 *
 * Zarządza stanem wyboru i przepływem danych między komponentami:
 * - LogisticsLeftPanel (kalendarz z listą dostaw)
 * - LogisticsItemsList (lista pozycji wybranej dostawy)
 * - LogisticsRightPanel (szczegóły / parser z tabami)
 */
export function LogistykaPageContent() {
  // Stan - aktualnie wybrana dostawa
  const [selectedDeliveryCode, setSelectedDeliveryCode] = useState<string | null>(null);

  // Zakres dat dla kalendarza (2 miesiące od dziś)
  const dateRange = useMemo(() => getDefaultDateRange(), []);

  // Hook do pobierania danych kalendarza
  const {
    data: calendarData,
    isLoading: isLoadingCalendar,
    refetch: refetchCalendar,
  } = useLogisticsCalendar(dateRange.from, dateRange.to);

  // ========== Handlery ==========

  /**
   * Wybór dostawy z kalendarza
   */
  const handleDeliverySelect = useCallback((deliveryCode: string) => {
    setSelectedDeliveryCode(deliveryCode);
  }, []);

  /**
   * Odświeżenie kalendarza
   */
  const handleRefreshCalendar = useCallback(() => {
    refetchCalendar();
  }, [refetchCalendar]);

  /**
   * Po zapisaniu nowej dostawy - odśwież kalendarz i wybierz nową dostawę
   */
  const handleDeliverySaved = useCallback((newDeliveryCode: string) => {
    setSelectedDeliveryCode(newDeliveryCode);
  }, []);

  // ========== Renderowanie ==========

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
      {/* Nagłówek strony - kompaktowy */}
      <Card className="flex-shrink-0">
        <CardHeader className="py-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Logistyka</CardTitle>
          </div>
        </CardHeader>
      </Card>

      {/* Layout 3-kolumnowy: Szczegóły | Pozycje | Dostawy (sidebar) */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Lewa kolumna - Szczegóły lub Parser - 45% */}
        <div className="min-h-0 overflow-hidden w-[45%]">
          <LogisticsRightPanel
            deliveryCode={selectedDeliveryCode}
            onDeliverySaved={handleDeliverySaved}
            onRefreshCalendar={handleRefreshCalendar}
          />
        </div>

        {/* Środkowa kolumna - Lista pozycji */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <LogisticsItemsList
            deliveryCode={selectedDeliveryCode}
          />
        </div>

        {/* Prawa kolumna - Dostawy (sidebar) - 560px */}
        <div className="flex-shrink-0 min-h-0 overflow-hidden w-[560px]">
          <LogisticsLeftPanel
            entries={calendarData?.entries ?? []}
            isLoading={isLoadingCalendar}
            selectedDeliveryCode={selectedDeliveryCode}
            onDeliverySelect={handleDeliverySelect}
            onRefresh={handleRefreshCalendar}
          />
        </div>
      </div>
    </div>
  );
}

export default LogistykaPageContent;
