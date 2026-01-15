'use client';

import React from 'react';
import { ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PalletStockEntry } from '../types/index';
import { PALLET_TYPE_LABELS } from '../types/index';

interface PalletRowProps {
  entry: PalletStockEntry;
  isEditable: boolean;
  threshold: number;
  onUsedChange: (value: number) => void;
  onMorningStockChange: (value: number) => void;
}

/**
 * Wiersz tabeli dla jednego typu palety
 * Kolumny: Typ | Stan poranny | Użyte | Zrobione
 *
 * LOGIKA:
 * - Stan poranny: domyślnie = poprzedni poranny - poprzednie użyte (kierownik może zmienić strzałkami +/-)
 * - Użyte: wpisywane przez kierownika
 * - Zrobione: WYLICZANE = morningStock (dziś) - morningStock (poprzedni dzień) + used
 */
export const PalletRow: React.FC<PalletRowProps> = ({
  entry,
  isEditable,
  threshold,
  onUsedChange,
  onMorningStockChange,
}) => {
  const { type, morningStock, used, produced } = entry;

  // Sprawdź czy stan poranny jest poniżej progu
  const isBelowThreshold = morningStock < threshold;

  // Obsługa zmiany wartości used z walidacją (>= 0)
  const handleUsedChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      onUsedChange(numValue);
    } else if (value === '') {
      onUsedChange(0);
    }
  };

  // Obsługa strzałek dla stanu porannego
  const handleMorningStockIncrement = () => {
    onMorningStockChange(morningStock + 1);
  };

  const handleMorningStockDecrement = () => {
    if (morningStock > 0) {
      onMorningStockChange(morningStock - 1);
    }
  };

  return (
    <tr className={cn('border-b last:border-b-0', isBelowThreshold && 'bg-red-50')}>
      {/* Typ palety */}
      <td className="px-3 py-3 font-medium text-sm md:text-base">
        {PALLET_TYPE_LABELS[type]}
      </td>

      {/* Stan poranny ze strzałkami +/- */}
      <td className="px-3 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          {/* Strzałki do zmiany wartości (tylko gdy edytowalne) */}
          {isEditable && (
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-green-100"
                onClick={handleMorningStockIncrement}
                aria-label="Zwiększ stan poranny"
              >
                <ChevronUp className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-red-100"
                onClick={handleMorningStockDecrement}
                disabled={morningStock <= 0}
                aria-label="Zmniejsz stan poranny"
              >
                <ChevronDown className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          )}
          <span
            className={cn(
              'text-sm md:text-base tabular-nums min-w-[3ch]',
              isBelowThreshold && 'text-red-600 font-medium'
            )}
          >
            {morningStock}
          </span>
          {isBelowThreshold && (
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Stan poranny ({morningStock}) jest poniżej progu alertu ({threshold})
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </td>

      {/* Użyte (edytowalne) */}
      <td className="px-3 py-3 text-center">
        {isEditable ? (
          <Input
            type="number"
            min={0}
            value={used}
            onChange={(e) => handleUsedChange(e.target.value)}
            className="w-16 md:w-20 text-center h-8 text-sm mx-auto"
          />
        ) : (
          <span className="text-sm md:text-base tabular-nums">{used}</span>
        )}
      </td>

      {/* Zrobione (wyliczane automatycznie przez backend) */}
      <td className="px-3 py-3 text-center">
        <span
          className={cn(
            'text-sm md:text-base tabular-nums',
            produced < 0 && 'text-orange-600 font-medium'
          )}
        >
          {produced}
        </span>
        {produced < 0 && (
          <Tooltip>
            <TooltipTrigger>
              <AlertTriangle className="h-4 w-4 text-orange-500 ml-1 inline" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Ujemna wartość - sprawdź dane!</p>
            </TooltipContent>
          </Tooltip>
        )}
      </td>
    </tr>
  );
};

export default PalletRow;
