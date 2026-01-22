'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { POLISH_MONTHS, getPreviousMonth, getNextMonth } from '../helpers/dateHelpers';

interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ year, month, onChange }) => {
  const handlePrevious = () => {
    const prev = getPreviousMonth(year, month);
    onChange(prev.year, prev.month);
  };

  const handleNext = () => {
    const next = getNextMonth(year, month);
    onChange(next.year, next.month);
  };

  const handleToday = () => {
    const now = new Date();
    onChange(now.getFullYear(), now.getMonth() + 1);
  };

  return (
    <div className="flex items-center gap-4">
      <Button variant="outline" size="icon" onClick={handlePrevious}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-[180px] text-center">
        <span className="text-lg font-semibold">
          {POLISH_MONTHS[month - 1]} {year}
        </span>
      </div>

      <Button variant="outline" size="icon" onClick={handleNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="sm" onClick={handleToday}>
        Dziś
      </Button>
    </div>
  );
};

export default MonthSelector;
