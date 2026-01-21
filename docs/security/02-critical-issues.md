# Krytyczne Problemy Bezpieczenstwa

**Priorytet:** KRYTYCZNY - Naprawic natychmiast
**Liczba problemow:** 11

> Te problemy wymagaja natychmiastowej naprawy. Zlamanie moze prowadzic do utraty danych, nieautoryzowanego dostepu lub awarii produkcji.

---

## 1. Hardcoded Credentials w Kodzie Zrodlowym

**Lokalizacja:** `apps/api/src/services/schuco/schucoScraper.ts:22-23`

**Problem:**
```typescript
email: process.env.SCHUCO_EMAIL || 'krzysztof@markbud.pl',
password: process.env.SCHUCO_PASSWORD || 'Markbud2020',
```

**Wplyw:** Haslo i email sa widoczne w kodzie zrodlowym i repozytorium Git

**Rozwiazanie:**
1. Usunac domyslne wartosci z kodu
2. Wymagac SCHUCO_EMAIL i SCHUCO_PASSWORD w zmiennych srodowiskowych
3. Dodac walidacje w config.ts:
```typescript
if (!process.env.SCHUCO_EMAIL || !process.env.SCHUCO_PASSWORD) {
  throw new Error('SCHUCO_EMAIL and SCHUCO_PASSWORD must be set');
}
```
4. Natychmiast zmienic haslo na koncie Schuco
5. Dodac `.env` do `.gitignore` (jesli nie jest)

---

## 2. Brak Autentykacji na Wiekszosci Endpointow

**Lokalizacja:** Wszystkie pliki w `apps/api/src/routes/`

**Problem:**
- Middleware `withAuth` z `auth.ts` nie jest uzywany nigdzie
- Wszystkie endpointy (orders, deliveries, warehouse, imports) sa publiczne
- Brak weryfikacji JWT
- Kazdy moze czytac, modyfikowac i usuwac dane bez autoryzacji

**Rozwiazanie:**
Dodac `preHandler: withAuth` do wszystkich wrazliwych route'ow:
```typescript
// W kazdym route file
import { withAuth } from '../middleware/auth';

fastify.get('/api/orders', {
  preHandler: withAuth,
  handler: async (request, reply) => {
    // ...
  }
});
```

