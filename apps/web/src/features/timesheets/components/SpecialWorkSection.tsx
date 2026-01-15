'use client';

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSpecialWorkTypes } from '../hooks/useTimesheets';
import type { SpecialWorkInput } from '../types';
import { roundToHalfHour, formatHours } from '../helpers/dateHelpers';

interface SpecialWorkSectionProps {
  specialWorks: SpecialWorkInput[];
  onChange: (specialWorks: SpecialWorkInput[]) => void;
}

export const SpecialWorkSection: React.FC<SpecialWorkSectionProps> = ({
  specialWorks,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(specialWorks.length > 0);

  // Pobieranie typów nietypówek
  const { data: specialWorkTypes = [] } = useSpecialWorkTypes(true);

  // Suma godzin nietypówek
  const totalHours = useMemo(
    () => specialWorks.reduce((sum, sw) => sum + sw.hours, 0),
    [specialWorks]
  );

  // Automatycznie otwórz gdy są wpisy
  useEffect(() => {
    if (specialWorks.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [specialWorks.length, isOpen]);

  // Dodaj nowy wpis
  const handleAddWork = useCallback(() => {
    const defaultType = specialWorkTypes[0];
    if (!defaultType) return;

    onChange([
      ...specialWorks,
      {
        specialTypeId: defaultType.id,
        hours: 1,
        notes: null,
      },
    ]);
    // Otwórz sekcję gdy dodajemy wpis
    setIsOpen(true);
  }, [specialWorks, specialWorkTypes, onChange]);

  // Usuń wpis
  const handleRemoveWork = useCallback(
    (index: number) => {
      onChange(specialWorks.filter((_, i) => i !== index));
    },
    [specialWorks, onChange]
  );

  // Zmień typ nietypówki
  const handleTypeChange = useCallback(
    (index: number, specialTypeId: number) => {
      const newWorks = [...specialWorks];
      newWorks[index] = { ...newWorks[index], specialTypeId };
      onChange(newWorks);
    },
    [specialWorks, onChange]
  );

  // Zmień godziny
  const handleHoursChange = useCallback(
    (index: number, value: string) => {
      const hours = parseFloat(value) || 0;
      const newWorks = [...specialWorks];
      newWorks[index] = {
        ...newWorks[index],
        hours: roundToHalfHour(Math.max(0, Math.min(24, hours))),
      };
      onChange(newWorks);
    },
    [specialWorks, onChange]
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      {/* Naglowek z triggerem */}
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium hover:text-muted-foreground transition-colors"
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>Nietypówki</span>
            {totalHours > 0 && (
              <Badge variant="secondary" className="ml-1 text-purple-600">
                {formatHours(totalHours)}
              </Badge>
            )}
          </button>
        </CollapsibleTrigger>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddWork}
          disabled={specialWorkTypes.length === 0}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          Dodaj
        </Button>
      </div>

      {/* Zawartosc zwijana */}
      <CollapsibleContent className="space-y-2">
        {specialWorks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Brak nietypówek
          </p>
        ) : (
          <div className="space-y-2">
            {specialWorks.map((work, index) => (
              <div key={index} className="flex items-center gap-2">
                {/* Typ nietypówki */}
                <Select
                  value={work.specialTypeId.toString()}
                  onValueChange={(val) => handleTypeChange(index, parseInt(val))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {specialWorkTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                        {type.shortName && ` (${type.shortName})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Godziny */}
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={work.hours}
                  onChange={(e) => handleHoursChange(index, e.target.value)}
                  className="w-20"
                />

                {/* Usuń */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveWork(index)}
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Info box */}
        <div className="flex items-start gap-2 p-2 bg-purple-50 rounded-md text-xs text-purple-700">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Nietypówki są rejestrowane do przyszłej analizy wydajności
          </span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SpecialWorkSection;
