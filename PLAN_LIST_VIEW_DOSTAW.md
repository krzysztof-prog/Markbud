# PLAN IMPLEMENTACJI - LIST VIEW DOSTAW

**Wersja:** 1.0
**Data:** 2025-12-08
**Autor:** Claude Sonnet 4.5

---

## 📋 PODSUMOWANIE

Dodanie **drugiego widoku dostaw** - **LIST VIEW** jako alternatywa dla obecnego widoku kalendarzowego.

### Wymagania:
- ✅ Toggle między Calendar View ↔ List View
- ✅ Zakres dat: Ostatnie 60 dni + archiwum starszych dostaw
- ✅ Statystyki inline dla każdej dostawy (O/S/Sz, wartość PLN/EUR)
- ✅ Bez drag & drop (prosta lista)
- ✅ Edycja inline (rozwijanie szczegółów w wierszu)
- ✅ Przyciski akcji bezpośrednio przy każdej dostawie
- 🔮 Przygotowanie na przyszłe statusy (towar/ceny/szyby)

---

## 1. STRUKTURA KOMPONENTÓW

### 1.1 Modyfikacja głównego komponentu

**Plik:** `apps/web/src/app/dostawy/DostawyPageContent.tsx`

```tsx
// Dodać state
const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

// Dodać toggle w Header
<div className="flex gap-2">
  <Button
    variant={viewMode === 'calendar' ? 'default' : 'outline'}
    onClick={() => setViewMode('calendar')}
  >
    <CalendarDays className="h-4 w-4 mr-2" />
    Kalendarz
  </Button>
  <Button
    variant={viewMode === 'list' ? 'default' : 'outline'}
    onClick={() => setViewMode('list')}
  >
    <List className="h-4 w-4 mr-2" />
    Lista
  </Button>
</div>

// Conditional rendering
{viewMode === 'calendar' ? (
  <CalendarView /> // Obecny kod
) : (
  <DeliveriesListView /> // Nowy komponent
)}
```

### 1.2 Nowy komponent główny

**Plik:** `apps/web/src/app/dostawy/DeliveriesListView.tsx`

```tsx
interface DeliveriesListViewProps {
  // Props przekazane z DostawyPageContent
  initialDateRange?: '30' | '60' | '90' | 'archive';
}

export function DeliveriesListView({ initialDateRange = '60' }: DeliveriesListViewProps) {
  // State
  const [dateFilter, setDateFilter] = useState(initialDateRange);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Data fetching
  const dateRange = getDateRange(dateFilter);
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['deliveries-list', dateRange],
    queryFn: () => deliveriesApi.getAll({
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: format(dateRange.to, 'yyyy-MM-dd'),
    }),
  });

  return (
    <Card>
      <CardHeader>
        {/* Filters Panel */}
        <DeliveryFilters
          value={dateFilter}
          onChange={setDateFilter}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <DeliveriesTable
            deliveries={deliveries}
            expandedRows={expandedRows}
            onToggleRow={toggleRow}
          />
        )}
      </CardContent>
    </Card>
  );
}
```

### 1.3 Komponenty pomocnicze

#### A) `DeliveryFilters.tsx`
Filtrowanie po zakresie dat.

```tsx
interface DeliveryFiltersProps {
  value: '30' | '60' | '90' | 'archive';
  onChange: (value: '30' | '60' | '90' | 'archive') => void;
}

export function DeliveryFilters({ value, onChange }: DeliveryFiltersProps) {
  return (
    <div className="flex gap-2">
      <span className="text-sm text-slate-500">Zakres:</span>
      <Button
        variant={value === '30' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('30')}
      >
        Ostatnie 30 dni
      </Button>
      <Button
        variant={value === '60' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('60')}
      >
        Ostatnie 60 dni
      </Button>
      <Button
        variant={value === '90' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('90')}
      >
        Ostatnie 90 dni
      </Button>
      <Button
        variant={value === 'archive' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('archive')}
      >
        Archiwum
      </Button>
    </div>
  );
}
```

#### B) `DeliveriesTable.tsx`
Tabela z TanStack Table.

