# AKROBUD - Plan Projektu

## Podsumowanie wymagań

| Aspekt | Decyzja |
|--------|---------|
| Typ aplikacji | Webowa |
| Użytkownicy | Wielu jednocześnie |
| Uprawnienia | Nie teraz, ale przygotowana architektura na przyszłość |
| Historia | Pełny dostęp, przechowywanie do manualnego usunięcia |
| Baza zewnętrzna | PostgreSQL |
| Poczta | IMAP |
| Kursy walut | Ręczne wprowadzanie przez użytkownika |
| Import plików | Automatyczny skan folderów + import |
| Tabela magazynowa | Ręczne uzupełnianie (wymagane) |
| Wizualizacja palet | Tak (2D) |
| Kalendarz dostaw | Tak (widok tygodniowy/miesięczny) |
| Sidebar kolorów | Filtrowalny z podglądem |
| Powiadomienia | Tak (braki materiałowe) |

---

## Architektura systemu

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                     │
│                    Next.js 14 + React 18                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Dashboard │ │ Magazyn  │ │ Dostawy  │ │Zestawienia│ │Ustawienia│  │
│  │          │ │ /Profile │ │/Kalendarz│ │ /Raporty │ │          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                      │
│  UI: Tailwind CSS + shadcn/ui + React DnD + FullCalendar            │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ REST API + WebSocket
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND                                      │
│                    Node.js + Express/Fastify                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ API REST │ │  File    │ │  Email   │ │   PDF    │ │   CSV    │  │
│  │ Endpoints│ │ Watcher  │ │  IMAP    │ │  Parser  │ │  Parser  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                             │
│  │WebSocket │ │ Scheduler│ │  Pallet  │                             │
│  │  Server  │ │  (Cron)  │ │Optimizer │                             │
│  └──────────┘ └──────────┘ └──────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BAZA DANYCH                                   │
│  ┌─────────────────────┐    ┌─────────────────────┐                 │
│  │    PostgreSQL       │    │   Redis (cache)     │                 │
│  │  - Dane aplikacji   │    │  - Sesje            │                 │
│  │  - Historia         │    │  - Cache zapytań    │                 │
│  │  - Archiwum         │    │  - Real-time data   │                 │
│  └─────────────────────┘    └─────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stack technologiczny

### Frontend
| Technologia | Cel |
|-------------|-----|
| **Next.js 14** | Framework React z SSR, routing, API routes |
| **React 18** | Biblioteka UI |
| **TypeScript** | Typowanie statyczne |
| **Tailwind CSS** | Stylowanie |
| **shadcn/ui** | Komponenty UI (przyciski, tabele, modele, formularze) |
| **TanStack Table** | Zaawansowane tabele z sortowaniem, filtrowaniem |
| **React DnD** | Drag & drop (dostawy, kalendarz) |
| **FullCalendar** | Kalendarz dostaw |
| **Recharts** | Wykresy w dashboardzie |
| **React Hot Toast** | Powiadomienia |

### Backend
| Technologia | Cel |
|-------------|-----|
| **Node.js** | Runtime |
| **Fastify** | Framework HTTP (szybszy niż Express) |
| **Prisma** | ORM dla PostgreSQL |
| **Chokidar** | Monitorowanie folderów |
| **node-imap** | Integracja z pocztą IMAP |
| **pdf-parse** | Parsowanie PDF |
| **csv-parser** | Parsowanie CSV |
| **Socket.io** | Real-time updates |
| **node-cron** | Zaplanowane zadania |

### Baza danych
| Technologia | Cel |
|-------------|-----|
| **PostgreSQL** | Główna baza danych |
| **Redis** | Cache, sesje, real-time |

---

## Fazy implementacji

### FAZA 1: Fundament (2-3 tygodnie estymacji pracy)

