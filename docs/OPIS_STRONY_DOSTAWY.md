# Strona Dostawy - Szczegółowa Dokumentacja

> **Ścieżka:** `/dostawy` (apps/web/src/app/dostawy/)
> **Wersja:** 1.0
> **Data:** 2026-02-02

---

## 1. Przegląd

Strona Dostawy to centralne miejsce zarządzania wysyłkami okien do klientów. Umożliwia:
- Planowanie dostaw w kalendarzu
- Przypisywanie zleceń do dostaw metodą drag & drop
- Śledzenie gotowości dostaw (profile, szyby, okucia)
- Generowanie protokołów odbioru PDF
- Optymalizację rozmieszczenia na paletach

---

## 2. Struktura plików

```
apps/web/src/app/dostawy/
├── page.tsx                          # Entry point z Suspense
├── DostawyPageContent.tsx            # Główny komponent (373 linii)
│
├── components/
│   ├── DeliveryCalendar.tsx          # Widok kalendarza (421 linii)
│   ├── DeliveriesListView.tsx        # Widok listy (333 linii)
│   ├── DayCell.tsx                   # Komórka dnia w kalendarzu (203 linii)
│   ├── UnassignedOrdersPanel.tsx     # Panel zleceń bez dostawy (138 linii)
│   ├── DeliveryDetails.tsx           # Szczegóły dostawy (189 linii)
│   ├── DeliveryActions.tsx           # Przyciski akcji (81 linii)
│   ├── DeliveryFilters.tsx           # Filtry widoku listy
│   ├── DeliveriesTable.tsx           # Tabela dostaw
│   ├── WeekSummary.tsx               # Podsumowanie tygodnia
│   ├── BlockedItemsAlert.tsx         # Alert o zablokowanych elementach
│   │
│   └── dialogs/
│       ├── CreateDeliveryDialog.tsx  # Tworzenie dostawy
│       ├── DeliveryDetailsDialog.tsx # Modal szczegółów
│       ├── DeleteDeliveryConfirmDialog.tsx
│       ├── AddItemDialog.tsx         # Dodawanie artykułów
│       ├── CompleteOrdersDialog.tsx  # Kończenie zleceń
│       ├── BulkUpdateDatesDialog.tsx # Masowa zmiana dat
│       ├── QuickDeliveryDialog.tsx   # Szybkie przypisywanie
│       └── VariantTypeSelectionDialog.tsx
│
├── weryfikacja/
│   └── page.tsx                      # Weryfikacja listy Akrobud
│
└── [id]/
    └── optymalizacja/
        └── page.tsx                  # Optymalizacja palet
```

---

## 3. Architektura komponentów

### 3.1 Hierarchia komponentów

```
page.tsx (Suspense boundary)
└── DostawyPageContent
    ├── Header
    │   ├── ViewModeToggle (kalendarz/lista)
    │   ├── QuickDeliveryButton
    │   └── ExportButton
    │
    ├── DndContext (drag & drop wrapper)
    │   ├── [viewMode === 'calendar']
    │   │   └── DeliveryCalendar
    │   │       ├── NavigationControls
    │   │       ├── ViewModeButtons (tydzień/miesiąc/8 tygodni)
    │   │       ├── WeekViewGrid / MonthViewGrid
    │   │       │   └── DayCell (dla każdego dnia)
    │   │       │       ├── HolidayBadges (PL/DE)
    │   │       │       ├── DeliveryCards
    │   │       │       │   └── ReadinessIcon
    │   │       │       └── DayStats
    │   │       └── WeekSummary
    │   │
    │   └── [viewMode === 'list']
    │       └── DeliveriesListView
    │           ├── DeliveryFilters
    │           ├── SummaryStats
    │           └── DeliveriesTable
    │               └── DeliveryRow (expandable)
    │                   ├── DeliveryDetails
    │                   └── DeliveryActions
    │
    └── UnassignedOrdersPanel (prawy panel)
        └── DraggableOrderWithContextMenu (dla każdego zlecenia)

    + Lazy-loaded Dialogs (13 dialogów)
```

