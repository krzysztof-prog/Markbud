# Security & Authorization

> **Powrót do:** [Edge Cases README](./README.md) | [Oryginalny dokument](../EDGE_CASES_ANALYSIS.md)

---

## 8.1 Missing User Context in Operations

**Severity:** HIGH
**Location:** Multiple services

**Problem:**
- Wiele operacji nie zapisuje `userId` mimo ze pole istnieje w schema
- Brak audit trail kto co zrobil

**Scenariusz:**
```prisma
model WarehouseHistory {
  recordedById Int? @map("recorded_by_id")  // Optional!
}

model Note {
  createdById Int? @map("created_by_id")  // Optional!
}
```

```typescript
// Ktos usuwa zlecenie
await prisma.order.delete({ where: { id: 123 } });

// Audit trail:
// Brak informacji KTO usunal
// Brak timestampu KIEDY usunal
// Niemozliwosc odtworzenia historii zmian
```

**Sugestia:**
```typescript
// 1. Require userId in all mutation services
class WarehouseService {
  constructor(
    private repository: WarehouseRepository,
    private currentUserId: number  // Required
  ) {}

  async updateStock(profileId: number, colorId: number, newStock: number) {
    return this.repository.updateStock({
      profileId,
      colorId,
      newStock,
      updatedById: this.currentUserId  // Always recorded
    });
  }
}

// 2. Middleware injects userId from JWT
fastify.decorateRequest('userId', null);

fastify.addHook('preHandler', async (request, reply) => {
  const token = extractToken(request);
  if (token) {
    const decoded = decodeToken(token);
    request.userId = decoded.userId;
  }
});

// 3. Make audit fields required
model WarehouseHistory {
  recordedById Int @map("recorded_by_id")  // Required
  recordedAt   DateTime @default(now())
}
```

---

## 8.2 WebSocket Memory Leak - Rate Limit Map

**Severity:** Medium
**Location:** [../../apps/api/src/plugins/websocket.ts:32](../../apps/api/src/plugins/websocket.ts#L32)

**Problem:**
```typescript
const connectionRateLimits = new Map<string, RateLimitInfo>();

// Map nigdy nie jest czyszczony!
// Kazde polaczenie dodaje entry
// Disconnected connections pozostaja w Map
// -> Memory leak w long-running server
```

**Scenariusz:**
```typescript
// Day 1: 100 users connect -> 100 entries in Map
// Day 2: 200 users connect -> 300 entries (100 old + 200 new)
// Day 30: 6000 users total -> Map has 6000 entries
// -> Memory usage: ~1MB just for rate limiting
// -> Eventually: OOM
```

**Sugestia:**
```typescript
// 1. Cleanup on disconnect
connection.socket.on('close', () => {
  activeConnections.delete(connection as AuthenticatedConnection);

  // Cleanup rate limit entry
  const connectionId = `${connection.userId}-${connection.socket.remoteAddress}`;
  connectionRateLimits.delete(connectionId);

  logger.debug('WebSocket disconnected and cleaned up', { connectionId });
});

// 2. Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, limit] of connectionRateLimits.entries()) {
    if (now > limit.resetAt + 60000) {  // 1 minute grace period
      connectionRateLimits.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired rate limit entries`);
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

---

## 8.3 WebSocket Missing Heartbeat

**Severity:** Medium
**Location:** [../../apps/api/src/plugins/websocket.ts](../../apps/api/src/plugins/websocket.ts)

**Problem:**
- Brak ping/pong mechanism
- Dead connections remain in `activeConnections`
- Broadcast wysyla do dead connections

**Scenariusz:**
```typescript
// User's browser crashes
// -> TCP connection remains open (timeout: 2 hours default)
// -> activeConnections still contains this connection
// -> broadcasts try to send to dead connection
// -> Error or hang

// After 1000 dead connections:
// -> broadcast becomes slow
// -> Real users experience lag
```

**Sugestia:**
```typescript
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 35000;  // 35 seconds

connection.socket.on('open', () => {
  const heartbeatTimer = setInterval(() => {
    if (connection.socket.readyState === connection.socket.OPEN) {
      connection.socket.ping();
    }
  }, HEARTBEAT_INTERVAL);

  let pongReceived = true;

  connection.socket.on('pong', () => {
    pongReceived = true;
  });

  const timeoutTimer = setInterval(() => {
    if (!pongReceived) {
      logger.warn('WebSocket heartbeat timeout, closing connection');
      connection.socket.close();
    }
    pongReceived = false;
  }, HEARTBEAT_TIMEOUT);

  connection.socket.on('close', () => {
    clearInterval(heartbeatTimer);
    clearInterval(timeoutTimer);
  });
});
```
