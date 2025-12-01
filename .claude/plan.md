# Plan implementacji: Strona "Dostawy Schuco"

## 1. Podsumowanie wymagań

### Funkcjonalność
- Nowa strona w sekcji "Magazyn" → "Dostawy Schuco"
- Automatyczne logowanie i pobieranie pliku CSV ze strony Schuco
- Wyświetlanie 50 najnowszych wierszy z pliku CSV
- Wyświetlanie tylko wybranych kolumn: 1, 2, 4, 5, 6, 10, 11

### Techniczne wymagania
- **URL logowania**: https://connect.schueco.com/schueco/pl/
- **Credentials**: krzysztof@markbud.pl / Markbud2020
- **URL zamówień**: https://connect.schueco.com/schueco/pl/purchaseOrders/orders?filters=createdLocalDate,GREATER_THAN,{DATA_6_MIESIECY_WSTECZ}&sort=code,false&view=default
- **Element pobierania**: `/html/body/app-root/cx-storefront/main/cx-page-layout/cx-page-slot[2]/sc-orders-orders/div/sco-orders-orders-orders/sco-content-table/sco-content-table-head-action-bar/div/div[2]/div[3]`
- Element jest ukryty pod obrazkiem, wymaga użycia JavaScript do kliknięcia

## 2. Analiza architektury projektu

### Obecna struktura
```
apps/
├── api/ (Fastify backend)
│   ├── src/
│   │   ├── routes/          # Endpointy API
│   │   ├── handlers/        # Obsługa requestów
│   │   ├── services/        # Logika biznesowa
│   │   ├── repositories/    # Dostęp do bazy danych
│   │   └── validators/      # Walidacja Zod
│   └── package.json
└── web/ (Next.js frontend)
    ├── src/
    │   ├── app/             # Strony Next.js
    │   ├── components/      # Komponenty React
    │   └── lib/             # Utilities i API client
    └── package.json
```

### Podobne implementacje w projekcie
1. **Dostawy** (`/dostawy/page.tsx`) - kalendarz z dostawami, drag & drop, dialog z szczegółami
2. **Magazyn Akrobud** (`/magazyn/akrobud/page.tsx`) - sidebar z kolorami, tabela zleceń, stan magazynowy
3. **CSV Parser** (`apps/api/src/services/parsers/csv-parser.ts`) - parsowanie plików CSV z file system

## 3. Wyzwania techniczne

### Problem: Web Scraping i automatyzacja przeglądarki

**Opcje rozwiązania:**

#### Opcja A: Puppeteer (REKOMENDOWANA)
**Zalety:**
- Headless Chrome, pełna obsługa JavaScript
- Może obsłużyć dynamiczne aplikacje SPA (Angular/React)
- Łatwa automatyzacja logowania i klikania elementów
- Duża społeczność i dokumentacja

**Wady:**
- Wymaga Chrome/Chromium na serwerze
- Większe zużycie zasobów
- Wolniejsze niż proste HTTP requesty

#### Opcja B: Playwright
**Zalety:**
- Podobne do Puppeteer, ale lepsze API
- Obsługa wielu przeglądarek
- Lepsze narzędzia debugowania

**Wady:**
- Większa biblioteka
- Podobne wymagania zasobów jak Puppeteer

#### Opcja C: Axios + Cheerio (NIE ZALECANE dla tego przypadku)
**Zalety:**
- Lekkie i szybkie
- Proste HTTP requesty

**Wady:**
- **Nie obsługuje JavaScript** - strona Schuco to prawdopodobnie SPA
- Nie może obsłużyć dynamicznego ładowania
- Trudne zarządzanie sesjami i cookies

### Rekomendacja: **Puppeteer**
Ze względu na:
1. Strona Schuco używa JavaScript (Angular/React/Vue)
2. Potrzeba symulacji logowania przez formularz
3. Element do pobrania jest ukryty (wymaga JS)
4. Projekt już używa podobnych narzędzi (pdf-parse)

## 4. Architektura rozwiązania

### Backend (API)

