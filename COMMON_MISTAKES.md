# Common Mistakes - DO / DON'T

> **Claude:** Przeczytaj ten plik PRZED każdym kodowaniem!
> Ta lista rośnie z każdym błędem - jeśli popełnisz nowy, **dodaj go tutaj**.

**Ostatnia aktualizacja:** 2026-01-02
**Źródło:** Audyt kodu + doświadczenie projektu

---

## 💰 Operacje na pieniądzach

### ❌ DON'T - Używaj parseFloat/toFixed na wartościach pieniężnych
```typescript
// ❌ KATASTROFALNY BŁĄD
const total = parseFloat(order.valuePln); // wyświetli 10000 zamiast 100 PLN!
const formatted = order.valuePln.toFixed(2); // "10000.00" zamiast "100.00"
```

**Dlaczego:** Wartości w bazie są w **groszach (integer)**, nie złotówkach!

### ✅ DO - ZAWSZE używaj funkcji z money.ts
```typescript
// ✅ POPRAWNIE
import { groszeToPln, plnToGrosze, formatGrosze } from './utils/money';

const totalPln = groszeToPln(order.valuePln as Grosze); // 10000 groszy → 100 PLN
const formatted = formatGrosze(order.valuePln as Grosze); // "100,00 zł"

// Przy zapisie do bazy:
const grosze = plnToGrosze(100); // 100 PLN → 10000 groszy
```

**Gdzie sprawdzić:** [apps/api/src/utils/money.ts](apps/api/src/utils/money.ts)

---

## 🗑️ Usuwanie danych

### ❌ DON'T - Hard delete bez confirmation
```typescript
// ❌ NIEBEZPIECZNE - dane znikają NA ZAWSZE
await prisma.delivery.delete({ where: { id } });
```

**Dlaczego:** Użytkownik może przypadkowo kliknąć. Brak undo. Brak audytu.

### ✅ DO - Soft delete + confirmation dialog
```typescript
// ✅ POPRAWNIE

// 1. Frontend: Pokaż confirmation dialog
const handleDelete = async () => {
  const confirmed = await showConfirmDialog({
    title: 'Czy na pewno usunąć?',
    description: 'Ta operacja jest nieodwracalna. Dostawa zostanie trwale usunięta.',
    confirmText: 'Usuń',
    cancelText: 'Anuluj'
  });

  if (!confirmed) return;

  // 2. Backend: Soft delete
  await prisma.delivery.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
};

// 3. Queries: Filtruj usunięte
const deliveries = await prisma.delivery.findMany({
  where: { deletedAt: null } // wykluczamy usunięte
});
```

**Gdzie sprawdzić:**
- Schema: [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma) - `deletedAt DateTime?`
- Przykład: Order model ma `archivedAt`

---

## 📥 Importy i parsowanie

### ❌ DON'T - Cicho pomijaj błędy importu
```typescript
// ❌ ŹLE - użytkownik nie wie że coś pominięto
if (!color) {
  console.warn('Kolor nie znaleziony');
  continue; // 💀 wiersz zniknął bez śladu!
}
```

**Konsekwencja:** "Import successful!" ale 150/500 wierszy znikło. Odkryto po miesiącu.

### ✅ DO - Zbieraj błędy i raportuj użytkownikowi
```typescript
// ✅ POPRAWNIE
const errors: ImportError[] = [];
const successCount = 0;

for (const [index, row] of rows.entries()) {
  if (!row.color) {
    errors.push({
      row: index + 1,
      field: 'color',
      value: row.colorCode,
      reason: `Kolor "${row.colorCode}" nie istnieje w bazie`
    });
    continue;
  }
  // ... proces wiersza
  successCount++;
}

// Zwróć raport
return {
  success: successCount,
  failed: errors.length,
  total: rows.length,
  errors: errors
};

// Frontend: Pokaż użytkownikowi
if (result.failed > 0) {
  toast({
    variant: 'warning',
    title: `Zaimportowano ${result.success}/${result.total} wierszy`,
    description: `${result.failed} wierszy pominięto. Kliknij aby pobrać raport.`,
    action: <Button onClick={downloadErrorReport}>Pobierz raport</Button>
  });
}
```

