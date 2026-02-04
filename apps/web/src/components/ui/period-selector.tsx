/**
 * PeriodSelector - Reusable component for month/year selection
 *
 * Features:
 * - Month dropdown
 * - Year dropdown
 * - Previous/Next month navigation
 * - Optional statistics display
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

interface StatItem {
  label: string;
  value: number | string;
  /** Opcjonalny kolor wartości (np. 'text-green-600') */
  valueClassName?: string;
}

interface PeriodSelectorProps {
  /** Wybrany miesiąc (1-12) */
  month: number;
  /** Wybrany rok */
  year: number;
  /** Handler zmiany miesiąca */
  onMonthChange: (month: number) => void;
  /** Handler zmiany roku */
  onYearChange: (year: number) => void;
  /** Dostępne lata do wyboru */
  availableYears?: number[];
  /** Opcjonalne statystyki do wyświetlenia */
  stats?: StatItem[];
  /** Czy komponent jest wyłączony */
  disabled?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  month,
  year,
  onMonthChange,
  onYearChange,
  availableYears,
  stats,
  disabled = false,
  className = '',
}) => {
  // Domyślne dostępne lata (od 2024 do +1 rok od aktualnego)
  const currentYear = new Date().getFullYear();
  const years = availableYears || Array.from(
    { length: currentYear - 2024 + 2 },
    (_, i) => 2024 + i
  );

  const handlePrevMonth = () => {
    let newMonth = month - 1;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    onMonthChange(newMonth);
    if (newYear !== year) {
      onYearChange(newYear);
    }
  };

  const handleNextMonth = () => {
    let newMonth = month + 1;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    onMonthChange(newMonth);
    if (newYear !== year) {
      onYearChange(newYear);
    }
  };

  return (
    <div className={`flex items-center gap-4 p-3 bg-slate-50 rounded-lg border ${className}`}>
      <span className="text-sm font-medium text-slate-600">Okres:</span>

      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrevMonth}
        disabled={disabled}
        aria-label="Poprzedni miesiąc"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select
        value={month.toString()}
        onValueChange={(val) => onMonthChange(parseInt(val, 10))}
        disabled={disabled}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((name, idx) => (
            <SelectItem key={idx + 1} value={(idx + 1).toString()}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={year.toString()}
        onValueChange={(val) => onYearChange(parseInt(val, 10))}
        disabled={disabled}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleNextMonth}
        disabled={disabled}
        aria-label="Następny miesiąc"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Statystyki */}
      {stats && stats.length > 0 && (
        <div className="ml-auto flex items-center gap-4 text-sm">
          {stats.map((stat, idx) => (
            <span key={idx} className="text-slate-500">
              {stat.label}:{' '}
              <strong className={stat.valueClassName || 'text-slate-700'}>
                {stat.value}
              </strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PeriodSelector;
