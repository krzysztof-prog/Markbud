/**
 * SystemFilters - checkboxy do filtrowania profili wg systemów
 *
 * Systemy: Living, BLOK, VLAK, CT70, FOCUSING
 */

'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  const handleToggle = (system: SystemType) => {
    if (disabled) return;

    if (selectedSystems.includes(system)) {
      // Usuń system
      onChange(selectedSystems.filter((s) => s !== system));
    } else {
      // Dodaj system
      onChange([...selectedSystems, system]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;

    if (selectedSystems.length === SYSTEMS.length) {
      // Odznacz wszystkie
      onChange([]);
    } else {
      // Zaznacz wszystkie
      onChange([...SYSTEMS]);
    }
  };

  const allSelected = selectedSystems.length === SYSTEMS.length;
  const someSelected = selectedSystems.length > 0 && selectedSystems.length < SYSTEMS.length;

  return (
    <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 rounded-lg border">
      {/* Checkbox "Wszystkie" */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="system-all"
          checked={allSelected}
          // Indeterminate state
          data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
          onCheckedChange={handleSelectAll}
          disabled={disabled}
        />
        <Label
          htmlFor="system-all"
          className="text-sm font-medium cursor-pointer select-none"
        >
          Wszystkie
        </Label>
      </div>

      <div className="h-4 w-px bg-slate-300" />

      {/* Checkboxy dla każdego systemu */}
      {SYSTEMS.map((system) => {
        const isChecked = selectedSystems.includes(system);
        const count = systemCounts?.[system];

        return (
          <div key={system} className="flex items-center space-x-2">
            <Checkbox
              id={`system-${system}`}
              checked={isChecked}
              onCheckedChange={() => handleToggle(system)}
              disabled={disabled}
            />
            <Label
              htmlFor={`system-${system}`}
              className="text-sm cursor-pointer select-none flex items-center gap-1"
            >
              {SYSTEM_LABELS[system]}
              {count !== undefined && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {count}
                </Badge>
              )}
            </Label>
          </div>
        );
      })}
    </div>
  );
};

export default SystemFilters;