#### Krok 1.1: Inicjalizacja projektu
- [ ] Utworzenie struktury monorepo (pnpm workspaces)
- [ ] Konfiguracja Next.js frontend
- [ ] Konfiguracja Fastify backend
- [ ] Konfiguracja TypeScript
- [ ] Konfiguracja ESLint + Prettier
- [ ] Konfiguracja Docker (PostgreSQL, Redis)

#### Krok 1.2: Baza danych
- [ ] Projektowanie schematu Prisma
- [ ] Tabele: users, orders, profiles, colors, warehouse_stock, deliveries, archives
- [ ] Migracje początkowe
- [ ] Seedy z danymi testowymi (profile, kolory)

#### Krok 1.3: Autentykacja (przygotowanie na przyszłość)
- [ ] NextAuth.js z prostym loginem
- [ ] Middleware autoryzacji (na razie jeden poziom)
- [ ] Struktura ról w bazie (do wykorzystania później)

#### Krok 1.4: Layout aplikacji
- [ ] Sidebar nawigacji
- [ ] Header z powiadomieniami
- [ ] Responsywny layout
- [ ] Ciemny/jasny motyw

---

### FAZA 2: Import danych (2-3 tygodnie)

#### Krok 2.1: File Watcher Service
- [ ] Serwis monitorujący foldery `/uzyte bele` i `/ceny`
- [ ] Konfiguracja ścieżek w ustawieniach
- [ ] Automatyczne wykrywanie nowych plików
- [ ] WebSocket powiadomienia do frontendu
- [ ] Historia importów

#### Krok 2.2: Parser CSV "użyte bele"
- [ ] Parsowanie Tabeli 1 (num zlec / num art / nowych bel / reszta)
- [ ] Implementacja logiki przeliczania:
  - Zaokrąglanie reszty do 500mm
  - Obliczanie faktycznego zużycia
  - Obliczanie reszta2 (6000 - zaokrąglona reszta)
- [ ] Parsowanie Tabeli 2 (wymiary okien)
- [ ] Walidacja danych
- [ ] Obsługa duplikatów (pytanie: nadpisać/dodać)

#### Krok 2.3: Parser PDF ceny
- [ ] Parsowanie PDF z folderu `/ceny`
- [ ] Wyciąganie wartości zamówienia
- [ ] Przypisywanie do zlecenia

#### Krok 2.4: Parser CSV dostawa szkła
- [ ] Parsowanie kolumny "zlecenie"
- [ ] Wyciąganie numeru zlecenia (regex)
- [ ] Sumowanie ilości szyb
- [ ] Porównanie z wymaganymi

#### Krok 2.5: Parser PDF potwierdzenia zamówienia
- [ ] Wyciąganie terminu dostawy ("Tydz. XX/YYYY")
- [ ] Przeliczanie na datę poniedziałku
- [ ] Parsowanie tabeli (nr art, bele, metry)

#### Krok 2.6: UI importu
- [ ] Panel "Oczekujące importy" na dashboardzie
- [ ] Podgląd zawartości pliku przed importem
- [ ] Przycisk zatwierdzenia/odrzucenia
- [ ] Historia importów z możliwością cofnięcia

---

### FAZA 3: Magazyn profili (2-3 tygodnie)

#### Krok 3.1: Zarządzanie kolorami
- [ ] CRUD kolorów (typowe/nietypowe)
- [ ] Podział na kategorie
- [ ] Przypisywanie profili do kolorów
- [ ] Wizualizacja koloru (hex code / podgląd)

#### Krok 3.2: Zarządzanie profilami
- [ ] CRUD profili (9016, 8866, 8869, 9671, 9677, 9315)
- [ ] Struktura numeru artykułu (X-profil-kolor)
- [ ] Powiązanie z kolorami

#### Krok 3.3: Tabela zleceń (per kolor)
- [ ] Filtrowalny sidebar z listą kolorów
- [ ] Tabela: zlecenia (wiersze) × profile (kolumny)
- [ ] Każdy profil = 2 kolumny (bele + metry)
- [ ] Sortowanie, filtrowanie
- [ ] Eksport do Excel

