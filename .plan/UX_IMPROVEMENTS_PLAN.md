# Plan wdrożenia ulepszeń UX - AKROBUD

## Cel dokumentu
Szczegółowy plan wdrożenia zmian UX w projekcie AKROBUD z podziałem na fazy, minimalizując ryzyko regresji.

---

## Faza 0: Przygotowanie infrastruktury (PODSTAWA)

### 0.1 Utworzenie brancha feature
```bash
git checkout -b feature/ux-improvements
```

### 0.2 Rozbudowa systemu toast/error handling

**Pliki do modyfikacji:**
- `apps/web/src/lib/toast-helpers.ts`
- `apps/web/src/hooks/useToast.ts`
- `apps/web/src/components/ui/toast.tsx`

**Zmiany:**
1. Dodanie wariantu `warning` do toast (obecnie używa `destructive`)
2. Dodanie opcji `action` z retry button
3. Rozszerzenie `getErrorMessage()` o kategoryzację błędów

**Kod:**
```typescript
// toast-helpers.ts - dodać variant warning
export const showWarningToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: 'warning', // zmiana z 'destructive'
  });
};

// Nowa funkcja z retry
export const showRetryableErrorToast = (
  title: string,
  description: string,
  onRetry: () => void
) => {
  toast({
    title,
    description,
    variant: 'destructive',
    action: <ToastAction altText="Ponów" onClick={onRetry}>Ponów</ToastAction>,
  });
};
```

**Test:** Ręczne sprawdzenie czy toasty wyświetlają się poprawnie

---

## Faza 1: Dostępność (A11y) - KRYTYCZNE

### 1.1 Komponent FormField z ARIA

**Nowy plik:** `apps/web/src/components/ui/form-field.tsx`

**Zawartość:**
```typescript
interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ id, label, error, required, children }: FormFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {React.cloneElement(children as React.ReactElement, {
        id,
        'aria-invalid': !!error,
        'aria-describedby': error ? errorId : undefined,
        'aria-required': required,
      })}
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

### 1.2 Aktualizacja formularzy w DostawyPageContent

**Plik:** `apps/web/src/app/dostawy/DostawyPageContent.tsx`

**Sekcje do modyfikacji:**
- Dialog nowej dostawy (~linia 1539-1602)
- Formularz przypisania zlecenia

**Wzorzec:**
```tsx
// PRZED:
<select className="w-full border...">
  <option value="">...</option>
</select>

// PO:
<FormField id="delivery-number" label="Numer dostawy" error={deliveryErrors.deliveryNumber}>
  <select className="w-full border...">
    <option value="">...</option>
  </select>
