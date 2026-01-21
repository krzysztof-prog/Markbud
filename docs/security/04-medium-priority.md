# Srednie Problemy Bezpieczenstwa

**Priorytet:** SREDNI - Naprawic w ciagu miesiaca
**Liczba problemow:** 15

> Te problemy wplywaja na stabilnosc i jakosc systemu, ale nie stanowia bezposredniego zagrozenia bezpieczenstwa.

---

## 27. Brak Connection Pooling Config

**Lokalizacja:** `apps/api/src/index.ts:37`

**Problem:**
```typescript
export const prisma = new PrismaClient();
```

**Rozwiazanie:**
```typescript
export const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
  log: ['error', 'warn'],
  // Connection pool settings (dla PostgreSQL)
  // connectionLimit: 20,
});
```

---

## 28. Brak Timeoutow w Fetch Requests

**Lokalizacja:** `apps/web/src/lib/api.ts:55-89`

**Problem:**
```typescript
const response = await fetch(url, {
  ...options,
  headers: {...},
});
```

**Wplyw:** Requests moga wisiec w nieskonczonosc

**Rozwiazanie:**
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000); // 30s

try {
  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
  });
  return response;
} finally {
  clearTimeout(timeout);
}
```

---

## 29. Brak Retry Logic w API Calls

**Lokalizacja:** `apps/web/src/lib/api.ts`

**Problem:**
Network blips powoduja bledy

**Rozwiazanie:**
```typescript
async function fetchWithRetry(url: string, options: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (i === retries - 1) throw error;

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}
```

---

## 30. Brak Progress Tracking na Backendzie

**Lokalizacja:** `apps/api/src/routes/imports.ts:14-83`

**Problem:**
Frontend symuluje progress (fake progress bar)

**Rozwiazanie:**
Implementowac real progress tracking przez WebSocket:
```typescript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

function sendProgress(sessionId: string, progress: number) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        sessionId,
        progress,
      }));
    }
  });
}
```

---

## 31. Brak Chunked Upload dla Duzych Plikow

**Lokalizacja:** `apps/web/src/lib/api.ts:331-369`

**Problem:**
Duze pliki (>10MB) moga timeout

**Rozwiazanie:**
Implementowac chunked upload z resumable capability

---

## 32. Concurrent File Writes bez Locking

**Lokalizacja:** `apps/api/src/routes/imports.ts:56-62`

**Problem:**
```typescript
const safeFilename = `${timestamp}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
await writeFile(filepath, buffer);
```

**Wplyw:** Teoretyczna mozliwosc race condition przy identycznych timestamp

**Rozwiazanie:**
```typescript
import { v4 as uuidv4 } from 'uuid';

const safeFilename = `${timestamp}_${uuidv4()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
```

---

## 33. Brak Rate Limiting w Schuco Scraper

**Lokalizacja:** `apps/api/src/services/schuco/schucoScheduler.ts:33-45`

**Problem:**
Scheduler 3x dziennie + manual refresh bez limitu

**Wplyw:** Mozliwy ban za zbyt czeste requesty

**Rozwiazanie:**
```typescript
let lastScrapeTime = 0;
const MIN_INTERVAL = 5 * 60 * 1000; // 5 minut

async function scrapeWithRateLimit() {
  const now = Date.now();
  const timeSinceLastScrape = now - lastScrapeTime;

  if (timeSinceLastScrape < MIN_INTERVAL) {
    throw new Error(`Rate limit: Please wait ${Math.ceil((MIN_INTERVAL - timeSinceLastScrape) / 1000)}s`);
  }

  lastScrapeTime = now;
  return await scrape();
}
```

---

## 34. Credentials Exposure w Screenshots

**Lokalizacja:** `apps/api/src/services/schuco/schucoScraper.ts:158-162`

**Problem:**
```typescript
await this.page.screenshot({
  path: path.join(this.config.downloadPath, 'after-login.png'),
});
```

**Wplyw:** Screenshots moga zawierac wrazliwe dane

**Rozwiazanie:**
```typescript
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  await this.page.screenshot({
    path: path.join(this.config.downloadPath, 'after-login.png'),
  });
}
```

---

## 35. Brak Walidacji Numerow Telefonow/Emaili

**Lokalizacja:** `apps/api/prisma/schema.prisma:14`

**Problem:**
```prisma
email String @unique
```

**Wplyw:** Nieprawidlowe emaile moga trafic do bazy

**Rozwiazanie:**
```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/), // E.164 format
});
```

---

## 36. Brak Input Sanitization

**Lokalizacja:** Wszystkie POST/PUT endpoints

**Problem:**
Mozliwe XSS przez stored data

**Rozwiazanie:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Usun wszystkie HTML tags
    KEEP_CONTENT: true,
  });
}
```

