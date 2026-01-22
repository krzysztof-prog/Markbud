# Plan: UX Quick Wins - Usprawnienia interfejsu użytkownika

**Data utworzenia:** 2026-01-21
**Data audytu:** 2026-01-21
**Priorytet:** P1 (High)
**Status:** ✅ WSZYSTKO JUŻ ZAIMPLEMENTOWANE

---

## Podsumowanie audytu

Po przeanalizowaniu kodu okazało się, że wszystkie planowane usprawnienia UX są już zaimplementowane w projekcie.

---

## 1. Lepsze komunikaty błędów ✅ GOTOWE

**Status:** Pełna implementacja

**Istniejące pliki:**
- `apps/web/src/lib/error-messages.ts` - centralne mapowanie błędów na komunikaty PL
- `apps/web/src/lib/toast-helpers.ts` - helpery do toastów
- `apps/web/src/lib/toast-messages.ts` - wszystkie komunikaty po polsku
- `apps/web/src/lib/api-client.ts` - automatycznie dodaje `userMessage` do błędów

**Funkcje:**
- `getErrorMessage(error)` - zwraca przyjazny komunikat PL
- `getErrorAction(error)` - zwraca sugestię co użytkownik może zrobić
- `formatError(error)` - message + action razem
- `showApiErrorToast(title, error)` - automatyczny toast z error mapping

---

## 2. Oznaczenia pól wymaganych ✅ GOTOWE

**Status:** Pełna implementacja

**Istniejący plik:** `apps/web/src/components/ui/form-field.tsx`

**Funkcjonalność:**
- Prop `required` z czerwoną gwiazdką (*)
- Screen reader support: `<span className="sr-only">(wymagane)</span>`
- `aria-required` dla accessibility
- Komunikaty błędów z `role="alert"`
- Tekst pomocniczy (hint)

---

## 3. Polskie toasty ✅ GOTOWE

**Status:** Pełna implementacja

**Istniejący plik:** `apps/web/src/lib/toast-messages.ts`

**Pokrycie:**
- Wszystkie moduły mają polskie komunikaty (delivery, order, warehouse, import, glass, settings, workingDays, schuco)
- Mutation hooks używają centralnych komunikatów przez `TOAST_MESSAGES`
- Brak znalezionych angielskich komunikatów dla użytkownika

---

## 4. Nawigacja klawiaturą w Sidebar ✅ GOTOWE

**Status:** Pełna implementacja

**Istniejący plik:** `apps/web/src/components/layout/sidebar.tsx`

**Funkcjonalność (linie 227-265):**
- Arrow Down - następny element
- Arrow Up - poprzedni element
- Home - pierwszy element
- End - ostatni element
- ARIA: `role="navigation"`, `aria-label="Menu główne"`, `aria-expanded`

---

## Wniosek

Projekt AKROBUD ma już zaimplementowane wszystkie planowane usprawnienia UX Quick Wins. Można przejść do innych zadań z backlogu.