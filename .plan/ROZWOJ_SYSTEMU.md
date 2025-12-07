# Plan Rozwoju Systemu AKROBUD ERP

**Data utworzenia:** 2025-12-07
**Ostatnia aktualizacja:** 2025-12-07 (analiza Claude Opus 4.5)

---

## Spis treści

1. [Analiza Stanu Projektu](#-analiza-stanu-projektu-opus-45)
2. [Priorytet Krytyczny](#-priorytet-krytyczny)
3. [Priorytet Wysoki](#-priorytet-wysoki)
4. [Priorytet Średni](#-priorytet-średni)
5. [Dodatkowe Usprawnienia](#-dodatkowe-usprawnienia)
6. [Szybkie Wygrane](#-szybkie-wygrane-quick-wins)
7. [Zagrożenia Architektoniczne](#️-zagrożenia-architektoniczne)
8. [Metryki i KPI](#-metryki-i-kpi)
9. [Rekomendacje Wdrożeniowe](#-rekomendacje-wdrożeniowe)

---

## 📊 ANALIZA STANU PROJEKTU (Opus 4.5)

**Data analizy:** 2025-12-07 | **Stan projektu:** ~80% ukończony

### Zrealizowane Moduły (100%)

| Moduł | Status | Uwagi |
|-------|--------|-------|
| Optymalizacja palet | ✅ | Algorytm 7-kroków, PDF export, wizualizacja 2D |
| Schuco tracking | ✅ | Scheduler, scraper Puppeteer, change tracking |
| Dashboard | ✅ | Przyspieszony 5x (29ms), alerty braków |
| Globalne wyszukiwanie | ✅ | Ctrl+K, debounce, optymalizacje |
| Magazyn profili | ✅ | CRUD, historia, inwentaryzacja |
| **Konfiguracja folderów** | ✅ | Przeglądarka Windows, walidacja, restart watchera |

### Moduły W Trakcie (70-85%)

| Moduł | Status | Brakuje |
|-------|--------|---------|
| Zlecenia | 80% | Historia zmian per zlecenie |
| Dostawy | 75% | Publikacja kalendarza |
| Zestawienia miesięczne | 85% | Publikacja do archiwum |
| Okucia | 70% | UI zarządzania artykułami |

### Metryki Projektu

| Metryka | Wartość |
|---------|---------|
| Linie kodu | ~35,000+ |
| Pliki TS/TSX | 138 |
| API endpoints | 50+ |
| Tabele DB | 27 modeli |
| Indeksy DB | 73 |

### Backlog z TODO_FRONTEND.md - Backend gotowy, brak frontendu

| # | Funkcjonalność | Endpoint | Czas |
|---|----------------|----------|------|
| 1 | **Zarządzanie profilami UI** | `/api/profiles/*` | 3-4h |
| 2 | **Protokoły odbioru dostaw** | `/api/deliveries/:id/protocol` | 1h |
| 3 | **Historia magazynu** | `/api/warehouse/history/:colorId` | 2-3h |
| 4 | **Archiwizacja remanentów** | planowane | 5-6h |
| 5 | Pełny raport braków | tylko top 5 | 2-3h |
| 6 | System notatek | backend gotowy | 3-4h |
| 7 | Zarządzanie dniami wolnymi | tylko prawy klik | 3-4h |

---

## 🔴 PRIORYTET KRYTYCZNY

### 1. Uwierzytelnianie i Autoryzacja Użytkowników

**Status:** ❌ Nie zaimplementowane

**Problem:** Obecnie brak logowania - każdy ma dostęp do wszystkich danych systemu.

**Zakres:**
- [ ] System logowania (login/hasło)
- [ ] Role użytkowników:
  - `admin` - pełny dostęp
  - `kierownik_produkcji` - zlecenia, produkcja, raporty
  - `magazynier` - magazyn, dostawy
  - `handlowiec` - zlecenia, klienci (read-only magazyn)
- [ ] Uprawnienia per moduł (ACL)
- [ ] Audit log (kto, co, kiedy zmienił)
- [ ] Sesje i tokeny JWT
- [ ] Opcjonalnie: 2FA

**Modele bazy danych:**
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String   // hashed
  name      String
  role      Role     @default(USER)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  auditLogs AuditLog[]
}

enum Role {
  ADMIN
  MANAGER
  WAREHOUSE
  SALES
  USER
}

model AuditLog {
  id         Int      @id @default(autoincrement())
  userId     Int
  user       User     @relation(fields: [userId], references: [id])
  action     String   // CREATE, UPDATE, DELETE
  entity     String   // Order, Delivery, etc.
  entityId   Int
  oldValues  Json?
  newValues  Json?
  ipAddress  String?
  createdAt  DateTime @default(now())
}
```

---

### 2. API dla Modułu Okuć (Okuc)

**Status:** ⚠️ Schemat istnieje, brak API

**Problem:** Modele w bazie danych są zdefiniowane, ale brak REST endpoints do zarządzania.

**Zakres:**
- [ ] CRUD dla artykułów okuć (`OkucArticle`)
- [ ] Zarządzanie stanem magazynowym (`OkucStock`)
- [ ] Zamówienia okuć (`OkucOrder`)
- [ ] Zapotrzebowanie z dokumentów RW/PW (`OkucRequirement`)
- [ ] Historia zmian (`OkucHistory`)
- [ ] Import artykułów z CSV/Excel
- [ ] Automatyczne alerty na braki

**Endpointy:**
```
GET    /api/okuc/articles          - Lista artykułów
POST   /api/okuc/articles          - Dodaj artykuł
GET    /api/okuc/articles/:id      - Szczegóły artykułu
PATCH  /api/okuc/articles/:id      - Aktualizuj artykuł
DELETE /api/okuc/articles/:id      - Usuń artykuł

GET    /api/okuc/stock             - Stan magazynowy
POST   /api/okuc/stock/adjust      - Korekta stanu
GET    /api/okuc/stock/shortages   - Braki

GET    /api/okuc/orders            - Zamówienia
POST   /api/okuc/orders            - Nowe zamówienie
PATCH  /api/okuc/orders/:id        - Aktualizuj zamówienie

GET    /api/okuc/requirements      - Zapotrzebowanie
POST   /api/okuc/requirements      - Dodaj zapotrzebowanie (RW/PW)

GET    /api/okuc/history           - Historia zmian
POST   /api/okuc/inventory         - Inwentaryzacja
```

---

### 3. Moduł Kontroli Jakości (QMS - Quality Management System)

**Status:** ❌ Nie zaimplementowane

**Uzasadnienie biznesowe:** Okna aluminiowe wymagają kontroli jakości (wymiary, uszczelnienie, wygląd). Bez tego firmy tracą klientów na reklamacjach.

**Zakres:**
- [ ] Punkty kontroli dla każdej fazy produkcji
- [ ] Rejestracja wad i defektów
- [ ] Raport QA per zlecenie
- [ ] Metryki: First Pass Yield, Defect Rate
- [ ] Powiązanie z reklamacjami (RMA)
- [ ] Dashboard jakości

**Modele bazy danych:**
```prisma
model QualityCheckPoint {
  id          Int      @id @default(autoincrement())
  name        String   // np. "Kontrola wymiarów", "Test szczelności"
  phase       String   // CUTTING, ASSEMBLY, GLAZING, FINAL
  description String?
  required    Boolean  @default(true)
  sortOrder   Int      @default(0)
  checks      QualityCheck[]
}

model QualityCheck {
  id             Int                @id @default(autoincrement())
  orderId        Int
  order          Order              @relation(fields: [orderId], references: [id])
  checkPointId   Int
  checkPoint     QualityCheckPoint  @relation(fields: [checkPointId], references: [id])
  status         QualityStatus      @default(PENDING)
  checkedBy      String?
  checkedAt      DateTime?
  notes          String?
  defects        QualityDefect[]
}

enum QualityStatus {
  PENDING
  PASSED
  FAILED
  REWORK
}

model QualityDefect {
  id          Int           @id @default(autoincrement())
  checkId     Int
  check       QualityCheck  @relation(fields: [checkId], references: [id])
  type        DefectType
  description String
  severity    Severity      @default(MINOR)
  photoUrl    String?
  resolved    Boolean       @default(false)
  resolvedAt  DateTime?
  resolvedBy  String?
  createdAt   DateTime      @default(now())
}

enum DefectType {
  DIMENSION      // Błąd wymiarowy
  SURFACE        // Wada powierzchni
  SEALING        // Problem z uszczelnieniem
  HARDWARE       // Problem z okuciami
  GLASS          // Problem ze szkłem
  COLOR          // Problem z kolorem
  OTHER
}

enum Severity {
  MINOR    // Drobna - akceptowalna
  MAJOR    // Poważna - wymaga naprawy
  CRITICAL // Krytyczna - odrzucenie
}
```

---

## 🟠 PRIORYTET WYSOKI

### 4. System Reklamacji (RMA - Return Merchandise Authorization)

**Status:** ❌ Nie zaimplementowane

**Uzasadnienie biznesowe:** Bez śledzenia reklamacji nie wiadomo jakie produkty mają problemy i ile kosztują zwroty.

**Zakres:**
- [ ] Zgłoszenie reklamacji powiązane z zleceniem
- [ ] Statusy: zgłoszona → w trakcie → rozwiązana/odrzucona
- [ ] Przyczyny: wada materiału, błąd montażu, transport, itp.
- [ ] Koszty reklamacji (materiał, transport, praca)
- [ ] Analiza trendów (które produkty/profile mają problemy)
- [ ] Raport reklamacji per okres/klient

**Modele bazy danych:**
```prisma
model Claim {
  id          Int         @id @default(autoincrement())
  claimNumber String      @unique // RMA-2024-001
  orderId     Int
  order       Order       @relation(fields: [orderId], references: [id])
  customerId  Int?
  customer    Customer?   @relation(fields: [customerId], references: [id])
  status      ClaimStatus @default(SUBMITTED)
  type        ClaimType
  description String
  photoUrls   String[]

  // Rozwiązanie
  resolution       String?
  resolutionType   ResolutionType?
  resolvedAt       DateTime?
  resolvedBy       String?

  // Koszty
  materialCost     Decimal?  @db.Decimal(10, 2)
  laborCost        Decimal?  @db.Decimal(10, 2)
  transportCost    Decimal?  @db.Decimal(10, 2)

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  notes       ClaimNote[]
}

enum ClaimStatus {
  SUBMITTED    // Zgłoszona
  INVESTIGATING // W trakcie analizy
  APPROVED     // Zatwierdzona
  REJECTED     // Odrzucona
  IN_REPAIR    // W naprawie
  REPLACED     // Wymieniono
  REFUNDED     // Zwrócono pieniądze
  CLOSED       // Zamknięta
}

enum ClaimType {
  DEFECT       // Wada produkcyjna
  DAMAGE       // Uszkodzenie w transporcie
  WRONG_ORDER  // Błędne zamówienie
  MISSING      // Brakujące elementy
  OTHER
}

enum ResolutionType {
  REPAIR       // Naprawa
  REPLACEMENT  // Wymiana
  REFUND       // Zwrot pieniędzy
  CREDIT       // Nota kredytowa
  NO_ACTION    // Brak działania (odrzucona)
}

model ClaimNote {
  id        Int      @id @default(autoincrement())
  claimId   Int
  claim     Claim    @relation(fields: [claimId], references: [id])
  content   String
  author    String
  createdAt DateTime @default(now())
}
```

---

### 5. Moduł CRM / Zarządzanie Klientami

**Status:** ❌ Nie zaimplementowane (tylko pole `client` w Order bez relacji)

**Uzasadnienie biznesowe:** Bez danych o klientach nie można analizować rentowności, historii ani preferencji.

**Zakres:**
- [ ] Model `Customer` z pełnymi danymi
- [ ] Powiązanie Order → Customer (FK)
- [ ] Historia transakcji per klient
- [ ] KPI klienta: terminowość płatności, reklamacje, wartość
- [ ] Kontakty (osoby w firmie klienta)
- [ ] Preferencje (forma płatności, transport, dokumenty)
- [ ] Segmentacja klientów (A/B/C)

**Modele bazy danych:**
```prisma
model Customer {
  id           Int       @id @default(autoincrement())
  code         String    @unique // KOD-001
  name         String
  shortName    String?
  nip          String?   // NIP firmy

  // Adres główny
  street       String?
  city         String?
  postalCode   String?
  country      String?   @default("PL")

  // Kontakt
  email        String?
  phone        String?
  website      String?

  // Klasyfikacja
  segment      CustomerSegment @default(C)
  paymentTerms Int             @default(14) // dni
  creditLimit  Decimal?        @db.Decimal(10, 2)

  // Preferencje
  preferredTransport  String?
  preferredPayment    String?
  notes               String?

  active       Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  contacts     CustomerContact[]
  orders       Order[]
  claims       Claim[]
}

enum CustomerSegment {
  A  // Kluczowy (>100k/rok)
  B  // Średni (20-100k/rok)
  C  // Mały (<20k/rok)
}

model CustomerContact {
  id          Int      @id @default(autoincrement())
  customerId  Int
  customer    Customer @relation(fields: [customerId], references: [id])
  name        String
  position    String?  // Stanowisko
  email       String?
  phone       String?
  isPrimary   Boolean  @default(false)
  notes       String?
}
```

---

### 6. Kosztorysowanie i Marże (Costing Engine)

**Status:** ❌ Nie zaimplementowane

**Uzasadnienie biznesowe:** Bez wyliczania kosztów produkcji niemożliwe jest określenie rentowności zleceń i optymalizacja cen.

**Zakres:**
- [ ] Kalkulacja kosztu produkcji zlecenia
- [ ] Składniki: materiały, praca, energia, opakowanie, transport
- [ ] Porównanie: koszt vs cena sprzedaży
- [ ] Raport marż per zlecenie/klient/profil
- [ ] Alert na nieprofitowe zlecenia
- [ ] Analiza rentowności per okres

**Modele bazy danych:**
```prisma
model CostCenter {
  id          Int        @id @default(autoincrement())
  code        String     @unique
  name        String
  type        CostType
  active      Boolean    @default(true)
  costItems   CostItem[]
}

enum CostType {
  MATERIAL    // Materiały (profile, okucia, szkło)
  LABOR       // Praca
  OVERHEAD    // Koszty ogólne
  PACKAGING   // Opakowanie
  TRANSPORT   // Transport
}

model CostItem {
  id           Int        @id @default(autoincrement())
  costCenterId Int
  costCenter   CostCenter @relation(fields: [costCenterId], references: [id])
  name         String
  unit         String     // szt, mb, h, kg
  unitCost     Decimal    @db.Decimal(10, 4)
  currency     String     @default("PLN")
  validFrom    DateTime   @default(now())
  validTo      DateTime?
}

model OrderCost {
  id           Int      @id @default(autoincrement())
  orderId      Int      @unique
  order        Order    @relation(fields: [orderId], references: [id])

  // Składniki kosztu
  materialCost   Decimal  @db.Decimal(10, 2)
  laborCost      Decimal  @db.Decimal(10, 2)
  overheadCost   Decimal  @db.Decimal(10, 2)
  packagingCost  Decimal  @db.Decimal(10, 2)
  transportCost  Decimal  @db.Decimal(10, 2)

  totalCost      Decimal  @db.Decimal(10, 2)
  sellingPrice   Decimal  @db.Decimal(10, 2)
  margin         Decimal  @db.Decimal(10, 2)
  marginPercent  Decimal  @db.Decimal(5, 2)

  calculatedAt   DateTime @default(now())
  calculatedBy   String?
}
```

---

### 7. System Notyfikacji

**Status:** ❌ Nie zaimplementowane

**Uzasadnienie biznesowe:** Brak powiadomień oznacza, że użytkownicy nie wiedzą o ważnych zmianach i terminach.

**Zakres:**
- [ ] Email notyfikacje
- [ ] Powiadomienia w systemie (in-app)
- [ ] Opcjonalnie: SMS dla krytycznych alertów
- [ ] Konfiguracja per użytkownik (co chce otrzymywać)

**Typy powiadomień:**
| Typ | Opis | Kanał |
|-----|------|-------|
| ORDER_STATUS_CHANGE | Zmiana statusu zlecenia | Email, In-app |
| DEADLINE_REMINDER | Przypomnienie o deadline (3 dni przed) | Email |
| STOCK_SHORTAGE | Brak materiału w magazynie | Email, In-app |
| DELIVERY_SHIPPED | Dostawa wysłana | Email |
| CLAIM_SUBMITTED | Nowa reklamacja | Email, In-app |
| SCHUCO_UPDATE | Zmiana w zamówieniu Schuco | In-app |

**Modele bazy danych:**
```prisma
model Notification {
  id          Int                @id @default(autoincrement())
  userId      Int
  user        User               @relation(fields: [userId], references: [id])
  type        NotificationType
  title       String
  message     String
  link        String?            // URL do szczegółów
  read        Boolean            @default(false)
  readAt      DateTime?
  emailSent   Boolean            @default(false)
  emailSentAt DateTime?
  createdAt   DateTime           @default(now())
}

enum NotificationType {
  ORDER_STATUS_CHANGE
  DEADLINE_REMINDER
  STOCK_SHORTAGE
  DELIVERY_SHIPPED
  CLAIM_SUBMITTED
  SCHUCO_UPDATE
  SYSTEM_ALERT
}

model NotificationPreference {
  id          Int      @id @default(autoincrement())
  userId      Int
  user        User     @relation(fields: [userId], references: [id])
  type        NotificationType
  emailEnabled Boolean @default(true)
  inAppEnabled Boolean @default(true)

  @@unique([userId, type])
}
```

---

## 🟡 PRIORYTET ŚREDNI

### 8. Zarządzanie Transportem (TMS - Transport Management System)

**Status:** ❌ Nie zaimplementowane

**Uzasadnienie biznesowe:** Logistyka to ~15% kosztów. Optymalizacja tras i konsolidacja dostaw może znacząco obniżyć koszty.

**Zakres:**
- [ ] Flota pojazdów (pojemność, dostępność)
- [ ] Kierowcy (uprawnienia, dostępność)
- [ ] Planowanie tras
- [ ] GPS tracking (integracja)
- [ ] Potwierdzenie odbioru (POD - Proof of Delivery)
- [ ] Integracja z kurierami (DPD, DHL API)
- [ ] Koszty transportu per dostawa

**Modele bazy danych:**
```prisma
model Vehicle {
  id            Int       @id @default(autoincrement())
  plateNumber   String    @unique
  name          String    // np. "Sprinter 1"
  type          VehicleType
  capacity      Decimal   @db.Decimal(10, 2)  // kg lub m3
  maxPallets    Int
  active        Boolean   @default(true)
  routes        TransportRoute[]
}

enum VehicleType {
  VAN
  TRUCK
  SEMI_TRAILER
}

model Driver {
  id          Int       @id @default(autoincrement())
  name        String
  phone       String
  licenseType String    // B, C, C+E
  active      Boolean   @default(true)
  routes      TransportRoute[]
}

model TransportRoute {
  id            Int       @id @default(autoincrement())
  deliveryId    Int
  delivery      Delivery  @relation(fields: [deliveryId], references: [id])
  vehicleId     Int?
  vehicle       Vehicle?  @relation(fields: [vehicleId], references: [id])
  driverId      Int?
  driver        Driver?   @relation(fields: [driverId], references: [id])

  // Trasa
  startAddress  String
  endAddress    String
  distance      Decimal?  @db.Decimal(10, 2)  // km
  estimatedTime Int?      // minuty

  // Status
  status        RouteStatus @default(PLANNED)
  departedAt    DateTime?
  arrivedAt     DateTime?

  // POD
  podSignature  String?
  podPhoto      String?
  podNotes      String?

  // Koszty
  fuelCost      Decimal?  @db.Decimal(10, 2)
  tollCost      Decimal?  @db.Decimal(10, 2)
  otherCost     Decimal?  @db.Decimal(10, 2)

  createdAt     DateTime  @default(now())
}

enum RouteStatus {
  PLANNED
  IN_TRANSIT
  DELIVERED
  FAILED
}
```

---

### 9. Planowanie Produkcji (Production Scheduling)

**Status:** ❌ Nie zaimplementowane

**Uzasadnienie biznesowe:** Manualne planowanie prowadzi do przestojów i opóźnień. Automatyzacja zwiększa wydajność.

**Zakres:**
- [ ] Zdolności maszyn (capacity planning)
- [ ] Harmonogram produkcji (Gantt chart)
- [ ] Przydzielanie zleceń do maszyn/linii
- [ ] Przydzielanie pracowników do faz
- [ ] Śledzenie backlog'u
- [ ] Alert na opóźnienia i wąskie gardła

**Fazy produkcji okien aluminiowych:**
1. CUTTING - Cięcie profili
2. MACHINING - Obróbka (frezowanie, wiercenie)
3. ASSEMBLY - Montaż ramy
4. GLAZING - Szklenie
5. HARDWARE - Montaż okuć
6. QUALITY - Kontrola jakości
7. PACKING - Pakowanie

---

### 10. Prognozowanie Zapasów (Inventory Forecasting)

**Status:** ⚠️ Częściowo (średnia miesięczna istnieje)

**Zakres rozszerzenia:**
- [ ] Algorytm prognozowania (moving average, exponential smoothing)
- [ ] Rekomendacje: ile zamówić, kiedy
- [ ] Analiza ABC (kluczowe profile)
- [ ] Alert na braki przed deadline'em
- [ ] Scenariusze (optymistyczne, pesymistyczne)
- [ ] Sezonowość (jeśli dotyczy)

---

### 11. Zarządzanie Dokumentami (DMS - Document Management System)

**Status:** ❌ Nie zaimplementowane

**Zakres:**
- [ ] Przechowywanie dokumentów (PDF, CAD, specyfikacje)
- [ ] Powiązanie z Order/Delivery/Claim
- [ ] Wersjonowanie dokumentów
- [ ] Auto-generowanie dokumentów:
  - CMR (list przewozowy)
  - Protokół odbioru
  - Karta technologiczna
  - Etykiety
- [ ] Szablony dokumentów
- [ ] Archiwizacja (GDPR - retencja danych)

---

## 🟢 DODATKOWE USPRAWNIENIA

### 12. Dashboard Analityczny

**Status:** ⚠️ Podstawowy dashboard istnieje

**Rozszerzenie:**
- [ ] OEE (Overall Equipment Effectiveness)
- [ ] KPI cards:
  - On-Time Delivery Rate
  - Order Fulfillment Time
  - First Pass Yield
  - Material Utilization
- [ ] Trendy i porównania (miesiąc vs miesiąc)
- [ ] Wizualizacja bottlenecków
- [ ] Alerty na anomalie

---

### 13. Aplikacja Mobilna / PWA

**Status:** ❌ Nie zaimplementowane

**Zakres:**
- [ ] PWA (Progressive Web App) lub React Native
- [ ] Skanowanie kodów kreskowych
- [ ] Podgląd stanu magazynu
- [ ] Zatwierdzanie dostaw w terenie
- [ ] Rejestracja wad jakościowych (zdjęcie + opis)

---

### 14. Integracje Zewnętrzne

**Status:** ⚠️ Tylko Schuco

**Rozszerzenie:**
- [ ] API dostawców profili (dostępność, ceny)
- [ ] Eksport do systemu księgowego (FK)
- [ ] API dla klientów (status zamówienia)
- [ ] Integracja z systemem CAD (import specyfikacji)
- [ ] Webhook'i dla zewnętrznych systemów

---

## 📋 SZYBKIE WYGRANE (Quick Wins)

Funkcje możliwe do wdrożenia w krótkim czasie:

| # | Funkcja | Nakład | Priorytet |
|---|---------|--------|-----------|
| 1 | REST API dla modułu Okuc | 2-3 dni | Wysoki |
| 2 | Prosty audit log (kto zmienił) | 1-2 dni | Wysoki |
| 3 | Eksport Excel dla raportów | 1 dzień | Średni |
| 4 | Email notyfikacje (braki magazynowe) | 2-3 dni | Średni |
| 5 | Backup automatyczny SQLite | 0.5 dnia | Wysoki |
| 6 | Walidacja danych na froncie (Zod) | 1-2 dni | Średni |
| 7 | Logowanie błędów (Sentry) | 0.5 dnia | Wysoki |
| 8 | Health check endpoint | 0.5 dnia | Niski |

---

## ⚠️ ZAGROŻENIA ARCHITEKTONICZNE

### Do rozwiązania w średnim terminie:

| # | Problem | Ryzyko | Rozwiązanie |
|---|---------|--------|-------------|
| 1 | **Brak autentykacji** | KRYTYCZNE | JWT + sesje |
| 2 | **SQLite w produkcji** | WYSOKIE | Migracja na PostgreSQL |
| 3 | **Brak cache'u** | ŚREDNIE | Redis dla często używanych danych |
| 4 | **Brak monitoringu** | WYSOKIE | Sentry, Prometheus + Grafana |
| 5 | **Brak CI/CD** | ŚREDNIE | GitHub Actions |
| 6 | **Brak testów** | ŚREDNIE | Vitest dla backend, Playwright dla e2e |

---

## 📊 METRYKI I KPI

### Metryki do śledzenia po wdrożeniu nowych funkcji:

| Metryka | Opis | Cel |
|---------|------|-----|
| **On-Time Delivery Rate** | % dostaw na czas | >95% |
| **Order Fulfillment Time** | Czas od zamówienia do wysyłki | <5 dni |
| **First Pass Yield (FPY)** | % produktów bez wad | >98% |
| **Material Utilization** | % zużycia vs marnotrawstwo | >90% |
| **Inventory Turnover** | Rotacja zapasów rocznie | >6x |
| **Gross Margin** | (Revenue - COGS) / Revenue | >25% |
| **Claim Rate** | % zleceń z reklamacją | <2% |

---

## 📅 SUGEROWANA KOLEJNOŚĆ WDROŻENIA

### Faza 1: Fundamenty (1-2 miesiące)
1. Uwierzytelnianie i autoryzacja
2. Audit log
3. API dla Okuc
4. Backup automatyczny
5. Monitoring (Sentry)

### Faza 2: Jakość i Klienci (2-3 miesiące)
1. Moduł CRM (Customers)
2. Moduł Kontroli Jakości (QMS)
3. System Reklamacji (RMA)
4. Notyfikacje email

### Faza 3: Finanse i Logistyka (3-4 miesiące)
1. Kosztorysowanie i marże
2. Transport Management (TMS)
3. Zarządzanie dokumentami (DMS)
4. Dashboard analityczny rozszerzony

### Faza 4: Optymalizacja (4-6 miesięcy)
1. Planowanie produkcji
2. Prognozowanie zapasów
3. Migracja na PostgreSQL
4. Aplikacja mobilna / PWA

---

## 📝 NOTATKI

- Dokument będzie aktualizowany w miarę postępu prac
- Każdy moduł przed wdrożeniem wymaga szczegółowej specyfikacji
- Priorytet może się zmieniać w zależności od potrzeb biznesowych

---

---

## 📋 REKOMENDACJE WDROŻENIOWE (Opus 4.5)

### Faza 1: Dokończenie Backlogu (1-2 tygodnie)

**Cel:** Wykorzystać gotowy backend, uzupełnić brakujące UI

| Zadanie | Czas | Priorytet |
|---------|------|-----------|
| 1. Zarządzanie profilami UI | 3-4h | P1 |
| 2. Protokoły odbioru (przycisk PDF) | 1h | P1 |
| 3. Historia magazynu (zakładka) | 2-3h | P1 |
| 4. Pełny raport braków | 2-3h | P2 |

**Razem:** ~10-12h

### Faza 2: Archiwizacja i Średnie (1 tydzień)

| Zadanie | Czas |
|---------|------|
| 1. Pole `completedAt` + migracja | 15min |
| 2. Endpoint średniej miesięcznej | 1-2h |
| 3. UI: kolumna średniej | 30min |
| 4. UI: przycisk "Zakończ remanent" | 45min |

**Razem:** ~5-6h

### Faza 3: Bezpieczeństwo (2-3 tygodnie)

| Zadanie | Czas |
|---------|------|
| 1. Email notifications | 4-6h |
| 2. Audit log | 3-4h |
| 3. System użytkowników (JWT) | 8-12h |
| 4. Backup automatyczny | 2-3h |

**Razem:** ~20-25h

### Faza 4: Analityka (2-3 tygodnie)

| Zadanie | Czas |
|---------|------|
| 1. Dashboard KPI | 6-8h |
| 2. Trendy sezonowe | 3-4h |
| 3. Prognozowanie zapotrzebowania | 8-12h |

### Propozycje Nowych Funkcji (wartość biznesowa)

| Funkcja | Opis | Wartość | Złożoność |
|---------|------|---------|-----------|
| **Dashboard KPI** | Metryki: wydajność, koszty, terminowość | Wysoka | Średnia |
| **Prognozowanie** | ML na historii - przewidywanie potrzeb | Wysoka | Wysoka |
| **Portal klienta** | Status zamówienia online | Średnia | Średnia |
| **E-faktura KSeF** | Obowiązkowe od 2026! | Wysoka | Wysoka |
| **Bulk operations** | Masowa edycja zleceń | Wysoka | Niska |
| **Skanowanie kodów** | QR/barcode dla profili | Wysoka | Średnia |

### 📅 ROADMAPA

```
Grudzień 2025
├── Tydzień 1-2: Faza 1 (backlog UI) + Faza 2 (archiwizacja)
└── Tydzień 3-4: Faza 3 start (bezpieczeństwo)

Styczeń 2026
├── Tydzień 1-2: Faza 3 + Faza 4 start (analityka)
└── Tydzień 3-4: CRM + Reklamacje

Luty 2026
└── E-faktura KSeF (obowiązkowa od 2026!)
```

---

*Ostatnia aktualizacja: 2025-12-07*
*Autor analizy: Claude Opus 4.5*
