# File Operations & Imports

> **Powrót do:** [Edge Cases README](./README.md) | [Oryginalny dokument](../EDGE_CASES_ANALYSIS.md)

---

## 4.1 File Size Validation Bypass

**Severity:** HIGH
**Location:** [../../apps/api/src/utils/file-validation.ts:28](../../apps/api/src/utils/file-validation.ts#L28)

**Problem:**
```typescript
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
```

- Frontend i backend maja validation
- Ale **Puppeteer/Schuco scraping** moze pobrac dowolnie duze pliki
- CSV parsing bez streaming -> caly plik w pamieci

**Scenariusz:**
```typescript
// Schuco scraper pobiera 100MB CSV
const schucoData = await page.download('.csv');
// Brak size check

// CSV parser wczytuje calosc do pamieci
const rows = fs.readFileSync(filepath, 'utf-8').split('\n');
// -> OOM error przy duzych plikach
```

**Sugestia:**
```typescript
// 1. Streaming CSV parser
import { parse } from 'csv-parse';
import { createReadStream } from 'fs';

async function parseCSVStream(filepath: string, maxRows = 100000) {
  const parser = createReadStream(filepath)
    .pipe(parse({ delimiter: ',', from_line: 2 }));

  const rows = [];
  let rowCount = 0;

  for await (const row of parser) {
    if (++rowCount > maxRows) {
      throw new ValidationError(`Plik przekracza limit ${maxRows} wierszy`);
    }
    rows.push(row);
  }

  return rows;
}

// 2. Schuco download size check
const response = await page.evaluate(() => {
  const link = document.querySelector('a.download-csv');
  return fetch(link.href, { method: 'HEAD' }).then(r => ({
    size: parseInt(r.headers.get('content-length') || '0'),
    type: r.headers.get('content-type')
  }));
});

if (response.size > MAX_FILE_SIZE) {
  throw new ValidationError(`Plik zbyt duzy: ${(response.size / 1024 / 1024).toFixed(2)}MB`);
}
```

---

## 4.2 Filename Sanitization Edge Cases

**Severity:** Medium
**Location:** [../../apps/api/src/services/import/importValidationService.ts](../../apps/api/src/services/import/importValidationService.ts)

**Problem:**
- Path traversal: `../../etc/passwd`
- Null bytes: `file\0.txt`
- Reserved names (Windows): `CON.csv`, `PRN.pdf`, `NUL.txt`
- Unicode normalization: `cafe.pdf` vs `cafe.pdf` (NFD vs NFC)

**Scenariusz:**
```typescript
// Path traversal attempt
uploadFile('../../sensitive/data.db', buffer);
// -> Moze zapisac poza uploads/

// Null byte injection
uploadFile('invoice.pdf\0.exe', buffer);
// -> Moze ominac extension validation

// Reserved name
uploadFile('CON.csv', buffer);
// -> Windows error

// Unicode homograph
uploadFile('payment.pdf', buffer);  // 'a' to Cyrillic
// -> Moze oszukac uzytkownikow
```

**Sugestia:**
```typescript
import path from 'path';

function sanitizeFilename(filename: string): string {
  // 1. Normalize Unicode
  let safe = filename.normalize('NFC');

  // 2. Remove path separators and null bytes
  safe = safe.replace(/[/\\:\0]/g, '_');

  // 3. Remove leading dots
  safe = safe.replace(/^\.+/, '');

  // 4. Limit length
  safe = safe.slice(0, 255);

  // 5. Check Windows reserved names
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  const basename = path.parse(safe).name;
  if (reserved.test(basename)) {
    safe = `_${safe}`;
  }

  // 6. Ensure has extension
  if (!path.extname(safe)) {
    safe += '.unknown';
  }

  return safe;
}
```

---

## 4.3 Concurrent Folder Import

**Severity:** Medium
**Location:** [../../apps/api/src/services/importService.ts:576](../../apps/api/src/services/importService.ts#L576)

**Problem:**
```typescript
// Import lock prevents concurrent imports of SAME folder
// But what about DIFFERENT folders with SAME files?

// Folder A: /imports/user1/54222_uzyte_bele.csv
// Folder B: /imports/user2/54222_uzyte_bele.csv

// Both import concurrently -> duplicate order creation?
```

**Scenariusz:**
```typescript
// Thread A: Import z folderu /user1/
const preview1 = await parseCSV('/user1/54222_uzyte_bele.csv');
// orderNumber: "54222"

// Thread B: Import z folderu /user2/
const preview2 = await parseCSV('/user2/54222_uzyte_bele.csv');
// orderNumber: "54222"

// Thread A: Create order "54222"
// Thread B: Create order "54222"
// -> Unique constraint violation

// LUB jesli jeden succeed:
// -> Drugi failuje z cryptic error
```

**Sugestia:**
```typescript
// 1. Lock na orderNumber zamiast folderPath
async importWithOrderLock(orderNumber: string, userId: number, action: () => Promise<void>) {
  const lockService = new ImportLockService(prisma);
  const lock = await lockService.acquireLock(`order:${orderNumber}`, userId);

  try {
    await action();
  } finally {
    if (lock) {
      await lockService.releaseLock(lock.id);
    }
  }
}

// 2. Atomic upsert zamiast check-then-create
async importOrder(data: OrderData) {
  return prisma.order.upsert({
    where: { orderNumber: data.orderNumber },
    update: { ...data, updatedAt: new Date() },
    create: data
  });
}
```
