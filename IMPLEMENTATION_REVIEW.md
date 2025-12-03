# Przegląd Implementacji Zestawień Miesięcznych

## 🔴 Znalezione Problemy

### 1. **KRYTYCZNY: Brak transakcji w saveReport**

**Lokalizacja**: `monthlyReportService.ts:130-162`

**Problem**:
```typescript
// Update existing report
await this.prisma.monthlyReport.update(...);
// Delete old items
await this.prisma.monthlyReportItem.deleteMany(...);
// Create new items
await this.prisma.monthlyReportItem.createMany(...);
```

Jeśli którakolwiek operacja się nie powiedzie, dane będą niespójne.

**Rozwiązanie**:
```typescript
return await this.prisma.$transaction(async (tx) => {
  await tx.monthlyReport.update(...);
  await tx.monthlyReportItem.deleteMany(...);
  await tx.monthlyReportItem.createMany(...);
  return existing.id;
});
```

---

### 2. **Błędne Filtrowanie Dat**

**Lokalizacja**: `monthlyReportService.ts:37-52`

**Problem**:
```typescript
createdAt: {
  gte: startDate,
  lte: endDate,
}
```

Zestawienie miesięczne oparte na `createdAt` nie ma sensu biznesowego. Zlecenie może być utworzone w jednym miesiącu, a faktura wystawiona w innym.

**Rozwiązanie**:
1. Dodać pole `invoiceDate` do modelu Order
2. Lub użyć istniejącego `deliveryDate`
3. Lub parsować datę z `invoiceNumber` jeśli ma strukturę FV/YYYY/MM/NNN

**Obecne obejście**: Używać `createdAt` ale dodać komentarz że to tymczasowe

---

### 3. **Brak Indeksów Bazodanowych**

**Lokalizacja**: `schema.prisma` - model Order

**Problem**:
Query `generateReport` wykonuje:
```sql
WHERE invoice_number IS NOT NULL
  AND created_at >= ?
  AND created_at <= ?
```

Bez odpowiedniego indeksu będzie to slow query przy dużej liczbie zleceń.

**Rozwiązanie**: Dodać do schema.prisma:
```prisma
model Order {
  // ... existing fields

  @@index([invoiceNumber, createdAt])  // NEW
  @@index([invoiceNumber, deliveryDate])  // Future-proof
}
```

---

### 4. **Duplikacja Kodu w Eksportach**

**Lokalizacja**: `monthly-reports.ts:232-400`

**Problem**:
Endpointy Excel i PDF mają identyczną logikę:
1. Walidacja parametrów
2. Sprawdzenie czy raport istnieje
3. Auto-generowanie jeśli nie ma
4. Mapowanie danych
5. Export

**Rozwiązanie**: Wydzielić helper function:
```typescript
async function getOrCreateReport(
  service: MonthlyReportService,
  year: number,
  month: number
) {
  let report = await service.getReport(year, month);
  if (!report) {
    await service.generateAndSaveReport(year, month);
    report = await service.getReport(year, month);
  }
  if (!report) throw new Error('Failed to generate report');
  return report;
}
```

---

### 5. **Brak Cache dla Kursu Walut**

**Lokalizacja**: `currencyConfigService.ts:14-19`

**Problem**:
Każde wywołanie `getCurrentRate()` wykonuje query do bazy, nawet jeśli kurs się nie zmienił.

**Rozwiązanie**: In-memory cache z TTL:
```typescript
private cacheConfig: { config: any; expires: number } | null = null;
private CACHE_TTL = 3600000; // 1 hour

async getCurrentRate() {
  const now = Date.now();

  if (this.cacheConfig && this.cacheConfig.expires > now) {
    return this.cacheConfig.config;
  }

  const config = await this.prisma.currencyConfig.findFirst({
    orderBy: { effectiveDate: 'desc' },
  });

  this.cacheConfig = {
    config,
    expires: now + this.CACHE_TTL
  };

  return config;
}
```

---

### 6. **Brak Walidacji Dat**

**Lokalizacja**: `monthlyReportService.ts:37`, `monthly-reports.ts` wszystkie endpointy

