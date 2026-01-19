'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { showInfoToast, showErrorToast } from '@/lib/toast-helpers';
import { wsLogger } from '@/lib/logger';
import { getAuthToken, clearAuthToken } from '@/lib/auth-token';

interface DataChangeEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface WebSocketMessage {
  type: string;
  event?: DataChangeEvent;
  code?: string;
  message?: string;
  shouldRetry?: boolean;
}

// Kody błędów które powinny zatrzymać reconnect
const NON_RETRYABLE_ERROR_CODES = [
  'TOKEN_EXPIRED',
  'TOKEN_INVALID',
  'NO_TOKEN',
  'MAX_USER_CONNECTIONS', // Limit połączeń per user - nie ma sensu retry
  'MAX_CONNECTIONS', // Globalny limit - nie ma sensu retry
] as const;

const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:3001';
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

interface UseRealtimeSyncOptions {
  enabled?: boolean;
}

export function useRealtimeSync({ enabled = true }: UseRealtimeSyncOptions = {}) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Flaga do zatrzymania reconnect po błędzie auth (token expired/invalid)
  const authErrorRef = useRef(false);
  const authErrorToastShownRef = useRef(false);

  // Stabilne referencje dla funkcji - używamy ref pattern aby uniknąć re-kreacji
  const handlePingRef = useRef<(() => void) | undefined>(undefined);
  const resetHeartbeatTimeoutRef = useRef<(() => void) | undefined>(undefined);
  const handleDataChangeRef = useRef<((event: DataChangeEvent) => void) | undefined>(undefined);
  const handleNonRetryableErrorRef = useRef<((message: WebSocketMessage) => void) | undefined>(undefined);

  // Funkcja do obsługi błędów które nie powinny triggerować reconnect
  const handleNonRetryableError = useCallback((message: WebSocketMessage) => {
    wsLogger.warn('WebSocket non-retryable error:', message.code, message.message);
    authErrorRef.current = true; // Używamy tej samej flagi do zatrzymania reconnect

    // Dla błędów auth - wyczyść token
    if (message.code === 'TOKEN_EXPIRED' || message.code === 'TOKEN_INVALID' || message.code === 'NO_TOKEN') {
      clearAuthToken();
    }

    // Pokaż toast tylko raz
    if (!authErrorToastShownRef.current) {
      authErrorToastShownRef.current = true;

      switch (message.code) {
        case 'TOKEN_EXPIRED':
          showErrorToast(
            'Sesja wygasła',
            'Odśwież stronę aby wznowić synchronizację w czasie rzeczywistym'
          );
          break;
        case 'MAX_USER_CONNECTIONS':
          // Nie pokazuj błędu - to normalna sytuacja gdy user ma otwartych kilka zakładek
          wsLogger.info('Max user connections reached - WebSocket disabled for this tab');
          break;
        case 'MAX_CONNECTIONS':
          showErrorToast(
            'Serwer przeciążony',
            'Synchronizacja w czasie rzeczywistym tymczasowo niedostępna'
          );
          break;
        default:
          showErrorToast(
            'Błąd autoryzacji',
            'Synchronizacja w czasie rzeczywistym niedostępna'
          );
      }
    }
  }, []);
  handleNonRetryableErrorRef.current = handleNonRetryableError;

  // Funkcja do obsługi zmian danych - przechowujemy aktualną wersję w ref
  const handleDataChange = useCallback(
    (event: DataChangeEvent) => {
      wsLogger.debug('Data change event:', event.type);

      // Mapowanie event types do React Query query keys
      const queryKeyMap: Record<string, string[]> = {
        'delivery:created': ['deliveries-calendar-continuous', 'deliveries-calendar-batch'],
        'delivery:updated': ['deliveries-calendar-continuous', 'deliveries-calendar-batch', 'deliveries'],
        'delivery:deleted': ['deliveries-calendar-continuous', 'deliveries-calendar-batch', 'deliveries'],
        'order:created': ['orders', 'deliveries-calendar-continuous', 'deliveries-calendar-batch'],
        'order:updated': ['orders', 'deliveries-calendar-continuous', 'deliveries-calendar-batch'],
        'order:deleted': ['orders', 'deliveries-calendar-continuous', 'deliveries-calendar-batch'],
        'warehouse:stock_updated': ['warehouse'],
        'warehouse:stock_changed': ['warehouse'],
        'price:imported': ['pending-prices', 'orders'],
        'price:pending': ['pending-prices'],
      };

      const keysToInvalidate = queryKeyMap[event.type] || [];

      // Invalidate odpowiednie queries - używamy predicate aby dopasować wszystkie queries z danym kluczem
      keysToInvalidate.forEach((key) => {
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey as string[];
            return queryKey[0] === key;
          },
        });
      });

      // Jeśli to istotna zmiana, pokaż toast
      if (
        event.type.includes('created') ||
        event.type.includes('deleted') ||
        (event.type.includes('updated') && event.type.includes('stock')) ||
        event.type.startsWith('price:')
      ) {
        const messages: Record<string, string> = {
          'delivery:created': 'Nowa dostawa',
          'delivery:deleted': 'Dostawa usunięta',
          'order:created': 'Nowe zlecenie',
          'order:deleted': 'Zlecenie usunięte',
          'warehouse:stock_changed': 'Stan magazynu zmienił się',
          'price:imported': `Cena przypisana do zlecenia ${event.data?.orderNumber || ''}`,
          'price:pending': `Cena zapisana dla zlecenia ${event.data?.orderNumber || ''} (oczekuje na import zlecenia)`,
        };

        const message = messages[event.type];
        if (message) {
          showInfoToast('Synchronizacja', message);
        }
      }
    },
    [queryClient]
  );
  handleDataChangeRef.current = handleDataChange;

  // Funkcja do wysyłania pong na ping
  const handlePing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'pong' }));
    }
  }, []);
  handlePingRef.current = handlePing;

  // Funkcja do resetowania heartbeat timeout
  const resetHeartbeatTimeout = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    // Ustaw timeout - jeśli nie dostaniemy ping w ciągu 35 sekund, zamknij połączenie
    heartbeatTimeoutRef.current = setTimeout(() => {
      wsLogger.warn('Heartbeat timeout, reconnecting...');
      wsRef.current?.close();
    }, 35000);
  }, []);
  resetHeartbeatTimeoutRef.current = resetHeartbeatTimeout;

  // Funkcja do obsługi wiadomości WebSocket - używamy stabilnych referencji
  const handleMessage = useCallback(async (event: MessageEvent) => {
    try {
      let messageData: string;

      // Obsługa różnych typów danych WebSocket
      if (typeof event.data === 'string') {
        messageData = event.data;
      } else if (event.data instanceof Blob) {
        // Konwertuj Blob na string
        wsLogger.log('Received Blob message, converting to text...');
        messageData = await event.data.text();
        wsLogger.log('Blob converted:', messageData);
      } else {
        wsLogger.warn('Received unsupported message type:', typeof event.data);
        return;
      }

      const message: WebSocketMessage = JSON.parse(messageData);

      if (message.type === 'ping') {
        resetHeartbeatTimeoutRef.current?.();
        handlePingRef.current?.();
      } else if (message.type === 'dataChange' && message.event) {
        resetHeartbeatTimeoutRef.current?.();
        handleDataChangeRef.current?.(message.event);
      } else if (message.type === 'error') {
        // Sprawdź czy to błąd który powinien zatrzymać reconnect
        const isNonRetryable = message.code &&
          NON_RETRYABLE_ERROR_CODES.includes(message.code as typeof NON_RETRYABLE_ERROR_CODES[number]);

        if (isNonRetryable) {
          handleNonRetryableErrorRef.current?.(message);
        } else {
          wsLogger.warn('WebSocket error:', message.message);
        }
      }
    } catch (error) {
      // Loguj tylko błąd bez szczegółów, aby uniknąć logowania całego obiektu
      if (error instanceof Error) {
        wsLogger.error('Failed to parse WebSocket message:', error.message);
      } else {
        wsLogger.error('Failed to parse WebSocket message');
      }
    }
  }, []); // Puste dependency array - wszystkie zależności są w ref-ach

  // Funkcja do nawiązania połączenia WebSocket - używamy stabilnej referencji
  const connectRef = useRef<(() => void) | undefined>(undefined);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Już połączeni
    }

    // Sprawdź czy był błąd auth - nie próbuj reconnect
    if (authErrorRef.current) {
      wsLogger.warn('WebSocket reconnect skipped due to auth error');
      return;
    }

    try {
      // Get authentication token - używamy timeout aby nie blokować
      const tokenPromise = getAuthToken();
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 2000) // Max 2s na pobranie tokenu
      );

      const token = await Promise.race([tokenPromise, timeoutPromise]);

      if (!token) {
        wsLogger.warn('No authentication token available - WebSocket disabled');
        // NIE próbuj reconnect - brak tokenu to nie błąd przejściowy
        reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;
        return;
      }

      // Include token in WebSocket URL as query parameter
      const wsUrl = `${WS_URL}/ws?token=${encodeURIComponent(token)}`;
      wsLogger.log('Connecting to WebSocket with authentication...');

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        wsLogger.log('Connected');
        isConnectedRef.current = true;
        reconnectAttemptsRef.current = 0;
        resetHeartbeatTimeoutRef.current?.();
        // NIE pokazuj toast - zbyt nachalne, user nie musi wiedzieć o WebSocket
        // showInfoToast('Połączenie', 'Synchronizacja w real-time aktywna');
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onerror = (error) => {
        wsLogger.warn('WebSocket error occurred', error);
        isConnectedRef.current = false;
        // NIE próbuj od razu reconnect - czekaj na onclose
      };

      wsRef.current.onclose = (event) => {
        wsLogger.log('Disconnected', { code: event.code, reason: event.reason });
        isConnectedRef.current = false;

        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }

        // Jeśli był błąd auth (obsłużony przez handleMessage), nie reconnect
        if (authErrorRef.current) {
          wsLogger.warn('WebSocket closed after auth error - not reconnecting');
          return;
        }

        // Jeśli zamknięcie było z powodu błędu auth (1008), nie reconnect
        if (event.code === 1008) {
          wsLogger.warn('WebSocket closed due to auth error - not reconnecting');
          reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;
          return;
        }

        // Spróbuj ponownie połączyć się (z exponential backoff)
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(
            RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttemptsRef.current - 1),
            30000 // Max 30s
          );

          wsLogger.log(
            `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current?.();
          }, delay);
        } else {
          wsLogger.warn('Max reconnection attempts reached - WebSocket disabled');
        }
      };
    } catch (error) {
      wsLogger.error('Connection error:', error);
      isConnectedRef.current = false;

      // Jeśli błąd przy tworzeniu WebSocket, nie próbuj zbyt agresywnie
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(
          RECONNECT_INTERVAL * Math.pow(2, reconnectAttemptsRef.current - 1),
          60000 // Max 60s dla błędów inicjalizacji
        );

        wsLogger.log(`Will retry in ${delay}ms after connection error`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current?.();
        }, delay);
      } else {
        wsLogger.warn('Max reconnection attempts reached after errors - WebSocket disabled');
      }
    }
  }, [handleMessage]); // handleMessage jest teraz stabilny
  connectRef.current = connect;

  // Cleanup - teraz z enabled w dependency array
  useEffect(() => {
    // Nie łącz się gdy wyłączony
    if (!enabled) {
      return;
    }

    // Flaga do sprawdzenia czy komponent jest jeszcze zamontowany
    // (ważne dla React Strict Mode który montuje 2x w development)
    let isMounted = true;

    // Opóźnij połączenie o 100ms żeby dać czas na ewentualny unmount (Strict Mode)
    const connectTimeout = setTimeout(() => {
      if (isMounted) {
        connectRef.current?.();
      }
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(connectTimeout);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [enabled]); // Tylko enabled w dependency - połączenie nawiązane raz gdy enabled=true

  return {
    isConnected: isConnectedRef.current,
  };
}
