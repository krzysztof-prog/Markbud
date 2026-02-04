'use client';

/**
 * useWebSocket - Prosty hook do nasłuchiwania wiadomości WebSocket
 *
 * Używa tego samego połączenia WebSocket co useRealtimeSync,
 * ale dostarcza API do obsługi dowolnych wiadomości.
 *
 * Użycie:
 * const { lastMessage, isConnected } = useWebSocket();
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { getAuthToken } from '@/lib/auth-token';

const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:3001';

interface UseWebSocketReturn {
  lastMessage: unknown;
  isConnected: boolean;
  sendMessage: (message: unknown) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      if (!isMounted) return;

      try {
        const token = await getAuthToken();
        if (!token) return;

        const wsUrl = `${WS_URL}/ws?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isMounted) {
            setIsConnected(true);
          }
        };

        ws.onmessage = async (event) => {
          if (!isMounted) return;

          try {
            let messageData: string;
            if (typeof event.data === 'string') {
              messageData = event.data;
            } else if (event.data instanceof Blob) {
              messageData = await event.data.text();
            } else {
              return;
            }

            const parsed = JSON.parse(messageData);
            setLastMessage(parsed);
          } catch {
            // Ignoruj błędy parsowania
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setIsConnected(false);
            // Reconnect po 5s
            reconnectTimeoutRef.current = setTimeout(connect, 5000);
          }
        };

        ws.onerror = () => {
          if (isMounted) {
            setIsConnected(false);
          }
        };

        wsRef.current = ws;
      } catch {
        // Retry po 5s
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
      }
    };

    // Opóźnij połączenie
    const initTimeout = setTimeout(connect, 500);

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { lastMessage, isConnected, sendMessage };
}

export default useWebSocket;
