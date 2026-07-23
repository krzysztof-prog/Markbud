'use client';

import React, { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, Play, Loader2, AlertTriangle, Trash2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';
import { deliveriesApi } from '@/features/deliveries/api/deliveriesApi';
import type { WeeklyPlanDelivery, WeeklyPlanOrder, WeeklyPlanNote } from '@/features/deliveries/api/deliveriesApi';
import { getGlassStatusDisplay } from '../utils/glassStatusHelpers';
import { AddOrderInput } from './AddOrderInput';
import { useMarkOrderGlassDelivered } from '@/features/moja-praca/api/mojaPracaApi';

interface DeliveryCardProps {
  delivery: WeeklyPlanDelivery;
  dayDate: string;
  onViewOrder: (id: number, num: string) => void;
}

/** Kolory ramki karty dostawy wg statusu */
function getDeliveryCardClasses(status: string): string {
  switch (status) {
    case 'in_progress':
      return 'border-yellow-300 bg-yellow-50/30';
    case 'completed':
      return 'border-green-300 bg-green-50/30';
    default:
      return 'border-slate-200 bg-white';
  }
}

/** Kolory badge'a statusu dostawy */
function getDeliveryBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'in_progress':
      return { label: 'W trakcie', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    case 'completed':
      return { label: 'Zakończona', className: 'bg-green-100 text-green-800 border-green-300' };
    default:
      return { label: 'Planowana', className: 'bg-blue-100 text-blue-800 border-blue-300' };
  }
}

/** Klasa tła wiersza zlecenia wg statusu */
function getOrderRowClass(orderStatus: string | null): string {
  switch (orderStatus) {
    case 'in_progress':
      return 'bg-yellow-50 border-b border-yellow-100';
    case 'completed':
      return 'bg-green-50 border-b border-green-100';
    default:
      return 'border-b border-slate-50 hover:bg-slate-50';
  }
}

