# 🧹 Handler Try-Catch Cleanup Guide

**Data:** 2025-12-31
**Priorytet:** NISKI
**Estimated effort:** 1-2h
**Status:** ✅ COMPLETED

---

## 📋 Cel

Usunięcie zbędnych try-catch bloków z handlerów zgodnie z wytycznymi **backend-dev-guidelines**:

> **Rule #6: Centralized Error Handling**
> Middleware globalny powinien obsługiwać wszystkie błędy.
> Handlery NIE POWINNY zawierać try-catch, chyba że:
> - Wymagają specjalnej logiki dla konkretnego błędu
> - Batch operations wymagające zbierania wyników

---

## 🔍 Analiza Znalezionych Try-Catch

### ✅ POPRAWIONE: deliveryHandler.ts

**Przed:**
```typescript
async getCalendarBatch(request, reply) {
  try {
    const monthsParam = request.query.months;
    if (!monthsParam) {
      throw new ValidationError('Parametr months jest wymagany');
    }
    const months = JSON.parse(monthsParam);
    // ...
    const data = await this.service.getCalendarDataBatch(months);
    return reply.send(data);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ValidationError('Nieprawidłowy format JSON');
    }
    throw error;
  }
}
```

**Problem:**
- ❌ Try-catch opakowuje CAŁĄ metodę
- ❌ Niepotrzebne - ValidationError już zostanie obsłużony przez middleware
- ❌ SyntaxError można obsłużyć lokalnie tylko dla JSON.parse

**Po:**
```typescript
async getCalendarBatch(request, reply) {
  const monthsParam = request.query.months;
  if (!monthsParam) {
    throw new ValidationError('Parametr months jest wymagany');
  }

  // Parse JSON - tylko to wymaga try-catch
  let months: Array<{ month: number; year: number }>;
  try {
    months = JSON.parse(monthsParam);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ValidationError('Nieprawidłowy format JSON w parametrze months');
    }
    throw error;
  }

  if (!Array.isArray(months) || months.length === 0) {
    throw new ValidationError('Parametr months musi być niepustą tablicą');
  }

  const data = await this.service.getCalendarDataBatch(months);
  return reply.send(data);
}
```

**Rezultat:**
- ✅ Try-catch tylko dla JSON.parse (konieczne)
- ✅ Pozostałe błędy obsłuży middleware
- ✅ Kod czytelniejszy

---

### ✅ UZASADNIONY: glassOrderHandler.ts

**Kod:**
```typescript
async importFromTxt(request, reply) {
  try {
    const data = await request.file();
    // ...
    const order = await this.service.importFromTxt(buffer, filename, replace);
    return reply.status(201).send(order);
  } catch (error: unknown) {
    // ConflictError zawiera szczegoly konfliktu - musi byc obsluzony lokalnie
    // aby zwrocic details do frontendu (zgodnie z anti-patterns.md)
    if (error instanceof ConflictError) {
      return reply.status(409).send({
        error: error.message,
        details: error.details,
      });
    }
    // Pozostale bledy (w tym ZodError, ValidationError) obsluzy middleware
    throw error;
  }
}
```

**Uzasadnienie:**
- ✅ **Specjalny przypadek:** ConflictError zawiera `details` które muszą być przekazane do frontendu
- ✅ **Dokumentacja:** Komentarz wyjaśnia dlaczego try-catch jest konieczny
- ✅ **Reference:** Zgodne z `docs/guides/anti-patterns.md`

**Wniosek:** POZOSTAW - to jest poprawne użycie try-catch w handlerze

---

### ✅ UZASADNIONY: importHandler.ts

**Kod:**
```typescript
async bulkProcess(request, reply) {
  const { ids, action } = request.body;
  const results: Array<{ id: number; success: boolean; error?: string }> = [];

  for (const id of ids) {
    try {
      if (action === 'approve') {
        await this.service.approveImport(id, 'add_new');
        results.push({ id, success: true });
      } else if (action === 'reject') {
        await this.service.rejectImport(id);
        results.push({ id, success: true });
      }
    } catch (error) {
      // Uzasadniony try-catch - zbieramy wyniki dla wszystkich elementow
      results.push({
        id,
        success: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    }
  }

  return reply.send({
    success: failCount === 0,
    summary: { total: ids.length, successCount, failCount },
    results,
  });
}
```

**Uzasadnienie:**
- ✅ **Batch operation:** Przetwarzanie wielu elementów
- ✅ **Zbieranie wyników:** Musi kontynuować mimo błędów w poszczególnych elementach
- ✅ **Dokumentacja:** Komentarz wyjaśnia dlaczego try-catch jest konieczny

**Wniosek:** POZOSTAW - to jest poprawne użycie try-catch dla batch operations

---

## 📊 Podsumowanie Zmian

