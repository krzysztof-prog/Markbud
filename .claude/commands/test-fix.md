# Test Fix - Naprawianie błędów testów

Systematyczne podejście do naprawiania failing tests.

## Workflow

1. **Uruchom testy** i zbierz output
2. **Analizuj błędy** jeden po drugim
3. **Napraw** minimalną zmianą
4. **Zweryfikuj** że naprawione

## Komendy

```bash
# Wszystkie testy
pnpm test

# Z watch mode
pnpm test:watch

# Konkretny plik
pnpm test src/services/orderService.test.ts

# Z coverage
pnpm test:coverage
```

## Częste przyczyny błędów

### 1. Mock nie działa
```typescript
// Źle
jest.mock('./service');

// Dobrze
vi.mock('./service', () => ({
  myFunction: vi.fn().mockReturnValue(...)
}));
```

### 2. Async nie czeka
```typescript
// Źle
test('async', () => {
  const result = await fetch();
});

// Dobrze
test('async', async () => {
  const result = await fetch();
});
```

### 3. State z poprzedniego testu
```typescript
// Dodaj cleanup
beforeEach(() => {
  vi.clearAllMocks();
});
```

### 4. Brakuje typu w mock
```typescript
// Źle
const mockFn = vi.fn();

// Dobrze
const mockFn = vi.fn<[string], Promise<Result>>();
```

## Teraz

1. Uruchom `pnpm test` w terminalu
2. Wklej output błędów
3. Naprawimy je systematycznie
