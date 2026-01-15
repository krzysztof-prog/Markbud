'use client';

/**
 * Strona dostaw Schuco - główny orchestrator
 *
 * Odpowiada za:
 * - Zarządzanie stanem globalnym strony (showBrowser, activeTab)
 * - Koordynację hooków (pagination, actions, data)
 * - Renderowanie struktury strony z tabami
 *
 * Logika biznesowa i renderowanie delegowane do komponentów z features/schuco.
 */

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ArrowLeft, Truck, Calendar, Clock } from 'lucide-react';

// Import z modułu Schuco
import {
  DeliveryListTab,
  UpcomingDeliveriesTab,
  DeliveryHistoryTab,
  FetchLogsTab,
  StatusCard,
  CriticalErrorAlert,
  useDeliveryPagination,
  useDeliveryActions,
  useSchucoData,
} from '@/features/schuco';

const PAGE_SIZE = 100;

/**
 * Główny komponent strony dostaw Schuco
 */
export default function DostawySchucoPageContent() {
  // Stan lokalny strony
  const [showBrowser, setShowBrowser] = useState(false); // Domyślnie ukryta przeglądarka (headless: true)

  // Pobierz dane z API
  const {
    deliveriesData,
    status,
    statistics,
    logs,
    byWeekData,
    isLoadingDeliveries: _isLoadingDeliveries,
    isLoadingLogs,
    isLoadingByWeek,
  } = useSchucoData({
    currentPage: 1, // Wartość początkowa, zostanie nadpisana przez pagination
    pageSize: PAGE_SIZE,
  });

  // Paginacja
  const pagination = useDeliveryPagination({
    total: deliveriesData?.total || 0,
    totalPages: deliveriesData?.totalPages || 1,
    pageSize: PAGE_SIZE,
  });

  // Akcje (refresh, cleanup)
  const {
    handleRefresh,
    handleCleanupPending,
    isRefreshing,
    isCleaningUp,
  } = useDeliveryActions({
    onRefreshSuccess: pagination.resetPagination,
  });

  // Pobierz dane z właściwą stroną
  const {
    deliveriesData: currentPageData,
    isLoadingDeliveries: isLoadingCurrentPage,
  } = useSchucoData({
    currentPage: pagination.currentPage,
    pageSize: PAGE_SIZE,
  });

  // Dostawy z aktualnej strony
  const deliveries = currentPageData?.data || [];

  // Policz pending logi dla badge
  const pendingLogsCount = useMemo(() => {
    return logs.filter((log) => log.status === 'pending').length;
  }, [logs]);

  // Callback odświeżania z uwzględnieniem stanu showBrowser
  const handleRefreshWithBrowser = useCallback(() => {
    handleRefresh(showBrowser);
  }, [handleRefresh, showBrowser]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <Header title="Dostawy Schuco">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót do dashboardu
            </Link>
          </Button>
        </Header>

        {/* Breadcrumb */}
        <div className="px-6 pt-4">
          <Breadcrumb
            items={[
              { label: 'Dostawy Schuco', icon: <Truck className="h-4 w-4" /> },
            ]}
          />
        </div>

        {/* Główna zawartość */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {/* Alert błędu krytycznego */}
          {status && (
            <CriticalErrorAlert
              status={status}
              isRefreshing={isRefreshing}
              onRefresh={handleRefreshWithBrowser}
            />
          )}

          {/* Karta statusu */}
          {status && (
            <StatusCard
              status={status}
              statistics={statistics}
              isRefreshing={isRefreshing}
              showBrowser={showBrowser}
              onShowBrowserChange={setShowBrowser}
              onRefresh={handleRefreshWithBrowser}
            />
          )}

          {/* Zakładki */}
          <Tabs defaultValue="deliveries" className="space-y-4">
            <TabsList>
              {/* Zakładka: Dostawy */}
              <TabsTrigger value="deliveries">
                Dostawy
                {(currentPageData?.total || 0) > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {currentPageData?.total}
                  </Badge>
                )}
              </TabsTrigger>

              {/* Zakładka: Nadchodzące dostawy */}
              <TabsTrigger value="upcoming">
                <Calendar className="h-4 w-4 mr-1" />
                Nadchodzące dostawy
              </TabsTrigger>

              {/* Zakładka: Historia dostaw */}
              <TabsTrigger value="history">
                <Clock className="h-4 w-4 mr-1" />
                Historia dostaw
              </TabsTrigger>

              {/* Zakładka: Historia pobrań */}
              <TabsTrigger value="logs">
                Historia pobrań
                {logs.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {logs.length}
                  </Badge>
                )}
                {pendingLogsCount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {pendingLogsCount} pending
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Zawartość zakładki: Dostawy */}
            <TabsContent value="deliveries" className="space-y-4">
              <DeliveryListTab
                deliveries={deliveries}
                total={currentPageData?.total || 0}
                isLoading={isLoadingCurrentPage}
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                startItem={pagination.startItem}
                endItem={pagination.endItem}
                onPageChange={pagination.goToPage}
                onRefresh={handleRefreshWithBrowser}
              />
            </TabsContent>

            {/* Zawartość zakładki: Nadchodzące dostawy */}
            <TabsContent value="upcoming" className="space-y-4">
              <UpcomingDeliveriesTab
                weeks={byWeekData?.weeks}
                isLoading={isLoadingByWeek}
              />
            </TabsContent>

            {/* Zawartość zakładki: Historia dostaw */}
            <TabsContent value="history" className="space-y-4">
              <DeliveryHistoryTab
                weeks={byWeekData?.weeks}
                isLoading={isLoadingByWeek}
              />
            </TabsContent>

            {/* Zawartość zakładki: Historia pobrań */}
            <TabsContent value="logs" className="space-y-4">
              <FetchLogsTab
                logs={logs}
                isLoading={isLoadingLogs}
                isCleaningUp={isCleaningUp}
                onCleanupPending={handleCleanupPending}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
