# Wysokie Problemy Bezpieczenstwa

**Priorytet:** WYSOKI - Naprawic w ciagu tygodnia
**Liczba problemow:** 15

> Te problemy moga prowadzic do zlej UX, podatnosci na bledy lub problemow z wydajnoscia.

---

## 12. Brak Limitu na Queries bez Paginacji

**Lokalizacja:** `apps/api/src/routes/orders.ts:45-78`

**Problem:**
```typescript
const orders = await prisma.order.findMany({
  where,
  select: {...}, // Pobiera wszystkie zlecenia bez limitu
  orderBy: { createdAt: 'desc' },
});
```

**Wplyw:** Moze spowodowac przeciazenie pamieci przy duzej liczbie rekordow

**Rozwiazanie:**
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

## 13. N+1 Query Problem w Orders

**Lokalizacja:** `apps/api/src/routes/orders.ts:84-99`

**Problem:**
```typescript
for (const total of allTotals) {
  totalsMap.set(total.orderId, {...});
}
```

**Wplyw:** Przy duzej liczbie zamowien wykonywane sa setki zapytan

**Rozwiazanie:**
Wykorzystac Prisma relations z `include`:
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

## 14. Brak Oczyszczania Starych Plikow

**Lokalizacja:** `apps/api/src/routes/imports.ts:51-62`

**Problem:**
Pliki w `uploads/` nigdy nie sa usuwane automatycznie

**Wplyw:** Zapelnianie dysku przez nigdy nieskasowane pliki

**Rozwiazanie:**
Cron job do czyszczenia starych plikow:
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

## 15. Memory Leak w Puppeteer

**Lokalizacja:** `apps/api/src/services/schuco/schucoScraper.ts:350-384`

**Problem:**
- Timeout 10s moze byc za krotki dla cleanup
- Process moze wisiec w tle
- Brak kill procesu potomnych

**Rozwiazanie:**
```typescript
async close(): Promise<void> {
  if (this.browser) {
    try {
      // Zwiekszony timeout
      await Promise.race([
        this.browser.close(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Browser close timeout')), 30000)
        )
      ]);
    } catch (error) {
      console.error('Error closing browser:', error);

      // Force kill wszystkich procesow chromium
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

## 16. Brak Walidacji Zod na Wiekszosci Endpointow

**Lokalizacja:** Wszystkie route files

**Problem:**
Tylko `/api/schuco` ma validatory, reszta nie

**Wplyw:** Nieprawidlowe dane moga trafic do bazy

**Rozwiazanie:**
Dodac Zod schemas dla wszystkich Body/Params/Querystring:
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

## 17. Brak Walidacji Dat

**Lokalizacja:** `apps/api/src/routes/imports.ts:328-346`

**Problem:**
```typescript
const dateMatch = folderName.match(/(\d{2})\.(\d{2})\.(\d{4})/);
const deliveryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
if (isNaN(deliveryDate.getTime())) {
  return reply.status(400).send({...});
}
```

**Wplyw:** Mozna przeslac nieprawidlowe daty (31.02.2025)

**Rozwiazanie:**
```typescript
import { isValid, parse } from 'date-fns';

const deliveryDate = parse(folderName, 'dd.MM.yyyy', new Date());
if (!isValid(deliveryDate)) {
  return reply.status(400).send({ error: 'Invalid date format' });
}
```

---

## 18. Potencjalne Problemy z Polish Characters

**Lokalizacja:** `apps/api/src/services/parsers/csv-parser.ts:258`

**Problem:**
```typescript
const content = await fs.promises.readFile(filepath, 'utf-8');
```

**Wplyw:** Pliki CSV moga byc w innym kodowaniu (Windows-1250)

**Rozwiazanie:**
```typescript
import { detect } from 'jschardet';
import iconv from 'iconv-lite';

const buffer = await fs.promises.readFile(filepath);
const detected = detect(buffer);
const encoding = detected.encoding || 'utf-8';

