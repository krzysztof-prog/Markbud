'use client';

import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { EditableCell } from './EditableCell';
import { CheckboxCell } from './CheckboxCell';
import type { ProductionReportItem, UpdateReportItemInput, UpdateInvoiceInput } from '../../types';

interface OrderData {
  id: number;
  orderNumber: string;
  client: string;
  totalWindows: number;
  totalSashes: number;
  valuePln: number | null; // w groszach
  valueEur: number | null; // w centach
  deliveryId: number | null;
  deliveryName?: string;
  productionDate?: string | null;
}

interface OrderRowProps {
  order: OrderData;
  item: ProductionReportItem | null;
  canEditQuantities: boolean; // kierownik może edytować ilości
  canEditInvoice: boolean; // księgowa może edytować FV
  onUpdateItem: (orderId: number, data: UpdateReportItemInput) => void;
  onUpdateInvoice: (orderId: number, data: UpdateInvoiceInput) => void;
  isPending?: boolean;
  isEven?: boolean; // zebra striping - co drugi wiersz ciemniejszy
}

export const OrderRow: React.FC<OrderRowProps> = ({
  order,
  item,
  canEditQuantities,
  canEditInvoice,
  onUpdateItem,
  onUpdateInvoice,
  isPending = false,
  isEven = false,
}) => {
  // Wartości do wyświetlenia (override jeśli istnieje, inaczej z Order)
  const displayWindows = item?.overrideWindows ?? order.totalWindows;
  const displayUnits = item?.overrideUnits ?? calculateUnits(order);
  const displaySashes = item?.overrideSashes ?? order.totalSashes;
  const displayValuePln = item?.overrideValuePln ?? order.valuePln;
  const displayValueEur = item?.overrideValueEur ?? order.valueEur; // EUR może mieć override

  // Oblicz jednostki z okien (jeśli nie ma override)
  function calculateUnits(ord: OrderData): number {
    // Domyślnie jednostki = okna (może być nadpisane)
    return ord.totalWindows;
  }

  return (
    <TableRow className={isEven ? '' : 'bg-muted/50'}>
      {/* Dostawa */}
      <TableCell className="text-muted-foreground text-sm">
        {order.deliveryName || '-'}
      </TableCell>

      {/* Nr produkcyjny */}
      <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>

      {/* Klient */}
      <TableCell className="text-sm max-w-[150px] truncate" title={order.client || '-'}>
        {order.client || '-'}
      </TableCell>

      {/* Data produkcji */}
      <TableCell className="text-sm text-center text-muted-foreground">
        {order.productionDate
          ? new Date(order.productionDate).toLocaleDateString('pl-PL')
          : '-'}
      </TableCell>

      {/* Okna (edytowalne) */}
      <TableCell className="w-[60px]">
        <EditableCell
          value={displayWindows}
          type="number"
          onChange={(val) =>
            onUpdateItem(order.id, { overrideWindows: val as number | null })
          }
          disabled={!canEditQuantities}
          isPending={isPending}
          align="center"
        />
      </TableCell>

      {/* Jednostki (edytowalne) */}
      <TableCell className="w-[60px]">
        <EditableCell
          value={displayUnits}
          type="number"
          onChange={(val) =>
            onUpdateItem(order.id, { overrideUnits: val as number | null })
          }
          disabled={!canEditQuantities}
          isPending={isPending}
          align="center"
        />
      </TableCell>

      {/* Skrzydła (edytowalne) */}
      <TableCell className="w-[60px]">
        <EditableCell
          value={displaySashes}
          type="number"
          onChange={(val) =>
            onUpdateItem(order.id, { overrideSashes: val as number | null })
          }
          disabled={!canEditQuantities}
          isPending={isPending}
          align="center"
        />
      </TableCell>

      {/* Wartość PLN (edytowalna, w groszach) */}
      <TableCell className="w-[110px] pr-2">
        <EditableCell
          value={displayValuePln}
          type="number"
          isMoneyGrosze={true}
          onChange={(val) =>
            onUpdateItem(order.id, { overrideValuePln: val as number | null })
          }
          disabled={!canEditQuantities}
          isPending={isPending}
          align="right"
        />
      </TableCell>

      {/* Wartość EUR (edytowalna, w centach) */}
      <TableCell className="w-[110px] pr-2">
        <EditableCell
          value={displayValueEur}
          type="number"
          isMoneyGrosze={true}
          onChange={(val) =>
            onUpdateItem(order.id, { overrideValueEur: val as number | null })
          }
          disabled={!canEditQuantities}
          isPending={isPending}
          align="right"
        />
      </TableCell>

      {/* RW Okucia */}
      <TableCell className="w-[50px] text-center">
        <CheckboxCell
          checked={item?.rwOkucia ?? false}
          onChange={(checked) => onUpdateItem(order.id, { rwOkucia: checked })}
          disabled={!canEditQuantities}
          isPending={isPending}
          label="RW Okucia"
        />
      </TableCell>

      {/* RW Profile */}
      <TableCell className="w-[50px] text-center">
        <CheckboxCell
          checked={item?.rwProfile ?? false}
          onChange={(checked) => onUpdateItem(order.id, { rwProfile: checked })}
          disabled={!canEditQuantities}
          isPending={isPending}
          label="RW Profile"
        />
      </TableCell>

      {/* Nr FV (edytowalny przez księgową) */}
      <TableCell className="w-[100px]">
        <EditableCell
          value={item?.invoiceNumber ?? null}
          type="text"
          onChange={(val) =>
            onUpdateInvoice(order.id, { invoiceNumber: val as string | null })
          }
          disabled={!canEditInvoice}
          isPending={isPending}
          placeholder="—"
          align="center"
        />
      </TableCell>
    </TableRow>
  );
};

export default OrderRow;
