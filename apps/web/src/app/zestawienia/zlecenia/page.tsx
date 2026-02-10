'use client';

/**
 * Strona zestawienia zleceń - thin orchestrator
 * Cała logika wydzielona do hooków i komponentów w features/orders
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { ordersApi, settingsApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { getTodayWarsaw } from '@/lib/date-utils';
import { useRoleCheck } from '@/features/auth/hooks/useRoleCheck';
import type { SchucoDeliveryLink } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

// Feature imports
import {
  // Components
  OrdersTable,
  OrdersFilterBar,
  ColumnSettingsPanel,
  FilteredSummaryBar,
  OrdersEmptyState,
  OrdersLoadingState,
  OrderDetailModal,
  OrdersStatsModal,
  SchucoDeliveriesModal,
  GlassDiscrepancyModal,
  getCellValueForExport,
  // Hooks
  useOrderFilters,
  useOrderGrouping,
  useOrdersStats,
  useOrderEdit,
  // Types
  type ExtendedOrder,
  type GroupBy,
} from '@/features/orders';

// ================================
// Główny komponent strony
// ================================

export default function ZestawienieZlecenPage() {
  // Stan UI
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [selectedOrder, setSelectedOrder] = useState<{ id: number; number: string } | null>(null);
  const [selectedSchucoOrder, setSelectedSchucoOrder] = useState<{
    orderNumber: string;
    schucoLinks: SchucoDeliveryLink[];
  } | null>(null);
  const [glassDiscrepancyOrderNumber, setGlassDiscrepancyOrderNumber] = useState<string | null>(null);

  // Stan dla confirmation dialog usuwania
  const [orderToDelete, setOrderToDelete] = useState<{ id: number; orderNumber: string } | null>(null);

  // Sprawdzanie uprawnień - tylko admin i kierownik mogą usuwać
  const { isAdmin, isKierownik } = useRoleCheck();
  const canDeleteOrders = isAdmin || isKierownik;

  // ================================
  // Data fetching
  // ================================

  const { data: activeResponse, isLoading: isLoadingActive } = useQuery({
    queryKey: ['orders', 'all-active'],
    queryFn: () => ordersApi.getAll({ archived: 'false' }),
  });
  const activeOrders = (activeResponse?.data ?? []) as ExtendedOrder[];

  const { data: archivedResponse, isLoading: isLoadingArchived } = useQuery({
    queryKey: ['orders', 'all-archived'],
    queryFn: () => ordersApi.getAll({ archived: 'true' }),
  });
  const archivedOrders = (archivedResponse?.data ?? []) as ExtendedOrder[];

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll,
  });

  const isLoading = isLoadingActive || isLoadingArchived;
  const eurRate = parseFloat(settings?.eurToPlnRate || '4.35');

  // Połącz wszystkie zlecenia
  const allOrders = useMemo<ExtendedOrder[]>(() => {
    return [...activeOrders, ...archivedOrders];
  }, [activeOrders, archivedOrders]);

  // ================================
  // Custom hooks
  // ================================

  // Hook do filtrowania
  const {
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    columnFilters,
    setColumnFilters,
    columns,
    visibleColumns,
    draggedColumn,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    toggleColumnVisibility,
    resetColumnOrder,
    filteredOrders,
    missingOrderNumbers,
    hasActiveFilter,
  } = useOrderFilters({ allOrders });

  // Hook do grupowania
  const { groupedOrders, getGroupLabel } = useOrderGrouping({
    filteredOrders,
    groupBy,
  });

  // Hook do statystyk
  const { stats, filteredSummary } = useOrdersStats({
    allOrders,
    filteredOrders,
  });

  // Hook do edycji inline
  const {
    editingCell,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    saveEdit,
  } = useOrderEdit();

  // Query client i toast
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mutacja do zmiany manualStatus z optimistic update dla natychmiastowej zmiany UI
  const manualStatusMutation = useMutation({
    mutationFn: ({ orderId, manualStatus }: { orderId: number; manualStatus: 'do_not_cut' | 'cancelled' | 'on_hold' | null }) =>
      ordersApi.updateManualStatus(orderId, manualStatus),
    // Optimistic update - natychmiast aktualizuj UI przed odpowiedzią serwera
    onMutate: async ({ orderId, manualStatus }) => {
      // Anuluj wszystkie pending queries aby uniknąć nadpisania optimistic update
      await queryClient.cancelQueries({ queryKey: ['orders'] });

      // Zachowaj poprzedni stan
      const previousActive = queryClient.getQueryData(['orders', 'all-active']);
      const previousArchived = queryClient.getQueryData(['orders', 'all-archived']);

      // Optymistycznie zaktualizuj dane
      const updateOrders = (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || !('data' in oldData)) return oldData;
        const typedData = oldData as { data: ExtendedOrder[] };
        return {
          ...typedData,
          data: typedData.data.map((order: ExtendedOrder) =>
            order.id === orderId ? { ...order, manualStatus } : order
          ),
        };
      };

      queryClient.setQueryData(['orders', 'all-active'], updateOrders);
      queryClient.setQueryData(['orders', 'all-archived'], updateOrders);

      // Zwróć kontekst z poprzednim stanem do rollbacku
      return { previousActive, previousArchived };
    },
    onSuccess: (_data, variables) => {
      // Pokaż toast z informacją o zmianie
      const statusLabels: Record<string, string> = {
        do_not_cut: 'NIE CIĄĆ',
        cancelled: 'Anulowane',
        on_hold: 'Wstrzymane',
      };
      const statusLabel = variables.manualStatus ? statusLabels[variables.manualStatus] : 'usunięty';

      toast({
        title: 'Status zaktualizowany',
        description: variables.manualStatus
          ? `Ustawiono status: ${statusLabel}`
          : 'Status został usunięty',
      });
    },
    onError: (error: Error, _variables, context) => {
      // Rollback przy błędzie
      if (context?.previousActive) {
        queryClient.setQueryData(['orders', 'all-active'], context.previousActive);
      }
      if (context?.previousArchived) {
        queryClient.setQueryData(['orders', 'all-archived'], context.previousArchived);
      }

      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się zmienić statusu',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Po zakończeniu (sukces lub błąd) odśwież dane z serwera dla pewności
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // Mutacja do usuwania zlecenia (soft delete)
  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: number) => ordersApi.delete(orderId),
    onMutate: async (orderId) => {
      // Anuluj wszystkie pending queries
      await queryClient.cancelQueries({ queryKey: ['orders'] });

      // Zachowaj poprzedni stan
      const previousActive = queryClient.getQueryData(['orders', 'all-active']);
      const previousArchived = queryClient.getQueryData(['orders', 'all-archived']);

      // Optymistycznie usuń zlecenie z listy
      const removeOrder = (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || !('data' in oldData)) return oldData;
        const typedData = oldData as { data: ExtendedOrder[] };
        return {
          ...typedData,
          data: typedData.data.filter((order: ExtendedOrder) => order.id !== orderId),
        };
      };

      queryClient.setQueryData(['orders', 'all-active'], removeOrder);
      queryClient.setQueryData(['orders', 'all-archived'], removeOrder);

      return { previousActive, previousArchived };
    },
    onSuccess: () => {
      toast({
        title: 'Zlecenie usunięte',
        description: `Zlecenie ${orderToDelete?.orderNumber} zostało usunięte`,
      });
      setOrderToDelete(null);
    },
    onError: (error: Error, _orderId, context) => {
      // Rollback przy błędzie
      if (context?.previousActive) {
        queryClient.setQueryData(['orders', 'all-active'], context.previousActive);
      }
      if (context?.previousArchived) {
        queryClient.setQueryData(['orders', 'all-archived'], context.previousArchived);
      }

      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się usunąć zlecenia',
        variant: 'destructive',
      });
      setOrderToDelete(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // Mutacja do ustawienia daty dostawy szyb (glassDeliveryDate)
  const glassDeliveryDateMutation = useMutation({
    mutationFn: ({ orderId, date }: { orderId: number; date: string }) =>
      ordersApi.patch(orderId, { glassDeliveryDate: date }),
    onMutate: async ({ orderId, date }) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });

      const previousActive = queryClient.getQueryData(['orders', 'all-active']);
      const previousArchived = queryClient.getQueryData(['orders', 'all-archived']);

      const updateOrders = (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object' || !('data' in oldData)) return oldData;
        const typedData = oldData as { data: ExtendedOrder[] };
        return {
          ...typedData,
          data: typedData.data.map((order: ExtendedOrder) =>
            order.id === orderId ? { ...order, glassDeliveryDate: date } : order
          ),
        };
      };

      queryClient.setQueryData(['orders', 'all-active'], updateOrders);
      queryClient.setQueryData(['orders', 'all-archived'], updateOrders);

      return { previousActive, previousArchived };
    },
    onSuccess: () => {
      toast({
        title: 'Data dostawy szyb zapisana',
        description: 'Data planowanej dostawy szyb została ustawiona',
      });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousActive) {
        queryClient.setQueryData(['orders', 'all-active'], context.previousActive);
      }
      if (context?.previousArchived) {
        queryClient.setQueryData(['orders', 'all-archived'], context.previousArchived);
      }
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się zapisać daty dostawy szyb',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // ================================
  // Callbacks
  // ================================

  const handleOrderClick = useCallback((id: number, orderNumber: string) => {
    setSelectedOrder({ id, number: orderNumber });
  }, []);

  const handleSchucoStatusClick = useCallback((orderNumber: string, schucoLinks: SchucoDeliveryLink[]) => {
    setSelectedSchucoOrder({ orderNumber, schucoLinks });
  }, []);

  const handleGlassDiscrepancyClick = useCallback((orderNumber: string) => {
    setGlassDiscrepancyOrderNumber(orderNumber);
  }, []);

  const handleGlassDeliveryDateSet = useCallback((orderId: number, date: string) => {
    glassDeliveryDateMutation.mutate({ orderId, date });
  }, [glassDeliveryDateMutation]);

  const handleManualStatusChange = useCallback((orderId: number, manualStatus: 'do_not_cut' | 'cancelled' | 'on_hold' | null) => {
    manualStatusMutation.mutate({ orderId, manualStatus });
  }, [manualStatusMutation]);

  // Handler do usuwania zlecenia - otwiera confirmation dialog
  const handleDeleteOrder = useCallback((orderId: number, orderNumber: string) => {
    setOrderToDelete({ id: orderId, orderNumber });
  }, []);

  // Potwierdź usunięcie zlecenia
  const confirmDeleteOrder = useCallback(() => {
    if (orderToDelete) {
      deleteOrderMutation.mutate(orderToDelete.id);
    }
  }, [orderToDelete, deleteOrderMutation]);

  const handleExportCSV = useCallback(() => {
    const headers = visibleColumns.map(col => col.label);
    const rows = filteredOrders.map((order: ExtendedOrder) =>
      visibleColumns.map(col => getCellValueForExport(order, col.id))
    );

    const csv = [headers, ...rows].map((row) => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zestawienie_zlecen_${getTodayWarsaw()}.csv`;
    link.click();
  }, [visibleColumns, filteredOrders]);

  // ================================
  // Render
  // ================================

  return (
    <div className="flex flex-col h-full">
      <Header title="Zestawienie zleceń" />

      <div className="flex-1 p-6 space-y-6">
        {/* Pasek filtrów */}
        <OrdersFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filters={filters}
          setFilters={setFilters}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          onColumnSettingsClick={() => setShowColumnSettings(!showColumnSettings)}
          onStatsClick={() => setShowStatsModal(true)}
          onExportClick={handleExportCSV}
        />

        {/* Panel ustawień kolumn */}
        {showColumnSettings && (
          <ColumnSettingsPanel
            columns={columns}
            draggedColumn={draggedColumn}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onToggleVisibility={toggleColumnVisibility}
            onReset={() => {
              resetColumnOrder();
              setShowColumnSettings(false);
            }}
          />
        )}

        {/* Podsumowanie filtrowanych zleceń */}
        {hasActiveFilter && !isLoading && filteredOrders.length > 0 && (
          <FilteredSummaryBar
            filteredCount={filteredOrders.length}
            summary={filteredSummary}
          />
        )}

        {/* Tabela zleceń lub stany ładowania/pusty */}
        {isLoading ? (
          <OrdersLoadingState />
        ) : filters.showOnlyMissing ? (
          // Tryb "tylko brakujące" - pokazuj jedną tabelę z brakującymi numerami
          <OrdersTable
            groupKey="missing"
            orders={[]}
            visibleColumns={visibleColumns}
            groupBy="none"
            searchQuery=""
            filteredOrdersCount={missingOrderNumbers.length}
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
            eurRate={eurRate}
            editingCell={editingCell}
            editValue={editValue}
            setEditValue={setEditValue}
            startEdit={startEdit}
            cancelEdit={cancelEdit}
            saveEdit={saveEdit}
            onOrderClick={handleOrderClick}
            onSchucoStatusClick={handleSchucoStatusClick}
            onGlassDiscrepancyClick={handleGlassDiscrepancyClick}
            onGlassDeliveryDateSet={handleGlassDeliveryDateSet}
            onManualStatusChange={handleManualStatusChange}
            canDeleteOrders={canDeleteOrders}
            onDeleteOrder={handleDeleteOrder}
            getGroupLabel={getGroupLabel}
            missingOrderNumbers={missingOrderNumbers}
            showOnlyMissing={true}
            hideMissing={false}
          />
        ) : filteredOrders.length > 0 ? (
          Object.entries(groupedOrders).map(([groupKey, orders]) => (
            <OrdersTable
              key={groupKey}
              groupKey={groupKey}
              orders={orders}
              visibleColumns={visibleColumns}
              groupBy={groupBy}
              searchQuery={searchQuery}
              filteredOrdersCount={filteredOrders.length}
              columnFilters={columnFilters}
              setColumnFilters={setColumnFilters}
              eurRate={eurRate}
              editingCell={editingCell}
              editValue={editValue}
              setEditValue={setEditValue}
              startEdit={startEdit}
              cancelEdit={cancelEdit}
              saveEdit={saveEdit}
              onOrderClick={handleOrderClick}
              onSchucoStatusClick={handleSchucoStatusClick}
              onGlassDiscrepancyClick={handleGlassDiscrepancyClick}
              onGlassDeliveryDateSet={handleGlassDeliveryDateSet}
              onManualStatusChange={handleManualStatusChange}
              canDeleteOrders={canDeleteOrders}
              onDeleteOrder={handleDeleteOrder}
              getGroupLabel={getGroupLabel}
              missingOrderNumbers={missingOrderNumbers}
              showOnlyMissing={false}
              hideMissing={filters.hideMissing}
              preserveOrder={filters.privateUpcoming2Weeks}
            />
          ))
        ) : (
          <OrdersEmptyState hasSearchQuery={!!searchQuery} />
        )}
      </div>

      {/* Modale */}
      <OrderDetailModal
        orderId={selectedOrder?.id || null}
        orderNumber={selectedOrder?.number}
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
      />

      <OrdersStatsModal
        open={showStatsModal}
        onOpenChange={setShowStatsModal}
        stats={stats}
        allOrders={allOrders as any} // eslint-disable-line @typescript-eslint/no-explicit-any
        eurRate={eurRate}
      />

      {selectedSchucoOrder && (
        <SchucoDeliveriesModal
          isOpen={!!selectedSchucoOrder}
          onClose={() => setSelectedSchucoOrder(null)}
          orderNumber={selectedSchucoOrder.orderNumber}
          schucoLinks={selectedSchucoOrder.schucoLinks}
        />
      )}

      <GlassDiscrepancyModal
        open={!!glassDiscrepancyOrderNumber}
        onOpenChange={(open) => {
          if (!open) setGlassDiscrepancyOrderNumber(null);
        }}
        orderNumber={glassDiscrepancyOrderNumber}
      />

      {/* Dialog potwierdzenia usunięcia zlecenia */}
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć zlecenie?</AlertDialogTitle>
            <AlertDialogDescription>
              Zlecenie <strong>{orderToDelete?.orderNumber}</strong> zostanie oznaczone jako usunięte.
              {'\n\n'}
              Ta operacja jest odwracalna - zlecenie można przywrócić z poziomu bazy danych.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteOrderMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDeleteOrder}
              disabled={deleteOrderMutation.isPending}
            >
              {deleteOrderMutation.isPending ? 'Usuwanie...' : 'Usuń zlecenie'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
