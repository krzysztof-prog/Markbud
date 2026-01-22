'use client';

import React, { useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { AttendanceCell } from './AttendanceCell';
import { useUpdateDay } from '../hooks/useMonthlyAttendance';
import { getDayOfWeekName, formatDate } from '../helpers/dateHelpers';
import type { MonthlyAttendanceResponse, WorkerAttendance } from '../types';

interface MonthlyAttendanceTableProps {
  data: MonthlyAttendanceResponse;
}

export const MonthlyAttendanceTable: React.FC<MonthlyAttendanceTableProps> = ({ data }) => {
  const { workers, month, isEditable } = data;
  const { mutate: updateDay, isPending } = useUpdateDay();

  const handleCellUpdate = useCallback(
    (workerId: number, day: number, type: 'work' | 'sick' | 'vacation' | 'absent' | 'clear') => {
      const date = formatDate(month.year, month.month, day);
      updateDay({ workerId, date, type });
    },
    [month.year, month.month, updateDay]
  );

  // Generuj tablicę dni
  const days = Array.from({ length: month.daysInMonth }, (_, i) => i + 1);

  return (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            {/* Kolumna z nazwiskiem - sticky */}
            <TableHead className="sticky left-0 z-20 bg-gray-50 min-w-[150px] border-r">
              Pracownik
            </TableHead>

            {/* Kolumny z dniami */}
            {days.map((day) => {
              const isWeekend = month.weekends.includes(day);
              const dayName = getDayOfWeekName(month.year, month.month, day);

              return (
                <TableHead
                  key={day}
                  className={cn(
                    'text-center p-1 min-w-[40px] text-xs',
                    isWeekend && 'bg-gray-200'
                  )}
                >
                  <div>{day}</div>
                  <div className="text-[10px] text-gray-500">{dayName}</div>
                </TableHead>
              );
            })}

            {/* Kolumny podsumowań - sticky */}
            <TableHead className="sticky right-[120px] z-10 bg-gray-100 text-center min-w-[50px] border-l">
              Σ godz.
            </TableHead>
            <TableHead className="sticky right-[80px] z-10 bg-blue-50 text-center min-w-[40px] text-blue-700">
              UW
            </TableHead>
            <TableHead className="sticky right-[40px] z-10 bg-red-50 text-center min-w-[40px] text-red-700">
              CH
            </TableHead>
            <TableHead className="sticky right-0 z-10 bg-orange-50 text-center min-w-[40px] text-orange-700">
              N
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {workers.map((worker) => (
            <WorkerRow
              key={worker.id}
              worker={worker}
              days={days}
              weekends={month.weekends}
              year={month.year}
              monthNum={month.month}
              isEditable={isEditable}
              onCellUpdate={handleCellUpdate}
              isPending={isPending}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

interface WorkerRowProps {
  worker: WorkerAttendance;
  days: number[];
  weekends: number[];
  year: number;
  monthNum: number;
  isEditable: boolean;
  onCellUpdate: (workerId: number, day: number, type: 'work' | 'sick' | 'vacation' | 'absent' | 'clear') => void;
  isPending: boolean;
}

const WorkerRow: React.FC<WorkerRowProps> = ({
  worker,
  days,
  weekends,
  isEditable,
  onCellUpdate,
  isPending,
}) => {
  const handleUpdate = useCallback(
    (day: number) => (type: 'work' | 'sick' | 'vacation' | 'absent' | 'clear') => {
      onCellUpdate(worker.id, day, type);
    },
    [worker.id, onCellUpdate]
  );

  return (
    <TableRow className="hover:bg-gray-50/50">
      {/* Nazwisko - sticky */}
      <TableCell className="sticky left-0 z-10 bg-white border-r font-medium text-sm">
        {worker.name}
      </TableCell>

      {/* Komórki dni */}
      {days.map((day) => {
        const dayData = worker.days[day.toString()];
        const isWeekend = weekends.includes(day);

        return (
          <TableCell
            key={day}
            className={cn('p-0 border-r', isWeekend && 'bg-gray-200')}
          >
            <AttendanceCell
              type={dayData?.type || null}
              isWeekend={isWeekend}
              isEditable={isEditable}
              onUpdate={handleUpdate(day)}
              isPending={isPending}
            />
          </TableCell>
        );
      })}

      {/* Podsumowania - sticky */}
      <TableCell className="sticky right-[120px] z-10 bg-gray-50 text-center font-semibold border-l">
        {worker.summary.totalHours}
      </TableCell>
      <TableCell className="sticky right-[80px] z-10 bg-blue-50 text-center font-semibold text-blue-700">
        {worker.summary.vacationDays}
      </TableCell>
      <TableCell className="sticky right-[40px] z-10 bg-red-50 text-center font-semibold text-red-700">
        {worker.summary.sickDays}
      </TableCell>
      <TableCell className="sticky right-0 z-10 bg-orange-50 text-center font-semibold text-orange-700">
        {worker.summary.absentDays}
      </TableCell>
    </TableRow>
  );
};

export default MonthlyAttendanceTable;