```
apps/api/src/
├── services/
│   └── schuco/
│       ├── schucoScraper.ts         # Puppeteer scraper
│       ├── schucoParser.ts          # Parser CSV Schuco
│       └── schucoService.ts         # Logika biznesowa
├── handlers/
│   └── schucoHandler.ts             # HTTP request handlers
├── routes/
│   └── schuco.ts                    # Routing
└── validators/
    └── schuco.ts                    # Walidacja Zod
```

### Frontend (Web)

```
apps/web/src/
├── app/
│   └── magazyn/
│       └── dostawy-schuco/
│           └── page.tsx             # Główna strona
├── components/
│   └── schuco/
│       ├── SchucoTable.tsx          # Tabela z danymi CSV
│       └── SchucoRefreshButton.tsx  # Przycisk odświeżania
└── lib/
    └── api.ts                       # Dodać schucoApi
```

### Database Schema

```prisma
model SchucoDelivery {
  id              Int       @id @default(autoincrement())
  orderCode       String    // Kolumna 1
  supplierCode    String    // Kolumna 2
  orderDate       DateTime  // Kolumna 4
  deliveryDate    DateTime? // Kolumna 5
  status          String    // Kolumna 6
  quantity        Float     // Kolumna 10
  value           Float     // Kolumna 11
  rawData         Json      // Cały wiersz jako backup
  fetchedAt       DateTime  @default(now())
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([fetchedAt])
  @@index([orderCode])
}

model SchucoFetchLog {
  id              Int       @id @default(autoincrement())
  status          String    // 'success' | 'error'
  recordsCount    Int?
  errorMessage    String?
  startedAt       DateTime  @default(now())
  completedAt     DateTime?
  duration        Int?      // w sekundach

  @@index([startedAt])
}
```

## 5. Szczegółowy plan implementacji

### Faza 1: Backend Setup (API)

#### 1.1. Instalacja zależności
```bash
cd apps/api
pnpm add puppeteer
pnpm add -D @types/puppeteer
```

#### 1.2. Utworzenie Puppeteer Scraper (`schucoScraper.ts`)
**Funkcje:**
- `login()` - logowanie na stronę Schuco
- `navigateToOrders(fromDate)` - przejście do strony zamówień z filtrem dat
- `downloadCSV()` - kliknięcie elementu pobierania i pobranie pliku
- `scrapeDeliveries()` - główna funkcja orkiestrująca

**Szczegóły techniczne:**
- Headless: true (dla produkcji), false (dla debugowania)
- Timeout: 60 sekund
- User-Agent: prawdziwa przeglądarka
- Screenshots dla debugowania
- Obsługa błędów i retry logic

#### 1.3. Parser CSV (`schucoParser.ts`)
**Funkcje:**
- `parseSchucoCSV(filePath)` - parsowanie pliku CSV
- Mapowanie kolumn na odpowiednie pola
- Walidacja danych
- Transformacja dat

#### 1.4. Service Layer (`schucoService.ts`)
**Funkcje:**
- `fetchAndStoreDeliveries()` - pobranie i zapisanie do bazy
- `getRecentDeliveries(limit)` - pobranie ostatnich N rekordów
- `getFetchLogs()` - historia pobierania
- Obsługa duplikatów (upsert based on orderCode)

#### 1.5. Handler (`schucoHandler.ts`)
**Endpointy:**
- `GET /api/schuco/deliveries?limit=50` - pobranie dostaw z bazy
- `POST /api/schuco/refresh` - trigger ręcznego odświeżenia
- `GET /api/schuco/status` - status ostatniego fetch'a
- `GET /api/schuco/logs` - historia pobierania

#### 1.6. Routes (`schuco.ts`)
Routing Fastify z walidacją Zod

#### 1.7. Validators (`schuco.ts`)
Schematy Zod dla request/response

### Faza 2: Database Migration

#### 2.1. Utworzenie migracji Prisma
```bash
cd apps/api
npx prisma migrate dev --name add_schuco_deliveries
```

#### 2.2. Aktualizacja `schema.prisma`
Dodanie modeli SchucoDelivery i SchucoFetchLog

### Faza 3: Frontend Implementation

#### 3.1. Sidebar Update
**Plik**: `apps/web/src/components/layout/sidebar.tsx`
- Dodać nową pozycję "Dostawy Schuco" do submenu "Magazyn"
- Icon: Truck (z lucide-react)

