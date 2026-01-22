# Plan: Potencjalne Nowe Funkcjonalności AKROBUD

**Data utworzenia:** 2026-01-21
**Status:** PROPOZYCJE DO ROZWAŻENIA

---

## A. Funkcje GOTOWE do dokończenia (backend jest, brakuje UI)

| Funkcjonalność | Co już jest | Co trzeba zrobić | Wartość |
|----------------|-------------|------------------|---------|
| **Moduł Stal** | Baza danych (SteelStock, SteelOrder, SteelHistory), API `/api/steel/*` | Strona `/magazyn/stal` z tabelą i importem | Zarządzanie stanem stali w jednym miejscu |
| **Kontrola Etykiet** | Baza danych (LabelCheck), API `/api/label-checks/*` | Strona `/kontrola-etykiet` z formularzem i historią | Śledzenie kontroli jakości etykiet |
| **Optymalizacja Palet** | PalletOptimizerService, API `/api/pallets/optimize/:deliveryId` | Wizualizacja palet 2D, przycisk w dostawach | Lepssze pakowanie = mniej palet = niższe koszty |
| **Raport Miesięczny** | Dane w bazie, API | Zakładka w panelu kierownika | Podsumowanie miesiąca na jedno kliknięcie |

---

## B. Nowe funkcje do rozważenia (od zera)

| Funkcjonalność | Opis | Korzyść | Złożoność |
|----------------|------|---------|-----------|
| **Planowanie Produkcji** | Scheduler optymalizujący kolejność zleceń | Mniej przestojów, lepsze wykorzystanie maszyn | Wysoka (20-30h) |
| **System Notatek** | Dodawanie notatek do zleceń z historią | Lepsza komunikacja między zmianami | Średnia (8-10h) |
| **Protokoły Odbioru PDF** | Generowanie dokumentów odbioru | Automatyzacja papierologii | Niska (3-4h) |
| **Historia Magazynu** | Zakładka z pełnym audyt trail zmian | Pełna transparentność kto/co/kiedy zmieniał | Niska (2h) |
| **Statystyki Miesięczne** | Wykresy i raporty z eksportem do PDF/Excel | Analizy dla właściciela/kierownictwa | Średnia (4-5h) |
| **Zarządzanie Dniami Wolnymi** | Dedykowany kalendarz świąt i dni wolnych | Łatwiejsze planowanie (batch dodawanie) | Niska (4h) |
| **Drag-Drop Profile** | Przeciąganie profili w ustawieniach | Szybsza organizacja kolejności | Niska (4-6h) |

---

## C. Usprawnienia UX (Quick Wins) ✅ ZREALIZOWANE

Wszystkie planowane usprawnienia UX są już zaimplementowane:

| Usprawnienie | Status | Lokalizacja |
|--------------|--------|-------------|
| Komunikaty błędów PL | ✅ Gotowe | `apps/web/src/lib/error-messages.ts` |
| Oznaczenia pól wymaganych | ✅ Gotowe | `apps/web/src/components/ui/form-field.tsx` |
| Polskie toasty | ✅ Gotowe | `apps/web/src/lib/toast-messages.ts` |
| Nawigacja klawiaturą | ✅ Gotowe | `apps/web/src/components/layout/sidebar.tsx` |

---

## D. Priorytety rekomendowane

### Priorytet 1 - Quick Wins (1-2 dni)
1. **Historia Magazynu** (2h) - zakładka z audit trail
2. **Protokoły Odbioru PDF** (3-4h) - backend gotowy, tylko UI

### Priorytet 2 - Dokończenie modułów (3-5 dni)
3. **Moduł Stal - Frontend** (8h)
4. **Kontrola Etykiet - Frontend** (6h)
5. **Optymalizacja Palet - Frontend** (8h)

### Priorytet 3 - Nowe funkcje (1-2 tygodnie)
6. **System Notatek** (8-10h)
7. **Statystyki Miesięczne** (4-5h)
8. **Planowanie Produkcji** (20-30h) - duży projekt

---

## E. Szczegóły techniczne

### Moduł Stal
**Backend gotowy:**
- Modele: `SteelStock`, `SteelOrder`, `SteelHistory`
- Routes: `apps/api/src/routes/steel.ts`
- Handler: `apps/api/src/handlers/steelHandler.ts`

**Frontend do zrobienia:**
- `apps/web/src/app/magazyn/stal/page.tsx`
- `apps/web/src/features/steel/` (komponenty, hooks, api)

### Kontrola Etykiet
**Backend gotowy:**
- Model: `LabelCheck`
- Routes: `apps/api/src/routes/label-checks.ts`
- Handler: `apps/api/src/handlers/labelCheckHandler.ts`

**Frontend do zrobienia:**
- `apps/web/src/app/kontrola-etykiet/page.tsx`
- `apps/web/src/features/label-checks/` (komponenty, hooks, api)

### Optymalizacja Palet
**Backend gotowy:**
- Service: `PalletOptimizerService`
- API: `GET /api/pallets/optimize/:deliveryId`

**Frontend do zrobienia:**
- Wizualizacja palet (canvas/SVG)
- Przycisk "Optymalizuj" w szczegółach dostawy
- Dialog z wynikami

---

## F. Decyzje do podjęcia

Przed implementacją nowych funkcji warto rozważyć:

1. **Które funkcje są najważniejsze dla codziennej pracy?**
2. **Czy są jakieś bolączki których nie widzę na liście?**
3. **Czy priorytet powinien być inny?**

---

**Następne kroki:** Wybierz które funkcje chcesz zaimplementować jako pierwsze.
