'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// Polskie nazwy miesięcy
const POLISH_MONTHS = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

interface MonthSelectorProps {
  year: number;
  month: number;
  status: 'open' | 'closed';
  editedAfterClose?: boolean;
  onMonthChange: (year: number, month: number) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  year,
  month,
  status,
  editedAfterClose = false,
  onMonthChange,
}) => {
  const currentYear = new Date().getFullYear();
  // Generuj lata od 2020 do roku następnego
  const years = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i);

  const handleYearChange = (newYear: string) => {
    onMonthChange(parseInt(newYear, 10), month);
  };

  const handleMonthChange = (newMonth: string) => {
    onMonthChange(year, parseInt(newMonth, 10));
  };

  // Określ wariant badge na podstawie statusu
  const getBadgeVariant = () => {
    if (status === 'open') return 'default';
    if (editedAfterClose) return 'secondary';
    return 'outline';
  };

  const getBadgeText = () => {
    if (status === 'open') return 'OTWARTY';
    if (editedAfterClose) return 'ZAMKNIĘTY (edytowany)';
    return 'ZAMKNIĘTY';
  };

  const getBadgeClassName = () => {
    if (status === 'open') return 'bg-green-500 hover:bg-green-500 text-white';
    if (editedAfterClose) return 'bg-yellow-500 hover:bg-yellow-500 text-white';
    return 'bg-gray-400 hover:bg-gray-400 text-white';
  };

  return (
    <div className="flex items-center gap-3">
      {/* Selektor roku */}
      <Select value={year.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Rok" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Selektor miesiąca */}
      <Select value={month.toString()} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Miesiąc" />
        </SelectTrigger>
        <SelectContent>
          {POLISH_MONTHS.map((name, index) => (
            <SelectItem key={index + 1} value={(index + 1).toString()}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Badge statusu */}
      <Badge variant={getBadgeVariant()} className={getBadgeClassName()}>
        {getBadgeText()}
      </Badge>
    </div>
  );
};

export default MonthSelector;
