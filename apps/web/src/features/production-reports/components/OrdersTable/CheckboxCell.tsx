'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxCellProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  isPending?: boolean;
  label?: string;
}

export const CheckboxCell: React.FC<CheckboxCellProps> = ({
  checked,
  onChange,
  disabled = false,
  isPending = false,
  label,
}) => {
  if (isPending) {
    return (
      <div className="flex items-center justify-center h-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-8">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        disabled={disabled}
        aria-label={label}
        className={cn(disabled && 'opacity-50 cursor-not-allowed')}
      />
    </div>
  );
};

export default CheckboxCell;
