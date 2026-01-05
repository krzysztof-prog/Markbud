# 🚀 Prompt dla następnej optymalizacji - Opcja B

**Kopiuj i wklej to do nowego okna Claude Code:**

---

## Kontekst

Ukończyłem **Opcję A** optymalizacji bazy danych:
- ✅ Dodano 10 kompozytowych indeksów
- ✅ Naprawiono duplikację indeksu na OrderRequirement
- ✅ Dashboard jest **~33% szybciej** (z ~150ms do ~100ms)
- ✅ Dokumentacja w plikach: DATABASE_OPTIMIZATION_PLAN.md, OPTIMIZATION_COMPLETE.md, FIX_COMPLETE.md

Teraz chcę zrobić **Opcję B** - refactoring zapytań dla **jeszcze większego przyspieszenia**.

---

## Cel: Dashboard 2x szybciej

Chcę zoptymalizować dwa kluczowe fragmenty kodu:

### 1. **getShortages()** - obecnie ~80ms → cel: ~25ms (+70% szybciej)
### 2. **weekly stats** - obecnie ~300ms → cel: ~80ms (+75% szybciej)

**Oczekiwany całkowity zysk:** Dashboard z ~150ms (przed) do **~70ms** (po) = **2x szybciej!**

---

## Zadanie

Wykonaj **Opcję B** z planu optymalizacji:

### Krok 1: Zoptymalizuj getShortages()

**Lokalizacja:** `apps/api/src/routes/dashboard.ts` - funkcja `getShortages()`

**Problem:**
- Obecnie: 2 queries + O(n) mapping w JavaScript
- Query 1: `warehouseStock.findMany()` - pobiera 252 rekordy
- Query 2: `orderRequirement.groupBy()` - agreguje zapotrzebowanie
- JavaScript: mapowanie + filtrowanie + sortowanie

**Rozwiązanie:**
Zamień na 1 raw SQL z LEFT JOIN (gotowy kod jest w pliku `optimized-getShortages.ts`)

**Plik referencyjny:**
`optimized-getShortages.ts` - zawiera:
- Funkcję przed/po
- Interfejsy TypeScript
- Benchmark do uruchomienia

### Krok 2: Zoptymalizuj weekly stats

**Lokalizacja:** `apps/api/src/routes/dashboard.ts` - endpoint `/stats/weekly`

**Problem:**
- Deep nesting z `include`:
  ```typescript
  include: {
    deliveryOrders: {
      include: {
        order: {
          include: { windows: true }
        }
      }
    }
  }
  ```
- Generuje WIELE zapytań do bazy
- Potem iteracja w JavaScript po zagnieżdżonych obiektach

**Rozwiązanie:**
Zamień na 1 raw SQL query z GROUP BY (kod w `OPTIMIZATION_IMPLEMENTATION.md` sekcja 3)

---

## Szczegółowe instrukcje

### Dla getShortages():

1. Otwórz `apps/api/src/routes/dashboard.ts`
2. Znajdź funkcję `async function getShortages()`
3. Skopiuj kod z `optimized-getShortages.ts` (funkcja `getShortagesOptimized`)
4. Zamień starą implementację na nową
5. Uruchom benchmark: `npx tsx ../../optimized-getShortages.ts`
6. Zweryfikuj wyniki (powinny być identyczne)

### Dla weekly stats:

1. Otwórz `apps/api/src/routes/dashboard.ts`
2. Znajdź endpoint `fastify.get('/stats/weekly', ...)`
3. Zamień deep include na raw SQL (kod w `OPTIMIZATION_IMPLEMENTATION.md` linie 189-245)
4. Przetestuj endpoint: `curl http://localhost:3001/api/dashboard/stats/weekly`

---

## Pliki do przeczytania (WAŻNE!)

Przed rozpoczęciem przeczytaj te pliki dla pełnego kontekstu:

1. **`OPTIMIZATION_IMPLEMENTATION.md`** - sekcje 2 i 3 (kod do implementacji)
2. **`optimized-getShortages.ts`** - gotowa funkcja + benchmark
3. **`DATABASE_OPTIMIZATION_PLAN.md`** - sekcja "Priorytet 1.2 i 1.3"
4. **`apps/api/src/routes/dashboard.ts`** - obecna implementacja

---

## Kryteria sukcesu

### Testy wydajności:

Uruchom benchmark PRZED i PO:
```bash
cd apps/api
npx tsx ../../optimized-getShortages.ts

# Spodziewane wyniki:
# getShortages PRZED: ~80ms
# getShortages PO: ~25ms
# Improvement: ~70%
```

Zmierz dashboard load:
```bash
# PRZED optymalizacją:
time curl http://localhost:3001/api/dashboard
# Spodziewany czas: ~100ms (po Opcji A)

# PO optymalizacji:
time curl http://localhost:3001/api/dashboard
# Oczekiwany czas: ~70ms (improvement 30%)
```

### Weryfikacja poprawności:

1. ✅ getShortages() zwraca te same wyniki co przed
2. ✅ weekly stats pokazują te same dane
3. ✅ Brak błędów TypeScript
4. ✅ Dashboard działa poprawnie w przeglądarce

---

## Uwagi i zastrzeżenia

### ⚠️ WAŻNE:

1. **NIE modyfikuj schema.prisma** - to tylko refactoring queries
2. **NIE twórz nowych migracji** - zmiany tylko w kodzie TypeScript
3. **Zachowaj backward compatibility** - API endpoints muszą zwracać ten sam format
4. **Testuj przed deployem** - uruchom backend i sprawdź czy dashboard działa

### 🔧 Jeśli napotkasz problemy:

1. **TypeScript errors** - sprawdź interfejsy w `optimized-getShortages.ts`
2. **Raw SQL nie działa** - sprawdź nazwy kolumn (używamy snake_case w bazie)
3. **Wyniki się różnią** - porównaj przed/po krok po kroku

---

## Checklist wykonania

Po ukończeniu zrób checklist:

- [ ] getShortages() zoptymalizowany
- [ ] weekly stats zoptymalizowany
- [ ] Benchmark pokazuje improvement 60-70%
- [ ] Dashboard endpoint ~70ms (było ~150ms)
- [ ] Wszystkie testy przechodzą
- [ ] Brak błędów TypeScript
- [ ] Frontend działa poprawnie
- [ ] Dokumentacja zaktualizowana (opcjonalne)

---

## Expected outcome

Po ukończeniu Opcji B:

| Endpoint | Przed (start) | Po Opcji A | Po Opcji B | Total Gain |
|----------|---------------|------------|------------|------------|
| Dashboard | ~150ms | ~100ms | **~70ms** | **2.1x szybciej** |
| getShortages | ~80ms | ~80ms | **~25ms** | **3.2x szybciej** |
| weekly stats | ~300ms | ~300ms | **~80ms** | **3.75x szybciej** |

**Celujemy w dashboard 2x szybciej niż na początku!** 🎯

---

## Dodatkowe zasoby

- **Prisma raw queries:** https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access
- **SQLite LEFT JOIN:** https://www.sqlitetutorial.net/sqlite-left-join/
- **EXPLAIN QUERY PLAN:** Sprawdź czy SQLite używa indeksów (opcjonalne)

---

## Po ukończeniu

Gdy skończysz:
1. Uruchom final benchmark
2. Pokaż mi wyniki przed/po
3. Poproś o self-review (jak przy Opcji A)

---

**Status:** 📋 GOTOWE DO STARTU
**Oczekiwany czas:** 2-3 godziny
**Poziom trudności:** Średni
**Ryzyko:** Niskie (tylko refactoring, bez zmian w bazie)

Good luck! 🚀