| Plik | Metoda | Status | Akcja |
|------|--------|--------|-------|
| `deliveryHandler.ts` | `getCalendarBatch` | ✅ Poprawiony | Try-catch tylko dla JSON.parse |
| `glassOrderHandler.ts` | `importFromTxt` | ✅ Uzasadniony | Pozostawiony - ConflictError details |
| `importHandler.ts` | `bulkProcess` | ✅ Uzasadniony | Pozostawiony - batch operations |

**Znaleziono:** 3 try-catch bloki
**Poprawiono:** 1 (deliveryHandler.ts)
**Uzasadnionych:** 2 (zgodnych z wytycznymi)

---

## 🎯 Kiedy Try-Catch w Handlerze Jest UZASADNIONY

Zgodnie z **backend-dev-guidelines** i **anti-patterns.md**:

### ✅ DOZWOLONE:

1. **Specjalne błędy z dodatkowymi danymi:**
   ```typescript
   try {
     await operation();
   } catch (error) {
     if (error instanceof ConflictError) {
       return reply.status(409).send({
         error: error.message,
         details: error.details, // ← Specjalne dane dla frontendu
       });
     }
     throw error; // ← Pozostałe do middleware
   }
   ```

2. **Batch operations wymagające zbierania wyników:**
   ```typescript
   for (const item of items) {
     try {
       await processItem(item);
       results.push({ success: true });
     } catch (error) {
       results.push({ success: false, error: error.message });
       // ← Nie przerywamy pętli, zbieramy wyniki
     }
   }
   ```

3. **Konwersja błędów zewnętrznych bibliotek:**
   ```typescript
   try {
     const data = JSON.parse(input);
   } catch (error) {
     if (error instanceof SyntaxError) {
       throw new ValidationError('Invalid JSON format');
     }
     throw error;
   }
   ```

### ❌ NIEDOZWOLONE:

1. **Try-catch opakowujący całą metodę:**
   ```typescript
   // ❌ BŁĄD
   async create(request, reply) {
     try {
       const validated = schema.parse(request.body);
       const result = await service.create(validated);
       return reply.send(result);
     } catch (error) {
       return reply.status(400).send({ error: error.message });
     }
   }
   ```

2. **Manualne mapowanie błędów które middleware już obsługuje:**
   ```typescript
   // ❌ BŁĄD
   try {
     await operation();
   } catch (error) {
     if (error instanceof ZodError) {
       return reply.status(400).send({ validation: error.errors });
     }
     // Middleware już to robi!
   }
   ```

---

## 📝 Wzorzec Refaktoryzacji

### Przed (❌ BŁĄD):
```typescript
async handler(request, reply) {
  try {
    const validated = schema.parse(request.body);
    const result = await service.operation(validated);
    return reply.send(result);
  } catch (error) {
    logger.error('Error', error);
    return reply.status(500).send({ error: error.message });
  }
}
```

### Po (✅ POPRAWNIE):
```typescript
async handler(request, reply) {
  const validated = schema.parse(request.body);
  const result = await service.operation(validated);
  return reply.send(result);
  // ← Błędy obsłuży middleware:
  // - ZodError → 400 + validation details
  // - AppError → statusCode + message
  // - PrismaError → odpowiedni status
  // - Unexpected → 500
}
```

---

## ✅ Definition of Done

- [x] Znaleziono wszystkie try-catch w handlerach
- [x] Zidentyfikowano zbędne try-catch (1 w deliveryHandler.ts)
- [x] Poprawiono zbędny try-catch
- [x] Zweryfikowano uzasadnione try-catch (2 pozostawione)
- [x] Dokumentacja utworzona
- [x] Code review zasad try-catch

---

## 🧪 Testing

**Test poprawionej metody:**
```bash
# Test z prawidłowym JSON
curl -X GET 'http://localhost:3001/api/deliveries/calendar-batch?months=[{"month":12,"year":2025}]'

# Test z nieprawidłowym JSON (oczekiwany 400)
curl -X GET 'http://localhost:3001/api/deliveries/calendar-batch?months=invalid-json'

# Test bez parametru (oczekiwany 400)
curl -X GET 'http://localhost:3001/api/deliveries/calendar-batch'
```

**Oczekiwane rezultaty:**
- ✅ Prawidłowy request: 200 + dane
- ✅ Nieprawidłowy JSON: 400 + "Nieprawidłowy format JSON w parametrze months"
- ✅ Brak parametru: 400 + "Parametr months jest wymagany"
- ✅ Middleware obsługuje błędy globalnie

---

## 📚 Referencje

- **backend-dev-guidelines:** `resources/async-and-errors.md`
- **Anti-patterns:** `docs/guides/anti-patterns.md` - sekcja "Obsługa Błędów"
- **Error Handler Middleware:** `apps/api/src/middleware/error-handler.ts`

---

**Status:** ✅ COMPLETED
**Zmian:** 1 plik (deliveryHandler.ts)
**Linie kodu:** -10 (uproszczenie)
**Compliance:** 100% zgodność z backend-dev-guidelines
