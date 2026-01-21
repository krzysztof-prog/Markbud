# Testing

Wytyczne dotyczace testowania w projekcie AKROBUD.

---

## Wymagania

Nowy kod powinien miec testy:

| Typ testu | Zakres | Priorytet |
|-----------|--------|-----------|
| **Unit tests** | logika biznesowa (services, utils) | Wymagany |
| **Integration tests** | API endpoints | Wymagany |
| **E2E tests** | critical user flows | Opcjonalnie |

---

## Unit Tests (Vitest)

### Uruchamianie

```bash
# Uruchom testy
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Przyklad testu

```typescript
// orderService.test.ts
import { describe, it, expect } from 'vitest';
import { OrderService } from './orderService';

describe('OrderService', () => {
  describe('calculateTotal', () => {
    it('should calculate total value correctly', () => {
      const service = new OrderService();
      const total = service.calculateTotal([
        { quantity: 2, price: 100 },
        { quantity: 3, price: 50 }
      ]);
      expect(total).toBe(350);
    });
  });
});
```

### Struktura testow

```
src/
  services/
    orderService.ts
    orderService.test.ts     # <- test obok pliku
  utils/
    money.ts
    money.test.ts
```

---

## E2E Tests (Playwright)

### Uruchamianie

```bash
# Uruchom E2E tests
pnpm test:e2e

# UI mode
pnpm test:e2e:ui
```

### Przyklad testu E2E

```typescript
// deliveries.spec.ts
import { test, expect } from '@playwright/test';

test('should create new delivery', async ({ page }) => {
  await page.goto('/dostawy');
  await page.click('[data-testid="new-delivery"]');
  await page.fill('[name="client"]', 'Test Client');
  await page.click('[type="submit"]');

  await expect(page.locator('text=Dostawa utworzona')).toBeVisible();
});
```

### Best Practices dla E2E

- Uzywaj `data-testid` dla selektorow
- Testuj critical user flows
- Unikaj testowania UI details (to rola unit testow)

---

## Test Coverage

### Minimalny target: **70% coverage**

Sprawdz coverage:
```bash
pnpm test:coverage
```

### Co testowac

| Priorytet | Co testowac |
|-----------|-------------|
| Wysoki | Logika biznesowa (services) |
| Wysoki | Walidatory (schemas) |
| Sredni | Handlers (happy path + errors) |
| Sredni | Utils/helpers |
| Niski | Components (jesli maja logike) |

### Czego NIE testowac

- Proste gettery/settery
- Importy/eksporty
- Zewnetrzne biblioteki

---

## Mockowanie

### Prisma Mock

```typescript
import { prismaMock } from '../mocks/prisma.mock';

describe('OrderRepository', () => {
  it('should create order', async () => {
    const mockOrder = { id: '1', number: 'ORD-001' };
    prismaMock.order.create.mockResolvedValue(mockOrder);

    const result = await repository.create({ number: 'ORD-001' });

    expect(result).toEqual(mockOrder);
  });
});
```

---

## Checklist przed PR

- [ ] Wszystkie testy przechodza (`pnpm test`)
- [ ] Coverage >= 70% dla nowego kodu
- [ ] E2E testy dla critical flows (jesli applicable)
- [ ] Brak `console.log` w testach

---

**Powrot do:** [CONTRIBUTING](../../CONTRIBUTING.md)
