'use client';

/**
 * Komponent nagłówka tabeli zleceń
 * Sticky header z nazwami kolumn
 */

import React from 'react';
import type { Column } from '../types';

// ================================
// Subkomponent SortHeader
// ================================

const SortHeader: React.FC<{ column: Column }> = ({ column }) => {
  return <span>{column.label}</span>;
};

// ================================
// Props
// ================================

interface OrderTableHeaderProps {
  visibleColumns: Column[];
}

// ================================
// Komponent
// ================================

export const OrderTableHeader = React.memo<OrderTableHeaderProps>(({
  visibleColumns,
}) => {
  return (
    <tr>
      {visibleColumns.map((column) => (
        <th
          key={column.id}
          className={`px-4 py-2 ${
            column.align === 'center'
              ? 'text-center'
              : column.align === 'right'
              ? 'text-right'
              : 'text-left'
          }`}
        >
          <SortHeader column={column} />
        </th>
      ))}
    </tr>
  );
});

OrderTableHeader.displayName = 'OrderTableHeader';
