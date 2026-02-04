# Plan: Rozszerzony System Toastów z Undo, Progress i Grupowaniem

## Cel
Implementacja rozbudowanego systemu powiadomień (toastów) z funkcjami:
- **Undo toasts** - dla akcji destrukcyjnych z możliwością cofnięcia
- **Progress toasts** - dla długich operacji (>2s)
- **Persistent toasts** - dla krytycznych błędów (nie znikają automatycznie)
- **Grouped toasts** - podsumowanie zamiast N osobnych toastów
- **useToastMutation** - wrapper hook dla automatycznych toastów

## Pliki do utworzenia

### 1. `apps/web/src/lib/toast-extended.ts`
Rozszerzone funkcje toastów:

```typescript
// showPersistentToast - toast który nie znika automatycznie
export function showPersistentToast(options: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: { label: string; onClick: () => void };
}): { dismiss: () => void };

// showProgressToast - toast z paskiem postępu
export function showProgressToast(options: {
  title: string;
  description?: string;
}): {
  update: (progress: number, description?: string) => void;
  complete: (title?: string, description?: string) => void;
  error: (title?: string, description?: string) => void;
  dismiss: () => void;
};

// showGroupedToast - podsumowanie wielu operacji
export function showGroupedToast(options: {
  title: string;
  results: { success: number; failed: number; total: number };
  failedItems?: string[];
  onShowDetails?: () => void;
}): void;
```

### 2. `apps/web/src/lib/toast-undo.ts`
Toast z akcją Cofnij:

```typescript
// showUndoToast - toast z przyciskiem "Cofnij"
export function showUndoToast(options: {
  title: string;
  description?: string;
  undoLabel?: string; // default: "Cofnij"
  onUndo: () => void | Promise<void>;
  duration?: number; // default: 5000ms
}): { dismiss: () => void };
```

### 3. `apps/web/src/hooks/useToastMutation.ts`
Wrapper hook dla automatycznych toastów:

```typescript
interface UseToastMutationOptions<TData, TError, TVariables, TContext>
  extends UseMutationOptions<TData, TError, TVariables, TContext> {

  // Komunikaty sukcesu/błędu
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  errorMessage?: string | ((error: TError) => string);

  // Wariant toastu
  variant?: 'default' | 'success' | 'info';

  // Dla długich operacji - pokaż progress
  showProgress?: boolean;
  progressTitle?: string;

  // Dla operacji z undo
  enableUndo?: boolean;
  undoFn?: (data: TData, variables: TVariables) => Promise<void>;
  undoDuration?: number;

  // Wyłącz toast (gdy chcesz ręcznie)
  disableToast?: boolean;
}

export function useToastMutation<TData, TError, TVariables, TContext>(
  options: UseToastMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext>;
```

### 4. `apps/web/src/hooks/useUndoableAction.ts`
Hook dla akcji z możliwością cofnięcia:

```typescript
interface UseUndoableActionOptions<T> {
  action: () => Promise<T>;
  undoAction: (result: T) => Promise<void>;
  successMessage: string;
  undoMessage?: string;
  duration?: number;
}

export function useUndoableAction<T>(
  options: UseUndoableActionOptions<T>
): {
  execute: () => Promise<T | undefined>;
  isExecuting: boolean;
  isUndoing: boolean;
};
```

### 5. `apps/web/src/components/ui/toast-progress.tsx`
Komponent progress bar dla toastu:

```typescript
interface ToastProgressProps {
  progress: number; // 0-100
  className?: string;
}

export function ToastProgress({ progress, className }: ToastProgressProps): JSX.Element;
```

## Pliki do modyfikacji

### 6. `apps/web/src/lib/toast-helpers.ts`
Dodać re-eksporty nowych funkcji:

```typescript
// Existing exports...
export { showPersistentToast, showProgressToast, showGroupedToast } from './toast-extended';
export { showUndoToast } from './toast-undo';
```

### 7. `apps/web/src/components/ui/toaster.tsx`
Rozszerzyć o obsługę progress i persistent:

