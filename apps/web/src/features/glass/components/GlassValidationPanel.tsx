'use client';

import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardSkeleton } from '@/components/loaders/CardSkeleton';
import { useValidationDashboard } from '../hooks/useGlassDeliveries';

export function GlassValidationPanel() {
  const { data: dashboard, isLoading } = useValidationDashboard();

  if (isLoading) {
    return <CardSkeleton />;
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
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-2xl font-bold">{dashboard.stats.total}</p>
              <p className="text-xs text-gray-500">Wszystkie</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-600">{dashboard.stats.errors}</p>
              <p className="text-xs text-gray-500">Bledy</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-yellow-600">{dashboard.stats.warnings}</p>
              <p className="text-xs text-gray-500">Ostrzezenia</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Info className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold text-blue-600">{dashboard.stats.info}</p>
              <p className="text-xs text-gray-500">Info</p>
            </div>
          </div>
        </div>

        {dashboard.recentIssues.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Ostatnie problemy:</p>
            <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
              {dashboard.recentIssues.slice(0, 5).map((issue) => (
                <li key={issue.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                  {issue.severity === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  ) : issue.severity === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  ) : (
                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  )}
                  <span className="flex-1">{issue.message}</span>
                  <span className="text-xs text-gray-400 font-mono">{issue.orderNumber}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