let content = iconv.decode(buffer, encoding);
// Usun BOM jesli istnieje
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
```

---

## 19. Brak Error Handling w CSV Parser Loop

**Lokalizacja:** `apps/api/src/routes/imports.ts:404-489`

**Problem:**
```typescript
for (const csvFile of csvFiles) {
  try {
    // ... processing
  } catch (error) {
    // Error jest logowany ale petla kontynuuje
  }
}
```

**Wplyw:** Bledy w jednym pliku moga wplynac na inne

**Rozwiazanie:**
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

## 20. Unhandled Promise Rejections

**Lokalizacja:** `apps/api/src/services/schuco/schucoScraper.ts:323-352`

**Problem:**
Brak globalnego handlera dla unhandled rejections

**Wplyw:** Process moze crashowac bez logow

**Rozwiazanie:**
```typescript
// W index.ts
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Opcjonalnie: wyslij do Sentry/logging service
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Graceful shutdown
  process.exit(1);
});
```

---

## 21. Brak Indeksow na Foreign Keys

**Lokalizacja:** `apps/api/prisma/schema.prisma`

**Problem:**
- `OrderRequirement.orderId` ma index, ale niektore foreign keys nie
- `DeliveryOrder.deliveryId` i `orderId` brak composite index

**Wplyw:** Wolne queries na relacjach

**Rozwiazanie:**
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

## 22. Brak Cascade Delete na Niektorych Relacjach

**Lokalizacja:** `apps/api/prisma/schema.prisma:260`

**Problem:**
```prisma
order Order @relation(fields: [orderId], references: [id])
```

**Wplyw:** Mozliwe orphaned records

**Rozwiazanie:**
```prisma
model OrderRequirement {
  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
}

model OrderWindow {
  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
}
```

---

## 23. Hardcoded Selectors w Scraperze

**Lokalizacja:** `apps/api/src/services/schuco/schucoScraper.ts:115-146`

**Problem:**
```typescript
await this.page.waitForSelector('#username', {...});
```

**Wplyw:** Zmiana HTML strony zepsuje scraper

**Rozwiazanie:**
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

// Uzycie:
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

## 24. Brak CAPTCHA Handling

**Lokalizacja:** `apps/api/src/services/schuco/schucoScraper.ts:103-163`

**Problem:**
Scraper przestanie dzialac jesli strona doda CAPTCHA

**Rozwiazanie:**
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

## 25. Brak Rate Limiting na API

**Lokalizacja:** Brak w calym backendzie

**Problem:**
Mozliwe DDoS lub brute force

**Rozwiazanie:**
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

## 26. Brak CSRF Protection

**Lokalizacja:** Brak w calym backendzie

**Problem:**
Mozliwe CSRF attacks

**Rozwiazanie:**
```typescript
import csrf from '@fastify/csrf-protection';

await fastify.register(csrf, {
  cookieOpts: { signed: true },
});

// W kazdym POST/PUT/DELETE endpoint:
fastify.post('/api/orders', {
  preHandler: fastify.csrfProtection,
  handler: async (request, reply) => {
    // ...
  }
});
```

---

## Podsumowanie

| # | Problem | Status | Priorytet |
|---|---------|--------|-----------|
| 12 | Brak paginacji | Do naprawy | WYSOKI |
| 13 | N+1 query problem | Do naprawy | WYSOKI |
| 14 | Brak czyszczenia plikow | Do naprawy | WYSOKI |
| 15 | Memory leak Puppeteer | Do naprawy | WYSOKI |
| 16 | Brak Zod validation | Do naprawy | WYSOKI |
| 17 | Brak walidacji dat | Do naprawy | WYSOKI |
| 18 | Polish characters | Do naprawy | WYSOKI |
| 19 | Error handling CSV | Do naprawy | WYSOKI |
| 20 | Unhandled rejections | Do naprawy | WYSOKI |
| 21 | Brak indeksow DB | Do naprawy | WYSOKI |
| 22 | Brak cascade delete | Do naprawy | WYSOKI |
| 23 | Hardcoded selectors | Do naprawy | WYSOKI |
| 24 | Brak CAPTCHA handling | Do naprawy | WYSOKI |
| 25 | Brak rate limiting | Do naprawy | WYSOKI |
| 26 | Brak CSRF protection | Do naprawy | WYSOKI |

---

[Powrot do indeksu](./README.md) | [Poprzedni: Krytyczne](./02-critical-issues.md) | [Nastepny: Srednie](./04-medium-priority.md)
