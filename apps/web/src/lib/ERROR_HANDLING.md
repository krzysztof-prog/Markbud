# Obsługa Błędów w Frontend

## Przegląd

System obsługi błędów we frontendzie składa się z:

1. **API Client** - Typowane błędy API z timeout handling
2. **Error Logger** - Centralizowane logowanie błędów
3. **Error UI Components** - Komponenty do wyświetlania błędów
4. **Global Error Handler** - Globalny error boundary
5. **React Query Configuration** - Smart retry logic

---

## 1. API Client

Plik: `apps/web/src/lib/api-client.ts`

### ApiError Interface

```typescript
interface ApiError extends Error {
  status?: number;
  data?: Record<string, unknown>;
}
```

### Obsługiwane błędy

1. **HTTP Errors** - Status 4xx/5xx z backend
2. **Network Errors** - TypeError z fetch
3. **Timeout Errors** - AbortError (3.5 min timeout)
4. **204 No Content** - Zwraca pusty obiekt

### Użycie

```typescript
import { fetchApi } from '@/lib/api-client';

try {
  const data = await fetchApi<Order[]>('/api/orders');
} catch (error) {
  if (error instanceof Error && 'status' in error) {
    const apiError = error as ApiError;
    console.log(apiError.status); // 404, 500, etc.
    console.log(apiError.data);   // { error: '...', validation: {...} }
  }
}
```

### Upload plików

```typescript
import { uploadFile } from '@/lib/api-client';

const formData = new FormData();
formData.append('file', file);

const result = await uploadFile('/api/imports/upload', formData);
```

---

## 2. Error Logger

Plik: `apps/web/src/lib/error-logger.ts`

### Funkcje logowania

#### `logError(error, context?, severity?)`

Główna funkcja logowania.

```typescript
import { logError } from '@/lib/error-logger';

try {
  await operation();
} catch (error) {
  logError(error, {
    component: 'OrderForm',
    action: 'submit',
    userId: user.id,
  }, 'error');
}
```

#### `logApiError(error, endpoint, method?, context?)`

Specjalizowane dla błędów API.

```typescript
import { logApiError } from '@/lib/error-logger';

try {
  await fetchApi('/api/orders', { method: 'POST' });
} catch (error) {
  logApiError(error, '/api/orders', 'POST', {
    orderNumber: data.orderNumber,
  });
}
```

#### `logQueryError(error, queryKey, context?)`

Dla błędów React Query.

```typescript
import { logQueryError } from '@/lib/error-logger';

const { data, error } = useQuery({
  queryKey: ['orders', filters],
  queryFn: () => ordersApi.getAll(filters),
  onError: (error) => {
    logQueryError(error, ['orders', filters], {
      filters: JSON.stringify(filters),
    });
  },
});
```

#### `logMutationError(error, mutationKey, variables?, context?)`

Dla błędów mutacji.

```typescript
import { logMutationError } from '@/lib/error-logger';

const mutation = useMutation({
  mutationFn: ordersApi.create,
  onError: (error, variables) => {
    logMutationError(error, 'createOrder', variables, {
      component: 'OrderForm',
    });
  },
});
```

#### `logComponentError(error, componentName, componentStack?, context?)`

Dla błędów komponentów React.

```typescript
import { logComponentError } from '@/lib/error-logger';

class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    logComponentError(
      error,
      'Dashboard',
      errorInfo.componentStack,
      { userId: this.props.userId }
    );
  }
}
```

### Utility Functions

```typescript
// Pobierz logi z localStorage
const logs = getErrorLogs();

// Wyczyść logi
clearErrorLogs();

// Setup globalnego error handler (wywoływane w Providers)
setupGlobalErrorHandler();
```

---

## 3. Error UI Components

Plik: `apps/web/src/components/ui/error-ui.tsx`

### `<ErrorUI />` - Główny komponent

**Props:**
- `message` - Wiadomość błędu
- `title` - Tytuł błędu
- `onRetry` - Funkcja retry
- `retryText` - Tekst przycisku retry
- `showHomeButton` - Czy pokazać przycisk Home
- `variant` - `'inline' | 'centered' | 'alert'`
- `error` - Error object (szczegóły w dev)
- `actions` - Dodatkowe akcje