**Gdzie sprawdzić:** [apps/api/src/services/parsers/csv-parser.ts](apps/api/src/services/parsers/csv-parser.ts)

---

## 🔘 Buttony i mutacje

### ❌ DON'T - Buttony bez disabled podczas operacji
```typescript
// ❌ ŹLE - użytkownik może kliknąć 5x → 5 requestów
const { mutate: deleteOrder } = useMutation(...);

<Button onClick={() => deleteOrder(id)}>
  Usuń zlecenie
</Button>
```

**Konsekwencja:** Double-submit, race conditions, duplikaty w bazie!

### ✅ DO - Disabled + loading state
```typescript
// ✅ POPRAWNIE
const { mutate: deleteOrder, isPending } = useMutation(...);

<Button
  onClick={() => deleteOrder(id)}
  disabled={isPending} // ← KLUCZOWE!
>
  {isPending ? 'Usuwanie...' : 'Usuń zlecenie'}
</Button>
```

---

## 🎨 Architektura Backend

### ❌ DON'T - Lokalne try-catch w handlerach
```typescript
// ❌ ŹLE - handler obsługuje błędy lokalnie
async getCalendarBatch(request, reply) {
  try {
    const data = await this.service.getData();
    return reply.send(data);
  } catch (error) {
    // ❌ Manualna obsługa - niepotrzebna!
    return reply.status(500).send({ error: 'Failed' });
  }
}
```

**Dlaczego:** Middleware `error-handler.ts` obsługuje błędy globalnie!

### ✅ DO - Throwuj błędy, middleware je złapie
```typescript
// ✅ POPRAWNIE
async getCalendarBatch(request, reply) {
  // Walidacja
  const validated = schema.parse(request.query); // ZodError → middleware → 400

  // Logika
  const data = await this.service.getData(); // AppError → middleware → 500

  // Response
  return reply.send(data);
}

// Middleware automatycznie obsługuje:
// - ZodError → 400 + szczegóły walidacji
// - PrismaError → 400/404/500 + przyczyna
// - AppError → custom status + message
```

**Gdzie sprawdzić:** [apps/api/src/middleware/error-handler.ts](apps/api/src/middleware/error-handler.ts)

---

## ⚛️ Frontend - React Query

### ❌ DON'T - Early returns z loading
```typescript
// ❌ ŹLE - powoduje layout shift
const { data, isLoading } = useQuery(...);

if (isLoading) {
  return <LoadingSpinner />; // ← zmienia layout!
}

return <div>{data.map(...)}</div>;
```

**Konsekwencja:** Content "skacze" podczas ładowania. Zła UX.

### ✅ DO - Suspense boundaries
```typescript
// ✅ POPRAWNIE - Option 1: useSuspenseQuery
const { data } = useSuspenseQuery(...);

return <div>{data.map(...)}</div>;

// W parent component:
<Suspense fallback={<LoadingSkeleton />}>
  <DataComponent />
</Suspense>

// ✅ POPRAWNIE - Option 2: Conditional render
const { data, isLoading } = useQuery(...);

return (
  <div>
    {isLoading ? (
      <LoadingSkeleton /> // ← ten sam layout jak data!
    ) : (
      <div>{data.map(...)}</div>
    )}
  </div>
);
```

**Gdzie sprawdzić:** [frontend-dev-guidelines skill](apps/web/src/)

---

## 🚀 Dynamic Imports - Next.js 15

### ❌ DON'T - Implicit default import
```typescript
// ❌ ŹLE - runtime error w Next.js 15
const HeavyComponent = dynamic(() => import('./Heavy'));
```

**Błąd:** `Error: Element type is invalid: expected a string... but got: object`

