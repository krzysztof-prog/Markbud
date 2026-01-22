# Plan Testów Automatycznych - AKROBUD

> **Cel:** Testy dla najbardziej krytycznych części systemu
> **Podejście:** Jeden kompletny plan, priorytetyzowany według ryzyka
> **Data:** 2026-01-22

---

## 📊 Aktualny stan

| Metryka | Wartość |
|---------|---------|
| Pliki testowe | ~18 plików |
| Pokrycie szacunkowe | ~15-20% |
| Serwisy z testami | 7/60 |
| Repozytoria z testami | 5/24 |
| Frontend testy | ❌ BRAK |

---

## 🎯 Priorytety (od najważniejszego)

### P0 - KRYTYCZNE (Pieniądze + Dane)
Błąd tutaj = utrata pieniędzy lub danych

### P1 - WYSOKIE (Importy)
Błąd tutaj = złe dane w systemie

### P2 - ŚREDNIE (Logika biznesowa)
Błąd tutaj = zła funkcjonalność

### P3 - NISKIE (UI/UX)
Błąd tutaj = zły wygląd/zachowanie

---

## 🔴 P0 - KRYTYCZNE: Operacje na pieniądzach

### 1. money.ts - Testy jednostkowe
**Plik:** `packages/shared/src/utils/money.test.ts`
**Status:** ❌ BRAK
**Ryzyko:** Złe przeliczenie = złe kwoty na fakturach

```typescript
// Do przetestowania:
✅ plnToGrosze() - konwersja PLN → grosze
✅ groszeToPln() - konwersja grosze → PLN
✅ eurToCenty() - konwersja EUR → centy
✅ centyToEur() - konwersja centy → EUR
✅ convertEurToPlnGrosze() - wymiana walut
✅ convertPlnToEurCenty() - wymiana walut
✅ formatGrosze() - formatowanie wyświetlania
✅ formatCenty() - formatowanie wyświetlania
✅ validateMonetaryValue() - walidacja
✅ sumMonetary() - bezpieczne sumowanie

// Edge cases:
✅ Wartości ujemne (powinny rzucić błąd)
✅ Wartości niecałkowite dla groszy (błąd)
✅ Overflow (MAX_SAFE_INTEGER)
✅ Zero jako kurs wymiany (błąd)
✅ Infinity/NaN (błąd)
✅ Precyzja > 2 miejsca po przecinku (błąd)
```

**Szacowana liczba testów:** ~40 test cases

---

### 2. Obliczenia wartości zleceń
**Plik:** `apps/api/src/services/orderService.test.ts` (rozszerzenie)
**Status:** ⚠️ Częściowe testy (statusy OK, brak testów kwot)

```typescript
// Do przetestowania:
✅ Obliczanie valuePln z pozycji
✅ Obliczanie valueEur z pozycji
✅ Aktualizacja wartości przy zmianie pozycji
✅ Przeliczanie przy zmianie kursu
✅ Sumowanie wartości wielu zleceń
✅ Wartość 0 gdy brak pozycji
```

**Szacowana liczba testów:** ~15 test cases

---

### 3. Raportowanie finansowe
**Plik:** `apps/api/src/services/monthlyReportService.test.ts`
**Status:** ❌ BRAK

```typescript
// Do przetestowania:
✅ Suma wartości zleceń w miesiącu
✅ Grupowanie po statusach
✅ Grupowanie po klientach
✅ Prawidłowe zaokrąglenia
✅ Puste dane (brak zleceń)
```

**Szacowana liczba testów:** ~12 test cases

---

## 🟠 P1 - WYSOKIE: Importy danych

### 4. CSV Import - Parsing
**Plik:** `apps/api/src/services/import/csvImportService.test.ts`
**Status:** ✅ Istnieje (rozszerzyć o edge cases)

```typescript
// Do dodania:
✅ Plik z polskimi znakami (ą, ę, ó, ś, ź, ż)
✅ Plik z BOM (UTF-8 BOM)
✅ Różne separatory (;, ,, \t)
✅ Puste wiersze
✅ Niepełne dane
✅ Zduplikowane numery zleceń
✅ Bardzo duży plik (1000+ wierszy)
✅ Wartości z cudzysłowami
✅ Wartości EUR z przecinkiem vs kropką
```

**Szacowana liczba testów:** ~20 test cases

---

### 5. PDF Import - Parsing
**Plik:** `apps/api/src/services/import/pdfImportService.test.ts`
**Status:** ⚠️ Podstawowe testy

```typescript
// Do przetestowania:
✅ Poprawny PDF Schuco
✅ PDF z wieloma stronami
✅ PDF uszkodzony
✅ PDF bez tekstu (skan)
✅ Ekstrakcja numerów zleceń
✅ Ekstrakcja wartości EUR
✅ Ekstrakcja dat
```

