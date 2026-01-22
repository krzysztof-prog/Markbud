/**
 * Hook do nasłuchiwania postępu pobierania danych Schuco w czasie rzeczywistym
 *
 * Subskrybuje eventy WebSocket:
 * - schuco:fetch_started - rozpoczęcie pobierania
 * - schuco:fetch_progress - postęp (10%, 50%, 70%, 100%)
 * - schuco:fetch_completed - zakończenie sukcesu
 * - schuco:fetch_failed - błąd
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SCHUCO_QUERY_KEYS } from './useDeliveryActions';

interface SchucoProgressState {
  /** Czy trwa pobieranie */
  isActive: boolean;
  /** Postęp w procentach (0-100) */
  progress: number;
  /** Aktualny etap */
  stage: string;
  /** Dodatkowe szczegóły */
  details?: string;
  /** ID loga */
  logId?: number;
  /** Timestamp rozpoczęcia */
  startedAt?: Date;
  /** Błąd jeśli wystąpił */
  error?: string;
  /** Wynik jeśli zakończono */
  result?: {
    recordsCount: number;
    newRecords: number;
    updatedRecords: number;
    durationMs: number;
  };
}

const initialState: SchucoProgressState = {
  isActive: false,
  progress: 0,
  stage: '',
};

/**
 * Mapowanie etapów na procenty postępu i opisy
 */
const STAGE_PROGRESS: Record<string, number> = {
  'started': 5,
  'scraping': 10,
  'parsing': 50,
  'storing': 70,
  'completed': 100,
};

const STAGE_LABELS: Record<string, string> = {
  'started': 'Rozpoczęto pobieranie...',
  'scraping': 'Pobieranie danych ze strony Schuco...',
  'parsing': 'Parsowanie pliku CSV...',
  'storing': 'Zapisywanie do bazy danych...',
  'completed': 'Zakończono',
};

export function useSchucoRealtimeProgress() {
  const [state, setState] = useState<SchucoProgressState>(initialState);
  const queryClient = useQueryClient();
  const _wsRef = useRef<WebSocket | null>(null);

  // Funkcja do resetowania stanu
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // Nasłuchuj na WebSocket
  useEffect(() => {
    // Sprawdź czy jest połączenie WebSocket
    // Musimy nasłuchiwać na globalne eventy z useRealtimeSync
    // Zamiast tworzyć nowe połączenie, użyjemy custom event

    const handleSchucoEvent = (event: CustomEvent) => {
      const data = event.detail;

      switch (data.type) {
        case 'schuco:fetch_started':
          setState({
            isActive: true,
            progress: 5,
            stage: 'Rozpoczynam pobieranie...',
            logId: data.data?.logId,
            startedAt: new Date(),
          });
          break;

        case 'schuco:fetch_progress': {
          const progressData = data.data || {};
          const step = progressData.step || progressData.stage;
          setState(prev => ({
            ...prev,
            isActive: true,
            progress: progressData.progress || STAGE_PROGRESS[step] || prev.progress,
            stage: progressData.message || STAGE_LABELS[step] || prev.stage,
            details: progressData.recordsCount ? `Rekordów: ${progressData.recordsCount}` : undefined,
          }));
          break;
        }

        case 'schuco:fetch_completed': {
          const resultData = data.data || {};
          setState({
            isActive: false,
            progress: 100,
            stage: 'Zakończono',
            result: {
              recordsCount: resultData.recordsCount || 0,
              newRecords: resultData.newRecords || 0,
              updatedRecords: resultData.updatedRecords || 0,
              durationMs: resultData.durationMs || 0,
            },
          });
          // Invaliduj queries Schuco
          queryClient.invalidateQueries({ queryKey: SCHUCO_QUERY_KEYS.deliveries });
          queryClient.invalidateQueries({ queryKey: SCHUCO_QUERY_KEYS.status });
          queryClient.invalidateQueries({ queryKey: SCHUCO_QUERY_KEYS.statistics });
          queryClient.invalidateQueries({ queryKey: SCHUCO_QUERY_KEYS.logs });
          break;
        }

        case 'schuco:fetch_failed': {
          const errorData = data.data || {};
          setState(prev => ({
            ...prev,
            isActive: false,
            progress: 0,
            stage: 'Błąd',
            error: errorData.error || 'Nieznany błąd',
          }));
          // Invaliduj queries Schuco - nawet po błędzie
          queryClient.invalidateQueries({ queryKey: SCHUCO_QUERY_KEYS.status });
          queryClient.invalidateQueries({ queryKey: SCHUCO_QUERY_KEYS.logs });
          break;
        }
      }
    };

    // Dodaj listener na custom event
    window.addEventListener('schuco-progress', handleSchucoEvent as EventListener);

    return () => {
      window.removeEventListener('schuco-progress', handleSchucoEvent as EventListener);
    };
  }, [queryClient]);

  return {
    ...state,
    reset,
  };
}

export default useSchucoRealtimeProgress;