### 3.2 Lazy Loading

Wszystkie ciężkie komponenty są ładowane dynamicznie:

```typescript
// DostawyPageContent.tsx
const DeliveriesListView = dynamic(() => import('./components/DeliveriesListView'), { ssr: false });
const DeliveryCalendar = dynamic(() => import('./components/DeliveryCalendar'), { ssr: false });
const UnassignedOrdersPanel = dynamic(() => import('./components/UnassignedOrdersPanel'), { ssr: false });

// Dialogi
const CreateDeliveryDialog = dynamic(() => import('./components/dialogs/CreateDeliveryDialog'), { ssr: false });
const DeliveryDetailsDialog = dynamic(() => import('./components/dialogs/DeliveryDetailsDialog'), { ssr: false });
const QuickDeliveryDialog = dynamic(() => import('./components/QuickDeliveryDialog'), { ssr: false });
// ... i 10 innych dialogów
```

**Korzyści:**
- Szybsze pierwsze ładowanie strony
- Dialogi ładowane tylko gdy potrzebne
- Mniejszy bundle główny

---

## 4. Dwa tryby widoku

### 4.1 Widok kalendarza (domyślny)

**Plik:** `DeliveryCalendar.tsx`

**Funkcjonalności:**
- 3 tryby wyświetlania: tydzień, miesiąc, 8 tygodni
- Nawigacja strzałkami ← →
- Przycisk "Dziś" do powrotu do bieżącego tygodnia
- Każdy dzień pokazuje listę dostaw
- Kolorowe ikony gotowości (🟢 gotowe, 🟡 warunkowe, 🔴 zablokowane)
- Oznaczenie świąt (PL/DE)
- Podsumowanie tygodnia (okna, skrzydła, szyby)

**Stany komórki dnia (DayCell):**
```typescript
// ReadinessIcon colors
'ready'       → 🟢 Zielona - wszystko gotowe
'conditional' → 🟡 Żółta - brakuje czegoś niekrytycznego
'blocked'     → 🔴 Czerwona - brakuje elementów krytycznych
'pending'     → ⚪ Szara - w trakcie sprawdzania
```

**Drag & Drop:**
- Zlecenia można przeciągać z UnassignedOrdersPanel na dzień
- Zlecenia można przenosić między dostawami
- Wizualne podświetlenie strefy upuszczania

### 4.2 Widok listy

**Plik:** `DeliveriesListView.tsx`

**Funkcjonalności:**
- Filtry czasowe: 7 dni, 14 dni, 30 dni, archiwum
- Możliwość ustawienia własnej daty początkowej
- Rozwijane wiersze ze szczegółami
- Podsumowanie statystyk (okna, skrzydła, szyby, wartość PLN)
- Sortowanie po dacie

**Akcje na dostawie:**
1. **Weryfikuj** - przekierowanie do `/dostawy/weryfikacja?date=YYYY-MM-DD`
2. **Zakończ** - oznacz zlecenia jako wyprodukowane
3. **Palety** - optymalizacja rozmieszczenia `/dostawy/{id}/optymalizacja`
4. **Protokół** - pobierz PDF protokołu odbioru

---

## 5. Custom Hooks

### 5.1 useDeliveryFilters

```typescript
// Zarządza filtrami kalendarza
const filters = useDeliveryFilters();
// filters.currentMonth, filters.currentYear
// filters.viewMode (week/month/8weeks)
// filters.navigateNext(), filters.navigatePrev()
```

### 5.2 useDeliveryStats

```typescript
// Oblicza statystyki dla widocznych dostaw
const stats = useDeliveryStats({
  deliveries,
  workingDays,
  holidays
});
// stats.totalWindows, stats.totalSashes, stats.totalGlasses
// stats.weekSummaries
```