- Dodać obsługę `duration: Infinity` dla persistent toastów
- Dodać renderowanie `ToastProgress` gdy toast ma progress

## Fazy implementacji

### Faza 1: Podstawowe rozszerzenia (toast-extended.ts)
1. Utworzyć `toast-extended.ts` z `showPersistentToast`
2. Dodać `showProgressToast` z kontrolerem
3. Dodać `showGroupedToast` dla bulk operacji
4. Dodać re-eksporty do `toast-helpers.ts`

### Faza 2: System Undo (toast-undo.ts)
1. Utworzyć `toast-undo.ts` z `showUndoToast`
2. Utworzyć `useUndoableAction` hook
3. Dodać re-eksport do `toast-helpers.ts`

### Faza 3: Wrapper Hook (useToastMutation.ts)
1. Utworzyć `useToastMutation` wrapper
2. Zintegrować z progress i undo
3. Dodać TypeScript generics dla type-safety

### Faza 4: Komponent Progress (toast-progress.tsx)
1. Utworzyć `ToastProgress` komponent
2. Zmodyfikować `toaster.tsx` dla obsługi progress
3. Dodać animacje i style

### Faza 5: Migracja istniejącego kodu
1. Zastąpić `useMutation` → `useToastMutation` w palletach
2. Dodać undo do operacji usuwania
3. Dodać progress do długich importów

## Przykłady użycia

### useToastMutation - podstawowe użycie
```typescript
const mutation = useToastMutation({
  mutationFn: (data) => api.updateOrder(data),
  successMessage: 'Zlecenie zaktualizowane',
  errorMessage: 'Nie udało się zaktualizować zlecenia',
});
```

### useToastMutation z progress
```typescript
const importMutation = useToastMutation({
  mutationFn: importOrders,
  showProgress: true,
  progressTitle: 'Importowanie zleceń...',
  successMessage: (data) => `Zaimportowano ${data.count} zleceń`,
});
```

### useToastMutation z undo
```typescript
const deleteMutation = useToastMutation({
  mutationFn: (id) => api.softDeleteDelivery(id),
  enableUndo: true,
  undoFn: (_, id) => api.restoreDelivery(id),
  successMessage: 'Dostawa usunięta',
});
```

### showGroupedToast
```typescript
showGroupedToast({
  title: 'Import zakończony',
  results: { success: 45, failed: 3, total: 48 },
  failedItems: ['Zlecenie 123', 'Zlecenie 456', 'Zlecenie 789'],
  onShowDetails: () => setShowErrorDialog(true),
});
```

### showPersistentToast
```typescript
const { dismiss } = showPersistentToast({
  title: 'Błąd połączenia z bazą danych',
  description: 'Sprawdź połączenie sieciowe',
  variant: 'destructive',
  action: {
    label: 'Spróbuj ponownie',
    onClick: () => refetch(),
  },
});
```

## Zgodność wsteczna

- Istniejące `useToast`, `showSuccessToast`, `showErrorToast` etc. działają bez zmian
- Nowe funkcje są addytywne - nie modyfikują istniejącego API
- Migracja jest opcjonalna - można stopniowo przechodzić na nowe hooki

## Checklist przed implementacją

- [ ] Przeczytać COMMON_MISTAKES.md
- [ ] Sprawdzić czy Shadcn toast obsługuje duration: Infinity
- [ ] Sprawdzić czy można dodać custom content do toastu (progress bar)
- [ ] Upewnić się że animacje nie kolidują z istniejącymi

## Pliki docelowe

```
apps/web/src/
├── lib/
│   ├── toast-helpers.ts      # Modyfikacja - re-eksporty
│   ├── toast-extended.ts     # NOWY - persistent, progress, grouped
│   └── toast-undo.ts         # NOWY - undo toast
├── hooks/
│   ├── useToastMutation.ts   # NOWY - wrapper hook
│   └── useUndoableAction.ts  # NOWY - undo pattern
└── components/ui/
    ├── toaster.tsx           # Modyfikacja - progress support
    └── toast-progress.tsx    # NOWY - progress component
```