**Szacowana liczba testów:** ~15 test cases

---

### 6. Import Orchestrator
**Plik:** `apps/api/src/services/import/ImportOrchestrator.test.ts`
**Status:** ⚠️ Podstawowe testy

```typescript
// Do przetestowania:
✅ Cały flow importu (happy path)
✅ Rollback przy błędzie
✅ Konflikty (duplikaty)
✅ Walidacja przed importem
✅ Raportowanie błędów (errors[], warnings[])
✅ Częściowy sukces (50% OK, 50% błędy)
✅ Lock - tylko jeden import naraz
```

**Szacowana liczba testów:** ~18 test cases

---

### 7. Import okuć (OKUC)
**Plik:** `apps/api/src/services/parsers/okuc-csv-parser.test.ts`
**Status:** ❌ BRAK

```typescript
// Do przetestowania:
✅ Parsing CSV z zapotrzebowaniem
✅ Mapowanie artykułów
✅ Błędne kody artykułów
✅ Agregacja ilości
✅ Walidacja jednostek (szt, mb, kg)
```

**Szacowana liczba testów:** ~12 test cases

---

### 8. Import szkła (Glass)
**Plik:** `apps/api/src/services/parsers/glass-order-txt-parser.test.ts`
**Status:** ❌ BRAK

```typescript
// Do przetestowania:
✅ Parsing TXT z zamówieniem szkła
✅ Ekstrakcja wymiarów (szer x wys)
✅ Ekstrakcja typów szkła
✅ Grupowanie po zleceniach
✅ Błędne formaty
```

**Szacowana liczba testów:** ~10 test cases

---

## 🟡 P2 - ŚREDNIE: Logika biznesowa

### 9. Status machine zleceń
**Plik:** `apps/api/src/services/orderService.test.ts`
**Status:** ✅ Istnieje (dobrze pokryte)

```typescript
// Już przetestowane:
✅ Przejścia statusów (new → in_progress → completed)
✅ Niedozwolone przejścia
✅ Walidacja przed zmianą statusu
```

---

### 10. Dostawy - przypisywanie zleceń
**Plik:** `apps/api/src/services/deliveryService.test.ts`
**Status:** ⚠️ Podstawowe

```typescript
// Do rozszerzenia:
✅ Przypisanie zlecenia do dostawy
✅ Odpięcie zlecenia od dostawy
✅ Zmiana daty dostawy
✅ Usunięcie dostawy (soft delete)
✅ Zlecenia na wielu dostawach
✅ Walidacja - zlecenie już na dostawie
```

**Szacowana liczba testów:** ~15 test cases

---

### 11. Magazyn - stany
**Plik:** `apps/api/src/services/warehouseService.test.ts`
**Status:** ✅ Istnieje

```typescript
// Sprawdzić czy pokrywa:
✅ Dodawanie do stanu
✅ Odejmowanie ze stanu
✅ Stan nie może być ujemny
✅ Rezerwacje
✅ Historia zmian
```

---

### 12. Palety - optymalizacja
**Plik:** `apps/api/src/services/palletOptimizerService.test.ts`
**Status:** ❌ BRAK

```typescript
// Do przetestowania:
✅ Algorytm pakowania
✅ Limity wagowe
✅ Limity wymiarowe
✅ Priorytetyzacja zleceń
```

**Szacowana liczba testów:** ~10 test cases

---

### 13. Weryfikacja Akrobud
**Plik:** `apps/api/src/services/akrobud-verification/`
**Status:** ❌ BRAK

```typescript
// Do przetestowania:
✅ Porównanie wersji projektu
✅ Wykrywanie różnic
✅ Generowanie raportu różnic
```

**Szacowana liczba testów:** ~8 test cases

---

## 🟢 P3 - NISKIE: Repozytoria i handlery

### 14. Handlery API (smoke tests)
**Plik:** `apps/api/src/handlers/*.test.ts`
**Status:** ❌ BRAK

```typescript
// Smoke tests dla każdego handlera:
✅ Zwraca 200 dla prawidłowego requestu
✅ Zwraca 400 dla błędnych danych
✅ Zwraca 401 bez autoryzacji
✅ Zwraca 404 dla nieistniejącego zasobu
```

**Handlery do przetestowania:**
- orderHandler
- deliveryHandler
- warehouseHandler
- importHandler
- glassHandler

**Szacowana liczba testów:** ~50 test cases (10 per handler)

---

### 15. Walidatory Zod
**Plik:** `apps/api/src/validators/*.test.ts`
**Status:** ❌ BRAK

```typescript
// Do przetestowania:
✅ Prawidłowe dane przechodzą
✅ Brakujące wymagane pola
✅ Złe typy danych
✅ Wartości poza zakresem
```

