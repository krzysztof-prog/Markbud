'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface FolderStatus {
  name: string;
  status: string;
}

interface ImportStatus {
  id: string;
  type: string;
  status: string;
  createdAt: string;
}

interface HealthCheckResult {
  status: 'ok' | 'warning' | 'error';
  message?: string;
  details?: {
    folders?: FolderStatus[];
    imports?: ImportStatus[];
    [key: string]: unknown;
  };
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  checks?: {
    database?: HealthCheckResult;
    diskSpace?: HealthCheckResult;
    networkFolders?: HealthCheckResult;
    lastImports?: HealthCheckResult;
    uptime?: HealthCheckResult;
  };
}

export function HealthDashboard() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery<HealthData>({
    queryKey: ['health-detailed'],
    queryFn: () => fetchApi<HealthData>('/api/health/detailed'),
    refetchInterval: 30000, // Odświeżaj co 30s
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ładowanie...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Błąd</AlertTitle>
        <AlertDescription>
          {error instanceof Error
            ? error.message
            : 'Nie udało się pobrać danych health check'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertTitle>Brak danych</AlertTitle>
        <AlertDescription>
          Nie udało się pobrać danych health check. Spróbuj odświeżyć stronę.
        </AlertDescription>
      </Alert>
    );
  }

  // Domyślne wartości dla brakujących checks
  const defaultCheck: HealthCheckResult = {
    status: 'error',
    message: 'Brak danych - sprawdzenie niedostępne',
  };

  // Bezpieczne pobieranie checks z obsługą undefined
  const rawChecks = data.checks ?? {};
  const checks = {
    database: rawChecks.database ?? defaultCheck,
    diskSpace: rawChecks.diskSpace ?? defaultCheck,
    networkFolders: rawChecks.networkFolders ?? defaultCheck,
    lastImports: rawChecks.lastImports ?? defaultCheck,
    uptime: rawChecks.uptime ?? defaultCheck,
  };

  return (
    <div className="space-y-6">
      {/* Header z ogólnym statusem */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Status Ogólny</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Środowisko: <strong>{data.environment || 'unknown'}</strong> | Ostatnie
              sprawdzenie:{' '}
              <strong>{data.timestamp ? new Date(data.timestamp).toLocaleString('pl-PL') : '-'}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={data.status || 'unhealthy'} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Grid ze wszystkimi checks */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatusCard
          title="Baza Danych"
          check={checks.database}
                  />
        <StatusCard
          title="Miejsce na dysku"
          check={checks.diskSpace}
                  />
        <StatusCard
          title="Foldery sieciowe"
          check={checks.networkFolders}
                    details={
            checks.networkFolders?.details?.folders &&
            Array.isArray(checks.networkFolders.details.folders) && (
              <ul className="text-xs space-y-1 mt-2">
                {checks.networkFolders.details.folders.map(
                  (folder, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          folder.status === 'ok'
                            ? 'bg-green-500'
                            : folder.status === 'warning'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                      />
                      <span className="truncate">{folder.name}</span>
                    </li>
                  )
                )}
              </ul>
            )
          }
        />
        <StatusCard
          title="Ostatnie importy"
          check={checks.lastImports}
                    details={
            checks.lastImports?.details?.imports &&
            Array.isArray(checks.lastImports.details.imports) && (
              <ul className="text-xs space-y-1 mt-2">
                {checks.lastImports.details.imports
                  .slice(0, 3)
                  .map((imp) => (
                    <li key={imp.id}>
                      {imp.type}: {imp.status} (
                      {new Date(imp.createdAt).toLocaleString('pl-PL', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      )
                    </li>
                  ))}
              </ul>
            )
          }
        />
        <StatusCard
          title="Uptime"
          check={checks.uptime}
                  />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'healthy' | 'degraded' | 'unhealthy' }) {
  const variants = {
    healthy: { label: 'Healthy', className: 'bg-green-100 text-green-800' },
    degraded: { label: 'Degraded', className: 'bg-yellow-100 text-yellow-800' },
    unhealthy: { label: 'Unhealthy', className: 'bg-red-100 text-red-800' },
  };

  const variant = variants[status];

  return <Badge className={variant.className}>{variant.label}</Badge>;
}

interface StatusCardProps {
  title: string;
  check: HealthCheckResult;
  details?: React.ReactNode;
}

function StatusCard({ title, check, details }: StatusCardProps) {
  const getIcon = () => {
    switch (check.status) {
      case 'ok':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getBgColor = () => {
    switch (check.status) {
      case 'ok':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <Card className={`border-2 ${getBgColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {getIcon()}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700">{check.message || 'Brak informacji'}</p>

        {/* Szczegóły */}
        {check.details && !details && (
          <div className="mt-2 text-xs text-gray-600 space-y-1">
            {typeof check.details === 'object' &&
              Object.entries(check.details).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span> {String(value)}
                </div>
              ))}
          </div>
        )}

        {/* Custom details */}
        {details}
      </CardContent>
    </Card>
  );
}
