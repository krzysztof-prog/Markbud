# AKROBUD - Szablony kodu

Gotowe szablony do kopiowania przy tworzeniu nowych funkcjonalnosci.
Architektura: **Route -> Handler -> Service -> Repository**

---

## 1. Nowy endpoint API (pelny stos)

### Route (apps/api/src/routes/feature.ts)

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { FeatureRepository } from '../repositories/FeatureRepository.js';
import { FeatureService } from '../services/featureService.js';
import { FeatureHandler } from '../handlers/featureHandler.js';
import { verifyAuth } from '../middleware/auth.js';

export const featureRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new FeatureRepository(prisma);
  const service = new FeatureService(repository);
  const handler = new FeatureHandler(service);

  fastify.get('/', { preHandler: verifyAuth }, (req, reply) => handler.getAll(req, reply));
  fastify.get('/:id', { preHandler: verifyAuth }, (req, reply) => handler.getById(req, reply));
  fastify.post('/', { preHandler: verifyAuth }, (req, reply) => handler.create(req, reply));
  fastify.put('/:id', { preHandler: verifyAuth }, (req, reply) => handler.update(req, reply));
  fastify.delete('/:id', { preHandler: verifyAuth }, (req, reply) => handler.delete(req, reply));
};
```

### Handler (apps/api/src/handlers/featureHandler.ts)

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { FeatureService } from '../services/featureService.js';
import { createFeatureSchema, updateFeatureSchema } from '../validators/feature.js';
import { parseId } from '../utils/validation.js';

export class FeatureHandler {
  constructor(private service: FeatureService) {}

  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const items = await this.service.getAll();
    return reply.send(items);
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseId(request.params.id);
    const item = await this.service.getById(id);
    return reply.send(item);
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createFeatureSchema.parse(request.body);
    const item = await this.service.create(data);
    return reply.status(201).send(item);
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseId(request.params.id);
    const data = updateFeatureSchema.parse(request.body);
    const item = await this.service.update(id, data);
    return reply.send(item);
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseId(request.params.id);
    await this.service.delete(id);
    return reply.status(204).send();
  }
}
```

### Service (apps/api/src/services/featureService.ts)

```typescript
import { FeatureRepository } from '../repositories/FeatureRepository.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { cacheService } from './cache.js';
import type { CreateFeatureInput, UpdateFeatureInput } from '../validators/feature.js';

export class FeatureService {
  constructor(private repository: FeatureRepository) {}

  async getAll() {
    return this.repository.findAll();
  }

  async getById(id: number) {
    const item = await this.repository.findById(id);
    if (!item) throw new NotFoundError('Feature');
    return item;
  }

  async create(data: CreateFeatureInput) {
    const item = await this.repository.create(data);
    cacheService.invalidate('feature:*');
    return item;
  }

  async update(id: number, data: UpdateFeatureInput) {
    await this.getById(id); // weryfikacja czy istnieje
    const item = await this.repository.update(id, data);
    cacheService.invalidate('feature:*');
    return item;
  }

  async delete(id: number) {
    await this.getById(id);
    // SOFT DELETE - nigdy hard delete!
    await this.repository.softDelete(id);
    cacheService.invalidate('feature:*');
  }
}
```

### Repository (apps/api/src/repositories/FeatureRepository.ts)

```typescript
import { PrismaClient } from '@prisma/client';

export class FeatureRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.feature.findMany({
      where: { deletedAt: null }, // zawsze filtruj soft-deleted
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.feature.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async create(data: { name: string }) {
    return this.prisma.feature.create({ data });
  }

  async update(id: number, data: { name?: string }) {
    return this.prisma.feature.update({ where: { id }, data });
  }

  async softDelete(id: number) {
    return this.prisma.feature.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
```

### Validator (apps/api/src/validators/feature.ts)

```typescript
import { z } from 'zod';

export const createFeatureSchema = z.object({
  name: z.string().min(1).max(255),
  // dodaj pola
});

export const updateFeatureSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;
export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;
```

### Rejestracja route w index.ts

```typescript
// apps/api/src/index.ts - dodaj:
import { featureRoutes } from './routes/feature.js';
fastify.register(featureRoutes, { prefix: '/api/features' });
```

---

## 2. Nowy feature frontend

### API client (apps/web/src/features/feature/api/featureApi.ts)

```typescript
import { fetchApi } from '@/lib/api-client';

export interface Feature {
  id: number;
  name: string;
  createdAt: string;
}

export interface CreateFeatureData {
  name: string;
}

export const featureApi = {
  getAll: () =>
    fetchApi<Feature[]>('/api/features'),

  getById: (id: number) =>
    fetchApi<Feature>(`/api/features/${id}`),

  create: (data: CreateFeatureData) =>
    fetchApi<Feature>('/api/features', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<CreateFeatureData>) =>
    fetchApi<Feature>(`/api/features/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi(`/api/features/${id}`, {
      method: 'DELETE',
    }),
};
```

### Hooks (apps/web/src/features/feature/hooks/useFeature.ts)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';
import { featureApi } from '../api/featureApi';

const QUERY_KEY = ['features'];

export function useFeatures() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: featureApi.getAll,
  });
}

export function useFeature(id: number) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => featureApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: featureApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast('Dodano');
    },
    onError: () => showErrorToast('Blad dodawania'),
  });
}

export function useUpdateFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateFeatureData> }) =>
      featureApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast('Zaktualizowano');
    },
    onError: () => showErrorToast('Blad aktualizacji'),
  });
}

export function useDeleteFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: featureApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast('Usunieto');
    },
    onError: () => showErrorToast('Blad usuwania'),
  });
}
```

### Komponent tabeli z akcjami (apps/web/src/features/feature/components/FeatureList.tsx)

```tsx
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2 } from 'lucide-react';
import { useFeatures, useDeleteFeature } from '../hooks/useFeature';
import type { Feature } from '../api/featureApi';

export function FeatureList() {
  const { data: features, isLoading } = useFeatures();
  const deleteMutation = useDeleteFeature();
  const [deleteTarget, setDeleteTarget] = useState<Feature | null>(null);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Ladowanie...</div>;
  }

  if (!features?.length) {
    return <div className="text-center py-8 text-muted-foreground">Brak danych</div>;
  }

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSettled: () => setDeleteTarget(null),
    });
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Nazwa</TableHead>
            <TableHead>Data utworzenia</TableHead>
            <TableHead className="w-[100px]">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {features.map((feature) => (
            <TableRow key={feature.id}>
              <TableCell>{feature.id}</TableCell>
              <TableCell>{feature.name}</TableCell>
              <TableCell>
                {new Date(feature.createdAt).toLocaleDateString('pl-PL')}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(feature)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Dialog potwierdzenia usuwania */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Element &quot;{deleteTarget?.name}&quot;
              zostanie trwale usuniety.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Usuwanie...' : 'Usun'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

### Strona (apps/web/src/app/feature/page.tsx)

```tsx
import { FeatureList } from '@/features/feature/components/FeatureList';

export default function FeaturePage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Features</h1>
        {/* Przycisk dodawania */}
      </div>
      <FeatureList />
    </div>
  );
}
```

---

## 3. Nowa migracja Prisma

### Komendy

```bash
# 1. Edytuj schema.prisma
# 2. Wygeneruj migracje:
pnpm db:migrate --name add_feature_table

# NIGDY: pnpm db:push (niszczy dane!)

