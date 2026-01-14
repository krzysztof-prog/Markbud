'use client';

/**
 * Alert krytycznego błędu pobierania danych Schuco
 *
 * Wyświetla się gdy ostatnie automatyczne pobranie zakończyło się błędem.
 * Zawiera szczegóły błędu i przycisk do ponownej próby.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { SchucoFetchLog } from '@/types/schuco';
import { formatDatePL } from '../helpers/deliveryHelpers';

interface CriticalErrorAlertProps {
  /** Status z błędem */
  status: SchucoFetchLog;
  /** Czy trwa odświeżanie */
  isRefreshing: boolean;
  /** Callback odświeżenia danych */
  onRefresh: () => void;
}

/**
 * Komponent alertu błędu krytycznego
 */
export const CriticalErrorAlert: React.FC<CriticalErrorAlertProps> = ({
  status,
  isRefreshing,
  onRefresh,
}) => {
  // Wyświetl tylko gdy status to error
  if (status.status !== 'error') {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-red-600 text-white rounded-lg shadow-lg animate-pulse">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-bold">Błąd pobierania danych Schuco!</h3>
          <p className="text-red-100 mt-1">
            Ostatnie automatyczne pobranie danych nie powiodło się.
            {status.errorMessage && (
              <span className="block mt-1 text-sm">
                Szczegóły: {status.errorMessage}
              </span>
            )}
          </p>
          <p className="text-red-200 text-sm mt-2">
            Data próby: {formatDatePL(status.startedAt)}
          </p>
        </div>
        <Button
          onClick={onRefresh}
          disabled={isRefreshing}
          variant="secondary"
          className="bg-white text-red-600 hover:bg-red-50"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Spróbuj ponownie
        </Button>
      </div>
    </div>
  );
};

export default CriticalErrorAlert;
