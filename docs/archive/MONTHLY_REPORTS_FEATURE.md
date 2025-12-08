# Zestawienia Miesięczne - Dokumentacja Funkcjonalności

## Przegląd

Moduł zestawień miesięcznych (Faza 6) umożliwia automatyczne generowanie raportów miesięcznych na podstawie zleceń z numerami faktur. System pozwala na konfigurację kursu walut oraz eksport raportów do formatów Excel i PDF.

## Funkcjonalności

### 1. Konfiguracja Kursu Walut

System umożliwia ręczne wprowadzanie i zarządzanie kursem wymiany EUR/PLN.

#### Endpointy API:

- **GET** `/api/currency-config/current` - Pobiera aktualny kurs
- **POST** `/api/currency-config` - Aktualizuje kurs
- **GET** `/api/currency-config/history?limit=10` - Historia kursów
- **POST** `/api/currency-config/convert/eur-to-pln` - Konwersja EUR → PLN
- **POST** `/api/currency-config/convert/pln-to-eur` - Konwersja PLN → EUR

#### Przykład aktualizacji kursu:

```bash
curl -X POST http://localhost:3001/api/currency-config \
  -H "Content-Type: application/json" \
  -d '{
    "eurToPlnRate": 4.35,
    "effectiveDate": "2025-12-01T00:00:00Z"
  }'
```

### 2. Generowanie Zestawień Miesięcznych

System automatycznie generuje zestawienia na podstawie zleceń z numerami faktur dla danego miesiąca.

#### Kolumny w zestawieniu:

- **Nr zlecenia** - Numer zlecenia
- **Nr faktury** - Numer faktury
- **Okna** - Liczba okien (totalWindows)
- **Skrzydła** - Liczba skrzydeł (totalSashes)
- **Jednostki** - Suma ilości z windows.quantity
- **Wartość PLN** - Wartość w PLN
- **Wartość EUR** - Wartość w EUR

#### Endpointy API:

- **GET** `/api/monthly-reports` - Lista wszystkich zestawień
- **GET** `/api/monthly-reports/:year/:month` - Szczegóły zestawienia
- **POST** `/api/monthly-reports/:year/:month/generate` - Generuj zestawienie
- **DELETE** `/api/monthly-reports/:year/:month` - Usuń zestawienie

#### Przykład generowania zestawienia:

```bash
curl -X POST http://localhost:3001/api/monthly-reports/2025/12/generate
```

Odpowiedź:

```json
{
  "reportId": 1,
  "year": 2025,
  "month": 12,
  "totalOrders": 15,
  "totalWindows": 120,
  "totalSashes": 180,
  "totalValuePln": 125000.50,
  "totalValueEur": 28735.63,
  "items": [
    {
      "orderId": 1,
      "orderNumber": "ZL-2025-001",
      "invoiceNumber": "FV/2025/001",
      "windowsCount": 8,
      "sashesCount": 12,
      "unitsCount": 8,
      "valuePln": 8500.00,
      "valueEur": 1954.02
    }
  ]
}
```

### 3. Eksport do Excel

System generuje profesjonalnie sformatowany plik Excel z zestawieniem.

#### Cechy eksportu Excel:

- Nagłówki kolumn ze stylowaniem
- Automatyczne wyrównanie i szerokość kolumn
- Wiersz sum z pogrubioną czcionką
- Sekcja podsumowania z kluczowymi metrykami
- Ramki wokół komórek

#### Endpoint API:

- **GET** `/api/monthly-reports/:year/:month/export/excel`

#### Przykład pobierania:

```bash
curl -X GET http://localhost:3001/api/monthly-reports/2025/12/export/excel \
  -o zestawienie_2025_12.xlsx
```

### 4. Eksport do PDF

System generuje dokument PDF w orientacji poziomej (landscape) z pełnym zestawieniem.

#### Cechy eksportu PDF:

- Format A4 poziomy
- Tytuł raportu
- Tabela z danymi
- Wiersz sum
- Sekcja podsumowania
- Stopka z datą generowania

#### Endpoint API:

- **GET** `/api/monthly-reports/:year/:month/export/pdf`

#### Przykład pobierania:

```bash
curl -X GET http://localhost:3001/api/monthly-reports/2025/12/export/pdf \
  -o zestawienie_2025_12.pdf
```

## Architektura

### Modele Bazy Danych

#### MonthlyReport

```prisma
model MonthlyReport {
  id                 Int       @id @default(autoincrement())
  year               Int
  month              Int       // 1-12
  reportDate         DateTime  @default(now())
  totalOrders        Int       @default(0)
  totalWindows       Int       @default(0)
  totalSashes        Int       @default(0)
  totalValuePln      Float     @default(0)
  totalValueEur      Float     @default(0)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  reportItems        MonthlyReportItem[]

  @@unique([year, month])
  @@map("monthly_reports")
}
```

#### MonthlyReportItem

```prisma
model MonthlyReportItem {
  id                 Int       @id @default(autoincrement())
  reportId           Int
  orderId            Int
  orderNumber        String
  invoiceNumber      String?
  windowsCount       Int       @default(0)
  sashesCount        Int       @default(0)
  unitsCount         Int       @default(0)
  valuePln           Float?
  valueEur           Float?
  createdAt          DateTime  @default(now())

  report             MonthlyReport @relation(...)
  order              Order         @relation(...)

  @@map("monthly_report_items")
}
```

#### CurrencyConfig

```prisma
model CurrencyConfig {
  id                 Int       @id @default(autoincrement())
  eurToPlnRate       Float
  effectiveDate      DateTime  @default(now())
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@map("currency_config")
}
```

### Serwisy

#### MonthlyReportService