#### Krok 3.4: Tabela magazynowa
- [ ] Stan magazynu (ręczne wprowadzanie)
- [ ] Kolumny: zamówione bele, data dostawy
- [ ] Inline editing
- [ ] Historia zmian stanu magazynu

#### Krok 3.5: Automatyczne obliczenia
- [ ] Aktualny stan magazynu
- [ ] Zapotrzebowanie (suma ze zleceń)
- [ ] Stan po zapotrzebowaniu
- [ ] Prognozowane braki

#### Krok 3.6: Aktualizacja miesięczna
- [ ] Formularz wprowadzania stanu z natury
- [ ] Porównanie: obliczony vs rzeczywisty
- [ ] Zapisywanie różnic (statystyki)
- [ ] Automatyczne archiwizowanie zrealizowanych zleceń

---

### FAZA 4: Zamówienia i dostawy (2-3 tygodnie)

#### Krok 4.1: Zarządzanie zamówieniami
- [ ] Lista zamówień
- [ ] Szczegóły zamówienia
- [ ] Ręczne wprowadzanie danych
- [ ] Import z PDF
- [ ] Edycja zamówień

#### Krok 4.2: Kalendarz dostaw
- [ ] Widok tygodniowy/miesięczny (FullCalendar)
- [ ] Drag & drop zleceń między datami
- [ ] Lista zleceń bez przypisanej daty
- [ ] Kolorowe oznaczenia statusu

#### Krok 4.3: Szczegóły dostawy
- [ ] Lista zleceń w danej dostawie
- [ ] Podgląd wartości dostawy
- [ ] Generowanie protokołu odbioru

#### Krok 4.4: Protokół odbioru
- [ ] Szablon protokołu (PDF)
- [ ] Dane: liczba okien, szyby, reklamacje, palety, wartość
- [ ] Generowanie i pobieranie PDF

---

### FAZA 5: Optymalizacja palet (1-2 tygodnie)

#### Krok 5.1: Definicje palet
- [ ] CRUD rodzajów palet
- [ ] Wymiary (długość, szerokość, wysokość, nośność)
- [ ] Reguły pakowania (checkboxy)

#### Krok 5.2: Algorytm optymalizacji
- [ ] Implementacja algorytmu bin-packing
- [ ] Uwzględnienie reguł użytkownika
- [ ] Minimalizacja liczby palet

#### Krok 5.3: Wizualizacja 2D
- [ ] Canvas/SVG rendering
- [ ] Widok z góry palety
- [ ] Interaktywny podgląd okien na palecie
- [ ] Możliwość ręcznej korekty

---

### FAZA 6: Zestawienia i raporty (1-2 tygodnie)

#### Krok 6.1: Zestawienia miesięczne
- [ ] Automatyczne generowanie
- [ ] Kolumny: nr zlecenia, ilość okien/jednostek/skrzydeł, wartość PLN/EUR, nr faktury
- [ ] Konfiguracja kursu walut (ręczne wprowadzanie)
- [ ] Eksport do Excel/PDF

#### Krok 6.2: Dashboard
- [ ] Podsumowanie stanów magazynowych
- [ ] Wykresy trendów
- [ ] Lista alertów (braki materiałowe)
- [ ] Nadchodzące dostawy

#### Krok 6.3: Podgląd braków
- [ ] Lista potencjalnych braków
- [ ] Timeline: kiedy zabraknie
- [ ] Priorytety

---

### FAZA 7: Integracje (1-2 tygodnie)

#### Krok 7.1: Integracja IMAP
- [ ] Konfiguracja serwera pocztowego
- [ ] Automatyczne pobieranie maili
- [ ] Filtrowanie (od kogo, temat)
- [ ] Pobieranie załączników
- [ ] Przekazywanie do parsera

#### Krok 7.2: Połączenie z zewnętrzną bazą PostgreSQL
- [ ] Konfiguracja drugiego połączenia
- [ ] Odczyt danych
- [ ] Synchronizacja

