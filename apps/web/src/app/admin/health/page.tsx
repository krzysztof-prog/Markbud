import { Suspense } from 'react';
import { HealthDashboard } from './HealthDashboard';

// Wymuszenie dynamicznego renderowania - strona używa AuthContext
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'System Health - AKROBUD',
  description: 'Monitoring stanu systemu',
};

export default function HealthPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">System Health</h1>
        <p className="text-gray-600 mt-1">
          Monitoring stanu wszystkich systemów aplikacji
        </p>
      </div>

      <Suspense
        fallback={
          <div className="text-center py-12">
            <p className="text-gray-500">Ładowanie danych health check...</p>
          </div>
        }
      >
        <HealthDashboard />
      </Suspense>
    </div>
  );
}
