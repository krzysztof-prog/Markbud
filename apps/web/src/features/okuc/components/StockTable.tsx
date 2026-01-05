'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Edit, X } from 'lucide-react';
import type { OkucStock } from '@/types/okuc';

interface StockTableProps {
  stocks: OkucStock[];
  isLoading?: boolean;
  onUpdate: (id: number, quantity: number) => void;
  isUpdatingId?: number;
}

type SortColumn = 'articleId' | 'warehouse' | 'quantity' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

/**
 * Tabela stanów magazynowych OKUC
 *
 * Funkcje:
 * - Sortowanie po wszystkich kolumnach
 * - Inline edit ilości (tylko jeden wiersz na raz)
 * - Badge kolorystyczny według poziomu zapasu (min/max)
 * - Blokada innych edycji podczas aktualizacji
 */
export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  isLoading = false,
  onUpdate,
  isUpdatingId,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('articleId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Rozpocznij edycję wiersza
  const handleStartEdit = useCallback(
    (stock: OkucStock) => {
      // Blokuj edycję jeśli trwa aktualizacja
      if (isUpdatingId) return;

      setEditingId(stock.id);
      setEditValue(String(stock.currentQuantity));
    },
    [isUpdatingId]
  );

  // Anuluj edycję
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  // Zapisz zmiany
  const handleSaveEdit = useCallback(
    (stockId: number) => {
      const quantity = parseInt(editValue, 10);

      // Walidacja frontend: tylko dodatnia lub zero
      if (isNaN(quantity) || quantity < 0) {
        return;
      }

      onUpdate(stockId, quantity);
      setEditingId(null);
      setEditValue('');
    },
    [editValue, onUpdate]
  );

  // Sortowanie
  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    },
    [sortColumn]
  );

  // Sortowane dane
  const sortedStocks = useMemo(() => {
    return [...stocks].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case 'articleId':
          aValue = a.article?.articleId || '';
          bValue = b.article?.articleId || '';
          break;
        case 'warehouse':
          aValue = `${a.warehouseType}-${a.subWarehouse || ''}`;
          bValue = `${b.warehouseType}-${b.subWarehouse || ''}`;
          break;
        case 'quantity':
          aValue = a.currentQuantity;
          bValue = b.currentQuantity;
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [stocks, sortColumn, sortDirection]);

  // Badge dla ilości (red < min, yellow < max, green OK)
  const getQuantityBadge = (stock: OkucStock) => {
    const { currentQuantity, minStock, maxStock } = stock;

    if (minStock !== null && minStock !== undefined && currentQuantity < minStock) {
      return (
        <Badge variant="destructive" className="font-mono">
          {currentQuantity}
        </Badge>
      );
    }

    if (maxStock !== null && maxStock !== undefined && currentQuantity < maxStock) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 font-mono">
          {currentQuantity}
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 font-mono">
        {currentQuantity}
      </Badge>
    );
  };

  // Formatowanie magazynu
  const formatWarehouse = (warehouseType: string, subWarehouse?: string | null) => {
    const type = warehouseType.toUpperCase();
    if (!subWarehouse) return type;

    const subMap: Record<string, string> = {
      production: 'Produkcja',
      buffer: 'Bufor',
      gabaraty: 'Gabaraty',
    };

    return `${type} - ${subMap[subWarehouse] || subWarehouse}`;
  };

  // Formatowanie daty
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Header z sortowaniem
  const SortableHeader: React.FC<{ column: SortColumn; children: React.ReactNode }> = ({
    column,
    children,
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column && (
          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Brak danych do wyświetlenia
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader column="articleId">Artykuł</SortableHeader>
            <SortableHeader column="warehouse">Magazyn</SortableHeader>
            <TableHead>Podmagazyn</TableHead>
            <SortableHeader column="quantity">Ilość</SortableHeader>
            <TableHead>Min / Max</TableHead>
            <SortableHeader column="updatedAt">Ostatnia zmiana</SortableHeader>
            <TableHead className="text-right">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStocks.map((stock) => {
            const isEditing = editingId === stock.id;
            const isUpdating = isUpdatingId === stock.id;
            const isDisabled = !!isUpdatingId && !isUpdating;

            return (
              <TableRow key={stock.id} className={isDisabled ? 'opacity-50' : ''}>
                {/* Artykuł */}
                <TableCell className="font-medium">
                  <div>
                    <div className="font-mono text-sm">{stock.article?.articleId || '-'}</div>
                    <div className="text-xs text-gray-500">{stock.article?.name || '-'}</div>
                  </div>
                </TableCell>

                {/* Magazyn */}
                <TableCell>
                  {formatWarehouse(stock.warehouseType, stock.subWarehouse)}
                </TableCell>

                {/* Podmagazyn (osobna kolumna dla czytelności) */}
                <TableCell>
                  {stock.subWarehouse ? (
                    <Badge variant="outline" className="text-xs">
                      {stock.subWarehouse === 'production'
                        ? 'Produkcja'
                        : stock.subWarehouse === 'buffer'
                          ? 'Bufor'
                          : stock.subWarehouse === 'gabaraty'
                            ? 'Gabaraty'
                            : stock.subWarehouse}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </TableCell>

                {/* Ilość (inline edit lub badge) */}
                <TableCell>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(stock.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleSaveEdit(stock.id)}
                        disabled={isUpdating}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    getQuantityBadge(stock)
                  )}
                </TableCell>

                {/* Min / Max */}
                <TableCell>
                  <div className="text-sm text-gray-600 font-mono">
                    {stock.minStock ?? '-'} / {stock.maxStock ?? '-'}
                  </div>
                </TableCell>

                {/* Ostatnia zmiana */}
                <TableCell className="text-sm text-gray-500">
                  {formatDate(stock.updatedAt)}
                </TableCell>

                {/* Akcje */}
                <TableCell className="text-right">
                  {!isEditing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleStartEdit(stock)}
                      disabled={isDisabled || isUpdating}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default StockTable;