#### Krok 7.3: Powiadomienia
- [ ] System powiadomień w aplikacji
- [ ] Powiadomienia push (opcjonalnie)
- [ ] Powiadomienia email o brakach

---

### FAZA 8: Ustawienia i finalizacja (1 tydzień)

#### Krok 8.1: Panel ustawień
- [ ] Ścieżki do folderów monitorowanych
- [ ] Parametry magazynu
- [ ] Definicje profili i kolorów
- [ ] Definicje palet
- [ ] Konfiguracja IMAP
- [ ] Kurs walut EUR/PLN

#### Krok 8.2: Archiwum
- [ ] Przeglądanie zarchiwizowanych zleceń
- [ ] Wyszukiwanie w archiwum
- [ ] Przywracanie z archiwum
- [ ] Ręczne usuwanie (z potwierdzeniem)

#### Krok 8.3: Notatki
- [ ] Notatki przy zleceniach
- [ ] Notatki ogólne

#### Krok 8.4: Testy i optymalizacja
- [ ] Testy end-to-end
- [ ] Optymalizacja wydajności
- [ ] Dokumentacja użytkownika

---

## Struktura bazy danych (uproszczona)

```sql
-- Użytkownicy (przygotowane na przyszłość)
users (id, email, password_hash, name, role, created_at)

-- Profile aluminiowe
profiles (id, number, name, description)
-- np. 9016, 8866, 8869, 9671, 9677, 9315

-- Kolory
colors (id, code, name, type, hex_color)
-- type: 'typical' | 'atypical'

-- Powiązanie profile-kolory (które profile dostępne w danym kolorze)
profile_colors (profile_id, color_id, is_visible)

-- Zlecenia
orders (
  id, order_number, status,
  value_pln, value_eur, invoice_number,
  delivery_date, created_at, archived_at
)

-- Zapotrzebowanie na profile (per zlecenie)
order_requirements (
  id, order_id, profile_id, color_id,
  beams_count, meters, rest_mm
)

-- Wymiary okien (do pakowania)
order_windows (
  id, order_id, width_mm, height_mm,
  profile_type, quantity, reference
)

-- Stan magazynowy
warehouse_stock (
  id, profile_id, color_id,
  current_stock_beams, ordered_beams,
  expected_delivery_date, updated_at, updated_by
)

-- Historia zmian magazynu
warehouse_history (
  id, profile_id, color_id,
  calculated_stock, actual_stock, difference,
  recorded_at, recorded_by
)

-- Dostawy
deliveries (
  id, delivery_date, status,
  total_windows, total_glass, total_pallets, total_value
)

-- Zlecenia w dostawie
delivery_orders (delivery_id, order_id, position)

-- Palety
pallet_types (id, name, length_mm, width_mm, height_mm, max_weight_kg)

-- Reguły pakowania
packing_rules (id, name, is_active, rule_config)

-- Import plików
file_imports (
  id, filename, filepath, file_type,
  status, processed_at, error_message
)

-- Ustawienia
settings (key, value, updated_at)

-- Notatki
notes (id, order_id, content, created_at, created_by)

-- Archiwum (soft delete)
-- Wszystkie tabele mają kolumnę archived_at
```

---

## Struktura folderów projektu

