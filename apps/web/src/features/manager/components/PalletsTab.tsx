'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

/**
 * Zakładka Paletówki - placeholder
 * Funkcjonalność będzie dodana w przyszłości
 */
export const PalletsTab: React.FC = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            <CardTitle>Paletówki</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Funkcjonalność w przygotowaniu...</p>
          <p className="text-sm text-gray-400 mt-2">
            Tutaj będzie można zarządzać paletami, śledzić optymalizację pakowania i generować
            dokumenty paletowe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PalletsTab;
