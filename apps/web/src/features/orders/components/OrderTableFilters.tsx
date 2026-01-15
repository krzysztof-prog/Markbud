'use client';

/**
 * Komponent wiersza filtrów dla tabeli zleceń
 * Sticky header z polami filtrowania dla każdej kolumny
 */

import React from 'react';
import type { Column, ColumnId } from '../types';

// ================================
// Props
// ================================

interface OrderTableFiltersProps {
  visibleColumns: Column[];
  columnFilters: Record<ColumnId, string>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<ColumnId, string>>>;
}

// ================================
// Komponent
// ================================

export const OrderTableFilters = React.memo<OrderTableFiltersProps>(({
  visibleColumns,
  columnFilters,
  setColumnFilters,
}) => {
  return (
    <tr className="border-t bg-slate-100 sticky top-[37px] z-10">
      {visibleColumns.map((column) => (
        <th
          key={`filter-${column.id}`}
          className="px-2 py-1 bg-slate-100"
        >
          <input
            type="text"
            placeholder="Filtruj..."
            value={columnFilters[column.id] || ''}
            onChange={(e) => setColumnFilters(prev => ({
              ...prev,
              [column.id]: e.target.value
            }))}
            className="w-full px-2 py-1 text-xs border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </th>
      ))}
    </tr>
  );
});

OrderTableFilters.displayName = 'OrderTableFilters';