**Problem**:
Brak walidacji czy podane year/month są sensowne:
- Rok 3000
- Miesiąc z przyszłości
- Rok ujemny

**Rozwiązanie**:
```typescript
if (year < 2000 || year > new Date().getFullYear() + 1) {
  throw new Error('Invalid year');
}
if (month < 1 || month > 12) {
  throw new Error('Invalid month');
}
const requestedDate = new Date(year, month - 1);
const now = new Date();
if (requestedDate > now) {
  throw new Error('Cannot generate report for future dates');
}
```

---

### 7. **totalGlasses Nie Jest Używane**

**Lokalizacja**: `schema.prisma` - Order model ma `totalGlasses`

**Problem**:
W MonthlyReportItem nie ma pola `glassesCount`, mimo że Order ma `totalGlasses`.

**Pytanie**: Czy szkła powinny być w zestawieniu?

---

### 8. **Brak Error Handling w Export Service**

**Lokalizacja**: `monthlyReportExportService.ts`

**Problem**:
Funkcje `exportToExcel()` i `exportToPdf()` mogą rzucić wyjątki z bibliotek (ExcelJS, PDFKit), ale nie ma try/catch ani custom error messages.

**Rozwiązanie**: Wrap w try/catch z lepszymi błędami:
```typescript
try {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
} catch (error) {
  throw new Error(`Failed to generate Excel: ${error.message}`);
}
```

---

### 9. **Brak Paginacji dla getAllReports**

**Lokalizacja**: `monthlyReportService.ts:221-235`

**Problem**:
Tylko limit, brak offset/cursor pagination. Przy 100+ raportach nie da się pobrać starszych.

**Rozwiązanie**: Dodać cursor-based pagination:
```typescript
async getAllReports(limit: number = 12, cursor?: { year: number, month: number }) {
  const reports = await this.prisma.monthlyReport.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: limit,
    ...(cursor && {
      cursor: { year_month: cursor },
      skip: 1 // skip cursor itself
    }),
    // ... rest
  });
  return reports;
}
```

---

## ✅ Co Jest Dobrze Zrobione

1. **Separation of Concerns** - Serwisy oddzielone od routerów ✅
2. **Type Safety** - Wszystkie interfejsy są typowane ✅
3. **Walidacja Zod** - Dla currency config ✅
4. **Swagger Schema** - Wszystkie endpointy udokumentowane ✅
5. **Cascade Delete** - MonthlyReportItem z ON DELETE CASCADE ✅
6. **Select Optimization** - Pobieramy tylko potrzebne pola ✅
7. **Unique Constraint** - year_month unique zapobiega duplikatom ✅

---

## 🎯 Priorytety Poprawek

### Wysokie (Zrobić teraz):
1. ✅ Dodać transakcje w `saveReport`
2. ✅ Dodać indeksy do schema.prisma
3. ✅ Dodać walidację dat

### Średnie (Zrobić wkrótce):
4. ⚠️ Dodać cache dla kursu walut
5. ⚠️ Refactor duplikacji w exportach
6. ⚠️ Lepsze error handling

### Niskie (Nice to have):
7. 💡 Paginacja cursor-based
8. 💡 Pole invoiceDate w Order
9. 💡 Dodać totalGlasses do raportu

---

## 📊 Ocena Ogólna

**Jakość kodu: 7/10**

✅ **Mocne strony**:
- Dobra architektura
- Type safety
- Dobre separacje odpowiedzialności
- Dokumentacja

❌ **Słabe strony**:
- Brak transakcji (data integrity risk)
- Brak indeksów (performance risk)
- Brak cache (unnecessary DB load)
- Błędne filtrowanie dat (business logic issue)

**Bezpieczeństwo**: 8/10 - Walidacja OK, ale brak rate limiting

**Performance**: 6/10 - Brak indeksów i cache

**Maintainability**: 8/10 - Czysty kod, ale duplikacja

---

## 🔧 Natychmiastowe Poprawki

Poniżej kod do zastosowania od razu:
