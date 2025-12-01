# RAPORT ANALIZY BEZPIECZEŃSTWA I BŁĘDÓW - PROJEKT AKROBUD

**Data analizy:** 2025-12-01
**Wersja:** 1.0
**Analiza:** Kompletny audyt bezpieczeństwa i jakości kodu

---

## 📊 PODSUMOWANIE WYKONAWCZE

**Znalezione problemy według priorytetu:**
- 🔴 **KRYTYCZNE (Natychmiast naprawić):** 11 problemów
- 🟠 **WYSOKIE (Naprawić w ciągu tygodnia):** 15 problemów
- 🟡 **ŚREDNIE (Naprawić w ciągu miesiąca):** 15 problemów
- 🟢 **NISKIE (Nice to have):** 4 problemy

**RAZEM:** 45 zidentyfikowanych problemów

---

## 🚨 KRYTYCZNE PROBLEMY BEZPIECZEŃSTWA

### 1. HARDCODED CREDENTIALS W KODZIE ŹRÓDŁOWYM
**Lokalizacja:** `apps/api/src/services/schuco/schucoScraper.ts:22-23`
**Priorytet:** 🔴 KRYTYCZNY

**Problem:**
```typescript
email: process.env.SCHUCO_EMAIL || 'krzysztof@markbud.pl',
password: process.env.SCHUCO_PASSWORD || 'Markbud2020',
```

**Wpływ:** Hasło i email są widoczne w kodzie źródłowym i repozytorium Git

**Rozwiązanie:**
1. Usunąć domyślne wartości z kodu
2. Wymagać SCHUCO_EMAIL i SCHUCO_PASSWORD w zmiennych środowiskowych
3. Dodać walidację w config.ts:
```typescript
if (!process.env.SCHUCO_EMAIL || !process.env.SCHUCO_PASSWORD) {
  throw new Error('SCHUCO_EMAIL and SCHUCO_PASSWORD must be set');
}
```
4. Natychmiast zmienić hasło na koncie Schüco
5. Dodać `.env` do `.gitignore` (jeśli nie jest)

---

### 2. BRAK AUTENTYKACJI NA WIĘKSZOŚCI ENDPOINTÓW
**Lokalizacja:** Wszystkie pliki w `apps/api/src/routes/`
**Priorytet:** 🔴 KRYTYCZNY

**Problem:**
- Middleware `withAuth` z `auth.ts` nie jest używany nigdzie
- Wszystkie endpointy (orders, deliveries, warehouse, imports) są publiczne
- Brak weryfikacji JWT
- Każdy może czytać, modyfikować i usuwać dane bez autoryzacji

**Rozwiązanie:**
Dodać `preHandler: withAuth` do wszystkich wrażliwych route'ów:
```typescript
// W każdym route file
import { withAuth } from '../middleware/auth';

fastify.get('/api/orders', {
  preHandler: withAuth,
  handler: async (request, reply) => {
    // ...
  }
});
```

