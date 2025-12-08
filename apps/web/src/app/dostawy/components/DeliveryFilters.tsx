'use client';

import { Button } from '@/components/ui/button';

interface DeliveryFiltersProps {
  value: '30' | '60' | '90' | 'archive';
  onChange: (value: '30' | '60' | '90' | 'archive') => void;
}

export function DeliveryFilters({ value, onChange }: DeliveryFiltersProps) {
  const filters = [
    { id: '30', label: '±30 dni' },
    { id: '60', label: '±60 dni' },
    { id: '90', label: '±90 dni' },
    { id: 'archive', label: 'Archiwum' },
  ] as const;

  return (
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
  );
}
