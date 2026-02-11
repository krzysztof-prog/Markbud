'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle, Paintbrush } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MonthSelector } from './MonthSelector';
import { EditableCell } from './OrdersTable/EditableCell';
import {
  useProductionReport,
  useUpdateReportItem,
} from '../hooks';
import { getEffectivePermissions, mapBackendRole } from '../helpers/permissions';
import type {
  ProductionReportItem,
  OrderData,
  UpdateReportItemInput,
  UserRole,
} from '../types';

interface FlaggedOrdersPageProps {
  userRole?: string;
}

export const FlaggedOrdersPage: React.FC<FlaggedOrdersPageProps> = ({
  userRole = 'user',
}) => {
  const { toast } = useToast();

  // Aktualny rok i miesiąc
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Kurs EUR/PLN
  const DEFAULT_EUR_RATE = 4.30;

  // Pobierz dane raportu
  const {
    data: report,
    isLoading,
    error: reportError,
  } = useProductionReport(year, month);

  // Mutacja do aktualizacji pozycji
  const updateItemMutation = useUpdateReportItem();

  // Oblicz uprawnienia
  const role = mapBackendRole(userRole || 'user') as UserRole;
  const monthStatus = report?.status || 'open';
  const permissions = useMemo(
    () => getEffectivePermissions(role, monthStatus as 'open' | 'closed'),
    [role, monthStatus]
  );

  // Handler zmiany miesiąca
  const handleMonthChange = useCallback((newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  }, []);

  // Handler aktualizacji pozycji
  const handleUpdateItem = useCallback(
    (orderId: number, data: UpdateReportItemInput) => {
      updateItemMutation.mutate(
        { year, month, orderId, data },
        {
          onError: (error) => {
            toast({
              title: 'Błąd',
              description: error instanceof Error ? error.message : 'Nie udało się zapisać zmian',
              variant: 'destructive',
            });
          },
        }
      );
    },
    [year, month, updateItemMutation, toast]
  );

  const isPending = updateItemMutation.isPending;

  // Mapuj items do orderId
  const itemsByOrderId = useMemo(() => {
    const map = new Map<number, ProductionReportItem>();
    if (report?.items) {
      for (const item of report.items) {
        map.set(item.orderId, item);
      }
    }
    return map;
  }, [report?.items]);

  // Oblicz flagowane zlecenia (te same kryteria co OrdersTable)
  const flaggedOrders = useMemo(() => {
    if (!report?.orders) return [];

    const result: Array<{
      order: OrderData;
      item: ProductionReportItem | null;
      warnings: string[];
    }> = [];

    for (const order of report.orders) {
      const item = itemsByOrderId.get(order.id) || null;
      const warnings: string[] = [];

      // Sprawdź współczynnik
      let coeffNum: number | null = null;
      if (item) {
        if (item.isAkrobud && item.valueEur && item.materialValue > 0) {
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
        result.push({ order, item, warnings });
      }
    }

    return result;
  }, [report?.orders, itemsByOrderId]);

  // Błąd
  if (reportError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <h3 className="font-semibold">Błąd ładowania raportu</h3>
          <p className="text-sm mt-1">
            {reportError instanceof Error ? reportError.message : 'Nieznany błąd'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Nagłówek z selektorem miesiąca */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Zlecenia do sprawdzenia</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Zlecenia z brakującymi danymi lub współczynnikiem poza zakresem 1.4–2.0
          </p>
        </div>

        <MonthSelector
          year={year}
          month={month}
          status={(report?.status as 'open' | 'closed') || 'open'}
          editedAfterClose={report?.editedAfterClose}
          onMonthChange={handleMonthChange}
        />
      </div>

      {/* Ładowanie */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Treść */}
      {!isLoading && report && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Do sprawdzenia ({flaggedOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] text-left">Dostawa</TableHead>
                    <TableHead className="w-[110px] text-left">Nr prod.</TableHead>
                    <TableHead className="text-left">Projekt</TableHead>
                    <TableHead className="w-[80px] text-center">Data prod.</TableHead>
                    <TableHead className="w-[60px] text-center">Okna</TableHead>
                    <TableHead className="w-[60px] text-center">Szkleń</TableHead>
                    <TableHead className="w-[60px] text-center">Skrzyd.</TableHead>
                    <TableHead className="w-[110px] text-right pr-2">PLN</TableHead>
                    <TableHead className="w-[110px] text-right pr-2">EUR</TableHead>
                    <TableHead className="w-[110px] text-right pr-2" title="Wartość materiału (edytowalna)">Materiał</TableHead>
                    <TableHead className="w-[70px] text-right pr-2" title="Współczynnik PLN/materiał">Wsp.</TableHead>
                    <TableHead className="w-[70px] text-right pr-2" title="(PLN - materiał) / szkła">Jedn. zł</TableHead>
                    <TableHead className="text-left">Ostrzeżenia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flaggedOrders.map(({ order, item, warnings }, index) => (
                    <FlaggedOrderRow
                      key={order.id}
                      order={order}
                      item={item}
                      warnings={warnings}
                      canEdit={permissions.canEditQuantities}
                      onUpdateItem={handleUpdateItem}
                      isPending={isPending}
                      isEven={index % 2 === 0}
                      eurRate={DEFAULT_EUR_RATE}
                    />
                  ))}
                  {flaggedOrders.length === 0 && (
                    <TableRow>
                      <td colSpan={13} className="text-center py-8 text-muted-foreground">
                        Brak zleceń do sprawdzenia w wybranym miesiącu
                      </td>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================================
// Wiersz flagowanego zlecenia
// ============================================

interface FlaggedOrderRowProps {
  order: OrderData;
  item: ProductionReportItem | null;
  warnings: string[];
  canEdit: boolean;
  onUpdateItem: (orderId: number, data: UpdateReportItemInput) => void;
  isPending: boolean;
  isEven: boolean;
  eurRate: number;
}

const FlaggedOrderRow: React.FC<FlaggedOrderRowProps> = ({
  order,
  item,
  warnings,
  canEdit,
  onUpdateItem,
  isPending,
  isEven,
  eurRate,
}) => {
  // Wartości do wyświetlenia
  const displayValuePln = item?.overrideValuePln ?? order.valuePln;
  const displayValueEur = item?.overrideValueEur ?? order.valueEur;
  const displayWindows = item?.overrideWindows ?? order.totalWindows;
  const displayUnits = item?.overrideUnits ?? (order.totalGlasses ?? 0);
  const displaySashes = item?.overrideSashes ?? order.totalSashes;

  // Materiał — override lub z backendu
  const displayMaterialGrosze = item?.overrideMaterialValue ?? (
    item?.materialValue !== undefined && item.materialValue > 0
      ? Math.round(item.materialValue * 100) // materialValue z backendu jest w PLN, konwertuj na grosze dla EditableCell
      : null
  );

  // Współczynnik (przeliczony z EUR dla AKROBUD)
  const computedCoefficient = (() => {
    if (!item) return '—';
    if (item.isAkrobud && item.valueEur && item.materialValue > 0) {
      return (item.valueEur / item.materialValue).toFixed(2);
    }
    return item.coefficient;
  })();

  // Jednostka (przeliczona z EUR dla AKROBUD)
  const computedUnitValue = (() => {
    if (!item) return '—';
    if (item.isAkrobud && item.valueEur && eurRate && item.totalGlassQuantity > 0) {
      return Math.round(((item.valueEur - item.materialValue) * eurRate) / item.totalGlassQuantity).toString();
    }
    return item.unitValue;
  })();

  // Ostrzeżenia - kolorowanie
  const coefficientNum = computedCoefficient !== '—' ? parseFloat(computedCoefficient) : null;
  const isCoefficientWarning = coefficientNum !== null && (coefficientNum < 1.4 || coefficientNum > 2);
  const isMissingMaterial = !item?.materialValue || item.materialValue <= 0;

  return (
    <TableRow className={isEven ? 'bg-amber-50/50' : 'bg-amber-50/30'}>
      {/* Dostawa */}
      <TableCell className="text-muted-foreground text-sm">
        {order.deliveryName || '-'}
      </TableCell>

      {/* Nr produkcyjny + badge kolor 999 */}
      <TableCell className="font-mono text-sm">
        <span className="flex items-center gap-1.5">
          {order.orderNumber}
          {order.hasColor999 && (
            <span title="Kolor 999" className="inline-flex items-center">
              <Paintbrush className="h-3.5 w-3.5 text-purple-600" />
            </span>
          )}
        </span>
      </TableCell>

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

      {/* Okna */}
      <TableCell className="text-sm text-center tabular-nums">{displayWindows}</TableCell>

      {/* Szkleń */}
      <TableCell className="text-sm text-center tabular-nums">{displayUnits}</TableCell>

      {/* Skrzydła */}
      <TableCell className="text-sm text-center tabular-nums">{displaySashes}</TableCell>

      {/* Wartość PLN (edytowalna) */}
      <TableCell className="w-[110px] pr-2">
        <EditableCell
          value={displayValuePln}
          type="number"
          isMoneyGrosze={true}
          onChange={(val) =>
            onUpdateItem(order.id, { overrideValuePln: val as number | null })
          }
          disabled={!canEdit}
          isPending={isPending}
          align="right"
        />
      </TableCell>

      {/* Wartość EUR (edytowalna) */}
      <TableCell className="w-[110px] pr-2">
        <EditableCell
          value={displayValueEur}
          type="number"
          isMoneyGrosze={true}
          onChange={(val) =>
            onUpdateItem(order.id, { overrideValueEur: val as number | null })
          }
          disabled={!canEdit}
          isPending={isPending}
          align="right"
        />
      </TableCell>

      {/* Materiał (edytowalny) */}
      <TableCell className={`w-[110px] pr-2 ${isMissingMaterial ? 'text-red-500' : ''}`}>
        <EditableCell
          value={displayMaterialGrosze}
          type="number"
          isMoneyGrosze={true}
          onChange={(val) =>
            onUpdateItem(order.id, { overrideMaterialValue: val as number | null })
          }
          disabled={!canEdit}
          isPending={isPending}
          align="right"
        />
      </TableCell>

      {/* Współczynnik */}
      <TableCell className={`w-[70px] pr-2 text-right text-sm tabular-nums ${isCoefficientWarning ? 'text-red-600 font-bold' : ''}`}>
        {computedCoefficient}
      </TableCell>

      {/* Jednostka */}
      <TableCell className="w-[70px] pr-2 text-right text-sm tabular-nums">
        {computedUnitValue}
      </TableCell>

      {/* Ostrzeżenia */}
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {warnings.map((w, i) => (
            <Badge key={i} variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
              {w}
            </Badge>
          ))}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default FlaggedOrdersPage;
