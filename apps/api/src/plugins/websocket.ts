import { FastifyInstance } from 'fastify';
import fastifyWebsocket, { type SocketStream } from '@fastify/websocket';
import { eventEmitter } from '../services/event-emitter.js';
import { decodeToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

interface DataChangeEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

interface AuthenticatedConnection extends SocketStream {
  userId?: string | number;
  email?: string;
}

interface RateLimitInfo {
  count: number;
  resetAt: number;
}

const MAX_CONNECTIONS = 100;
const MAX_MESSAGES_PER_MINUTE = 100;
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
const MAX_STRING_LENGTH = 10000;

// Set do śledzenia aktywnych WebSocket połączeń (przechowujemy SocketStream)
const activeConnections = new Set<AuthenticatedConnection>();

// Map do śledzenia rate limiting per connection
const connectionRateLimits = new Map<string, RateLimitInfo>();

// FIXED: Periodic cleanup of expired rate limit entries to prevent memory leak
// Runs every 5 minutes and removes entries older than 1 hour
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [connectionId, limit] of connectionRateLimits.entries()) {
    // Remove entries that haven't been used in 1 hour (60 min)
    if (now > limit.resetAt + 3600000) {
      connectionRateLimits.delete(connectionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`WebSocket rate limit cleanup: removed ${cleaned} expired entries`, {
      remainingEntries: connectionRateLimits.size,
      activeConnections: activeConnections.size,
    });
  }
}, 5 * 60 * 1000); // Every 5 minutes

/**
 * Extract JWT token from WebSocket upgrade request
 */
function extractWebSocketToken(url: string, headers: Record<string, string | string[] | undefined>): string | null {
  // Try to extract from query string first
  const urlParts = url.split('?');
  if (urlParts.length > 1) {
    const params = new URLSearchParams(urlParts[1]);
    const token = params.get('token');
    if (token) return token;
  }

  // Fallback to Authorization header
  const authHeader = headers.authorization;
  if (typeof authHeader === 'string') {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }
  }

  return null;
}

/**
 * Check if connection has exceeded rate limit
 */
function checkRateLimit(connectionId: string): boolean {
  const limit = connectionRateLimits.get(connectionId);
  const now = Date.now();

  if (!limit || now > limit.resetAt) {
    // Create new rate limit window
    connectionRateLimits.set(connectionId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (limit.count >= MAX_MESSAGES_PER_MINUTE) {
    // Rate limit exceeded
    return false;
  }

  // Increment count
  limit.count++;
  return true;
}

/**
 * Sanitize data before sending over WebSocket
 * Removes sensitive fields and limits string lengths
 */
function sanitizeWebSocketData(data: unknown): unknown {
  if (!data) return data;

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeWebSocketData(item));
  }

  // Handle objects
  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive fields
      if (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase() === 'jwt'
      ) {
        continue;
      }

      // Limit string lengths to prevent buffer overflow
      if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
        sanitized[key] = value.substring(0, MAX_STRING_LENGTH) + '...';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeWebSocketData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // Return primitive values as-is
  return data;
}

/**
 * Generate unique connection ID
 */
function generateConnectionId(connection: SocketStream): string {
  return `${connection.socket.remoteAddress}:${connection.socket.remotePort}:${Date.now()}`;
}