# 3. Wygeneruj klienta:
pnpm db:generate
```

### Wzorzec modelu (prisma/schema.prisma)

```prisma
model Feature {
  id        Int       @id @default(autoincrement())
  name      String
  status    String    @default("active")
  deletedAt DateTime? @map("deleted_at")  // soft delete
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@index([deletedAt])
  @@map("features")
}
```

### Relacja jeden-do-wielu

```prisma
model Order {
  id         Int         @id @default(autoincrement())
  clientId   Int         @map("client_id")
  client     Client      @relation(fields: [clientId], references: [id])
  items      OrderItem[]
  deletedAt  DateTime?   @map("deleted_at")
  createdAt  DateTime    @default(now()) @map("created_at")
  updatedAt  DateTime    @updatedAt @map("updated_at")

  @@index([clientId])
  @@index([deletedAt])
  @@map("orders")
}
```

---

## 4. Wzorce typowe

### Operacje pieniezne (KRYTYCZNE)

```typescript
// ZAWSZE uzywaj helpera grosze <-> PLN:
import { groszeToPln, plnToGrosze } from '../utils/money.js';

const displayValue = groszeToPln(order.valuePln); // z DB (grosze) do wyswietlenia (PLN)
const dbValue = plnToGrosze(userInput);           // z inputa (PLN) do DB (grosze)

// NIGDY:
// parseFloat(order.valuePln)
// order.valuePln.toFixed(2)
// Math.round(price * 100) -- uzyj plnToGrosze()
```

### Soft delete

```typescript
// Repository - usuwanie:
async softDelete(id: number) {
  return this.prisma.feature.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// Repository - kazde zapytanie MUSI filtrowac:
async findAll() {
  return this.prisma.feature.findMany({
    where: { deletedAt: null },
  });
}

async findById(id: number) {
  return this.prisma.feature.findUnique({
    where: { id, deletedAt: null },
  });
}
```

### Transakcja Prisma

```typescript
const result = await prisma.$transaction(async (tx) => {
  const a = await tx.model1.create({ data: { ... } });
  const b = await tx.model2.update({
    where: { id: someId },
    data: { ... },
  });
  return { a, b };
});
```

### Button z disabled podczas mutacji

```tsx
const { mutate, isPending } = useMutation({ ... });

<Button disabled={isPending} onClick={() => mutate(data)}>
  {isPending ? 'Zapisywanie...' : 'Zapisz'}
</Button>
```

### Dialog potwierdzenia (destructive action)

```tsx
const [target, setTarget] = useState<Item | null>(null);

<AlertDialog open={!!target} onOpenChange={() => setTarget(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Czy na pewno?</AlertDialogTitle>
      <AlertDialogDescription>
        Ta operacja jest nieodwracalna.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isPending}>Anuluj</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDelete}
        disabled={isPending}
        className="bg-red-600 hover:bg-red-700"
      >
        {isPending ? 'Usuwanie...' : 'Usun'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Formularz z walidacja Zod (react-hook-form)

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const formSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(255),
});

type FormValues = z.infer<typeof formSchema>;