Główny serwis zarządzający zestawieniami miesięcznymi.

Metody:
- `generateReport(year, month)` - Generuje dane raportu
- `saveReport(reportData)` - Zapisuje raport do bazy
- `getReport(year, month)` - Pobiera raport
- `getAllReports(limit)` - Lista wszystkich raportów
- `deleteReport(year, month)` - Usuwa raport
- `generateAndSaveReport(year, month)` - Generuje i zapisuje w jednej operacji

#### MonthlyReportExportService

Serwis eksportu do różnych formatów.

Metody:
- `exportToExcel(reportData)` - Generuje plik Excel
- `exportToPdf(reportData)` - Generuje plik PDF
- `getFilename(year, month, format)` - Generuje nazwę pliku

#### CurrencyConfigService

Serwis zarządzania konfiguracją walut.

Metody:
- `getCurrentRate()` - Pobiera aktualny kurs
- `updateRate(rate, date)` - Aktualizuje kurs
- `getRateHistory(limit)` - Historia kursów
- `getRateForDate(date)` - Kurs na określoną datę
- `convertEurToPln(amount)` - Konwersja EUR → PLN
- `convertPlnToEur(amount)` - Konwersja PLN → EUR

## Wykorzystane Technologie

- **ExcelJS** - Generowanie plików Excel
- **PDFKit** - Generowanie plików PDF
- **Prisma** - ORM dla bazy danych
- **Fastify** - Framework webowy
- **Zod** - Walidacja danych

## Przepływ Działania

### Generowanie Zestawienia

1. Użytkownik wysyła żądanie generowania zestawienia dla danego miesiąca
2. System znajduje wszystkie zlecenia z numerami faktur z danego miesiąca
3. Dla każdego zlecenia zbierane są dane:
   - Numer zlecenia i faktury
   - Liczba okien, skrzydeł, jednostek
   - Wartości PLN/EUR
4. Obliczane są sumy dla wszystkich kolumn
5. Raport zapisywany jest w bazie danych
6. System zwraca wygenerowane zestawienie

### Eksport do Excel/PDF

1. Użytkownik wysyła żądanie eksportu
2. System sprawdza czy raport istnieje, jeśli nie - generuje go automatycznie
3. Dane raportu przekształcane są do formatu eksportu
4. Generowany jest plik Excel lub PDF
5. Plik zwracany jest jako odpowiedź HTTP z odpowiednimi nagłówkami

## Testowanie

### Testowanie API

```bash
# 1. Ustaw kurs walut
curl -X POST http://localhost:3001/api/currency-config \
  -H "Content-Type: application/json" \
  -d '{"eurToPlnRate": 4.35}'

# 2. Wygeneruj zestawienie
curl -X POST http://localhost:3001/api/monthly-reports/2025/12/generate

# 3. Pobierz zestawienie
curl http://localhost:3001/api/monthly-reports/2025/12

# 4. Eksportuj do Excel
curl http://localhost:3001/api/monthly-reports/2025/12/export/excel \
  -o raport.xlsx

# 5. Eksportuj do PDF
curl http://localhost:3001/api/monthly-reports/2025/12/export/pdf \
  -o raport.pdf
```

## Uwagi Implementacyjne

1. **Automatyczne generowanie** - Przy pierwszym eksporcie system automatycznie generuje raport, jeśli nie istnieje
2. **Aktualizacja raportów** - Ponowne wygenerowanie raportu nadpisuje istniejące dane
3. **Kurs walut** - System używa najnowszego kursu przy konwersjach
4. **Filtry czasowe** - Zlecenia grupowane są na podstawie pola `createdAt`
5. **Jednostki** - Obliczane jako suma `quantity` ze wszystkich okien w zleceniu

## Możliwe Rozszerzenia

1. **Automatyczne generowanie** - Cron job generujący raporty automatycznie pod koniec miesiąca
2. **Powiadomienia email** - Wysyłanie raportów mailem
3. **Szablony niestandardowe** - Możliwość definiowania własnych szablonów eksportu
4. **Filtrowanie** - Dodatkowe filtry (klient, status, zakres wartości)
5. **Wykresy** - Wizualizacje danych w raportach
6. **Archiwizacja** - Automatyczna archiwizacja starszych raportów
7. **Integracja z API walut** - Automatyczne pobieranie aktualnych kursów

## Pliki Utworzone

### Backend (API)

1. **Schema Prisma**:
   - `apps/api/prisma/schema.prisma` - Dodane modele MonthlyReport, MonthlyReportItem, CurrencyConfig
   - `apps/api/prisma/migrations/20251201_add_monthly_reports/migration.sql` - Migracja bazy danych

2. **Serwisy**:
   - `apps/api/src/services/currencyConfigService.ts` - Zarządzanie kursem walut
   - `apps/api/src/services/monthlyReportService.ts` - Generowanie raportów
   - `apps/api/src/services/monthlyReportExportService.ts` - Eksport do Excel/PDF

3. **Routery**:
   - `apps/api/src/routes/currency-config.ts` - Endpointy konfiguracji walut
   - `apps/api/src/routes/monthly-reports.ts` - Endpointy raportów

4. **Validatory**:
   - `apps/api/src/validators/currencyConfig.ts` - Walidacja danych walutowych

5. **Konfiguracja**:
   - `apps/api/src/index.ts` - Rejestracja nowych routerów
   - `apps/api/package.json` - Dodane zależności (exceljs)

## Wsparcie

W razie pytań lub problemów z implementacją, sprawdź:
- Swagger UI: http://localhost:3001/documentation
- Logi serwera API
- Dokumentację ExcelJS: https://github.com/exceljs/exceljs
- Dokumentację PDFKit: https://pdfkit.org/
