'use client';

import { FlaggedOrdersPage } from '@/features/production-reports/components/FlaggedOrdersPage';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Header } from '@/components/layout/header';

/**
 * Strona "Zlecenia do sprawdzenia"
 * Lista zleceń z ostrzeżeniami (brak materiału, brak wartości, współczynnik poza zakresem)
 */
export default function FlaggedOrdersRoute() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <Header title="Zlecenia do sprawdzenia" />
      <div className="flex-1 overflow-auto">
        <FlaggedOrdersPage userRole={user?.role} />
      </div>
    </div>
  );
}
