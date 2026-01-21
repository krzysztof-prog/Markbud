# Pozostale zasady

[< Powrot do spisu tresci](README.md)

---

## Package Manager

### DON'T - Uzywaj npm lub yarn

```powershell
# NIGDY!
npm install
yarn add package
```

**Dlaczego:** Projekt uzywa pnpm workspaces. npm/yarn zlamia linki miedzy pakietami!

### DO - TYLKO pnpm

```powershell
# ZAWSZE
pnpm install
pnpm add package
pnpm dev
```

---

## Komentarze i komunikaty

### DON'T - Komentarze i komunikaty po angielsku

```typescript
// ZLE
// Validate user input
throw new ValidationError('Invalid color code');

toast({
  title: 'Success',
  description: 'Order created successfully'
});
```

### DO - Komentarze i komunikaty po polsku

```typescript
// POPRAWNIE

// Waliduj dane uzytkownika
throw new ValidationError('Nieprawidlowy kod koloru');

toast({
  title: 'Sukces',
  description: 'Zlecenie utworzone pomyslnie'
});
```

**Wyjatek:** Kod (zmienne, funkcje, klasy) ZAWSZE po angielsku!

---

## Testy (gdy beda)

### DON'T - Brak testow dla critical paths

```typescript
// ZLE - 1000+ linii kodu bez testow
// importService.ts - 0 testow
// deliveryService.ts - 0 testow
```

### DO - Testy przynajmniej dla happy path

```typescript
// MINIMUM
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

## Strefy czasowe i daty

### DON'T - Uzywaj toISOString() do formatowania dat lokalnych

```typescript
// ZLE - toISOString() zwraca date w UTC!
const dateKey = entry.date.toISOString().split('T')[0];
// Wpis z 14 stycznia 00:00 CET -> "2026-01-13" (bo UTC-1)!

// ZLE - new Date().toISOString() tez
const today = new Date().toISOString().split('T')[0];
```

**Konsekwencja:** Kalendarz pokazuje wpisy pod ZLYM dniem (poprzedni dzien w UTC).

### DO - Uzywaj lokalnych metod getFullYear/getMonth/getDate

```typescript
// POPRAWNIE - formatowanie lokalnej daty
const d = entry.date;
const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Wpis z 14 stycznia 00:00 CET -> "2026-01-14" (poprawnie!)

// POPRAWNIE - helper function
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

**Gdzie sprawdzic:** Problem naprawiony w [apps/api/src/services/timesheetsService.ts](../../apps/api/src/services/timesheetsService.ts)

**Kiedy uzywac UTC:**
- Przechowywanie w bazie (Prisma robi to automatycznie)
- API responses (standard ISO 8601)
- Porownywanie dat miedzy strefami czasowymi

**Kiedy uzywac lokalnej daty:**
- Wyswietlanie uzytkownikowi
- Grupowanie po dniu (kalendarz, raporty)
- Filtrowanie "dzisiejsze wpisy"

---

## Responsive Design

### DON'T - Tabele na mobile bez dostosowania

```typescript
// ZLE - 14 kolumn na ekranie 375px
<Table>
  <TableHeader>
    <TableRow>
      {/* 14 kolumn - scroll w 2 kierunkach! */}
    </TableRow>
  </TableHeader>
</Table>
```

### DO - Card view na mobile

```typescript
// POPRAWNIE
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
    {/* pelna tabela */}
  </Table>
)}
```

---

## Skille

### DON'T - Koduj bez aktywowania skillow

```
Claude: *zaczyna pisac kod bez przeczytania standardow*
```

### DO - ZAWSZE aktywuj skill przed kodowaniem

```
User: "Dodaj nowy endpoint do API"
Claude: "Zanim zaczne, aktywuje skill backend-dev-guidelines..."
*aktywuje skill*
*pisze zgodnie ze standardami*
```

**Kiedy:**
- Backend -> `backend-dev-guidelines`
- Frontend -> `frontend-dev-guidelines`

---

## Routing - Backend i Frontend

### DON'T - Rejestruj route `/:id` przed stalymi sciezkami

