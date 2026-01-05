# Quick Reference - Najważniejsze zasady na 1 stronę

> **Claude:** Przeczytaj to PRZED każdą sesją kodowania!
> Najważniejsze zasady z [COMMON_MISTAKES.md](COMMON_MISTAKES.md) + [LESSONS_LEARNED.md](LESSONS_LEARNED.md)

**Ostatnia aktualizacja:** 2026-01-02

---

## 💰 Money Operations (KRYTYCZNE!)

```typescript
// ✅ ZAWSZE
import { groszeToPln, plnToGrosze, formatPln } from './utils/money';

const displayValue = groszeToPln(order.valuePln as Grosze);  // 10000 → 100 PLN
const formatted = formatPln(order.valuePln as Grosze);       // "100,00 zł"
const toSave = plnToGrosze(100);                             // 100 → 10000 groszy

// ❌ NIGDY
const value = parseFloat(order.valuePln);     // ❌ wyświetli x100 za dużo!
const formatted = order.valuePln.toFixed(2);  // ❌ "10000.00" zamiast "100.00"
```

**Dlaczego:** Baza przechowuje grosze (integer), nie złotówki!

---

## 🗑️ Delete Operations

```typescript
// ✅ ZAWSZE - Soft delete + Confirmation
const handleDelete = async () => {
  const confirmed = await showConfirmDialog({
    title: 'Czy na pewno usunąć?',
    description: 'Ta operacja jest nieodwracalna.'
  });
  if (!confirmed) return;

  await prisma.delivery.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
};

// ❌ NIGDY
await prisma.delivery.delete({ where: { id } });  // ❌ znika NA ZAWSZE!
```

**Dlaczego:** Przypadkowe kliknięcie = utrata danych bez możliwości odzyskania!

---

## 📥 Import Operations

```typescript
// ✅ ZAWSZE - Zbieraj błędy + raportuj
const errors: ImportError[] = [];
let successCount = 0;

for (const [index, row] of rows.entries()) {
  if (!row.color) {
    errors.push({
      row: index + 1,
      field: 'color',
      reason: `Kolor "${row.colorCode}" nie istnieje`
    });
    continue;
  }
  successCount++;
}

return {
  success: successCount,
  failed: errors.length,
  total: rows.length,
  errors: errors
};

// ❌ NIGDY
if (!color) {
  console.warn('Brak koloru');  // ❌ użytkownik nie widzi!
  continue;
}
```

**Dlaczego:** "Import successful!" ale 150/500 wierszy znikło. Wykryto po miesiącu!

---

## 🔘 Buttons + Mutations

```typescript
// ✅ ZAWSZE - Disabled podczas operacji
const { mutate: createOrder, isPending } = useMutation(...);

<Button
  onClick={() => createOrder(data)}
  disabled={isPending}  // ← KLUCZOWE!
>
  {isPending ? (
    <>
      <Loader2 className="animate-spin" />
      Tworzenie...
    </>
  ) : (
    'Utwórz zlecenie'
  )}
</Button>

// ❌ NIGDY
<Button onClick={() => createOrder(data)}>  // ❌ double-submit!
  Utwórz
</Button>
```

**Dlaczego:** Użytkownik kliknie 3x → 3 duplikaty w bazie!

---

## 🎨 Backend Architecture

```typescript
// ✅ POPRAWNIE - Bez try-catch w handlerach
async getOrders(request, reply) {
  const validated = schema.parse(request.query);  // ZodError → middleware → 400
  const orders = await service.getOrders(validated);
  return reply.send(orders);
}

// ❌ ŹLE - Lokalne try-catch niepotrzebne
async getOrders(request, reply) {
  try {
    // ...
  } catch (error) {  // ❌ middleware to robi globalnie!
    return reply.status(500).send({ error: 'Failed' });
  }
}
```

**Dlaczego:** Middleware `error-handler.ts` obsługuje wszystko globalnie!

**Architektura:** Route → Handler → Service → Repository

---

## ⚛️ Frontend - React Query

```typescript
// ✅ POPRAWNIE - Suspense boundaries
const { data } = useSuspenseQuery(...);
return <div>{data.map(...)}</div>;

// W parent:
<Suspense fallback={<LoadingSkeleton />}>
  <DataComponent />
</Suspense>

// ❌ ŹLE - Early return powoduje layout shift
const { data, isLoading } = useQuery(...);
if (isLoading) return <LoadingSpinner />;  // ← zmienia layout!
return <div>{data.map(...)}</div>;
```

**Dlaczego:** Content "skacze" podczas ładowania = zła UX.

---

## 🚀 Dynamic Imports - Next.js 15

```typescript
// ✅ POPRAWNIE - Explicit default
const Calendar = dynamic(
  () => import('./Calendar').then(mod => mod.default),  // ← KLUCZOWE!
  {
    loading: () => <Skeleton />,
    ssr: false
  }
);

// ❌ ŹLE - Runtime error
const Calendar = dynamic(() => import('./Calendar'));  // ❌ błąd w Next.js 15
```

