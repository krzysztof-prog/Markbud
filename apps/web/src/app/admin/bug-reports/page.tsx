import { Suspense } from 'react';
import { BugReportsList } from './BugReportsList';

// Wymuszenie dynamicznego renderowania - strona używa AuthContext
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Zgłoszenia błędów - AKROBUD',
  description: 'Lista zgłoszeń błędów od użytkowników',
};

export default function BugReportsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Zgłoszenia błędów</h1>
        <p className="text-gray-600 mt-1">
          Lista zgłoszeń problemów od użytkowników
        </p>
      </div>

      <Suspense
        fallback={
          <div className="text-center py-12">
            <p className="text-gray-500">Ładowanie zgłoszeń...</p>
          </div>
        }
      >
        <BugReportsList />
      </Suspense>
    </div>
  );
}
