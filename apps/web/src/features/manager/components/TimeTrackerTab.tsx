'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

/**
 * Zakładka Godzinówki - placeholder
 * Funkcjonalność będzie dodana w przyszłości
 */
export const TimeTrackerTab: React.FC = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            <CardTitle>Godzinówki</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Funkcjonalność w przygotowaniu...</p>
          <p className="text-sm text-gray-400 mt-2">
            Tutaj będzie można zarządzać godzinami pracy pracowników, śledzić czas produkcji i
            generować raporty godzinowe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeTrackerTab;
