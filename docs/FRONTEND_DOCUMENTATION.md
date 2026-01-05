# AKROBUD - Dokumentacja Frontendu

> Kompletna dokumentacja architektury, struktury i workflow aplikacji frontendowej

---

## Spis treści

1. [Przegląd systemu](#1-przegląd-systemu)
2. [Tech Stack](#2-tech-stack)
3. [Struktura katalogów](#3-struktura-katalogów)
4. [Routing i nawigacja](#4-routing-i-nawigacja)
5. [Moduły funkcjonalne (Features)](#5-moduły-funkcjonalne-features)
6. [Komponenty współdzielone](#6-komponenty-współdzielone)
7. [Zarządzanie stanem](#7-zarządzanie-stanem)
8. [Workflow użytkownika](#8-workflow-użytkownika)
9. [Integracje](#9-integracje)
10. [Wzorce i konwencje](#10-wzorce-i-konwencje)

---

## 1. Przegląd systemu

**AKROBUD** to system ERP dla firmy produkującej okna aluminiowe. Frontend to nowoczesna aplikacja **Next.js 15** z **React 18** oferująca:

- **Dashboard** z przeglądem systemu
- **Zarządzanie dostawami** z kalendarzem drag & drop
- **Magazyn profili** aluminiowych z śledzeniem stanu
- **Moduł szyb** z importem zamówień i dostaw
- **Import plików** CSV/PDF z walidacją
- **Optymalizację palet** dla dostaw
- **Raporty i zestawienia** z eksportem PDF

### Główne cechy architektury

| Cecha | Implementacja |
|-------|---------------|
| Architektura | Feature-based organization |
| Data fetching | TanStack Query (React Query) |
| UI Components | Shadcn/ui (Radix primitives) |
| Styling | TailwindCSS |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Real-time | WebSocket sync |

---

## 2. Tech Stack

### Core Framework

```
Next.js 15.5.7 (App Router)
├── React 18
├── TypeScript (strict mode)
└── App Router (folder-based routing)
```

### UI & Styling

```
TailwindCSS 3.4
├── Shadcn/ui (Radix UI based)
├── Lucide Icons
├── clsx / class-variance-authority
└── Responsive breakpoints (sm/md/lg/xl)
```

### Data Management

```
TanStack Query v5 (React Query)
├── Server state caching
├── Automatic refetching
├── Optimistic updates
└── Query invalidation
```

### Forms & Validation

```
React Hook Form
├── Zod schemas
├── zodResolver
└── Field-level validation
```

### Additional Libraries

| Library | Przeznaczenie |
|---------|---------------|
| @dnd-kit | Drag & Drop (kalendarz dostaw) |
| TanStack Table | Tabele danych |
| Recharts | Wykresy |
| date-fns | Formatowanie dat |
| axios/fetch | HTTP client |

---

## 3. Struktura katalogów

```
apps/web/src/
├── app/                          # Next.js App Router (routing)
│   ├── layout.tsx                # Root layout z Sidebar
│   ├── providers.tsx             # React Query, Theme providers
│   ├── page.tsx                  # Dashboard (/)
│   ├── dostawy/                  # Moduł dostaw
│   │   ├── page.tsx              # Kalendarz dostaw
│   │   ├── [id]/optymalizacja/   # Optymalizacja palet
│   │   └── components/           # Komponenty specyficzne dla dostaw
│   ├── magazyn/                  # Moduł magazynu
│   │   ├── akrobud/              # Magazyn AKROBUD
│   │   ├── pvc/                  # Magazyn PVC
│   │   └── dostawy-schuco/       # Dostawy Schuco
│   ├── szyby/                    # Menu szyb
│   ├── zamowienia-szyb/          # Zamówienia szyb
│   ├── dostawy-szyb/             # Dostawy szyb
│   ├── importy/                  # Zarządzanie importami
│   ├── zestawienia/              # Raporty
│   ├── ustawienia/               # Konfiguracja
│   └── archiwum/                 # Archiwum zleceń
│
├── features/                     # Moduły biznesowe (feature-based)
│   ├── dashboard/                # Dashboard
│   ├── deliveries/               # Dostawy
│   ├── orders/                   # Zlecenia
│   ├── glass/                    # Szyby
│   ├── warehouse/                # Magazyn
│   ├── pallets/                  # Optymalizacja palet
│   ├── imports/                  # Importy
│   └── settings/                 # Ustawienia
│
├── components/                   # Komponenty współdzielone
│   ├── layout/                   # Layout (Sidebar, Header)
│   ├── ui/                       # Shadcn/ui components
│   ├── loaders/                  # Loading skeletons
│   ├── charts/                   # Komponenty wykresów
│   └── search/                   # Global search
│
├── hooks/                        # Custom hooks
│   └── useRealtimeSync.ts        # WebSocket sync
│
├── lib/                          # Utilities
│   ├── api.ts                    # Unified API client
│   ├── api-client.ts             # Fetch helpers
│   └── utils.ts                  # Helpers (formatDate, cn)
│
└── types/                        # TypeScript types
    ├── common.ts                 # Shared types
    ├── order.ts                  # Order types
    ├── delivery.ts               # Delivery types
    └── ...                       # Per-entity types
```

### Feature module structure

Każdy moduł w `features/` ma spójną strukturę:

```
features/{feature-name}/
├── api/                  # API service layer
│   └── {feature}Api.ts   # Funkcje fetchApi
├── components/           # Komponenty UI
│   └── *.tsx
├── hooks/                # Custom hooks (useQuery, useMutation)
│   └── use*.ts
├── helpers/              # Utility functions
├── types/                # TypeScript types (opcjonalnie)
└── index.ts              # Public exports
```

---

## 4. Routing i nawigacja

### Mapa tras

| Ścieżka | Strona | Opis |
|---------|--------|------|
| `/` | Dashboard | Przegląd systemu, statystyki, alerty |
| `/magazyn/akrobud` | Magazyn AKROBUD | Stan magazynowy profili aluminiowych |
| `/magazyn/akrobud/szczegoly` | Szczegóły magazynu | Edycja stanu, remanent |
| `/magazyn/akrobud/profile-na-dostawy` | Profile na dostawy | Profile przypisane do dostaw |
| `/magazyn/pvc` | Magazyn PVC | Magazyn profili PVC |
| `/magazyn/dostawy-schuco` | Dostawy Schuco | Integracja z Schuco Connect |
| `/dostawy` | Kalendarz dostaw | Kalendarz z drag & drop |
| `/dostawy/[id]/optymalizacja` | Optymalizacja palet | Wizualizacja i optymalizacja palet |
| `/zamowienia-szyb` | Zamówienia szyb | Import i zarządzanie zamówieniami szyb |
| `/dostawy-szyb` | Dostawy szyb | Import dostaw szyb z CSV |
| `/szyby/statystyki` | Statystyki szyb | Analityka szyb wg dat |
| `/importy` | Importy | Zarządzanie importami CSV/PDF |
| `/zestawienia` | Zestawienia | Menu raportów |
| `/zestawienia/raporty` | Raporty miesięczne | Generowanie raportów |
| `/zestawienia/zlecenia` | Zestawienie zleceń | Raport wszystkich zleceń |
| `/ustawienia` | Ustawienia | Panel administracyjny |
| `/archiwum` | Archiwum | Zarchiwizowane zlecenia |

### Nawigacja (Sidebar)

```typescript
// components/layout/sidebar.tsx
const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'AKROBUD', href: '/magazyn/akrobud', icon: Warehouse },
  { name: 'Magazyn PVC', href: '/magazyn/pvc', icon: Box },
  { name: 'Dostawy Schuco', href: '/magazyn/dostawy-schuco', icon: Truck },
  {
    name: 'Szyby',
    href: '/szyby',
    icon: GlassWater,
    subItems: [
      { name: 'Zamówienia szyb', href: '/zamowienia-szyb', icon: FileText },
      { name: 'Dostawy szyb', href: '/dostawy-szyb', icon: Truck },
    ]
  },
  { name: 'Zestawienie miesięczne', href: '/zestawienia', icon: FileText },
  { name: 'Zestawienie zleceń', href: '/zestawienia/zlecenia', icon: FileText },
  { name: 'Importy', href: '/importy', icon: FolderInput },
  { name: 'Archiwum', href: '/archiwum', icon: Archive },
  { name: 'Ustawienia', href: '/ustawienia', icon: Settings },
];
```

### Layout

```
┌─────────────────────────────────────────────────────────┐
│                        AKROBUD                          │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ Sidebar  │              Main Content                    │
│          │                                              │
│ - Dashboard │  ┌─────────────────────────────────────┐  │
│ - AKROBUD   │  │  Header (title, alerts, search)     │  │
│ - Magazyn   │  ├─────────────────────────────────────┤  │
│ - Szyby     │  │                                     │  │
│ - Zestawienia │  │      Page Content                 │  │
│ - Importy   │  │                                     │  │
│ - Archiwum  │  │                                     │  │
│ - Ustawienia │  │                                     │  │
│          │  └─────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────┘
```

---

## 5. Moduły funkcjonalne (Features)

### 5.1 Dashboard

**Lokalizacja:** `features/dashboard/`

**Główny komponent:** `DashboardContent.tsx`

**Funkcjonalności:**
- 4 karty statystyk (aktywne zlecenia, nadchodzące dostawy, oczekujące importy, braki)
- Lista oczekujących importów (5 ostatnich)
- Panel alertów z priorytetami
- Podsumowanie 8 tygodni dostaw (okna/skrzydła/szyby)
- Lista nadchodzących dostaw (7 dni)

**API:**
```typescript
// api/dashboardApi.ts
getDashboard()      // → stats, pendingImports, upcomingDeliveries
getAlerts()         // → Alert[]
getWeeklyStats()    // → weeks[], summary
```

**Hooks:**
```typescript
useDashboard()      // Main dashboard data
useAlerts()         // System alerts
useWeeklyStats()    // 8-week delivery forecast
```

---

### 5.2 Deliveries (Dostawy)

**Lokalizacja:** `features/deliveries/`

**Główna strona:** `/dostawy`

**Funkcjonalności:**
- **Widok kalendarza** (tydzień/miesiąc/8 tygodni)
- **Widok listy** z tabelą
- **Drag & Drop** zleceń między dostawami
- **CRUD** dla dostaw
- **Protokół dostawy** (PDF)
- **Szczegóły zlecenia** w modalu

**Komponenty kluczowe:**
```
components/
├── DeliveriesTable.tsx       # Tabela dostaw
├── DeliveryDetails.tsx       # Panel szczegółów
├── DeliveryFilters.tsx       # Filtry (data, status)
├── DeliveriesListView.tsx    # Widok listowy
├── DragDropComponents.tsx    # Drag & Drop
└── DeliveryDialogs.tsx       # Modalne okna
```

**API:**
```typescript
getCalendar(month, year)     // Kalendarz dla miesiąca
getById(id)                  // Szczegóły dostawy
create(data)                 // Nowa dostawa
update(id, data)             // Aktualizacja
delete(id)                   // Usunięcie
addOrder(deliveryId, orderId)     // Dodaj zlecenie
removeOrder(deliveryId, orderId)  // Usuń zlecenie
moveOrder(from, orderId, to)      // Przenieś zlecenie
getProtocol(id)              // Protokół PDF
```

**Drag & Drop workflow:**
1. User chwyta zlecenie (`DraggableOrder`)
2. Przeciąga nad dostawą (`DroppableDelivery`)
3. Upuszcza → wywołanie `moveOrder` lub `addOrder`
4. Cache invalidation → UI update

---

### 5.3 Orders (Zlecenia)

**Lokalizacja:** `features/orders/`

**Funkcjonalności:**
- Lista zleceń z filtrowaniem
- Szczegóły zlecenia (modal)
- Status: new → in_progress → completed → archived
- Powiązanie z dostawami
- Import z plików

**API:**
```typescript
getAll(params?)              // Lista z filtrowaniem
getById(id)                  // Szczegóły
getTable(colorId)            // Tabela per kolor
getRequirementsTotals()      // Zapotrzebowanie
create(data)                 // Nowe zlecenie
update(id, data)             // Aktualizacja
archive(id)                  // Archiwizacja
unarchive(id)                // Przywrócenie
```

**Komponenty:**
```
components/
├── order-detail-modal.tsx    # Modal szczegółów
├── orders-stats-modal.tsx    # Statystyki
└── (inne komponenty specyficzne)
```

---

### 5.4 Glass (Szyby)

**Lokalizacja:** `features/glass/`

**Strony:**
- `/zamowienia-szyb` - Import i zarządzanie zamówieniami
- `/dostawy-szyb` - Import dostaw szyb

**Funkcjonalności:**
- Import zamówień z plików TXT
- Import dostaw z CSV
- Walidacja (matching zamówień z dostawami)
- Panel konfliktów
- Status tracking

**API:**
```typescript
// Glass Orders
getAll(filters)              // Lista zamówień
importFromTxt(file)          // Import TXT
getSummary(id)               // Podsumowanie (ordered/delivered)
getValidations(id)           // Wyniki walidacji

// Glass Deliveries
getAll(filters)              // Lista dostaw
importFromCsv(file)          // Import CSV
getLatestImport()            // Ostatni import
```

**Komponenty:**
```
components/
├── GlassOrdersTable.tsx          # Tabela zamówień
├── GlassDeliveriesTable.tsx      # Tabela dostaw
├── GlassOrderDetailModal.tsx     # Szczegóły + walidacja
├── GlassOrderImportSection.tsx   # Sekcja importu
├── GlassValidationPanel.tsx      # Panel walidacji
└── GlassOrderConflictModal.tsx   # Konflikty
```

---

### 5.5 Warehouse (Magazyn)

**Lokalizacja:** `features/warehouse/`

**Strony:**
- `/magazyn/akrobud` - Główny widok magazynu
- `/magazyn/akrobud/szczegoly` - Edycja stanu
- `/magazyn/akrobud/profile-na-dostawy` - Profile do dostaw

**Funkcjonalności:**
- Stan magazynowy per kolor
- Edycja ilości
- Remanent (monthly stocktaking)
- Historia zmian
- Zamówienia magazynowe
- Wykrywanie braków

**API:**
```typescript
getByColor(colorId)          // Stan dla koloru
updateStock(colorId, profileId, data)  // Aktualizacja
monthlyUpdate(data)          // Miesięczna aktualizacja
getShortages()               // Lista braków
getHistory(colorId)          // Historia zmian
```

**Komponenty:**
```
components/
├── ColorSidebar.tsx           # Sidebar z kolorami
├── WarehouseHistory.tsx       # Historia zmian
├── RemanentTable.tsx          # Tabela rementu
├── RemanentConfirmModal.tsx   # Potwierdzenie
└── FinalizeMonthModal.tsx     # Finalizacja miesiąca
```

---

### 5.6 Pallets (Optymalizacja palet)

**Lokalizacja:** `features/pallets/`

**Strona:** `/dostawy/[id]/optymalizacja`

**Funkcjonalności:**
- Algorytm optymalizacji pakowania
- Wizualizacja palet
- Eksport PDF
- Konfiguracja typów palet

**API:**
```typescript
getOptimization(deliveryId)      // Pobierz wynik
optimize(deliveryId, options)    // Uruchom algorytm
deleteOptimization(deliveryId)   // Usuń
getPalletTypes()                 // Typy palet
exportToPdf(deliveryId)          // Eksport PDF
```

**Wizualizacja:**
- Canvas-based rendering
- Kolorowanie per zlecenie
- Legenda
- Statystyki wypełnienia

---

### 5.7 Imports (Importy)

**Lokalizacja:** `features/imports/`

**Strona:** `/importy`

**Funkcjonalności:**
- Upload CSV (uzyte_bele)
- Upload PDF (ceny_pdf)
- Import z folderu
- Podgląd przed zatwierdzeniem
- Rozwiązywanie konfliktów
- Historia importów

**API:**
```typescript
upload(file)                 // Upload pliku
getPending()                 // Oczekujące importy
getPreview(id)               // Podgląd danych
approve(id, action?)         // Zatwierdź
reject(id)                   // Odrzuć
```

**Workflow importu:**
1. Upload pliku → utworzenie Import (status: pending)
2. Podgląd danych (preview)
3. Rozwiązanie konfliktów (jeśli są)
4. Approve → przetworzenie danych
5. Aktualizacja magazynu/zleceń

---

### 5.8 Settings (Ustawienia)

**Lokalizacja:** `features/settings/`

**Strona:** `/ustawienia`

**Zakładki:**
- **Ogólne** - podstawowe ustawienia
- **Kolory** - CRUD kolorów profili
- **Profile** - CRUD profili aluminiowych
- **Typy palet** - CRUD typów palet
- **Foldery** - ścieżki systemowe
- **Folder użytkownika** - folder per użytkownik
- **Glass Watch** - monitorowanie szyb
- **Głębokości profili** - konfiguracja

---

## 6. Komponenty współdzielone

### 6.1 Layout

| Komponent | Lokalizacja | Opis |
|-----------|-------------|------|
| `Sidebar` | `layout/sidebar.tsx` | Nawigacja boczna (desktop + mobile) |
| `Header` | `layout/header.tsx` | Nagłówek z tytułem, alertami, search |

### 6.2 UI Components (Shadcn/ui)

```
components/ui/
├── button.tsx           # Button variants
├── card.tsx             # Card, CardHeader, CardContent
├── dialog.tsx           # Modal dialogs
├── input.tsx            # Form inputs
├── table.tsx            # Table components
├── tabs.tsx             # Tab navigation
├── badge.tsx            # Status badges
├── toast.tsx            # Notifications
├── skeleton.tsx         # Loading skeletons
├── dropdown-menu.tsx    # Dropdown menus
├── select.tsx           # Select inputs
├── checkbox.tsx         # Checkboxes
├── slider.tsx           # Range sliders
└── ... (more)
```

### 6.3 Custom Components

| Komponent | Opis |
|-----------|------|
| `LoadingOverlay` | Overlay podczas ładowania |
| `SyncIndicator` | Wskaźnik synchronizacji real-time |
| `EmptyState` | Stan pusty z ikoną i opisem |
| `ErrorUI` | Wyświetlanie błędów z retry |
| `FolderBrowser` | Przeglądarka folderów |
| `GlobalSearch` | Wyszukiwarka (Cmd+K) |

### 6.4 Loaders

```
components/loaders/
├── DashboardSkeleton.tsx   # Dashboard loading
├── TableSkeleton.tsx       # Table loading
└── CardSkeleton.tsx        # Card loading
```

---

## 7. Zarządzanie stanem

### 7.1 Server State (React Query)

**Primary pattern** - TanStack Query dla wszystkich danych z API:

```typescript
// Pobieranie danych
const { data, isLoading, error } = useQuery({
  queryKey: ['deliveries', filters],
  queryFn: () => deliveriesApi.getAll(filters),
});

// Mutacje
const mutation = useMutation({
  mutationFn: deliveriesApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    toast({ title: 'Sukces', description: 'Dostawa utworzona' });
  },
});
```

### 7.2 Query Keys Convention

```typescript
// Pattern: [entity, ...filters]
['deliveries']                    // All deliveries
['deliveries', 'calendar', month] // Calendar view
['deliveries', id]                // Single delivery
['orders']                        // All orders
['orders', colorId]               // Orders by color
['warehouse', colorId]            // Stock by color
```

### 7.3 Local State

```typescript
// UI state
const [isOpen, setIsOpen] = useState(false);
const [selectedId, setSelectedId] = useState<string | null>(null);
const [filters, setFilters] = useState<Filters>({});
```

### 7.4 Real-time Sync (WebSocket)

```typescript
// hooks/useRealtimeSync.ts
useRealtimeSync(); // W providers.tsx

// Events obsługiwane:
// - delivery:created/updated/deleted
// - order:created/updated/deleted
// - warehouse:stock_updated
```

**Flow:**
1. WebSocket connect z tokenem
2. Heartbeat ping/pong (30s)
3. `dataChange` event → query invalidation
4. UI auto-refresh

---

## 8. Workflow użytkownika

### 8.1 Dashboard - Przegląd systemu

```
User → Dashboard (/)
  ↓
┌─────────────────────────────────────────────┐
│ Statystyki (4 karty)                        │
│ [Zlecenia] [Dostawy] [Importy] [Braki]     │
├─────────────────────────────────────────────┤
│ Oczekujące importy    │    Alerty          │
│ - Import 1 [Podgląd]  │    - Alert 1 [!]   │
│ - Import 2 [Podgląd]  │    - Alert 2 [!!]  │
├─────────────────────────────────────────────┤
│ Podsumowanie 8 tygodni (okna/skrzydła/szyby)│
├─────────────────────────────────────────────┤
│ Nadchodzące dostawy (7 dni)                 │
└─────────────────────────────────────────────┘
```

### 8.2 Zarządzanie dostawami

```
User → /dostawy
  ↓
[Wybór widoku: Kalendarz | Lista]
  ↓
┌── Kalendarz ──────────────────────┐
│ [← Poprzedni] [Tydzień] [Następny →] │
│                                    │
│  Pon  Wto  Śro  Czw  Pią         │
│  [D1] [D2]      [D3]              │
│                                    │
│ Nieasignowane zlecenia:           │
│ [Order1] [Order2] [Order3]        │
└───────────────────────────────────┘
  ↓
[Drag & Drop zlecenia → dostawa]
  ↓
[Klik na dostawę → Szczegóły]
  ↓
[Optymalizacja palet] → /dostawy/{id}/optymalizacja
```

### 8.3 Import plików (CSV/PDF)

```
User → /importy
  ↓
┌─────────────────────────────────────┐
│ [Import z folderu] [CSV] [PDF]     │
└─────────────────────────────────────┘
  ↓
[Upload pliku]
  ↓
[Podgląd danych - ImportPreviewCard]
  ↓
┌─ Konflikty? ─────────────────────────┐
│ [Zachowaj stare] [Użyj nowych]      │
│ [Połącz]                             │
└──────────────────────────────────────┘
  ↓
[Zatwierdź] → Przetworzenie
  ↓
[Toast: "Import zakończony"]
```

### 8.4 Magazyn - Stan i remanent

```
User → /magazyn/akrobud
  ↓
┌─────────────────────────────────────┐
│ [Sidebar: Lista kolorów]           │
│ ├─ Biały RAL9016                   │
│ ├─ Antracyt RAL7016               │
│ └─ ...                             │
└─────────────────────────────────────┘
  ↓
[Wybór koloru]
  ↓
┌─────────────────────────────────────┐
│ Tabela profili dla koloru          │
│ Profil | Stan | Zamówione | Dostępne│
│ P1     | 100  | 50        | 50      │
│ P2     | 200  | 80        | 120     │
└─────────────────────────────────────┘
  ↓
[Szczegóły] → /magazyn/akrobud/szczegoly
  ↓
[Edycja stanu / Remanent]
```

### 8.5 Zamówienia szyb

```
User → /zamowienia-szyb
  ↓
[Upload TXT z zamówieniem]
  ↓
┌─────────────────────────────────────┐
│ Lista zamówień                      │
│ [Zlecenie] [Status] [Walidacja]    │
│ ZAM-001   Pending   ⚠️ 3 issues    │
└─────────────────────────────────────┘
  ↓
[Klik → Szczegóły + Walidacja]
  ↓
┌─────────────────────────────────────┐
│ Pozycje zamówienia                  │
│ + Panel walidacji (matched/missing)│
└─────────────────────────────────────┘
```

### 8.6 Optymalizacja palet

```
User → /dostawy/{id}/optymalizacja
  ↓
[Uruchom optymalizację]
  ↓
┌─────────────────────────────────────┐
│ Wizualizacja palet                  │
│ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │Paleta│ │Paleta│ │Paleta│        │
│ │  1   │ │  2   │ │  3   │        │
│ └──────┘ └──────┘ └──────┘        │
│                                     │
│ Wykorzystanie: 87%                  │
│ [Legenda kolorów per zlecenie]     │
└─────────────────────────────────────┘
  ↓
[Eksport PDF]
```

### 8.7 Ustawienia

```
User → /ustawienia
  ↓
┌─────────────────────────────────────┐
│ [Tabs: Ogólne|Kolory|Profile|...]  │
├─────────────────────────────────────┤
│ Tab: Kolory                         │
│ [+ Nowy kolor]                      │
│ ┌───────────────────────────────┐  │
│ │ RAL9016 Biały  [Edit] [Delete]│  │
│ │ RAL7016 Antracyt [Edit][Delete]│ │
│ └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 9. Integracje

### 9.1 WebSocket (Real-time)

```typescript
// URL: ws://localhost:3001/ws?token=XXX

// Events:
interface DataChangeEvent {
  type: 'dataChange';
  entity: 'delivery' | 'order' | 'warehouse';
  action: 'created' | 'updated' | 'deleted';
  data: unknown;
}

// Heartbeat: ping/pong every 30s
// Auto-reconnect: max 10 attempts
```

### 9.2 Schuco Connect

Backend (Puppeteer) pobiera dane z Schuco Connect. Frontend wyświetla w `/magazyn/dostawy-schuco`:
- Lista dostaw od Schuco
- Linki do zamówień
- Status powiązania z zleceniami

### 9.3 PDF Export

| Funkcja | Endpoint |
|---------|----------|
| Protokół dostawy | `GET /api/deliveries/{id}/protocol` |
| Optymalizacja palet | `GET /api/pallets/export/{deliveryId}` |
| Zlecenie | `GET /api/orders/{id}/pdf` |

### 9.4 File Upload

```typescript
// lib/api-client.ts
async function uploadFile(endpoint: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  return fetch(endpoint, { method: 'POST', body: formData });
}
```

---

## 10. Wzorce i konwencje

### 10.1 Dynamic Imports (Next.js 15)

```typescript
// ZAWSZE z .then((mod) => mod.default)
const Component = dynamic(
  () => import('./Component').then((mod) => mod.default),
  {
    loading: () => <Skeleton />,
    ssr: false,
  }
);
```

### 10.2 Data Fetching Pattern

```typescript
// Feature API layer
// features/{feature}/api/{feature}Api.ts
export const deliveriesApi = {
  getAll: async (params?: Params): Promise<Delivery[]> => {
    return fetchApi('/api/deliveries', { params });
  },
  // ...
};

// Feature hook layer
// features/{feature}/hooks/use{Feature}.ts
export function useDeliveries(params?: Params) {
  return useQuery({
    queryKey: ['deliveries', params],
    queryFn: () => deliveriesApi.getAll(params),
  });
}

// Component layer
function DeliveriesList() {
  const { data, isLoading, error } = useDeliveries();
  // render
}
```

### 10.3 Mutation Pattern

```typescript
export function useCreateDelivery() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deliveriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      toast({ title: 'Sukces', description: 'Dostawa utworzona' });
    },
    onError: (error) => {
      toast({
        title: 'Błąd',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}
```

### 10.4 Error Handling

```typescript
// Zawsze używaj ErrorUI lub toast
if (error) {
  return (
    <ErrorUI
      variant="centered"
      title="Błąd ładowania"
      message="Spróbuj ponownie"
      onRetry={refetch}
      error={error}
    />
  );
}
```

### 10.5 Loading States

```typescript
// Suspense boundary (preferowane)
<Suspense fallback={<Skeleton />}>
  <DataComponent />
</Suspense>

// Lub conditional rendering
{isLoading ? <Skeleton /> : <Content data={data} />}
```

### 10.6 TypeScript Conventions

```typescript
// Props interface
interface DeliveryCardProps {
  delivery: Delivery;
  onSelect?: (id: string) => void;
  className?: string;
}

// Component with FC type
export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  onSelect,
  className,
}) => {
  // ...
};

// Export default at bottom
export default DeliveryCard;
```

### 10.7 Styling Conventions

```typescript
// TailwindCSS utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">

// Conditional classes with clsx/cn
<div className={cn(
  'p-4 rounded-lg',
  isActive ? 'bg-blue-100 border-blue-500' : 'bg-gray-50'
)}>

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

---

## Podsumowanie

Frontend AKROBUD to nowoczesna, dobrze zorganizowana aplikacja Next.js 15 z:

1. **Feature-based architecture** - każdy moduł jest autonomiczny
2. **React Query** - efektywne zarządzanie stanem serwera
3. **Real-time sync** - WebSocket dla live updates
4. **Shadcn/ui** - spójne komponenty UI
5. **TypeScript strict** - pełne typowanie
6. **Responsive design** - mobile-first z TailwindCSS

Kluczowe workflow:
- Dashboard jako centrum informacji
- Kalendarz dostaw z drag & drop
- Import plików z walidacją i konfliktami
- Magazyn z remanentem
- Optymalizacja palet z wizualizacją

---

*Dokumentacja wygenerowana: 2025-12-30*
*Wersja: 1.0.0*