```
akrobud/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/        # Strony logowania
│   │   │   ├── (dashboard)/   # Główny layout
│   │   │   │   ├── page.tsx   # Dashboard
│   │   │   │   ├── magazyn/   # Moduł magazynu
│   │   │   │   ├── dostawy/   # Moduł dostaw
│   │   │   │   ├── zestawienia/
│   │   │   │   ├── ustawienia/
│   │   │   │   └── archiwum/
│   │   │   └── api/           # API routes (proxy)
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui
│   │   │   ├── layout/        # Sidebar, Header
│   │   │   ├── magazyn/       # Komponenty magazynu
│   │   │   ├── dostawy/       # Komponenty dostaw
│   │   │   └── shared/        # Współdzielone
│   │   └── lib/               # Utilities, hooks
│   │
│   └── api/                    # Fastify backend
│       ├── src/
│       │   ├── routes/        # Endpointy API
│       │   ├── services/      # Logika biznesowa
│       │   │   ├── file-watcher/
│       │   │   ├── parsers/
│       │   │   ├── email/
│       │   │   └── pallet-optimizer/
│       │   ├── db/            # Prisma client
│       │   └── utils/
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── packages/
│   ├── shared/                # Współdzielone typy, utils
│   └── ui/                    # Współdzielone komponenty (opcjonalnie)
│
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## Mockupy UI (opis)

### 1. Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│  AKROBUD                                    🔔 Powiadomienia  👤 │
├────────┬────────────────────────────────────────────────────────┤
│        │                                                         │
│ 📊 Dashboard │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ 📦 Magazyn   │  │ Aktywne     │ │ Nadchodzące │ │ Braki       │ │
│ 🚚 Dostawy   │  │ zlecenia: 24│ │ dostawy: 3  │ │ materiałów:5│ │
│ 📋 Zestawienia│  └─────────────┘ └─────────────┘ └─────────────┘ │
│ ⚙️ Ustawienia│                                                   │
│ 📁 Archiwum  │  ┌─────────────────────────────────────────────┐ │
│              │  │         OCZEKUJĄCE IMPORTY                   │ │
│              │  │  📄 53520_uzyte_bele.csv    [Podgląd][Import]│ │
│              │  │  📄 D3309_1.12.pdf          [Podgląd][Import]│ │
│              │  └─────────────────────────────────────────────┘ │
│              │                                                   │
│              │  ┌─────────────────────────────────────────────┐ │
│              │  │         ALERTY                               │ │
│              │  │  ⚠️ Profil 9016 kolor 050 - brak za 5 dni   │ │
│              │  │  ⚠️ Profil 8866 kolor 730 - niski stan      │ │
│              │  └─────────────────────────────────────────────┘ │
└────────┴────────────────────────────────────────────────────────┘
```

### 2. Magazyn - Tabela zleceń
```
┌─────────────────────────────────────────────────────────────────┐
│  MAGAZYN > Tabela zleceń                                        │
├────────┬────────────────────────────────────────────────────────┤
│ KOLORY │                                                         │
│ ────── │  Kolor: 050 - kremowy                    [Filtruj ▼]   │
│ ■ 000  │  ┌───────────────────────────────────────────────────┐ │
│   biały│  │ Zlecenie │ 9016      │ 8866      │ 9671      │ ... │ │
│ ■ 050  │  │          │ bele │ m  │ bele │ m  │ bele │ m  │     │ │
│   kremowy│ │──────────┼──────────┼──────────┼──────────┼─────│ │
│ □ 730  │  │ 53368    │  4   │2.5 │  2   │4.0 │  0   │ 0  │     │ │
│   antracyt│ │ 53374    │  6   │1.0 │  3   │2.5 │  2   │3.5 │     │ │
│ □ 750  │  │ 53375    │  2   │5.5 │  0   │ 0  │  4   │1.0 │     │ │
│   biała f.│ │ 53495    │  8   │0.0 │  5   │3.0 │  1   │4.5 │     │ │
│ ────── │  │──────────┼──────────┼──────────┼──────────┼─────│ │
│ Typowe │  │ SUMA     │ 20   │9.0 │ 10   │9.5 │  7   │9.0 │     │ │
│ □ Wszyst.│ └───────────────────────────────────────────────────┘ │
│ □ 680  │                                                         │
│   nietypowe                                                      │
│        │                            [Eksport Excel] [Drukuj]    │
└────────┴────────────────────────────────────────────────────────┘
```

