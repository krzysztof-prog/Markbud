# AKROBUD - System ERP dla Produkcji Okien Aluminiowych

## 🎯 Opis Projektu

AKROBUD to zaawansowany system ERP zaprojektowany specjalnie dla firmy zajmującej się produkcją okien aluminiowych. System kompleksowo zarządza całym cyklem produkcyjnym - od przyjęcia zlecenia, przez planowanie produkcji, zarządzanie magazynem profili i okuć, aż po optymalizację dostaw i raportowanie.

## 🏗️ Architektura Techniczna

### Stack Technologiczny

**Backend**
- Fastify 4.x - szybki framework HTTP
- Prisma 5.x - ORM z SQLite
- TypeScript - typowanie statyczne
- Zod - walidacja danych
- Vitest - testy jednostkowe

**Frontend**
- Next.js 15.5.7 - framework React z App Router
- TailwindCSS + Shadcn/ui - nowoczesny UI
- React Query (TanStack Query) - zarządzanie stanem serwera
- TanStack Table - zaawansowane tabele
- React Hook Form - formularze z walidacją
- Recharts - wizualizacje danych

**Monorepo**
- pnpm workspaces - zarządzanie zależnościami
- Turbo - build system

## 📋 Główne Moduły i Funkcjonalności

### 1. 📦 Moduł Zleceń (Orders)

**Opis**: Centralne miejsce zarządzania zleceniami produkcyjnymi okien aluminiowych.

**Kluczowe funkcje**:
- Tworzenie i edycja zleceń produkcyjnych
- Śledzenie statusu: `new` → `in_progress` → `completed` → `archived`
- Zarządzanie wariantami zleceń (różne konfiguracje tego samego zlecenia)
- Automatyczne obliczanie zapotrzebowania na profile
- Powiązanie z dostawami i magazynem
- System akceptacji cen dla zaimportowanych zleceń
- Historia zmian i audyt

**Workflow**:
1. Import zlecenia z pliku PDF lub ręczne wprowadzenie
2. Weryfikacja i akceptacja (w przypadku wariantów)
3. Automatyczne obliczenie zapotrzebowania materiałowego
4. Przypisanie do dostawy
5. Produkcja i realizacja
6. Archiwizacja

### 2. 🚚 Moduł Dostaw (Deliveries)

**Opis**: Zaawansowane planowanie i zarządzanie dostawami profili aluminiowych do klientów.

**Kluczowe funkcje**:
- Planowanie dostaw z kalendarza
- Przypisywanie zleceń do dostaw
- **Optymalizacja palet** - inteligentne pakowanie okien na palety
  - Algorytm bin packing
  - Wizualizacja 2D rozmieszczenia okien
  - Optymalizacja wykorzystania przestrzeni
  - Eksport do PDF z układem palet
- Statusy dostaw: `planned` → `loading` → `shipped` → `delivered`
- Generowanie protokołów dostawy (PDF)
- Synchronizacja z kalendarzem Google
- Historia dostaw

**Optymalizacja palet**:
- Automatyczne grupowanie okien według wymiarów
- Maksymalizacja wykorzystania przestrzeni paletowej
- Wizualizacja 2D z wymiarami
- Export do PDF dla produkcji

### 3. 🏭 Magazyn Profili (Warehouse)

**Opis**: Kompleksowe zarządzanie stanem magazynowym profili aluminiowych.

**Kluczowe funkcje**:
- Śledzenie stanu magazynowego (Profile × Kolor)
- Wersjonowanie stanu (optimistic locking)
- Historia wszystkich operacji magazynowych
- Automatyczne zamówienia do dostawcy (Schuco)
- Analiza niedoborów (shortages)
- Statystyki zużycia profili
- Import/eksport danych CSV

**Typy operacji**:
- Manual adjustment (korekty ręczne)
- Delivery (dostawy od dostawcy)
- Order consumption (zużycie na zlecenia)
- Transfer (przesunięcia międzymagazynowe)

### 4. 🔧 Moduł Okuć (Okuc)

**Opis**: Zarządzanie magazynem okuć okiennych i akcesoriów.

**Kluczowe funkcje**:
- Katalog artykułów okuć
- Stan magazynowy z alertami o niskich stanach
- Import z plików CSV/Excel
- Dokumenty RW/PW (przyjęcie/wydanie)
- Zapotrzebowanie materiałowe dla zleceń
- Historia operacji magazynowych

### 5. 🔗 Integracja Schuco (Schuco Connect)

**Opis**: Automatyczna synchronizacja z systemem dostawcy Schuco.

**Kluczowe funkcje**:
- Automatyczne pobieranie zamówień (web scraping via Puppeteer)
- Śledzenie statusu zamówień u dostawcy
- Synchronizacja dat dostaw
- Parsowanie plików CSV od Schuco
- Inteligentne dopasowanie zamówień do zleceń wewnętrznych
- Powiadomienia o zmianach statusu

**Proces**:
1. Login do Schuco Connect (automatyczny)
2. Pobranie listy zamówień
3. Download plików CSV z danymi
4. Parsing i normalizacja danych
5. Dopasowanie do zleceń wewnętrznych
6. Aktualizacja statusów

### 6. 📊 Moduł Raportów i Statystyk

**Opis**: Zaawansowane raporty i analizy biznesowe.