### 5.3 useDeliveryActions

```typescript
// Obsługuje mutacje (tworzenie, usuwanie, przenoszenie)
const actions = useDeliveryActions({
  onCreateSuccess: () => {},
  onDeleteSuccess: () => {},
  onAssignSuccess: () => {}
});
// actions.createDelivery(date)
// actions.deleteDelivery(id)
// actions.assignOrder(deliveryId, orderId)
// actions.moveOrder(fromDeliveryId, orderId, toDeliveryId)
```

### 5.4 useDeliverySelection

```typescript
// Zarządza zaznaczeniem zleceń (multi-select)
const selection = useDeliverySelection();
// selection.selectedOrderIds
// selection.toggleSelection(orderId)
// selection.clearSelection()
// selection.selectAll(orderIds)
```

### 5.5 useDeliveryExport

```typescript
// Eksport protokołu PDF
const { downloadProtocol, isDownloading } = useDeliveryExport();
// downloadProtocol(deliveryId)
```

### 5.6 useDeliveriesCalendar (z features/deliveries/hooks)

```typescript
// Pobieranie danych kalendarza z Suspense
const { data } = useDeliveriesCalendar([
  { month: 1, year: 2026 },
  { month: 2, year: 2026 }
]);
// data.deliveries - lista dostaw
// data.monthsData - metadane miesięcy
```

---

## 6. API Endpoints

### 6.1 Główne endpointy

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/deliveries` | Lista dostaw z filtrami |
| GET | `/api/deliveries/calendar?month=X&year=Y` | Dane kalendarza |
| GET | `/api/deliveries/:id` | Szczegóły dostawy |
| POST | `/api/deliveries` | Utwórz dostawę |
| PUT | `/api/deliveries/:id` | Aktualizuj dostawę |
| DELETE | `/api/deliveries/:id` | Usuń dostawę (soft delete) |

### 6.2 Operacje na zleceniach

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/deliveries/:id/orders` | Przypisz zlecenie |
| DELETE | `/api/deliveries/:id/orders/:orderId` | Usuń zlecenie |
| POST | `/api/deliveries/:id/move-order` | Przenieś zlecenie |
| POST | `/api/deliveries/:id/complete` | Zakończ zlecenia |

### 6.3 Quick Delivery (szybkie przypisywanie)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/deliveries/validate-orders` | Waliduj numery zleceń |
| POST | `/api/deliveries/bulk-assign` | Masowe przypisanie |
| GET | `/api/deliveries/for-date?date=X` | Dostawy na datę |
| GET | `/api/deliveries/preview-number?date=X` | Podgląd numeru |

### 6.4 Protokół i artykuły

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/deliveries/:id/protocol` | Pobierz protokół (JSON) |
| GET | `/api/deliveries/:id/protocol/pdf` | Pobierz PDF |
| POST | `/api/deliveries/:id/items` | Dodaj artykuł |
| DELETE | `/api/deliveries/:id/items/:itemId` | Usuń artykuł |

---

## 7. Drag & Drop (@dnd-kit)

### 7.1 Konfiguracja

```typescript
// DostawyPageContent.tsx
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // minimalna odległość przed aktywacją
    },
  })
);

<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  {/* ... */}
  <DragOverlay>
    {activeOrder && <OrderCard order={activeOrder} isDragging />}
  </DragOverlay>