**Warianty:**

#### Inline (domyślny)

```typescript
<ErrorUI
  title="Błąd ładowania"
  message="Nie udało się załadować danych"
  onRetry={refetch}
/>
```

#### Centered (pełna strona)

```typescript
<ErrorUI
  variant="centered"
  title="Błąd ładowania dashboard"
  message="Spróbuj ponownie lub wróć do strony głównej"
  onRetry={refetch}
  showHomeButton
  error={error}
/>
```

#### Alert (w Card/Section)

```typescript
<ErrorUI
  variant="alert"
  title="Błąd walidacji"
  message="Wypełnij wszystkie wymagane pola"
/>
```

### `<InlineError />` - Kompaktowy error

Dla tabel i list.

```typescript
<InlineError
  message="Nie udało się załadować zleceń"
  onRetry={refetch}
/>
```

---

## 4. Global Error Handler

Plik: `apps/web/src/app/error.tsx`

Automatycznie przechwytuje wszystkie nieobsłużone błędy w App Router.

**Funkcje:**
- Wyświetla przyjazny UI błędu
- Loguje błąd przez error-logger
- Pokazuje szczegóły w development
- Przyciski "Spróbuj ponownie" i "Strona główna"

**Użycie automatyczne:**
```typescript
// Każdy throw w komponentach Server/Client zostanie przechwycony
throw new Error('Nieoczekiwany błąd');
```

---

## 5. React Query Configuration

Plik: `apps/web/src/app/providers.tsx`

### Smart Retry Logic

```typescript
retry: (failureCount, error) => {
  const err = error as { status?: number };
  // Nie retry na 404 lub 403
  if (err?.status === 404 || err?.status === 403) {
    return false;
  }
  // Max 1 retry dla innych
  return failureCount < 1;
}
```

### Konfiguracja

- **Queries:**
  - staleTime: 5 minut
  - gcTime: 30 minut
  - refetchOnWindowFocus: false
  - refetchOnMount: false
  - refetchOnReconnect: true
  - retry: 1 (oprócz 404/403)
  - networkMode: 'online'

- **Mutations:**
  - retry: 0 (bez retry)
  - networkMode: 'online'

---

## Wzorce użycia

### ✅ DOBRZE - Query z pełną obsługą błędów

```typescript
const {
  data,
  isLoading,
  error,
  refetch,
} = useQuery({
  queryKey: ['orders', filters],
  queryFn: () => ordersApi.getAll(filters),
});

if (isLoading) {
  return <OrdersSkeleton />;
}

if (error) {
  return (
    <ErrorUI
      variant="centered"
      title="Błąd ładowania zleceń"
      message="Nie udało się pobrać listy zleceń"
      onRetry={refetch}
      error={error as Error}
    />
  );
}

if (!data?.length) {
  return <EmptyState message="Brak zleceń" />;
}

return <OrdersList data={data} />;
```

### ✅ DOBRZE - Mutation z error handling

```typescript
const mutation = useMutation({
  mutationFn: (data: CreateOrderInput) => ordersApi.create(data),

  onMutate: async (newOrder) => {
    // Optimistic update
    await queryClient.cancelQueries({ queryKey: ['orders'] });
    const previousOrders = queryClient.getQueryData(['orders']);
    queryClient.setQueryData(['orders'], (old) => [...old, tempOrder]);
    return { previousOrders };
  },

  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    showSuccessToast('Sukces', 'Zlecenie utworzone pomyślnie');
  },

  onError: (error, variables, context) => {
    // Rollback optimistic update
    if (context?.previousOrders) {
      queryClient.setQueryData(['orders'], context.previousOrders);
    }

    // Pokaż toast z retry
    showCategorizedErrorToast(error, () => mutation.mutate(variables));

    // Loguj błąd
    logMutationError(error, 'createOrder', variables);
  },
});
```

### ✅ DOBRZE - Obsługa ConflictError (409)

```typescript
const importMutation = useMutation({
  mutationFn: ({ file, replace }) => glassOrdersApi.importFromTxt(file, replace),

  onSuccess: (data) => {
    showSuccessToast('Import udany', `Zamówienie ${data.glassOrderNumber} zaimportowane`);
  },

  onError: (error: any) => {
    // Konflikt - pokaż modal z opcjami
    if (error?.status === 409 && error?.data?.details) {
      setConflictDetails(error.data.details);
      setShowConflictModal(true);
      return;
    }

    // Inne błędy - toast
    showErrorToast('Błąd importu', getErrorMessage(error));
  },
});
```

