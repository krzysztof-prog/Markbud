'use client';

import { ProductionReportPage } from '@/features/production-reports/ProductionReportPage';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Header } from '@/components/layout/header';

/**
 * Monthly Production Report Page
 * Raport miesięczny produkcji - zestawienie zleceń i rozliczenia
 */
export default function MonthlyProductionPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <Header title="Zestawienie miesięczne" />
      <div className="flex-1 overflow-auto">
        <ProductionReportPage userRole={user?.role} />
      </div>
    </div>
  );
}
