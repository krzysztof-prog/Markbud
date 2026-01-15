'use client';

import { ProductionReportPage } from '@/features/production-reports/ProductionReportPage';
import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * Monthly Production Report Page
 * Raport miesięczny produkcji - zestawienie zleceń i rozliczenia
 */
export default function MonthlyProductionPage() {
  const { user } = useAuth();

  return (
    <div className="h-full overflow-auto">
      <ProductionReportPage userRole={user?.role} />
    </div>
  );
}