</FormField>
```

### 1.3 Keyboard navigation dla sidebar

**Plik:** `apps/web/src/components/layout/sidebar.tsx`

**Dodać:**
- `onKeyDown` handler dla menu items
- Focus management przy submenu expand
- `role="navigation"`, `role="menu"`, `role="menuitem"`

**Przykład:**
```tsx
const handleKeyDown = (e: React.KeyboardEvent, item: NavigationItem) => {
  if (e.key === 'Enter' || e.key === ' ') {
    if (item.subItems) {
      toggleExpanded(item.href);
    }
  } else if (e.key === 'ArrowDown') {
    // Focus next item
  } else if (e.key === 'ArrowUp') {
    // Focus previous item
  }
};
```

**Test:** Nawigacja klawiaturą (Tab, Enter, strzałki)

---

## Faza 2: Loading States i Feedback

### 2.1 LoadingOverlay component

**Nowy plik:** `apps/web/src/components/ui/loading-overlay.tsx`

```typescript
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export function LoadingOverlay({ isLoading, message, children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <Spinner className="h-6 w-6 animate-spin text-blue-600" />
            {message && <span className="text-sm text-slate-600">{message}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2.2 SyncIndicator dla optimistic updates

**Nowy plik:** `apps/web/src/components/ui/sync-indicator.tsx`

```typescript
interface SyncIndicatorProps {
  isPending: boolean;
  isSynced: boolean;
  error?: boolean;
}

export function SyncIndicator({ isPending, isSynced, error }: SyncIndicatorProps) {
  if (error) return <AlertCircle className="h-3 w-3 text-red-500" />;
  if (isPending) return <RefreshCw className="h-3 w-3 text-yellow-500 animate-spin" />;
  if (isSynced) return <CheckCircle className="h-3 w-3 text-green-500" />;
  return null;
}
```

### 2.3 Integracja z DostawyPageContent

**Plik:** `apps/web/src/app/dostawy/DostawyPageContent.tsx`

**Zmiany:**
1. Wrap drag & drop areas w `LoadingOverlay`
2. Dodanie `SyncIndicator` przy elementach z `_optimistic: true`
3. Disable interactions podczas mutacji

---

## Faza 3: Responsywność tabel (Mobile)

### 3.1 ResponsiveTable component

**Nowy plik:** `apps/web/src/components/tables/ResponsiveTable.tsx`

```typescript
interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  mobileCardRender?: (item: T) => React.ReactNode;
  // ...inne props z DataTable
}

export function ResponsiveTable<T>({ columns, data, mobileCardRender, ...props }: ResponsiveTableProps<T>) {
  return (
    <>
      {/* Mobile: Card view */}
      <div className="md:hidden space-y-3">
        {data.map((item, idx) => (
          mobileCardRender ? mobileCardRender(item) : (
            <MobileDataCard key={idx} item={item} columns={columns} />
          )
        ))}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block">
        <DataTable columns={columns} data={data} {...props} />
      </div>
    </>
  );
}
```

### 3.2 MobileDataCard component

**Nowy plik:** `apps/web/src/components/tables/MobileDataCard.tsx`

```typescript
export function MobileDataCard<T>({ item, columns }: { item: T; columns: Column<T>[] }) {
  return (
    <Card className="p-4">
      {columns.slice(0, 4).map((col) => (
        <div key={col.key} className="flex justify-between py-1 border-b last:border-0">
          <span className="text-sm text-slate-500">{col.label}</span>
          <span className="text-sm font-medium">
            {col.render ? col.render(item, 0) : String((item as any)[col.key])}
          </span>
        </div>
      ))}
    </Card>
  );
}
```

### 3.3 Aktualizacja MobileScrollHint

**Plik:** `apps/web/src/components/ui/mobile-scroll-hint.tsx`

**Zmiany:**
- Zwiększyć timeout z 5s na 10s
- Dodać persist option

---

## Faza 4: StatusBadge - spójność kolorów

### 4.1 Centralized StatusBadge

**Nowy plik:** `apps/web/src/components/ui/status-badge.tsx`

```typescript
const STATUS_VARIANTS = {
  // Order statuses
  new: { variant: 'secondary', label: 'Nowe' },
  in_progress: { variant: 'default', label: 'W realizacji' },
  completed: { variant: 'success', label: 'Zakończone' },
  archived: { variant: 'outline', label: 'Archiwum' },

  // Delivery statuses
  planned: { variant: 'secondary', label: 'Zaplanowana' },
  loading: { variant: 'warning', label: 'Ładowanie' },
  shipped: { variant: 'default', label: 'Wysłana' },
  delivered: { variant: 'success', label: 'Dostarczona' },

  // Import statuses
  pending: { variant: 'warning', label: 'Oczekuje' },
  processing: { variant: 'default', label: 'Przetwarzanie' },
  success: { variant: 'success', label: 'Sukces' },
  error: { variant: 'destructive', label: 'Błąd' },
} as const;

type StatusType = keyof typeof STATUS_VARIANTS;

export function StatusBadge({ status }: { status: StatusType }) {
  const config = STATUS_VARIANTS[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

### 4.2 Migracja istniejących Badge

**Pliki do aktualizacji:**
- `apps/web/src/app/dostawy/DostawyPageContent.tsx`
- `apps/web/src/app/importy/page.tsx`
- `apps/web/src/app/magazyn/akrobud/page.tsx`
- `apps/web/src/features/dashboard/components/DashboardContent.tsx`

**Wzorzec migracji:**
```tsx
// PRZED:
<Badge variant="success">Zakończone</Badge>

// PO:
<StatusBadge status="completed" />
```

---

## Faza 5: Skeleton library

### 5.1 Rozbudowa skeletonów

**Pliki do modyfikacji:**
- `apps/web/src/components/loaders/TableSkeleton.tsx` - dodać animację i warianty
- `apps/web/src/components/loaders/CardSkeleton.tsx` - warianty rozmiaru
- `apps/web/src/components/loaders/DashboardSkeleton.tsx` - dopasować do layoutu

**Nowe pliki:**
- `apps/web/src/components/loaders/FormSkeleton.tsx`
- `apps/web/src/components/loaders/CalendarSkeleton.tsx` (dla Dostawy)

### 5.2 FormSkeleton

```typescript
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
```

---

## Faza 6: Drag & Drop fallback

### 6.1 Context menu dla zleceń

**Plik:** `apps/web/src/app/dostawy/DragDropComponents.tsx`

**Dodać:**
```typescript
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';

export function DraggableOrder({ order, onMoveToDelivery, deliveries }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        {/* existing draggable content */}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem disabled>Przenieś do dostawy:</ContextMenuItem>
        {deliveries.map((delivery) => (
          <ContextMenuItem
            key={delivery.id}
            onClick={() => onMoveToDelivery(order.id, delivery.id)}
          >
            {formatDate(delivery.deliveryDate)} ({delivery.deliveryNumber || 'bez numeru'})
          </ContextMenuItem>
        ))}
        <ContextMenuItem onClick={() => onMoveToDelivery(order.id, null)}>
          Usuń z dostawy
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
```

### 6.2 Keyboard hints

**Dodać tooltip przy pierwszym użyciu:**
```typescript
// W DostawyPageContent, przy pierwszym renderze
const [showDndHint, setShowDndHint] = useState(() => {
  return !localStorage.getItem('dnd-hint-shown');
});

useEffect(() => {
  if (showDndHint) {
    const timer = setTimeout(() => {
      setShowDndHint(false);
      localStorage.setItem('dnd-hint-shown', 'true');
    }, 8000);
    return () => clearTimeout(timer);
  }
}, [showDndHint]);

// Render hint
{showDndHint && (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg">
    💡 Przeciągnij zlecenie aby przypisać do dostawy, lub kliknij prawym przyciskiem myszy
  </div>
)}
```

---

## Harmonogram wdrożenia

| Faza | Czas | Priorytet | Ryzyko |
|------|------|-----------|--------|
| 0 - Infrastruktura | 2h | HIGH | LOW |
| 1 - A11y | 4h | CRITICAL | LOW |
| 2 - Loading States | 3h | HIGH | MEDIUM |
| 3 - Responsywność | 4h | MEDIUM | MEDIUM |
| 4 - StatusBadge | 2h | MEDIUM | LOW |
| 5 - Skeletony | 2h | LOW | LOW |
| 6 - DnD fallback | 3h | MEDIUM | MEDIUM |

**Łączny czas:** ~20h roboczych

---

## Checklist przed wdrożeniem każdej fazy

- [ ] Utworzyć branch dla fazy (np. `feature/ux-phase-1-a11y`)
- [ ] Uruchomić testy TypeScript (`pnpm typecheck`)
- [ ] Uruchomić lint (`pnpm lint`)
- [ ] Zbudować projekt (`pnpm build`)
- [ ] Przetestować manualnie na:
  - [ ] Desktop Chrome
  - [ ] Desktop Firefox
  - [ ] Mobile Safari (iOS)
  - [ ] Mobile Chrome (Android)
- [ ] Merge do `feature/ux-improvements`
- [ ] Code review

---

## Rollback plan

Każda faza jest niezależna. W razie problemów:

1. **Faza 0-1:** Revert pojedynczych plików
2. **Faza 2-6:** Revert całego brancha fazy

**Komendy rollback:**
```bash
# Revert ostatniego commita
git revert HEAD

# Revert konkretnego commita
git revert <commit-hash>

# Hard reset do poprzedniego stanu (OSTROŻNIE)
git reset --hard <commit-hash>
```

---

## Metryki sukcesu

Po wdrożeniu sprawdzić:

1. **Lighthouse Accessibility score:** cel 90+
2. **Lighthouse Performance score:** cel 80+
3. **Zero błędów w console** przy normalnym użytkowaniu
4. **Keyboard-only navigation** działa bez problemów
5. **Mobile usability** - wszystkie funkcje dostępne

---

## Notatki implementacyjne

### Zależności do zainstalowania
Prawdopodobnie żadne - wszystkie używane biblioteki już są w projekcie:
- `@radix-ui/react-context-menu` - sprawdzić czy jest, jeśli nie: `pnpm add @radix-ui/react-context-menu`

### Pliki które NIE powinny być modyfikowane w tej iteracji
- `apps/api/*` - backend nie wymaga zmian
- `apps/web/src/lib/api.ts` - API client bez zmian
- `apps/web/src/lib/api-client.ts` - bez zmian
- Schematy Prisma

### Potencjalne konflikty
- `DostawyPageContent.tsx` - duży plik, możliwe konflikty z innymi zmianami
- `sidebar.tsx` - może być modyfikowany przez inne features

---

## Zatwierdzenie planu

- [ ] Plan przejrzany i zatwierdzony przez developera
- [ ] Oszacowany czas zaakceptowany
- [ ] Priorytety ustalone
- [ ] Rozpoczęcie implementacji: ____________
