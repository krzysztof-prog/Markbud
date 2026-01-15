# Quick Fix

Szybka naprawa prostych bugów bez pełnego debug planu.

## Kiedy używać

- Prosty, oczywisty bug
- Znasz już przyczynę
- Nie wymaga analizy
- Fix < 5 minut

## Kiedy NIE używać (użyj /debug zamiast)

- Nie wiesz co jest przyczyną
- Bug dotyczy logiki biznesowej
- Wymaga analizy wielu plików
- Może mieć side effects

## Workflow

### 1. Opisz bug jednym zdaniem
```
"Button 'Zapisz' nie jest disabled podczas zapisywania"
```

### 2. Wskaż plik (jeśli wiesz)
```
"apps/web/src/features/orders/OrderForm.tsx"
```

### 3. Ja naprawiam

```typescript
// PRZED
<Button onClick={handleSubmit}>
  Zapisz
</Button>

// PO
<Button onClick={handleSubmit} disabled={isPending}>
  {isPending ? 'Zapisywanie...' : 'Zapisz'}
</Button>
```

### 4. Weryfikacja

```bash
pnpm typecheck  # Brak błędów TS
pnpm lint       # Brak warnings
```

## Typowe quick fixes

### Missing disabled state
```typescript
// Fix: disabled={isPending}
<Button disabled={isPending}>
```

### Missing loading state
```typescript
// Fix: Add loading indicator
{isLoading ? <Spinner /> : <Content />}
```

### Wrong import
```typescript
// Fix: Correct import path
import { X } from '@/lib/utils';  // not '../../../lib/utils'
```

### Missing null check
```typescript
// Fix: Optional chaining
data?.field?.value  // not data.field.value
```

### Wrong key in list
```typescript
// Fix: Unique key
{items.map(item => <Item key={item.id} />)}  // not key={index}
```

### Missing dependency in useEffect
```typescript
// Fix: Add to deps array
useEffect(() => { ... }, [dependency]);
```

### Console.log left in code
```typescript
// Fix: Remove
// console.log('debug:', data);
```

## Checklist po fix

- [ ] TypeScript compiles
- [ ] No ESLint errors
- [ ] Tested manually (1 click)
- [ ] No console.log left

## Teraz

Opisz bug który chcesz naprawić:

```
Przykład: "Toast nie pokazuje się po zapisaniu zlecenia"
Przykład: "Data wyświetla się w złym formacie"
```
