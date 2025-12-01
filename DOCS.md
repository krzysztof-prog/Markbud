# AKROBUD - Dokumentacja Projektu

> Skonsolidowana dokumentacja zawierająca najważniejsze informacje o systemie.
> Ostatnia aktualizacja: 01.12.2025

---

## 1. O Systemie

**AKROBUD** to aplikacja webowa do zarządzania zamówieniami, dostawami, produkcją okien oraz magazynem profili i szyb dla firmy produkującej okna.

### Stack Technologiczny

| Warstwa | Technologie |
|---------|-------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Table |
| **Backend** | Node.js, Fastify, Prisma ORM |
| **Baza danych** | SQLite (dev) / PostgreSQL (prod) |
| **Real-time** | WebSocket (Socket.io) |

### Struktura Monorepo

```
akrobud/
├── apps/
│   ├── web/          # Frontend Next.js
│   └── api/          # Backend Fastify
├── packages/         # Współdzielone pakiety
└── prisma/           # Schema bazy danych
```

---

## 2. Moduły Systemu

| Moduł | Opis | Status |
|-------|------|--------|
| **Dashboard** | Przegląd systemu, alerty, oczekujące importy | ✅ |
| **Magazyn Profili** | Zarządzanie profilami aluminiowymi i kolorami | ✅ |
| **Dostawy** | Kalendarz dostaw, drag&drop zleceń | ✅ |
| **Dostawy Schuco** | Automatyczne pobieranie CSV z systemu Schuco | ✅ |
| **Zestawienia** | Raporty miesięczne, eksport Excel/PDF | ✅ |
| **Import danych** | Parsowanie CSV/PDF, automatyczne wykrywanie plików | ✅ |

---

## 3. Struktura Danych

### Profile Aluminiowe
Numery profili: `9016`, `8866`, `8869`, `9671`, `9677`, `9315`

### Format Numeru Artykułu
```
19016050
│ │    │
│ │    └── 050 = numer koloru (kremowy)
│ └─────── 9016 = numer profilu
└───────── 1 = prefix (ignorowany)
```

### Kolory Typowe
| Kod | Nazwa |
|-----|-------|
| 000 | Biały |
| 050 | Kremowy |
| 730 | Antracyt |
| 750 | Biała folia |
| 148 | Krem folia |
| 830 | Granat |
| 890 | Jodłowy |

### Logika Przeliczania Bel
- `nowe bele` = sztangi 6m
- `reszta` = odpad w mm (zaokrąglić w górę do 500mm)
- Jeśli reszta > 0 → od nowych bel odjąć 1
- `reszta2` = 6000mm - zaokrąglona_reszta (przeliczyć na metry)

Przykłady:
- 3 bele, reszta 1324 → **2 bele + 4,5m**
- 4 bele, reszta 0 → **4 bele**
- 5 bel, reszta 3499 → **4 bele + 2,5m**

---

## 4. API Endpoints

### Orders
```
GET    /api/orders              # Lista zleceń z obliczonymi totals
GET    /api/orders/:id          # Szczegóły zlecenia
GET    /api/orders/by-number/:n # Zlecenie po numerze
PUT    /api/orders/:id          # Aktualizacja zlecenia
DELETE /api/orders/:id          # Usunięcie zlecenia
```

### Deliveries
```
GET    /api/deliveries          # Lista dostaw z obliczonymi totals
GET    /api/deliveries/:id      # Szczegóły dostawy
GET    /api/deliveries/calendar # Widok kalendarza
GET    /api/deliveries/:id/protocol # Protokół odbioru
POST   /api/deliveries          # Nowa dostawa
PUT    /api/deliveries/:id      # Aktualizacja
```

### Schuco
```
GET    /api/schuco/deliveries   # Lista dostaw Schuco
POST   /api/schuco/refresh      # Odśwież dane (Puppeteer scraper)
GET    /api/schuco/status       # Status ostatniego pobrania
GET    /api/schuco/logs         # Historia pobierań
```

### Imports
```
GET    /api/imports             # Historia importów
POST   /api/imports/upload      # Upload pliku CSV/PDF
GET    /api/imports/:id/preview # Podgląd przed zatwierdzeniem
POST   /api/imports/:id/approve # Zatwierdzenie importu
DELETE /api/imports/:id         # Usuń import
```

---

## 5. Przepływ Importu CSV

### Cykl Życia Importu
```
Upload → pending → preview → approve → processing → completed/error
```

### Etapy
1. **Upload** (`POST /api/imports/upload`)
   - Plik zapisywany na dysk
   - Rekord w `file_imports` ze statusem `pending`

2. **Preview** (`GET /api/imports/:id/preview`)
   - Parser czyta CSV, zwraca dane bez zapisu do bazy
   - Użytkownik weryfikuje zawartość

3. **Approve** (`POST /api/imports/:id/approve`)
   - Zapis do tabel: `orders`, `order_requirements`, `order_windows`
   - Opcje: `overwrite` (nadpisz) lub `add_new` (zachowaj istniejące)

### Konwersja Danych
```
CSV: 5 bel, reszta 3317mm
↓
Zaokrąglenie reszty: 3317 → 3500mm (do 500)
Odjęcie beli: 5 - 1 = 4 bele
Obliczenie metrów: (6000 - 3500) / 1000 = 2.5m
↓
Baza: beamsCount=4, meters=2.5
```

### Przykład CSV - Format Podstawowy
```csv
Numer zlecenia;Numer art.;Nowych bel;reszta
53529;18866000;5;3317
53529;19016000;2;3860

Lista okien i drzwi:
Lp.;Szerokosc;Wysokosc;Typ profilu;Ilosc sztuk;Referencja
1;3008;1185;BLOK;1;D4190
```

