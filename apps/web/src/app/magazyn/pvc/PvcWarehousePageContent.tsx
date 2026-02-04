/**
 * PvcWarehousePageContent - główna zawartość strony magazynu PVC
 *
 * Layout:
 * - Header z tytułem
 * - Dropdown systemów (Living, BLOK, VLAK, CT70, FOCUSING)
 * - Główna zawartość + sidebar kolorów po prawej stronie
 * - Tabs: Stan | Zapotrzebowanie | RW | Zamówienia
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodSelector } from '@/components/ui/period-selector';
import { BackButton } from '@/components/ui/back-button';
import { Box, Package, FileText, History, ShoppingCart } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import {
  SystemFilters,
  ColorSidebarRight,
  PvcStockTable,
  PvcDemandTable,
  PvcRwTable,
  PvcOrdersTable,
  usePvcStock,
  usePvcDemand,
  usePvcRw,
  usePvcSystems,
  usePvcOrders,
  type SystemType,
} from '@/features/pvc-warehouse';

type TabType = 'stan' | 'zapotrzebowanie' | 'rw' | 'zamowienia';

export default function PvcWarehousePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Stan z URL params
  const tabParam = (searchParams.get('tab') as TabType) || 'stan';
  const systemsParam = searchParams.get('systems');
  const colorIdParam = searchParams.get('colorId');
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');

  // Domyślny miesiąc/rok = aktualny
  const now = new Date();
  const defaultMonth = now.getMonth() + 1;
  const defaultYear = now.getFullYear();

  // Lokalne stany
  const [activeTab, setActiveTab] = useState<TabType>(tabParam);
  const [selectedSystems, setSelectedSystems] = useState<SystemType[]>(
    systemsParam ? (systemsParam.split(',') as SystemType[]) : []
  );
  const [selectedColorId, setSelectedColorId] = useState<number | null>(
    colorIdParam ? parseInt(colorIdParam, 10) : null
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    monthParam ? parseInt(monthParam, 10) : defaultMonth
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    yearParam ? parseInt(yearParam, 10) : defaultYear
  );
  const [hideZeroStock, setHideZeroStock] = useState(true);

  // Pobierz dane
  const { data: stockData, isLoading: stockLoading } = usePvcStock({
    systems: selectedSystems.length > 0 ? selectedSystems : undefined,
    colorId: selectedColorId ?? undefined,
  });

  const { data: demandData, isLoading: demandLoading } = usePvcDemand({
    systems: selectedSystems.length > 0 ? selectedSystems : undefined,
    colorId: selectedColorId ?? undefined,
  });

  const { data: rwData, isLoading: rwLoading } = usePvcRw({
    systems: selectedSystems.length > 0 ? selectedSystems : undefined,
    colorId: selectedColorId ?? undefined,
    month: selectedMonth,
    year: selectedYear,
  });

  const { data: ordersData, isLoading: ordersLoading } = usePvcOrders({
    month: selectedMonth,
    year: selectedYear,
  });

  const { data: systemsData } = usePvcSystems();

  // Aktualizacja URL przy zmianie filtrów
  const updateUrl = useCallback(
    (tab: TabType, systems: SystemType[], colorId: number | null, month?: number, year?: number) => {
      const params = new URLSearchParams();
      if (tab !== 'stan') params.set('tab', tab);
      if (systems.length > 0) params.set('systems', systems.join(','));
      if (colorId) params.set('colorId', colorId.toString());
      // Zapisuj month/year dla zakładek RW i Zamówienia
      if ((tab === 'rw' || tab === 'zamowienia') && month && year) {
        params.set('month', month.toString());
        params.set('year', year.toString());
      }

      const query = params.toString();
      router.replace(`/magazyn/pvc${query ? `?${query}` : ''}`, { scroll: false });
    },
    [router]
  );

  // Handlery zmian
  const handleTabChange = (tab: string) => {
    const newTab = tab as TabType;
    setActiveTab(newTab);
    updateUrl(newTab, selectedSystems, selectedColorId, selectedMonth, selectedYear);
  };

  const handleSystemsChange = (systems: SystemType[]) => {
    setSelectedSystems(systems);
    updateUrl(activeTab, systems, selectedColorId, selectedMonth, selectedYear);
  };

  const handleColorSelect = (colorId: number | null) => {
    setSelectedColorId(colorId);
    updateUrl(activeTab, selectedSystems, colorId, selectedMonth, selectedYear);
  };

  const handlePeriodChange = useCallback((month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    updateUrl(activeTab, selectedSystems, selectedColorId, month, year);
  }, [activeTab, selectedSystems, selectedColorId, updateUrl]);

  // Pobierz statystyki systemów
  const systemCounts = systemsData?.systems
    ? {
        living: systemsData.systems.living.count,
        blok: systemsData.systems.blok.count,
        vlak: systemsData.systems.vlak.count,
        ct70: systemsData.systems.ct70.count,
        focusing: systemsData.systems.focusing.count,
      }
    : undefined;

  // Kolory do sidebara
  const colors = stockData?.colors || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <Header title="Magazyn PVC">
        <BackButton href="/" label="Powrót do dashboardu" />
      </Header>

      {/* Breadcrumb */}
      <div className="px-6 pt-4">
        <Breadcrumb
          items={[{ label: 'Magazyn PVC', icon: <Box className="h-4 w-4" /> }]}
        />
      </div>

      {/* Filtry systemów */}
      <div className="px-6 pt-4">
        <SystemFilters
          selectedSystems={selectedSystems}
          onChange={handleSystemsChange}
          systemCounts={systemCounts}
        />
      </div>

      {/* Główna zawartość + Sidebar */}
      <div className="flex flex-1 overflow-hidden mt-4">
        {/* Lewa strona - główna zawartość */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="stan" className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                Stan magazynowy
              </TabsTrigger>
              <TabsTrigger value="zapotrzebowanie" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Zapotrzebowanie
              </TabsTrigger>
              <TabsTrigger value="rw" className="flex items-center gap-1">
                <History className="h-4 w-4" />
                RW
              </TabsTrigger>
              <TabsTrigger value="zamowienia" className="flex items-center gap-1">
                <ShoppingCart className="h-4 w-4" />
                Zamówienia
              </TabsTrigger>
            </TabsList>

            {/* Stan magazynowy */}
            <TabsContent value="stan" className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Checkbox
                  id="hide-zero-stock"
                  checked={hideZeroStock}
                  onCheckedChange={(checked) => setHideZeroStock(checked === true)}
                />
                <Label htmlFor="hide-zero-stock" className="text-sm cursor-pointer">
                  Ukryj stany zerowe
                </Label>
              </div>
              <PvcStockTable
                profiles={stockData?.profiles || []}
                isLoading={stockLoading}
                showColorColumn={!selectedColorId}
                hideZeroStock={hideZeroStock}
              />
            </TabsContent>

            {/* Zapotrzebowanie */}
            <TabsContent value="zapotrzebowanie" className="mt-4">
              <PvcDemandTable
                demand={demandData?.demand || []}
                isLoading={demandLoading}
              />
            </TabsContent>

            {/* RW */}
            <TabsContent value="rw" className="mt-4">
              <PeriodSelector
                month={selectedMonth}
                year={selectedYear}
                onMonthChange={(m) => handlePeriodChange(m, selectedYear)}
                onYearChange={(y) => handlePeriodChange(selectedMonth, y)}
                stats={rwData ? [
                  { label: 'Pozycji', value: rwData.totals?.totalPositions ?? 0 },
                  { label: 'Beli', value: rwData.totals?.totalBeams ?? 0 },
                  { label: 'Zleceń', value: rwData.totals?.totalOrders ?? 0 },
                ] : undefined}
                className="mb-4"
              />
              <PvcRwTable rw={rwData?.rw || []} isLoading={rwLoading} />
            </TabsContent>

            {/* Zamówienia Schuco - wysłane pozycje */}
            <TabsContent value="zamowienia" className="mt-4">
              <PeriodSelector
                month={selectedMonth}
                year={selectedYear}
                onMonthChange={(m) => handlePeriodChange(m, selectedYear)}
                onYearChange={(y) => handlePeriodChange(selectedMonth, y)}
                stats={ordersData ? [
                  { label: 'Pozycji', value: ordersData.totals?.totalItems ?? 0 },
                  { label: 'Dostarczone', value: ordersData.totals?.totalShipped ?? 0, valueClassName: 'text-green-600' },
                  { label: 'Zamówień', value: ordersData.totals?.totalOrders ?? 0 },
                ] : undefined}
                className="mb-4"
              />
              <PvcOrdersTable weeks={ordersData?.weeks || []} isLoading={ordersLoading} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Prawa strona - sidebar kolorów */}
        <ColorSidebarRight
          colors={colors}
          selectedColorId={selectedColorId}
          onColorSelect={handleColorSelect}
          height="h-full"
        />
      </div>
    </div>
  );
}
