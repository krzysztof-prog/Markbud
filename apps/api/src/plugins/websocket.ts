import { FastifyInstance } from 'fastify';
import fastifyWebsocket, { type SocketStream } from '@fastify/websocket';
import { eventEmitter } from '../services/event-emitter.js';

interface DataChangeEvent {
  type: string;
  data: any;
  timestamp: Date;
}

const MAX_CONNECTIONS = 100;

// Set do śledzenia aktywnych WebSocket połączeń (przechowujemy SocketStream)
const activeConnections = new Set<SocketStream>();

export async function setupWebSocket(fastify: FastifyInstance) {
  // Zarejestruj WebSocket plugin
  await fastify.register(fastifyWebsocket, {
    errorHandler: (error, connection) => {
      console.error('WebSocket error:', error);
      connection.socket.send(JSON.stringify({ type: 'error', message: 'Błąd WebSocket' }));
      connection.socket.close();
    },
  });

  // WebSocket route - połączenie dla real-time updates
  fastify.get('/ws', { websocket: true }, (connection: SocketStream, req) => {
    // Sprawdź limit połączeń
    if (activeConnections.size >= MAX_CONNECTIONS) {
      connection.write(JSON.stringify({ type: 'error', message: 'Przekroczono limit połączeń' }));
      connection.end();
      return;
    }

    console.log('New WebSocket connection');
    activeConnections.add(connection);

    // Wysyłanie heartbeat co 30 sekund, aby uniknąć timeout'ów
    const heartbeat = setInterval(() => {
      if (!connection.destroyed) {
        connection.write(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Słuchaj zmian danych i wyślij do klienta
    const unsubscribe = eventEmitter.onAnyChange((event: DataChangeEvent) => {
      if (!connection.destroyed) {
        connection.write(JSON.stringify({
          type: 'dataChange',
          event: {
            type: event.type,
            data: event.data,
            timestamp: event.timestamp,
          },
        }));
      }
    });

    // Obsługa wiadomości od klienta (pong na ping)
    connection.on('data', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong') {
          // Klient odpowiedział na ping, wszystko OK
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        try {
          connection.write(JSON.stringify({ type: 'error', message: 'Błąd parsowania wiadomości' }));
        } catch (e) {
          console.error('Failed to send error message:', e);
        }
      }
    });

    // Obsługa zamknięcia połączenia
    connection.on('close', () => {
      console.log('WebSocket connection closed');
      activeConnections.delete(connection);
      clearInterval(heartbeat);
      unsubscribe();
    });

    connection.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      activeConnections.delete(connection);
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  // Function do broadcast'owania wiadomości do wszystkich klientów
  fastify.decorate('broadcastToClients', (message: unknown) => {
    const messageStr = JSON.stringify(message);
    activeConnections.forEach((connection) => {
      if (!connection.destroyed) {
        connection.write(messageStr);
      } else {
        activeConnections.delete(connection);
      }
    });
  });
}