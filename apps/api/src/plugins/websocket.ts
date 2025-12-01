import { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { eventEmitter } from '../services/event-emitter.js';

interface DataChangeEvent {
  type: string;
  data: any;
  timestamp: Date;
}

const MAX_CONNECTIONS = 100;

// Set do śledzenia aktywnych WebSocket połączeń
const activeConnections = new Set<any>();

export async function setupWebSocket(fastify: FastifyInstance) {
  // Zarejestruj WebSocket plugin
  await fastify.register(fastifyWebsocket, {
    errorHandler: (error, socket) => {
      console.error('WebSocket error:', error);
      socket.send(JSON.stringify({ type: 'error', message: 'Błąd WebSocket' }));
      socket.close();
    },
  });

  // WebSocket route - połączenie dla real-time updates
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    // Sprawdź limit połączeń
    if (activeConnections.size >= MAX_CONNECTIONS) {
      socket.send(JSON.stringify({ type: 'error', message: 'Przekroczono limit połączeń' }));
      socket.close();
      return;
    }

    console.log('New WebSocket connection');
    activeConnections.add(socket);

    // Wysyłanie heartbeat co 30 sekund, aby uniknąć timeout'ów
    const heartbeat = setInterval(() => {
      if (socket.readyState === 1) { // OPEN
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Słuchaj zmian danych i wyślij do klienta
    const unsubscribe = eventEmitter.onAnyChange((event: DataChangeEvent) => {
      if (socket.readyState === 1) { // OPEN
        socket.send(JSON.stringify({
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
    socket.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong') {
          // Klient odpowiedział na ping, wszystko OK
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        try {
          socket.send(JSON.stringify({ type: 'error', message: 'Błąd parsowania wiadomości' }));
        } catch (e) {
          console.error('Failed to send error message:', e);
        }
      }
    });

    // Obsługa zamknięcia połączenia
    socket.on('close', () => {
      console.log('WebSocket connection closed');
      activeConnections.delete(socket);
      clearInterval(heartbeat);
      unsubscribe();
    });

    socket.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      activeConnections.delete(socket);
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  // Function do broadcast'owania wiadomości do wszystkich klientów
  fastify.decorate('broadcastToClients', (message: any) => {
    const messageStr = JSON.stringify(message);
    activeConnections.forEach((socket) => {
      if (socket.readyState === 1) { // OPEN
        socket.send(messageStr);
      } else {
        activeConnections.delete(socket);
      }
    });
  });
}