---

## 37. Brak Helmet Security Headers

**Lokalizacja:** `apps/api/src/index.ts`

**Problem:**
Brak podstawowych security headers

**Rozwiazanie:**
```typescript
import helmet from '@fastify/helmet';

await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
});
```

---

## 38. Brak Audit Log

**Lokalizacja:** Brak w calym systemie

**Problem:**
Nie wiadomo kto co zmienil

**Rozwiazanie:**
```prisma
model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int?
  action    String   // CREATE, UPDATE, DELETE
  entity    String   // Order, Delivery, etc.
  entityId  Int
  changes   String?  // JSON with old/new values
  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entity, entityId])
  @@index([createdAt])
}
```

---

## 39. Memory Leak w useEffect bez Cleanup

**Lokalizacja:** Potencjalnie w niektorych komponentach React

**Problem:**
Mozliwe memory leaks przy unmount

**Rozwiazanie:**
```typescript
useEffect(() => {
  let cancelled = false;

  async function fetchData() {
    const data = await api.getData();
    if (!cancelled) {
      setData(data);
    }
  }

  fetchData();

  return () => {
    cancelled = true; // Cleanup
  };
}, []);
```

---

## 40. Brak Migracji dla Nowych Pol

**Lokalizacja:** Git status pokazuje zmiany w schema.prisma

**Problem:**
Zmiany w schema bez migracji moga spowodowac crash w produkcji

**Rozwiazanie:**
```bash
npx prisma migrate dev --name add_new_fields
npx prisma migrate deploy # w produkcji
```

---

## 41. Brak Timeout w File Watcher

**Lokalizacja:** `apps/api/src/services/file-watcher.ts`

**Problem:**
File watcher moze wisiec nieskoncznie

**Rozwiazanie:**
Dodac timeout dla operacji file watch

---

## Podsumowanie

| # | Problem | Status | Priorytet |
|---|---------|--------|-----------|
| 27 | Brak connection pooling | Do naprawy | SREDNI |
| 28 | Brak timeoutow fetch | Do naprawy | SREDNI |
| 29 | Brak retry logic | Do naprawy | SREDNI |
| 30 | Brak progress tracking | Do naprawy | SREDNI |
| 31 | Brak chunked upload | Do naprawy | SREDNI |
| 32 | File writes race condition | Do naprawy | SREDNI |
| 33 | Rate limiting scraper | Do naprawy | SREDNI |
| 34 | Screenshots w produkcji | Do naprawy | SREDNI |
| 35 | Walidacja email/phone | Do naprawy | SREDNI |
| 36 | Input sanitization | Do naprawy | SREDNI |
| 37 | Security headers | Do naprawy | SREDNI |
| 38 | Audit log | Do naprawy | SREDNI |
| 39 | Memory leak useEffect | Do naprawy | SREDNI |
| 40 | Migracje DB | Do naprawy | SREDNI |
| 41 | File watcher timeout | Do naprawy | SREDNI |

---

[Powrot do indeksu](./README.md) | [Poprzedni: Wysokie](./03-high-priority.md) | [Nastepny: Niskie](./05-low-priority.md)