export function FeatureForm({ onSubmit, isPending }: {
  onSubmit: (data: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Zapisywanie...' : 'Zapisz'}
        </Button>
      </form>
    </Form>
  );
}
```

### Obsluga bledow w komponencie

```tsx
const { data, isLoading, error } = useFeatures();

if (isLoading) {
  return <div className="text-center py-8 text-muted-foreground">Ladowanie...</div>;
}

if (error) {
  return (
    <div className="text-center py-8 text-red-500">
      Blad ladowania danych. Sprobuj ponownie.
    </div>
  );
}

if (!data?.length) {
  return <div className="text-center py-8 text-muted-foreground">Brak danych</div>;
}
```

---

## 5. Checklist nowego endpointu

### Backend

```
[ ] prisma/schema.prisma - model (jesli nowy)
[ ] pnpm db:migrate --name nazwa_migracji
[ ] pnpm db:generate
[ ] apps/api/src/validators/feature.ts - schematy Zod
[ ] apps/api/src/repositories/FeatureRepository.ts
[ ] apps/api/src/services/featureService.ts
[ ] apps/api/src/handlers/featureHandler.ts
[ ] apps/api/src/routes/feature.ts
[ ] apps/api/src/index.ts - rejestracja route
```

### Frontend

```
[ ] apps/web/src/features/feature/api/featureApi.ts
[ ] apps/web/src/features/feature/hooks/useFeature.ts
[ ] apps/web/src/features/feature/components/FeatureList.tsx
[ ] apps/web/src/features/feature/components/FeatureForm.tsx
[ ] apps/web/src/app/feature/page.tsx (jesli nowa strona)
```

### Weryfikacja

```
[ ] Endpoint dziala (Postman / curl)
[ ] Soft delete - nie hard delete
[ ] Kwoty w groszach (plnToGrosze / groszeToPln)
[ ] Walidacja Zod na wejsciu
[ ] Buttony disabled podczas isPending
[ ] Dialog potwierdzenia przy usuwaniu
[ ] Cache invalidation po mutacji
[ ] Toast sukcesu i bledu
```

---

## 6. Playbooki - krok po kroku

Praktyczne instrukcje dla typowych zadan deweloperskich w projekcie AKROBUD.
Kazdy playbook odnosi sie do konkretnych plikow i wzorcow z tego projektu.

---

### Playbook 1: Dodaj kolumne do istniejacej tabeli

**Przyklad:** Dodanie pola `priority` (priorytet) do tabeli `orders`.

#### Krok 1: Edytuj schema.prisma

Plik: `apps/api/prisma/schema.prisma`

Dodaj nowe pole do modelu. Zawsze uzywaj `@map("snake_case")` dla nazwy kolumny w bazie:

```prisma
model Order {
  // ... istniejace pola ...
  specialType    String?   @map("special_type")
  priority       String?   @map("priority")  // <-- NOWE POLE
  deletedAt      DateTime? @map("deleted_at")
  // ...
}
```

**Zasady:**
- `String?` = opcjonalne (nullable) - bezpieczne dla istniejacej bazy
- `String @default("normal")` = wymagane z domyslna wartoscia
- `Int` dla liczb, `DateTime?` dla dat, `Boolean @default(false)` dla flag
- Kwoty ZAWSZE jako `Int` (grosze), nigdy `Float`/`Decimal`
- Jesli pole wymaga indeksu, dodaj `@@index([priority])` w sekcji indeksow modelu

#### Krok 2: Wygeneruj migracje

```bash
pnpm db:migrate --name add_priority_to_orders
```

Powstanie plik: `apps/api/prisma/migrations/YYYYMMDDHHMMSS_add_priority_to_orders/migration.sql`

Sprawdz zawartosc migracji - powinna zawierac:
```sql
ALTER TABLE "orders" ADD COLUMN "priority" TEXT;
```

**NIGDY nie uzywaj `pnpm db:push`** - niszczy dane w produkcji!

#### Krok 3: Wygeneruj klienta Prisma

```bash
pnpm db:generate
```

Od teraz TypeScript "widzi" nowe pole w typach Prisma.

#### Krok 4: Zaktualizuj repository (jesli query uzywa nowego pola)

Plik: `apps/api/src/repositories/OrderRepository.ts`

Jesli pole ma byc zwracane w zapytaniach z `select`, dodaj je:

```typescript
// W metodzie findAll() lub innej z explicit select:
select: {
  id: true,
  orderNumber: true,
  // ... istniejace pola ...
  specialType: true,
  priority: true,  // <-- DODAJ
}
```

Jesli uzywasz filtrowania po nowym polu, dodaj do `where`:

```typescript
if (filters.priority) {
  where.priority = filters.priority;
}
```

#### Krok 5: Zaktualizuj service (jesli logika biznesowa sie zmienia)

Plik: `apps/api/src/services/orderService.ts`

Jesli pole wymaga specjalnej logiki (np. walidacja wartosci, domyslne przypisanie):

```typescript
async updatePriority(id: number, priority: string) {
  const order = await this.repository.findById(id);
  if (!order) throw new NotFoundError('Order');
  return this.repository.update(id, { priority });
}
```

#### Krok 6: Zaktualizuj handler (jesli API response sie zmienia)

Plik: `apps/api/src/handlers/orderHandler.ts`

Jesli dodajesz nowy endpoint:

```typescript
async updatePriority(
  request: FastifyRequest<{ Params: { id: string }; Body: { priority: string } }>,
  reply: FastifyReply
) {
  const id = parseIntParam(request.params.id, 'order');
  const { priority } = prioritySchema.parse(request.body);
  const result = await this.service.updatePriority(id, priority);
  return reply.send(result);
}
```

I zarejestruj route w `apps/api/src/routes/orders.ts`:

```typescript
fastify.patch<{ Params: { id: string }; Body: { priority: string } }>(
  '/:id/priority',
  { preHandler: verifyAuth },
  handler.updatePriority.bind(handler)
);
```

#### Krok 7: Zaktualizuj validator (jesli walidacja inputu potrzebna)

Plik: `apps/api/src/validators/order.ts`

```typescript
export const prioritySchema = z.object({
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
});
```

#### Krok 8: Zaktualizuj frontend

1. **Typy** - `apps/web/src/types/index.ts` lub `apps/web/src/features/orders/types/index.ts`:
   ```typescript
   export interface Order {
     // ...
     priority?: string; // <-- DODAJ
   }
   ```

2. **API** - `apps/web/src/features/orders/api/ordersApi.ts` (jesli nowy endpoint):
   ```typescript
   updatePriority: (id: number, priority: string) =>
     fetchApi<Order>(`/api/orders/${id}/priority`, {
       method: 'PATCH',
       body: JSON.stringify({ priority }),
     }),
   ```

3. **Hook** - `apps/web/src/features/orders/hooks/` (jesli nowa mutacja):
   ```typescript
   export function useUpdatePriority() {
     const qc = useQueryClient();
     return useMutation({
       mutationFn: ({ id, priority }: { id: number; priority: string }) =>
         ordersApi.updatePriority(id, priority),
       onSuccess: () => {
         qc.invalidateQueries({ queryKey: ['orders'] });
         showSuccessToast('Priorytet zaktualizowany');
       },
       onError: () => showErrorToast('Blad aktualizacji priorytetu'),
     });
   }
   ```

4. **Komponent** - wyswietl/edytuj nowe pole w tabeli/formularzu

#### Checklist koncowy

```
[ ] schema.prisma - pole dodane z @map
[ ] Migracja wygenerowana i sprawdzona
[ ] pnpm db:generate wykonane
[ ] Repository - pole w select (jesli explicit select)
[ ] Service - logika biznesowa (jesli potrzebna)
[ ] Handler + Route - nowy endpoint (jesli potrzebny)
[ ] Validator - schemat Zod (jesli nowy input)
[ ] Frontend - typy, API, hook, komponent
[ ] Kwoty w groszach (jesli pole finansowe)
```

---

### Playbook 2: Dodaj nowa strone (frontend)

**Przyklad:** Dodanie strony "Raporty" pod adresem `/raporty`.

#### Krok 1: Utworz katalog feature

Struktura katalogow (wzorzec z `apps/web/src/features/orders/`):

```
apps/web/src/features/raporty/
  api/
    raportyApi.ts       -- komunikacja z backendem
  hooks/
    index.ts            -- re-eksporty hookow
    useRaporty.ts       -- React Query hooks
  components/
    index.ts            -- re-eksporty komponentow
    RaportyList.tsx     -- glowny komponent listy
    RaportyFilters.tsx  -- filtry (jesli potrzebne)
  types/
    index.ts            -- typy specyficzne dla feature
  helpers/
    index.ts            -- funkcje pomocnicze
  index.ts              -- publiczne API feature
```

#### Krok 2: Utworz barrel export

Plik: `apps/web/src/features/raporty/index.ts`

```typescript
export * from './components';
export * from './hooks';
```

#### Krok 3: Utworz API client

Plik: `apps/web/src/features/raporty/api/raportyApi.ts`

```typescript
import { fetchApi } from '@/lib/api-client';
import type { Raport } from '../types';

export const raportyApi = {
  getAll: (params?: { status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi<Raport[]>(`/api/raporty${query ? `?${query}` : ''}`);
  },

  getById: (id: number) =>
    fetchApi<Raport>(`/api/raporty/${id}`),

  create: (data: CreateRaportData) =>
    fetchApi<Raport>('/api/raporty', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
```

#### Krok 4: Utworz hooks (React Query)

Plik: `apps/web/src/features/raporty/hooks/useRaporty.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';
import { raportyApi } from '../api/raportyApi';

const QUERY_KEY = ['raporty'];

export function useRaporty(params?: { status?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => raportyApi.getAll(params),
  });
}

export function useCreateRaport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: raportyApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast('Raport utworzony');
    },
    onError: () => showErrorToast('Blad tworzenia raportu'),
  });
}
```

#### Krok 5: Utworz strone Next.js

Plik: `apps/web/src/app/raporty/page.tsx`

```tsx
'use client';

import { RaportyList } from '@/features/raporty/components/RaportyList';

export default function RaportyPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Raporty</h1>
      </div>
      <RaportyList />
    </div>
  );
}
```

**Uwaga:** Strony w `app/` z interaktywnymi komponentami musza miec `'use client'` albo
delegowac do komponentow klienckich (wzorzec z `apps/web/src/app/zamowienia-szyb/page.tsx`).

#### Krok 6: Dodaj link w nawigacji (sidebar)

Plik: `apps/web/src/components/layout/sidebar.tsx`

Znajdz tablice `navigation` i dodaj nowy wpis:

```typescript
const navigation: NavigationItem[] = [
  // ... istniejace pozycje ...
  {
    name: 'Raporty',
    href: '/raporty',
    icon: BarChart3,  // z lucide-react
    requiredRoles: [UserRole.OWNER, UserRole.ADMIN, UserRole.KIEROWNIK],
  },
];
```

**Uwaga:** `requiredRoles` kontroluje kto widzi pozycje menu. Dostepne role:
`UserRole.OWNER`, `UserRole.ADMIN`, `UserRole.KIEROWNIK`, `UserRole.KSIEGOWA`, `UserRole.USER`

Jesli strona ma miec podmenu (jak Akrobud), uzyj `subItems`:

```typescript
{
  name: 'Raporty',
  href: '/raporty',
  icon: BarChart3,
  subItems: [
    { name: 'Lista raportow', href: '/raporty', icon: FileText },
    { name: 'Nowy raport', href: '/raporty/nowy', icon: ClipboardList },
  ]
},
```

#### Krok 7: Dodaj glowny komponent

Plik: `apps/web/src/features/raporty/components/RaportyList.tsx`

Wzorzec z `apps/web/src/features/orders/components/OrdersTable.tsx`:

```tsx
'use client';

