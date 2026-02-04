/**
 * SystemFilters - dropdown multi-select do filtrowania profili wg systemów
 *
 * Systemy: Living, BLOK, VLAK, CT70, FOCUSING
 * Zmienione z checkboxów na dropdown dla lepszego UX (zajmuje mniej miejsca)
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronDown, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { type SystemType, SYSTEM_LABELS } from '../types';

interface SystemFiltersProps {
  selectedSystems: SystemType[];
  onChange: (systems: SystemType[]) => void;
  /** Opcjonalne - statystyki ile profili w każdym systemie */
  systemCounts?: Record<SystemType, number>;
  /** Wyłącz interakcję */
  disabled?: boolean;
}

const SYSTEMS: SystemType[] = ['living', 'blok', 'vlak', 'ct70', 'focusing'];

export const SystemFilters: React.FC<SystemFiltersProps> = ({
  selectedSystems,
  onChange,
  systemCounts,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);

  const handleToggle = (system: SystemType) => {
    if (disabled) return;

    if (selectedSystems.includes(system)) {
      onChange(selectedSystems.filter((s) => s !== system));
    } else {
      onChange([...selectedSystems, system]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onChange([...SYSTEMS]);
    setOpen(false);
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  // Tekst przycisku
  const getButtonText = () => {
    if (selectedSystems.length === 0) return 'Wszystkie systemy';
    if (selectedSystems.length === SYSTEMS.length) return 'Wszystkie systemy';
    if (selectedSystems.length === 1) return SYSTEM_LABELS[selectedSystems[0]];
    return `${selectedSystems.length} systemy`;
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border">
      <span className="text-sm font-medium text-slate-600">System:</span>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="min-w-[160px] justify-between"
          >
            {getButtonText()}
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-2" align="start">
          {/* Opcja "Wszystkie" */}
          <button
            onClick={handleSelectAll}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-100 text-left"
          >
            <Check className={cn(
              "h-4 w-4",
              selectedSystems.length === SYSTEMS.length || selectedSystems.length === 0
                ? "opacity-100"
                : "opacity-0"
            )} />
            <span className="font-medium">Wszystkie</span>
          </button>

          <div className="h-px bg-slate-200 my-1" />

          {/* Lista systemów */}
          {SYSTEMS.map((system) => {
            const isChecked = selectedSystems.includes(system);
            const count = systemCounts?.[system];

            return (
              <button
                key={system}
                onClick={() => handleToggle(system)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-slate-100 text-left"
              >
                <Check className={cn("h-4 w-4", isChecked ? "opacity-100" : "opacity-0")} />
                <span className="flex-1">{SYSTEM_LABELS[system]}</span>
                {count !== undefined && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Wyświetl wybrane systemy jako badge'e */}
      {selectedSystems.length > 0 && selectedSystems.length < SYSTEMS.length && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedSystems.map((system) => (
            <Badge
              key={system}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-slate-200"
              onClick={() => handleToggle(system)}
            >
              {SYSTEM_LABELS[system]}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          <button
            onClick={handleClearAll}
            className="text-xs text-slate-500 hover:text-slate-700 ml-1"
          >
            Wyczyść
          </button>
        </div>
      )}
    </div>
  );
};

export default SystemFilters;