---

## 📋 Plan implementacji

### Faza 1: P0 - Krytyczne (TERAZ)
| # | Zadanie | Szac. testy | Status |
|---|---------|-------------|--------|
| 1 | money.ts testy | 40 | ❌ |
| 2 | orderService - kwoty | 15 | ❌ |
| 3 | monthlyReportService | 12 | ❌ |
| | **SUMA FAZA 1** | **67** | |

### Faza 2: P1 - Importy
| # | Zadanie | Szac. testy | Status |
|---|---------|-------------|--------|
| 4 | csvImportService (edge cases) | 20 | ⚠️ |
| 5 | pdfImportService | 15 | ⚠️ |
| 6 | ImportOrchestrator | 18 | ⚠️ |
| 7 | okuc-csv-parser | 12 | ❌ |
| 8 | glass-order-txt-parser | 10 | ❌ |
| | **SUMA FAZA 2** | **75** | |

### Faza 3: P2 - Logika biznesowa
| # | Zadanie | Szac. testy | Status |
|---|---------|-------------|--------|
| 10 | deliveryService (rozszerzenie) | 15 | ⚠️ |
| 12 | palletOptimizerService | 10 | ❌ |
| 13 | akrobud-verification | 8 | ❌ |
| | **SUMA FAZA 3** | **33** | |

### Faza 4: P3 - Handlery i walidatory
| # | Zadanie | Szac. testy | Status |
|---|---------|-------------|--------|
| 14 | API handlers (smoke) | 50 | ❌ |
| 15 | Zod validators | 30 | ❌ |
| | **SUMA FAZA 4** | **80** | |

---

## 📊 Podsumowanie

| Faza | Testy | Priorytet | Ryzyko bez testów |
|------|-------|-----------|-------------------|
| 1 | 67 | P0 | Złe kwoty na fakturach |
| 2 | 75 | P1 | Złe dane w systemie |
| 3 | 33 | P2 | Błędna funkcjonalność |
| 4 | 80 | P3 | Błędy API |
| **RAZEM** | **255** | | |

---

## 🛠️ Jak uruchomić testy

```powershell
# Backend (apps/api)
cd apps/api
pnpm test              # Wszystkie testy
pnpm test:watch        # Watch mode
pnpm test:coverage     # Z raportem pokrycia

# Frontend (apps/web) - gdy dodamy
cd apps/web
pnpm test
```

---

## ✅ Definition of Done dla każdego testu

- [ ] Test pokrywa happy path
- [ ] Test pokrywa edge cases (null, undefined, puste, duże wartości)
- [ ] Test pokrywa error cases (rzucanie wyjątków)
- [ ] Test jest niezależny (nie zależy od innych testów)
- [ ] Test ma sensowną nazwę opisującą co testuje
- [ ] Test używa fixtures/builders zamiast hardcoded values

---

## 📝 Przykład dobrego testu

```typescript
// packages/shared/src/utils/money.test.ts
import { describe, it, expect } from 'vitest';
import {
  plnToGrosze,
  groszeToPln,
  Grosze
} from './money';

describe('plnToGrosze', () => {
  // Happy path
  it('konwertuje 123.45 PLN na 12345 groszy', () => {
    expect(plnToGrosze(123.45)).toBe(12345);
  });

  it('konwertuje 0 PLN na 0 groszy', () => {
    expect(plnToGrosze(0)).toBe(0);
  });

  it('konwertuje całkowitą kwotę (bez groszy)', () => {
    expect(plnToGrosze(100)).toBe(10000);
  });

  // Edge cases
  it('rzuca błąd dla wartości z więcej niż 2 miejscami po przecinku', () => {
    expect(() => plnToGrosze(123.456)).toThrow(/too much precision/);
  });

  it('rzuca błąd dla Infinity', () => {
    expect(() => plnToGrosze(Infinity)).toThrow(/finite number/);
  });

  it('rzuca błąd dla NaN', () => {
    expect(() => plnToGrosze(NaN)).toThrow(/finite number/);
  });

  // Zaokrąglenia
  it('prawidłowo zaokrągla 0.005 (banker rounding)', () => {
    // 0.005 * 100 = 0.5 → Math.round → 0 lub 1
    expect(plnToGrosze(0.01)).toBe(1);
  });
});

describe('groszeToPln', () => {
  it('konwertuje 12345 groszy na 123.45 PLN', () => {
    expect(groszeToPln(12345 as Grosze)).toBe(123.45);
  });

  it('rzuca błąd dla niecałkowitej liczby groszy', () => {
    expect(() => groszeToPln(123.5 as Grosze)).toThrow(/integer/);
  });
});
```

---

**Wersja:** 1.0
**Autor:** Claude Opus 4.5
**Data:** 2026-01-22
