'use client';

import React from 'react';
import { GlassWater, LayoutGrid, Layers } from 'lucide-react';

interface WeeklyPlanSummaryProps {
  weekTotalGlass: number;
  weekTotalWindows: number;
  weekTotalSashes: number;
}

export function WeeklyPlanSummary({ weekTotalGlass, weekTotalWindows, weekTotalSashes }: WeeklyPlanSummaryProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
      <span className="text-xs text-green-700 font-medium">Razem w tygodniu:</span>
      {weekTotalWindows > 0 && (
        <div className="flex items-center gap-1">
          <LayoutGrid className="h-3.5 w-3.5 text-green-600" />
          <span className="text-sm font-bold text-green-800">{weekTotalWindows} okien</span>
        </div>
      )}
      {weekTotalSashes > 0 && (
        <div className="flex items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-green-600" />
          <span className="text-sm font-bold text-green-800">{weekTotalSashes} skrzydeł</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        <GlassWater className="h-3.5 w-3.5 text-green-600" />
        <span className="text-sm font-bold text-green-800">{weekTotalGlass} szyb</span>
      </div>
    </div>
  );
}
