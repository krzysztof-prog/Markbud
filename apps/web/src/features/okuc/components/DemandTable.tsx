/**
 * Tabela zapotrzebowań OKUC
 *
 * Wyświetla listę zapotrzebowań z możliwością:
 * - Sortowania kolumn
 * - Edycji zapotrzebowania
 * - Usuwania zapotrzebowania
 *
 * Props:
 * - demands: OkucDemand[] - lista zapotrzebowań
 * - onEdit: (id: number) => void - callback edycji
 * - onDelete: (id: number) => void - callback usuwania
 * - isDeletingId?: number - ID zapotrzebowania w trakcie usuwania (disabled row)
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import type { OkucDemand, DemandStatus, DemandSource } from '@/types/okuc';

interface DemandTableProps {
  demands: OkucDemand[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  isDeletingId?: number;
}

type SortColumn = 'articleId' | 'expectedWeek' | 'quantity' | 'status' | 'source';
type SortDirection = 'asc' | 'desc';

/** Badge dla statusu */
const getStatusBadge = (status: DemandStatus) => {
  const variants: Record<DemandStatus, { label: string; className: string }> = {
    pending: { label: 'Oczekujące', className: 'bg-gray-200 text-gray-800' },
    confirmed: { label: 'Potwierdzone', className: 'bg-blue-100 text-blue-800' },
    in_production: { label: 'W produkcji', className: 'bg-yellow-100 text-yellow-800' },
    completed: { label: 'Zakończone', className: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Anulowane', className: 'bg-red-100 text-red-800' },
  };

  const { label, className } = variants[status];

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  );
};

/** Label dla źródła */
const getSourceLabel = (source: DemandSource): string => {
  const labels: Record<DemandSource, string> = {
    order: 'Zlecenie',
    csv_import: 'Import CSV',
    manual: 'Ręczne',
  };
  return labels[source];
};

/** Format tygodnia: "2026-W02" → "Tydzień 2, 2026" */
const formatWeek = (weekString: string): string => {
  const match = weekString.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekString;
  const [, year, week] = match;
  return `Tydzień ${parseInt(week, 10)}, ${year}`;
};

export function DemandTable({ demands, onEdit, onDelete, isDeletingId }: DemandTableProps) {
  // === STATE ===
  const [sortColumn, setSortColumn] = useState<SortColumn>('expectedWeek');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // === SORTOWANIE ===
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedDemands = useMemo(() => {
    const sorted = [...demands];
    sorted.sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic sorting requires accessing dynamic properties
      let aValue: any = a[sortColumn];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic sorting requires accessing dynamic properties
      let bValue: any = b[sortColumn];

      // Special handling dla articleId (relation)
      if (sortColumn === 'articleId') {
        aValue = a.article?.articleId || a.articleId;
        bValue = b.article?.articleId || b.articleId;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return sorted;
  }, [demands, sortColumn, sortDirection]);

  // === RENDER ===
  if (demands.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">Brak zapotrzebowań do wyświetlenia</div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {/* Artykuł */}
            <TableHead className="w-[200px]">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 hover:bg-transparent font-semibold"
                onClick={() => handleSort('articleId')}
              >
                Artykuł
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>

            {/* Tydzień */}
            <TableHead className="w-[160px]">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 hover:bg-transparent font-semibold"
                onClick={() => handleSort('expectedWeek')}
              >
                Tydzień
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>

            {/* Ilość */}
            <TableHead className="w-[100px] text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 hover:bg-transparent font-semibold"
                onClick={() => handleSort('quantity')}
              >
                Ilość
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>

            {/* Status */}
            <TableHead className="w-[140px]">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 hover:bg-transparent font-semibold"
                onClick={() => handleSort('status')}
              >
                Status
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>

            {/* Źródło */}
            <TableHead className="w-[120px]">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 hover:bg-transparent font-semibold"
                onClick={() => handleSort('source')}
              >
                Źródło
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>

            {/* Edytowano ręcznie */}
            <TableHead className="w-[80px] text-center">Edytowano</TableHead>

            {/* Akcje */}
            <TableHead className="w-[120px] text-right">Akcje</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedDemands.map((demand) => {
            const isDeleting = isDeletingId === demand.id;

            return (
              <TableRow
                key={demand.id}
                className={isDeleting ? 'opacity-50 pointer-events-none' : ''}
              >
                {/* Artykuł */}
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">{demand.article?.articleId || `ID: ${demand.articleId}`}</div>
                    {demand.article?.name && (
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {demand.article.name}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Tydzień */}
                <TableCell>{formatWeek(demand.expectedWeek)}</TableCell>

                {/* Ilość */}
                <TableCell className="text-right font-mono font-semibold">
                  {demand.quantity}
                </TableCell>

                {/* Status */}
                <TableCell>{getStatusBadge(demand.status)}</TableCell>

                {/* Źródło */}
                <TableCell className="text-sm">{getSourceLabel(demand.source)}</TableCell>

                {/* Edytowano ręcznie */}
                <TableCell className="text-center">
                  {demand.isManualEdit && (
                    <Badge variant="outline" className="text-xs">
                      ✓
                    </Badge>
                  )}
                </TableCell>

                {/* Akcje */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(demand.id)}
                      disabled={isDeleting}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(demand.id)}
                      disabled={isDeleting}
                      className="h-8 w-8 p-0 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
