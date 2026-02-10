'use client';

import { useState } from 'react';
import { Eye, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { groszeToPln, centyToEur, type Grosze, type Centy } from '@/lib/money';
import { ReadinessChecklist } from '@/components/ReadinessChecklist';
import {
  aggregateSchucoStatus,
  getSchucoStatusColor,
} from '@/features/orders/helpers/orderHelpers';
import type { SchucoDeliveryLink } from '@/types';

// Typy statusów okuć
type OkucDemandStatus = 'none' | 'no_okuc' | 'imported' | 'has_atypical' | 'pending' | string;

// Helper do renderowania statusu okuć
function getOkucStatusDisplay(status: OkucDemandStatus | null | undefined): { label: string; colorClass: string } {
  switch (status) {
    case 'none':
    case null:
    case undefined:
      return { label: '-', colorClass: 'text-slate-400' };
    case 'no_okuc':
      return { label: 'Bez okuć', colorClass: 'bg-slate-100 text-slate-600' };
    case 'imported':
      return { label: 'OK', colorClass: 'bg-green-100 text-green-700' };
    case 'has_atypical':
      return { label: 'Nietypowe!', colorClass: 'bg-yellow-100 text-yellow-700' };
    case 'pending':
      return { label: 'Oczekuje', colorClass: 'bg-blue-100 text-blue-600' };
    default:
      return { label: status, colorClass: 'bg-slate-100 text-slate-600' };
  }
}

// Helper do renderowania statusu szyb - używa tej samej logiki co OrderTableRow
function getGlassStatusDisplay(
  totalGlasses: number | null | undefined,
  orderedGlassCount: number | null | undefined,
  deliveredGlassCount: number | null | undefined,
  glassDeliveryDate: string | Date | null | undefined
): { label: string; colorClass: string } {
  const ordered = orderedGlassCount || 0;
  const delivered = deliveredGlassCount || 0;
  const total = totalGlasses || 0;

  // Brak szyb w zleceniu
  if (total === 0) {
    return { label: '-', colorClass: 'text-slate-400' };
  }

  // Wszystkie dostarczone (porównuj z totalGlasses - ile szyb potrzebuje zlecenie)
  if (delivered >= total) {
    return { label: 'OK', colorClass: 'bg-green-100 text-green-700' };
  }

  // Częściowo dostarczone (porównuj z totalGlasses)
  if (delivered > 0 && delivered < total) {
    return { label: `${delivered}/${total}`, colorClass: 'bg-yellow-100 text-yellow-700' };
  }

  // Zamówione ale nie dostarczone - pokazujemy "Zam." + datę dostawy jeśli jest
  if (ordered > 0 && glassDeliveryDate) {
    const date = new Date(glassDeliveryDate);
    const formatted = date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
    return { label: `Zam. ${formatted}`, colorClass: 'bg-blue-100 text-blue-700' };
  }

  // Zamówione ale brak daty dostawy - pokazuj "Zam." zamiast mylącego X/Y
  if (ordered > 0) {
    return { label: 'Zam.', colorClass: 'bg-orange-100 text-orange-700' };
  }

  // Nie zamówione
  return { label: 'Brak zam.', colorClass: 'bg-red-100 text-red-700' };
}

// Helper do renderowania statusu profili (Schuco) - używa aggregateSchucoStatus z orderHelpers
function getProfileStatusDisplay(schucoLinks: SchucoDeliveryLink[] | undefined): { label: string; colorClass: string } {
  if (!schucoLinks || schucoLinks.length === 0) {
    return { label: 'Brak', colorClass: 'bg-slate-100 text-slate-500' };
  }

  const status = aggregateSchucoStatus(schucoLinks);
  const colorClass = getSchucoStatusColor(status);

  return { label: status, colorClass };
}

// Typy dla weryfikacji etykiet
type LabelCheckResultStatus = 'OK' | 'MISMATCH' | 'NO_FOLDER' | 'NO_BMP' | 'OCR_ERROR' | string;

interface LabelCheckResultData {
  orderId: number;
  status: LabelCheckResultStatus;
}

interface LabelCheckData {
  id: number;
  status: string;
  results: LabelCheckResultData[];
}

// Helper do renderowania statusu weryfikacji etykiet
function getLabelStatusDisplay(
  orderId: number,
  labelCheck: LabelCheckData | undefined
): { label: string; colorClass: string } {
  if (!labelCheck || labelCheck.status !== 'completed') {
    return { label: '-', colorClass: 'text-slate-400' };
  }

  const result = labelCheck.results.find((r) => r.orderId === orderId);
  if (!result) {
    return { label: '-', colorClass: 'text-slate-400' };
  }

  switch (result.status) {
    case 'OK':
      return { label: 'OK', colorClass: 'bg-green-100 text-green-700' };
    case 'MISMATCH':
      return { label: 'Zła data', colorClass: 'bg-red-100 text-red-700' };
    case 'NO_FOLDER':
    case 'NO_BMP':
      return { label: 'Brak etyket', colorClass: 'bg-orange-100 text-orange-700' };
    case 'OCR_ERROR':
      return { label: 'Błąd!', colorClass: 'bg-red-100 text-red-700' };
    default:
      return { label: result.status, colorClass: 'bg-slate-100 text-slate-600' };
  }
}

interface DeliveryDetailsProps {
  delivery: {
    id: number;
    status?: string;
    notes?: string | null;
    deliveryOrders?: Array<{
      orderId?: number;
      order: {
        id: number;
        orderNumber: string;
        status?: string; // Status zlecenia (new, in_progress, completed, archived)
        totalWindows?: number | null;
        totalSashes?: number | null;
        totalGlasses?: number | null;
        valuePln?: string | number | null;
        valueEur?: string | number | null;
        // Statusy
        okucDemandStatus?: OkucDemandStatus | null;
        glassDeliveryDate?: string | Date | null;
        // Nowe pola do wyświetlania statusu szyb (używane zamiast glassDeliveryDate)
        orderedGlassCount?: number | null;
        deliveredGlassCount?: number | null;
        // Powiązania ze Schuco - pełne dane do wyświetlenia statusu
        schucoLinks?: SchucoDeliveryLink[];
        windows?: Array<{
          reference: string | null;
        }>;
      };
    }>;
    deliveryItems?: Array<{
      id: number;
      itemType: string;
      description: string;
      quantity: number;
    }>;
    // Weryfikacja etykiet
    labelChecks?: LabelCheckData[];
  };
  onViewOrder?: (orderId: number) => void;
  onRemoveOrder?: (deliveryId: number, orderId: number) => void;
  isRemovingOrder?: boolean; // Czy trwa usuwanie zlecenia (dla disabled state)
}

export default function DeliveryDetails({
  delivery,
  onViewOrder,
  onRemoveOrder,
  isRemovingOrder = false,
}: DeliveryDetailsProps) {
  // State dla dialogu potwierdzenia usunięcia
  const [orderToRemove, setOrderToRemove] = useState<{
    orderId: number;
    orderNumber: string;
    isCompleted: boolean;
  } | null>(null);

  const hasOrders =
    delivery.deliveryOrders && delivery.deliveryOrders.length > 0;
  const hasItems =
    delivery.deliveryItems && delivery.deliveryItems.length > 0;
  const hasNotes = delivery.notes && delivery.notes.trim().length > 0;

  // Pokazuj checklist tylko dla dostaw które nie zostały jeszcze wysłane
  const showReadinessChecklist = delivery.status && !['shipped', 'in_transit', 'delivered'].includes(delivery.status);

  // Handler potwierdzenia usunięcia
  const handleConfirmRemove = () => {
    if (orderToRemove && onRemoveOrder) {
      onRemoveOrder(delivery.id, orderToRemove.orderId);
      setOrderToRemove(null);
    }
  };

  return (
    <div className="p-4 bg-slate-50 rounded-lg space-y-4">
      {/* P1-R4: System Brain - Shipping Readiness Checklist */}
      {showReadinessChecklist && (
        <ReadinessChecklist
          type="shipping"
          entityId={delivery.id}
          className="mb-2"
        />
      )}

      {/* Orders Section */}
      {hasOrders && delivery.deliveryOrders && (
        <div>
          <h3 className="font-semibold text-sm mb-2">
            📦 Zlecenia ({delivery.deliveryOrders.length})
          </h3>
          <div className="space-y-2">
            {delivery.deliveryOrders.map(({ order }) => {
              // Extract unique non-null references
              const references = order.windows
                ?.map((w) => w.reference)
                .filter((ref): ref is string => ref !== null && ref.trim() !== '') ?? [];
              const uniqueReferences = [...new Set(references)];

              // Pobierz statusy
              const okucStatus = getOkucStatusDisplay(order.okucDemandStatus);
              const glassStatus = getGlassStatusDisplay(
                order.totalGlasses,
                order.orderedGlassCount,
                order.deliveredGlassCount,
                order.glassDeliveryDate
              );
              const profileStatus = getProfileStatusDisplay(order.schucoLinks);
              // Ostatni wynik weryfikacji etykiet (jeśli istnieje)
              const latestLabelCheck = delivery.labelChecks?.[0];
              const labelStatus = getLabelStatusDisplay(order.id, latestLabelCheck);

              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-2 bg-white rounded border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Badge variant="secondary">{order.orderNumber}</Badge>
                    {uniqueReferences.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {uniqueReferences.map((ref) => (
                          <Badge key={ref} variant="outline" className="text-xs">
                            {ref}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-slate-600">
                      O:{order.totalWindows ?? 0} S:{order.totalSashes ?? 0} Sz:
                      {order.totalGlasses ?? 0}
                    </span>
                  </div>

                  {/* Kolumny statusów - stała szerokość dla wyrównania */}
                  <div className="flex items-center gap-2">
                    {/* Szyby */}
                    <div className="flex flex-col items-center w-[78px]" title="Status szyb">
                      <span className="text-[10px] text-slate-400 uppercase">Szyby</span>
                      <span className={`inline-flex items-center justify-center w-full px-1.5 py-0.5 rounded text-xs font-medium ${glassStatus.colorClass}`}>
                        {glassStatus.label}
                      </span>
                    </div>

                    {/* Okucia */}
                    <div className="flex flex-col items-center w-[78px]" title="Status okuć">
                      <span className="text-[10px] text-slate-400 uppercase">Okucia</span>
                      <span className={`inline-flex items-center justify-center w-full px-1.5 py-0.5 rounded text-xs font-medium ${okucStatus.colorClass}`}>
                        {okucStatus.label}
                      </span>
                    </div>

                    {/* Profile */}
                    <div className="flex flex-col items-center w-[78px]" title="Status profili Schuco">
                      <span className="text-[10px] text-slate-400 uppercase">Profile</span>
                      <span className={`inline-flex items-center justify-center w-full px-1.5 py-0.5 rounded text-xs font-medium ${profileStatus.colorClass}`}>
                        {profileStatus.label}
                      </span>
                    </div>

                    {/* Etykiety */}
                    <div className="flex flex-col items-center w-[78px]" title="Status weryfikacji etykiet">
                      <span className="text-[10px] text-slate-400 uppercase">Etykiety</span>
                      <span className={`inline-flex items-center justify-center w-full px-1.5 py-0.5 rounded text-xs font-medium ${labelStatus.colorClass}`}>
                        {labelStatus.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-3">
                    <div className="text-xs text-right min-w-[110px]">
                      <div className="font-medium">
                        {/* valuePln jest w groszach - konwertuj na PLN */}
                        {order.valuePln
                          ? groszeToPln(
                              (typeof order.valuePln === 'number'
                                ? order.valuePln
                                : parseInt(String(order.valuePln), 10)) as Grosze
                            ).toLocaleString('pl-PL', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '0,00'}{' '}
                        PLN
                      </div>
                      <div className="text-slate-500">
                        {/* valueEur jest w centach - konwertuj na EUR */}
                        {order.valueEur
                          ? centyToEur(
                              (typeof order.valueEur === 'number'
                                ? order.valueEur
                                : parseInt(String(order.valueEur), 10)) as Centy
                            ).toLocaleString('pl-PL', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '0,00'}{' '}
                        EUR
                      </div>
                    </div>

                    {onViewOrder && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewOrder(order.id)}
                        title="Pokaż szczegóły zlecenia"
                        aria-label="View order details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Przycisk usuwania zlecenia z dostawy */}
                    {onRemoveOrder && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setOrderToRemove({
                          orderId: order.id,
                          orderNumber: order.orderNumber,
                          isCompleted: order.status === 'completed',
                        })}
                        disabled={isRemovingOrder}
                        title="Usuń zlecenie z dostawy"
                        aria-label="Remove order from delivery"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog potwierdzenia usunięcia zlecenia z dostawy */}
      <AlertDialog open={!!orderToRemove} onOpenChange={(open) => !open && setOrderToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć zlecenie z dostawy?</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToRemove?.isCompleted ? (
                <>
                  <span className="text-orange-600 font-medium">
                    Uwaga: Zlecenie {orderToRemove.orderNumber} jest zakończone (wyprodukowane).
                  </span>
                  <br />
                  Usunięcie z dostawy spowoduje cofnięcie RW okuć i zmianę statusu zlecenia na &quot;nowe&quot;.
                </>
              ) : (
                <>
                  Czy na pewno chcesz usunąć zlecenie <strong>{orderToRemove?.orderNumber}</strong> z tej dostawy?
                  <br />
                  Zlecenie wróci do puli nieprzypisanych.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingOrder}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isRemovingOrder}
              className={orderToRemove?.isCompleted ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isRemovingOrder ? 'Usuwanie...' : 'Usuń z dostawy'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Additional Items Section */}
      {hasItems && delivery.deliveryItems && (
        <div>
          <h3 className="font-semibold text-sm mb-2">
            📦 Dodatkowe artykuły ({delivery.deliveryItems.length})
          </h3>
          <div className="space-y-2">
            {delivery.deliveryItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-white rounded border"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Badge variant="outline">{item.itemType}</Badge>
                  <span className="text-xs text-slate-600">
                    {item.quantity}x {item.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes Section */}
      {hasNotes && (
        <div>
          <h3 className="font-semibold text-sm mb-2">📝 Notatki</h3>
          <div className="p-2 bg-white rounded border text-xs whitespace-pre-wrap text-slate-700">
            {delivery.notes}
          </div>
        </div>
      )}
    </div>
  );
}
