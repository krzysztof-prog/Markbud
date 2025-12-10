'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

interface DeliveryFiltersProps {
  value: '7' | '14' | '30' | 'archive';
  onChange: (value: '7' | '14' | '30' | 'archive') => void;
  customStartDate?: string;
  onCustomStartDateChange?: (date: string) => void;
}

export function DeliveryFilters({
  value,
  onChange,
  customStartDate,
  onCustomStartDateChange
}: DeliveryFiltersProps) {
  const filters = [
    { id: '7', label: '+7 dni' },
    { id: '14', label: '+14 dni' },
    { id: '30', label: '+30 dni' },
    { id: 'archive', label: 'Archiwum' },
  ] as const;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Preset filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            variant={value === filter.id ? 'default' : 'outline'}
            onClick={() => onChange(filter.id)}
            className="whitespace-nowrap"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Custom start date picker */}
      {onCustomStartDateChange && (
        <div className="flex items-center gap-2 border rounded-md px-3 py-1 bg-white">
          <Calendar className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600 whitespace-nowrap">Od:</span>
          <Input
            type="date"
            value={customStartDate || ''}
            onChange={(e) => onCustomStartDateChange(e.target.value)}
            className="border-0 p-0 h-auto focus-visible:ring-0 text-sm"
          />
        </div>
      )}
    </div>
  );
}
