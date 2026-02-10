'use client';

import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { EditableCell } from './EditableCell';
import { CheckboxCell } from './CheckboxCell';
import { Copy } from 'lucide-react';
import type { ProductionReportItem, UpdateReportItemInput, UpdateInvoiceInput } from '../../types';

interface OrderData {
  id: number;
  orderNumber: string;
  client: string;
  project: string | null; // Projekt ze zlecenia
  totalWindows: number;
  totalSashes: number;
  totalGlasses: number | null; // Liczba szkleń
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
  onAutoFillInvoice?: (orderId: number, orderNumber: string, invoiceNumber: string | null) => void; // Auto-fill callback
  isPending?: boolean;
  isEven?: boolean; // zebra striping - co drugi wiersz ciemniejszy
  eurRate?: number; // kurs EUR/PLN do przeliczania Wsp. i Jedn. dla AKROBUD
}

export const OrderRow: React.FC<OrderRowProps> = ({
  order,
  item,
  canEditQuantities,
  canEditInvoice,
  onUpdateItem,
  onUpdateInvoice,
  onAutoFillInvoice,
  isPending = false,
  isEven = false,
  eurRate,
}) => {
  // Wartości do wyświetlenia (override jeśli istnieje, inaczej z Order)
  const displayWindows = item?.overrideWindows ?? order.totalWindows;
  const displayUnits = item?.overrideUnits ?? calculateUnits(order);
  const displaySashes = item?.overrideSashes ?? order.totalSashes;
  const displayValuePln = item?.overrideValuePln ?? order.valuePln;
  const displayValueEur = item?.overrideValueEur ?? order.valueEur; // EUR może mieć override

  // Oblicz szkleń z totalGlasses (wartość domyślna gdy brak override)
  function calculateUnits(ord: OrderData): number {
    return ord.totalGlasses ?? 0;
  }

  // Przelicz Wsp. i Jedn. dla AKROBUD (EUR → PLN po kursie)
  // Dla AKROBUD zarówno valueEur jak i materialValue są w EUR
  const computedCoefficient = (() => {
    if (!item) return '—';
    if (item.isAkrobud && item.valueEur && item.materialValue > 0) {
      // Wsp. = wartość / materiał — obie w EUR, kurs się skraca
      return (item.valueEur / item.materialValue).toFixed(2);
    }
    return item.coefficient;
  })();

  const computedUnitValue = (() => {
    if (!item) return '—';
    if (item.isAkrobud && item.valueEur && eurRate && item.totalGlassQuantity > 0) {
      // Jedn. zł = (wartość EUR - materiał EUR) * kurs / szkła
      return Math.round(((item.valueEur - item.materialValue) * eurRate) / item.totalGlassQuantity).toString();
    }
    return item.unitValue;
  })();

  return (
    <TableRow className={isEven ? '' : 'bg-muted/50'}>
      {/* Dostawa */}
      <TableCell className="text-muted-foreground text-sm">
        {order.deliveryName || '-'}
      </TableCell>

      {/* Nr produkcyjny */}
      <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>

      {/* Projekt */}
      <TableCell className="text-sm max-w-[150px] truncate" title={order.project || '-'}>
        {order.project || '-'}
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

      {/* Szkleń (edytowalne) */}
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

      {/* Wartość materiału (read-only) */}
      <TableCell className="w-[90px] pr-2 text-right text-sm tabular-nums">
        {item?.materialValue !== undefined && item.materialValue > 0
          ? item.materialValue.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '—'}
      </TableCell>

      {/* Współczynnik PLN/materiał (read-only, przeliczony z EUR dla AKROBUD) */}
      <TableCell className="w-[70px] pr-2 text-right text-sm tabular-nums">
        {computedCoefficient}
      </TableCell>

      {/* Jednostka (PLN - materiał) / szkła (read-only, przeliczony z EUR dla AKROBUD) */}
      <TableCell className="w-[70px] pr-2 text-right text-sm tabular-nums">
        {computedUnitValue}
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

      {/* Nr FV (edytowalny przez księgową) + przycisk auto-fill */}
      <TableCell className="w-[130px]">
        <div className="flex items-center gap-1">
          <div className="flex-1">
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
          </div>
          {/* Przycisk auto-fill - pokazuj tylko gdy:
              1. Użytkownik może edytować FV
              2. Zlecenie ma przypisaną dostawę (deliveryId)
              3. Jest callback do auto-fill */}
          {canEditInvoice && order.deliveryId && onAutoFillInvoice && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() =>
                onAutoFillInvoice(order.id, order.orderNumber, item?.invoiceNumber ?? null)
              }
              disabled={isPending}
              title="Uzupełnij Nr FV dla wszystkich zleceń z tej samej dostawy"
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default OrderRow;
