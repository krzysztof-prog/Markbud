'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

/**
 * Zakładka B-Z - placeholder
 * Funkcjonalność będzie dodana w przyszłości
 */
export const BZTab: React.FC = () => {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <CardTitle>B-Z</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Funkcjonalność w przygotowaniu...</p>
          <p className="text-sm text-gray-400 mt-2">
            Tutaj będzie funkcjonalność związana z dokumentami B-Z.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BZTab;
