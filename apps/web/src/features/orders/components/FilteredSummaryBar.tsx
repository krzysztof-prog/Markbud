'use client';

/**
 * Komponent podsumowania przefiltrowanych zleceń
 */

import React from 'react';
import type { FilteredSummary } from '../types';

// ================================
// Typy
// ================================

interface FilteredSummaryBarProps {
  filteredCount: number;
  summary: FilteredSummary;
}

// ================================
// Komponent
// ================================

export const FilteredSummaryBar: React.FC<FilteredSummaryBarProps> = ({
  filteredCount,
  summary,
}) => {
  return (
    <div className="flex items-center gap-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <span className="text-sm font-medium text-blue-800">
        Suma ({filteredCount} zleceń):
      </span>
      <div className="flex items-center gap-1">
        <span className="text-sm text-blue-600">Okna:</span>
        <span className="text-sm font-semibold text-blue-800">{summary.totalWindows}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-blue-600">Skrzydła:</span>
        <span className="text-sm font-semibold text-blue-800">{summary.totalSashes}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-blue-600">Szklenia:</span>
        <span className="text-sm font-semibold text-blue-800">{summary.totalGlasses}</span>
      </div>
    </div>
  );
};

export default FilteredSummaryBar;
