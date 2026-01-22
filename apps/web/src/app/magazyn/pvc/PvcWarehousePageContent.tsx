/**
 * PvcWarehousePageContent - główna zawartość strony magazynu PVC
 *
 * Layout:
 * - Header z tytułem
 * - Checkboxy systemów (Living, BLOK, VLAK, CT70, FOCUSING)
 * - Główna zawartość + sidebar kolorów po prawej stronie
 * - Tabs: Stan | Zapotrzebowanie | RW | Zamówienia
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Box, Package, FileText, History, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

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

const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

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

  // Dostępne lata (od 2024 do +1 rok)
  const availableYears = Array.from(
    { length: defaultYear - 2024 + 2 },
    (_, i) => 2024 + i
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

  const handleMonthChange = (month: string) => {
    const newMonth = parseInt(month, 10);
    setSelectedMonth(newMonth);
    updateUrl(activeTab, selectedSystems, selectedColorId, newMonth, selectedYear);
  };

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year, 10);
    setSelectedYear(newYear);
    updateUrl(activeTab, selectedSystems, selectedColorId, selectedMonth, newYear);
  };

  const handlePrevMonth = () => {
    let newMonth = selectedMonth - 1;
    let newYear = selectedYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    updateUrl(activeTab, selectedSystems, selectedColorId, newMonth, newYear);
  };

  const handleNextMonth = () => {
    let newMonth = selectedMonth + 1;
    let newYear = selectedYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    updateUrl(activeTab, selectedSystems, selectedColorId, newMonth, newYear);
  };

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
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do dashboardu
          </Button>
        </Link>
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
              <PvcStockTable
                profiles={stockData?.profiles || []}
                isLoading={stockLoading}
                showColorColumn={!selectedColorId}
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
              {/* Selektor miesiąca/roku */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border mb-4">
                <span className="text-sm font-medium text-slate-600">Okres:</span>

                <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((name, idx) => (
                      <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Statystyki */}
                {rwData && (
                  <div className="ml-auto flex items-center gap-4 text-sm">
                    <span className="text-slate-500">
                      Pozycji: <strong className="text-slate-700">{rwData.totals?.totalPositions ?? 0}</strong>
                    </span>
                    <span className="text-slate-500">
                      Beli: <strong className="text-slate-700">{rwData.totals?.totalBeams ?? 0}</strong>
                    </span>
                    <span className="text-slate-500">
                      Zleceń: <strong className="text-slate-700">{rwData.totals?.totalOrders ?? 0}</strong>
                    </span>
                  </div>
                )}
              </div>

              <PvcRwTable rw={rwData?.rw || []} isLoading={rwLoading} />
            </TabsContent>

            {/* Zamówienia Schuco - wysłane pozycje */}
            <TabsContent value="zamowienia" className="mt-4">
              {/* Selektor miesiąca/roku */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border mb-4">
                <span className="text-sm font-medium text-slate-600">Okres:</span>

                <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((name, idx) => (
                      <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Statystyki */}
                {ordersData && (
                  <div className="ml-auto flex items-center gap-4 text-sm">
                    <span className="text-slate-500">
                      Pozycji: <strong className="text-slate-700">{ordersData.totals?.totalItems ?? 0}</strong>
                    </span>
                    <span className="text-slate-500">
                      Wysłano: <strong className="text-green-600">{ordersData.totals?.totalShipped ?? 0}</strong>
                    </span>
                    <span className="text-slate-500">
                      Zamówień: <strong className="text-slate-700">{ordersData.totals?.totalOrders ?? 0}</strong>
                    </span>
                  </div>
                )}
              </div>

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