**Endpointy wymagajace ochrony:**
- GET /api/orders
- POST /api/orders
- PUT /api/orders/:id
- DELETE /api/orders/:id
- GET /api/deliveries
- POST /api/deliveries
- PUT /api/deliveries/:id
- DELETE /api/deliveries/:id
- GET /api/warehouse
- POST /api/warehouse
- PUT /api/warehouse/:id
- POST /api/imports/*

---

## 3. SQL Injection - Brak Sanitacji w Warehouse Routes

**Lokalizacja:** `apps/api/src/routes/warehouse.ts:8-12`

**Problem:**
```typescript
const { colorId } = request.params;
where: { colorId: parseInt(colorId) }
```

**Wplyw:** Potencjalne SQL injection przy nieprawidlowych danych wejsciowych

**Rozwiazanie:**
Uzyc walidacji Zod dla params:
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

## 4. Path Traversal w Imports

**Lokalizacja:** `apps/api/src/routes/imports.ts:310-324`

**Problem:**
```typescript
if (!existsSync(folderPath)) {
  return reply.status(404).send({...});
}
```

**Wplyw:** Uzytkownik moze przeslac dowolna sciezke (np. `../../etc/passwd`) i uzyskac dostep do plikow systemowych

**Rozwiazanie:**
```typescript
import path from 'path';

const ALLOWED_BASE_DIR = path.resolve(__dirname, '../uploads');

function validatePath(userPath: string): string {
  const normalizedPath = path.normalize(path.join(ALLOWED_BASE_DIR, userPath));

  // Sprawdz czy sciezka zaczyna sie od dozwolonego katalogu
  if (!normalizedPath.startsWith(ALLOWED_BASE_DIR)) {
    throw new Error('Invalid path: Directory traversal attempt detected');
  }

  return normalizedPath;
}

// Uzycie:
const safeFolderPath = validatePath(folderName);
```

---

## 5. Brak Walidacji Rozmiaru i Typu Pliku na Backendzie

**Lokalizacja:** `apps/api/src/routes/imports.ts:14-83`

**Problem:**
- Frontend waliduje rozszerzenia, ale backend nie
- Ktos moze obejsc walidacje frontendowa przez curl/Postman
- Brak skanowania zawartosci pliku
- Mozliwosc uploadu zlosliwych plikow

**Rozwiazanie:**
```typescript
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function validateUploadedFile(buffer: Buffer): Promise<void> {
  // Sprawdz rozmiar
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }

  // Sprawdz MIME type przez magic bytes
  const fileType = await fileTypeFromBuffer(buffer);
  if (fileType && !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    throw new Error('Invalid file type');
  }

  // Sprawdz czy plik jest CSV (dodatkowa walidacja)
  const content = buffer.toString('utf-8');
  if (!content.includes(',') && !content.includes(';')) {
    throw new Error('File does not appear to be a valid CSV');
  }
}
```

---

## 6. Brak Transakcji w Krytycznych Operacjach

**Lokalizacja:** `apps/api/src/services/parsers/csv-parser.ts:102-245`

**Problem:**
```typescript
await prisma.orderRequirement.deleteMany({...});
await prisma.orderWindow.deleteMany({...});
order = await prisma.order.update({...});
// ... dalsze operacje bez transakcji
```

**Wplyw:** Czesciowe zapisy przy bledzie prowadza do niespojnych danych w bazie

**Rozwiazanie:**
```typescript
await prisma.$transaction(async (tx) => {
  await tx.orderRequirement.deleteMany({...});
  await tx.orderWindow.deleteMany({...});
  order = await tx.order.update({...});
  // ... wszystkie operacje w transakcji
});
```

---

## 7. Folder Import bez Atomic Transaction

**Lokalizacja:** `apps/api/src/routes/imports.ts:404-489`

**Problem:**
Kazdy plik jest importowany osobno, bez rollback calosci przy bledzie

**Wplyw:**
- Import 5 plikow: 3 sie udaja, 2 failuja
- W bazie zostaje niespojny stan
- Brak mozliwosci rollback

**Rozwiazanie:**
```typescript
await prisma.$transaction(async (tx) => {
  for (const csvFile of csvFiles) {
    // Wszystkie operacje uzywaja tx zamiast prisma
    await processCSVFile(csvFile, tx);
  }
}, {
  timeout: 300000, // 5 minut dla dlugich importow
});
```

---

## 8. Race Condition w Warehouse Monthly Update

**Lokalizacja:** `apps/api/src/routes/warehouse.ts:183-231`

**Problem:**
```typescript
for (const update of updates) {
  const result = await prisma.$transaction(async (tx) => {
    const currentStock = await tx.warehouseStock.findUnique({...});
    // ... operacje na currentStock
  });
}
```

**Wplyw:** Concurrent updates moga nadpisac sie nawzajem. Transaction jest wewnatrz petli, nie obejmuje calosci.

**Rozwiazanie:**
```typescript
const result = await prisma.$transaction(async (tx) => {
  for (const update of updates) {
    const currentStock = await tx.warehouseStock.findUnique({...});
    // ... operacje
  }
});
```

---

## 9. Concurrent Delivery Order Position

**Lokalizacja:** `apps/api/src/routes/imports.ts:455-467`

**Problem:**
```typescript
const maxPosition = await prisma.deliveryOrder.aggregate({...});
await prisma.deliveryOrder.create({
  data: {
    position: (maxPosition._max.position || 0) + 1,
  },
});
```

**Wplyw:** Dwa rownolegle requesty moga dostac te sama pozycje

**Rozwiazanie:**
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

## 10. Delivery Order Creation bez Rollback

**Lokalizacja:** `apps/api/src/routes/imports.ts:445-470`

**Problem:**
Blad moze zostawic zlecenie bez delivery order

**Rozwiazanie:**
Transakcja obejmujaca create order + create delivery order

---

## 11. Uzywanie SQLite w Produkcji

**Lokalizacja:** `apps/api/prisma/schema.prisma:6`

**Problem:**
```prisma
provider = "sqlite"
```

**Wplyw:**
- Brak proper connection pooling
- Slaba wspolbieznosc (write locks calej bazy)
- Jeden plik bazy (single point of failure)
- Problemy z concurrent writes
- Brak zaawansowanych features (partial indexes, etc.)

**Rozwiazanie:**
Zaplanowac migracje do PostgreSQL:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Uwaga:** To jest problem dlugoterminowy, ale wazny do zaplanowania.

---

## Podsumowanie

| # | Problem | Status | Priorytet |
|---|---------|--------|-----------|
| 1 | Hardcoded credentials | Do naprawy | KRYTYCZNY |
| 2 | Brak autentykacji | Do naprawy | KRYTYCZNY |
| 3 | SQL Injection | Do naprawy | KRYTYCZNY |
| 4 | Path Traversal | Do naprawy | KRYTYCZNY |
| 5 | Brak walidacji plikow | Do naprawy | KRYTYCZNY |
| 6 | Brak transakcji | Do naprawy | KRYTYCZNY |
| 7 | Folder import bez atomic | Do naprawy | KRYTYCZNY |
| 8 | Race condition warehouse | Do naprawy | KRYTYCZNY |
| 9 | Race condition delivery | Do naprawy | KRYTYCZNY |
| 10 | Delivery bez rollback | Do naprawy | KRYTYCZNY |
| 11 | SQLite w produkcji | Dlugoterminowe | KRYTYCZNY |

---

[Powrot do indeksu](./README.md) | [Nastepny: Wysokie problemy](./03-high-priority.md)