export async function setupWebSocket(fastify: FastifyInstance) {
  // Zarejestruj WebSocket plugin
  await fastify.register(fastifyWebsocket, {
    errorHandler: (error, connection) => {
      logger.error('WebSocket error:', error);
      connection.socket.send(JSON.stringify({ type: 'error', message: 'Błąd WebSocket' }));
      connection.socket.close();
    },
  });

  // WebSocket route - połączenie dla real-time updates
  fastify.get('/ws', { websocket: true }, (connection: SocketStream, req) => {
    const authConnection = connection as AuthenticatedConnection;
    const connectionId = generateConnectionId(connection);

    // Extract and validate JWT token
    const token = extractWebSocketToken(req.url || '', req.headers as Record<string, string | string[] | undefined>);

    if (!token) {
      logger.warn('WebSocket connection rejected: No authentication token', {
        ip: connection.socket.remoteAddress,
      });
      connection.write(JSON.stringify({ type: 'error', message: 'Brak tokenu autoryzacji' }));
      connection.end();
      return;
    }

    const payload = decodeToken(token);

    if (!payload) {
      logger.warn('WebSocket connection rejected: Invalid token', {
        ip: connection.socket.remoteAddress,
      });
      connection.write(JSON.stringify({ type: 'error', message: 'Nieprawidłowy token autoryzacji' }));
      connection.end();
      return;
    }

    // Attach user info to connection
    authConnection.userId = payload.userId;
    authConnection.email = payload.email;

    // Sprawdź limit połączeń
    if (activeConnections.size >= MAX_CONNECTIONS) {
      logger.warn('WebSocket connection rejected: Max connections reached', {
        userId: authConnection.userId,
        ip: connection.socket.remoteAddress,
      });
      connection.write(JSON.stringify({ type: 'error', message: 'Przekroczono limit połączeń' }));
      connection.end();
      return;
    }

    logger.info('New authenticated WebSocket connection', {
      userId: authConnection.userId,
      email: authConnection.email,
      ip: connection.socket.remoteAddress,
      connectionId,
    });

    activeConnections.add(authConnection);

    // Wysyłanie heartbeat co 30 sekund, aby uniknąć timeout'ów
    const heartbeat = setInterval(() => {
      if (!connection.destroyed && connection.socket.readyState === 1) {
        try {
          connection.write(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          logger.error('Failed to send heartbeat:', error);
          clearInterval(heartbeat);
        }
      }
    }, 30000);

    // Słuchaj zmian danych i wyślij do klienta
    const unsubscribe = eventEmitter.onAnyChange((event: DataChangeEvent) => {
      if (!connection.destroyed && connection.socket.readyState === 1) {
        // Check rate limit before sending
        if (!checkRateLimit(connectionId)) {
          logger.warn('WebSocket rate limit exceeded', {
            userId: authConnection.userId,
            connectionId,
            eventType: event.type,
          });
          // Don't send the message but don't close connection either
          return;
        }

        try {
          // Sanitize data before sending
          const sanitizedData = sanitizeWebSocketData(event.data);

          connection.write(JSON.stringify({
            type: 'dataChange',
            event: {
              type: event.type,
              data: sanitizedData,
              timestamp: event.timestamp,
            },
          }));
        } catch (error) {
          logger.error('Failed to send data change event', {
            error,
            userId: authConnection.userId,
            eventType: event.type,
          });
        }
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
        logger.error('Failed to parse WebSocket message:', error);
        try {
          connection.write(JSON.stringify({ type: 'error', message: 'Błąd parsowania wiadomości' }));
        } catch (e) {
          logger.error('Failed to send error message:', e);
        }
      }
    });

    // Obsługa zamknięcia połączenia
    connection.on('close', () => {
      logger.info('WebSocket connection closed', {
        userId: authConnection.userId,
        connectionId,
      });
      activeConnections.delete(authConnection);
      connectionRateLimits.delete(connectionId);
      clearInterval(heartbeat);
      unsubscribe();
    });

    connection.on('error', (error: Error) => {
      logger.error('WebSocket error', {
        error,
        userId: authConnection.userId,
        connectionId,
      });
      activeConnections.delete(authConnection);
      connectionRateLimits.delete(connectionId);
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  // Function do broadcast'owania wiadomości do wszystkich klientów
  fastify.decorate('broadcastToClients', (message: unknown) => {
    // Sanitize message before broadcasting
    const sanitizedMessage = sanitizeWebSocketData(message);
    const messageStr = JSON.stringify(sanitizedMessage);

    activeConnections.forEach((connection) => {
      if (!connection.destroyed && connection.socket.readyState === 1) {
        try {
          connection.write(messageStr);
        } catch (error) {
          logger.error('Failed to broadcast message', {
            error,
            userId: connection.userId,
          });
          activeConnections.delete(connection);
        }
      } else {
        activeConnections.delete(connection);
      }
    });
  });
}