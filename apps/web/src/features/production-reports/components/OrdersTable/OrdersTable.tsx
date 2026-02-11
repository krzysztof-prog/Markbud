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
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
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
  project: string | null; // Projekt ze zlecenia
  totalWindows: number;
  totalSashes: number;
  totalGlasses: number | null; // Liczba szkleń
  valuePln: number | null;
  valueEur: number | null;
  deliveryId: number | null;
  deliveryName?: string;
  productionDate?: string | null;
  specialType?: string | null; // Typ specjalny (nietypówka)
}

interface OrdersTableProps {
  orders: OrderData[];
  items: ProductionReportItem[];
  canEditQuantities: boolean;
  canEditInvoice: boolean;
  onUpdateItem: (orderId: number, data: UpdateReportItemInput) => void;
  onUpdateInvoice: (orderId: number, data: UpdateInvoiceInput) => void;
  onAutoFillInvoice?: (orderId: number, orderNumber: string, invoiceNumber: string | null) => void;
  isPending?: boolean;
  eurRate?: number; // kurs EUR/PLN do przeliczania Wsp. i Jedn. dla AKROBUD
}

export const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  items,
  canEditQuantities,
  canEditInvoice,
  onUpdateItem,
  onUpdateInvoice,
  onAutoFillInvoice,
  isPending = false,
  eurRate,
}) => {
  // Stan rozwinięcia grup dostaw AKROBUD
  const [expandedDeliveries, setExpandedDeliveries] = useState<Set<number>>(new Set());

  // Podziel zamówienia na grupy: AKROBUD, RESZTA i NIETYPÓWKI
  const { akrobudGroups, restaOrders, nietypowkiOrders } = useMemo(() => {
    const akrobud: Map<number, OrderData[]> = new Map();
    const resta: OrderData[] = [];
    const nietypowki: OrderData[] = [];

    for (const order of orders) {
      // Zlecenia z specialType → osobna sekcja NIETYPÓWKI
      if (order.specialType) {
        nietypowki.push(order);
        continue;
      }

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

    return { akrobudGroups: akrobud, restaOrders: resta, nietypowkiOrders: nietypowki };
  }, [orders]);

  // Mapuj items do orderId dla szybkiego dostępu
  const itemsByOrderId = useMemo(() => {
    const map = new Map<number, ProductionReportItem>();
    for (const item of items) {
      map.set(item.orderId, item);
    }
    return map;
  }, [items]);

  // Oblicz ostrzeżenia dla zleceń (współczynnik poza zakresem, brak wartości/materiału)
  const { flaggedOrders, warningsByOrderId } = useMemo(() => {
    const flagged: Array<{ orderId: number; orderNumber: string; warnings: string[] }> = [];
    const warnMap = new Map<number, string[]>();

    for (const order of orders) {
      const item = itemsByOrderId.get(order.id) || null;
      const warnings: string[] = [];

      // Sprawdź współczynnik
      let coeffNum: number | null = null;
      if (item) {
        if (item.isAkrobud && item.valueEur && item.materialValue > 0) {
          // Dla AKROBUD: wartość EUR / materiał EUR
          coeffNum = item.valueEur / item.materialValue;
        } else if (item.coefficient && item.coefficient !== '—') {
          const parsed = parseFloat(item.coefficient);
          if (!isNaN(parsed)) coeffNum = parsed;
        }
      }

      if (coeffNum !== null) {
        if (coeffNum < 1.4) {
          warnings.push(`Wsp. ${coeffNum.toFixed(2)} < 1.4`);
        } else if (coeffNum > 2) {
          warnings.push(`Wsp. ${coeffNum.toFixed(2)} > 2.0`);
        }
      }

      // Sprawdź brak wartości (PLN i EUR)
      const effectiveValuePln = item?.overrideValuePln ?? order.valuePln;
      const effectiveValueEur = item?.overrideValueEur ?? order.valueEur;
      if ((!effectiveValuePln || effectiveValuePln === 0) && (!effectiveValueEur || effectiveValueEur === 0)) {
        warnings.push('Brak wartości');
      }

      // Sprawdź brak materiału
      if (!item?.materialValue || item.materialValue <= 0) {
        warnings.push('Brak materiału');
      }

      if (warnings.length > 0) {
        flagged.push({ orderId: order.id, orderNumber: order.orderNumber, warnings });
        warnMap.set(order.id, warnings);
      }
    }

    return { flaggedOrders: flagged, warningsByOrderId: warnMap };
  }, [orders, itemsByOrderId]);

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

      {/* Link do strony "Do sprawdzenia" */}
      {flaggedOrders.length > 0 && (
        <div className="mx-4 mb-3">
          <Link
            href="/zestawienia/do-sprawdzenia"
            className="flex items-center gap-2 text-amber-700 hover:text-amber-900 hover:underline text-sm p-2 rounded-lg bg-amber-50 border border-amber-200"
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Zlecenia do sprawdzenia ({flaggedOrders.length})</span>
          </Link>
        </div>
      )}

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] text-left">Dostawa</TableHead>
                <TableHead className="w-[90px] text-left">Nr prod.</TableHead>
                <TableHead className="text-left">Projekt</TableHead>
                <TableHead className="w-[80px] text-center">Data prod.</TableHead>
                <TableHead className="w-[60px] text-center">Okna</TableHead>
                <TableHead className="w-[60px] text-center">Szkleń</TableHead>
                <TableHead className="w-[60px] text-center">Skrzyd.</TableHead>
                <TableHead className="w-[110px] text-right pr-2">PLN</TableHead>
                <TableHead className="w-[110px] text-right pr-2">EUR</TableHead>
                <TableHead className="w-[90px] text-right pr-2" title="Wartość materiału">Materiał</TableHead>
                <TableHead className="w-[70px] text-right pr-2" title="Współczynnik PLN/materiał">Wsp.</TableHead>
                <TableHead className="w-[70px] text-right pr-2" title="(PLN - materiał) / szkła">Jedn. zł</TableHead>
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
                        onAutoFillInvoice={onAutoFillInvoice}
                        isPending={isPending}
                        isEven={index % 2 === 0}
                        eurRate={eurRate}
                        warnings={warningsByOrderId.get(order.id)}
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
                  onAutoFillInvoice={onAutoFillInvoice}
                  isPending={isPending}
                  isEven={index % 2 === 0}
                  eurRate={eurRate}
                  warnings={warningsByOrderId.get(order.id)}
                />
              ))}

              {/* NIETYPÓWKI - zlecenia z specialType */}
              {nietypowkiOrders.length > 0 && (
                <>
                  <TableRow>
                    <td
                      colSpan={15}
                      className="bg-amber-50 border-y border-amber-200 px-4 py-2 font-semibold text-amber-800 text-sm"
                    >
                      NIETYPÓWKI ({nietypowkiOrders.length})
                      <span className="ml-2 font-normal text-amber-600">
                        {(() => {
                          const typeLabels: Record<string, string> = { drzwi: 'Drzwi', psk: 'PSK', hs: 'HS', ksztalt: 'Kształt' };
                          const typeCounts: Record<string, number> = {};
                          for (const o of nietypowkiOrders) {
                            if (o.specialType) {
                              typeCounts[o.specialType] = (typeCounts[o.specialType] || 0) + 1;
                            }
                          }
                          return Object.entries(typeCounts)
                            .map(([type, count]) => `${typeLabels[type] || type}: ${count}`)
                            .join(', ');
                        })()}
                      </span>
                    </td>
                  </TableRow>
                  {nietypowkiOrders.map((order, index) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      item={itemsByOrderId.get(order.id) || null}
                      canEditQuantities={canEditQuantities}
                      canEditInvoice={canEditInvoice}
                      onUpdateItem={onUpdateItem}
                      onUpdateInvoice={onUpdateInvoice}
                      onAutoFillInvoice={onAutoFillInvoice}
                      isPending={isPending}
                      isEven={index % 2 === 0}
                      eurRate={eurRate}
                      warnings={warningsByOrderId.get(order.id)}
                    />
                  ))}
                </>
              )}

              {/* Brak zleceń */}
              {orders.length === 0 && (
                <TableRow>
                  <td colSpan={15} className="text-center py-8 text-muted-foreground">
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