**Gdzie:** Calendars, Charts, DataTables, Heavy Dialogs

---

## 🗄️ Database - Prisma

```powershell
# ✅ ZAWSZE
pnpm db:migrate        # Zachowuje dane + historia

# ❌ NIGDY
pnpm db:push          # ❌ Kasuje dane bez ostrzeżenia!
```

```typescript
// ✅ POPRAWNIE - Transakcje dla powiązanych operacji
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.delivery.update({
    where: { id },
    data: { orderId: order.id }
  });
  // Albo oba się udają, albo żadne!
});

// ❌ ŹLE - Bez transakcji
await prisma.order.create({ data: orderData });
await prisma.delivery.update(...);  // ❌ jeśli failuje → order został ale delivery nie!
```

---

## 📦 Package Manager

```powershell
# ✅ TYLKO pnpm
pnpm install
pnpm add package
pnpm dev

# ❌ NIGDY npm/yarn
npm install   # ❌ złamie workspaces!
yarn add      # ❌ złamie linki!
```

**Dlaczego:** Projekt używa pnpm workspaces. npm/yarn złamią monorepo!

---

## 🔒 Confirmation Dialogs

```typescript
// ✅ ZAWSZE dla destructive actions
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Usuń</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Czy na pewno usunąć?</AlertDialogTitle>
      <AlertDialogDescription>
        Ta operacja jest nieodwracalna. Dostawa #{delivery.id}
        zostanie trwale usunięta.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Anuluj</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Usuń</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// ❌ NIGDY - Jeden klik = dane zniknęły
<Button onClick={handleDelete}>Usuń</Button>
```

---

## 📝 Język i Komunikaty

```typescript
// ✅ POPRAWNIE
// Waliduj dane wejściowe przed zapisem
throw new ValidationError('Nieprawidłowy kod koloru');

toast({
  title: 'Sukces',
  description: 'Zlecenie utworzone pomyślnie'
});

// ❌ ŹLE
// Validate input before save
throw new ValidationError('Invalid color code');

toast({
  title: 'Success',
  description: 'Order created successfully'
});
```

**Zasada:** Kod (zmienne, funkcje) = ANGIELSKI, Komentarze + Komunikaty = POLSKI

---

## 📱 Responsive Design

```typescript
// ✅ POPRAWNIE - Card view na mobile
const isMobile = useMediaQuery('(max-width: 768px)');

{isMobile ? (
  <div className="space-y-2">
    {items.map(item => (
      <Card key={item.id}>
        <div className="font-bold">{item.name}</div>
        <div className="text-sm">{item.description}</div>
      </Card>
    ))}
  </div>
) : (
  <Table>{/* pełna tabela */}</Table>
)}

// ❌ ŹLE - 14 kolumn na telefonie
<Table>
  <TableRow>
    {/* 14 kolumn - scroll w 2 kierunkach! */}
  </TableRow>
</Table>
```

---

## ✅ Pre-Code Checklist

**Przed kodowaniem:**
- [ ] Przeczytałem COMMON_MISTAKES.md
- [ ] Przeczytałem LESSONS_LEARNED.md
- [ ] Aktywowałem skill (backend/frontend-dev-guidelines)

**Podczas kodowania:**
- [ ] Pytam o biznes zamiast zakładać
- [ ] Pokazuję opcje (szybkie vs lepsze)
- [ ] Używam money.ts dla kwot
- [ ] Disabled buttons podczas mutacji
- [ ] Confirmation dla destructive actions
- [ ] Import errors raportowane

**Po kodowaniu:**
- [ ] Money.ts używany? ✓
- [ ] Disabled buttons? ✓
- [ ] Confirmation dialogs? ✓
- [ ] Soft delete? ✓
- [ ] Import errors raportowane? ✓
- [ ] Nowe błędy w LESSONS_LEARNED? ✓

---

## 🚨 Top 5 Najczęstszych Błędów

1. **parseFloat na valuePln** → Dashboard x100 za dużo
2. **Hard delete bez confirmation** → Dane znikły NA ZAWSZE
3. **Import cicho pomija błędy** → 150/500 wierszy znikło
4. **Button bez disabled** → Double-submit, duplikaty
5. **db:push zamiast db:migrate** → Utrata wszystkich danych

---

## 📚 Gdzie szukać więcej

- **Szczegóły:** [COMMON_MISTAKES.md](COMMON_MISTAKES.md)
- **Historia:** [LESSONS_LEARNED.md](LESSONS_LEARNED.md)
- **Kontekst:** [CLAUDE.md](CLAUDE.md)
- **Skills:** `backend-dev-guidelines` / `frontend-dev-guidelines`

---

**PAMIĘTAJ:** Ten plik to Twoja ściąga. Przeczytaj przed każdą sesją kodowania!

**Następny krok:** [COMMON_MISTAKES.md](COMMON_MISTAKES.md) - pełne przykłady DO/DON'T
