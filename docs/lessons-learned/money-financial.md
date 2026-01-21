# Lessons Learned - Money & Financial Operations

> Błędy związane z operacjami na kwotach i pieniądzach.

---

## 2025-12-30 - Dashboard wyświetlał kwoty x100 za duże

**Co się stało:**
Dashboard pokazywał wartość zleceń jako 100,000 zł zamiast 1,000 zł. Wszystkie raporty finansowe były błędne.

**Root cause:**
30 grudnia 2025 została przeprowadzona migracja bazy danych:
- Przed: `valuePln Float` (złotówki jako liczba zmiennoprzecinkowa)
- Po: `valuePln Int` (grosze jako liczba całkowita)

Kod w `dashboard-service.ts` NIE ZOSTAŁ ZAKTUALIZOWANY:
```typescript
// Stary kod - nadal używa parseFloat
totalValuePln += parseFloat(order.valuePln?.toString() || '0');
// 10000 groszy -> traktuje jako 10000 PLN!
```

Stworzono [money.ts](apps/api/src/utils/money.ts) z funkcjami `groszeToPln()` / `plnToGrosze()` ALE:
- Używano tylko w 3 miejscach z 200+ w projekcie
- Dashboard, monthly export, order summary - wszystkie pomijały tę funkcję

**Impact:**
- **Krytyczny:** Decyzje biznesowe oparte na fałszywych danych
- Raporty miesięczne eksportowane z błędnymi kwotami
- Rozbieżność z systemem księgowym
- Wykryto dopiero podczas audytu (2026-01-02) - mogło trwać miesiącami!

**Fix:**
```typescript
// Poprawiony kod
import { groszeToPln } from '../utils/money.js';

totalValuePln += order.valuePln ? groszeToPln(order.valuePln as Grosze) : 0;
```

Naprawiono w 23 miejscach:
- `dashboard-service.ts` - 2 miejsca
- `monthlyReportExportService.ts` - 14 miejsc
- `monthlyReportService.ts` - 7 miejsc

**Prevention:**
1. ESLint rule: zabroń `parseFloat` / `toFixed` na polach `value*Pln` / `value*Eur`
2. Testy integracyjne dla dashboard - porównaj z oczekiwaną sumą
3. Dodano do [COMMON_MISTAKES.md](COMMON_MISTAKES.md) sekcję "Operacje na pieniądzach"
4. Wymóg code review dla zmian w money calculations

**Lekcja:** Gdy robisz breaking change w formacie danych (Float->Int), **ZNAJDŹ WSZYSTKIE** miejsca używające tych danych. `git grep` jest Twoim przyjacielem!

---

[Powrót do indeksu](../../LESSONS_LEARNED.md)
