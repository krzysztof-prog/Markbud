# Walidacja i bezpieczenstwo

[< Powrot do spisu tresci](README.md)

---

## Walidacja monetary values

### DON'T - Brak walidacji monetary values

```typescript
// ZLE - moze zapisac NaN, Infinity, ujemne
await prisma.order.create({
  data: {
    valuePln: req.body.value // co jesli -1000? NaN?
  }
});
```

### DO - Waliduj przez Zod + money.ts

```typescript
// POPRAWNIE
import { z } from 'zod';
import { validateMonetaryValue } from './utils/money';

const orderSchema = z.object({
  valuePln: z.number()
    .positive('Wartosc musi byc dodatnia')
    .int('Wartosc musi byc liczba calkowita (w groszach)')
    .max(Number.MAX_SAFE_INTEGER, 'Wartosc za duza')
    .refine(validateMonetaryValue, 'Nieprawidlowa wartosc pieniezna')
});

const validated = orderSchema.parse(req.body);
await prisma.order.create({ data: validated });
```

---

## Confirmation Dialogs

### DON'T - Destructive actions bez potwierdzenia

```typescript
// ZLE - jeden klik i po danych
<Button onClick={handleDelete}>Usun</Button>
```

### DO - Zawsze pytaj + wyjasniaj konsekwencje

```typescript
// POPRAWNIE
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Usun</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Czy na pewno usunac dostawe?</AlertDialogTitle>
      <AlertDialogDescription>
        Ta operacja jest nieodwracalna. Dostawa #{delivery.id} zostanie
        trwale usunieta. Przypisane zlecenia stana sie nieprzypisane.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Anuluj</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Usun trwale
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Autoryzacja i tokeny

### DON'T - Duplikuj klucze tokena w localStorage

```typescript
// ZLE - rozne klucze w roznych miejscach
// AuthContext.tsx:
const TOKEN_KEY = 'auth_token';

// auth-token.ts:
const TOKEN_STORAGE_KEY = 'akrobud_auth_token'; // <- INNY KLUCZ!

// api-client.ts:
const TOKEN_KEY = 'auth_token';
```

**Konsekwencja:** Token zapisany pod jednym kluczem, szukany pod innym -> 401 Unauthorized mimo zalogowania.

### DO - Jeden klucz tokena w centralnym miejscu

```typescript
// POPRAWNIE - wszystkie pliki uzywaja tego samego klucza
// Idealnie: stala w constants.ts
export const AUTH_TOKEN_KEY = 'auth_token';

// Wszedzie indziej:
import { AUTH_TOKEN_KEY } from '@/lib/constants';
localStorage.getItem(AUTH_TOKEN_KEY);
```

---

### DON'T - API client bez naglowka Authorization

```typescript
// ZLE - brak tokena w requestach
const response = await fetch(url, {
  headers: {
    'Content-Type': 'application/json',
    // brak Authorization header!
  }
});
```

### DO - ZAWSZE dodawaj token do API requestow

```typescript
// POPRAWNIE
const token = localStorage.getItem(TOKEN_KEY);
const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

const response = await fetch(url, {
  headers: {
    'Content-Type': 'application/json',
    ...authHeaders, // <- KLUCZOWE!
  }
});
```

---

### DON'T - Lokalna definicja AuthenticatedRequest w handlerach

```typescript
// ZLE - niezgodnosc z middleware
interface AuthenticatedRequest extends FastifyRequest {
  user?: { id: number }; // middleware ustawia 'userId', nie 'id'!
}
```

### DO - Importuj typ z middleware

```typescript
// POPRAWNIE
import type { AuthenticatedRequest } from '../../middleware/auth.js';

// Middleware ustawia:
// request.user = { userId: 123, email: '...' }

const userId = (request as AuthenticatedRequest).user?.userId;
```

**Gdzie sprawdzic:**
- [apps/api/src/middleware/auth.ts](../../apps/api/src/middleware/auth.ts) - definicja AuthenticatedRequest
- [apps/web/src/lib/api-client.ts](../../apps/web/src/lib/api-client.ts) - przyklad dodawania tokena

---

## Kluczowe zasady

1. **Zod dla wszystkich inputow** - waliduj przed zapisem
2. **Confirmation dialog** - dla wszystkich destructive actions
3. **Jeden klucz tokena** - zdefiniowany centralnie
4. **Authorization header** - zawsze w requestach API
5. **Importuj typy z middleware** - nie definiuj lokalnie

---

[< Powrot do spisu tresci](README.md)