### ✅ DOBRZE - Toast z kategoryzacją

```typescript
import { showCategorizedErrorToast } from '@/lib/toast-helpers';

try {
  await operation();
} catch (error) {
  // Automatycznie rozpozna typ błędu i pokaże odpowiedni toast
  showCategorizedErrorToast(error, () => retry());
}
```

Kategorie:
- **timeout** - "Przekroczono czas oczekiwania"
- **network** - "Błąd połączenia"
- **validation** - "Błąd walidacji" (warning toast)
- **server** - "Błąd serwera"
- **unknown** - "Wystąpił błąd"

### ❌ ŹLE - Query bez error handling

```typescript
const { data } = useQuery({ ... });

// Brak obsługi error - użytkownik nie wie co się stało
return <OrdersList data={data || []} />;
```

### ❌ ŹLE - Mutation bez error toast

```typescript
const mutation = useMutation({
  mutationFn: ordersApi.create,
  onSuccess: () => {
    showSuccessToast('Sukces');
  },
  // BRAK onError - użytkownik nie wie czy się nie powiodło
});
```

---

## Toast Helpers

Plik: `apps/web/src/lib/toast-helpers.ts`

### Podstawowe toasty

```typescript
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  showWarningToast,
} from '@/lib/toast-helpers';

showSuccessToast('Sukces', 'Operacja zakończona pomyślnie');
showErrorToast('Błąd', 'Coś poszło nie tak');
showInfoToast('Info', 'Synchronizacja w real-time aktywna');
showWarningToast('Ostrzeżenie', 'Sprawdź dane przed kontynuacją');
```

### Toast z retry

```typescript
import { showRetryableErrorToast } from '@/lib/toast-helpers';

showRetryableErrorToast(
  'Błąd połączenia',
  'Sprawdź połączenie z internetem',
  () => {
    // Funkcja retry
    refetch();
  }
);
```

### Kategoryzacja automatyczna

```typescript
import { showCategorizedErrorToast } from '@/lib/toast-helpers';

try {
  await fetchApi('/api/orders');
} catch (error) {
  // Automatycznie rozpozna typ i pokaże odpowiedni toast
  showCategorizedErrorToast(error);

  // Z retry callback
  showCategorizedErrorToast(error, () => retry());
}
```

---

## Checklist dla nowych komponentów

- [ ] Query używa `error` i `refetch` z useQuery
- [ ] Loading state renderuje Skeleton
- [ ] Error state renderuje `<ErrorUI />` z onRetry
- [ ] Empty state ma dedykowany komponent
- [ ] Mutation ma `onSuccess` z toast
- [ ] Mutation ma `onError` z toast i logging
- [ ] Optimistic updates mają rollback w onError
- [ ] ConflictError (409) ma dedykowaną obsługę
- [ ] Wszystkie komunikaty błędów po polsku
- [ ] Critical errors są logowane przez error-logger

---

## Przykłady z projektu

Zobacz implementacje:
- `apps/web/src/features/dashboard/components/DashboardContent.tsx` - ErrorUI centered
- `apps/web/src/features/deliveries/hooks/useDeliveryMutations.ts` - Optimistic updates
- `apps/web/src/features/glass/components/GlassOrderImportSection.tsx` - ConflictError handling
- `apps/web/src/app/error.tsx` - Global error boundary
- `apps/web/src/lib/toast-helpers.ts` - Toast categorization

---

## Debugging

### Logi błędów w localStorage

```typescript
import { getErrorLogs, clearErrorLogs } from '@/lib/error-logger';

// W console devtools
const logs = getErrorLogs();
console.table(logs);

// Wyczyść logi
clearErrorLogs();
```

### Environment-specific behavior

**Development:**
- Wszystkie błędy logowane do console
- Error details widoczne w UI
- Stack traces wyświetlane

**Production:**
- Błędy wysyłane do error service (TODO: Sentry)
- Generyczne komunikaty dla użytkownika
- Szczegóły ukryte