### ✅ DO - Explicit default export
```typescript
// ✅ POPRAWNIE
const HeavyComponent = dynamic(
  () => import('./Heavy').then((mod) => mod.default), // ← KLUCZOWE!
  {
    loading: () => <Skeleton />,
    ssr: false
  }
);
```

**Gdzie:** WSZYSTKIE lazy-loaded komponenty (Calendars, Charts, DataTables, Dialogs)

---

## 🗄️ Baza danych - Prisma

### ❌ DON'T - Używaj `db:push`
```powershell
# ❌ NIGDY! - kasuje dane bez ostrzeżenia
pnpm db:push
```

**Konsekwencja:** Utrata wszystkich danych w bazie!

### ✅ DO - ZAWSZE używaj migracji
```powershell
# ✅ POPRAWNIE
pnpm db:migrate
```

**Dlaczego:** Migracje zachowują dane + historia zmian + rollback możliwy.

---

### ❌ DON'T - Transakcje bez proper error handling
```typescript
// ❌ ŹLE - co jeśli failuje w połowie?
await prisma.order.create({ data: orderData });
await prisma.delivery.update({ where: { id }, data: { ... } });
// Jeśli 2. failuje → order utworzony ale delivery nie!
```

### ✅ DO - Używaj $transaction
```typescript
// ✅ POPRAWNIE
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.delivery.update({
    where: { id },
    data: { orderId: order.id }
  });
  // Albo oba się udają, albo żadne!
});
```

**Gdzie sprawdzić:** [docs/guides/transactions.md](docs/guides/transactions.md)

---

## 📦 Package Manager

### ❌ DON'T - Używaj npm lub yarn
```powershell
# ❌ NIGDY!
npm install
yarn add package
```

**Dlaczego:** Projekt używa pnpm workspaces. npm/yarn złamią linki między pakietami!

### ✅ DO - TYLKO pnpm
```powershell
# ✅ ZAWSZE
pnpm install
pnpm add package
pnpm dev
```

---

## 🎯 Walidacja

### ❌ DON'T - Brak walidacji monetary values
```typescript
// ❌ ŹLE - może zapisać NaN, Infinity, ujemne
await prisma.order.create({
  data: {
    valuePln: req.body.value // co jeśli -1000? NaN?
  }
});
```

### ✅ DO - Waliduj przez Zod + money.ts
```typescript
// ✅ POPRAWNIE
import { z } from 'zod';
import { validateMonetaryValue } from './utils/money';

const orderSchema = z.object({
  valuePln: z.number()
    .positive('Wartość musi być dodatnia')
    .int('Wartość musi być liczbą całkowitą (w groszach)')
    .max(Number.MAX_SAFE_INTEGER, 'Wartość za duża')
    .refine(validateMonetaryValue, 'Nieprawidłowa wartość pieniężna')
});

const validated = orderSchema.parse(req.body);
await prisma.order.create({ data: validated });
```

---

## 🔒 Confirmation Dialogs

### ❌ DON'T - Destructive actions bez potwierdzenia
```typescript
// ❌ ŹLE - jeden klik i po danych
<Button onClick={handleDelete}>Usuń</Button>
```

### ✅ DO - Zawsze pytaj + wyjaśnij konsekwencje
```typescript
// ✅ POPRAWNIE
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Usuń</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Czy na pewno usunąć dostawę?</AlertDialogTitle>
      <AlertDialogDescription>
        Ta operacja jest nieodwracalna. Dostawa #{delivery.id} zostanie
        trwale usunięta. Przypisane zlecenia staną się nieprzypisane.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Anuluj</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Usuń trwale
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 📝 Komentarze i komunikaty

### ❌ DON'T - Komentarze i komunikaty po angielsku
```typescript
// ❌ ŹLE
// Validate user input
throw new ValidationError('Invalid color code');

toast({
  title: 'Success',
  description: 'Order created successfully'
});
```

### ✅ DO - Komentarze i komunikaty po polsku
```typescript
// ✅ POPRAWNIE

// Waliduj dane użytkownika
throw new ValidationError('Nieprawidłowy kod koloru');