**Endpointy wymagające ochrony:**
- ✅ GET /api/orders
- ✅ POST /api/orders
- ✅ PUT /api/orders/:id
- ✅ DELETE /api/orders/:id
- ✅ GET /api/deliveries
- ✅ POST /api/deliveries
- ✅ PUT /api/deliveries/:id
- ✅ DELETE /api/deliveries/:id
- ✅ GET /api/warehouse
- ✅ POST /api/warehouse
- ✅ PUT /api/warehouse/:id
- ✅ POST /api/imports/*

---

### 3. SQL INJECTION - BRAK SANITACJI W WAREHOUSE ROUTES
**Lokalizacja:** `apps/api/src/routes/warehouse.ts:8-12`
**Priorytet:** 🔴 KRYTYCZNY

**Problem:**
```typescript
const { colorId } = request.params;
where: { colorId: parseInt(colorId) }
```

**Wpływ:** Potencjalne SQL injection przy nieprawidłowych danych wejściowych

**Rozwiązanie:**
Użyć walidacji Zod dla params:
```typescript
const paramsSchema = z.object({
  colorId: z.string().regex(/^\d+$/).transform(Number)
});

fastify.get('/api/warehouse/:colorId', {
  schema: {
    params: paramsSchema
  },
  handler: async (request, reply) => {
    const { colorId } = request.params; // Already validated
    // ...
  }
});
```

---

### 4. PATH TRAVERSAL W IMPORTS
**Lokalizacja:** `apps/api/src/routes/imports.ts:310-324`
**Priorytet:** 🔴 KRYTYCZNY

**Problem:**
```typescript
if (!existsSync(folderPath)) {
  return reply.status(404).send({...});
}
```

**Wpływ:** Użytkownik może przesłać dowolną ścieżkę (np. `../../etc/passwd`) i uzyskać dostęp do plików systemowych

**Rozwiązanie:**
```typescript
import path from 'path';

const ALLOWED_BASE_DIR = path.resolve(__dirname, '../uploads');

function validatePath(userPath: string): string {
  const normalizedPath = path.normalize(path.join(ALLOWED_BASE_DIR, userPath));

  // Sprawdź czy ścieżka zaczyna się od dozwolonego katalogu
  if (!normalizedPath.startsWith(ALLOWED_BASE_DIR)) {
    throw new Error('Invalid path: Directory traversal attempt detected');
  }

  return normalizedPath;
}

// Użycie:
const safeFolderPath = validatePath(folderName);
```

---

### 5. BRAK WALIDACJI ROZMIARU I TYPU PLIKU NA BACKENDZIE
**Lokalizacja:** `apps/api/src/routes/imports.ts:14-83`
**Priorytet:** 🔴 KRYTYCZNY

**Problem:**
- Frontend waliduje rozszerzenia, ale backend nie
- Ktoś może obejść walidację frontendową przez curl/Postman
- Brak skanowania zawartości pliku
- Możliwość uploadu złośliwych plików

**Rozwiązanie:**
```typescript
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function validateUploadedFile(buffer: Buffer): Promise<void> {
  // Sprawdź rozmiar
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }

  // Sprawdź MIME type przez magic bytes
  const fileType = await fileTypeFromBuffer(buffer);
  if (fileType && !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    throw new Error('Invalid file type');
  }

  // Sprawdź czy plik jest CSV (dodatkowa walidacja)
  const content = buffer.toString('utf-8');
  if (!content.includes(',') && !content.includes(';')) {
    throw new Error('File does not appear to be a valid CSV');
  }
}
```

---

### 6. BRAK TRANSAKCJI W KRYTYCZNYCH OPERACJACH
**Lokalizacja:** `apps/api/src/services/parsers/csv-parser.ts:102-245`
**Priorytet:** 🔴 KRYTYCZNY

**Problem:**
```typescript
await prisma.orderRequirement.deleteMany({...});
await prisma.orderWindow.deleteMany({...});
order = await prisma.order.update({...});
// ... dalsze operacje bez transakcji
```

**Wpływ:** Częściowe zapisy przy błędzie prowadzą do niespójnych danych w bazie

**Rozwiązanie:**
```typescript
await prisma.$transaction(async (tx) => {
  await tx.orderRequirement.deleteMany({...});
  await tx.orderWindow.deleteMany({...});
  order = await tx.order.update({...});
  // ... wszystkie operacje w transakcji
});
```

---

### 7. FOLDER IMPORT BEZ ATOMIC TRANSACTION
**Lokalizacja:** `apps/api/src/routes/imports.ts:404-489`
**Priorytet:** 🔴 KRYTYCZNY

**Problem:**
Każdy plik jest importowany osobno, bez rollback całości przy błędzie

**Wpływ:**
- Import 5 plików: 3 się udają, 2 failują
- W bazie zostaje niespójny stan
- Brak możliwości rollback

**Rozwiązanie:**
```typescript
await prisma.$transaction(async (tx) => {
  for (const csvFile of csvFiles) {
    // Wszystkie operacje używają tx zamiast prisma
    await processCSVFile(csvFile, tx);
  }
}, {
  timeout: 300000, // 5 minut dla długich importów
});
```

---

### 8. RACE CONDITION W WAREHOUSE MONTHLY UPDATE
**Lokalizacja:** `apps/api/src/routes/warehouse.ts:183-231`
**Priorytet:** 🔴 KRYTYCZNY

**Problem:**
```typescript
for (const update of updates) {
  const result = await prisma.$transaction(async (tx) => {
    const currentStock = await tx.warehouseStock.findUnique({...});
    // ... operacje na currentStock
  });
}
```

**Wpływ:** Concurrent updates mogą nadpisać się nawzajem. Transaction jest wewnątrz pętli, nie obejmuje całości.

**Rozwiązanie:**
```typescript
const result = await prisma.$transaction(async (tx) => {
  for (const update of updates) {
    const currentStock = await tx.warehouseStock.findUnique({...});
    // ... operacje
  }
});
```

---

### 9. CONCURRENT DELIVERY ORDER POSITION
**Lokalizacja:** `apps/api/src/routes/imports.ts:455-467`
**Priorytet:** 🔴 KRYTYCZNY

**Problem:**
```typescript
const maxPosition = await prisma.deliveryOrder.aggregate({...});
await prisma.deliveryOrder.create({
  data: {
    position: (maxPosition._max.position || 0) + 1,
  },
});
```

**Wpływ:** Dwa równoległe requesty mogą dostać tę samą pozycję

**Rozwiązanie:**
```typescript
await prisma.$transaction(async (tx) => {
  const maxPosition = await tx.deliveryOrder.aggregate({...});
  await tx.deliveryOrder.create({
    data: {
      position: (maxPosition._max.position || 0) + 1,
    },
  });
});
```

---

### 10. DELIVERY ORDER CREATION BEZ ROLLBACK
**Lokalizacja:** `apps/api/src/routes/imports.ts:445-470`
**Priorytet:** 🔴 KRYTYCZNY

**Problem:**
Błąd może zostawić zlecenie bez delivery order

**Rozwiązanie:**
Transakcja obejmująca create order + create delivery order

---

### 11. UŻYWANIE SQLITE W PRODUKCJI
**Lokalizacja:** `apps/api/prisma/schema.prisma:6`
**Priorytet:** 🔴 KRYTYCZNY (długoterminowy)

**Problem:**
```prisma
provider = "sqlite"
```

**Wpływ:**
- Brak proper connection pooling
- Słaba współbieżność (write locks całej bazy)
- Jeden plik bazy (single point of failure)
- Problemy z concurrent writes
- Brak zaawansowanych features (partial indexes, etc.)

**Rozwiązanie:**
Zaplanować migrację do PostgreSQL:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 🟠 WYSOKIE PROBLEMY

### 12. BRAK LIMITU NA QUERIES BEZ PAGINACJI
**Lokalizacja:** `apps/api/src/routes/orders.ts:45-78`
**Priorytet:** 🟠 WYSOKI

**Problem:**
```typescript
const orders = await prisma.order.findMany({
  where,
  select: {...}, // Pobiera wszystkie zlecenia bez limitu
  orderBy: { createdAt: 'desc' },
});
```

**Wpływ:** Może spowodować przeciążenie pamięci przy dużej liczbie rekordów

**Rozwiązanie:**
```typescript
const DEFAULT_PAGE_SIZE = 100;
const page = request.query.page || 1;
const limit = request.query.limit || DEFAULT_PAGE_SIZE;

const orders = await prisma.order.findMany({
  where,
  select: {...},
  orderBy: { createdAt: 'desc' },
  take: limit,
  skip: (page - 1) * limit,
});

const total = await prisma.order.count({ where });

return {
  data: orders,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
};
```

---

### 13. N+1 QUERY PROBLEM W ORDERS
**Lokalizacja:** `apps/api/src/routes/orders.ts:84-99`
**Priorytet:** 🟠 WYSOKI

**Problem:**
```typescript
for (const total of allTotals) {
  totalsMap.set(total.orderId, {...});
}
```

**Wpływ:** Przy dużej liczbie zamówień wykonywane są setki zapytań

**Rozwiązanie:**
Wykorzystać Prisma relations z `include`:
```typescript
const orders = await prisma.order.findMany({
  where,
  include: {
    requirements: true,
    windows: true,
  },
});
```

---

### 14. BRAK OCZYSZCZANIA STARYCH PLIKÓW
**Lokalizacja:** `apps/api/src/routes/imports.ts:51-62`
**Priorytet:** 🟠 WYSOKI

**Problem:**
Pliki w `uploads/` nigdy nie są usuwane automatycznie

**Wpływ:** Zapełnianie dysku przez nigdy nieskasowane pliki

**Rozwiązanie:**
Cron job do czyszczenia starych plików:
```typescript
import cron from 'node-cron';
import { unlink, stat } from 'fs/promises';
import { readdir } from 'fs/promises';

// Uruchom codziennie o 3:00
cron.schedule('0 3 * * *', async () => {
  const uploadsDir = path.join(__dirname, '../uploads');
  const files = await readdir(uploadsDir);
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    const stats = await stat(filePath);

    if (stats.mtimeMs < thirtyDaysAgo) {
      await unlink(filePath);
      console.log(`Deleted old file: ${file}`);
    }
  }
});
```

---

### 15. MEMORY LEAK W PUPPETEER
**Lokalizacja:** `apps/api/src/services/schuco/schucoScraper.ts:350-384`
**Priorytet:** 🟠 WYSOKI

**Problem:**
- Timeout 10s może być za krótki dla cleanup
- Process może wisieć w tle
- Brak kill procesu potomnych

**Rozwiązanie:**
```typescript
async close(): Promise<void> {
  if (this.browser) {
    try {
      // Zwiększony timeout
      await Promise.race([
        this.browser.close(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Browser close timeout')), 30000)
        )
      ]);
    } catch (error) {
      console.error('Error closing browser:', error);

      // Force kill wszystkich procesów chromium
      if (process.platform === 'win32') {
        exec('taskkill /F /IM chrome.exe /T');
        exec('taskkill /F /IM chromium.exe /T');
      } else {
        exec('pkill -9 chrome');
        exec('pkill -9 chromium');
      }
    }
  }
}
```

---

### 16. BRAK WALIDACJI ZOD NA WIĘKSZOŚCI ENDPOINTÓW
**Lokalizacja:** Wszystkie route files
**Priorytet:** 🟠 WYSOKI

**Problem:**
Tylko `/api/schuco` ma validatory, reszta nie

**Wpływ:** Nieprawidłowe dane mogą trafić do bazy

**Rozwiązanie:**
Dodać Zod schemas dla wszystkich Body/Params/Querystring:
```typescript
// validators/orders.ts
import { z } from 'zod';

export const createOrderSchema = z.object({
  orderNumber: z.string().min(1),
  customerName: z.string().min(1),
  deliveryDate: z.string().datetime().optional(),
  // ...
});

export const updateOrderSchema = createOrderSchema.partial();

export const orderParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
});
```

---

### 17. BRAK WALIDACJI DAT
**Lokalizacja:** `apps/api/src/routes/imports.ts:328-346`
**Priorytet:** 🟠 WYSOKI

**Problem:**
```typescript
const dateMatch = folderName.match(/(\d{2})\.(\d{2})\.(\d{4})/);
const deliveryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
if (isNaN(deliveryDate.getTime())) {
  return reply.status(400).send({...});
}
```

**Wpływ:** Można przesłać nieprawidłowe daty (31.02.2025)

**Rozwiązanie:**
```typescript
import { isValid, parse } from 'date-fns';

const deliveryDate = parse(folderName, 'dd.MM.yyyy', new Date());
if (!isValid(deliveryDate)) {
  return reply.status(400).send({ error: 'Invalid date format' });
}
```

---

### 18. POTENCJALNE PROBLEMY Z POLISH CHARACTERS
**Lokalizacja:** `apps/api/src/services/parsers/csv-parser.ts:258`
**Priorytet:** 🟠 WYSOKI

**Problem:**
```typescript
const content = await fs.promises.readFile(filepath, 'utf-8');
```

**Wpływ:** Pliki CSV mogą być w innym kodowaniu (Windows-1250)

**Rozwiązanie:**
```typescript
import { detect } from 'jschardet';
import iconv from 'iconv-lite';

const buffer = await fs.promises.readFile(filepath);
const detected = detect(buffer);
const encoding = detected.encoding || 'utf-8';

let content = iconv.decode(buffer, encoding);
// Usuń BOM jeśli istnieje
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
```

---

### 19. BRAK ERROR HANDLING W CSV PARSER LOOP
**Lokalizacja:** `apps/api/src/routes/imports.ts:404-489`
**Priorytet:** 🟠 WYSOKI

**Problem:**
```typescript
for (const csvFile of csvFiles) {
  try {
    // ... processing
  } catch (error) {
    // Error jest logowany ale pętla kontynuuje
  }
}
```

**Wpływ:** Błędy w jednym pliku mogą wpłynąć na inne

**Rozwiązanie:**
```typescript
const results = {
  successful: [],
  failed: [],
};

for (const csvFile of csvFiles) {
  try {
    await processCSVFile(csvFile);
    results.successful.push(csvFile);
  } catch (error) {
    results.failed.push({ file: csvFile, error: error.message });
    // Przerwij dalsze przetwarzanie
    break;
  }
}

if (results.failed.length > 0) {
  // Rollback wszystkich zmian
  throw new Error(`Import failed for files: ${results.failed.map(f => f.file).join(', ')}`);
}
```

---

### 20. UNHANDLED PROMISE REJECTIONS
**Lokalizacja:** `apps/api/src/services/schuco/schucoScraper.ts:323-352`
**Priorytet:** 🟠 WYSOKI

**Problem:**
Brak globalnego handlera dla unhandled rejections

**Wpływ:** Process może crashować bez logów

**Rozwiązanie:**
```typescript
// W index.ts
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Opcjonalnie: wyślij do Sentry/logging service
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Graceful shutdown
  process.exit(1);
});
```

---

### 21. BRAK INDEKSÓW NA FOREIGN KEYS
**Lokalizacja:** `apps/api/prisma/schema.prisma`
**Priorytet:** 🟠 WYSOKI

**Problem:**
- `OrderRequirement.orderId` ma index, ale niektóre foreign keys nie
- `DeliveryOrder.deliveryId` i `orderId` brak composite index

**Wpływ:** Wolne queries na relacjach

**Rozwiązanie:**
```prisma
model DeliveryOrder {
  // ...

  @@index([deliveryId, orderId])
  @@index([deliveryId])
  @@index([orderId])
}

model WarehouseTransaction {
  // ...

  @@index([stockId])
  @@index([date])
}
```

---

### 22. BRAK CASCADE DELETE NA NIEKTÓRYCH RELACJACH
**Lokalizacja:** `apps/api/prisma/schema.prisma:260`
**Priorytet:** 🟠 WYSOKI

**Problem:**
```prisma
order Order @relation(fields: [orderId], references: [id])
```

**Wpływ:** Możliwe orphaned records

**Rozwiązanie:**
```prisma
model OrderRequirement {
  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
}

model OrderWindow {
  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
}
```

---

### 23. HARDCODED SELECTORS W SCRAPERZE
**Lokalizacja:** `apps/api/src/services/schuco/schucoScraper.ts:115-146`
**Priorytet:** 🟠 WYSOKI

**Problem:**
```typescript
await this.page.waitForSelector('#username', {...});
```

**Wpływ:** Zmiana HTML strony zepsuje scraper

**Rozwiązanie:**
```typescript
// config/selectors.ts
export const SCHUCO_SELECTORS = {
  login: {
    username: ['#username', '[name="username"]', 'input[type="email"]'],
    password: ['#password', '[name="password"]', 'input[type="password"]'],
    submit: ['button[type="submit"]', '.login-button'],
  },
  orders: {
    table: ['#orders-table', '.orders-list', 'table.data-table'],
  }
};

// Użycie:
async function waitForOneOf(selectors: string[]) {
  for (const selector of selectors) {
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      return selector;
    } catch {}
  }
  throw new Error('None of the selectors found');
}
```

---

### 24. BRAK CAPTCHA HANDLING
**Lokalizacja:** `apps/api/src/services/schuco/schucoScraper.ts:103-163`
**Priorytet:** 🟠 WYSOKI

**Problem:**
Scraper przestanie działać jeśli strona doda CAPTCHA

**Rozwiązanie:**
```typescript
async detectAndHandleCaptcha() {
  const captchaSelectors = [
    'iframe[src*="recaptcha"]',
    '.g-recaptcha',
    '#captcha',
  ];

  for (const selector of captchaSelectors) {
    const captcha = await this.page.$(selector);
    if (captcha) {
      console.warn('CAPTCHA detected! Manual intervention required.');
      // Opcjonalnie: integracja z 2captcha API
      throw new Error('CAPTCHA detected - cannot proceed');
    }
  }
}
```

---

### 25. BRAK RATE LIMITING NA API
**Lokalizacja:** Brak w całym backendzie
**Priorytet:** 🟠 WYSOKI

**Problem:**
Możliwe DDoS lub brute force

**Rozwiązanie:**
```typescript
import rateLimit from '@fastify/rate-limit';

await fastify.register(rateLimit, {
  max: 100, // 100 requests
  timeWindow: '15 minutes',
  errorResponseBuilder: (request, context) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: `Rate limit exceeded, retry in ${context.after}`,
  }),
});
```

---

### 26. BRAK CSRF PROTECTION
**Lokalizacja:** Brak w całym backendzie
**Priorytet:** 🟠 WYSOKI

**Problem:**
Możliwe CSRF attacks

**Rozwiązanie:**
```typescript
import csrf from '@fastify/csrf-protection';

await fastify.register(csrf, {
  cookieOpts: { signed: true },
});

// W każdym POST/PUT/DELETE endpoint:
fastify.post('/api/orders', {
  preHandler: fastify.csrfProtection,
  handler: async (request, reply) => {
    // ...
  }
});
```

---

## 🟡 ŚREDNIE PROBLEMY

### 27. BRAK CONNECTION POOLING CONFIG
**Lokalizacja:** `apps/api/src/index.ts:37`
**Priorytet:** 🟡 ŚREDNI

**Problem:**
```typescript
export const prisma = new PrismaClient();
```

**Rozwiązanie:**
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

### 28. BRAK TIMEOUTÓW W FETCH REQUESTS
**Lokalizacja:** `apps/web/src/lib/api.ts:55-89`
**Priorytet:** 🟡 ŚREDNI

**Problem:**
```typescript
const response = await fetch(url, {
  ...options,
  headers: {...},
});
```

**Wpływ:** Requests mogą wisieć w nieskończoność

**Rozwiązanie:**
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

### 29. BRAK RETRY LOGIC W API CALLS
**Lokalizacja:** `apps/web/src/lib/api.ts`
**Priorytet:** 🟡 ŚREDNI

**Problem:**
Network blips powodują błędy

**Rozwiązanie:**
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

### 30. BRAK PROGRESS TRACKING NA BACKENDZIE
**Lokalizacja:** `apps/api/src/routes/imports.ts:14-83`
**Priorytet:** 🟡 ŚREDNI

**Problem:**
Frontend symuluje progress (fake progress bar)

**Rozwiązanie:**
Implementować real progress tracking przez WebSocket:
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

### 31. BRAK CHUNKED UPLOAD DLA DUŻYCH PLIKÓW
**Lokalizacja:** `apps/web/src/lib/api.ts:331-369`
**Priorytet:** 🟡 ŚREDNI

**Problem:**
Duże pliki (>10MB) mogą timeout

**Rozwiązanie:**
Implementować chunked upload z resumable capability

---

### 32. CONCURRENT FILE WRITES BEZ LOCKING
**Lokalizacja:** `apps/api/src/routes/imports.ts:56-62`
**Priorytet:** 🟡 ŚREDNI

**Problem:**
```typescript
const safeFilename = `${timestamp}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
await writeFile(filepath, buffer);
```

**Wpływ:** Teoretyczna możliwość race condition przy identycznych timestamp

**Rozwiązanie:**
```typescript
import { v4 as uuidv4 } from 'uuid';

const safeFilename = `${timestamp}_${uuidv4()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
```

---

### 33. BRAK RATE LIMITING W SCHÜCO SCRAPER
**Lokalizacja:** `apps/api/src/services/schuco/schucoScheduler.ts:33-45`
**Priorytet:** 🟡 ŚREDNI

**Problem:**
Scheduler 3x dziennie + manual refresh bez limitu

**Wpływ:** Możliwy ban za zbyt częste requesty

**Rozwiązanie:**
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

### 34. CREDENTIALS EXPOSURE W SCREENSHOTS
**Lokalizacja:** `apps/api/src/services/schuco/schucoScraper.ts:158-162`
**Priorytet:** 🟡 ŚREDNI

**Problem:**
```typescript
await this.page.screenshot({
  path: path.join(this.config.downloadPath, 'after-login.png'),
});
```

**Wpływ:** Screenshots mogą zawierać wrażliwe dane

**Rozwiązanie:**
```typescript
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  await this.page.screenshot({
    path: path.join(this.config.downloadPath, 'after-login.png'),
  });
}
```

---

### 35. BRAK WALIDACJI NUMERÓW TELEFONÓW/EMAILI
**Lokalizacja:** `apps/api/prisma/schema.prisma:14`
**Priorytet:** 🟡 ŚREDNI

**Problem:**
```prisma
email String @unique
```

**Wpływ:** Nieprawidłowe emaile mogą trafić do bazy

**Rozwiązanie:**
```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/), // E.164 format
});
```

---

### 36. BRAK INPUT SANITIZATION
**Lokalizacja:** Wszystkie POST/PUT endpoints
**Priorytet:** 🟡 ŚREDNI

**Problem:**
Możliwe XSS przez stored data

**Rozwiązanie:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Usuń wszystkie HTML tags
    KEEP_CONTENT: true,
  });
}
```

---

### 37. BRAK HELMET SECURITY HEADERS
**Lokalizacja:** `apps/api/src/index.ts`
**Priorytet:** 🟡 ŚREDNI

**Problem:**
Brak podstawowych security headers

**Rozwiązanie:**
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

### 38. BRAK AUDIT LOG
**Lokalizacja:** Brak w całym systemie
**Priorytet:** 🟡 ŚREDNI

**Problem:**
Nie wiadomo kto co zmienił

**Rozwiązanie:**
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

### 39. MEMORY LEAK W useEffect BEZ CLEANUP
**Lokalizacja:** Potencjalnie w niektórych komponentach React
**Priorytet:** 🟡 ŚREDNI

**Problem:**
Możliwe memory leaks przy unmount

**Rozwiązanie:**
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

### 40. BRAK MIGRACJI DLA NOWYCH PÓL
**Lokalizacja:** Git status pokazuje zmiany w schema.prisma
**Priorytet:** 🟡 ŚREDNI

**Problem:**
Zmiany w schema bez migracji mogą spowodować crash w produkcji

**Rozwiązanie:**
```bash
npx prisma migrate dev --name add_new_fields
npx prisma migrate deploy # w produkcji
```

---

### 41. BRAK TIMEOUT W FILE WATCHER
**Lokalizacja:** `apps/api/src/services/file-watcher.ts`
**Priorytet:** 🟡 ŚREDNI

**Problem:**
File watcher może wisieć nieskończenie

**Rozwiązanie:**
Dodać timeout dla operacji file watch

---

## 🟢 NISKIE PROBLEMY

### 42. BRAK OPTIMISTIC UPDATES
**Lokalizacja:** `apps/web/src/app/importy/page.tsx:61-80`
**Priorytet:** 🟢 NISKI

**Problem:**
Mutacje czekają na response przed update UI

**Wpływ:** Wolniejsze UX

**Rozwiązanie:**
```typescript
const mutation = useMutation({
  mutationFn: updateOrder,
  onMutate: async (newData) => {
    // Optimistic update
    await queryClient.cancelQueries(['orders']);
    const previousOrders = queryClient.getQueryData(['orders']);
    queryClient.setQueryData(['orders'], (old) => [...old, newData]);
    return { previousOrders };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['orders'], context.previousOrders);
  },
});
```

---

### 43. UŻYWANIE db:push ZAMIAST MIGRATE (JUŻ NAPRAWIONE)
**Lokalizacja:** `apps/api/package.json:20`
**Priorytet:** 🟢 NISKI (już rozwiązane)

```json
"db:push": "echo '⚠️ UWAGA: db:push KASUJE DANE! Użyj db:migrate zamiast tego.' && exit 1",
```

**Status:** ✅ To już jest dobrze zrobione - ochrona przed przypadkowym db:push

---

### 44. NIEEFEKTYWNE RE-RENDERS (PRAWIDŁOWE)
**Lokalizacja:** `apps/web/src/app/magazyn/dostawy-schuco/page.tsx:95-102`
**Priorytet:** 🟢 NISKI

```typescript
const changedCounts = useMemo(() => {
  const counts = { new: 0, updated: 0 };
  deliveries.forEach((d) => {
    if (d.changeType === 'new') counts.new++;
    else if (d.changeType === 'updated') counts.updated++;
  });
  return counts;
}, [deliveries]);
```

**Status:** ✅ To jest prawidłowe użycie useMemo - nie ma problemu

---

### 45. BRAK CHARSET W RESPONSE HEADERS (CZĘŚCIOWO NAPRAWIONE)
**Lokalizacja:** `apps/api/src/index.ts:78-82`
**Priorytet:** 🟢 NISKI

**Status:** Częściowo naprawione przez hook onSend

**Problem:** Hook dodaje charset tylko gdy brak Content-Type

**Rozwiązanie:** Zawsze jawnie ustawiać charset na początku response

---

## 📋 PLAN NAPRAWY

### FAZA 1: KRYTYCZNE (Natychmiast - dzisiaj/jutro)
1. ✅ Usunąć hardcoded credentials (#1)
2. ✅ Dodać autentykację JWT do wszystkich endpoints (#2)
3. ✅ Naprawić path traversal w imports (#4)
4. ✅ Dodać walidację plików na backendzie (#5)
5. ✅ Opakować wszystkie krytyczne operacje w transakcje (#6, #7, #8, #9, #10)

### FAZA 2: WYSOKIE (Ten tydzień)
6. ✅ Dodać SQL injection protection (#3)
7. ✅ Dodać paginację do wszystkich list (#12)
8. ✅ Naprawić memory leak w Puppeteer (#15)
9. ✅ Dodać Zod validation do wszystkich endpoints (#16)
10. ✅ Poprawić error handling (#19, #20)
11. ✅ Dodać indeksy w bazie (#21, #22)
12. ✅ Naprawić hardcoded selectors w scraperze (#23)
13. ✅ Dodać rate limiting (#25)
14. ✅ Dodać CSRF protection (#26)

### FAZA 3: ŚREDNIE (Ten miesiąc)
15. ✅ Skonfigurować connection pooling (#27)
16. ✅ Dodać timeouts do fetch (#28)
17. ✅ Dodać retry logic (#29)
18. ✅ Implementować cleanup starych plików (#14)
19. ✅ Poprawić kodowanie CSV (#18)
20. ✅ Dodać security headers (Helmet) (#37)
21. ✅ Dodać audit log (#38)
22. ✅ Naprawić rate limiting w scraperze (#33)

### FAZA 4: DŁUGOTERMINOWE (Q1 2026)
23. ✅ Zaplanować migrację do PostgreSQL (#11)
24. ✅ Implementować WebSocket progress tracking (#30)
25. ✅ Dodać chunked upload (#31)
26. ✅ Implementować CAPTCHA handling (#24)

---

## 🔍 MONITOROWANIE I UTRZYMANIE

### Zalecane narzędzia:
1. **Sentry** - Error tracking i monitoring
2. **PM2** - Process management w produkcji
3. **Winston/Pino** - Structured logging
4. **Prometheus + Grafana** - Metryki i dashboardy
5. **Snyk** - Security scanning dependencies
6. **ESLint + Prettier** - Code quality

### Code review checklist:
- [ ] Wszystkie nowe endpointy mają autentykację
- [ ] Wszystkie dane wejściowe są walidowane przez Zod
- [ ] Krytyczne operacje są w transakcjach
- [ ] Nie ma hardcoded credentials
- [ ] Są testy dla nowej funkcjonalności
- [ ] Error handling jest prawidłowy
- [ ] Nie ma SQL injection vectors
- [ ] Path traversal jest niemożliwy

---

## 📞 KONTAKT W RAZIE PYTAŃ

W razie pytań lub wątpliwości dotyczących któregokolwiek z problemów, proszę o kontakt przed rozpoczęciem naprawy.

---

**Dokument wygenerowany:** 2025-12-01
**Autor:** Claude Code - Comprehensive Security Audit
**Wersja:** 1.0