### 3. Magazyn - Tabela magazynowa
```
┌─────────────────────────────────────────────────────────────────┐
│  MAGAZYN > Stan magazynowy                    Kolor: 050        │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Profil │ Stan   │ Zapotrzeb. │ Po zapot. │ Zamówione │ Data │ │
│ │        │ magaz. │            │           │           │ dost.│ │
│ │────────┼────────┼────────────┼───────────┼───────────┼──────│ │
│ │ 9016   │ 50     │ 29         │ 21        │ 30        │17.11 │ │
│ │ 8866   │ 25     │ 19.5       │ 5.5       │ 20        │17.11 │ │
│ │ 8869   │ 30     │ 12         │ 18        │ -         │ -    │ │
│ │ 9671   │ 15 ⚠️  │ 16         │ -1 ❌     │ 20        │24.11 │ │
│ │ 9677   │ 40     │ 8          │ 32        │ -         │ -    │ │
│ │ 9315   │ 22     │ 10         │ 12        │ -         │ -    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Aktualizuj stan z natury]           Ostatnia aktualizacja:    │
│                                       2024-11-01 przez Jan K.   │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Dostawy - Kalendarz
```
┌─────────────────────────────────────────────────────────────────┐
│  DOSTAWY > Kalendarz                          [Tydzień][Miesiąc]│
├─────────────────────────────────────────────────────────────────┤
│     Pon 18.11  │  Wt 19.11  │  Śr 20.11  │  Czw 21.11  │ ...   │
│ ┌────────────┐│            │             │             │       │
│ │ 53368      ││            │             │             │       │
│ │ 53374      ││            │             │             │       │
│ │ 53375      ││            │             │             │       │
│ │ [+3 więcej]││            │             │             │       │
│ └────────────┘│            │             │             │       │
│               │            │ ┌─────────┐ │             │       │
│               │            │ │ 53495   │ │             │       │
│               │            │ │ 53496   │ │             │       │
│               │            │ └─────────┘ │             │       │
├─────────────────────────────────────────────────────────────────┤
│  ZLECENIA BEZ DATY (przeciągnij na kalendarz)                   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                    │
│  │ 53512  │ │ 53513  │ │ 53514  │ │ 53515  │                    │
│  └────────┘ └────────┘ └────────┘ └────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Optymalizacja palet - Wizualizacja
```
┌─────────────────────────────────────────────────────────────────┐
│  DOSTAWY > Optymalizacja palet          Dostawa: 18.11.2024     │
├─────────────────────────────────────────────────────────────────┤
│  Wynik: 4 palety (typ: EUR 120x80)                              │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ PALETA 1        │  │ PALETA 2        │                       │
│  │ ┌───┐ ┌───┐     │  │ ┌─────┐         │                       │
│  │ │ 1 │ │ 2 │     │  │ │  5  │ ┌───┐   │                       │
│  │ └───┘ └───┘     │  │ └─────┘ │ 6 │   │                       │
│  │ ┌───────┐ ┌──┐  │  │ ┌───┐   └───┘   │                       │
│  │ │   3   │ │4 │  │  │ │ 7 │ ┌─────┐   │                       │
│  │ └───────┘ └──┘  │  │ └───┘ │  8  │   │                       │
│  │ Wykorzystanie:  │  │       └─────┘   │                       │
│  │ 87%             │  │ Wykorzystanie:  │                       │
│  └─────────────────┘  │ 72%             │                       │
│                       └─────────────────┘                       │
│                                                                  │
│  [Wygeneruj protokół odbioru]  [Drukuj etykiety]                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Kolejne kroki

Po zatwierdzeniu tego planu:

1. **Inicjalizacja projektu** - utworzenie struktury folderów i konfiguracji
2. **Implementacja Fazy 1** - fundament aplikacji
3. **Iteracyjne dostarczanie** - każda faza kończy się działającym fragmentem

---

## Decyzje podjęte

| Aspekt | Decyzja |
|--------|---------|
| **Hosting** | Serwer firmowy |
| **Backup** | Co godzinę (automatyczny cron job) |
| **Język** | Polski (bez i18n) |
| **Mobile** | Nie wymagane (desktop-first)

---

*Dokument wygenerowany: 2024-11-26*
*Wersja: 1.0*
