/**
 * PvcOrdersTable - tabela zamówień Schuco
 * Pokazuje pozycje które zostały faktycznie wysłane w danym miesiącu
 */

'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Package, Truck } from 'lucide-react';
import type { SchucoOrderWeek } from '../types';

interface PvcOrdersTableProps {
  weeks: SchucoOrderWeek[];
  isLoading?: boolean;
}

export const PvcOrdersTable: React.FC<PvcOrdersTableProps> = ({
  weeks,
  isLoading = false,
}) => {
  const [expandedWeeks, setExpandedWeeks] = React.useState<Set<string>>(new Set());

  const toggleWeek = (weekKey: string) => {
    setExpandedWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekKey)) {
        newSet.delete(weekKey);
      } else {
        newSet.add(weekKey);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('wysłan') || statusLower.includes('dostarczon')) {
      return <Badge variant="default" className="bg-green-500">Wysłane</Badge>;
    }
    if (statusLower.includes('w realizacji') || statusLower.includes('produkcj')) {
      return <Badge variant="secondary" className="bg-blue-500 text-white">W realizacji</Badge>;
    }
    if (statusLower.includes('oczekuj') || statusLower.includes('nowe')) {
      return <Badge variant="outline">Oczekuje</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Brak wysłanych pozycji w wybranym miesiącu</p>
      </div>
    );
  }

  // Oblicz totale
  const totalShipped = weeks.reduce((acc, w) => acc + w.totalShipped, 0);
  const totalItems = weeks.reduce((acc, w) => acc + w.items.length, 0);

  return (
    <div>
      {/* Lista tygodni */}
      <div className="space-y-2">
        {weeks.map((week) => {
          const isExpanded = expandedWeeks.has(week.weekStart);
          return (
            <Collapsible
              key={week.weekStart}
              open={isExpanded}
              onOpenChange={() => toggleWeek(week.weekStart)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                    <Truck className="h-5 w-5 text-green-500" />
                    <span className="font-medium">{week.weekLabel}</span>
                    <Badge variant="outline" className="ml-2">
                      {week.items.length} poz.
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Dostarczone: <span className="font-medium text-green-600">{week.totalShipped}</span>
                    </span>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Nr artykułu</TableHead>
                        <TableHead>Opis</TableHead>
                        <TableHead className="w-[100px]">Wymiary</TableHead>
                        <TableHead className="w-[80px] text-right">Wysł.</TableHead>
                        <TableHead className="w-[100px]">Zamówienie</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {week.items.map((item, itemIdx) => (
                        <TableRow key={item.id} className={itemIdx % 2 === 1 ? 'bg-slate-50/70' : ''}>
                          <TableCell className="font-mono text-sm">{item.articleNumber}</TableCell>
                          <TableCell className="max-w-[300px] truncate" title={item.articleDescription}>
                            {item.articleDescription}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.dimensions || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {item.shippedQty}
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="font-mono">{item.schucoDelivery.orderNumber}</span>
                          </TableCell>
                          <TableCell>{getStatusBadge(item.schucoDelivery.shippingStatus)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-slate-50 border rounded-lg text-sm text-slate-600 flex justify-between">
        <span>Razem: {totalItems} pozycji</span>
        <span>
          Łącznie dostarczone: <strong className="text-green-600">{totalShipped} szt.</strong>
        </span>
      </div>
    </div>
  );
};

export default PvcOrdersTable;