</DndContext>
```

### 7.2 Typy draggable/droppable

**Draggable (przeciągalne):**
- Zlecenia z UnassignedOrdersPanel
- Zlecenia z istniejących dostaw

**Droppable (cele upuszczenia):**
- Komórki dni w kalendarzu
- Istniejące dostawy

### 7.3 Obsługa upuszczenia

```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (!over) return;

  const orderId = active.id as number;
  const targetType = over.data.current?.type;

  if (targetType === 'day') {
    // Utwórz nową dostawę na ten dzień lub dodaj do istniejącej
    const date = over.data.current?.date;
    actions.assignOrderToDate(orderId, date);
  } else if (targetType === 'delivery') {
    // Przenieś do istniejącej dostawy
    const deliveryId = over.data.current?.deliveryId;
    actions.moveOrder(orderId, deliveryId);
  }
};
```

---

## 8. Dialogi

### 8.1 CreateDeliveryDialog
**Cel:** Tworzenie nowej dostawy
**Pola:**
- Data dostawy (wymagane)
- Notatki (opcjonalne)

### 8.2 DeliveryDetailsDialog
**Cel:** Podgląd i edycja szczegółów dostawy
**Sekcje:**
- Lista zleceń z wartościami (PLN/EUR)
- Dodatkowe artykuły
- Notatki
- ReadinessChecklist (gotowość wysyłki)
- BlockedItemsAlert (alert o blokadach)

### 8.3 QuickDeliveryDialog
**Cel:** Szybkie przypisywanie wielu zleceń
**Workflow:**
1. Wklej/wpisz numery zleceń (jeden na linię lub przecinki)
2. System waliduje: istnieje? już przypisane?
3. Wybierz dostawę (istniejącą lub utwórz nową)
4. Potwierdź przypisanie

**Typy wyników walidacji:**
```typescript
interface ValidatedOrder {
  orderNumber: string;
  status: 'found' | 'not_found' | 'already_assigned';
  currentDelivery?: { deliveryId, deliveryNumber, deliveryDate };
  orderInfo?: { client, totalWindows, status };
}
```

### 8.4 CompleteOrdersDialog
**Cel:** Oznaczenie zleceń jako wyprodukowanych
**Pola:**
- Data produkcji (wymagane)

### 8.5 BulkUpdateDatesDialog
**Cel:** Masowa zmiana dat dostaw
**Pola:**
- Nowa data
- Lista zleceń do aktualizacji

### 8.6 AddItemDialog
**Cel:** Dodanie artykułu do dostawy (nie-okno)
**Pola:**
- Typ artykułu
- Opis
- Ilość

### 8.7 DeleteDeliveryConfirmDialog
**Cel:** Potwierdzenie usunięcia dostawy
**Uwaga:** Soft delete (zachowuje w bazie z deletedAt)

### 8.8 VariantTypeSelectionDialog
**Cel:** Wybór typu wariantu przy tworzeniu

---

## 9. System gotowości (Readiness)

### 9.1 Poziomy gotowości

```typescript
type ReadinessStatus = 'ready' | 'conditional' | 'blocked' | 'pending';
```

| Status | Ikona | Znaczenie |
|--------|-------|-----------|
| `ready` | 🟢 | Wszystkie elementy skompletowane |
| `conditional` | 🟡 | Brakuje niekrytycznych elementów |
| `blocked` | 🔴 | Brakuje krytycznych elementów |
| `pending` | ⚪ | Trwa sprawdzanie |

### 9.2 Co jest sprawdzane

**Elementy krytyczne (blokujące):**
- Profile aluminiowe
- Szyby zespolone
- Okucia (klamki, zawias)

**Elementy niekrytyczne:**
- Uszczelki
- Śruby montażowe
- Elementy wykończeniowe

### 9.3 ReadinessChecklist component

```typescript
<ReadinessChecklist
  type="shipping"
  entityId={delivery.id}
  className="mb-2"
/>
```

Wyświetla checklistę z ikonami ✓/✗ dla każdego elementu.

### 9.4 BlockedItemsAlert component

```typescript
<BlockedItemsAlert deliveryId={delivery.id} />
```

Wyświetla alert jeśli są zablokowane elementy z listą brakujących.

---

## 10. Protokół odbioru (PDF)

### 10.1 Generowanie

```typescript
const { downloadProtocol, isDownloading } = useDeliveryExport();

