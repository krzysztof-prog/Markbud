# AKROBUD - Szczegółowy Opis Systemu

## Spis treści

1. [Wprowadzenie](#1-wprowadzenie)
2. [Architektura systemu](#2-architektura-systemu)
3. [Moduły funkcjonalne](#3-moduły-funkcjonalne)
4. [Workflow pracy](#4-workflow-pracy)
5. [Baza danych](#5-baza-danych)
6. [Integracje zewnętrzne](#6-integracje-zewnętrzne)
7. [Role użytkowników](#7-role-użytkowników)
8. [API Endpoints](#8-api-endpoints)
9. [Import danych](#9-import-danych)
10. [Deployment](#10-deployment)

---

## 1. Wprowadzenie

### Czym jest AKROBUD?

**AKROBUD** to zintegrowany system ERP (Enterprise Resource Planning) zaprojektowany specjalnie dla firmy produkującej okna aluminiowe. System obsługuje cały cykl życia zlecenia produkcyjnego - od przyjęcia zamówienia, przez planowanie produkcji, zarządzanie magazynem, aż po realizację dostawy.

### Główne cele systemu

- **Automatyzacja importu danych** - automatyczne wczytywanie plików CSV z zapotrzebowaniem na profile i okucia
- **Zarządzanie magazynem** - śledzenie stanów magazynowych profili aluminiowych, okuć i stali
- **Planowanie dostaw** - kalendarz dostaw z optymalizacją pakowania palet
- **Integracja z dostawcami** - automatyczne pobieranie danych z systemu Schuco Connect
- **Raportowanie** - raporty miesięczne, zestawienia produkcyjne, eksport PDF/Excel

### Skala działania

| Parametr | Wartość |
|----------|---------|
| Użytkownicy jednoczesni | 5-10 |
| Zlecenia rocznie | 2000-3000 (~200-250/miesiąc) |
| Pozycje okuć na zlecenie | średnio 20 |
| Baza danych | SQLite (plikowa) |

---

## 2. Architektura systemu

### Diagram wysokiego poziomu

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AKROBUD System                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────┐              ┌────────────────┐                 │
│  │    Frontend    │   HTTP/WS    │    Backend     │                 │
│  │   (Next.js)    │ ◄──────────► │   (Fastify)    │                 │
│  │   Port 3000    │    REST      │   Port 3001    │                 │
│  └────────────────┘              └───────┬────────┘                 │
│          │                                │                           │
│          │                         ┌──────▼───────┐                  │
│          │                         │   Database   │                  │
│          │                         │   (SQLite)   │                  │
│          │                         └──────────────┘                  │
│          │                                                            │
│          │                     Systemy zewnętrzne:                   │
│          │                     • Schuco Connect (Puppeteer)          │
│          └───────────────────► • File Watcher (foldery sieciowe)    │
│                                • PDF Generation (PDFKit)             │
└─────────────────────────────────────────────────────────────────────┘
```

### Stack technologiczny

#### Backend (apps/api)
| Technologia | Wersja | Zastosowanie |
|-------------|--------|--------------|
| **Fastify** | 4.x | Framework HTTP (szybki, asynchroniczny) |
| **Prisma** | 5.x | ORM do SQLite |
| **Zod** | 3.x | Walidacja schematów wejściowych |
| **TypeScript** | 5.x | Strict mode dla bezpieczeństwa typów |
| **Puppeteer** | - | Scraping danych ze Schuco Connect |
| **PDFKit** | - | Generowanie dokumentów PDF |
| **Vitest** | 4.x | Testy jednostkowe |

#### Frontend (apps/web)
| Technologia | Wersja | Zastosowanie |
|-------------|--------|--------------|
| **Next.js** | 15.x | Framework React (App Router) |
| **React** | 19.x | Biblioteka UI |
| **React Query** | 5.x | Zarządzanie stanem serwera |
| **TailwindCSS** | 3.x | Stylizacja CSS |
| **Shadcn/ui** | - | Komponenty UI (Radix) |
| **TanStack Table** | 8.x | Tabele danych |
| **React Hook Form** | - | Formularze z walidacją |

### Wzorzec warstwowy (Backend)

```
HTTP Request / WebSocket
         ↓
   Routes (routing only)
         ↓
   Handlers (request handling, validation)
         ↓
   Services (business logic, transactions)
         ↓
   Repositories (data access)
         ↓
   Database (Prisma)
```

| Warstwa | Odpowiedzialność | Przykład pliku |
|---------|------------------|----------------|
| **Routes** | Definicja endpointów, OpenAPI | `routes/orders.ts` |
| **Handlers** | HTTP layer, walidacja Zod, response | `handlers/orderHandler.ts` |
| **Services** | Logika biznesowa, transakcje | `services/orderService.ts` |
| **Repositories** | Dostęp do bazy (Prisma queries) | `repositories/OrderRepository.ts` |

### Struktura katalogów

```
AKROBUD/
├── apps/
│   ├── api/                    # Backend Fastify
│   │   ├── src/
│   │   │   ├── routes/         # Endpointy API (37 plików)
│   │   │   ├── handlers/       # Obsługa HTTP
│   │   │   ├── services/       # Logika biznesowa
│   │   │   ├── repositories/   # Dostęp do bazy
│   │   │   ├── validators/     # Zod schemas
│   │   │   ├── plugins/        # Fastify plugins (WebSocket, auth)
│   │   │   └── utils/          # money.ts, logger, errors
│   │   └── prisma/
│   │       ├── schema.prisma   # 84 modele
│   │       └── migrations/     # Migracje bazy
│   │
│   └── web/                    # Frontend Next.js
│       └── src/
│           ├── app/            # Strony (App Router, 47 stron)
│           ├── features/       # Moduły funkcjonalne
│           ├── components/     # UI components (Shadcn/ui)
│           └── lib/            # Utils, API client
│
├── packages/
│   └── shared/                 # Współdzielone typy TypeScript
│
└── docs/                       # Dokumentacja
```

---

## 3. Moduły funkcjonalne

### 3.1. Dashboard (Strona główna)

**Lokalizacja:** `/` (po zalogowaniu)

**Funkcje:**
- Przegląd aktualnego stanu systemu
- Alerty i powiadomienia (brakujące dane, problemy)
- Oczekujące importy do zatwierdzenia
- Skróty do najczęściej używanych funkcji
- Widok dla różnych ról (operator, kierownik, admin)

### 3.2. Zlecenia (Orders)

**Lokalizacja:** `/zestawienia/zlecenia`

**Funkcje:**
- Lista wszystkich zleceń produkcyjnych
- Filtrowanie po statusie, dacie, kliencie
- Szczegóły zlecenia (okna, profile, okucia, szyby)
- Edycja metadanych zlecenia
- Statusy manualne: "NIE CIĄĆ", "Anulowane", "Wstrzymane"

**Statusy zlecenia:**
```
new → in_progress → ready → shipped → delivered
                 ↓
              cancelled
```

**Dane zlecenia:**
- Numer zlecenia (unikalny, np. `53529`, `53529A`, `53529B`)
- Klient, Projekt, System profilowy
- Termin realizacji, Data dostawy PVC
- Wartość PLN/EUR (w groszach!)
- Zapotrzebowanie na profile (OrderRequirement)
- Lista okien (OrderWindow)
- Lista szyb (OrderGlass)
- Materiałówka (OrderMaterial)

### 3.3. Dostawy (Deliveries)

**Lokalizacja:** `/dostawy`

**Funkcje:**
- Kalendarz dostaw z widokiem miesięcznym
- Drag & drop zleceń między dniami
- Tworzenie/edycja dostaw
- Optymalizacja pakowania palet
- Eksport PDF z planem pakowania
- Status gotowości dostawy (ready/conditional/blocked)

**Statusy dostawy:**
```
planned → loading → shipped → delivered
```

**Optymalizacja palet:**
1. Pobierz zlecenia z dostawy
2. Pobierz typy palet (4000, 3500, 3000, 2400mm)
3. Sortuj okna malejąco wg szerokości
4. Dla każdego okna znajdź optymalną paletę
5. Jeśli brak miejsca - utwórz nową paletę
6. Oblicz wykorzystanie przestrzeni
7. Generuj PDF z wizualizacją

### 3.4. Magazyn Profili (Warehouse)

**Lokalizacja:** `/magazyn/akrobud`

**Funkcje:**
- Stan magazynowy profili aluminiowych
- Zarządzanie kolorami (typowe + prywatne)
- Historia zmian stanów
- Zamówienia magazynowe
- Remanent (inwentaryzacja)
- Widok "Profile na dostawy"

**Logika stanów:**
- `currentStockBeams` - aktualny stan w belach (sztangach 6m)
- `initialStockBeams` - stan początkowy (z remanentu)
- Zapotrzebowanie obliczane z `OrderRequirement`
- Brakujące = Zapotrzebowanie - Stan

### 3.5. Magazyn Okuć (Okuc)

**Lokalizacja:** `/magazyn/okuc`

**Funkcje:**
- Stan magazynowy okuć (artykuły Schuco)
- Zapotrzebowanie z zleceń (`OkucDemand`)
- Zamówienia okuć (`OkucOrder`)
- Remanent okuć
- Dokumenty RW (rozchód wewnętrzny)
- Zastępstwa artykułów

**Workflow zapotrzebowania:**
1. Import pliku `uzyte_bele_okuc` z zapotrzebowaniem
2. System parsuje i zapisuje `OkucDemand`
3. Zestawienie zapotrzebowania vs stan magazynowy
4. Generowanie zamówienia na braki

### 3.6. Magazyn Stali (Steel)

**Lokalizacja:** `/magazyn/stal`

**Funkcje:**
- Stan magazynowy stali zbrojeniowej
- Zamówienia stali
- Historia zmian

### 3.7. Magazyn PVC

**Lokalizacja:** `/magazyn/pvc`

**Funkcje:**
- Stan magazynowy profili PVC
- Zapotrzebowanie na PVC

### 3.8. Dostawy Schuco

**Lokalizacja:** `/magazyn/dostawy-schuco`

**Funkcje:**
- Automatyczne pobieranie danych z Schuco Connect
- Lista zamówień Schuco z ostatnich 6 miesięcy
- Status dostawy, numer zamówienia, wartość
- Powiązanie ze zleceniami produkcyjnymi

**Jak działa scraper:**
1. Puppeteer uruchamia przeglądarkę headless
2. Loguje się do Schuco Connect
3. Nawiguje do strony zamówień
4. Filtruje po dacie (ostatnie 6 miesięcy)
5. Pobiera plik CSV
6. Parser parsuje dane i zapisuje do bazy

### 3.9. Szyby (Glass)

**Lokalizacja:** `/szyby`, `/zamowienia-szyb`, `/dostawy-szyb`

**Funkcje:**
- Zamówienia szyb (`GlassOrder`)
- Pozycje zamówień (`GlassOrderItem`)
- Dostawy szyb (`GlassDelivery`)
- Import zamówień z PDF
- Powiązanie szyb ze zleceniami
- Kategorie szyb
- Statystyki zamówień

**Statusy zamówienia szyb:**
```
not_ordered → ordered → partially_delivered → delivered
```

### 3.10. Import danych

**Lokalizacja:** `/importy`

**Funkcje:**
- Automatyczny File Watcher na folderach sieciowych
- Parsowanie plików CSV (uzyte_bele, ceny, okuc)
- Podgląd przed zatwierdzeniem importu
- Raportowanie błędów (które wiersze się nie zaimportowały)
- Historia importów

**Monitorowane foldery:**
| Folder | Typ danych |
|--------|------------|
| `uzyte_bele/` | Zapotrzebowanie na profile |
| `uzyte_bele_prywatne/` | Profile w kolorach prywatnych |
| `ceny/` | Cennik i wartości zleceń |
| `okuc_zapotrzebowanie/` | Zapotrzebowanie na okucia |
| `dostawy_szyb/` | Dostawy szyb (PDF) |

### 3.11. Zestawienia i Raporty

**Lokalizacja:** `/zestawienia`

**Funkcje:**
- Raporty miesięczne produkcji
- Zestawienia zleceń (filtry, grupowanie)
- Eksport do Excel/PDF
- Archiwum raportów

### 3.12. Logistyka

**Lokalizacja:** `/logistyka`

**Funkcje:**
- Parser maili logistycznych
- Listy projektów do dostaw
- Powiązanie z dostawami
- Wersjonowanie zmian

### 3.13. Kontrola Etykiet

**Lokalizacja:** `/kontrola-etykiet`

**Funkcje:**
- Weryfikacja etykiet na zleceniach
- Skanowanie kodów
- Raportowanie niezgodności

### 3.14. Planowanie Produkcji

**Lokalizacja:** `/planowanie-produkcji`

**Funkcje:**
- Harmonogram produkcji
- Przydzielanie zleceń do dni
- Optymalizacja kolejności

### 3.15. Moja Praca

**Lokalizacja:** `/moja-praca`

**Funkcje:**
- Widok operatora - zadania na dziś
- Ewidencja czasu pracy
- Karty pracy

### 3.16. Panel Kierownika

**Lokalizacja:** `/kierownik`

**Funkcje:**
- Dashboard kierownika produkcji
- Przegląd postępów
- Zarządzanie zespołem

### 3.17. Panel Administratora

**Lokalizacja:** `/admin`

**Funkcje:**
- Zarządzanie użytkownikami (`/admin/users`)
- Kolory prywatne (`/admin/private-colors`)
- Ustawienia systemu (`/admin/settings`)
- Zgłoszenia błędów (`/admin/bug-reports`)
- Health check (`/admin/health`)
- Pending prices (`/admin/pending-prices`)

---

## 4. Workflow pracy

### 4.1. Główny przepływ zlecenia

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   IMPORT     │    │  PRODUKCJA   │    │   PAKOWANIE  │    │   DOSTAWA    │
│  CSV/PDF     │───►│  planowanie  │───►│  optymalizacja│───►│  realizacja  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  - uzyte_bele       - przydziel       - optymalizuj        - załadunek
  - ceny               do dnia           palety            - wysyłka
  - okuc             - sprawdź         - generuj PDF       - potwierdzenie
                       materiały
```

### 4.2. Dzienny workflow operatora

1. **Rano:**
   - Logowanie do systemu
   - Sprawdzenie "Moja Praca" - zadania na dziś
   - Sprawdzenie alertów na dashboardzie

2. **W ciągu dnia:**
   - Realizacja zleceń wg harmonogramu
   - Aktualizacja statusów
   - Zgłaszanie problemów

3. **Na koniec dnia:**
   - Podsumowanie wykonanej pracy
   - Przygotowanie na kolejny dzień

### 4.3. Workflow importu danych

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   UPLOAD    │    │   PREVIEW   │    │   APPROVE   │    │  COMPLETED  │
│   (File     │───►│  (podgląd   │───►│  (zatwierdzenie│─►│  (dane w    │
│   Watcher)  │    │   danych)   │    │   importu)  │    │   bazie)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
   Status:              Status:             Status:            Status:
   pending              preview            processing         completed
                                               │
                                               ▼
                                           (error - jeśli błąd)
```

### 4.4. Workflow dostawy

1. **Planowanie:**
   - Utworzenie dostawy w kalendarzu
   - Przypisanie zleceń (drag & drop)
   - Sprawdzenie gotowości

2. **Optymalizacja:**
   - Uruchomienie algorytmu pakowania
   - Podgląd wizualizacji palet
   - Ewentualne ręczne korekty
   - Eksport PDF

3. **Realizacja:**
   - Zmiana statusu na "loading"
   - Załadunek wg planu
   - Kontrola etykiet
   - Wysyłka → "shipped"
   - Potwierdzenie dostawy → "delivered"

---

## 5. Baza danych

### Przegląd modeli (84 tabele)

#### Użytkownicy i autoryzacja
| Model | Opis |
|-------|------|
| `User` | Użytkownicy systemu (29 pól) |
| `DocumentAuthorMapping` | Mapowanie autorów z CSV na użytkowników |

#### Profile i kolory
| Model | Opis |
|-------|------|
| `Profile` | Definicje profili aluminiowych (22 pola) |
| `Color` | Kolory standardowe (13 pól) |
| `PrivateColor` | Kolory prywatne (zewnętrzne) |
| `ProfileColor` | Powiązanie profil-kolor |

#### Zlecenia
| Model | Opis |
|-------|------|
| `Order` | Zlecenia produkcyjne (52 pola!) |
| `OrderRequirement` | Zapotrzebowanie na profile |
| `OrderWindow` | Lista okien zlecenia |
| `OrderGlass` | Lista szyb zlecenia |
| `OrderMaterial` | Materiałówka (koszty) |

#### Dostawy
| Model | Opis |
|-------|------|
| `Delivery` | Dostawy do klientów |
| `DeliveryOrder` | Powiązanie dostawa-zlecenie |
| `DeliveryItem` | Pozycje dostawy |
| `DeliveryReadiness` | Status gotowości dostawy |

#### Magazyn profili
| Model | Opis |
|-------|------|
| `WarehouseStock` | Stan magazynowy |
| `WarehouseOrder` | Zamówienia magazynowe |
| `WarehouseHistory` | Historia zmian |

#### Magazyn okuć
| Model | Opis |
|-------|------|
| `OkucArticle` | Artykuły Schuco |
| `OkucStock` | Stan magazynowy okuć |
| `OkucDemand` | Zapotrzebowanie na okucia |
| `OkucOrder` | Zamówienia okuć |
| `OkucHistory` | Historia zmian |
| `OkucSubstitute` | Zastępstwa artykułów |

#### Szyby
| Model | Opis |
|-------|------|
| `GlassOrder` | Zamówienia szyb |
| `GlassOrderItem` | Pozycje zamówień |
| `GlassDelivery` | Dostawy szyb |
| `GlassCategory` | Kategorie szyb |

#### Schuco
| Model | Opis |
|-------|------|
| `SchucoDelivery` | Dostawy ze Schuco Connect |
| `SchucoItem` | Pozycje zamówień Schuco |
| `OrderSchucoLink` | Powiązanie zlecenie-Schuco |

#### Palety
| Model | Opis |
|-------|------|
| `PalletType` | Typy palet (4000, 3500, 3000, 2400mm) |
| `PalletOptimization` | Wynik optymalizacji |
| `PalletAssignment` | Przypisanie okien do palet |
| `ProfileDepth` | Głębokość profili (do pakowania) |

#### Raporty
| Model | Opis |
|-------|------|
| `MonthlyReport` | Raporty miesięczne |
| `MonthlyReportItem` | Pozycje raportów |
| `ProductionReport` | Raporty produkcyjne |

#### Inne
| Model | Opis |
|-------|------|
| `Note` | Notatki do zleceń |
| `ImportLock` | Blokady importu |
| `Settings` | Ustawienia systemu |
| `WorkingDay` | Dni robocze |
| `LogisticsMailList` | Listy mailowe logistyki |

### Kluczowe relacje

```
Order (1) ──────────────┬──── (N) OrderRequirement
                        ├──── (N) OrderWindow
                        ├──── (N) OrderGlass
                        ├──── (N) OrderMaterial
                        ├──── (N) OkucDemand
                        └──── (N) DeliveryOrder ──── (N) Delivery

Profile (1) ────────────┬──── (N) ProfileColor ──── (N) Color
                        └──── (N) WarehouseStock

Delivery (1) ───────────┬──── (N) DeliveryOrder
                        ├──── (N) DeliveryItem
                        ├──── (1) DeliveryReadiness
                        └──── (1) PalletOptimization
```

### Konwencje bazy danych

1. **Soft delete** - `deletedAt` zamiast fizycznego usuwania
2. **Timestamps** - `createdAt`, `updatedAt` na każdej tabeli
3. **Wartości pieniężne** - w GROSZACH (integer), nie float!
4. **Indeksy** - na wszystkich FK i często filtrowanych polach
5. **Optimistic locking** - pole `version` dla magazynu

---

## 6. Integracje zewnętrzne

### 6.1. Schuco Connect (Puppeteer)

**Cel:** Automatyczne pobieranie danych o zamówieniach ze strony Schuco.

**Konfiguracja (.env):**
```env
SCHUCO_EMAIL=email@firma.pl
SCHUCO_PASSWORD=haslo
SCHUCO_BASE_URL=https://connect.schueco.com/schueco/pl/
SCHUCO_HEADLESS=true
```

**Przepływ:**
1. Puppeteer uruchamia Chrome w trybie headless
2. Loguje się do panelu Schuco
3. Nawiguje do listy zamówień
4. Ustawia filtr dat (ostatnie 6 miesięcy)
5. Pobiera CSV klikając przycisk eksportu
6. Parser parsuje CSV i zapisuje do bazy (upsert)

**Endpoint:** `POST /api/schuco/refresh`

### 6.2. File Watcher (Foldery sieciowe)

**Cel:** Automatyczne wykrywanie nowych plików CSV/PDF do importu.

**Monitorowane lokalizacje (PROD):**
```
//192.168.1.6/Public/Markbud_import/uzyte_bele/
//192.168.1.6/Public/Markbud_import/uzyte_bele_prywatne/
//192.168.1.6/Public/Markbud_import/ceny/
//192.168.1.6/Public/Markbud_import/okuc_zapotrzebowanie/
```

**Przepływ:**
1. File Watcher monitoruje foldery co kilka sekund
2. Wykrywa nowy plik → tworzy rekord w bazie ze statusem `pending`
3. Użytkownik widzi alert na dashboardzie
4. Po zatwierdzeniu → parser przetwarza plik
5. Dane zapisywane do odpowiednich tabel

### 6.3. PDF Generation (PDFKit)

**Cel:** Generowanie dokumentów PDF (plany pakowania, protokoły).

**Użycie:**
- Eksport planu pakowania palet
- Protokoły odbioru dostaw
- Raporty produkcyjne

**Endpoint:** `GET /api/pallets/export/:deliveryId`

### 6.4. WebSocket (Real-time)

**Cel:** Powiadomienia w czasie rzeczywistym.

**Użycie:**
- Alerty o nowych importach
- Aktualizacje statusów
- Powiadomienia dla operatorów

---

## 7. Role użytkowników

### Dostępne role

| Rola | Opis | Dostęp |
|------|------|--------|
| `owner` | Właściciel | Pełny dostęp |
| `admin` | Administrator | Panel admin, użytkownicy, ustawienia |
| `kierownik` | Kierownik produkcji | Dashboard kierownika, raporty |
| `ksiegowa` | Księgowa | Zestawienia, raporty finansowe |
| `user` | Operator | Moja praca, podstawowe funkcje |

### Matryca uprawnień

| Funkcja | owner | admin | kierownik | ksiegowa | user |
|---------|:-----:|:-----:|:---------:|:--------:|:----:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Zlecenia (view) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Zlecenia (edit) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Dostawy | ✅ | ✅ | ✅ | ❌ | ❌ |
| Magazyn | ✅ | ✅ | ✅ | ❌ | ✅ |
| Import danych | ✅ | ✅ | ✅ | ❌ | ❌ |
| Raporty | ✅ | ✅ | ✅ | ✅ | ❌ |
| Panel admin | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ustawienia | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 8. API Endpoints

### Przegląd (37 plików routes)

#### Zlecenia (Orders)
```
GET    /api/orders                    # Lista zleceń
GET    /api/orders/:id                # Szczegóły zlecenia
GET    /api/orders/by-number/:number  # Zlecenie po numerze
PUT    /api/orders/:id                # Aktualizacja
DELETE /api/orders/:id                # Usunięcie (soft delete)
PATCH  /api/orders/:id/manual-status  # Ustaw status ręczny
```

#### Dostawy (Deliveries)
```
GET    /api/deliveries                # Lista dostaw
GET    /api/deliveries/:id            # Szczegóły
GET    /api/deliveries/calendar       # Widok kalendarza
POST   /api/deliveries                # Nowa dostawa
PUT    /api/deliveries/:id            # Aktualizacja
DELETE /api/deliveries/:id            # Usunięcie
POST   /api/deliveries/:id/orders     # Dodaj zlecenie do dostawy
DELETE /api/deliveries/:id/orders/:orderId  # Usuń zlecenie
GET    /api/deliveries/:id/protocol   # Protokół odbioru
```

#### Palety
```
POST   /api/pallets/optimize/:deliveryId     # Uruchom optymalizację
GET    /api/pallets/optimization/:deliveryId # Pobierz wynik
DELETE /api/pallets/optimization/:deliveryId # Usuń optymalizację
GET    /api/pallets/export/:deliveryId       # Eksport PDF
```

#### Magazyn
```
GET    /api/warehouse/stock           # Stan magazynowy
PUT    /api/warehouse/stock/:id       # Aktualizacja stanu
GET    /api/warehouse/history         # Historia zmian
GET    /api/warehouse-orders          # Zamówienia magazynowe
POST   /api/warehouse-orders          # Nowe zamówienie
```

#### Schuco
```
GET    /api/schuco/deliveries         # Lista dostaw Schuco
POST   /api/schuco/refresh            # Odśwież dane
GET    /api/schuco/status             # Status ostatniego pobrania
GET    /api/schuco/items              # Pozycje zamówień
```

#### Import
```
GET    /api/imports                   # Historia importów
POST   /api/imports/upload            # Upload pliku
GET    /api/imports/:id/preview       # Podgląd
POST   /api/imports/:id/approve       # Zatwierdzenie
DELETE /api/imports/:id               # Usuń import
```

#### Szyby (Glass)
```
GET    /api/glass-orders              # Zamówienia szyb
POST   /api/glass-orders              # Nowe zamówienie
GET    /api/glass-deliveries          # Dostawy szyb
POST   /api/glass-deliveries          # Nowa dostawa
```

#### Okucia (Okuc)
```
GET    /api/okuc/articles             # Artykuły
GET    /api/okuc/stock                # Stan magazynowy
GET    /api/okuc/demand               # Zapotrzebowanie
POST   /api/okuc/orders               # Zamówienia
```

#### Inne
```
POST   /api/auth/login                # Logowanie
POST   /api/auth/logout               # Wylogowanie
GET    /api/auth/me                   # Aktualny użytkownik
GET    /api/dashboard                 # Dane dashboardu
GET    /api/profiles                  # Profile aluminiowe
GET    /api/colors                    # Kolory
GET    /api/health                    # Health check
```

---

## 9. Import danych

### Format CSV - uzyte_bele (zapotrzebowanie na profile)

```csv
Klient: ABC Corporation; Projekt: Proj-2024-001; System: Profil 70; Termin realizacji: 2025-12-31
Numer zlecenia;Numer art.;Nowych bel;reszta
53529;18866000;5;3317
53529;19016000;2;3860

Lista okien i drzwi:
Lp.;Szerokosc;Wysokosc;Typ profilu;Ilosc sztuk;Referencja
1;3008;1185;BLOK;1;D4190
2;1500;2100;LIVING;2;O4191
```

### Format numeru artykułu

```
19016050
│ │    │
│ │    └── 050 = numer koloru (kremowy)
│ └─────── 9016 = numer profilu
└───────── 1 = prefix (ignorowany)
```

### Logika przeliczania bel

Dane z CSV: `5 bel, reszta 3317mm`

1. Zaokrąglenie reszty do 500mm: `3317 → 3500mm`
2. Odjęcie 1 beli (bo jest reszta): `5 - 1 = 4 bele`
3. Obliczenie metrów z reszty: `(6000 - 3500) / 1000 = 2.5m`

**Wynik:** `beamsCount=4, meters=2.5`

### Kolory standardowe

| Kod | Nazwa |
|-----|-------|
| 000 | Biały |
| 050 | Kremowy |
| 730 | Antracyt |
| 750 | Biała folia |
| 148 | Krem folia |
| 830 | Granat |
| 890 | Jodłowy |

---

## 10. Deployment

### Środowiska

| Aspekt | DEV | PROD |
|--------|-----|------|
| Lokalizacja | Komputer deweloperski | Serwer Windows w biurze |
| Port API | 3001 | 5000 |
| Port Web | 3000 | 5001 |
| Baza danych | `dev.db` | `prod.db` |
| PM2 | Nie | Tak (Windows Service) |
| Foldery | Lokalne (`C:\DEV_DATA\*`) | Sieciowe (`//192.168.1.6/...`) |

### Komendy

```powershell
# Development
pnpm dev              # Backend + Frontend
pnpm dev:api          # Tylko API
pnpm dev:web          # Tylko frontend

# Database
pnpm db:migrate       # Migracje (ZAWSZE używaj tego!)
pnpm db:generate      # Generuj Prisma Client
pnpm db:studio        # GUI do bazy

# Build
pnpm build            # Build całego projektu

# Production (na serwerze)
pm2 start ecosystem.config.js
pm2 save
```

### Zmienne środowiskowe (.env)

```env
# Backend
DATABASE_URL="file:./prisma/dev.db"
PORT=3001
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000

# Schuco
SCHUCO_EMAIL=email@firma.pl
SCHUCO_PASSWORD=haslo
SCHUCO_HEADLESS=true

# File Watcher (DEV - lokalne)
WATCH_FOLDER_UZYTE_BELE=C:/DEV_DATA/uzyte_bele
WATCH_FOLDER_CENY=C:/DEV_DATA/ceny

# File Watcher (PROD - sieciowe)
# WATCH_FOLDER_UZYTE_BELE=//192.168.1.6/Public/Markbud_import/uzyte_bele
```

---

## Podsumowanie

AKROBUD to kompleksowy system ERP dla producenta okien aluminiowych, który:

1. **Automatyzuje import danych** z plików CSV/PDF przez File Watcher
2. **Integruje się z dostawcami** (Schuco Connect) przez Puppeteer scraper
3. **Zarządza magazynem** profili, okuć i stali z pełną historią zmian
4. **Planuje dostawy** z optymalizacją pakowania palet
5. **Generuje raporty** produkcyjne i finansowe
6. **Obsługuje różne role** (operator, kierownik, admin)

System wykorzystuje nowoczesny stack (Next.js + Fastify + Prisma) z architekturą warstwową i jest zoptymalizowany dla skali małego/średniego przedsiębiorstwa.

---

**Wersja dokumentu:** 1.0.0
**Data utworzenia:** 2026-02-02
**Autor:** Claude Code (Anthropic)
