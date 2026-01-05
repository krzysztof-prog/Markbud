'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Monthly Production Report Page - Placeholder
 * TODO: Implement monthly production report with proper data fetching and statistics
 */
export default function MonthlyProductionPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Raport miesięczny produkcji</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Strona w budowie</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Raport miesięczny produkcji zostanie wkrótce dodany.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