<Button
  onClick={() => downloadProtocol(deliveryId)}
  disabled={isDownloading}
>
  {isDownloading ? 'Generowanie...' : 'Protokół PDF'}
</Button>
```

### 10.2 Zawartość protokołu

1. **Nagłówek:**
   - Logo firmy
   - Numer dostawy
   - Data dostawy
   - Data wygenerowania

2. **Lista zleceń:**
   - Numer zlecenia
   - Referencje klienta
   - Ilość okien/skrzydeł/szyb
   - Wartość PLN/EUR

3. **Dodatkowe artykuły:**
   - Typ
   - Opis
   - Ilość

4. **Podsumowanie:**
   - Suma okien
   - Suma wartości
   - Miejsce na podpis

### 10.3 Nazwa pliku

```
protokol_dostawy_{deliveryId}_{YYYY-MM-DD}.pdf
```

---

## 11. Integracje z innymi modułami

### 11.1 Zlecenia (Orders)
- Pobieranie zleceń bez dostawy
- Przypisywanie/usuwanie z dostawy
- Aktualizacja statusu (completed)

### 11.2 Magazyn profili
- Sprawdzanie dostępności profili
- Rezerwacja na dostawę

### 11.3 Magazyn szyb
- Sprawdzanie zamówień szyb
- Status dostawy szyb

### 11.4 Optymalizacja palet
- Link do `/dostawy/{id}/optymalizacja`
- Rozmieszczenie okien na paletach

### 11.5 Weryfikacja Akrobud
- Link do `/dostawy/weryfikacja?date=X`
- Porównanie z listą Akrobud

---

## 12. Optymalizacja wydajności

### 12.1 Lazy loading dialogów

Wszystkie dialogi ładowane dopiero przy pierwszym otwarciu:

```typescript
const QuickDeliveryDialog = dynamic(
  () => import('./components/QuickDeliveryDialog'),
  { ssr: false }
);
```

### 12.2 Memoizacja

```typescript
// Kosztowne obliczenia są memoizowane
const summaryStats = useMemo(() => {
  // ... obliczenia
}, [deliveries]);

// Handlery są stabilne
const handleToggle = useCallback((id: number) => {
  // ...
}, []);
```

### 12.3 Cache React Query

```typescript
// 2 minuty staleTime
staleTime: 2 * 60 * 1000,

// Invalidacja przy zmianach
queryClient.invalidateQueries({ queryKey: ['deliveries-calendar'] });
```

### 12.4 Skeleton loaders

Zamiast spinnerów - skeletony zachowujące layout:

```typescript
{isLoading ? (
  <TableSkeleton rows={10} columns={7} />
) : (
  <DeliveriesTable ... />
)}
```

---

## 13. Obsługa błędów

### 13.1 Toast notifications

```typescript
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';

// Sukces
showSuccessToast('Dostawa utworzona', 'Pomyślnie utworzono dostawę na 2026-02-15');

// Błąd
showErrorToast('Błąd przypisywania', getErrorMessage(error));
```

### 13.2 Error boundaries

Strona ma boundary na poziomie page.tsx:

```typescript
export default function DostawyPage() {
  return (
    <Suspense fallback={<DeliveriesPageSkeleton />}>
      <DostawyPageContent />
    </Suspense>
  );
}
```

### 13.3 Walidacja formularzy

Dialogi używają React Hook Form + Zod:

```typescript
const schema = z.object({
  deliveryDate: z.string().min(1, 'Data jest wymagana'),
  notes: z.string().optional(),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
});
```

---

## 14. Responsywność

### 14.1 Breakpoints

```css
/* Mobile first approach */
sm: 640px   /* Tablet portrait */
md: 768px   /* Tablet landscape */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

### 14.2 Adaptacja widoków

**Mobile (< 768px):**
- UnassignedOrdersPanel jako drawer z dołu
- Kalendarz w trybie tygodniowym
- Kompaktowe karty dostaw

