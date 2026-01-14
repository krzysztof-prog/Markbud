'use client';

/**
 * Zakładka z historią pobrań danych ze Schuco
 *
 * Wyświetla logi pobrań z informacją o statusie, czasie i błędach.
 * Umożliwia czyszczenie pending logów.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/loaders/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SchucoFetchLog } from '@/types/schuco';
import { formatDuration, formatDatePL } from '../helpers/deliveryHelpers';

interface FetchLogsTabProps {
  /** Lista logów pobrań */
  logs: SchucoFetchLog[];
  /** Czy dane się ładują */
  isLoading: boolean;
  /** Czy trwa czyszczenie pending logów */
  isCleaningUp: boolean;
  /** Callback czyszczenia pending logów */
  onCleanupPending: () => void;
}

/**
 * Komponent zakładki historii pobrań
 */
export const FetchLogsTab: React.FC<FetchLogsTabProps> = ({
  logs,
  isLoading,
  isCleaningUp,
  onCleanupPending,
}) => {
  // Policz pending logi
  const pendingLogsCount = useMemo(() => {
    return logs.filter((log) => log.status === 'pending').length;
  }, [logs]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Historia pobrań</CardTitle>
          {pendingLogsCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCleanupPending}
              disabled={isCleaningUp}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              <Trash2
                className={cn('h-4 w-4 mr-2', isCleaningUp && 'animate-spin')}
              />
              Wyczyść {pendingLogsCount} pending
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-12 w-12" />}
            title="Brak historii"
            description="Nie znaleziono historii pobierań danych ze Schuco."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Data</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Trigger</th>
                  <th className="text-left p-3 font-medium">Rekordów</th>
                  <th className="text-left p-3 font-medium">Nowe</th>
                  <th className="text-left p-3 font-medium">Zmienione</th>
                  <th className="text-left p-3 font-medium">Czas</th>
                  <th className="text-left p-3 font-medium">Błąd</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <FetchLogRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Pojedynczy wiersz tabeli logów
 */
interface FetchLogRowProps {
  log: SchucoFetchLog;
}

const FetchLogRow: React.FC<FetchLogRowProps> = ({ log }) => {
  return (
    <tr className="border-b hover:bg-slate-50">
      <td className="p-3">
        {log.startedAt && formatDatePL(log.startedAt)}
      </td>
      <td className="p-3">
        <StatusBadge status={log.status} />
      </td>
      <td className="p-3">
        <Badge variant={log.triggerType === 'manual' ? 'default' : 'secondary'}>
          {log.triggerType === 'manual' ? 'Ręczny' : 'Automatyczny'}
        </Badge>
      </td>
      <td className="p-3 text-slate-600">{log.recordsCount || '-'}</td>
      <td className="p-3">
        {log.newRecords != null && log.newRecords > 0 ? (
          <Badge className="bg-green-600 text-xs">+{log.newRecords}</Badge>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>
      <td className="p-3">
        {log.updatedRecords != null && log.updatedRecords > 0 ? (
          <Badge className="bg-orange-500 text-xs">{log.updatedRecords}</Badge>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>
      <td className="p-3 text-slate-600">
        {log.durationMs ? formatDuration(log.durationMs) : '-'}
      </td>
      <td className="p-3 text-red-600 text-xs max-w-xs truncate">
        {log.errorMessage || '-'}
      </td>
    </tr>
  );
};

/**
 * Badge statusu loga
 */
interface StatusBadgeProps {
  status: SchucoFetchLog['status'];
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'success':
      return (
        <Badge variant="default" className="bg-green-600">
          Sukces
        </Badge>
      );
    case 'error':
      return <Badge variant="destructive">Błąd</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
};

export default FetchLogsTab;
