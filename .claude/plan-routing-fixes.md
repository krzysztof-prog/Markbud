# Plan: Naprawa routingów i zabezpieczeń

**Data utworzenia:** 2026-01-16
**Status:** OCZEKUJE NA DECYZJĘ

---

## Kontekst

Podczas audytu routingów znaleziono problem z brakiem ochrony stron w middleware.

## Wykonane naprawy (2026-01-16)

- [x] Usunięto duplikat `features/orders/api/ordersApi.ts` (dead code)
- [x] Usunięto alias `/moja-praca` z `apps/api/src/index.ts`
- [x] Sprawdzono kolejność routów w `deliveries.ts` - OK

## Do zrobienia: PROTECTED_ROUTES

### Problem

W [middleware.ts](apps/web/src/middleware.ts) chronione są tylko 4 ścieżki:
- `/admin` → OWNER, ADMIN
- `/kierownik` → OWNER, ADMIN, KIEROWNIK
- `/importy` → OWNER, ADMIN
- `/zestawienia/zlecenia` → OWNER, ADMIN, KIEROWNIK

### Niezabezpieczone strony

Każdy zalogowany użytkownik może wejść na:

| Strona | Potrzebna decyzja: Kto ma dostęp? |
|--------|-----------------------------------|
| `/moja-praca` | ? |
| `/operator` | ? |
| `/dostawy` | ? |
| `/magazyn` | ? |
| `/zestawienia/miesieczne` | ? |
| `/szyby` | ? |
| `/ustawienia` | ? |
| `/planowanie-produkcji` | ? |
| `/dostawy-szyb` | ? |
| `/zamowienia-szyb` | ? |
| `/archiwum` | ? |

### Dostępne role w systemie

1. **OWNER** - właściciel (pełny dostęp)
2. **ADMIN** - administrator
3. **KIEROWNIK** - kierownik produkcji
4. **OPERATOR** - operator produkcji
5. **MAGAZYNIER** - pracownik magazynu

### Wymagana decyzja

Użytkownik musi określić mapę ról dla każdej strony, np.:

```typescript
const PROTECTED_ROUTES = {
  '/admin': [OWNER, ADMIN],
  '/kierownik': [OWNER, ADMIN, KIEROWNIK],
  '/importy': [OWNER, ADMIN],
  '/dostawy': [???],
  '/magazyn': [???],
  '/moja-praca': [???],
  '/operator': [???],
  // itd.
};
```

---

## Jak wznowić

1. Wklej w nowej sesji:
   ```
   Wznawiamy pracę nad routing fixes.
   Przeczytaj .claude/plan-routing-fixes.md i zaproponuj mapę ról.
   ```

2. Lub podaj mapę ról bezpośrednio:
   ```
   Napraw PROTECTED_ROUTES:
   - /dostawy → OWNER, ADMIN, KIEROWNIK
   - /magazyn → OWNER, ADMIN, KIEROWNIK, MAGAZYNIER
   - /moja-praca → wszyscy zalogowani
   - itd.
   ```

---

## Powiązane pliki

- [COMMON_MISTAKES.md](../COMMON_MISTAKES.md) - dodano sekcję o routingu
- [LESSONS_LEARNED.md](../LESSONS_LEARNED.md) - dodano wpis o audycie
- [middleware.ts](../apps/web/src/middleware.ts) - plik do edycji