**Desktop (≥ 1024px):**
- UnassignedOrdersPanel jako sidebar
- Pełny kalendarz miesięczny
- Rozwinięte szczegóły

---

## 15. URL i nawigacja

### 15.1 Query parameters

| Parametr | Opis | Przykład |
|----------|------|----------|
| `order` | ID zlecenia do podświetlenia | `/dostawy?order=123` |
| `date` | Data do nawigacji | `/dostawy?date=2026-02-15` |
| `view` | Tryb widoku | `/dostawy?view=list` |

### 15.2 Powiązane strony

| Ścieżka | Opis |
|---------|------|
| `/dostawy` | Główna strona dostaw |
| `/dostawy/weryfikacja` | Weryfikacja listy Akrobud |
| `/dostawy/{id}/optymalizacja` | Optymalizacja palet |

---

## 16. Uprawnienia

### 16.1 Role z dostępem

| Rola | Podgląd | Edycja | Usuwanie |
|------|---------|--------|----------|
| `admin` | ✓ | ✓ | ✓ |
| `manager` | ✓ | ✓ | ✓ |
| `operator` | ✓ | ✓ | ✗ |
| `viewer` | ✓ | ✗ | ✗ |

### 16.2 Akcje wymagające uprawnień

- **Tworzenie dostawy:** manager, admin
- **Usuwanie dostawy:** admin
- **Przypisywanie zleceń:** operator+
- **Generowanie protokołu:** operator+
- **Kończenie zleceń:** manager+

---

## 17. Testowanie

### 17.1 Scenariusze testowe

1. **Tworzenie dostawy**
   - Utwórz dostawę na datę w przyszłości
   - Sprawdź czy pojawia się w kalendarzu
   - Sprawdź numer dostawy (auto-generowany)

2. **Drag & drop**
   - Przeciągnij zlecenie z panelu na dzień
   - Sprawdź czy utworzyła się dostawa
   - Przeciągnij zlecenie między dostawami

3. **Quick Delivery**
   - Wklej 5 numerów zleceń
   - Sprawdź walidację (istniejące, nieistniejące, przypisane)
   - Przypisz do nowej dostawy

4. **Protokół PDF**
   - Wygeneruj protokół dla dostawy z 3 zleceniami
   - Sprawdź poprawność sum
   - Sprawdź nazwę pliku

5. **Gotowość dostawy**
   - Sprawdź ikonę gotowości (zielona/żółta/czerwona)
   - Kliknij na dostawę i sprawdź checklist
   - Sprawdź alert o brakujących elementach

---

## 18. Znane ograniczenia

1. **Drag & drop nie działa na mobile** - wymaga myszy/touchpada
2. **Maksymalnie 50 zleceń w Quick Delivery** - limit walidacji
3. **Kalendarz ładuje max 3 miesiące** - dla wydajności
4. **PDF generowany po stronie serwera** - wymaga połączenia z API

---

## 19. Przyszłe usprawnienia

- [ ] Drag & drop na mobile (touch events)
- [ ] Eksport kalendarza do iCal
- [ ] Powiadomienia push o zbliżających się dostawach
- [ ] Integracja z mapami (trasa dostawy)
- [ ] Automatyczne grupowanie dostaw wg regionu

---

## 20. Powiązane dokumenty

- [OPIS_SYSTEMU_AKROBUD.md](OPIS_SYSTEMU_AKROBUD.md) - Ogólny opis systemu
- [docs/features/deliveries/](features/deliveries/) - Dokumentacja modułu dostaw
- [docs/architecture/api-endpoints.md](architecture/api-endpoints.md) - Pełna lista API
- [docs/user-guides/deliveries.md](user-guides/deliveries.md) - Instrukcja użytkownika

---

**Dokument wygenerowany:** 2026-02-02
**Autor:** Claude Code
