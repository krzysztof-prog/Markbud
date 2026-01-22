'use client';

import React, { useState, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AttendanceType } from '../types';
import { ATTENDANCE_DISPLAY_MAP, ATTENDANCE_COLORS } from '../types';

interface AttendanceCellProps {
  type: AttendanceType;
  isWeekend: boolean;
  isEditable: boolean;
  onUpdate: (type: 'work' | 'sick' | 'vacation' | 'absent' | 'clear') => void;
  isPending?: boolean;
}

export const AttendanceCell: React.FC<AttendanceCellProps> = ({
  type,
  isWeekend,
  isEditable,
  onUpdate,
  isPending = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const displayValue = type ? ATTENDANCE_DISPLAY_MAP[type] : '';
  const colorClass = type ? ATTENDANCE_COLORS[type] : '';

  const handleValueChange = useCallback(
    (value: string) => {
      onUpdate(value as 'work' | 'sick' | 'vacation' | 'absent' | 'clear');
      setIsOpen(false);
    },
    [onUpdate]
  );

  // Weekendy - pokaż tylko szare tło, bez dropdowna
  if (isWeekend) {
    return (
      <div
        className="w-full h-8 flex items-center justify-center text-xs bg-gray-200"
      >
        {/* Weekend - puste */}
      </div>
    );
  }

  // Jeśli nie edytowalne (poprzedni miesiąc), pokaż tylko wartość
  if (!isEditable) {
    return (
      <div
        className={cn(
          'w-full h-8 flex items-center justify-center text-xs font-medium',
          colorClass
        )}
      >
        {displayValue}
      </div>
    );
  }

  return (
    <Select
      value={type || 'empty'}
      onValueChange={handleValueChange}
      open={isOpen}
      onOpenChange={setIsOpen}
      disabled={isPending}
    >
      <SelectTrigger
        className={cn(
          'w-full h-8 text-xs font-medium border-0 rounded-none focus:ring-0 focus:ring-offset-0',
          colorClass,
          isPending && 'opacity-50'
        )}
      >
        <SelectValue placeholder="-">{displayValue || '-'}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="work">
          <span className="font-medium text-green-700">8</span>
          <span className="ml-2 text-gray-500">Praca</span>
        </SelectItem>
        <SelectItem value="sick">
          <span className="font-medium text-red-700">CH</span>
          <span className="ml-2 text-gray-500">Choroba</span>
        </SelectItem>
        <SelectItem value="vacation">
          <span className="font-medium text-blue-700">UW</span>
          <span className="ml-2 text-gray-500">Urlop</span>
        </SelectItem>
        <SelectItem value="absent">
          <span className="font-medium text-orange-700">N</span>
          <span className="ml-2 text-gray-500">Nieobecność</span>
        </SelectItem>
        <SelectItem value="clear">
          <span className="font-medium">-</span>
          <span className="ml-2 text-gray-500">Wyczyść</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default AttendanceCell;
