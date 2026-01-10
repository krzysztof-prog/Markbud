'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';
import { PlayCircle, CheckCircle, FileText, Clock, Package, FileCheck, Loader2 } from 'lucide-react';

// Skeleton loader dla tabs
const TabLoader = () => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    <span className="ml-3 text-gray-600">Ładowanie...</span>
  </div>
);

// Lazy loading dla wszystkich ciężkich komponentów
const AddToProductionTab = dynamic(
  () => import('@/features/manager/components/AddToProductionTab').then((mod) => ({ default: mod.AddToProductionTab })),
  {
    loading: () => <TabLoader />,
    ssr: false,
  }
);

const CompleteOrdersTab = dynamic(
  () => import('@/features/manager/components/CompleteOrdersTab').then((mod) => ({ default: mod.CompleteOrdersTab })),
  {
    loading: () => <TabLoader />,
    ssr: false,
  }
);

const TimeTrackerTab = dynamic(
  () => import('@/features/manager/components/TimeTrackerTab').then((mod) => ({ default: mod.TimeTrackerTab })),
  {
    loading: () => <TabLoader />,
    ssr: false,
  }
);

const PalletsTab = dynamic(
  () => import('@/features/manager/components/PalletsTab').then((mod) => ({ default: mod.PalletsTab })),
  {
    loading: () => <TabLoader />,
    ssr: false,
  }
);

const BZTab = dynamic(
  () => import('@/features/manager/components/BZTab').then((mod) => ({ default: mod.BZTab })),
  {
    loading: () => <TabLoader />,
    ssr: false,
  }
);

// Dynamiczny import strony zestawień miesięcznych
const MonthlyReportContent = dynamic(
  () => import('../zestawienia/miesieczne/page').then((mod) => mod.default),
  {
    loading: () => <TabLoader />,
    ssr: false,
  }
);

/**
 * Component wrapujący useSearchParams() w Suspense boundary
 * Wymagane przez Next.js 15 dla static export
 */
function TabManager() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('add-to-production');

  // Obsługa parametru tab z URL (np. z przekierowania)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
      <div className="border-b bg-white px-6">
        <TabsList className="h-auto p-0 bg-transparent">
          <TabsTrigger
            value="add-to-production"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4 py-3"
          >
            <PlayCircle className="h-4 w-4" />
            Dodaj do produkcji
          </TabsTrigger>
          <TabsTrigger
            value="complete-orders"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4 py-3"
          >
            <CheckCircle className="h-4 w-4" />
            Zakończ zlecenia
          </TabsTrigger>
          <TabsTrigger
            value="monthly-report"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4 py-3"
          >
            <FileText className="h-4 w-4" />
            Zestawienie miesięczne
          </TabsTrigger>
          <TabsTrigger
            value="time-tracker"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4 py-3"
          >
            <Clock className="h-4 w-4" />
            Godzinówki
          </TabsTrigger>
          <TabsTrigger
            value="pallets"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4 py-3"
          >
            <Package className="h-4 w-4" />
            Paletówki
          </TabsTrigger>
          <TabsTrigger
            value="bz"
            className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-4 py-3"
          >
            <FileCheck className="h-4 w-4" />
            B-Z
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-auto">
        <TabsContent value="add-to-production" className="m-0 h-full">
          <AddToProductionTab />
        </TabsContent>

        <TabsContent value="complete-orders" className="m-0 h-full">
          <CompleteOrdersTab />
        </TabsContent>

        <TabsContent value="monthly-report" className="m-0 h-full">
          <MonthlyReportContent />
        </TabsContent>

        <TabsContent value="time-tracker" className="m-0 h-full">
          <TimeTrackerTab />
        </TabsContent>

        <TabsContent value="pallets" className="m-0 h-full">
          <PalletsTab />
        </TabsContent>

        <TabsContent value="bz" className="m-0 h-full">
          <BZTab />
        </TabsContent>
      </div>
    </Tabs>
  );
}

/**
 * Panel Kierownika - strona główna
 *
 * Zawiera 6 zakładek:
 * 1. Dodaj do produkcji - wybieranie zleceń do produkcji (status: in_progress)
 * 2. Zakończ zlecenia - oznaczanie zleceń jako wyprodukowane (status: completed)
 * 3. Zestawienie miesięczne - istniejąca strona zestawień (przeniesiona z /zestawienia)
 * 4. Godzinówki - placeholder (przyszłość)
 * 5. Paletówki - placeholder (przyszłość)
 * 6. B-Z - placeholder (przyszłość)
 */
export default function KierownikPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Panel Kierownika" />
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<TabLoader />}>
          <TabManager />
        </Suspense>
      </div>
    </div>
  );
}
