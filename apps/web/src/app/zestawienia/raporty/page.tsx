'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GenerateReportForm } from '@/components/monthly-reports/GenerateReportForm';
import { MonthlyReportsList } from '@/components/monthly-reports/MonthlyReportsList';
import { CurrencyConfig } from '@/components/monthly-reports/CurrencyConfig';
import { TrendingUp, DollarSign } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function MonthlyReportsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const queryClient = useQueryClient();

  const handleReportGenerated = () => {
    // Refresh the reports list
    queryClient.invalidateQueries({ queryKey: ['monthlyReports'] });
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Zestawienia Miesięczne" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <Breadcrumb
          items={[
            { label: 'Zestawienia', icon: <TrendingUp className="h-4 w-4" /> },
            { label: 'Raporty Miesięczne', icon: <TrendingUp className="h-4 w-4" /> },
          ]}
        />

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="reports">Raporty</TabsTrigger>
            <TabsTrigger value="settings">Ustawienia</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-6">
            <GenerateReportForm onSuccess={handleReportGenerated} />
            <MonthlyReportsList key={refreshKey} limit={12} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <CurrencyConfig />

            <Card className="bg-blue-50 border-blue-200">
              <div className="pt-6 px-6 pb-6">
                <p className="text-sm text-blue-900">
                  <strong>Informacja:</strong> W tej sekcji możesz zarządzać kursem wymiany EUR/PLN.
                  Kurs jest używany do konwersji wartości zleceń w raportach.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-green-50 border-green-200">
          <div className="pt-6 px-6 pb-6">
            <h3 className="font-semibold text-green-900 mb-2">Jak korzystać z raportów?</h3>
            <ul className="text-sm text-green-900 space-y-1 list-disc list-inside">
              <li>Wybierz rok i miesiąc, a następnie kliknij "Generuj raport"</li>
              <li>Raport będzie zawierać wszystkie zlecenia z fakturą z wybranego miesiąca</li>
              <li>Możesz pobrać raport w formacie Excel lub PDF</li>
              <li>Upewniaj się, że kurs EUR/PLN jest prawidłowo ustawiony przed generowaniem raportu</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