/** Today's date as YYYY-MM-DD in local timezone */
function getTodayStr(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/** Returns true if glass was ordered, not yet fully delivered, and expected date is in the past */
function isGlassConflict(order: WeeklyPlanOrder): boolean {
  const ordered = order.orderedGlassCount || 0;
  const delivered = order.deliveredGlassCount || 0;
  if (ordered === 0 || delivered >= ordered) return false;
  if (!order.glassDeliveryDate) return false;
  const expectedDate = new Date(order.glassDeliveryDate);
  expectedDate.setHours(23, 59, 59, 999);
  return expectedDate < new Date();
}

export function DeliveryCard({ delivery, dayDate, onViewOrder }: DeliveryCardProps) {
  const queryClient = useQueryClient();
  const cardClasses = getDeliveryCardClasses(delivery.status);
  const badge = getDeliveryBadge(delivery.status);

  // Dialog states
  const [conflictDialogOrderId, setConflictDialogOrderId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Notes state
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const noteInputRef = React.useRef<HTMLInputElement>(null);

  // --- Remove order from delivery ---
  const removeOrderMutation = useMutation({
    mutationFn: ({ orderId }: { orderId: number }) =>
      deliveriesApi.removeOrder(delivery.id, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
      showSuccessToast('Zlecenie usunięte z dostawy');
    },
    onError: (err: Error) => showErrorToast(`Błąd: ${err.message}`),
  });

  // --- Start production (planned -> in_progress) ---
  const startProductionMutation = useMutation({
    mutationFn: () =>
      deliveriesApi.startProduction(
        delivery.orders.map((o) => o.orderId),
        [delivery.id]
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
      showSuccessToast('Dodano do produkcji');
    },
    onError: (err: Error) => showErrorToast(`Błąd: ${err.message}`),
  });

  // --- Complete entire delivery ---
  const completeDeliveryMutation = useMutation({
    mutationFn: () => deliveriesApi.completeAllOrders(delivery.id, getTodayStr()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
      showSuccessToast('Dostawa zakończona');
    },
    onError: (err: Error) => showErrorToast(`Błąd: ${err.message}`),
  });

  // --- Complete single order ---
  const completeOrderMutation = useMutation({
    mutationFn: ({ orderId }: { orderId: number }) =>
      deliveriesApi.completeSelectedOrders([orderId], getTodayStr()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
      showSuccessToast('Zlecenie zakończone');
    },
    onError: (err: Error) => showErrorToast(`Błąd: ${err.message}`),
  });

  // --- Add note to delivery ---
  const addNoteMutation = useMutation({
    mutationFn: (description: string) =>
      deliveriesApi.addItem(delivery.id, { itemType: 'note', description, quantity: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
      setNoteText('');
      setShowNoteInput(false);
    },
    onError: (err: Error) => showErrorToast(`Błąd: ${err.message}`),
  });

  // --- Remove note from delivery ---
  const removeNoteMutation = useMutation({
    mutationFn: (itemId: number) => deliveriesApi.deleteItem(delivery.id, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weekly-plan'] }),
    onError: (err: Error) => showErrorToast(`Błąd: ${err.message}`),
  });

  // --- Mark glass as delivered ---
  const markGlassDeliveredMutation = useMarkOrderGlassDelivered();

  // --- Delete entire delivery ---
  const deleteDeliveryMutation = useMutation({
    mutationFn: () => deliveriesApi.delete(delivery.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
      showSuccessToast('Dostawa usunięta');
    },
    onError: (err: Error) => showErrorToast(`Błąd: ${err.message}`),
  });

  const handleRemoveOrder = useCallback(
    (orderId: number) => removeOrderMutation.mutate({ orderId }),
    [removeOrderMutation]
  );

  const handleCompleteOrder = useCallback(
    (orderId: number) => completeOrderMutation.mutate({ orderId }),
    [completeOrderMutation]
  );

  const handleMarkGlassDelivered = useCallback(
    (orderId: number) => {
      markGlassDeliveredMutation.mutate(orderId, {
        onSuccess: () => setConflictDialogOrderId(null),
        onError: (err: Error) => showErrorToast(`Błąd: ${err.message}`),
      });
    },
    [markGlassDeliveredMutation]
  );

  const isAnyMutationPending =
    startProductionMutation.isPending ||
    completeDeliveryMutation.isPending ||
    completeOrderMutation.isPending;

  /** Render the action column cell for an order row */
  function renderOrderAction(order: WeeklyPlanOrder) {
    if (delivery.status === 'planned') {
      return (
        <button
          onClick={() => handleRemoveOrder(order.orderId)}
          disabled={removeOrderMutation.isPending}
          aria-label="Usuń z dostawy"
          className="p-1.5 -m-1.5 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          <X className="h-3 w-3" />
        </button>
      );
    }
    if (order.orderStatus === 'completed') {
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
    }
    if (order.orderStatus === 'in_progress') {
      return (
        <button
          onClick={() => handleCompleteOrder(order.orderId)}
          disabled={completeOrderMutation.isPending}
          aria-label="Zakończ zlecenie"
          className="p-1.5 -m-1.5 text-slate-400 hover:text-green-600 transition-colors disabled:opacity-50"
        >
          {completeOrderMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
        </button>
      );
    }
    return null;
  }

  const conflictOrder = conflictDialogOrderId !== null
    ? delivery.orders.find(o => o.orderId === conflictDialogOrderId)
    : null;

  return (
    <div className={`border rounded-lg shadow-sm ${cardClasses}`}>
      {/* Nagłówek dostawy */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">
          {delivery.deliveryNumber ?? `Dostawa #${delivery.id}`}
        </span>
        <div className="flex items-center gap-1.5">
          {delivery.status === 'planned' && (
            <button
              onClick={() => startProductionMutation.mutate()}
              disabled={isAnyMutationPending}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50"
              title="Dodaj do produkcji"
            >
              {startProductionMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              Produkcja
            </button>
          )}
          {delivery.status === 'in_progress' && (
            <button
              onClick={() => completeDeliveryMutation.mutate()}
              disabled={isAnyMutationPending}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
              title="Zakończ dostawę"
            >
              {completeDeliveryMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Zakończ
            </button>
          )}
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badge.className}`}>
            {badge.label}
          </Badge>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteDeliveryMutation.isPending}
            aria-label="Usuń dostawę"
            className="p-1.5 -m-1.5 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tabela zleceń */}
      {delivery.orders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="px-2 py-1 text-left font-medium">Nr zl.</th>
                <th className="px-1 py-1 text-center font-medium">Szyby</th>
                <th className="px-1 py-1 text-left font-medium">Projekt</th>
                <th className="px-1 py-1 text-center font-medium">Status szyb</th>
                <th className="px-1 py-1 w-6"></th>
              </tr>
            </thead>
            <tbody>
              {delivery.orders.map((order) => {
                const glassStatus = getGlassStatusDisplay(
                  order.totalGlasses,
                  order.orderedGlassCount,
                  order.deliveredGlassCount,
                  order.glassDeliveryDate,
                  order.hasSuffixMatchedGlass
                );
                const rowClass = getOrderRowClass(order.orderStatus);
                const isZam = glassStatus.label.startsWith('Zam.');
                return (
                  <tr key={order.orderId} className={rowClass}>
                    <td className="px-2 py-1">
                      <button
                        onClick={() => onViewOrder(order.orderId, order.orderNumber)}
                        className="font-mono font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {order.orderNumber}
                      </button>
                    </td>
                    <td className="px-1 py-1 text-center font-semibold">
                      {order.totalGlasses || '-'}
                    </td>
                    <td className="px-1 py-1 text-slate-600 truncate max-w-[80px]" title={order.project || ''}>
                      {order.project || '-'}
                    </td>
                    <td className="px-1 py-1 text-center">
                      <div className="inline-flex items-center gap-0.5">
                        {isZam ? (
                          <button
                            onClick={() => handleMarkGlassDelivered(order.orderId)}
                            disabled={markGlassDeliveredMutation.isPending}
                            aria-label="Oznacz szyby jako dostarczone"
                            title="Kliknij, aby oznaczyć szyby jako dostarczone"
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium underline decoration-dotted underline-offset-2 hover:opacity-80 transition-opacity disabled:opacity-50 ${glassStatus.colorClass}`}
                          >
                            {markGlassDeliveredMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              glassStatus.label
                            )}
                          </button>
                        ) : (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${glassStatus.colorClass}`}>
                            {glassStatus.label}
                            {glassStatus.suffixBadge && (
                              <span className="ml-0.5 text-[8px] text-cyan-600" title="Szyby dopasowane do zlecenia z suffixem">~s</span>
                            )}
                          </span>
                        )}
                        {isGlassConflict(order) && (
                          <button
                            onClick={() => setConflictDialogOrderId(order.orderId)}
                            aria-label="Szyby po terminie — kliknij, aby rozwiązać"
                            title="Szyby zamówione ale niedostarczone po terminie"
                            className="p-1 -m-1 text-orange-500 hover:text-orange-700 transition-colors"
                          >
                            <AlertTriangle className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-1 text-center">
                      {renderOrderAction(order)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Notatki tekstowe */}
      {(delivery.notes.length > 0 || showNoteInput) && (
        <div className="px-2 py-1 border-t border-slate-100 space-y-0.5">
          {delivery.notes.map((note: WeeklyPlanNote) => (
            <div key={note.id} className="flex items-center gap-1 text-xs text-slate-700 py-0.5 group">
              <span className="flex-1 truncate" title={note.description}>{note.description}</span>
              <button
                onClick={() => removeNoteMutation.mutate(note.id)}
                disabled={removeNoteMutation.isPending}
                aria-label="Usuń notatkę"
                className="p-1 -m-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {showNoteInput && (
            <div className="flex items-center gap-1 pt-0.5">
              <input
                ref={noteInputRef}
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && noteText.trim()) {
                    e.preventDefault();
                    addNoteMutation.mutate(noteText.trim());
                  }
                  if (e.key === 'Escape') {
                    setShowNoteInput(false);
                    setNoteText('');
                  }
                }}
                placeholder="np. 15 klamek, szyba 425x1200..."
                disabled={addNoteMutation.isPending}
                autoFocus
                className="flex-1 text-xs border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:border-blue-400 disabled:opacity-50"
              />
              {addNoteMutation.isPending && <Loader2 className="h-3 w-3 animate-spin text-slate-400 flex-shrink-0" />}
            </div>
          )}
        </div>
      )}

      {/* Przycisk dodawania notatki */}
      <div className="px-2 py-0.5 flex justify-end border-t border-slate-50">
        <button
          onClick={() => {
            setShowNoteInput(true);
            setTimeout(() => noteInputRef.current?.focus(), 50);
          }}
          className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5 py-0.5"
          title="Dodaj notatkę do dostawy"
        >
          <Plus className="h-3 w-3" />
          Notatka
        </button>
      </div>

      {/* Input dodawania zlecenia */}
      <AddOrderInput deliveryId={delivery.id} />

      {/* Suma */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 rounded-b-lg flex items-center justify-between">
        <span className="text-xs text-slate-500">Razem szyby:</span>
        <span className="text-sm font-bold text-slate-800">{delivery.totalGlassCount}</span>
      </div>

      {/* Glass conflict dialog */}
      <AlertDialog
        open={conflictDialogOrderId !== null}
        onOpenChange={(open) => { if (!open) setConflictDialogOrderId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Szyby dla {conflictOrder?.orderNumber.replace(/-[^-]+$/, '')} przyszły?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Zamówiono: <strong>{conflictOrder?.orderedGlassCount}</strong> szyb,
              dostarczone: <strong>{conflictOrder?.deliveredGlassCount || 0}</strong>.
              Jeśli szyby przyszły bez sufiksu, potwierdź żeby oznaczyć jako dostarczone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nie</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => conflictOrder && handleMarkGlassDelivered(conflictOrder.orderId)}
              disabled={markGlassDeliveredMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {markGlassDeliveredMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Tak, przyszły
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete delivery confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć dostawę?</AlertDialogTitle>
            <AlertDialogDescription>
              {delivery.deliveryNumber ?? `Dostawa #${delivery.id}`} — ta operacja jest nieodwracalna.
              Zlecenia nie zostaną usunięte, tylko odpięte od dostawy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDeliveryMutation.mutate()}
              disabled={deleteDeliveryMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteDeliveryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