**Kluczowe funkcje**:
- **Dashboard główny**:
  - Zlecenia w produkcji (real-time)
  - Nadchodzące dostawy
  - Alerty o niedoborach magazynowych
  - Statystyki miesięczne
- **Raporty miesięczne**:
  - Zużycie profili według kolorów
  - Wartość zamówień
  - Analiza produktywności
- **Eksport PDF**:
  - Protokoły dostaw
  - Plany palet
  - Zestawienia magazynowe
- **Zestawienia**:
  - Stan magazynu profili
  - Analiza zleceń
  - Historia operacji

### 7. 🔍 Wyszukiwarka Globalna

**Opis**: Szybkie wyszukiwanie w całym systemie.

**Funkcje**:
- Wyszukiwanie po numerze zlecenia
- Wyszukiwanie po nazwie klienta
- Wyszukiwanie po numerze dostawy
- Live search z podpowiedziami
- Szybka nawigacja do wyników

### 8. 👤 Zarządzanie Użytkownikami i Uprawnieniami

**Opis**: System użytkowników z personalizacją.

**Funkcje**:
- Uwierzytelnianie i autoryzacja
- Osobiste ustawienia folderów importu
- Blokowanie równoległych importów
- Historia działań użytkownika
- Role i uprawnienia (system user dla automatycznych operacji)

## 🎨 Wyróżniające Funkcjonalności

### Optymalizacja Palet z Wizualizacją 2D
Zaawansowany algorytm pakowania okien na palety z graficzną wizualizacją rozmieszczenia. Export do PDF dla działu produkcji.

### Inteligentne Dopasowanie Zamówień Schuco
Automatyczne dopasowywanie zamówień od dostawcy do wewnętrznych zleceń produkcyjnych na podstawie:
- Numeru zlecenia
- Profilu i koloru
- Dat produkcji
- Długości i ilości

### System Wariantów Zleceń
Obsługa sytuacji, gdy to samo zlecenie ma kilka wersji (np. zmiana przez klienta). System prosi o wybranie właściwego wariantu przed importem.

### Wersjonowanie Stanu Magazynu
Optimistic locking zapobiegający konfliktom przy równoległych operacjach magazynowych.

### Automatyczne Obliczanie Zapotrzebowania
System automatycznie oblicza potrzeby materiałowe na podstawie zleceń i porównuje ze stanem magazynowym.

## 📱 Interfejs Użytkownika

### Responsywny Design
- Pełna responsywność na urządzeniach mobilnych
- Adaptacyjny layout dla tabletów
- Optymalizacja dla desktopów

### Komponenty UI
- Nowoczesny design system (Shadcn/ui)
- Interaktywne tabele z sortowaniem i filtrowaniem
- Modalne okna dla szybkich akcji
- Toast notifications dla feedbacku
- Loading states i error handling

### Nawigacja
- Boczny sidebar z kategoriami
- Breadcrumbs dla orientacji
- Quick actions w headerze
- Globalne wyszukiwanie (Ctrl+K)

## 🔐 Bezpieczeństwo i Wydajność

### Bezpieczeństwo
- Walidacja danych na poziomie backend (Zod)
- Sanityzacja inputów użytkownika
- Foreign keys w bazie danych
- Transakcje dla operacji krytycznych
- Optimistic locking dla danych współdzielonych

### Wydajność
- Indeksy bazy danych dla częstych zapytań
- React Query caching
- Lazy loading komponentów
- Debouncing dla wyszukiwania
- Pagination dla dużych zbiorów danych
- Virtual scrolling dla długich list

## 📈 Workflow Typowy Dzień Pracy

1. **Rano**:
   - Sprawdzenie dashboardu (nowe zlecenia, nadchodzące dostawy)
   - Import nowych zleceń z PDF
   - Synchronizacja z Schuco

2. **W ciągu dnia**:
   - Planowanie dostaw na kolejne dni
   - Optymalizacja palet dla zaplanowanych dostaw
   - Aktualizacja statusów zleceń
   - Zarządzanie magazynem (przyjęcia, wydania)

3. **Wieczorem**:
   - Generowanie protokołów dostaw na następny dzień
   - Weryfikacja stanów magazynowych
   - Zamówienia profili do Schuco (jeśli niedobory)

## 🚀 Plany Rozwoju

- [ ] Integracja z systemami kurierskimi
- [ ] Aplikacja mobilna dla kierowców dostaw
- [ ] Rozszerzone raporty BI
- [ ] Automatyczne prognozowanie zapotrzebowania
- [ ] Integracja z systemami płatności
- [ ] API dla partnerów zewnętrznych

## 📚 Dokumentacja Techniczna

Szczegółowa dokumentacja dostępna w katalogu `docs/`:
- [Architektura API](docs/architecture/api-endpoints.md)
- [Struktura bazy danych](docs/architecture/database.md)
- [Przewodniki deweloperskie](docs/guides/)
- [Dokumentacja funkcji](docs/features/)
- [Instrukcje użytkownika](docs/user-guides/)

## 🛠️ Quick Start dla Developerów

```bash
# Instalacja
pnpm install

# Uruchomienie dev
pnpm dev

# Migracje bazy
pnpm db:migrate
pnpm db:seed

# Testy
pnpm test
```

Więcej w [README.md](README.md) i [CLAUDE.md](CLAUDE.md).

---

**Status projektu**: ✅ Production Ready
**Wersja**: 1.0.0
**Ostatnia aktualizacja**: 2025-12-30
