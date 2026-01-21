# First Task Tutorial

Zrobmy prosta zmiane zeby nauczyc sie workflow.

## Zadanie: Dodaj pole "notes" do Order

### 1. Update Database Schema

**apps/api/prisma/schema.prisma:**
```prisma
model Order {
  id          String   @id @default(uuid())
  orderNumber String   @unique
  // ... inne pola ...
  notes       String?  // <- DODAJ TO POLE
}
```

### 2. Create Migration

```bash
pnpm db:migrate
# Wpisz nazwe: "add_notes_to_order"
```

### 3. Update TypeScript Types

Backend Prisma Client auto-update sie po `db:generate`, ale frontend needs update:

**apps/web/src/types/order.ts:**
```typescript
export interface Order {
  id: string;
  orderNumber: string;
  // ... inne pola ...
  notes?: string; // <- DODAJ TO POLE
}
```

### 4. Update Backend Validator

**apps/api/src/validators/order.ts:**
```typescript
export const createOrderSchema = z.object({
  orderNumber: z.string(),
  // ... inne pola ...
  notes: z.string().optional(), // <- DODAJ TO POLE
});
```

### 5. Update Frontend Form

**apps/web/src/features/orders/components/OrderForm.tsx:**
```tsx
<FormField
  control={form.control}
  name="notes"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Notatki</FormLabel>
      <FormControl>
        <Textarea {...field} />
      </FormControl>
    </FormItem>
  )}
/>
```

### 6. Test

```bash
# Sprawdz TypeScript
pnpm type-check

# Test w aplikacji
pnpm dev
# Przejdz do http://localhost:3000/zlecenia/nowe
# Sprawdz czy pole "Notatki" sie pojawia
```

### 7. Commit

```bash
git add .
git commit -m "feat(orders): dodaj pole notes do zlecen"
git push
```

**Gratulacje!** Zrobiles swoja pierwsza zmiane.

## Podsumowanie kroków

1. **Schema** - Dodaj pole w Prisma schema
2. **Migration** - Utworz migracje bazy danych
3. **Types** - Zaktualizuj TypeScript typy (frontend)
4. **Validator** - Dodaj walidacje (backend)
5. **UI** - Dodaj pole w formularzu (frontend)
6. **Test** - Sprawdz czy dziala
7. **Commit** - Zatwierdz zmiany

---

**Nastepny krok:** [Troubleshooting](./07-troubleshooting.md)

[Powrot do indeksu](../../QUICK_START.md)