### Przykład CSV - Format Rozszerzony (Zalecany)
```csv
Klient: ABC Corporation; Projekt: Proj-2024-001; System: Profil 70; Termin realizacji: 2025-12-31; Dostawa PVC: 2025-12-15
Numer zlecenia;Numer art.;Nowych bel;reszta
53529;18866000;5;3317
53529;19016000;2;3860

Lista okien i drzwi:
Lp.;Szerokosc;Wysokosc;Typ profilu;Ilosc sztuk;Referencja
1;3008;1185;BLOK;1;D4190
```

**Objaśnienie:**
- Linia 1 (opcjonalna): Metadane zlecenia - dodaj te pola w dowolnej kolejności:
  - `Klient: Nazwa klienta`
  - `Projekt: Numer/nazwa projektu`
  - `System: Typ systemu/profilu`
  - `Termin realizacji: YYYY-MM-DD` (data w formacie ISO)
  - `Dostawa PVC: YYYY-MM-DD` (data w formacie ISO)
- Pozostałe linie: Dane techniczne zlecenia (obowiązkowe)

---

## 6. Architektura Bazy Danych

### Główne Tabele
| Tabela | Opis |
|--------|------|
| `orders` | Zlecenia produkcyjne |
| `order_requirements` | Zapotrzebowanie na profile (per zlecenie) |
| `order_windows` | Wymiary okien (do pakowania) |
| `deliveries` | Dostawy z datą i statusem |
| `delivery_orders` | Powiązanie dostaw ze zleceniami |
| `profiles` | Definicje profili aluminiowych |
| `colors` | Definicje kolorów |
| `warehouse_stock` | Stan magazynowy profili |
| `warehouse_orders` | Zamówienia magazynowe |

### Sługi do Obliczania Totals
Pola `totalWindows`, `totalSashes`, `totalGlasses`, `totalPallets`, `totalValue` są **obliczane dynamicznie** przez sługi:

```typescript
// OrderTotalsService
orderTotalsService.getOrderTotals(orderId)
// → { totalWindows, totalSashes, totalGlasses }

// DeliveryTotalsService
deliveryTotalsService.getDeliveryTotals(deliveryId)
// → { totalWindows, totalGlass, totalPallets, totalValue }
```

**Korzyść**: Dane zawsze aktualne, brak redundancji.

---

## 7. Integracja Schuco

### Opis
Automatyczne pobieranie danych o dostawach z systemu Schuco Connect przez Puppeteer scraper.

### Konfiguracja (.env)
```env
SCHUCO_EMAIL=email@firma.pl
SCHUCO_PASSWORD=haslo
SCHUCO_BASE_URL=https://connect.schueco.com/schueco/pl/
SCHUCO_HEADLESS=true
```

### Przepływ
1. Puppeteer loguje się do Schuco Connect
2. Nawiguje do strony zamówień z filtrem dat
3. Pobiera plik CSV klikając przycisk eksportu
4. Parser parsuje CSV (separator `;`, encoding UTF-8)
5. Dane zapisywane do tabeli `schuco_deliveries` (upsert)

### Wyświetlane Kolumny
Data zamówienia, Nr zamówienia, Zlecenie, Status wysyłki, Tydzień dostawy, Rodzaj zamówienia, Suma

---

## 8. Znane Problemy i TODO

### Do Naprawy (niski priorytet)
1. Możliwy memory leak w timeout uploadu (`api.ts`)
2. N+1 problem w pętli upsert (`schucoService.ts`)
3. Brak walidacji Zod w niektórych endpointach

### Tabele do Przeglądu
| Tabela | Status | Rekomendacja |
|--------|--------|--------------|
| `pallet_types` | Nieużywana | Usunąć lub połączyć z Delivery |
| `packing_rules` | Nieużywana | Usunąć |
| `file_imports` | Duplikuje okuc_imports | Scalić w `DataImport` |
| `working_days` | Nieużywana | Podłączyć do logiki dostaw |
| `settings` | Duplikuje okuc_settings | Scalić w `GlobalSettings` |

---

## 9. Komendy

### Development
```bash
# Uruchom dev server
pnpm run dev

# Build
pnpm run build

# Typecheck
pnpm run typecheck

# Migracja bazy
cd apps/api && npx prisma migrate dev

# Regeneruj Prisma Client
npx prisma generate
```

### Baza Danych
```bash
# Push schema bez migracji
npx prisma db push

# Otwórz Prisma Studio
npx prisma studio

# Seed danych
npx prisma db seed
```

---

## 10. Zmienne Środowiskowe

### Backend (apps/api/.env)
```env
DATABASE_URL="file:./prisma/dev.db"
PORT=3001
NODE_ENV=development

# Schuco
SCHUCO_EMAIL=
SCHUCO_PASSWORD=
SCHUCO_BASE_URL=https://connect.schueco.com/schueco/pl/
SCHUCO_HEADLESS=true
```

### Frontend (apps/web/.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 11. Historia Wersji (skrócona)

| Data | Zmiana |
|------|--------|
| 01.12.2025 | Naprawa błędów krytycznych (setTimeout, Prisma groupBy) |
| 01.12.2025 | Usunięcie modułu "Magazyn Okuć" |
| 28.11.2024 | Optymalizacja bazy danych, usunięcie redundantnych pól |
| 28.11.2024 | Implementacja sług OrderTotals i DeliveryTotals |

---

## 12. Kontakt i Wsparcie

Projekt rozwijany z pomocą **Claude Code** (Anthropic).

Zgłaszanie problemów: Bezpośrednio przez Claude Code lub dokumentację w repozytorium.

---

*Wygenerowano: 01.12.2025*