toast({
  title: 'Sukces',
  description: 'Zlecenie utworzone pomyślnie'
});
```

**Wyjątek:** Kod (zmienne, funkcje, klasy) ZAWSZE po angielsku!

---

## 🧪 Testy (gdy będą)

### ❌ DON'T - Brak testów dla critical paths
```typescript
// ❌ ŹLE - 1000+ linii kodu bez testów
// importService.ts - 0 testów
// deliveryService.ts - 0 testów
```

### ✅ DO - Testy przynajmniej dla happy path
```typescript
// ✅ MINIMUM
describe('DeliveryService', () => {
  it('should create delivery with valid data', async () => {
    const delivery = await service.create(validData);
    expect(delivery).toBeDefined();
    expect(delivery.status).toBe('planned');
  });

  it('should throw ValidationError for invalid data', async () => {
    await expect(service.create(invalidData))
      .rejects.toThrow(ValidationError);
  });
});
```

---

## 📱 Responsive Design

### ❌ DON'T - Tabele na mobile bez dostosowania
```typescript
// ❌ ŹLE - 14 kolumn na ekranie 375px
<Table>
  <TableHeader>
    <TableRow>
      {/* 14 kolumn - scroll w 2 kierunkach! */}
    </TableRow>
  </TableHeader>
</Table>
```

### ✅ DO - Card view na mobile
```typescript
// ✅ POPRAWNIE
const isMobile = useMediaQuery('(max-width: 768px)');

{isMobile ? (
  // Card view
  <div className="space-y-2">
    {items.map(item => (
      <Card key={item.id} className="p-4">
        <div className="font-bold">{item.name}</div>
        <div className="text-sm text-gray-600">{item.description}</div>
      </Card>
    ))}
  </div>
) : (
  // Table view
  <Table>
    {/* pełna tabela */}
  </Table>
)}
```

---

## 🎓 Skille

### ❌ DON'T - Koduj bez aktywowania skillów
```
Claude: *zaczyna pisać kod bez przeczytania standardów*
```

### ✅ DO - ZAWSZE aktywuj skill przed kodowaniem
```
User: "Dodaj nowy endpoint do API"
Claude: "Zanim zacznę, aktywuję skill backend-dev-guidelines..."
*aktywuje skill*
*pisze zgodnie ze standardami*
```

**Kiedy:**
- Backend → `backend-dev-guidelines`
- Frontend → `frontend-dev-guidelines`

---

## 📋 Checklist przed commitem

```
✅ Przeczytałem COMMON_MISTAKES.md (ten plik)
✅ Sprawdziłem LESSONS_LEARNED.md
✅ Aktywowałem odpowiedni skill
✅ Kod po angielsku, komentarze po polsku
✅ Komunikaty użytkownika po polsku
✅ Używam money.ts dla kwot
✅ Soft delete zamiast hard delete
✅ Confirmation dla destructive actions
✅ Disabled buttons podczas mutacji
✅ Import errors są raportowane
✅ Brak try-catch w handlerach
✅ TypeScript strict - no any
✅ pnpm (nie npm/yarn)
```

---

## 🔄 Jak aktualizować ten plik

### Gdy znajdziesz nowy błąd:

1. **Dodaj sekcję** w odpowiednim miejscu
2. **Format:**
   ```markdown
   ## 📁 Kategoria

   ### ❌ DON'T - Co jest źle
   ```code example```
   **Dlaczego:** Wyjaśnienie

   ### ✅ DO - Jak poprawnie
   ```code example```
   **Gdzie sprawdzić:** Link do pliku/dokumentacji
   ```

3. **Commit message:**
   ```
   docs: Add common mistake - [krótki opis]

   Found in: [gdzie znalazłeś błąd]
   Impact: [jakie konsekwencje]
   ```

---

**Pamiętaj:** Ten plik jest Twoją pamięcią. Używaj go!

**Następny krok:** Przeczytaj [LESSONS_LEARNED.md](LESSONS_LEARNED.md) - błędy z historii projektu.
