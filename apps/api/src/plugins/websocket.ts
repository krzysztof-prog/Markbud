import { FastifyInstance } from 'fastify';
import fastifyWebsocket, { type SocketStream } from '@fastify/websocket';
import { eventEmitter } from '../services/event-emitter.js';
import { decodeTokenWithError } from '../utils/jwt.js';
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
const MAX_CONNECTIONS_PER_USER = 10; // Limit połączeń per użytkownik (zwiększony z 5 bo 2 hooki WS)
const MAX_MESSAGES_PER_MINUTE = 100;
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
const MAX_STRING_LENGTH = 10000;
const PONG_TIMEOUT_MS = 35000; // 35 sekund - jeśli klient nie odpowie na ping, zamknij połączenie
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minut - interwał czyszczenia
const RATE_LIMIT_EXPIRY_MS = 10 * 60 * 1000; // 10 minut - czas wygaśnięcia rate limit entry

// Set do śledzenia aktywnych WebSocket połączeń (przechowujemy SocketStream)
const activeConnections = new Set<AuthenticatedConnection>();

// Map do śledzenia rate limiting per connection
const connectionRateLimits = new Map<string, RateLimitInfo>();

// Map do śledzenia ostatniego pong per connection (connectionId -> timestamp)
const lastPongReceived = new Map<string, number>();

// Map do śledzenia liczby połączeń per user (userId -> count)
const userConnectionCount = new Map<string | number, number>();

// Periodic cleanup of expired rate limit entries and pong tracking
// Uruchamiane co 5 minut, usuwa wpisy starsze niż 10 minut
setInterval(() => {
  const now = Date.now();
  let cleanedRateLimits = 0;
  let cleanedPongEntries = 0;

  // Czyszczenie rate limits - usuwamy wpisy starsze niż 10 minut
  for (const [connectionId, limit] of connectionRateLimits.entries()) {
    if (now > limit.resetAt + RATE_LIMIT_EXPIRY_MS) {
      connectionRateLimits.delete(connectionId);
      cleanedRateLimits++;
    }
  }

  // Czyszczenie lastPongReceived - usuwamy wpisy starsze niż 10 minut
  // (stale entries od zamkniętych połączeń które nie zostały poprawnie wyczyszczone)
  for (const [connectionId, lastPong] of lastPongReceived.entries()) {
    if (now - lastPong > RATE_LIMIT_EXPIRY_MS) {
      lastPongReceived.delete(connectionId);
      cleanedPongEntries++;
    }
  }

  if (cleanedRateLimits > 0 || cleanedPongEntries > 0) {
    logger.info('WebSocket cleanup completed', {
      cleanedRateLimits,
      cleanedPongEntries,
      remainingRateLimits: connectionRateLimits.size,
      remainingPongEntries: lastPongReceived.size,
      activeConnections: activeConnections.size,
    });
  }
}, CLEANUP_INTERVAL_MS);

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
 * Fallback na losowy identyfikator gdy remoteAddress/remotePort niedostępne
 * (np. przy trustProxy: true bez nagłówków proxy, lub localhost WebSocket upgrade)
 */
function generateConnectionId(connection: SocketStream): string {
  const address = connection.socket.remoteAddress || 'unknown';
  const port = connection.socket.remotePort || Math.random().toString(36).substring(2, 8);
  return `${address}:${port}:${Date.now()}`;
}

/**
 * Zwiększ licznik połączeń dla użytkownika
 */
function incrementUserConnectionCount(userId: string | number): void {
  const current = userConnectionCount.get(userId) || 0;
  userConnectionCount.set(userId, current + 1);
}

/**
 * Zmniejsz licznik połączeń dla użytkownika
 */
function decrementUserConnectionCount(userId: string | number): void {
  const current = userConnectionCount.get(userId) || 0;
  if (current <= 1) {
    userConnectionCount.delete(userId);
  } else {
    userConnectionCount.set(userId, current - 1);
  }
}

/**
 * Sprawdź czy użytkownik przekroczył limit połączeń
 */
function hasExceededUserConnectionLimit(userId: string | number): boolean {
  const current = userConnectionCount.get(userId) || 0;
  return current >= MAX_CONNECTIONS_PER_USER;
}

/**
 * Wyczyść wszystkie zasoby związane z połączeniem
 */
