'use client';

/**
 * Karta statusu ostatniego pobrania danych Schuco
 *
 * Wyświetla:
 * - Status ostatniego pobrania (sukces/błąd/w trakcie)
 * - Statystyki: ilość rekordów, nowe, zmienione
 * - Opcje: checkbox pokazywania przeglądarki, przycisk odświeżania
 * - Info o harmonogramie automatycznego pobierania
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  PenLine,
  Timer,
} from 'lucide-react';
import type { SchucoFetchLog } from '@/types/schuco';
import type { SchucoStatistics } from '../types';
import { formatDatePL } from '../helpers/deliveryHelpers';

interface StatusCardProps {
  /** Status ostatniego pobrania */
  status: SchucoFetchLog;
  /** Statystyki zmian */
  statistics: SchucoStatistics | undefined;
  /** Czy trwa odświeżanie */
  isRefreshing: boolean;
  /** Czy pokazywać przeglądarkę podczas odświeżania */
  showBrowser: boolean;
  /** Callback zmiany opcji pokazywania przeglądarki */
  onShowBrowserChange: (show: boolean) => void;
  /** Callback odświeżenia danych */
  onRefresh: () => void;
}

/**
 * Komponent karty statusu
 */
export const StatusCard: React.FC<StatusCardProps> = ({
  status,
  statistics,
  isRefreshing,
  showBrowser,
  onShowBrowserChange,
  onRefresh,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Status ostatniego pobrania</CardTitle>
          <div className="flex items-center gap-4">
            {/* Checkbox pokazywania przeglądarki */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-browser"
                checked={showBrowser}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  onShowBrowserChange(!!checked)
                }
              />
              <Label htmlFor="show-browser" className="text-sm cursor-pointer">
                Pokaż przeglądarkę
              </Label>
            </div>

            {/* Przycisk odświeżania */}
            <Button
              onClick={onRefresh}
              disabled={isRefreshing}
              size="sm"
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? 'Pobieram...' : 'Odśwież dane'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Grid ze statystykami */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Status */}
          <div>
            <p className="text-sm text-slate-500">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <StatusIndicator status={status.status} />
            </div>
          </div>

          {/* Ilość rekordów */}
          <div>
            <p className="text-sm text-slate-500">W ostatnim pobraniu</p>
            <p className="font-semibold text-lg">{status.recordsCount || 0}</p>
          </div>

          {/* Nowe */}
          <div>
            <p className="text-sm text-slate-500">Nowe (łącznie)</p>
            <div className="flex items-center gap-2 mt-1">
              {statistics?.new != null && statistics.new > 0 ? (
                <Badge className="bg-green-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  +{statistics.new}
                </Badge>
              ) : (
                <span className="font-semibold text-lg text-slate-400">0</span>
              )}
            </div>
          </div>

          {/* Zmienione */}
          <div>
            <p className="text-sm text-slate-500">Zmienione (łącznie)</p>
            <div className="flex items-center gap-2 mt-1">
              {statistics?.updated != null && statistics.updated > 0 ? (
                <Badge className="bg-orange-500">
                  <PenLine className="h-3 w-3 mr-1" />
                  {statistics.updated}
                </Badge>
              ) : (
                <span className="font-semibold text-lg text-slate-400">0</span>
              )}
            </div>
          </div>

          {/* Data pobrania */}
          <div>
            <p className="text-sm text-slate-500">Data pobrania</p>
            <p className="font-semibold text-sm">
              {formatDatePL(status.startedAt)}
            </p>
          </div>
        </div>

        {/* Komunikat błędu */}
        {status.errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            <strong>Błąd:</strong> {status.errorMessage}
          </div>
        )}

        {/* Info o harmonogramie */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <Timer className="h-4 w-4 inline mr-2" />
          Automatyczne pobieranie: <strong>8:00, 12:00, 15:00</strong> (codziennie)
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Wskaźnik statusu (ikona + badge)
 */
interface StatusIndicatorProps {
  status: SchucoFetchLog['status'];
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  switch (status) {
    case 'success':
      return (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <Badge variant="default" className="bg-green-600">
            Sukces
          </Badge>
        </>
      );
    case 'error':
      return (
        <>
          <XCircle className="h-4 w-4 text-red-600" />
          <Badge variant="destructive">Błąd</Badge>
        </>
      );
    default:
      return (
        <>
          <Clock className="h-4 w-4 text-yellow-600" />
          <Badge variant="secondary">W trakcie</Badge>
        </>
      );
  }
};

export default StatusCard;
