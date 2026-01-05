'use client';

import type { DayStats } from '../hooks';

interface WeekSummaryProps {
  weekIndex: number;
  weekStartDate: Date;
  weekEndDate: Date;
  weekStats: DayStats;
  variant?: 'green' | 'blue';
}

export function WeekSummary({
  weekIndex,
  weekStartDate,
  weekEndDate,
  weekStats,
  variant = 'green',
}: WeekSummaryProps) {
  const isGreen = variant === 'green';

  const containerClassName = isGreen
    ? 'border-2 border-green-600 rounded-lg p-4 bg-green-100 mb-4'
    : 'border-2 border-blue-600 rounded-lg p-4 bg-blue-100';

  const cardClassName = isGreen
    ? 'bg-white rounded-md p-2 border border-green-300'
    : 'bg-white rounded-md p-2 border border-blue-300';

  const textClassName = isGreen ? 'text-green-800' : 'text-blue-800';
  const textSize = isGreen ? 'text-2xl' : 'text-xl';

  return (
    <div className={containerClassName}>
      <div className="text-sm font-semibold text-slate-800 mb-3">
        Tydzien {weekIndex + 1}: {weekStartDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} - {weekEndDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
      </div>
      {weekStats.windows > 0 ? (
        <div className={isGreen ? 'grid grid-cols-3 gap-3 text-center' : 'grid grid-cols-3 gap-2 text-center'}>
          <div className={cardClassName}>
            <div className="text-xs font-medium text-slate-700 mb-1">Okna</div>
            <div className={`${textSize} font-bold ${textClassName}`}>{weekStats.windows}</div>
          </div>
          <div className={cardClassName}>
            <div className="text-xs font-medium text-slate-700 mb-1">Skrzydla</div>
            <div className={`${textSize} font-bold ${textClassName}`}>{weekStats.sashes}</div>
          </div>
          <div className={cardClassName}>
            <div className="text-xs font-medium text-slate-700 mb-1">Szyby</div>
            <div className={`${textSize} font-bold ${textClassName}`}>{weekStats.glasses}</div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-600 text-center font-medium">Brak dostaw</div>
      )}
    </div>
  );
}

export default WeekSummary;