function cleanupConnection(
  connection: AuthenticatedConnection,
  connectionId: string,
  heartbeat: ReturnType<typeof setInterval>,
  pongCheck: ReturnType<typeof setInterval> | null,
  unsubscribe: () => void
): void {
  activeConnections.delete(connection);
  connectionRateLimits.delete(connectionId);
  lastPongReceived.delete(connectionId);

  if (connection.userId) {
    decrementUserConnectionCount(connection.userId);
  }

  clearInterval(heartbeat);
  if (pongCheck) {
    clearInterval(pongCheck);
  }
  unsubscribe();
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
      connection.write(JSON.stringify({ type: 'error', code: 'NO_TOKEN', message: 'Brak tokenu autoryzacji' }));
      connection.end();
      return;
    }

    const { payload, error: tokenError } = decodeTokenWithError(token);

    if (!payload) {
      // Rozróżniamy typ błędu tokenu - frontend może podjąć odpowiednią akcję
      const errorCode = tokenError === 'expired' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
      const errorMessage = tokenError === 'expired'
        ? 'Sesja wygasła - zaloguj się ponownie'
        : 'Nieprawidłowy token autoryzacji';

      logger.warn(`WebSocket connection rejected: ${errorCode}`, {
        ip: connection.socket.remoteAddress,
        tokenError,
      });

      // Wysyłamy specjalny kod błędu który frontend może rozpoznać
      connection.write(JSON.stringify({
        type: 'error',
        code: errorCode,
        message: errorMessage,
        shouldRetry: false  // Informacja dla frontendu że nie ma sensu retry
      }));
      connection.end();
      return;
    }

    // Attach user info to connection
    authConnection.userId = payload.userId;
    authConnection.email = payload.email;

    // Sprawdź globalny limit połączeń
    if (activeConnections.size >= MAX_CONNECTIONS) {
      logger.warn('WebSocket connection rejected: Max global connections reached', {
        userId: authConnection.userId,
        ip: connection.socket.remoteAddress,
        currentConnections: activeConnections.size,
      });
      connection.write(JSON.stringify({ type: 'error', code: 'MAX_CONNECTIONS', message: 'Przekroczono globalny limit połączeń' }));
      connection.end();
      return;
    }

    // Sprawdź per-user limit połączeń
    if (authConnection.userId && hasExceededUserConnectionLimit(authConnection.userId)) {
      const currentUserConnections = userConnectionCount.get(authConnection.userId) || 0;
      logger.warn('WebSocket connection rejected: Max per-user connections reached', {
        userId: authConnection.userId,
        ip: connection.socket.remoteAddress,
        userConnections: currentUserConnections,
        maxPerUser: MAX_CONNECTIONS_PER_USER,
      });
      connection.write(JSON.stringify({
        type: 'error',
        code: 'MAX_USER_CONNECTIONS',
        message: `Przekroczono limit ${MAX_CONNECTIONS_PER_USER} połączeń na użytkownika`,
      }));
      connection.end();
      return;
    }

    logger.info('New authenticated WebSocket connection', {
      userId: authConnection.userId,
      email: authConnection.email,
      ip: connection.socket.remoteAddress,
      connectionId,
      userConnectionsBefore: authConnection.userId ? userConnectionCount.get(authConnection.userId) || 0 : 0,
    });

    activeConnections.add(authConnection);

    // Zwiększ licznik połączeń dla użytkownika
    if (authConnection.userId) {
      incrementUserConnectionCount(authConnection.userId);
    }

    // Inicjalizuj lastPongReceived - zakładamy że nowe połączenie jest aktywne
    lastPongReceived.set(connectionId, Date.now());

    // Wysyłanie heartbeat (ping) co 30 sekund, aby uniknąć timeout'ów
    const heartbeat = setInterval(() => {
      // Sprawdź czy połączenie jest jeszcze aktywne
      if (!activeConnections.has(authConnection)) {
        clearInterval(heartbeat);
        return;
      }

      if (!connection.destroyed && connection.socket.readyState === 1) {
        try {
          connection.write(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          // Błąd wysyłania - połączenie prawdopodobnie zamknięte
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.debug('Failed to send heartbeat (connection likely closed):', { errorMessage });
          clearInterval(heartbeat);
          activeConnections.delete(authConnection);
        }
      } else {
        // Połączenie zamknięte - wyczyść interval
        clearInterval(heartbeat);
        activeConnections.delete(authConnection);
      }
    }, 30000);

    // Pong timeout check - sprawdza co 35 sekund czy klient odpowiedział na ping
    // Jeśli nie odpowiedział przez PONG_TIMEOUT_MS, zamykamy połączenie jako martwe
    const pongCheck = setInterval(() => {
      // Sprawdź czy połączenie jest jeszcze aktywne
      if (!activeConnections.has(authConnection) || connection.destroyed) {
        clearInterval(pongCheck);
        return;
      }

      const lastPong = lastPongReceived.get(connectionId);
      const now = Date.now();

      if (!lastPong || now - lastPong > PONG_TIMEOUT_MS) {
        logger.info('WebSocket pong timeout - closing stale connection', {
          userId: authConnection.userId,
          connectionId,
          lastPongAge: lastPong ? now - lastPong : 'never received',
          timeoutMs: PONG_TIMEOUT_MS,
        });

        // Wyślij informację do klienta przed zamknięciem (tylko jeśli połączenie otwarte)
        if (connection.socket.readyState === 1) {
          try {
            connection.write(JSON.stringify({
              type: 'error',
              code: 'PONG_TIMEOUT',
              message: 'Połączenie zamknięte z powodu braku odpowiedzi',
            }));
          } catch {
            // Ignoruj błąd wysyłania - i tak zamykamy połączenie
          }
        }

        // Zamknij połączenie - event 'close' wyczyści zasoby
        try {
          connection.end();
        } catch {
          // Połączenie mogło już być zamknięte - cleanup manualnie
          activeConnections.delete(authConnection);
        }

        // Wyczyść ten interval - połączenie jest zamknięte
        clearInterval(pongCheck);
      }
    }, PONG_TIMEOUT_MS);

    // Słuchaj zmian danych i wyślij do klienta
    const unsubscribe = eventEmitter.onAnyChange((event: DataChangeEvent) => {
      // Sprawdź stan połączenia - dodatkowe sprawdzenie czy connection jest w activeConnections
      // aby uniknąć wysyłania na połączenia w trakcie cleanup
      if (!activeConnections.has(authConnection)) {
        return; // Połączenie już usunięte z aktywnych - nie wysyłaj
      }

      if (connection.destroyed || connection.socket.readyState !== 1) {
        // Połączenie zamknięte lub w trakcie zamykania - usuń z aktywnych
        activeConnections.delete(authConnection);
        return;
      }

      // Server-side events (importy, matching) omijają rate limiter
      // - te eventy generuje serwer, nie klient
      // - przy bulk importach (np. 1000 plików) rate limit 100/min jest za niski
      // Rate limiter chroni przed spamem od klienta, nie przed server-side notyfikacjami
      const isServerSideEvent = event.type.startsWith('import:') || event.type.startsWith('matching:');

      if (!isServerSideEvent && !checkRateLimit(connectionId)) {
        logger.debug('WebSocket rate limit exceeded', {
          userId: authConnection.userId,
          connectionId,
          eventType: event.type,
        });
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
        // Błąd wysyłania - prawdopodobnie połączenie zamknięte między sprawdzeniem a wysłaniem
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Tylko loguj nieoczekiwane błędy
        if (!errorMessage.includes('readyState') && !errorMessage.includes('CLOSED')) {
          logger.error('Failed to send data change event', {
            errorMessage,
            userId: authConnection.userId,
            eventType: event.type,
          });
        }

        // Usuń z aktywnych połączeń - jest martwe
        activeConnections.delete(authConnection);
      }
    });

    // Obsługa wiadomości od klienta (pong na ping)
    connection.on('data', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong') {
          // Klient odpowiedział na ping - aktualizujemy timestamp
          lastPongReceived.set(connectionId, Date.now());
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
        userConnectionsAfter: authConnection.userId
          ? (userConnectionCount.get(authConnection.userId) || 1) - 1
          : 0,
      });
      cleanupConnection(authConnection, connectionId, heartbeat, pongCheck, unsubscribe);
    });

    connection.on('error', (error: Error) => {
      // Ignoruj błędy ECONNRESET i zamkniętego połączenia - to normalne podczas rozłączania
      const errorMessage = error?.message || '';
      const isExpectedError = errorMessage.includes('ECONNRESET') ||
                              errorMessage.includes('EPIPE') ||
                              errorMessage.includes('closed') ||
                              errorMessage.includes('destroyed');

      if (!isExpectedError) {
        logger.error('WebSocket error', {
          errorMessage,
          errorName: error?.name,
          userId: authConnection.userId,
          connectionId,
        });
      } else {
        logger.debug('WebSocket connection error (expected during disconnect)', {
          errorMessage,
          userId: authConnection.userId,
          connectionId,
        });
      }
      cleanupConnection(authConnection, connectionId, heartbeat, pongCheck, unsubscribe);
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