import { useRaporty } from '../hooks/useRaporty';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export function RaportyList() {
  const { data: raporty, isLoading, error } = useRaporty();

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Ladowanie...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Blad ladowania danych.</div>;
  }

  if (!raporty?.length) {
    return <div className="text-center py-8 text-muted-foreground">Brak raportow</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Nazwa</TableHead>
          <TableHead>Data</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {raporty.map((raport) => (
          <TableRow key={raport.id}>
            <TableCell>{raport.id}</TableCell>
            <TableCell>{raport.name}</TableCell>
            <TableCell>{new Date(raport.createdAt).toLocaleDateString('pl-PL')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

#### Checklist koncowy

```
[ ] apps/web/src/features/raporty/ - katalog feature z api/hooks/components/types
[ ] apps/web/src/features/raporty/index.ts - barrel export
[ ] apps/web/src/features/raporty/api/raportyApi.ts - API client
[ ] apps/web/src/features/raporty/hooks/useRaporty.ts - React Query hooks
[ ] apps/web/src/features/raporty/components/RaportyList.tsx - komponent
[ ] apps/web/src/app/raporty/page.tsx - strona Next.js
[ ] apps/web/src/components/layout/sidebar.tsx - link w nawigacji
[ ] Backend (jesli nowy) - route/handler/service/repository (patrz Playbook 3)
```

---

### Playbook 3: Dodaj nowy model Prisma (cala sciezka)

**Przyklad:** Dodanie modelu `Equipment` (sprzet) z pelna sciezka backend + frontend.

#### Krok 1: Dodaj model do schema.prisma

Plik: `apps/api/prisma/schema.prisma`

```prisma
model Equipment {
  id          Int       @id @default(autoincrement())
  name        String
  serialNumber String?  @unique @map("serial_number")
  status      String    @default("active") // active | maintenance | retired
  categoryId  Int?      @map("category_id")
  notes       String?
  deletedAt   DateTime? @map("deleted_at")  // ZAWSZE dodaj soft delete
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@index([deletedAt])
  @@index([status])
  @@index([categoryId])
  @@map("equipment")  // nazwa tabeli w snake_case, l.mnoga
}
```

**Zasady modelu:**
- `id Int @id @default(autoincrement())` - zawsze autoincrement
- `deletedAt DateTime? @map("deleted_at")` - ZAWSZE soft delete
- `createdAt` + `updatedAt` - zawsze dodaj
- `@@map("nazwa_tabeli")` - snake_case nazwa tabeli
- `@map("snake_case")` - snake_case nazwa kolumny
- `@@index([deletedAt])` - zawsze indeks na deletedAt
- Kwoty jako `Int` (grosze), nigdy `Float`

#### Krok 2: Wygeneruj migracje i klienta

```bash
pnpm db:migrate --name add_equipment_table
pnpm db:generate
```

Sprawdz plik migracji w `apps/api/prisma/migrations/YYYYMMDDHHMMSS_add_equipment_table/migration.sql`.

#### Krok 3: Utworz validator

Plik: `apps/api/src/validators/equipment.ts`

```typescript
import { z } from 'zod';
import { idParamsSchema } from './common.js';

export const createEquipmentSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(255),
  serialNumber: z.string().max(100).optional(),
  status: z.enum(['active', 'maintenance', 'retired']).optional(),
  categoryId: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
});

export const updateEquipmentSchema = createEquipmentSchema.partial();

export const equipmentParamsSchema = idParamsSchema('equipment');

export const equipmentQuerySchema = z.object({
  status: z.string().optional(),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
```

#### Krok 4: Utworz repository

Plik: `apps/api/src/repositories/EquipmentRepository.ts`

```typescript
import { PrismaClient } from '@prisma/client';

export class EquipmentRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filters: { status?: string } = {}) {
    const where: any = { deletedAt: null }; // ZAWSZE filtruj soft-deleted
    if (filters.status) where.status = filters.status;

    return this.prisma.equipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.equipment.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async create(data: { name: string; serialNumber?: string; status?: string; categoryId?: number; notes?: string }) {
    return this.prisma.equipment.create({ data });
  }

  async update(id: number, data: Partial<{ name: string; serialNumber: string; status: string; notes: string }>) {
    return this.prisma.equipment.update({ where: { id }, data });
  }

  async softDelete(id: number) {
    return this.prisma.equipment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
```

#### Krok 5: Utworz service

Plik: `apps/api/src/services/equipmentService.ts`

```typescript
import { EquipmentRepository } from '../repositories/EquipmentRepository.js';
import { NotFoundError } from '../utils/errors.js';
import { cacheService } from './cache.js';
import type { CreateEquipmentInput, UpdateEquipmentInput } from '../validators/equipment.js';

export class EquipmentService {
  constructor(private repository: EquipmentRepository) {}

  async getAll(filters?: { status?: string }) {
    return this.repository.findAll(filters);
  }

  async getById(id: number) {
    const item = await this.repository.findById(id);
    if (!item) throw new NotFoundError('Equipment');
    return item;
  }

  async create(data: CreateEquipmentInput) {
    const item = await this.repository.create(data);
    cacheService.invalidate('equipment:*');
    return item;
  }

  async update(id: number, data: UpdateEquipmentInput) {
    await this.getById(id); // weryfikacja czy istnieje
    const item = await this.repository.update(id, data);
    cacheService.invalidate('equipment:*');
    return item;
  }

  async delete(id: number) {
    await this.getById(id);
    await this.repository.softDelete(id); // SOFT DELETE - nigdy hard delete!
    cacheService.invalidate('equipment:*');
  }
}
```

#### Krok 6: Utworz handler

Plik: `apps/api/src/handlers/equipmentHandler.ts`

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { EquipmentService } from '../services/equipmentService.js';
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  equipmentParamsSchema,
  equipmentQuerySchema,
} from '../validators/equipment.js';
import { parseIntParam } from '../utils/errors.js';

export class EquipmentHandler {
  constructor(private service: EquipmentService) {}

  async getAll(request: FastifyRequest<{ Querystring: { status?: string } }>, reply: FastifyReply) {
    const validated = equipmentQuerySchema.parse(request.query);
    const items = await this.service.getAll(validated);
    return reply.send(items);
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseIntParam(request.params.id, 'equipment');
    const item = await this.service.getById(id);
    return reply.send(item);
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createEquipmentSchema.parse(request.body);
    const item = await this.service.create(data);
    return reply.status(201).send(item);
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseIntParam(request.params.id, 'equipment');
    const data = updateEquipmentSchema.parse(request.body);
    const item = await this.service.update(id, data);
    return reply.send(item);
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseIntParam(request.params.id, 'equipment');
    await this.service.delete(id);
    return reply.status(204).send();
  }
}
```

#### Krok 7: Utworz route

Plik: `apps/api/src/routes/equipment.ts`

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { EquipmentRepository } from '../repositories/EquipmentRepository.js';
import { EquipmentService } from '../services/equipmentService.js';
import { EquipmentHandler } from '../handlers/equipmentHandler.js';
import { verifyAuth } from '../middleware/auth.js';

export const equipmentRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new EquipmentRepository(prisma);
  const service = new EquipmentService(repository);
  const handler = new EquipmentHandler(service);

  fastify.get('/', { preHandler: verifyAuth }, handler.getAll.bind(handler));
  fastify.get('/:id', { preHandler: verifyAuth }, handler.getById.bind(handler));
  fastify.post('/', { preHandler: verifyAuth }, handler.create.bind(handler));
  fastify.put('/:id', { preHandler: verifyAuth }, handler.update.bind(handler));
  fastify.delete('/:id', { preHandler: verifyAuth }, handler.delete.bind(handler));
};
```

#### Krok 8: Zarejestruj route w index.ts

Plik: `apps/api/src/index.ts`

Dodaj import i rejestracje:

```typescript
// Na gorze pliku - importy:
import { equipmentRoutes } from './routes/equipment.js';

// W sekcji "Rejestracja routow" (okolo linii 168+):
await fastify.register(equipmentRoutes, { prefix: '/api/equipment' });
```

#### Krok 9: Dodaj frontend (pelna sciezka)

Zastosuj kroki z **Playbook 2** tworzac:

```
apps/web/src/features/equipment/
  api/equipmentApi.ts
  hooks/useEquipment.ts
  hooks/index.ts
  components/EquipmentList.tsx
  components/EquipmentForm.tsx
  components/index.ts
  types/index.ts
  index.ts
apps/web/src/app/equipment/page.tsx
```

Dodaj link w sidebar (`apps/web/src/components/layout/sidebar.tsx`).

#### Checklist koncowy

```
Backend:
[ ] apps/api/prisma/schema.prisma - model z soft delete
[ ] pnpm db:migrate --name add_equipment_table
[ ] pnpm db:generate
[ ] apps/api/src/validators/equipment.ts
[ ] apps/api/src/repositories/EquipmentRepository.ts
[ ] apps/api/src/services/equipmentService.ts
[ ] apps/api/src/handlers/equipmentHandler.ts
[ ] apps/api/src/routes/equipment.ts
[ ] apps/api/src/index.ts - rejestracja route

Frontend:
[ ] apps/web/src/features/equipment/ - caly katalog feature
[ ] apps/web/src/app/equipment/page.tsx
[ ] apps/web/src/components/layout/sidebar.tsx - nawigacja

Weryfikacja:
[ ] GET /api/equipment - lista (filtruje soft-deleted)
[ ] GET /api/equipment/:id - szczegoly
[ ] POST /api/equipment - tworzenie (walidacja Zod)
[ ] PUT /api/equipment/:id - aktualizacja
[ ] DELETE /api/equipment/:id - soft delete (nie hard!)
[ ] Frontend wyswietla dane poprawnie
[ ] Toast sukcesu/bledu dziala
```

---

### Playbook 4: Dodaj filtrowanie/sortowanie do listy

**Przyklad:** Dodanie filtrowania po statusie i sortowania po dacie do listy zlecen.

#### Krok 1: Dodaj query params do handlera

Plik: `apps/api/src/handlers/orderHandler.ts`

Wzorzec - handler przyjmuje query params i przekazuje do service:

```typescript
async getAll(
  request: FastifyRequest<{
    Querystring: { status?: string; archived?: string; sortBy?: string; sortDir?: string }
  }>,
  reply: FastifyReply
) {
  const validated = orderQuerySchema.parse(request.query);
  const orders = await this.service.getAllOrders(validated);
  return reply.send(orders);
}
```

#### Krok 2: Rozszerz validator o nowe query params

Plik: `apps/api/src/validators/order.ts` (lub odpowiedni validator)

```typescript
export const orderQuerySchema = z.object({
  status: z.string().optional(),
  archived: z.string().optional(),
  // Nowe filtry:
  sortBy: z.enum(['createdAt', 'deadline', 'orderNumber', 'status']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});
```

#### Krok 3: Zastosuj filtry w repository

Plik: `apps/api/src/repositories/OrderRepository.ts`

Wzorzec - budowanie dynamicznego `where` i `orderBy`:

```typescript
async findAll(filters: OrderFilters = {}) {
  const where: Prisma.OrderWhereInput = {
    deletedAt: null,  // ZAWSZE filtruj soft-deleted
  };

  // Filtr statusu
  if (filters.status) {
    where.status = filters.status;
  }

  // Filtr daty
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }

  // Wyszukiwanie tekstowe
  if (filters.search) {
    where.OR = [
      { orderNumber: { contains: filters.search } },
      { client: { contains: filters.search } },
      { project: { contains: filters.search } },
    ];
  }

  // Dynamiczne sortowanie
  const orderBy: Prisma.OrderOrderByWithRelationInput = {};
  const sortField = filters.sortBy || 'createdAt';
  const sortDir = filters.sortDir || 'desc';
  orderBy[sortField] = sortDir;

  return this.prisma.order.findMany({
    where,
    orderBy,
  });
}
```

**Uwaga SQLite:** W projekcie AKROBUD uzywamy SQLite, wiec zamiast `mode: 'insensitive'`
na `contains` - filtrowanie case-insensitive realizuj w JS lub uzywaj `LOWER()` w raw query.

#### Krok 4: Dodaj UI filtrowania na froncie

Wzorzec z `apps/web/src/features/orders/components/OrderTableFilters.tsx` - filtry kolumnowe
oraz `apps/web/src/features/orders/hooks/useOrderFilters.ts` - stan filtrow.

**4a. Hook do zarzadzania filtrami z persystencja w localStorage:**

Plik: `apps/web/src/features/raporty/hooks/useRaportyFilters.ts`

```typescript
import { useState, useCallback, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface FilterState {
  status: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

const STORAGE_KEY = 'raporty_filters';

const DEFAULT_FILTERS: FilterState = {
  status: 'all',
  search: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'createdAt',
  sortDir: 'desc',
};

export function useRaportyFilters() {
  const [filters, setFilters] = useState<FilterState>(() => {
    if (typeof window === 'undefined') return DEFAULT_FILTERS;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_FILTERS, ...JSON.parse(saved) } : DEFAULT_FILTERS;
  });

  const debouncedSearch = useDebounce(filters.search, 300);

  const updateFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Parametry do przekazania do API
  const queryParams = useMemo(() => ({
    ...(filters.status !== 'all' && { status: filters.status }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
    ...(filters.dateTo && { dateTo: filters.dateTo }),
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  }), [filters, debouncedSearch]);

  return { filters, updateFilter, resetFilters, queryParams };
}
```

**4b. Komponent filtrowania:**

```tsx
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface FiltersBarProps {
  filters: FilterState;
  onFilterChange: (key: string, value: string) => void;
  onReset: () => void;
}

export function FiltersBar({ filters, onFilterChange, onReset }: FiltersBarProps) {
  return (
    <div className="flex gap-4 items-center flex-wrap">
      <Input
        placeholder="Szukaj..."
        value={filters.search}
        onChange={(e) => onFilterChange('search', e.target.value)}
        className="w-64"
      />
      <Select value={filters.status} onValueChange={(v) => onFilterChange('status', v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszystkie</SelectItem>
          <SelectItem value="active">Aktywne</SelectItem>
          <SelectItem value="completed">Zakonczone</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={onReset}>Resetuj filtry</Button>
    </div>
  );
}
```

**4c. Sortowanie po kliknieciu naglowka kolumny:**

```tsx
function SortableHeader({ label, field, currentSort, currentDir, onSort }) {
  const isActive = currentSort === field;
  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-slate-100"
      onClick={() => onSort(field, isActive && currentDir === 'asc' ? 'desc' : 'asc')}
    >
      {label} {isActive && (currentDir === 'asc' ? ' ^' : ' v')}
    </TableHead>
  );
}
```

#### Krok 5: Przekaz filtry do React Query

```typescript
export function useRaporty(params: Record<string, string>) {
  return useQuery({
    queryKey: ['raporty', params],  // params w queryKey = auto-refetch przy zmianie filtrow
    queryFn: () => raportyApi.getAll(params),
  });
}
```

#### Checklist koncowy

```
Backend:
[ ] Validator - dodane nowe query params z walidacja
[ ] Repository - dynamiczne where/orderBy z filtrami
[ ] Handler - parsowanie i przekazywanie query params
[ ] Indeksy w schema.prisma na polach filtrowanych (@@index)

Frontend:
[ ] Hook useXxxFilters - stan filtrow z localStorage persistence
[ ] useDebounce na polu search (300ms)
[ ] Komponent FiltersBar z Select/Input
[ ] queryKey zawiera filtry (auto-refetch)
[ ] Sortowanie po kliknieciu naglowka
[ ] Przycisk "Resetuj filtry"
```

---

### Playbook 5: Dodaj import z pliku (Excel/CSV)

**Przyklad:** Import danych z pliku CSV/Excel.
Wzorzec z `apps/api/src/services/import/` i `apps/web/src/features/imports/`.

#### Krok 1: Backend - route do uploadu

Plik: `apps/api/src/routes/feature-import.ts`

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index.js';
import { FeatureImportHandler } from '../handlers/featureImportHandler.js';
import { verifyAuth } from '../middleware/auth.js';

export const featureImportRoutes: FastifyPluginAsync = async (fastify) => {
  const handler = new FeatureImportHandler(prisma);

  // Upload pliku - multipart/form-data
  fastify.post('/upload', { preHandler: verifyAuth }, handler.upload.bind(handler));

  // Podglad przed zatwierdzeniem
  fastify.get('/:id/preview', { preHandler: verifyAuth }, handler.preview.bind(handler));

  // Zatwierdzenie importu
  fastify.post('/:id/approve', { preHandler: verifyAuth }, handler.approve.bind(handler));
};
```

Zarejestruj w `apps/api/src/index.ts`:
```typescript
import { featureImportRoutes } from './routes/feature-import.js';
await fastify.register(featureImportRoutes, { prefix: '/api/feature-import' });
```

#### Krok 2: Backend - handler uploadu (multipart)

Plik: `apps/api/src/handlers/featureImportHandler.ts`

Wzorzec z `apps/api/src/handlers/importHandler.ts`:

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { ValidationError } from '../utils/errors.js';

export class FeatureImportHandler {
  constructor(private prisma: PrismaClient) {}

  async upload(request: FastifyRequest, reply: FastifyReply) {
    // 1. Odczytaj plik z multipart
    const data = await request.file();
    if (!data) throw new ValidationError('Brak pliku');

    const filename = data.filename;
    const buffer = await data.toBuffer();

    // 2. Sprawdz rozszerzenie
    const ext = filename.toLowerCase().split('.').pop();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      throw new ValidationError('Nieobslugiwany format pliku. Dozwolone: CSV, XLSX, XLS');
    }

    // 3. Parsuj plik
    let rows: any[];
    if (ext === 'csv') {
      rows = this.parseCsv(buffer);
    } else {
      rows = this.parseExcel(buffer);
    }

    // 4. Waliduj dane
    const { valid, errors } = this.validateRows(rows);
    if (errors.length > 0) {
      return reply.status(400).send({
        error: 'Bledy walidacji',
        errors,
        validCount: valid.length,
        totalCount: rows.length,
      });
    }

    // 5. Zapisz do bazy (w transakcji)
    const result = await this.prisma.$transaction(async (tx) => {
      const created = [];
      for (const row of valid) {
        const item = await tx.equipment.create({ data: row });
        created.push(item);
      }
      return created;
    });

    return reply.status(201).send({
      imported: result.length,
      items: result,
    });
  }

  private parseCsv(buffer: Buffer): any[] {
    const content = buffer.toString('utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0].split(';').map(h => h.trim());

    return lines.slice(1).map(line => {
      const values = line.split(';').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return row;
    });
  }

  private parseExcel(buffer: Buffer): any[] {
    // Uzyj biblioteki xlsx (juz zainstalowana w projekcie)
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet);
  }

  private validateRows(rows: any[]): { valid: any[]; errors: { row: number; message: string }[] } {
    const valid: any[] = [];
    const errors: { row: number; message: string }[] = [];

    rows.forEach((row, index) => {
      if (!row.name || !row.name.trim()) {
        errors.push({ row: index + 2, message: 'Brak nazwy' }); // +2 bo header + 0-indexed
        return;
      }
      valid.push({
        name: row.name.trim(),
        serialNumber: row.serialNumber?.trim() || null,
        status: row.status?.trim() || 'active',
      });
    });

    return { valid, errors };
  }
}
```

#### Krok 3: Frontend - komponent uploadu pliku

Plik: `apps/web/src/features/equipment/components/EquipmentImport.tsx`

```tsx
'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { uploadFile } from '@/lib/api-client';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';

export function EquipmentImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const qc = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadFile<{ imported: number }>('/api/feature-import/upload', file),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['equipment'] });
      showSuccessToast(`Zaimportowano ${data.imported} rekordow`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error: any) => {
      const message = error?.data?.errors
        ? `Bledy walidacji: ${error.data.errors.map((e: any) => `Wiersz ${e.row}: ${e.message}`).join(', ')}`
        : 'Blad importu pliku';
      showErrorToast(message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
        className="text-sm"
      />
      <Button
        onClick={handleUpload}
        disabled={!selectedFile || uploadMutation.isPending}
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploadMutation.isPending ? 'Importowanie...' : 'Importuj'}
      </Button>
    </div>
  );
}
```

**Uwaga:** Funkcja `uploadFile` z `apps/web/src/lib/api-client.ts` automatycznie:
- Tworzy `FormData` z plikiem
- Dodaje token autoryzacji
- Sprawdza limit rozmiaru (10MB)
- NIE ustawia `Content-Type` (browser robi to automatycznie dla multipart)

#### Krok 4: Walidacja i podglad przed importem (opcjonalne)

Jesli import wymaga zatwierdzenia (wzorzec z `apps/web/src/features/imports/`):

1. Upload zwraca `importId` zamiast od razu importowac
2. GET `/api/feature-import/:id/preview` - podglad danych
3. POST `/api/feature-import/:id/approve` - zatwierdzenie

#### Checklist koncowy

```
Backend:
[ ] Route z POST /upload (multipart)
[ ] Handler z parsowaniem CSV/Excel (xlsx)
[ ] Walidacja wierszy z komunikatami bledow (nr wiersza)
[ ] Zapis w transakcji Prisma ($transaction)
[ ] Rejestracja route w index.ts

Frontend:
[ ] Komponent z <input type="file" accept=".csv,.xlsx,.xls">
[ ] uploadFile() z api-client (nie fetchApi!)
[ ] Button disabled podczas isPending
[ ] Toast z liczba zaimportowanych rekordow
[ ] Invalidation queryKey po sukcesie
[ ] Obsluga bledow walidacji (wyswietl numery wierszy)
```

---

### Playbook 6: Dodaj soft delete do istniejacego modelu

**Przyklad:** Dodanie soft delete do modelu ktory jeszcze go nie ma.
Wzorzec z migracji `20260203100000_add_order_soft_delete`.

#### Krok 1: Dodaj pola do schema.prisma

Plik: `apps/api/prisma/schema.prisma`

```prisma
model Feature {
  // ... istniejace pola ...

  deletedAt  DateTime?  @map("deleted_at")   // <-- DODAJ
  // Opcjonalnie: kto usunol
  // deletedByUserId  Int?  @map("deleted_by_user_id")
  // deletedByUser    User? @relation("FeatureDeletedBy", fields: [deletedByUserId], references: [id], onDelete: SetNull)

  @@index([deletedAt])  // <-- DODAJ indeks
}
```

Jesli dodajesz relacje `deletedByUser`, pamietaj o dodaniu odpowiedniego pola relacji w modelu `User`:
```prisma
model User {
  // ...
  deletedFeatures  Feature[]  @relation("FeatureDeletedBy")
}
```

#### Krok 2: Wygeneruj migracje

```bash
pnpm db:migrate --name add_soft_delete_to_features
```

Sprawdz SQL migracji - powinien zawierac:
```sql
ALTER TABLE "features" ADD COLUMN "deleted_at" DATETIME;
CREATE INDEX "features_deleted_at_idx" ON "features"("deleted_at");
```

```bash
pnpm db:generate
```

#### Krok 3: Zaktualizuj KAZDE zapytanie w repository

Plik: `apps/api/src/repositories/FeatureRepository.ts`

**KRYTYCZNE:** Kazde zapytanie `findMany` i `findUnique` MUSI filtrowac `deletedAt: null`.
Jesli tego nie zrobisz, uzytkownik zobaczy "usuniete" rekordy.

```typescript
// PRZED (bez soft delete):
async findAll() {
  return this.prisma.feature.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

async findById(id: number) {
  return this.prisma.feature.findUnique({
    where: { id },
  });
}

// PO (z soft delete):
async findAll() {
  return this.prisma.feature.findMany({
    where: { deletedAt: null },  // <-- DODAJ
    orderBy: { createdAt: 'desc' },
  });
}

async findById(id: number) {
  return this.prisma.feature.findUnique({
    where: { id, deletedAt: null },  // <-- DODAJ
  });
}

// DODAJ metode softDelete:
async softDelete(id: number) {
  return this.prisma.feature.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// Opcjonalnie: przywracanie (undo delete)
async restore(id: number) {
  return this.prisma.feature.update({
    where: { id },
    data: { deletedAt: null },
  });
}
```

#### Krok 4: Zaktualizuj service - zamien hard delete na soft delete

Plik: `apps/api/src/services/featureService.ts`

```typescript
// PRZED:
async delete(id: number) {
  await this.getById(id);
  await this.repository.delete(id);  // HARD DELETE - ZLE!
}

// PO:
async delete(id: number) {
  await this.getById(id);
  await this.repository.softDelete(id);  // SOFT DELETE - DOBRZE
  cacheService.invalidate('feature:*');
}
```

#### Krok 5: Zaktualizuj handler (jesli trzeba)

Plik: `apps/api/src/handlers/featureHandler.ts`

Handler zwykle nie wymaga zmian - metoda `delete` juz istnieje.
Jesli chcesz dodac info kto usunol:

```typescript
async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const id = parseIntParam(request.params.id, 'feature');
  const userId = (request as any).user?.id; // z middleware auth
  await this.service.delete(id, userId);
  return reply.status(204).send();
}
```

#### Krok 6: Dodaj do SoftDeleteCleanupService (opcjonalne)

Plik: `apps/api/src/services/softDeleteCleanupService.ts`

Jesli chcesz aby trwale usuwac rekordy po 2 latach, dodaj model do listy:

```typescript
const models = [
  { name: 'User', model: this.prisma.user },
  { name: 'Feature', model: this.prisma.feature },  // <-- DODAJ
  // ...
];
```

#### Krok 7: Zaktualizuj UI

Na froncie zazwyczaj nic sie nie zmienia - przycisk "Usun" juz wywoluje
`DELETE /api/features/:id`, a backend zamienia to na soft delete.

Opcjonalnie dodaj mozliwosc przywracania:
```tsx
// Przycisk "Cofnij usuniecie" z showUndoToast
import { showUndoToast } from '@/lib/toast-helpers';

const handleDelete = () => {
  deleteMutation.mutate(item.id, {
    onSuccess: () => {
      showUndoToast({
        title: 'Usunieto',
        onUndo: () => restoreMutation.mutate(item.id),
      });
    },
  });
};
```

#### Krok 8: Sprawdz WSZYSTKIE miejsca ktore odpytuja ten model

**KRYTYCZNE:** Przeszukaj caly kod w poszukiwaniu zapytan do tego modelu
ktore NIE filtruja `deletedAt`:

Szukaj w repository i service:
- `this.prisma.feature.findMany` - czy ma `where: { deletedAt: null }`?
- `this.prisma.feature.findUnique` - czy ma `deletedAt: null` w where?
- `this.prisma.feature.count` - czy filtruje soft-deleted?
- Zapytania w innych serwisach ktore robia `include: { features: true }` - dodaj `where`

#### Checklist koncowy

```
[ ] schema.prisma - deletedAt DateTime? @map("deleted_at") + @@index
[ ] Migracja wygenerowana (ALTER TABLE ADD COLUMN)
[ ] pnpm db:generate
[ ] Repository - KAZDE findMany/findUnique ma deletedAt: null
[ ] Repository - metoda softDelete() dodana
[ ] Repository - stary delete() usuniety lub zamieniony
[ ] Service - uzywa softDelete() zamiast delete()
[ ] Inne repository/service ktore odpytuja ten model - zaktualizowane
[ ] SoftDeleteCleanupService - model dodany (opcjonalnie)
[ ] Frontend - dialog potwierdzenia przy usuwaniu (jesli brakuje)
```

---

### Playbook 7: Debugowanie - typowe problemy

Przewodnik po najczestszych problemach i gdzie szukac przyczyn.

#### Problem 1: "Dane nie wyswietlaja sie na froncie"

**Sciezka debugowania (od frontu do bazy):**

```
1. Konsola przegladarki (F12 > Console)
   -> Czy jest blad JavaScript?
   -> Czy jest blad HTTP (czerwony request w Network)?

2. Network tab (F12 > Network)
   -> Czy request do API poszedl? (szukaj /api/...)
   -> Jaki status? (200, 401, 404, 500?)
   -> Jaka odpowiedz? (kliknij request > Response)

3. Komponent React
   -> Plik: apps/web/src/features/FEATURE/components/COMPONENT.tsx
   -> Czy useQuery zwraca dane? Dodaj: console.log('data:', data, 'isLoading:', isLoading, 'error:', error)
   -> Czy queryKey sie zgadza?
   -> Czy komponent renderuje dane (sprawdz warunkowy rendering - isLoading/error/empty)

4. Hook
   -> Plik: apps/web/src/features/FEATURE/hooks/useXxx.ts
   -> Czy queryFn wywoluje poprawny endpoint?
   -> Czy queryKey zawiera parametry (np. filtry)?
   -> Czy enabled nie blokuje query?

5. API client
   -> Plik: apps/web/src/features/FEATURE/api/xxxApi.ts
   -> Czy URL endpointu jest poprawny?
   -> Czy fetchApi<TYP> ma poprawny typ generyczny?

6. Handler (backend)
   -> Plik: apps/api/src/handlers/xxxHandler.ts
   -> Dodaj: console.log('[Handler] request.query:', request.query)
   -> Czy walidacja Zod nie odrzuca query params?

7. Service (backend)
   -> Plik: apps/api/src/services/xxxService.ts
   -> Czy service wywoluje poprawna metode repository?

8. Repository (backend)
   -> Plik: apps/api/src/repositories/XxxRepository.ts
   -> Czy zapytanie Prisma ma poprawne where/select/include?
   -> Czy nie filtruje zbyt agresywnie (np. deletedAt: null gdy rekordy nie maja tego pola)?
   -> Dodaj: console.log('[Repo] where:', JSON.stringify(where))

9. Baza danych
   -> Sprawdz dane bezposrednio: npx prisma studio
   -> Czy tabela ma rekordy?
   -> Czy deletedAt jest null (soft delete)?
```

**Najczestsze przyczyny:**
- `deletedAt: null` filtruje rekordy ktore maja `deletedAt` ustawiony
- Zly `select` w repository - brakuje nowo dodanego pola
- `enabled: false` w useQuery (np. `enabled: !!id` gdy id = 0)
- Brak `'use client'` w komponencie Next.js ktory uzywa hookow React
- Filtry w query params ktore zawezaja wyniki (np. `archived=false`)

---

#### Problem 2: "API zwraca 500"

**Sciezka debugowania:**

```
1. Logi serwera (terminal gdzie dziala API)
   -> Szukaj: "[ErrorHandler] Error caught:"
   -> Komunikat bledu i stack trace

2. Czy to blad walidacji Zod?
   -> Sprawdz: apps/api/src/validators/xxx.ts
   -> Czy body/params/query pasuja do schematu?
   -> Dodaj: console.log('[Handler] body:', request.body)

3. Czy to blad Prisma?
   -> "Record not found" = zly ID lub deletedAt filtruje
   -> "Unique constraint" = duplikat unikalnego pola
   -> "Foreign key constraint" = powiazany rekord nie istnieje
   -> "Unknown arg" = pole w zapytaniu nie istnieje w schemacie
   -> Rozwiazanie: pnpm db:generate (jesli schemat sie zmienil)

4. Czy to blad biznesowy (AppError)?
   -> Pliki: apps/api/src/utils/errors.ts
   -> NotFoundError (404), ValidationError (400), ConflictError (409), ForbiddenError (403)
   -> Szukaj w service: throw new NotFoundError(...)

5. Czy to blad middleware?
   -> Plik: apps/api/src/middleware/auth.ts
   -> 401 = brak tokenu lub token wygasl
   -> 403 = brak uprawnien (rola)

6. Czy to blad timeout?
   -> Domyslny timeout: 240 sekund (apps/api/src/index.ts)
   -> Jesli import/przetwarzanie duzego pliku - moze byc za krotki
```

**Najczestsze przyczyny 500:**
- `pnpm db:generate` nie zostal uruchomiony po zmianie schema.prisma
- Nowe pole w Prisma query ktore nie istnieje w bazie (brak migracji)
- Typ danych nie pasuje (np. string zamiast number w Zod)
- Brak `await` na operacji asynchronicznej
- Zly import (`.js` extension wymagany w importach backendu)

**Szybki test endpointu:**
```bash
# GET
curl -H "Authorization: Bearer TOKEN" http://localhost:3001/api/endpoint

# POST
curl -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"test"}' http://localhost:3001/api/endpoint
```

---

#### Problem 3: "Formularz nie zapisuje"

**Sciezka debugowania:**

```
1. Konsola przegladarki
   -> Czy jest blad walidacji formularza? (Zod / react-hook-form)
   -> Czy mutacja zostala wywolana? Dodaj: console.log('mutate called:', data)

2. Komponent formularza
   -> Plik: apps/web/src/features/FEATURE/components/XxxForm.tsx
   -> Czy form.handleSubmit(onSubmit) jest podpiete do <form>?
   -> Czy onSubmit wywoluje mutate()?
   -> Dodaj: console.log('form errors:', form.formState.errors)

3. Walidacja front-end (Zod + react-hook-form)
   -> Czy formSchema jest zgodny z tym co formularz zbiera?
   -> Czy pola wymagane maja wartosc?
   -> Czy zodResolver jest podpiete do useForm?

4. Hook mutacji
   -> Plik: apps/web/src/features/FEATURE/hooks/useXxx.ts
   -> Czy mutationFn wywoluje poprawny endpoint z poprawna metoda (POST/PUT/PATCH)?
   -> Czy body jest serializowane (JSON.stringify)?

5. Network tab (F12 > Network)
   -> Czy request POST/PUT poszedl do API?
   -> Jaki status odpowiedzi?
   -> Jaki body zostal wyslany? (kliknij request > Payload)
   -> Jaka odpowiedz? (kliknij request > Response)

6. Backend - handler
   -> Czy walidacja Zod na backendzie akceptuje dane?
   -> Czy to ten sam schemat co na froncie?

7. Backend - service/repository
   -> Czy Prisma create/update dziala?
   -> Czy wymagane pola bazy sa wypelnione?
```

**Najczestsze przyczyny:**
- Brak `form.handleSubmit(onSubmit)` w `<form onSubmit=...>`
- Blad walidacji Zod na backendzie (inny schemat niz na froncie)
- Brak `JSON.stringify(data)` w `body` requestu (fetchApi robi to automatycznie)
- Pole w bazie NOT NULL a formularz nie przesyla wartosci
- Button type="button" zamiast type="submit"
- Formularz renderowany bez `'use client'` (Next.js Server Component nie obsluguje hookow)
- `isPending` nie resetuje sie - sprawdz czy `onError` nie brakuje w mutacji
- Kwoty: formularz wysyla PLN a backend oczekuje groszy (uzyj `plnToGrosze()`)

---

#### Problem 4: "Zmiany w schema.prisma nie dzialaja"

```
1. Czy uruchomiles migracje?
   pnpm db:migrate --name opis_zmian

2. Czy wygenerowales klienta?
   pnpm db:generate

3. Czy restartowales serwer API?
   -> Po db:generate trzeba zrestartowac serwer (Ctrl+C i ponownie pnpm dev)

4. Czy migracja sie powiodla?
   -> Sprawdz: apps/api/prisma/migrations/ - czy nowy folder istnieje
   -> Sprawdz SQL w migration.sql - czy jest poprawny

5. Czy nie uzyles db:push?
   -> NIGDY nie uzywaj db:push - niszczy dane!
   -> Jesli uzyles, przywroc baze z backup i uzyj db:migrate
```

---

#### Problem 5: "Import pliku nie dziala"

```
1. Czy plik jest odpowiedniego formatu?
   -> CSV z separatorem ; (srednik, nie przecinek)
   -> Excel (.xlsx) nie starszy .xls

2. Czy plik nie jest za duzy?
   -> Limit: 10MB (apps/api/src/index.ts - multipart config)

3. Czy kodowanie pliku jest poprawne?
   -> CSV powinien byc UTF-8
   -> Polskie znaki moga byc bledne przy zlym kodowaniu

4. Backend - sprawdz logi
   -> Szukaj: "[Import]" lub "[ErrorHandler]"
   -> Czy parser poprawnie rozpoznaje plik?

5. Frontend - sprawdz Network tab
   -> Czy Content-Type to multipart/form-data (nie application/json)?
   -> Uzywaj uploadFile() z api-client, nie fetchApi()!
```

---

#### Szybka sciagawka - gdzie szukac problemu

| Objaw | Pierwszy plik do sprawdzenia |
|-------|------------------------------|
| Pusta strona | `apps/web/src/app/SCIEZKA/page.tsx` - czy eksportuje default? |
| 401 Unauthorized | `apps/api/src/middleware/auth.ts` - czy token jest poprawny? |
| 404 Not Found | `apps/api/src/index.ts` - czy route jest zarejestrowany? |
| 500 Internal Error | Terminal serwera - szukaj stack trace |
| Formularz nie dziala | Komponent - czy ma `'use client'` i `form.handleSubmit`? |
| Dane nie laduja | Hook - czy `useQuery` ma poprawny `queryKey` i `queryFn`? |
| Stale dane po edycji | Hook - czy `invalidateQueries` uzywa poprawnego `queryKey`? |
| Blad TypeScript | `pnpm db:generate` - czy Prisma typy sa aktualne? |
| Kwoty sie nie zgadzaja | Czy uzywasz `plnToGrosze()` / `groszeToPln()`? |
| Soft-deleted widoczne | Repository - czy `where` ma `deletedAt: null`? |
