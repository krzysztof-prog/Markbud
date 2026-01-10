'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { showErrorToast } from '@/lib/toast-helpers';
import { deliveriesApi, ordersApi } from '@/lib/api';
import { useFormValidation } from '@/hooks/useFormValidation';
import { CalendarDays, List } from 'lucide-react';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { OrderDragOverlay } from './DragDropComponents';
import type { Delivery } from '@/types/delivery';
import type { Order } from '@/types/order';

// Import skeleton loaders
import {
  CalendarSkeleton,
  ListViewSkeleton,
  DialogSkeleton,
  PanelSkeleton,
  BulkUpdateDialogSkeleton,
} from '@/components/loaders/DeliverySkeleton';

// Lazy-loaded components with skeletons
const DeliveriesListView = dynamic(
  () => import('./components/DeliveriesListView').then((mod) => ({ default: mod.DeliveriesListView })),
  { loading: () => <ListViewSkeleton />, ssr: false }
);

const DeliveryCalendar = dynamic(
  () => import('./components/DeliveryCalendar').then((mod) => ({ default: mod.DeliveryCalendar })),
  { loading: () => <CalendarSkeleton />, ssr: false }
);

const UnassignedOrdersPanel = dynamic(
  () => import('./components/UnassignedOrdersPanel').then((mod) => ({ default: mod.UnassignedOrdersPanel })),
  { loading: () => <PanelSkeleton />, ssr: false }
);

const BulkUpdateDatesDialog = dynamic(
  () => import('./components/BulkUpdateDatesDialog').then((mod) => ({ default: mod.BulkUpdateDatesDialog })),
  { loading: () => <BulkUpdateDialogSkeleton />, ssr: false }
);

// Individual dialog components
const DestructiveDeleteDeliveryDialog = dynamic(
  () => import('./components/DeliveryDialogs').then((mod) => ({ default: mod.DestructiveDeleteDeliveryDialog })),
  { loading: () => <DialogSkeleton />, ssr: false }
);

const AddItemDialog = dynamic(
  () => import('./components/DeliveryDialogs').then((mod) => ({ default: mod.AddItemDialog })),
  { loading: () => <DialogSkeleton />, ssr: false }
);

const CompleteOrdersDialog = dynamic(
  () => import('./components/DeliveryDialogs').then((mod) => ({ default: mod.CompleteOrdersDialog })),
  { loading: () => <DialogSkeleton />, ssr: false }
);

const DeliveryDetailsDialog = dynamic(
  () => import('./components/DeliveryDialogs').then((mod) => ({ default: mod.DeliveryDetailsDialog })),
  { loading: () => <DialogSkeleton />, ssr: false }
);

const OrderDetailModal = dynamic(
  () => import('@/components/orders/order-detail-modal').then((mod) => ({ default: mod.OrderDetailModal })),
  { loading: () => <DialogSkeleton />, ssr: false }
);

const WindowStatsDialog = dynamic(
  () => import('@/components/window-stats-dialog').then((mod) => ({ default: mod.WindowStatsDialog })),
  { loading: () => <DialogSkeleton />, ssr: false }
);

// P1-3: Variant Type Selection Dialog
const VariantTypeSelectionDialog = dynamic(
  () => import('@/components/ui/variant-type-selection-dialog').then((mod) => ({ default: mod.VariantTypeSelectionDialog })),
  { loading: () => <DialogSkeleton />, ssr: false }
);

// Extracted hooks
import {
  useDeliveryFilters,
  useDeliveryStats,
  useDeliveryActions,
  useDeliverySelection,
  useDeliveryExport,
} from './hooks';
import { useAddOrderWithVariantCheck } from './hooks/useAddOrderWithVariantCheck';

interface DostawyPageContentProps {
  initialSelectedOrderId?: number | null;
}

