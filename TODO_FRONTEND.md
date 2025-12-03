# TODO - Brakujące funkcjonalności w interfejsie

**Status:** Lista funkcjonalności dostępnych na backendzie, które nie mają jeszcze interfejsu użytkownika.

**Ostatnia aktualizacja:** 2025-12-02

---

## ✅ UKOŃCZONE

### 10. Globalne wyszukiwanie zleceń
- [x] Komponent GlobalSearch
- [x] Integracja w header
- [x] Skrót klawiszowy Ctrl+K / Cmd+K
- [x] Debounce i optymalizacje
- **Status:** ✅ GOTOWE (2025-12-01)

### 1. Moduł SCHUCO - Tracking dostaw dostawcy
- [x] Strona `/schuco` dodana do nawigacji
- [x] Tabela dostaw z paginacją (100 wyników/stronę)
- [x] Status panel (ostatnie pobieranie, liczba dostaw)
- [x] Przycisk "Odśwież teraz" z walidacją (3 min)
- [x] Historia pobierań (logi)
- [x] Wyszukiwanie po numerze zamówienia/projektu
- [x] Oznaczenia zmian (nowe/zaktualizowane)
- [x] Kolorowanie statusów wysyłki
- [x] Paginacja i filtry
- **Status:** ✅ GOTOWE (2025-12-01)

**Optymalizacje (2025-12-02):**
- [x] **Performance:**
  - Dodano `useDebounce` (300ms) dla wyszukiwania
  - Memoizacja `filteredDeliveries` z `useMemo`
  - Memoizacja funkcji pomocniczych (`getStatusColor`, `getChangeTypeBadge`) z `useCallback`
  - Konfiguracja `staleTime` dla wszystkich zapytań (5 min dla danych, 30s dla statusu)

- [x] **UX Improvements:**
  - Toast notifications (sukces/błąd) przy odświeżaniu
  - Zastąpiono `window.confirm` custom dialogiem
  - Auto-reset strony do 1 przy zmianie wyszukiwania
  - Liczniki na zakładkach (pokazują ilość dostaw/logów)
  - Skeleton loaders zamiast tekstu "Ładowanie..."
  - Progress bar podczas 3-minutowego odświeżania

- [x] **Code Quality:**
  - Proper error handling w mutation
  - Usunięto nieużywany state `selectedDelivery`
  - Usunięto `cursor-pointer` z wierszy tabeli (brak akcji kliknięcia)
  - Clean dependency arrays we wszystkich hookach

---

## 🔴 PRIORYTET WYSOKI - Do zrobienia

### 2. Zarządzanie katalogiem profili aluminiowych
**Backend:** ✅ Gotowy (`/api/profiles/*`)
**Frontend:** ❌ Całkowicie brakuje

**Endpointy do zintegrowania:**
- `GET /api/profiles` - lista profili
- `POST /api/profiles` - dodaj profil
- `PUT /api/profiles/:id` - edytuj profil
- `DELETE /api/profiles/:id` - usuń profil
- `PUT /api/colors/:colorId/profiles/:profileId/visibility` - widoczność dla koloru

**Do zrobienia:**
- [ ] Dodać stronę `/ustawienia/profile` (nowa zakładka)
- [ ] Tabela profili z kolumnami:
  - Numer profilu
  - Numer artykułu
  - Nazwa
  - Opis
  - Akcje (Edytuj/Usuń)
- [ ] Dialog dodawania profilu:
  - Numer (required, unique)
  - Numer artykułu (optional, unique)
  - Nazwa (required)
  - Opis (optional)
- [ ] Dialog edycji profilu
- [ ] Potwierdzenie przed usunięciem
- [ ] Zarządzanie widocznością profili dla kolorów:
  - Checkbox "Widoczny dla koloru X"
  - Masowa zmiana widoczności

**Szacowany czas:** 3-4 godziny

---

### 3. Protokoły odbioru dostaw
**Backend:** ✅ Gotowy (`/api/deliveries/:id/protocol`)
**Frontend:** ❌ Brakuje przycisku

**Do zrobienia:**
- [ ] Dodać przycisk "Generuj protokół" w szczegółach dostawy
- [ ] Pobieranie PDF protokołu odbioru
- [ ] Opcjonalnie: Podgląd przed pobraniem

**Szacowany czas:** 30 min - 1 godzina

---

### 4. Historia magazynu
**Backend:** ✅ Gotowy (`/api/warehouse/history/:colorId`)
**Frontend:** ❌ Częściowo brakuje

**Do zrobienia:**
- [ ] Dodać zakładkę "Historia" w widoku magazynu
- [ ] Tabela z kolumnami:
  - Data inwentaryzacji
  - Profil
  - Stan obliczony
  - Stan rzeczywisty
  - Różnica
  - Wykonał (user)
