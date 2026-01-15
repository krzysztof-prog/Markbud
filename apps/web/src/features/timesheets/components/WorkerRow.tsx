'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { WorkerDaySummary } from '../types';
import { formatHours } from '../helpers/dateHelpers';

interface WorkerRowProps {
  data: WorkerDaySummary;
  isSelected: boolean;
  onClick: () => void;
}

export const WorkerRow: React.FC<WorkerRowProps> = ({
  data,
  isSelected,
  onClick,
}) => {
  const { worker, entry, totalHours, productiveHours, nonProductiveHours } = data;
  const hasEntry = entry !== null;
  const positionName = entry?.position?.shortName || entry?.position?.name || worker.defaultPosition;

  // Przygotuj rozbicie godzin nieprodukcyjnych dla tooltipa
  const nonProductiveBreakdown = useMemo(() => {
    if (!entry?.nonProductiveTasks || entry.nonProductiveTasks.length === 0) {
      return null;
    }
    return entry.nonProductiveTasks.map((task) => ({
      name: task.taskType?.name || 'Nieznany typ',
      hours: task.hours,
    }));
  }, [entry?.nonProductiveTasks]);

  return (
    <tr
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-colors border-b last:border-b-0',
        'hover:bg-muted/50',
        isSelected && 'bg-blue-50 ring-2 ring-blue-500 ring-inset',
        !hasEntry && 'text-muted-foreground'
      )}
    >
      {/* Imię i nazwisko */}
      <td className="px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              hasEntry ? 'bg-green-500' : 'bg-gray-300'
            )}
          />
          <span className={cn('font-medium truncate', hasEntry && 'text-foreground')}>
            {worker.firstName} {worker.lastName}
          </span>
        </div>
      </td>

      {/* Stanowisko */}
      <td className="px-4 py-2.5 text-sm text-center">
        <span className="text-xs truncate">
          {hasEntry ? positionName : '-'}
        </span>
      </td>

      {/* Godziny produkcyjne */}
      <td className="px-4 py-2.5 text-sm text-center">
        <span
          className={cn(
            productiveHours > 0 && 'text-green-600 font-medium'
          )}
        >
          {formatHours(productiveHours)}
        </span>
      </td>

      {/* Godziny nieprodukcyjne z tooltipem */}
      <td className="px-4 py-2.5 text-sm text-center">
        {nonProductiveBreakdown && nonProductiveBreakdown.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'cursor-help underline decoration-dotted',
                  nonProductiveHours > 0 && 'text-orange-600 font-medium'
                )}
              >
                {formatHours(nonProductiveHours)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium text-xs">Rozbicie nieprodukcyjnych:</p>
                {nonProductiveBreakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-4 text-xs">
                    <span>{item.name}</span>
                    <span className="font-medium">{formatHours(item.hours)}</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span
            className={cn(
              nonProductiveHours > 0 && 'text-orange-600 font-medium'
            )}
          >
            {formatHours(nonProductiveHours)}
          </span>
        )}
      </td>

      {/* Suma z tooltipem */}
      <td className="px-4 py-2.5 text-sm text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'font-medium cursor-help',
                totalHours > 0 && 'text-blue-600',
                totalHours > 8 && 'text-purple-600'
              )}
            >
              {formatHours(totalHours)}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-green-600">Produkcyjne:</span>
                <span className="font-medium">{formatHours(productiveHours)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-orange-600">Nieprodukcyjne:</span>
                <span className="font-medium">{formatHours(nonProductiveHours)}</span>
              </div>
              <div className="border-t pt-1 flex justify-between gap-4 font-medium">
                <span>Razem:</span>
                <span>{formatHours(totalHours)}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </td>
    </tr>
  );
};

export default WorkerRow;
