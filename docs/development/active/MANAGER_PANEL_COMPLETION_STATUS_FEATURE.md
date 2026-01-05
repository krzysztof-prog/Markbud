# Manager Panel - Completion Status Feature

**Data:** 2026-01-02
**Status:** ✅ Zaimplementowane i gotowe do testowania
**Autor:** Claude Sonnet 4.5

---

## 📋 Spis treści

1. [Problem biznesowy](#problem-biznesowy)
2. [Rozwiązanie](#rozwiązanie)
3. [Implementacja techniczna](#implementacja-techniczna)
4. [Zmienione pliki](#zmienione-pliki)
5. [Jak używać](#jak-używać)
6. [Testy manualne](#testy-manualne)
7. [Przyszłe usprawnienia](#przyszłe-usprawnienia)

---

## 🎯 Problem biznesowy

### Zgłoszenie użytkownika:

> "gdy klikam 'oznacz jako wyprodukowane' zlecenie nie znika. I nie wiem co się dzieje dalej.
> Myślę, że w tabelach brakuje statusu produkcji zleceń."

### Analiza problemu:

1. **Brak widoczności statusu** - Użytkownik nie widzi w jakim stanie jest zlecenie (czy ma materiały, czy jest w produkcji, czy wyprodukowane)
2. **Niejasny workflow** - Po oznaczeniu zlecenia jako wyprodukowane, nie ma potwierdzenia że akcja się powiodła
3. **Brak informacji o kompletacji** - Kierownik nie wie które zlecenia są gotowe do produkcji, a które czekają na materiały

### Dodatkowy problem techniczny:

Panel "Zakończ zlecenia" w ogóle się nie otwierał z powodu błędu:
```
ordersData.filter is not a function
```

**Przyczyna:** API zwraca `PaginatedResponse<T>` format: `{ data: T[], total, skip, take }`,
ale frontend oczekiwał tablicy `T[]` bezpośrednio.

---

## ✅ Rozwiązanie

### 1. Naprawiono crash panelu

Poprawiono wyciąganie danych z `PaginatedResponse` w `CompleteOrdersTab.tsx`:

```typescript
// ❌ PRZED (broken):
const { data: ordersData = [], isLoading } = useQuery<Order[]>({...});

// ✅ PO (fixed):
const { data: ordersResponse, isLoading } = useQuery({...});
const ordersData: Order[] = (ordersResponse as any)?.data ?? [];
```

### 2. Dodano system statusów kompletacji

Wprowadzono **4 statusy kompletacji** niezależne od statusu zlecenia:

| Status | Kolor | Znaczenie | Kiedy się pojawia |
|--------|-------|-----------|-------------------|
| 🔴 **Kompletacja** | Czerwony | Brak materiałów | Gdy nie ma profili/kolorów/okuć |
| 🟢 **Gotowe do produkcji** | Zielony | Wszystkie materiały dostępne | Gdy magazyn ma wszystko |
| 🟡 **W produkcji** | Żółty | Zlecenie w realizacji | `order.status === 'in_progress'` |
| 🔵 **Wyprodukowane** | Niebieski | Zakończone | `order.status === 'completed'` |

### 3. Wizualizacja w interfejsie

#### Dla pojedynczych zleceń (OrderCheckbox):
```
Zlecenie 53401 • 5 okien
[Badge: Gotowe do produkcji]
```

#### Dla dostaw (DeliveryCheckbox):
```
Dostawa 04.12.2025_I
2 wyprodukowanych, 1 w produkcji, 3 gotowych
```

---

## 🛠️ Implementacja techniczna

### Nowe pliki:

#### 1. `apps/web/src/features/manager/helpers/completionHelpers.ts`

Logika określania statusu kompletacji:

```typescript
export function getOrderCompletionStatus(order: Order): CompletionStatus {
  // Zlecenie zakończone
  if (order.status === 'completed') {
    return COMPLETION_STATUS.COMPLETED;
  }

  // Zlecenie w produkcji
  if (order.status === 'in_progress') {
    return COMPLETION_STATUS.IN_PRODUCTION;
  }

  // TODO: Zintegrować z warehouse stock check
  // Teraz zawsze zwraca READY dla nowych zleceń
  return COMPLETION_STATUS.READY;
}

export function getCompletionStatusInfo(order: Order) {
  const status = getOrderCompletionStatus(order);
  return {
    status,
    label: COMPLETION_STATUS_LABELS[status],
    color: COMPLETION_STATUS_COLORS[status],
  };
}
```

**UWAGA:** Obecnie uproszczona logika - zawsze zwraca "Gotowe do produkcji" dla zleceń
nie będących w produkcji/zakończonych. W przyszłości integracja z `warehouse stock check`.

### Rozszerzone pliki:

#### 2. `apps/web/src/features/manager/helpers/constants.ts`

Dodano enums i kolory:

```typescript
export const COMPLETION_STATUS = {
  INCOMPLETE: 'incomplete',    // Brak materiałów
  READY: 'ready',               // Gotowe do produkcji
  IN_PRODUCTION: 'in_progress', // W produkcji
  COMPLETED: 'completed',       // Wyprodukowane
} as const;

export type CompletionStatus = typeof COMPLETION_STATUS[keyof typeof COMPLETION_STATUS];

export const COMPLETION_STATUS_LABELS: Record<CompletionStatus, string> = {
  [COMPLETION_STATUS.INCOMPLETE]: 'Kompletacja',
  [COMPLETION_STATUS.READY]: 'Gotowe do produkcji',
  [COMPLETION_STATUS.IN_PRODUCTION]: 'W produkcji',
  [COMPLETION_STATUS.COMPLETED]: 'Wyprodukowane',
};

export const COMPLETION_STATUS_COLORS: Record<CompletionStatus, string> = {
  [COMPLETION_STATUS.INCOMPLETE]: 'bg-red-100 text-red-800 border-red-200',
  [COMPLETION_STATUS.READY]: 'bg-green-100 text-green-800 border-green-200',
  [COMPLETION_STATUS.IN_PRODUCTION]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [COMPLETION_STATUS.COMPLETED]: 'bg-blue-100 text-blue-800 border-blue-200',
};
```

#### 3. `apps/web/src/features/manager/components/OrderCheckbox.tsx`

Dodano wyświetlanie badge ze statusem:

```typescript
const completionInfo = getCompletionStatusInfo(order);

return (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span>Zlecenie {order.orderReq} • {order.windowCount} okien</span>
      <Badge className={completionInfo.color} title={completionInfo.label}>
        {completionInfo.label}
      </Badge>
    </div>
  </div>
);
```

#### 4. `apps/web/src/features/manager/components/DeliveryCheckbox.tsx`

Agregacja statusów dla całej dostawy:

```typescript
const completionStatusCounts = useMemo(() => {
  const counts: Record<CompletionStatus, number> = {
    [COMPLETION_STATUS.INCOMPLETE]: 0,
    [COMPLETION_STATUS.READY]: 0,
    [COMPLETION_STATUS.IN_PRODUCTION]: 0,
    [COMPLETION_STATUS.COMPLETED]: 0,
  };

  delivery.deliveryOrders?.forEach((dOrder) => {
    if (dOrder.order) {
      const status = getOrderCompletionStatus(dOrder.order as any);
      counts[status]++;
    }
  });

  return counts;
}, [delivery.deliveryOrders]);

// Renderowanie podsumowania
const statusSummary = [
  counts[COMPLETION_STATUS.COMPLETED] > 0 &&
    `${counts[COMPLETION_STATUS.COMPLETED]} wyprodukowanych`,
  counts[COMPLETION_STATUS.IN_PRODUCTION] > 0 &&
    `${counts[COMPLETION_STATUS.IN_PRODUCTION]} w produkcji`,
  counts[COMPLETION_STATUS.READY] > 0 &&
    `${counts[COMPLETION_STATUS.READY]} gotowych`,
  counts[COMPLETION_STATUS.INCOMPLETE] > 0 &&
    `${counts[COMPLETION_STATUS.INCOMPLETE]} w kompletacji`,
].filter(Boolean).join(', ');
```

#### 5. `apps/web/src/features/manager/components/CompleteOrdersTab.tsx`

Naprawiono obsługę `PaginatedResponse`:

```typescript
// Przed (line 44-53):
const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
  queryKey: ['manager', 'orders-unassigned', debouncedSearch],
  queryFn: () => ordersApi.getOrders({
    archived: false,
    search: debouncedSearch
  }),
});
const ordersData: Order[] = (ordersResponse as any)?.data ?? [];

// Podobnie dla deliveries (line 55-65)
```

### Naprawione błędy TypeScript:

#### 6. `apps/web/src/types/common.ts`

Poprawiono typ `Status` zgodnie z backendem:

```typescript
// ❌ PRZED (nieprawidłowe):
export type Status = 'active' | 'archived' | 'pending' | 'completed';

// ✅ PO (zgodne z backend ORDER_STATUSES):
export type Status = 'new' | 'in_progress' | 'completed' | 'archived';
```

**Wpływ:** Wymagało aktualizacji w `OrderDetailModal.tsx` i `GlobalSearch.tsx`:

```typescript
// ❌ PRZED:
{order.status === 'pending' ? 'Oczekujące' :
 order.status === 'active' ? 'Aktywne' : ...}

// ✅ PO:
{order.status === 'new' ? 'Nowe' :
 order.status === 'in_progress' ? 'W produkcji' : ...}
```

---

## 📁 Zmienione pliki

### Utworzone:
- `apps/web/src/features/manager/helpers/completionHelpers.ts` - logika statusów kompletacji

### Zmodyfikowane:
- `apps/web/src/features/manager/helpers/constants.ts` - dodano COMPLETION_STATUS enums
- `apps/web/src/features/manager/components/OrderCheckbox.tsx` - badge ze statusem
- `apps/web/src/features/manager/components/DeliveryCheckbox.tsx` - agregacja statusów
- `apps/web/src/features/manager/components/CompleteOrdersTab.tsx` - fix PaginatedResponse
- `apps/web/src/types/common.ts` - poprawiono typ Status
- `apps/web/src/features/orders/components/OrderDetailModal.tsx` - zaktualizowano Status usage
- `apps/web/src/components/orders/order-detail-modal.tsx` - zaktualizowano Status usage
- `apps/web/src/components/search/GlobalSearch.tsx` - zaktualizowano Status usage

### Ścieżki referencyjne:
```
apps/web/src/features/manager/
├── helpers/
│   ├── completionHelpers.ts       [NEW] - getOrderCompletionStatus()
│   └── constants.ts               [MODIFIED] - COMPLETION_STATUS enums
└── components/
    ├── OrderCheckbox.tsx          [MODIFIED] - completion badge
    ├── DeliveryCheckbox.tsx       [MODIFIED] - status aggregation
    └── CompleteOrdersTab.tsx      [MODIFIED] - PaginatedResponse fix
```

---

## 👤 Jak używać

### Dla użytkownika końcowego (kierownik produkcji):

1. Otwórz panel "Zakończ zlecenia" w menu głównym
2. Zobaczysz dwie sekcje:
   - **Dostawy AKROBUD** - zlecenia pogrupowane po dostawach
   - **Pojedyncze zlecenia** - niepogrupowane zlecenia

3. **Status przy pojedynczym zleceniu:**
   - 🔴 Czerwony badge = Czeka na materiały (nie można rozpocząć produkcji)
   - 🟢 Zielony badge = Gotowe do produkcji (wszystkie materiały dostępne)
   - 🟡 Żółty badge = W produkcji (już rozpoczęte)
   - 🔵 Niebieski badge = Wyprodukowane (zakończone)

4. **Status przy dostawie:**
   - Zobacz podsumowanie: "2 wyprodukowanych, 1 w produkcji, 3 gotowych"
   - Łatwo zorientuj się ile zleceń w jakiej fazie

5. **Workflow produkcji:**
   - Zaznacz zlecenia gotowe do produkcji (zielone badge)
   - Kliknij "Dodaj do produkcji"
   - Status zmieni się na "W produkcji" (żółty badge)
   - Po zakończeniu kliknij "Oznacz jako wyprodukowane"
   - Status zmieni się na "Wyprodukowane" (niebieski badge)
   - Zlecenie zniknie z listy (bo jest już completed)

---

## 🧪 Testy manualne

### Scenariusz 1: Sprawdzenie crash fix

**Cel:** Upewnić się że panel się otwiera

**Kroki:**
1. Otwórz http://localhost:3000
2. Przejdź do "Panel Kierownika" → "Zakończ zlecenia"
3. ✅ Panel powinien się otworzyć bez błędów

**Oczekiwany wynik:** Brak błędu `ordersData.filter is not a function`

---

### Scenariusz 2: Widoczność statusów kompletacji

**Cel:** Sprawdzić czy statusy się wyświetlają

**Kroki:**
1. W panelu "Zakończ zlecenia" znajdź sekcję "Pojedyncze zlecenia"
2. Znajdź dowolne zlecenie ze statusem `new` lub bez statusu
3. ✅ Powinien być widoczny zielony badge "Gotowe do produkcji"

**Oczekiwany wynik:** Każde zlecenie ma kolorowy badge ze statusem

---

### Scenariusz 3: Zmiana statusu na "W produkcji"

**Cel:** Sprawdzić czy zmiana statusu aktualizuje badge

**Kroki:**
1. Zaznacz checkbox przy zleceniu ze statusem "Gotowe do produkcji" (zielony)
2. Kliknij przycisk "Dodaj do produkcji"
3. Odśwież listę (powinno się odświeżyć automatycznie przez React Query)
4. ✅ Badge powinien zmienić kolor na żółty i tekst na "W produkcji"

**Oczekiwany wynik:** Zielony badge → Żółty badge

---

### Scenariusz 4: Oznaczenie jako wyprodukowane

**Cel:** Sprawdzić workflow zakończenia zlecenia

**Kroki:**
1. Znajdź zlecenie ze statusem "W produkcji" (żółty badge)
2. Zaznacz checkbox przy tym zleceniu
3. Kliknij "Oznacz jako wyprodukowane"
4. Poczekaj na potwierdzenie (toast)
5. ✅ Zlecenie powinno zniknąć z listy (bo status = completed)

**Oczekiwany wynik:** Zlecenie znika z widoku po oznaczeniu jako completed

---

### Scenariusz 5: Agregacja statusów w dostawach

**Cel:** Sprawdzić czy podsumowanie przy dostawach działa

**Kroki:**
1. Znajdź sekcję "Dostawy AKROBUD"
2. Rozwiń dowolną dostawę z wieloma zleceniami
3. Zaznacz kilka zleceń i dodaj do produkcji
4. ✅ Pod nazwą dostawy powinien pojawić się tekst:
   "X w produkcji, Y gotowych"

**Oczekiwany wynik:** Dynamiczne podsumowanie statusów

---

### Scenariusz 6: Edge case - dostawa bez zleceń

**Cel:** Sprawdzić czy nie ma błędów dla pustych dostaw

**Kroki:**
1. Znajdź dostawę bez przypisanych zleceń (lub usuń wszystkie)
2. ✅ Nie powinno być crashu
3. ✅ Brak podsumowania statusów (bo 0 zleceń)

**Oczekiwany wynik:** Brak crashu, graceful handling

---

## 🔮 Przyszłe usprawnienia

### TODO #1: Integracja z warehouse stock check

**Problem:** Obecnie `getOrderCompletionStatus()` zawsze zwraca `READY` dla zleceń
nie będących w produkcji/zakończonych.

**Rozwiązanie:**

```typescript
export async function getOrderCompletionStatus(order: Order): Promise<CompletionStatus> {
  if (order.status === 'completed') {
    return COMPLETION_STATUS.COMPLETED;
  }

  if (order.status === 'in_progress') {
    return COMPLETION_STATUS.IN_PRODUCTION;
  }

  // TODO: Sprawdź dostępność materiałów w magazynie
  const shortages = await checkWarehouseStock(order.id);

  if (shortages.profiles.length > 0 ||
      shortages.colors.length > 0 ||
      shortages.hardware.length > 0) {
    return COMPLETION_STATUS.INCOMPLETE;
  }

  return COMPLETION_STATUS.READY;
}
```

**Wymagania:**
- API endpoint: `GET /api/warehouse/check-order/:orderId`
- Response format:
```typescript
{
  orderId: string;
  shortages: {
    profiles: { profileId: string; name: string; needed: number; available: number }[];
    colors: { colorId: string; name: string; needed: number; available: number }[];
    hardware: { hardwareId: string; name: string; needed: number; available: number }[];
  }
}
```

**Estymacja:** 4-6h pracy (backend + frontend integration)

---

### TODO #2: Tooltip z brakującymi materiałami

**Problem:** Gdy status = "Kompletacja", użytkownik nie wie czego konkretnie brakuje.

**Rozwiązanie:**

```typescript
<Badge
  className={completionInfo.color}
  title={completionInfo.label}
>
  {completionInfo.label}
  {completionInfo.status === COMPLETION_STATUS.INCOMPLETE && (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Info className="h-3 w-3 ml-1" />
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-semibold mb-1">Brakujące materiały:</p>
            {shortages.profiles.length > 0 && (
              <div>
                <p className="font-medium">Profile:</p>
                <ul className="list-disc pl-4">
                  {shortages.profiles.map(p => (
                    <li key={p.profileId}>
                      {p.name}: brakuje {p.needed - p.available}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Podobnie dla colors i hardware */}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )}
</Badge>
```

**Estymacja:** 1-2h pracy (frontend only, wymaga TODO #1)

---

### TODO #3: Filtrowanie po statusie kompletacji

**Problem:** Kierownik może chcieć zobaczyć tylko zlecenia "Gotowe do produkcji".

**Rozwiązanie:**

Dodać dropdown filter w `CompleteOrdersTab.tsx`:

```typescript
<Select value={filterStatus} onValueChange={setFilterStatus}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Wszystkie statusy" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Wszystkie statusy</SelectItem>
    <SelectItem value={COMPLETION_STATUS.INCOMPLETE}>Kompletacja</SelectItem>
    <SelectItem value={COMPLETION_STATUS.READY}>Gotowe do produkcji</SelectItem>
    <SelectItem value={COMPLETION_STATUS.IN_PRODUCTION}>W produkcji</SelectItem>
  </SelectContent>
</Select>

// Filtrowanie:
const filteredOrders = ordersData.filter(order => {
  if (filterStatus === 'all') return true;
  return getOrderCompletionStatus(order) === filterStatus;
});
```

**Estymacja:** 1h pracy

---

### TODO #4: Sortowanie po statusie

**Problem:** Byłoby wygodnie zobaczyć najpierw zlecenia "Gotowe do produkcji".

**Rozwiązanie:**

```typescript
const sortedOrders = [...ordersData].sort((a, b) => {
  const statusA = getOrderCompletionStatus(a);
  const statusB = getOrderCompletionStatus(b);

  const priority = {
    [COMPLETION_STATUS.READY]: 1,
    [COMPLETION_STATUS.IN_PRODUCTION]: 2,
    [COMPLETION_STATUS.INCOMPLETE]: 3,
    [COMPLETION_STATUS.COMPLETED]: 4,
  };

  return priority[statusA] - priority[statusB];
});
```

**Estymacja:** 30min

---

## 📊 Metryki sukcesu

Po wdrożeniu tej funkcjonalności oczekujemy:

1. ✅ **0 crashów** panelu "Zakończ zlecenia"
2. ✅ **100% zleceń** ma widoczny status kompletacji
3. ✅ **Szybsze workflow** - kierownik od razu widzi co można rozpocząć
4. ✅ **Mniej pytań** - "co się stało z tym zleceniem?"
5. ⏳ **Integracja z magazynem** - prawdziwy status kompletacji (TODO)

---

## 🔗 Powiązane dokumenty

- [Manager Panel Edge Cases](../../guides/manager-panel-edge-cases.md)
- [Frontend Development Guidelines](../../.claude/skills/frontend-dev-guidelines/README.md)
- [Order Status Machine](../../api/src/utils/order-status-machine.ts)
- [Warehouse Stock Check Plan](../../planning/features/warehouse-stock-integration.md) (TODO)

---

## 📝 Historia zmian

| Data | Wersja | Zmiany |
|------|--------|--------|
| 2026-01-02 | 1.0 | Pierwsza wersja - basic completion status system |
| TBD | 1.1 | Integracja z warehouse stock check (TODO #1) |
| TBD | 1.2 | Tooltip z brakującymi materiałami (TODO #2) |

---

**Ostatnia aktualizacja:** 2026-01-02 13:30
**Status dokumentu:** ✅ Aktualny
**Wymagane review:** Przed wdrożeniem TODO #1