#### 3.2. Strona główna
**Plik**: `apps/web/src/app/magazyn/dostawy-schuco/page.tsx`
**Komponenty:**
- Header z breadcrumbs
- Przycisk "Odśwież dane" (trigger POST /api/schuco/refresh)
- Loader podczas pobierania
- Tabela z danymi (SchucoTable)
- Status ostatniego pobrania
- Error handling

#### 3.3. Tabela SchucoTable
**Plik**: `apps/web/src/components/schuco/SchucoTable.tsx`
**Kolumny:**
1. Numer zamówienia (kolumna 1)
2. Kod dostawcy (kolumna 2)
3. Data zamówienia (kolumna 4)
4. Data dostawy (kolumna 5)
5. Status (kolumna 6)
6. Ilość (kolumna 10)
7. Wartość (kolumna 11)

**Funkcje:**
- Sortowanie po kolumnach
- Paginacja (jeśli > 50 wierszy)
- Mobile responsive
- Loading skeleton
- Empty state

#### 3.4. API Client
**Plik**: `apps/web/src/lib/api.ts`
```typescript
export const schucoApi = {
  getDeliveries: (limit?: number) =>
    fetchApi<SchucoDelivery[]>(`/api/schuco/deliveries${limit ? `?limit=${limit}` : ''}`),
  refresh: () =>
    fetchApi<void>('/api/schuco/refresh', { method: 'POST' }),
  getStatus: () =>
    fetchApi<SchucoFetchLog>('/api/schuco/status'),
};
```

### Faza 4: Harmonogram i automatyzacja

#### 4.1. Cron Job (opcjonalnie)
**Plik**: `apps/api/src/services/schuco/schucoScheduler.ts`
- Automatyczne pobieranie co 6 godzin / raz dziennie
- Używając node-cron lub podobnego

#### 4.2. Environment Variables
**Plik**: `apps/api/.env`
```
SCHUCO_EMAIL=krzysztof@markbud.pl
SCHUCO_PASSWORD=Markbud2020
SCHUCO_BASE_URL=https://connect.schueco.com/schueco/pl/
SCHUCO_HEADLESS=true
SCHUCO_DOWNLOAD_PATH=/tmp/schuco-downloads
```

### Faza 5: Testing & Error Handling

#### 5.1. Backend Tests
- Unit testy dla parsera
- Integration testy dla scrapera (mock Puppeteer)
- E2E test dla całego flow

#### 5.2. Error Scenarios
- Login failures (złe credentials)
- Timeouts
- Network errors
- Nieprawidłowa struktura CSV
- Element nie znaleziony na stronie

#### 5.3. Logging
- Winston logger dla wszystkich operacji
- Szczegółowe logi dla debugowania scraper'a
- Error tracking (Sentry/podobne - opcjonalnie)

### Faza 6: Security & Best Practices

#### 6.1. Security
- Credentials w .env (NIGDY w kodzie)
- Rate limiting dla endpoint'a refresh
- Validation wszystkich input'ów
- Sanitization danych z CSV

#### 6.2. Performance
- Caching wyników (Redis - opcjonalnie)
- Indexy w bazie danych
- Limit 50 wierszy domyślnie
- Lazy loading na frontend'ie

#### 6.3. Monitoring
- Logs ostatnich fetch'ów w UI
- Alerty dla failed fetch'ów
- Dashboard z statystykami

## 6. Pytania do wyjaśnienia

### KRYTYCZNE (wymagają odpowiedzi przed implementacją):

1. **Struktura CSV**: Jakie dokładnie są nagłówki kolumn w pliku CSV? Potrzebuję przykładowego pliku lub screenshota, aby poprawnie zmapować kolumny 1,2,4,5,6,10,11.

2. **Nazwa pliku CSV**: Jak nazywa się pobierany plik? Czy nazwa jest stała czy dynamiczna (np. `orders_2025-12-01.csv`)?

3. **Lokalizacja elementu pobierania**: XPath `/html/body/app-root/cx-storefront/main/cx-page-layout/cx-page-slot[2]/sc-orders-orders/div/sco-orders-orders-orders/sco-content-table/sco-content-table-head-action-bar/div/div[2]/div[3]` może się zmienić. Czy jest lepszy selektor (np. `button[data-testid="export-csv"]`)?