- [ ] Filtrowanie po profilu
- [ ] Sortowanie po dacie
- [ ] Limit wyników (parametr `?limit=50`)

**Szacowany czas:** 2-3 godziny

---

## ⚠️ PRIORYTET ŚREDNI

### 5. Pełny raport braków materiałowych
**Backend:** ✅ Gotowy (`/api/warehouse/shortages`)
**Frontend:** ❌ Tylko top 5 na dashboardzie

**Do zrobienia:**
- [ ] Dodać stronę `/magazyn/braki`
- [ ] Tabela wszystkich braków z polami:
  - Profil
  - Kolor
  - Aktualny stan
  - Zapotrzebowanie
  - Brak (różnica)
  - Poziom krytyczności (critical/high/medium)
- [ ] Filtrowanie po poziomie krytyczności
- [ ] Filtrowanie po kolorze
- [ ] Sortowanie po wielkości braku
- [ ] Export do CSV
- [ ] Kolorowanie wierszy (czerwony/pomarańczowy/żółty)

**Szacowany czas:** 2-3 godziny

---

### 6. System notatek
**Backend:** ✅ Gotowy (model `Note` w Prisma)
**Frontend:** ❌ Całkowicie brakuje

**Do zrobienia:**
- [ ] Dodać sekcję "Notatki" w szczegółach zlecenia
- [ ] Lista notatek z datą i autorem
- [ ] Formularz dodawania notatki
- [ ] Edycja notatki (tylko własne)
- [ ] Usuwanie notatki (tylko własne)
- [ ] Oznaczanie ważnych notatek
- [ ] Opcjonalnie: Notatki ogólne (nie powiązane ze zleceniem)

**Szacowany czas:** 3-4 godziny

---

### 7. Zaawansowane zarządzanie dniami wolnymi
**Backend:** ✅ Gotowy (`/api/working-days/*`)
**Frontend:** ❌ Tylko prawy klik w kalendarzu

**Do zrobienia:**
- [ ] Dodać stronę `/ustawienia/dni-wolne`
- [ ] Lista dni wolnych z opisami
- [ ] Dodawanie zakresu dni wolnych (od-do)
- [ ] Import świąt dla roku:
  - Polska (PL)
  - Niemcy (DE)
- [ ] Edycja opisu dnia wolnego
- [ ] Usuwanie oznaczenia
- [ ] Kalendarz z wizualizacją dni wolnych

**Szacowany czas:** 3-4 godziny

---

### 8. Statystyki miesięczne
**Backend:** ✅ Gotowy (`/api/dashboard/stats/monthly`)
**Frontend:** ❌ Brakuje widoku

**Do zrobienia:**
- [ ] Dodać zakładkę "Statystyki miesięczne" na dashboardzie
- [ ] Wykresy dla wybranego miesiąca:
  - Liczba okien/drzwi
  - Liczba skrzydeł
  - Liczba szyb
  - Liczba dostaw
- [ ] Selektor miesiąc/rok
- [ ] Porównanie z poprzednim miesiącem
- [ ] Wykres trendów (6-12 miesięcy)

**Szacowany czas:** 3-4 godziny

---

### 9. Zapotrzebowanie na profile
**Backend:** ✅ Gotowy (`/api/deliveries/profile-requirements`)
**Frontend:** ❌ Brakuje dedykowanego widoku

**Do zrobienia:**
- [ ] Dodać stronę `/raporty/zapotrzebowanie`
- [ ] Tabela z grupowaniem po dostawach:
  - Data dostawy
  - Profil
  - Kolor
  - Suma bel
- [ ] Filtrowanie po zakresie dat (`?from=2024-01-01`)
- [ ] Grupowanie po profilu/kolorze/dostawie
- [ ] Export do CSV/Excel
- [ ] Podsumowanie na dole tabeli

**Szacowany czas:** 2-3 godziny

---

## 📝 PRIORYTET NISKI

### 10. Statystyki profili
**Backend:** ✅ Gotowy (`/api/deliveries/stats/profiles`)
**Frontend:** ❌ Częściowo (przycisk w kalendarzu)

**Do zrobienia:**
- [ ] Rozbudować istniejący dialog statystyk
- [ ] Dodać parametr `months` dla zakresu
- [ ] Wykresy użycia profili:
  - Top 10 najczęściej używanych
  - Trend miesięczny
  - Użycie po kolorach
- [ ] Export do PDF/CSV

**Szacowany czas:** 2-3 godziny

---

### 11. Reguły pakowania
**Backend:** ✅ Gotowy (`/api/settings/packing-rules`)
**Frontend:** ❌ Całkowicie brakuje

**Do zrobienia:**
- [ ] Dodać zakładkę "Reguły pakowania" w ustawieniach
- [ ] Lista reguł pakowania:
  - Nazwa
  - Opis
  - Aktywna (checkbox)
  - Konfiguracja (JSON)
