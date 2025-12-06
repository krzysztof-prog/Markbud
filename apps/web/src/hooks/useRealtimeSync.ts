'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { showInfoToast } from '@/lib/toast-helpers';
import { wsLogger } from '@/lib/logger';

interface DataChangeEvent {
  type: string;
  data: any;
  timestamp: string;
}

interface WebSocketMessage {
  type: string;
  event?: DataChangeEvent;
}

const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:4000';
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
  const handlePingRef = useRef<() => void>();
  const resetHeartbeatTimeoutRef = useRef<() => void>();
  const handleDataChangeRef = useRef<(event: DataChangeEvent) => void>();

  // Funkcja do obsługi zmian danych - przechowujemy aktualną wersję w ref
  handleDataChangeRef.current = useCallback(
    (event: DataChangeEvent) => {
      wsLogger.debug('Data change event:', event.type);

      // Mapowanie event types do React Query query keys
      const queryKeyMap: Record<string, string[]> = {
        'delivery:created': ['deliveries-calendar-continuous'],
        'delivery:updated': ['deliveries-calendar-continuous', 'deliveries'],
        'delivery:deleted': ['deliveries-calendar-continuous', 'deliveries'],
        'order:created': ['orders', 'deliveries-calendar-continuous'],
        'order:updated': ['orders', 'deliveries-calendar-continuous'],
        'order:deleted': ['orders', 'deliveries-calendar-continuous'],
        'warehouse:stock_updated': ['warehouse'],
        'warehouse:stock_changed': ['warehouse'],
        'okuc:stock_updated': ['okuc-stock', 'okuc-articles'],
        'okuc:article_created': ['okuc-articles'],
        'okuc:article_updated': ['okuc-articles'],
        'okuc:article_deleted': ['okuc-articles'],
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
          'okuc:article_created': 'Nowy artykuł Okuć',
          'okuc:article_deleted': 'Artykuł Okuć usunięty',
        };

        const message = messages[event.type];
        if (message) {
          showInfoToast('Synchronizacja', message);
        }
      }
    },
    [queryClient]
  );

  // Funkcja do wysyłania pong na ping
  handlePingRef.current = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'pong' }));
    }
  }, []);

  // Funkcja do resetowania heartbeat timeout
  resetHeartbeatTimeoutRef.current = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    // Ustaw timeout - jeśli nie dostaniemy ping w ciągu 35 sekund, zamknij połączenie
    heartbeatTimeoutRef.current = setTimeout(() => {
      wsLogger.warn('Heartbeat timeout, reconnecting...');
      wsRef.current?.close();
    }, 35000);
  }, []);

  // Funkcja do obsługi wiadomości WebSocket - używamy stabilnych referencji
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      if (message.type === 'ping') {
        resetHeartbeatTimeoutRef.current?.();
        handlePingRef.current?.();
      } else if (message.type === 'dataChange' && message.event) {
        resetHeartbeatTimeoutRef.current?.();
        handleDataChangeRef.current?.(message.event);
      }
    } catch (error) {
      wsLogger.error('Failed to parse message:', error);
    }
  }, []); // Puste dependency array - wszystkie zależności są w ref-ach

  // Funkcja do nawiązania połączenia WebSocket - używamy stabilnej referencji
  const connectRef = useRef<() => void>();

  connectRef.current = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Już połączeni
    }

    try {
      const wsUrl = `${WS_URL}/ws`;
      wsLogger.log('Connecting to:', wsUrl);

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        wsLogger.log('Connected');
        isConnectedRef.current = true;
        reconnectAttemptsRef.current = 0;
        resetHeartbeatTimeoutRef.current?.();
        showInfoToast('Połączenie', 'Synchronizacja w real-time aktywna');
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onerror = (error) => {
        wsLogger.error('Error:', error);
        isConnectedRef.current = false;
      };

      wsRef.current.onclose = () => {
        wsLogger.log('Disconnected');
        isConnectedRef.current = false;

        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }

        // Spróbuj ponownie połączyć się
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          wsLogger.log(
            `Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current?.();
          }, RECONNECT_INTERVAL);
        } else {
          wsLogger.error('Max reconnection attempts reached');
        }
      };
    } catch (error) {
      wsLogger.error('Connection error:', error);
      isConnectedRef.current = false;

      // Spróbuj ponownie
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current?.();
        }, RECONNECT_INTERVAL);
      }
    }
  }, [handleMessage]); // handleMessage jest teraz stabilny

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
