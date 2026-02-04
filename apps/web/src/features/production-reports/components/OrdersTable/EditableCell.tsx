'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateWarsaw } from '@/lib/date-utils';

interface EditableCellProps {
  value: number | string | null;
  type: 'number' | 'text' | 'date';
  onChange: (value: number | string | null) => void;
  disabled?: boolean;
  isPending?: boolean;
  placeholder?: string;
  suffix?: string;
  isMoneyGrosze?: boolean; // Jeśli true, wartość jest w groszach - wyświetl w PLN
  align?: 'left' | 'center' | 'right'; // wyrównanie tekstu
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  type,
  onChange,
  disabled = false,
  isPending = false,
  placeholder = '-',
  suffix,
  isMoneyGrosze = false,
  align = 'left',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Konwertuj wartość do wyświetlenia
  const getDisplayValue = (): string => {
    if (value === null || value === undefined || value === '') {
      return placeholder;
    }
    if (isMoneyGrosze && typeof value === 'number') {
      // Wartość w groszach → PLN
      return (value / 100).toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    if (type === 'number' && typeof value === 'number') {
      return value.toLocaleString('pl-PL');
    }
    if (type === 'date' && value) {
      // Formatuj datę
      const date = new Date(value);
      return date.toLocaleDateString('pl-PL');
    }
    return String(value);
  };

  // Rozpocznij edycję
  const startEditing = () => {
    if (disabled || isPending) return;

    // Przygotuj wartość do edycji
    if (isMoneyGrosze && typeof value === 'number') {
      setLocalValue((value / 100).toString());
    } else if (type === 'date' && value) {
      // Format YYYY-MM-DD dla input type=date
      // value tutaj to string (bo type === 'date')
      setLocalValue(formatDateWarsaw(value as string));
    } else {
      setLocalValue(value?.toString() || '');
    }

    setIsEditing(true);
  };

  // Zapisz i zakończ edycję
  const saveAndClose = () => {
    setIsEditing(false);

    if (localValue === '' || localValue === null) {
      onChange(null);
      return;
    }

    if (type === 'number') {
      const numValue = parseFloat(localValue.replace(',', '.'));
      if (isNaN(numValue)) {
        onChange(null);
      } else if (isMoneyGrosze) {
        // Konwertuj PLN → grosze
        onChange(Math.round(numValue * 100));
      } else {
        onChange(numValue);
      }
    } else if (type === 'date') {
      onChange(localValue);
    } else {
      onChange(localValue);
    }
  };

  // Anuluj edycję
  const cancelEdit = () => {
    setIsEditing(false);
  };

  // Focus input po rozpoczęciu edycji
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Obsługa klawiszy
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveAndClose();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
        step={isMoneyGrosze ? '0.01' : type === 'number' ? '1' : undefined}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={saveAndClose}
        onKeyDown={handleKeyDown}
        className="h-8 text-sm"
      />
    );
  }

  // Klasa wyrównania
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[align];

  return (
    <div
      onClick={startEditing}
      className={cn(
        'flex items-center h-8 px-2 rounded cursor-pointer group',
        alignClass,
        disabled
          ? 'cursor-default text-muted-foreground'
          : 'hover:bg-muted/50'
      )}
    >
      <span className={cn(value === null && 'text-muted-foreground')}>
        {getDisplayValue()}
        {suffix && value !== null && ` ${suffix}`}
      </span>
      {!disabled && (
        <Pencil className="h-3 w-3 ml-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </div>
  );
};

export default EditableCell;