- [ ] Dialog dodawania/edycji reguły
- [ ] Toggle aktywna/nieaktywna
- [ ] Usuwanie reguły
- [ ] Walidacja konfiguracji JSON

**Szacowany czas:** 2-3 godziny

---

### 12. Import - zaawansowane opcje
**Backend:** ✅ Gotowy (opcje `overwrite`, `replaceBase`)
**Frontend:** ❌ Tylko podstawowy import

**Do zrobienia:**
- [ ] Dodać opcje przy zatwierdzaniu importu:
  - `overwrite` - zastąp istniejące zlecenie
  - `add_new` - dodaj jako nowe
  - `replaceBase` - czy zamienić bazę
- [ ] Dialog z wyborem akcji przed zatwierdzeniem
- [ ] Podgląd różnic (co zostanie nadpisane)
- [ ] Ostrzeżenie przy nadpisywaniu

**Szacowany czas:** 2-3 godziny

---

### 13. Tabela zleceń dla koloru
**Backend:** ✅ Gotowy (`/api/orders/table/:colorId`)
**Frontend:** ❌ Częściowo (w magazynie)

**Do zrobienia:**
- [ ] Rozbudować istniejącą tabelę w magazynie
- [ ] Dodać kolumny:
  - Status zlecenia
  - Termin
  - Klient
- [ ] Kliknięcie na zlecenie → szczegóły
- [ ] Sumowanie na dole dla każdego profilu

**Szacowany czas:** 1-2 godziny

---

### 14. Health Check
**Backend:** ✅ Gotowy (`/api/health`, `/api/ready`)
**Frontend:** ❌ Całkowicie brakuje

**Do zrobienia:**
- [ ] Dodać stronę `/admin/health` (tylko dla administratorów)
- [ ] Status systemu:
  - Uptime
  - Wersja API
  - Połączenie z bazą danych
  - Środowisko (production/development)
- [ ] Automatyczne odświeżanie co 30s
- [ ] Wizualizacja (zielony/czerwony status)

**Szacowany czas:** 1-2 godziny

---

### 15. Wyszukiwanie w archiwum
**Backend:** ✅ Gotowy
**Frontend:** ❌ Tylko podstawowe

**Do zrobienia:**
- [ ] Rozszerzyć wyszukiwanie w archiwum:
  - Po kliencie
  - Po projekcie
  - Po zakresie dat
- [ ] Zaawansowane filtry
- [ ] Export wyników wyszukiwania

**Szacowany czas:** 1-2 godziny

---

## 🎯 DALSZE OPTYMALIZACJE

### Backend search endpoint
**Obecnie:** Frontend pobiera wszystkie zlecenia i filtruje client-side
**Do zrobienia:**
- [ ] Dodać parametr `?search=...` do `/api/orders`
- [ ] Filtrowanie po stronie backendu (Prisma `contains`)
- [ ] Wykorzystać w GlobalSearch

**Korzyści:**
- Mniej danych przesyłanych przez sieć
- Lepsza wydajność dla dużych zbiorów (1000+ zleceń)
- Możliwość paginacji

**Szacowany czas:** 1-2 godziny

---

### Fuzzy search
**Do zrobienia:**
- [ ] Instalacja `fuse.js`
- [ ] Integracja w GlobalSearch
- [ ] Lepsze dopasowanie wyników (literówki, podobieństwo)

**Szacowany czas:** 2-3 godziny

---

### Highlight pasujących fragmentów
**Do zrobienia:**
- [ ] Podświetlanie znalezionego tekstu w wynikach wyszukiwania
- [ ] Użycie `<mark>` dla znalezionych fragmentów

**Szacowany czas:** 1 godzina

---

### Historia wyszukiwań
**Do zrobienia:**
- [ ] Zapisywanie ostatnich wyszukiwań w localStorage
- [ ] Wyświetlanie sugestii przy otwieraniu
- [ ] Czyszczenie historii

**Szacowany czas:** 1-2 godziny

---

## 📊 PODSUMOWANIE

**Całkowicie brakujące funkcjonalności:** 7
**Częściowo zaimplementowane:** 6
**Optymalizacje:** 4

**Łączny szacowany czas:** ~50-70 godzin pracy

### Rekomendowana kolejność implementacji:

1. **Moduł SCHUCO** (4-6h) - duża wartość biznesowa
2. **Protokoły odbioru** (1h) - szybkie, przydatne
3. **Zarządzanie profilami** (3-4h) - podstawowa funkcjonalność
4. **Pełny raport braków** (2-3h) - rozszerzenie istniejącego
5. **Historia magazynu** (2-3h) - ważne dla inwentaryzacji
6. **System notatek** (3-4h) - użyteczne dla użytkowników
7. **Pozostałe** - według potrzeb

---

**Wygenerowano:** 2025-12-01
**Ostatnia aktualizacja:** 2025-12-02
**Wersja:** 1.1