4. **Format dat w CSV**: W jakim formacie są daty w CSV? (np. `DD.MM.YYYY`, `YYYY-MM-DD`, `MM/DD/YYYY`)

5. **Separator CSV**: Czy to `,` czy `;` czy inny znak?

### WAŻNE (mogą wpłynąć na implementację):

6. **Automatyzacja**: Czy dane mają być pobierane automatycznie (np. co 6 godzin) czy tylko ręcznie przez użytkownika?

7. **Historia**: Czy przechowywać historię wszystkich pobranych zamówień czy tylko najnowsze?

8. **Filtrowanie**: Czy oprócz 50 najnowszych wierszy potrzebne są dodatkowe filtry (data, status, dostawca)?

9. **Two-Factor Authentication**: Czy konto Schuco wymaga 2FA? Jeśli tak, to jak obsłużyć?

10. **Captcha**: Czy strona logowania ma CAPTCHA?

### OPCJONALNE (nice to have):

11. **Export**: Czy użytkownik powinien móc wyeksportować dane do Excel/PDF?

12. **Notyfikacje**: Czy wysyłać powiadomienia o nowych dostawach?

13. **Porównanie**: Czy porównywać nowe dane ze starymi i pokazywać zmiany?

## 7. Harmonogram implementacji

### Sprint 1 (2-3 dni):
- [ ] Setup Puppeteer i testy scraper'a
- [ ] Implementacja logowania i nawigacji
- [ ] Test pobierania pliku CSV

### Sprint 2 (2 dni):
- [ ] Parser CSV
- [ ] Database schema i migracje
- [ ] Service layer

### Sprint 3 (2 dni):
- [ ] API routes i handlers
- [ ] Testy backend'u

### Sprint 4 (2 dni):
- [ ] Frontend - strona i komponenty
- [ ] Integracja z API
- [ ] Styling i responsywność

### Sprint 5 (1 dzień):
- [ ] Testing E2E
- [ ] Bug fixing
- [ ] Dokumentacja

**Całkowity czas**: 7-10 dni roboczych

## 8. Alternatywne podejścia

### Podejście minimalne (MVP):
Jeśli Puppeteer okaże się zbyt skomplikowany:
1. Użytkownik manualnie pobiera CSV ze strony Schuco
2. Upload pliku przez UI (podobnie jak importy)
3. Parser przetwarza i wyświetla dane

**Zalety**: Prostsze, szybsze do zaimplementowania
**Wady**: Wymaga ręcznej pracy użytkownika

### Podejście zaawansowane:
1. Pełna automatyzacja z cron job
2. Real-time monitoring dostaw
3. Integracja z systemem powiadomień
4. Dashboard analytics

## 9. Ryzyka i mitygacja

| Ryzyko | Prawdopodobieństwo | Wpływ | Mitygacja |
|--------|-------------------|-------|-----------|
| Zmiana struktury strony Schuco | Średnie | Wysoki | Używać selektorów data-*, fallback na XPath, monitoring |
| Puppeteer nie działa na serwerze | Niskie | Wysoki | Testowanie na środowisku produkcyjnym wcześnie |
| Rate limiting przez Schuco | Średnie | Średni | Rozumny interval między requestami, user-agent |
| CSV ma inną strukturę niż oczekiwano | Średnie | Średni | Flexibilny parser, walidacja |
| Timeout podczas scraping'u | Średnie | Niski | Retry logic, zwiększone timeouty |

## 10. Podsumowanie

Ten plan zakłada pełną automatyzację przy użyciu Puppeteer. Kluczowe decyzje:

1. **Puppeteer** dla web scraping (rekomendacja)
2. **Przechowywanie w bazie** dla szybkiego dostępu
3. **Manualne odświeżanie** z możliwością rozszerzenia do automatycznego
4. **Czysta architektura** zgodna z resztą projektu

### Następne kroki:
1. ✅ **Uzyskać odpowiedzi na pytania krytyczne** (1-5)
2. Zatwierdzenie planu przez użytkownika
3. Setup środowiska (instalacja Puppeteer)
4. Rozpoczęcie implementacji od backend'u

---

**Uwaga**: Ten plan jest elastyczny i może być modyfikowany w zależności od odpowiedzi na pytania i feedback'u podczas implementacji.