export default function DostawyPageContent({ initialSelectedOrderId }: DostawyPageContentProps) {
  const queryClient = useQueryClient();

  // === EXTRACTED HOOKS ===
  const filters = useDeliveryFilters();
  const selection = useDeliverySelection();
  const { downloadProtocol, isDownloading } = useDeliveryExport();

  // === LOCAL STATE ===
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [_showNewDeliveryDialog, setShowNewDeliveryDialog] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newDeliveryNotes, setNewDeliveryNotes] = useState('');
  const [deliveryToDelete, setDeliveryToDelete] = useState<Delivery | null>(null);
  const [showWindowStatsDialog, setShowWindowStatsDialog] = useState(false);
  const [showBulkUpdateDatesDialog, setShowBulkUpdateDatesDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [newItem, setNewItem] = useState({ itemType: 'glass', description: '', quantity: 1 });
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [productionDate, setProductionDate] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null);

  // Form validation
  const validation = useFormValidation({
    deliveryDate: [
      { validate: (value: string) => !!value, message: 'Data dostawy jest wymagana' },
      {
        validate: (value: string) => {
          if (!value) return true;
          const selected = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return selected >= today;
        },
        message: 'Data dostawy nie moze byc w przeszlosci',
      },
    ],
  });

  // === DATA FETCHING ===
  const { data, isLoading, error } = useQuery({
    queryKey: ['deliveries-calendar-batch', filters.monthsToFetch],
    queryFn: () => deliveriesApi.getCalendarBatch(filters.monthsToFetch),
  });

  const deliveries = data?.deliveries || [];
  const unassignedOrders = data?.unassignedOrders || [];
  const workingDays = data?.workingDays || [];
  const holidays = data?.holidays || [];

  // Statistics hook
  const stats = useDeliveryStats({ deliveries, workingDays, holidays });

  // Actions hook
  const actions = useDeliveryActions({
    onDeliveryCreated: () => {
      setShowNewDeliveryDialog(false);
      setNewDeliveryDate('');
      setNewDeliveryNotes('');
      validation.reset();
    },
    onDeliveryDeleted: () => {
      setSelectedDelivery(null);
      setDeliveryToDelete(null);
    },
    onOrdersCompleted: () => {
      setShowCompleteDialog(false);
      setProductionDate('');
      setSelectedDelivery(null);
    },
    onSelectedDeliveryUpdate: setSelectedDelivery,
    selectedDelivery,
    monthsToFetch: filters.monthsToFetch,
  });

  // P1-3: Variant type check wrapper for addOrderToDelivery
  const variantCheckWrapper = useAddOrderWithVariantCheck(
    (params) => actions.addOrderToDeliveryMutation.mutateAsync(params)
  );

  // === EFFECTS ===
  useEffect(() => {
    if (initialSelectedOrderId) {
      setSelectedOrderId(initialSelectedOrderId);
    } else {
      setSelectedOrderId(null);
      setSelectedOrderNumber(null);
    }
  }, [initialSelectedOrderId]);

  useEffect(() => {
    if (selectedOrderId) {
      let isMounted = true;
      ordersApi.getById(selectedOrderId).then((order) => {
        if (isMounted) setSelectedOrderNumber((order as Order).orderNumber);
      }).catch(() => {
        if (isMounted) showErrorToast('Nie udalo sie wczytac dane zlecenia');
      });
      return () => { isMounted = false; };
    }
  }, [selectedOrderId]);

  // === EVENT HANDLERS ===
  const _handleCreateDelivery = () => {
    if (!validation.validateAll({ deliveryDate: newDeliveryDate })) {
      validation.touch('deliveryDate');
      return;
    }
    actions.createDeliveryMutation.mutate({ deliveryDate: newDeliveryDate, notes: newDeliveryNotes || undefined });
  };

  const handleDayClick = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setNewDeliveryDate(dateStr);
    setShowNewDeliveryDialog(true);
  };

  const handleDayRightClick = (e: React.MouseEvent, date: Date) => {
    e.preventDefault();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    actions.toggleWorkingDayMutation.mutate({ date: dateStr, isWorking: stats.isNonWorkingDay(date) ?? false });
  };

  const onDragEnd = useCallback((event: import('@dnd-kit/core').DragEndEvent) => {
    selection.handleDragEnd(event, {
      onMoveOrderBetweenDeliveries: async (s, t, o) => {
        await actions.moveOrderBetweenDeliveriesMutation.mutateAsync({ sourceDeliveryId: s, targetDeliveryId: t, orderId: o });
      },
      onAddOrderToDelivery: async (d, o) => {
        // P1-3: Find order to get orderNumber for variant check
        const order = unassignedOrders.find(ord => ord.id === o);
        if (!order) {
          await actions.addOrderToDeliveryMutation.mutateAsync({ deliveryId: d, orderId: o });
          return;
        }
        await variantCheckWrapper.addOrderWithVariantCheck(d, o, order.orderNumber);
      },
      onRemoveOrderFromDelivery: async (d, o) => {
        await actions.removeOrderFromDeliveryMutation.mutateAsync({ deliveryId: d, orderId: o });
      },
    });
  }, [selection, actions, unassignedOrders, variantCheckWrapper]);

  // === RENDER ===
  return (
    <DndContext sensors={selection.sensors} collisionDetection={closestCenter} onDragStart={selection.handleDragStart} onDragEnd={onDragEnd}>
      <div className="flex flex-col h-full">
        <Header title="Dostawy" />
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between">
            <Breadcrumb items={[{ label: 'Dostawy', icon: <CalendarDays className="h-4 w-4" /> }]} />
            <div className="flex gap-2">
              <Button variant={filters.pageViewMode === 'calendar' ? 'default' : 'outline'} size="sm" onClick={() => filters.setPageViewMode('calendar')}>
                <CalendarDays className="h-4 w-4 mr-2" />Kalendarz
              </Button>
              <Button variant={filters.pageViewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => filters.setPageViewMode('list')}>
                <List className="h-4 w-4 mr-2" />Lista
              </Button>
            </div>
          </div>
        </div>

        {filters.pageViewMode === 'list' ? (
          <div className="flex-1 p-6 overflow-auto"><DeliveriesListView /></div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <DeliveryCalendar
              continuousDays={filters.continuousDays} viewMode={filters.viewMode} dateRange={filters.dateRange} weekOffset={filters.weekOffset}
              isLoading={isLoading} error={error as Error | null} stats={stats}
              onGoToPrevious={filters.goToPrevious} onGoToNext={filters.goToNext} onGoToToday={filters.goToToday} onChangeViewMode={filters.changeViewMode}
              onDayClick={handleDayClick} onDayRightClick={handleDayRightClick} onDeliveryClick={setSelectedDelivery}
              onShowNewDeliveryDialog={() => setShowNewDeliveryDialog(true)} onShowWindowStatsDialog={() => setShowWindowStatsDialog(true)}
              onShowBulkUpdateDatesDialog={() => setShowBulkUpdateDatesDialog(true)} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['deliveries-calendar-batch'] })}
            />
            <UnassignedOrdersPanel
              unassignedOrders={unassignedOrders} deliveries={deliveries} selectedDelivery={selectedDelivery} selectedOrderIds={selection.selectedOrderIds}
              rightPanelCollapsed={selection.rightPanelCollapsed} onToggleOrderSelection={selection.toggleOrderSelection} onClearSelection={selection.clearSelection}
              onViewOrder={(id, num) => { setSelectedOrderId(id); setSelectedOrderNumber(num); }}
              onAddOrderToDelivery={(d, o) => {
                // P1-3: Find order to get orderNumber for variant check
                const order = unassignedOrders.find(ord => ord.id === o);
                if (!order) {
                  actions.addOrderToDeliveryMutation.mutate({ deliveryId: d, orderId: o });
                  return;
                }
                variantCheckWrapper.addOrderWithVariantCheck(d, o, order.orderNumber);
              }}
              onSetRightPanelCollapsed={selection.setRightPanelCollapsed}
            />
          </div>
        )}

        {/* Dialogs */}
        <DeliveryDetailsDialog delivery={selectedDelivery} onClose={() => setSelectedDelivery(null)} onDelete={setDeliveryToDelete}
          onShowCompleteDialog={() => setShowCompleteDialog(true)} onShowAddItemDialog={() => setShowAddItemDialog(true)}
          onViewOrder={(id, num) => { setSelectedOrderId(id); setSelectedOrderNumber(num); }}
          onRemoveOrder={(d, o) => actions.removeOrderFromDeliveryMutation.mutate({ deliveryId: d, orderId: o })}
          onMoveOrder={(s, t, o) => actions.moveOrderBetweenDeliveriesMutation.mutate({ sourceDeliveryId: s, targetDeliveryId: t, orderId: o })}
          onDeleteItem={(d, i) => actions.deleteItemMutation.mutate({ deliveryId: d, itemId: i })}
          downloadProtocol={downloadProtocol} isDownloading={isDownloading} availableDeliveries={deliveries}
        />

        <DestructiveDeleteDeliveryDialog delivery={deliveryToDelete} onClose={() => setDeliveryToDelete(null)}
          onConfirm={(id) => actions.deleteDeliveryMutation.mutate(id)} isPending={actions.deleteDeliveryMutation.isPending}
        />

        <AddItemDialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog} newItem={newItem} setNewItem={setNewItem}
          onSubmit={() => { if (selectedDelivery && newItem.description) { actions.addItemMutation.mutate({ deliveryId: selectedDelivery.id, ...newItem }); setShowAddItemDialog(false); setNewItem({ itemType: 'glass', description: '', quantity: 1 }); } }}
          isPending={actions.addItemMutation.isPending}
        />

        <CompleteOrdersDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog} productionDate={productionDate} setProductionDate={setProductionDate}
          onSubmit={() => { if (selectedDelivery && productionDate) actions.completeOrdersMutation.mutate({ deliveryId: selectedDelivery.id, productionDate }); }}
          isPending={actions.completeOrdersMutation.isPending}
        />

        <WindowStatsDialog open={showWindowStatsDialog} onOpenChange={setShowWindowStatsDialog} />
        <BulkUpdateDatesDialog open={showBulkUpdateDatesDialog} onOpenChange={setShowBulkUpdateDatesDialog} />
        <OrderDetailModal orderId={selectedOrderId} orderNumber={selectedOrderNumber || undefined} open={!!selectedOrderId}
          onOpenChange={(open) => { if (!open) { setSelectedOrderId(null); setSelectedOrderNumber(null); } }}
        />

        {/* P1-3: Variant type selection dialog */}
        <VariantTypeSelectionDialog
          open={variantCheckWrapper.variantDialog.state?.open ?? false}
          onOpenChange={variantCheckWrapper.variantDialog.onClose}
          orderNumber={variantCheckWrapper.variantDialog.state?.orderNumber ?? ''}
          conflictingOrderNumber={variantCheckWrapper.variantDialog.state?.conflictingOrderNumber ?? ''}
          originalDelivery={variantCheckWrapper.variantDialog.state?.originalDelivery ?? { deliveryId: 0, deliveryNumber: '' }}
          targetDeliveryId={variantCheckWrapper.variantDialog.state?.targetDeliveryId ?? 0}
          onConfirm={variantCheckWrapper.variantDialog.onConfirm}
          isLoading={variantCheckWrapper.variantDialog.isLoading}
        />
      </div>
      <DragOverlay>
        {selection.activeDragItem && <OrderDragOverlay orderNumber={selection.activeDragItem.orderNumber} selectedCount={selection.selectedOrderIds.has(selection.activeDragItem.orderId) ? selection.selectedOrderIds.size : 1} />}
      </DragOverlay>
    </DndContext>
  );
}
