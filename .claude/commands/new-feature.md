# Nowa Funkcjonalność Frontend

Kreator nowej funkcjonalności zgodnie ze strukturą features/.

## Jak używać

Podaj:
1. **Nazwa feature** (np. "pallets", "glass-tracking", "reports")
2. **Typ**: page | modal | tab | component
3. **Opis** co ma robić

## Przykłady

```
/new-feature pallets page - strona zarządzania paletami
/new-feature delivery-confirm modal - modal potwierdzenia dostawy
/new-feature order-history tab - zakładka historii zlecenia
```

## Co wygeneruję

### Struktura katalogów

```
apps/web/src/features/{feature-name}/
├── api/
│   ├── queries.ts      # React Query hooks (useQuery)
│   └── mutations.ts    # React Query mutations (useMutation)
├── components/
│   ├── {Feature}Page.tsx       # Główny komponent (jeśli page)
│   ├── {Feature}Modal.tsx      # Modal (jeśli modal)
│   ├── {Feature}Tab.tsx        # Tab (jeśli tab)
│   ├── {Feature}List.tsx       # Lista elementów
│   ├── {Feature}Form.tsx       # Formularz
│   └── {Feature}Card.tsx       # Karta pojedynczego elementu
├── hooks/
│   └── use{Feature}.ts         # Custom hooks z logiką
├── types/
│   └── index.ts                # TypeScript types
└── index.ts                    # Public exports
```

### 1. API Queries (api/queries.ts)
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const {feature}Keys = {
  all: ['{feature}'] as const,
  list: (filters?: Filters) => [...{feature}Keys.all, 'list', filters] as const,
  detail: (id: number) => [...{feature}Keys.all, 'detail', id] as const,
};

export function use{Feature}List(filters?: Filters) {
  return useQuery({
    queryKey: {feature}Keys.list(filters),
    queryFn: () => apiClient.get('/{feature}', { params: filters }),
  });
}

export function use{Feature}Detail(id: number) {
  return useQuery({
    queryKey: {feature}Keys.detail(id),
    queryFn: () => apiClient.get(`/{feature}/${id}`),
    enabled: !!id,
  });
}
```

### 2. API Mutations (api/mutations.ts)
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { {feature}Keys } from './queries';

export function useCreate{Feature}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Create{Feature}Input) =>
      apiClient.post('/{feature}', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {feature}Keys.all });
      toast.success('Utworzono pomyślnie');
    },
    onError: (error) => {
      toast.error('Błąd podczas tworzenia');
    },
  });
}

export function useUpdate{Feature}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Update{Feature}Input }) =>
      apiClient.put(`/{feature}/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {feature}Keys.all });
      toast.success('Zaktualizowano pomyślnie');
    },
  });
}

export function useDelete{Feature}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/{feature}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {feature}Keys.all });
      toast.success('Usunięto pomyślnie');
    },
  });
}
```

### 3. Główny komponent (components/{Feature}Page.tsx)
```typescript
'use client';

import { Suspense } from 'react';
import { {Feature}List } from './{Feature}List';
import { {Feature}ListSkeleton } from './{Feature}ListSkeleton';
import { PageHeader } from '@/components/ui/page-header';

export function {Feature}Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="{Feature}"
        description="Zarządzanie {feature}"
      />

      <Suspense fallback={<{Feature}ListSkeleton />}>
        <{Feature}List />
      </Suspense>
    </div>
  );
}
```

### 4. Types (types/index.ts)
```typescript
export interface {Feature} {
  id: number;
  // ... pola z API
  createdAt: string;
  updatedAt: string;
}

export interface Create{Feature}Input {
  // ... pola do tworzenia
}

export interface Update{Feature}Input {
  // ... pola do aktualizacji
}

export interface {Feature}Filters {
  // ... filtry dla listy
}
```

## Checklist generowania

- [ ] Sprawdzam czy feature już istnieje
- [ ] Sprawdzam czy endpoint API istnieje
- [ ] Używam istniejących komponentów UI (Shadcn)
- [ ] Dodaję loading states (Suspense + Skeleton)
- [ ] Dodaję error states
- [ ] disabled={isPending} na buttonach
- [ ] Toast dla success/error

## Teraz

Podaj nazwę i typ funkcjonalności:

```
Przykład: "glass-tracking page - śledzenie zamówień szyb"
```
