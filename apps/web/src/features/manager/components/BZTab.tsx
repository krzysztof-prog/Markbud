'use client';

import React, { useState, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  MonthlyAttendanceTable,
  MonthSelector,
  ExportButtons,
  useMonthlyAttendance,
} from '@/features/attendance';

// Skeleton dla tabeli
const TableSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-10 bg-gray-200 rounded w-full" />
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="h-8 bg-gray-100 rounded w-full" />
    ))}
  </div>
);

// Komponent z danymi (używa useQuery)
const AttendanceContent: React.FC<{ year: number; month: number }> = ({ year, month }) => {
  const { data, isLoading, error } = useMonthlyAttendance(year, month);

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Błąd</AlertTitle>
        <AlertDescription>
          Nie udało się pobrać danych obecności. Spróbuj odświeżyć stronę.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.workers.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Brak danych</AlertTitle>
        <AlertDescription>
          Brak aktywnych pracowników w systemie. Dodaj pracowników w zakładce Godzinówki.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {!data.isEditable && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tryb tylko do odczytu</AlertTitle>
          <AlertDescription>
            Wybrany miesiąc jest zamknięty. Można edytować tylko bieżący miesiąc.
          </AlertDescription>
        </Alert>
      )}

      <MonthlyAttendanceTable data={data} />

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">8</span>
          <span>Praca (8h)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded">CH</span>
          <span>Choroba</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">UW</span>
          <span>Urlop</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded">N</span>
          <span>Nieobecność</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-gray-200 px-2 py-0.5 rounded">░░</span>
          <span>Weekend</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Zakładka B-Z - Bieżąca Zmiana - widok miesięczny obecności pracowników
 *
 * Funkcjonalności:
 * - Widok miesięczny wszystkich pracowników
 * - Inline editing (kliknięcie w komórkę otwiera dropdown)
 * - Podsumowanie: suma godzin, dni urlopu, choroby, nieobecności
 * - Eksport do Excel i PDF
 */
export const BZTab: React.FC = () => {
  // Domyślnie bieżący miesiąc
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <CardTitle>Bieżąca Zmiana - Obecności</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <MonthSelector year={year} month={month} onChange={handleMonthChange} />
              <ExportButtons year={year} month={month} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<TableSkeleton />}>
            <AttendanceContent year={year} month={month} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
};

export default BZTab;