```typescript
// ZLE - kolejnosc ma znaczenie!
fastify.get('/:id', handler.getById);        // <- lapie WSZYSTKO
fastify.get('/calendar', handler.getCalendar); // <- NIGDY nie zostanie wywolany!
```

**Konsekwencja:** Request do `/deliveries/calendar` zostanie potraktowany jako `id=calendar`.

### DO - Stale sciezki PRZED dynamicznymi

```typescript
// POPRAWNIE
fastify.get('/calendar', handler.getCalendar);      // <- konkretna sciezka
fastify.get('/calendar-batch', handler.getBatch);   // <- konkretna sciezka
fastify.get('/stats/windows', handler.getStats);    // <- konkretna sciezka
fastify.get('/:id', handler.getById);               // <- dynamiczna NA KONCU
```

**Gdzie sprawdzic:** [apps/api/src/routes/deliveries.ts](../../apps/api/src/routes/deliveries.ts)

---

### DON'T - Duplikuj API client w roznych miejscach

```typescript
// ZLE - dwa pliki z tym samym ordersApi
// apps/web/src/lib/api/orders.ts (18 metod)
// apps/web/src/features/orders/api/ordersApi.ts (10 metod) <- DUPLIKAT
```

**Konsekwencja:** Chaos, niespojosc, brakujace metody, trudniejsze utrzymanie.

### DO - Jeden centralny API client

```typescript
// POPRAWNIE - JEDNO miejsce
// apps/web/src/lib/api/orders.ts - MASTER COPY

// Import zawsze z lib/api:
import { ordersApi } from '@/lib/api/orders';
```

---

### DON'T - Rejestruj route z aliasami bez /api prefix

```typescript
// ZLE - moze kolidowac z Next.js App Router
await fastify.register(mojaPracaRoutes, { prefix: '/api/moja-praca' });
await fastify.register(mojaPracaRoutes, { prefix: '/moja-praca' }); // <- ALIAS BEZ /api!
```

**Konsekwencja:** Konflikty z Next.js routing - `/moja-praca` to sciezka strony frontend!

### DO - Wszystkie API routes z prefixem /api

```typescript
// POPRAWNIE
await fastify.register(mojaPracaRoutes, { prefix: '/api/moja-praca' });
// Frontend uzywa: fetch('/api/moja-praca/...')
```

---

## Middleware - Protected Routes

### DON'T - Zapominaj o ochronie stron w middleware

```typescript
// ZLE - tylko kilka stron chronionych
const PROTECTED_ROUTES = {
  '/admin': [OWNER, ADMIN],
  '/kierownik': [OWNER, ADMIN, KIEROWNIK],
  // Brakuje: /dostawy, /magazyn, /moja-praca itd.
};
```

**Konsekwencja:** Kazdy zalogowany uzytkownik ma dostep do wszystkich stron!

### DO - Chroncie WSZYSTKIE strony wymagajace autoryzacji

```typescript
// POPRAWNIE - kompletna mapa rol
const PROTECTED_ROUTES = {
  '/admin': [OWNER, ADMIN],
  '/kierownik': [OWNER, ADMIN, KIEROWNIK],
  '/importy': [OWNER, ADMIN],
  '/dostawy': [OWNER, ADMIN, KIEROWNIK],
  '/magazyn': [OWNER, ADMIN, KIEROWNIK, MAGAZYNIER],
  '/moja-praca': [OWNER, ADMIN, KIEROWNIK, OPERATOR],
  '/operator': [OWNER, ADMIN, KIEROWNIK, OPERATOR],
  // ... wszystkie strony!
};
```

**Gdzie sprawdzic:** [apps/web/src/middleware.ts](../../apps/web/src/middleware.ts)

---

## Kluczowe zasady

1. **pnpm** - nigdy npm/yarn
2. **Po polsku** - komentarze i komunikaty uzytkownika
3. **Testy** - minimum happy path + error case
4. **Lokalna data** - dla UI, UTC dla bazy
5. **Responsive** - card view na mobile
6. **Skille** - aktywuj przed kodowaniem
7. **Routing** - stale sciezki przed dynamicznymi
8. **Jeden API client** - w lib/api/
9. **Protected routes** - wszystkie strony z autoryzacja

---

[< Powrot do spisu tresci](README.md)
