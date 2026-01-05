'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { showInfoToast } from '@/lib/toast-helpers';
import { wsLogger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

interface DataChangeEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface WebSocketMessage {
  type: string;
  event?: DataChangeEvent;
}

const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:3001';
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stabilne referencje dla funkcji - używamy ref pattern aby uniknąć re-kreacji
  const handlePingRef = useRef<(() => void) | undefined>(undefined);
  const resetHeartbeatTimeoutRef = useRef<(() => void) | undefined>(undefined);
  const handleDataChangeRef = useRef<((event: DataChangeEvent) => void) | undefined>(undefined);

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
        (event.type.includes('updated') && event.type.includes('stock'))
      ) {
        const messages: Record<string, string> = {
          'delivery:created': 'Nowa dostawa',
          'delivery:deleted': 'Dostawa usunięta',
          'order:created': 'Nowe zlecenie',
          'order:deleted': 'Zlecenie usunięte',
          'warehouse:stock_changed': 'Stan magazynu zmienił się',
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

  // Cleanup - teraz z pustym dependency array, bo wszystko jest w ref-ach
  useEffect(() => {
    connectRef.current?.();

    return () => {
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
  }, []); // Puste dependency array - połączenie jest nawiązane tylko raz!

  return {
    isConnected: isConnectedRef.current,
  };
}
