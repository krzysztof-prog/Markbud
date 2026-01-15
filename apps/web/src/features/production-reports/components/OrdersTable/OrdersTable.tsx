'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OrderRow } from './OrderRow';
import { DeliveryGroup } from './DeliveryGroup';
import type {
  ProductionReportItem,
  UpdateReportItemInput,
  UpdateInvoiceInput,
} from '../../types';

interface OrderData {
  id: number;
  orderNumber: string;
  client: string;
  totalWindows: number;
  totalSashes: number;
  valuePln: number | null;
  valueEur: number | null;
  deliveryId: number | null;
  deliveryName?: string;
  productionDate?: string | null;
}

interface OrdersTableProps {
  orders: OrderData[];
  items: ProductionReportItem[];
  canEditQuantities: boolean;
  canEditInvoice: boolean;
  onUpdateItem: (orderId: number, data: UpdateReportItemInput) => void;
  onUpdateInvoice: (orderId: number, data: UpdateInvoiceInput) => void;
  isPending?: boolean;
}

export const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  items,
  canEditQuantities,
  canEditInvoice,
  onUpdateItem,
  onUpdateInvoice,
  isPending = false,
}) => {
  // Stan rozwinięcia grup dostaw AKROBUD
  const [expandedDeliveries, setExpandedDeliveries] = useState<Set<number>>(new Set());

  // Podziel zamówienia na grupy: AKROBUD (pogrupowane po dostawie) i RESZTA
  const { akrobudGroups, restaOrders } = useMemo(() => {
    const akrobud: Map<number, OrderData[]> = new Map();
    const resta: OrderData[] = [];

    for (const order of orders) {
      // Sprawdź czy to AKROBUD (po nazwie klienta - bezpieczne sprawdzenie)
      const clientName = order.client || '';
      const isAkrobud = clientName.toUpperCase().includes('AKROBUD');

      if (isAkrobud && order.deliveryId) {
        const existing = akrobud.get(order.deliveryId) || [];
        existing.push(order);
        akrobud.set(order.deliveryId, existing);
      } else {
        resta.push(order);
      }
    }

    return { akrobudGroups: akrobud, restaOrders: resta };
  }, [orders]);

  // Mapuj items do orderId dla szybkiego dostępu
  const itemsByOrderId = useMemo(() => {
    const map = new Map<number, ProductionReportItem>();
    for (const item of items) {
      map.set(item.orderId, item);
    }
    return map;
  }, [items]);

  // Toggle grupy dostaw
  const toggleDelivery = (deliveryId: number) => {
    setExpandedDeliveries((prev) => {
      const next = new Set(prev);
      if (next.has(deliveryId)) {
        next.delete(deliveryId);
      } else {
        next.add(deliveryId);
      }
      return next;
    });
  };

  // Rozwiń/zwiń wszystkie
  const expandAll = () => {
    const allIds = Array.from(akrobudGroups.keys());
    setExpandedDeliveries(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedDeliveries(new Set());
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Zlecenia ({orders.length})
          </CardTitle>
          {akrobudGroups.size > 0 && (
            <div className="flex gap-2 text-sm">
              <button
                onClick={expandAll}
                className="text-blue-600 hover:underline"
              >
                Rozwiń wszystkie
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                onClick={collapseAll}
                className="text-blue-600 hover:underline"
              >
                Zwiń wszystkie
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] text-left">Dostawa</TableHead>
                <TableHead className="w-[90px] text-left">Nr prod.</TableHead>
                <TableHead className="text-left">Klient</TableHead>
                <TableHead className="w-[80px] text-center">Data prod.</TableHead>
                <TableHead className="w-[60px] text-center">Okna</TableHead>
                <TableHead className="w-[60px] text-center">Jedn.</TableHead>
                <TableHead className="w-[60px] text-center">Skrzyd.</TableHead>
                <TableHead className="w-[110px] text-right pr-2">PLN</TableHead>
                <TableHead className="w-[110px] text-right pr-2">EUR</TableHead>
                <TableHead className="w-[50px] text-center">RW Ok.</TableHead>
                <TableHead className="w-[50px] text-center">RW Pr.</TableHead>
                <TableHead className="w-[100px] text-center">Nr FV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* AKROBUD - grupowane po dostawach */}
              {Array.from(akrobudGroups.entries()).map(([deliveryId, groupOrders]) => {
                const deliveryName = groupOrders[0]?.deliveryName || `Dostawa #${deliveryId}`;
                const isExpanded = expandedDeliveries.has(deliveryId);

                return (
                  <DeliveryGroup
                    key={`delivery-${deliveryId}`}
                    deliveryName={deliveryName}
                    ordersCount={groupOrders.length}
                    isExpanded={isExpanded}
                    onToggle={() => toggleDelivery(deliveryId)}
                  >
                    {groupOrders.map((order, index) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        item={itemsByOrderId.get(order.id) || null}
                        canEditQuantities={canEditQuantities}
                        canEditInvoice={canEditInvoice}
                        onUpdateItem={onUpdateItem}
                        onUpdateInvoice={onUpdateInvoice}
                        isPending={isPending}
                        isEven={index % 2 === 0}
                      />
                    ))}
                  </DeliveryGroup>
                );
              })}

              {/* RESZTA - bez grupowania */}
              {restaOrders.map((order, index) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  item={itemsByOrderId.get(order.id) || null}
                  canEditQuantities={canEditQuantities}
                  canEditInvoice={canEditInvoice}
                  onUpdateItem={onUpdateItem}
                  onUpdateInvoice={onUpdateInvoice}
                  isPending={isPending}
                  isEven={index % 2 === 0}
                />
              ))}

              {/* Brak zleceń */}
              {orders.length === 0 && (
                <TableRow>
                  <td colSpan={12} className="text-center py-8 text-muted-foreground">
                    Brak zleceń produkcyjnych w wybranym miesiącu
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrdersTable;
