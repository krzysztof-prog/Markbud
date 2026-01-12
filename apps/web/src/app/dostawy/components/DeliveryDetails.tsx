'use client';

import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { groszeToPln, centyToEur, type Grosze, type Centy } from '@/lib/money';
import { ReadinessChecklist } from '@/components/ReadinessChecklist';

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
        totalWindows?: number | null;
        totalSashes?: number | null;
        totalGlasses?: number | null;
        valuePln?: string | number | null;
        valueEur?: string | number | null;
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
  };
  onViewOrder?: (orderId: number) => void;
}

export default function DeliveryDetails({
  delivery,
  onViewOrder,
}: DeliveryDetailsProps) {
  const hasOrders =
    delivery.deliveryOrders && delivery.deliveryOrders.length > 0;
  const hasItems =
    delivery.deliveryItems && delivery.deliveryItems.length > 0;
  const hasNotes = delivery.notes && delivery.notes.trim().length > 0;

  // Pokazuj checklist tylko dla dostaw które nie zostały jeszcze wysłane
  const showReadinessChecklist = delivery.status && !['shipped', 'in_transit', 'delivered'].includes(delivery.status);

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

                  <div className="flex items-center gap-3">
                    <div className="text-xs text-right">
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