```tsx
interface DeliveriesTableProps {
  deliveries: Delivery[];
  expandedRows: Set<number>;
  onToggleRow: (id: number) => void;
}

export function DeliveriesTable({ deliveries, expandedRows, onToggleRow }: DeliveriesTableProps) {
  const columns = useMemo(() => [
    {
      accessorKey: 'deliveryDate',
      header: 'Data',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{formatDate(row.original.deliveryDate)}</div>
          <div className="text-xs text-slate-500">
            {format(new Date(row.original.deliveryDate), 'EEEE', { locale: pl })}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'deliveryNumber',
      header: 'Numer',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.deliveryNumber || `#${row.original.id}`}</Badge>
      ),
    },
    {
      accessorKey: 'ordersCount',
      header: 'Zlecenia',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.deliveryOrders?.length || 0}</span>
      ),
    },
    {
      id: 'stats',
      header: 'Statystyki',
      cell: ({ row }) => <DeliveryStats delivery={row.original} />,
    },
    {
      id: 'value',
      header: 'Wartość',
      cell: ({ row }) => <DeliveryValue delivery={row.original} />,
    },
    {
      id: 'actions',
      header: 'Akcje',
      cell: ({ row }) => (
        <DeliveryActions
          delivery={row.original}
          onComplete={() => handleComplete(row.original.id)}
          onOptimize={() => router.push(`/dostawy/${row.original.id}/optymalizacja`)}
          onProtocol={() => handleProtocol(row.original.id)}
        />
      ),
    },
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleRow(row.original.id)}
        >
          {expandedRows.has(row.original.id) ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      ),
    },
  ], [expandedRows]);

  const table = useReactTable({
    data: deliveries,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: 'deliveryDate', desc: true }],
    },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <>
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
              {expandedRows.has(row.original.id) && (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <DeliveryDetails delivery={row.original} />
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

#### C) `DeliveryStats.tsx`
Mini badge z statystykami O/S/Sz.

```tsx
interface DeliveryStatsProps {
  delivery: Delivery;
}

export function DeliveryStats({ delivery }: DeliveryStatsProps) {
  const stats = useMemo(() => {
    let windows = 0, sashes = 0, glasses = 0;

    delivery.deliveryOrders?.forEach(dOrder => {
      windows += dOrder.order.totalWindows || 0;
      sashes += dOrder.order.totalSashes || 0;
      glasses += dOrder.order.totalGlasses || 0;
    });

    return { windows, sashes, glasses };
  }, [delivery]);

  if (stats.windows === 0) {
    return <span className="text-xs text-slate-400">Brak</span>;
  }

  return (
    <div className="flex gap-3 text-sm">
      <div className="flex items-center gap-1">
        <span className="text-slate-500">O:</span>
        <span className="font-medium">{stats.windows}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-slate-500">S:</span>
        <span className="font-medium">{stats.sashes}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-slate-500">Sz:</span>
        <span className="font-medium">{stats.glasses}</span>
      </div>
    </div>
  );
}
```

#### D) `DeliveryValue.tsx`
Wyświetlanie wartości PLN/EUR.

```tsx
interface DeliveryValueProps {
  delivery: Delivery;
}

export function DeliveryValue({ delivery }: DeliveryValueProps) {
  const value = useMemo(() => {
    let pln = 0, eur = 0;

    delivery.deliveryOrders?.forEach(dOrder => {
      pln += parseFloat(dOrder.order.valuePln?.toString() || '0');
      eur += parseFloat(dOrder.order.valueEur?.toString() || '0');
    });

    return { pln, eur };
  }, [delivery]);

  if (value.pln === 0 && value.eur === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="text-sm">
      {value.pln > 0 && (
        <div className="font-medium">{value.pln.toLocaleString('pl-PL')} PLN</div>
      )}
      {value.eur > 0 && (
        <div className="text-slate-500">{value.eur.toLocaleString('pl-PL')} EUR</div>
      )}
    </div>
  );
}
```

#### E) `DeliveryActions.tsx`
Grupa 3 przycisków akcji.

```tsx
interface DeliveryActionsProps {
  delivery: Delivery;
  onComplete: () => void;
  onOptimize: () => void;
  onProtocol: () => void;
}

export function DeliveryActions({ delivery, onComplete, onOptimize, onProtocol }: DeliveryActionsProps) {
  const hasOrders = delivery.deliveryOrders && delivery.deliveryOrders.length > 0;

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={onComplete}
        disabled={!hasOrders}
        title="Oznacz zlecenia jako zakończone"
      >
        <CheckCircle2 className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onOptimize}
        disabled={!hasOrders}
        title="Optymalizuj palety"
      >
        <Package className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onProtocol}
        disabled={!hasOrders}
        title="Pobierz protokół odbioru"
      >
        <FileText className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

#### F) `DeliveryDetails.tsx`
Rozwinięty widok szczegółów dostawy.

```tsx
interface DeliveryDetailsProps {
  delivery: Delivery;
}

export function DeliveryDetails({ delivery }: DeliveryDetailsProps) {
  return (
    <div className="p-4 bg-slate-50 rounded-lg space-y-4">
      {/* Lista zleceń */}
      {delivery.deliveryOrders && delivery.deliveryOrders.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">
            Zlecenia ({delivery.deliveryOrders.length})
          </h4>
          <div className="space-y-2">
            {delivery.deliveryOrders.map(dOrder => (
              <div
                key={dOrder.orderId}
                className="flex items-center justify-between p-2 bg-white rounded border"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{dOrder.order.orderNumber}</Badge>
                  <DeliveryStats delivery={{ deliveryOrders: [dOrder] }} />
                </div>
                <div className="text-sm">
                  <DeliveryValue delivery={{ deliveryOrders: [dOrder] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dodatkowe artykuły */}
      {delivery.deliveryItems && delivery.deliveryItems.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">
            Dodatkowe artykuły ({delivery.deliveryItems.length})
          </h4>
          <div className="space-y-2">
            {delivery.deliveryItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-white rounded border text-sm">
                <Badge variant="outline">{item.itemType}</Badge>
                <span>{item.quantity}x</span>
                <span className="text-slate-600">{item.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notatki */}
      {delivery.notes && (
        <div>
          <h4 className="text-sm font-semibold mb-1">Notatki</h4>
          <p className="text-sm text-slate-600">{delivery.notes}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 2. API I DANE

### 2.1 Wykorzystanie istniejącego endpoint

**Endpoint:** `GET /api/deliveries?from=YYYY-MM-DD&to=YYYY-MM-DD`

Już zwraca wszystkie potrzebne dane:
- `deliveryOrders` z zagnieżdżonym `order` (totalWindows, totalSashes, totalGlasses, valuePln, valueEur)
- `deliveryItems`
- `totalOrders`, `totalValuePln`, `totalValueEur`

### 2.2 Query hook

```tsx
const getDateRange = (filter: '30' | '60' | '90' | 'archive') => {
  const today = new Date();
  switch (filter) {
    case '30':
      return { from: subDays(today, 30), to: today };
    case '60':
      return { from: subDays(today, 60), to: today };
    case '90':
      return { from: subDays(today, 90), to: today };
    case 'archive':
      return { from: new Date('2020-01-01'), to: subDays(today, 90) };
  }
};

const { data: deliveries, isLoading } = useQuery({
  queryKey: ['deliveries-list', dateRange],
  queryFn: () => deliveriesApi.getAll({
    from: format(dateRange.from, 'yyyy-MM-dd'),
    to: format(dateRange.to, 'yyyy-MM-dd'),
  }),
});
```

---

## 3. LAYOUT I STRUKTURA UI

### 3.1 Header z toggle

```
┌──────────────────────────────────────────────────────────────┐
│ Dostawy                   [Kalendarz] [Lista ✓]  [+ Nowa]   │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Filters Panel

```
┌──────────────────────────────────────────────────────────────┐
│ Zakres: [30 dni] [60 dni ✓] [90 dni] [Archiwum]            │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Tabela (collapsed rows)

```
┌────────────┬────────┬──────────┬──────────────────┬──────────────┬─────────────┐
│ Data       │ Numer  │ Zlecenia │ Statystyki       │ Wartość      │ Akcje       │
├────────────┼────────┼──────────┼──────────────────┼──────────────┼─────────────┤
│ 15.12.2025 │ I      │ 5        │ O:45 S:120 Sz:95 │ 15,340 PLN   │ [✓][📦][📄] │
│ Poniedziałek│       │          │                  │ 3,200 EUR    │             │
├────────────┼────────┼──────────┼──────────────────┼──────────────┼─────────────┤
│ 18.12.2025 │ II     │ 3        │ O:30 S:80 Sz:60  │ 10,500 PLN   │ [✓][📦][📄] │
│ Czwartek   │        │          │                  │ 2,100 EUR    │             │
└────────────┴────────┴──────────┴──────────────────┴──────────────┴─────────────┘
```

### 3.4 Tabela (expanded row)

```
┌────────────┬────────┬──────────┬──────────────────┬──────────────┬─────────────┐
│ 15.12.2025 │ I      │ 5        │ O:45 S:120 Sz:95 │ 15,340 PLN   │ [✓][📦][📄] │
│ Poniedziałek│       │          │                  │ 3,200 EUR    │             │
├────────────┴────────┴──────────┴──────────────────┴──────────────┴─────────────┤
│ ▼ Szczegóły dostawy                                                            │
│                                                                                 │
│   Zlecenia (5)                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐     │
│   │ [ZL-2024-001]  O:12 S:30 Sz:24    │    3,200 PLN / 750 EUR         │     │
│   │ [ZL-2024-002]  O:8 S:20 Sz:16     │    2,100 PLN / 450 EUR         │     │
│   │ [ZL-2024-003]  O:10 S:25 Sz:20    │    2,800 PLN / 600 EUR         │     │
│   └─────────────────────────────────────────────────────────────────────┘     │
│                                                                                 │
│   Dodatkowe artykuły (2)                                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐     │
│   │ [Szyby] 10x Szyby hartowane 6mm                                     │     │
│   │ [Skrzydła] 3x Skrzydła zapasowe                                     │     │
│   └─────────────────────────────────────────────────────────────────────┘     │
│                                                                                 │
│   Notatki                                                                      │
│   Transport własny, dostawa po południu                                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. FUNKCJONALNOŚCI

### 4.1 Sortowanie

Domyślnie: **deliveryDate DESC** (najbliższe dostawy na górze)

Kolumny sortowalne:
- Data dostawy
- Numer dostawy
- Liczba zleceń
- Wartość PLN/EUR

### 4.2 Rozwijanie wierszy (Expand/Collapse)

```tsx
const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

const toggleRow = (id: number) => {
  setExpandedRows(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
};
```

### 4.3 Akcje

#### A) Zlecenia zakończone
```tsx
const handleComplete = (deliveryId: number) => {
  setSelectedDeliveryForCompletion(deliveryId);
  setShowCompleteDialog(true);
};

// Dialog z datą produkcji (reużycie z DostawyPageContent)
```

#### B) Optymalizuj palety
```tsx
const handleOptimize = (deliveryId: number) => {
  router.push(`/dostawy/${deliveryId}/optymalizacja`);
};
```

#### C) Protokół odbioru
```tsx
const downloadProtocolMutation = useDownloadDeliveryProtocol();

const handleProtocol = (deliveryId: number) => {
  downloadProtocolMutation.mutate(deliveryId, {
    onSuccess: () => {
      showSuccessToast('Protokół pobrany', 'PDF protokołu odbioru został pobrany');
    },
    onError: (error) => {
      showErrorToast('Błąd pobierania protokołu', getErrorMessage(error));
    },
  });
};
```

---

## 5. PRZYSZŁE ROZSZERZENIA - STATUSY

### 5.1 Typy (do dodania później)

```tsx
interface DeliveryStatus {
  hasAllStock: boolean;      // Czy wszystkie zlecenia mają towar w magazynie
  hasAllPrices: boolean;     // Czy wszystkie zlecenia mają wycenę
  hasAllGlasses: boolean;    // Czy wszystkie szyby przyszły
}
```

### 5.2 Kolumna statusu (placeholder)

```tsx
{
  id: 'status',
  header: 'Status',
  cell: ({ row }) => {
    // TODO: Backend endpoint do obliczania statusów
    // const status = calculateDeliveryStatus(row.original);

    return (
      <div className="flex gap-1">
        <Badge variant="outline" className="text-xs">
          Towar
        </Badge>
        <Badge variant="outline" className="text-xs">
          Ceny
        </Badge>
        <Badge variant="outline" className="text-xs">
          Szyby
        </Badge>
      </div>
    );
  },
}
```

### 5.3 Backend endpoint (przyszłość)

```
GET /api/deliveries/:id/status

Response:
{
  deliveryId: 123,
  hasAllStock: true,
  hasAllPrices: false,
  hasAllGlasses: true,
  details: {
    stock: { ready: 5, missing: 0 },
    prices: { ready: 3, missing: 2 },
    glasses: { ready: 5, missing: 0 }
  }
}
```

---

## 6. STRUKTURA PLIKÓW

```
apps/web/src/app/dostawy/
├── page.tsx                          # Bez zmian
├── DostawyPageContent.tsx            # MODYFIKACJA: Dodajemy toggle viewMode
├── DeliveriesListView.tsx            # NOWY: Główny komponent listy
├── components/                        # NOWY FOLDER
│   ├── DeliveryFilters.tsx           # Filtrowanie po zakresie dat
│   ├── DeliveriesTable.tsx           # TanStack Table
│   ├── DeliveryStats.tsx             # Mini badge O/S/Sz
│   ├── DeliveryValue.tsx             # Wartość PLN/EUR
│   ├── DeliveryActions.tsx           # 3 przyciski akcji
│   └── DeliveryDetails.tsx           # Rozwinięty widok szczegółów
├── DragDropComponents.tsx            # Bez zmian (tylko dla Calendar View)
```

---

## 7. IMPLEMENTACJA KROK PO KROKU

### Krok 1: Modyfikacja `DostawyPageContent.tsx` ✅
- Dodać import dla `List` icon z lucide-react
- Dodać state: `const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')`
- Dodać toggle button w Header (obok "Nowa dostawa")
- Przenieść całą obecną zawartość do conditional rendering dla `viewMode === 'calendar'`
- Dodać placeholder dla `viewMode === 'list'` → `<DeliveriesListView />`

### Krok 2: Utworzenie `DeliveryFilters.tsx` ✅
- Prosty komponent z 4 przyciskami (30/60/90 dni, Archiwum)
- State przekazany przez props

### Krok 3: Utworzenie `DeliveryStats.tsx` ✅
- Obliczanie sum O/S/Sz z `delivery.deliveryOrders`
- Wyświetlanie w formacie `O:45 S:120 Sz:95`

### Krok 4: Utworzenie `DeliveryValue.tsx` ✅
- Obliczanie sum PLN/EUR z `delivery.deliveryOrders`
- Wyświetlanie w dwóch liniach

### Krok 5: Utworzenie `DeliveryActions.tsx` ✅
- 3 przyciski: CheckCircle2, Package, FileText
- Props: onComplete, onOptimize, onProtocol
- Disable jeśli brak zleceń

### Krok 6: Utworzenie `DeliveryDetails.tsx` ✅
- Lista zleceń (orderNumber, stats, value)
- Lista dodatkowych artykułów
- Notatki

### Krok 7: Utworzenie `DeliveriesTable.tsx` ✅
- Setup TanStack Table
- Kolumny: Data, Numer, Zlecenia, Statystyki, Wartość, Akcje, Expand
- Expandable rows logic
- Sortowanie domyślne po dacie DESC

### Krok 8: Utworzenie `DeliveriesListView.tsx` ✅
- Data fetching z `deliveriesApi.getAll()`
- State dla dateFilter i expandedRows
- Layout: Filters + Table
- Loading/Empty states

### Krok 9: Integracja mutations z `DostawyPageContent` ✅
- Przekazanie mutations przez props lub context
- Reużycie dialogów (CompleteDialog, ProtocolDownload)

### Krok 10: Styling i UX ✅
- Responsywność (mobile: stack columns, hide some)
- Loading skeletons
- Empty state (brak dostaw w zakresie)
- Hover effects, transitions

### Krok 11: Testing ✅
- Test różnych zakresów dat
- Test expand/collapse
- Test akcji
- Test sortowania

### Krok 12: Przyszłość - Statusy 🔮
- Placeholder kolumny "Status"
- Backend endpoint `/api/deliveries/:id/status`
- Frontend integracja

---

## 8. DODATKOWE ROZWAŻANIA

### 8.1 Performance

**Problem:** Jeśli będzie >100 dostaw, tabela może być wolna.

**Rozwiązania:**
1. **Paginacja** (TanStack Table ma built-in support)
2. **Virtualizacja** (react-virtual)
3. **Lazy loading** (infinite scroll)

**Decyzja:** Start bez paginacji, dodać jeśli będzie problem.

### 8.2 UX

**Highlights:**
- Dzisiejsza dostawa: Border niebieski
- Jutrzejsza dostawa: Background jasnozielony
- Przeterminowana: Background jasnoczerwony

**Ikony:**
- Status badges z ikonami (✓ / ⚠)
- Tooltip na hover z szczegółami

### 8.3 Accessibility

- **Keyboard navigation:** Tab przez wiersze, Enter = expand
- **ARIA labels:** dla przycisków akcji
- **Screen reader:** announcements dla expand/collapse

### 8.4 Responsywność

**Desktop (>1024px):** Wszystkie kolumny widoczne

**Tablet (768-1024px):**
- Ukryć kolumnę "Wartość"
- Pokazać w rozwiniętym widoku

**Mobile (<768px):**
- Stack layout (karty zamiast tabeli)
- Każda dostawa jako Card z podstawowymi info
- Expand/Collapse dla szczegółów

---

## 9. MOCKUP UI

### 9.1 Desktop View (Collapsed)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🏠 Dostawy                                    [Kalendarz] [Lista ✓]  [+ Nowa]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ Zakres: [Ostatnie 30 dni] [Ostatnie 60 dni ✓] [Ostatnie 90 dni] [Archiwum]   │
│                                                                                  │
├────────────┬────────┬──────────┬──────────────────┬──────────────┬─────────┬───┤
│ Data       │ Numer  │ Zlecenia │ Statystyki       │ Wartość      │ Akcje   │   │
├────────────┼────────┼──────────┼──────────────────┼──────────────┼─────────┼───┤
│ 15.12.2025 │   I    │    5     │ O:45 S:120 Sz:95 │ 15,340 PLN   │ ✓ 📦 📄 │ ▼ │
│ Poniedziałek│       │          │                  │  3,200 EUR   │         │   │
├────────────┼────────┼──────────┼──────────────────┼──────────────┼─────────┼───┤
│ 18.12.2025 │   II   │    3     │ O:30 S:80 Sz:60  │ 10,500 PLN   │ ✓ 📦 📄 │ ▶ │
│ Czwartek   │        │          │                  │  2,100 EUR   │         │   │
├────────────┼────────┼──────────┼──────────────────┼──────────────┼─────────┼───┤
│ 20.12.2025 │  III   │    7     │ O:60 S:150 Sz:120│ 20,800 PLN   │ ✓ 📦 📄 │ ▶ │
│ Sobota     │        │          │                  │  4,500 EUR   │         │   │
└────────────┴────────┴──────────┴──────────────────┴──────────────┴─────────┴───┘
```

### 9.2 Desktop View (Expanded)

```
┌────────────┬────────┬──────────┬──────────────────┬──────────────┬─────────┬───┐
│ 15.12.2025 │   I    │    5     │ O:45 S:120 Sz:95 │ 15,340 PLN   │ ✓ 📦 📄 │ ▼ │
│ Poniedziałek│       │          │                  │  3,200 EUR   │         │   │
├────────────┴────────┴──────────┴──────────────────┴──────────────┴─────────┴───┤
│                                                                                  │
│  📦 Zlecenia (5)                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ [ZL-2024-001]  O:12 S:30 Sz:24       │       3,200 PLN  /  750 EUR      │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │ [ZL-2024-002]  O:8 S:20 Sz:16        │       2,100 PLN  /  450 EUR      │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │ [ZL-2024-003]  O:10 S:25 Sz:20       │       2,800 PLN  /  600 EUR      │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │ [ZL-2024-004]  O:9 S:23 Sz:18        │       2,540 PLN  /  550 EUR      │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │ [ZL-2024-005]  O:6 S:22 Sz:17        │       4,700 PLN  /  850 EUR      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  📦 Dodatkowe artykuły (2)                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ [Szyby]  10x  Szyby hartowane 6mm                                        │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │ [Skrzydła]  3x  Skrzydła zapasowe HST                                    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  📝 Notatki                                                                     │
│  Transport własny, dostawa po południu. Kontakt: Jan Kowalski 500-600-700     │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 9.3 Mobile View (Cards)

```
┌───────────────────────────────────────┐
│ 🏠 Dostawy                   [☰ Menu] │
├───────────────────────────────────────┤
│                                        │
│ [30 dni] [60 dni ✓] [90 dni] [Arch] │
│                                        │
├───────────────────────────────────────┤
│ ┌─────────────────────────────────┐  │
│ │ 15.12.2025 (Poniedziałek)   [I] │  │
│ │                                  │  │
│ │ 📦 5 zleceń                      │  │
│ │ O:45  S:120  Sz:95               │  │
│ │                                  │  │
│ │ 💰 15,340 PLN / 3,200 EUR        │  │
│ │                                  │  │
│ │ [✓ Zakończone] [📦 Palety] [📄]  │  │
│ └─────────────────────────────────┘  │
│                                        │
│ ┌─────────────────────────────────┐  │
│ │ 18.12.2025 (Czwartek)      [II] │  │
│ │                                  │  │
│ │ 📦 3 zlecenia                    │  │
│ │ O:30  S:80  Sz:60                │  │
│ │                                  │  │
│ │ 💰 10,500 PLN / 2,100 EUR        │  │
│ │                                  │  │
│ │ [✓ Zakończone] [📦 Palety] [📄]  │  │
│ └─────────────────────────────────┘  │
└───────────────────────────────────────┘
```

---

## 10. TIMELINE IMPLEMENTACJI

### Sprint 1 (2-3 godziny)
- [x] Modyfikacja `DostawyPageContent.tsx` - toggle
- [x] Utworzenie `DeliveryFilters.tsx`
- [x] Utworzenie `DeliveryStats.tsx`
- [x] Utworzenie `DeliveryValue.tsx`
- [x] Utworzenie `DeliveryActions.tsx`

### Sprint 2 (3-4 godziny)
- [ ] Utworzenie `DeliveryDetails.tsx`
- [ ] Utworzenie `DeliveriesTable.tsx` (TanStack Table)
- [ ] Utworzenie `DeliveriesListView.tsx` (główny komponent)

### Sprint 3 (2-3 godziny)
- [ ] Integracja mutations i dialogów
- [ ] Styling i responsywność
- [ ] Loading/Empty states

### Sprint 4 (1-2 godziny)
- [ ] Testing
- [ ] Bug fixes
- [ ] UX improvements

**Łączny czas:** ~8-12 godzin

---

## 11. RYZYKA I MITYGACJA

### Ryzyko 1: Performance przy dużej liczbie dostaw
**Mitygacja:** Dodać paginację (10-20 dostaw na stronę)

### Ryzyko 2: TanStack Table learning curve
**Mitygacja:** Projekt już używa TanStack Table w innych miejscach, kopiować pattern

### Ryzyko 3: Konflikt mutations między Calendar i List view
**Mitygacja:** Używać shared mutations z DostawyPageContent, przekazać przez props/context

### Ryzyko 4: Responsywność - tabela na mobile
**Mitygacja:** Card layout dla mobile (<768px)

---

## 12. SUKCES METRICS

### Przed implementacją:
- Użytkownik może zobaczyć dostawy tylko w widoku kalendarzowym
- Trudno przejrzeć wiele dostaw jednocześnie
- Brak szybkiego dostępu do akcji

### Po implementacji:
- ✅ Użytkownik może przełączać się między Calendar/List view
- ✅ Lista dostaw z filtrami po zakresie dat
- ✅ Statystyki inline dla każdej dostawy
- ✅ Przyciski akcji bezpośrednio przy dostawie
- ✅ Rozwijanie szczegółów dostawy (expand/collapse)
- ✅ Sortowanie i filtrowanie
- ✅ Gotowość na przyszłe statusy

---

## 13. PRZYSZŁE ROZSZERZENIA

### Faza 2: Statusy (Q1 2025)
- [ ] Backend endpoint dla statusów dostaw
- [ ] Kolumna "Status" z badge'ami
- [ ] Filtrowanie po statusach

### Faza 3: Eksport (Q1 2025)
- [ ] Eksport listy dostaw do Excel/PDF
- [ ] Wybór kolumn do eksportu

### Faza 4: Masowe akcje (Q2 2025)
- [ ] Multi-select dostaw (checkboxy)
- [ ] Masowe oznaczanie jako zakończone
- [ ] Masowe generowanie protokołów

### Faza 5: Zaawansowane filtrowanie (Q2 2025)
- [ ] Filtr po numerze dostawy
- [ ] Filtr po statusie
- [ ] Filtr po wartości (range slider)
- [ ] Search box (szukanie po numerze zlecenia)

---

## 14. DOKUMENTACJA TECHNICZNA

### Dependencies potrzebne:
```json
{
  "@tanstack/react-table": "^8.x", // Już w projekcie
  "date-fns": "^2.x",               // Już w projekcie
  "lucide-react": "^0.x"            // Już w projekcie
}
```

### TypeScript types:
```tsx
// Już istnieją w projekcie
import type { Delivery } from '@/types/delivery';
import type { Order } from '@/types/order';
```

### API client:
```tsx
// Już istnieje
import { deliveriesApi } from '@/lib/api';
```

---

## KONIEC DOKUMENTACJI

**Status:** ✅ Plan gotowy do implementacji
**Następny krok:** Rozpoczęcie Sprint 1

**Pytania?** Możesz zacząć implementację lub zadać pytania odnośnie planu!