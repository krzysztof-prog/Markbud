# TDD - Test Driven Development

Pisz testy PRZED kodem. To zapobiega debugowaniu w ciemno.

## Workflow TDD

```
1. RED    → Napisz test który FAIL
2. GREEN  → Napisz minimalny kod żeby PASS
3. REFACTOR → Popraw kod zachowując PASS
```

## Jak używać

### 1. Opisz funkcjonalność
```
Chcę funkcję która oblicza sumę belek dla zlecenia
```

### 2. Napiszę test NAJPIERW
```typescript
// orderService.test.ts
describe('calculateTotalBeams', () => {
  it('should sum beams from all requirements', () => {
    const requirements = [
      { beamsCount: 5 },
      { beamsCount: 3 },
      { beamsCount: 2 }
    ];

    const result = calculateTotalBeams(requirements);

    expect(result).toBe(10);
  });

  it('should return 0 for empty array', () => {
    expect(calculateTotalBeams([])).toBe(0);
  });

  it('should handle null requirements', () => {
    expect(calculateTotalBeams(null)).toBe(0);
  });
});
```

### 3. Uruchom - musi FAIL
```bash
pnpm test src/services/orderService.test.ts
# ❌ FAIL - funkcja nie istnieje
```

### 4. Napisz minimalną implementację
```typescript
// orderService.ts
export function calculateTotalBeams(requirements: Requirement[] | null): number {
  if (!requirements) return 0;
  return requirements.reduce((sum, r) => sum + r.beamsCount, 0);
}
```

### 5. Uruchom - musi PASS
```bash
pnpm test src/services/orderService.test.ts
# ✅ PASS
```

### 6. Refactor jeśli potrzeba (testy nadal PASS)

## Komendy testów

```bash
# Uruchom wszystkie testy
pnpm test

# Watch mode (auto-rerun)
pnpm test:watch

# Konkretny plik
pnpm test src/services/orderService.test.ts

# Z coverage
pnpm test:coverage
```

## Struktura testów

```
apps/api/src/
├── services/
│   ├── orderService.ts
│   └── orderService.test.ts    # Test obok implementacji
├── handlers/
│   ├── orderHandler.ts
│   └── orderHandler.test.ts
```

## Teraz

Opisz funkcjonalność którą chcesz zaimplementować:
1. Napiszę test NAJPIERW
2. Uruchomimy - musi FAIL
3. Napiszę kod
4. Uruchomimy - musi PASS
