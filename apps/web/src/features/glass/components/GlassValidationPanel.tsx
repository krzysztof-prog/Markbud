'use client';

import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardSkeleton } from '@/components/loaders/CardSkeleton';
import { useValidationDashboard } from '../hooks/useGlassDeliveries';

export function GlassValidationPanel() {
  const { data: dashboard, isLoading } = useValidationDashboard();

  // Spójny wrapper Card dla wszystkich stanów - zapobiega layout shift
  if (isLoading) {
    return (
      <Card>
        <CardSkeleton />
      </Card>
    );
  }

  if (!dashboard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status walidacji</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Brak danych walidacji</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Status walidacji</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-2xl font-bold">{dashboard.stats.total}</p>
              <p className="text-xs text-gray-500 truncate">Nierozwiązane</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-2xl font-bold text-red-600">{dashboard.stats.errors}</p>
              <p className="text-xs text-gray-500 truncate">Błędy</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-2xl font-bold text-yellow-600">{dashboard.stats.warnings}</p>
              <p className="text-xs text-gray-500 truncate">Ostrzeżenia</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-2xl font-bold text-blue-600">{dashboard.stats.info}</p>
              <p className="text-xs text-gray-500 truncate">Informacje</p>
            </div>
          </div>
        </div>

        {Object.keys(dashboard.stats.byType).length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Typy problemów:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(dashboard.stats.byType).map(([type, count]) => (
                <div key={type} className="text-xs">
                  <p className="font-medium text-gray-700 truncate">{type}</p>
                  <p className="text-gray-500">{count} szt.</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {dashboard.recentIssues.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Ostatnie problemy ({dashboard.recentIssues.length}):</p>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2 bg-gray-50">
              {dashboard.recentIssues.map((issue) => (
                <div key={issue.id} className="flex gap-2 p-2 bg-white rounded border border-gray-200">
                  <div className="flex-shrink-0">
                    {issue.severity === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    ) : issue.severity === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">{issue.message}</p>
                    <div className="flex gap-2 mt-1 text-xs text-gray-500">
                      <span className="font-mono">{issue.orderNumber}</span>
                      {issue.validationType && (
                        <span className="bg-gray-200 px-2 py-0.5 rounded">
                          {issue.validationType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dashboard.recentIssues.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Brak nierozwiązanych problemów ✓</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
