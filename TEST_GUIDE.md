# TEST_GUIDE.md - Przewodnik po testach AKROBUD

> Jak uruchamiać testy, istniejące pliki testowe, konfiguracja, szablony i best practices.

---

## Uruchamianie testow

### API (backend - Vitest, Node environment)

```powershell
# Wszystkie testy API (jednorazowo)
pnpm --filter @markbud/api test

# Watch mode (podczas developmentu)
pnpm --filter @markbud/api test:watch

# UI mode (przeglądarka)
pnpm --filter @markbud/api test:ui

# Pojedynczy plik
pnpm --filter @markbud/api test -- src/services/orderService.test.ts

# Z coverage
pnpm --filter @markbud/api test -- --coverage
```

### Web (frontend - Vitest + jsdom)

```powershell
# Wszystkie testy frontend (jednorazowo)
pnpm --filter @markbud/web test

# Watch mode
pnpm --filter @markbud/web test:watch

# Pojedynczy plik
pnpm --filter @markbud/web test -- src/components/ui/button.test.tsx

# Z coverage
pnpm --filter @markbud/web test -- --coverage
```

### E2E (Playwright - Chromium)

```powershell
# Wszystkie testy E2E
pnpm test:e2e

# Albo bezpośrednio
pnpm --filter @markbud/web test:e2e

# Pojedynczy plik
pnpm --filter @markbud/web test:e2e -- e2e/navigation.spec.ts

# Z UI mode (interaktywny)
pnpm --filter @markbud/web exec playwright test --ui

# Wyświetlanie raportu HTML po testach
pnpm --filter @markbud/web exec playwright show-report
```

### Shared packages

```powershell
# Testy w packages/shared
cd packages/shared && pnpm vitest run
```

---

## Konfiguracja - podsumowanie

### apps/api/vitest.config.ts

| Ustawienie | Wartosc |
|-----------|---------|
| environment | `node` |
| globals | `true` (describe/it/expect bez importu) |
| include | `src/**/*.test.ts` |
| fileParallelism | `false` (testy dzielą SQLite dev.db) |
| sequence.shuffle | `false` (stała kolejność) |
| coverage.provider | `v8` |
| coverage.reporter | text, json, html |

### apps/web/vitest.config.ts

| Ustawienie | Wartosc |
|-----------|---------|
| environment | `jsdom` |
| globals | `true` |
| setupFiles | `./src/test/setup.tsx` |
| include | `src/**/*.test.{ts,tsx}` |
| exclude | node_modules, .next, e2e |
| resolve.alias | `@` -> `./src` |
| plugins | `@vitejs/plugin-react` |

### apps/web/playwright.config.ts

| Ustawienie | Wartosc |
|-----------|---------|
| testDir | `./e2e` |
| fullyParallel | `true` |
| retries | 2 na CI, 0 lokalnie |
| workers | 1 na CI, auto lokalnie |
| reporter | `html` |
| baseURL | `http://localhost:3000` |
| trace | `on-first-retry` |
| screenshot | `only-on-failure` |
| browsers | Chromium only |
| webServer | `pnpm dev` z timeout 120s |

### apps/web/src/test/setup.tsx

Setup uruchamiany przed kazdym testem:
- Import `@testing-library/jest-dom/vitest` (matchery: toBeInTheDocument, toBeDisabled, etc.)
- `cleanup()` po kazdym tescie
- Mock `next/navigation` (useRouter, usePathname, useSearchParams, useParams)
- Mock `next/image` (renderuje zwykly `<img>`)
- Mock `window.matchMedia`, `ResizeObserver`, `IntersectionObserver`

### apps/web/src/test/test-utils.tsx

Custom render z providerami:
- Tworzy swiezy `QueryClient` dla kazdego testu (retry: false, gcTime: 0)
- Wrapper `QueryClientProvider`
- Re-exportuje wszystko z `@testing-library/react`
- Uzycie: `import { render, screen } from '@/test/test-utils'`

---

## Istniejace pliki testowe

### API - handlers (4)
- `apps/api/src/handlers/authHandler.test.ts`
- `apps/api/src/handlers/deliveryHandler.test.ts`
- `apps/api/src/handlers/profileHandler.test.ts`
- `apps/api/src/handlers/warehouse-handler.test.ts`

### API - services (21)
- `apps/api/src/services/authService.test.ts`
- `apps/api/src/services/colorService.test.ts`
- `apps/api/src/services/deliveryService.test.ts`
- `apps/api/src/services/HolidayService.test.ts`
- `apps/api/src/services/monthlyReportService.test.ts`
- `apps/api/src/services/orderService.test.ts`
- `apps/api/src/services/profileService.test.ts`
- `apps/api/src/services/warehouse-service.test.ts`
- `apps/api/src/services/__tests__/orderService.critical.test.ts`
- `apps/api/src/services/__tests__/orderService.integration.test.ts`
- `apps/api/src/services/akrobud-verification/utils/OrderNumberMatcher.test.ts`
- `apps/api/src/services/akrobud-verification/utils/ProjectMatcher.test.ts`
- `apps/api/src/services/akrobud-verification/utils/VerificationListComparator.test.ts`
- `apps/api/src/services/akrobud-verification/utils/VersionComparator.test.ts`
- `apps/api/src/services/calendar/CalendarService.test.ts`
- `apps/api/src/services/calendar/utils/EasterCalculator.test.ts`
- `apps/api/src/services/import/ImportOrchestrator.test.ts`
- `apps/api/src/services/import/parsers/csvImportService.test.ts`
- `apps/api/src/services/import/parsers/feature-flags.test.ts`
- `apps/api/src/services/import/parsers/pdfImportService.test.ts`
- `apps/api/src/services/import/__tests__/importService.critical.test.ts`
- `apps/api/src/services/label-check/LabelCheckService.test.ts`
- `apps/api/src/services/label-check/OcrService.test.ts`
- `apps/api/src/services/okuc/OkucArticleService.test.ts`
- `apps/api/src/services/okuc/OkucLocationService.test.ts`
- `apps/api/src/services/okuc/OkucStockService.test.ts`
- `apps/api/src/services/pallet-optimizer/PalletOptimizerService.test.ts`
- `apps/api/src/services/schuco/schucoOrderMatcher.test.ts`
- `apps/api/src/services/schuco/schucoOrderMatcher.integration.test.ts`
- `apps/api/src/services/schuco/schucoOrderMatcher.performance.test.ts`

### API - parsers (6)
- `apps/api/src/services/parsers/ArticleNumberParser.test.ts`
- `apps/api/src/services/parsers/BeamCalculator.test.ts`
- `apps/api/src/services/parsers/OrderNumberParser.test.ts`
- `apps/api/src/services/parsers/ProjectNumberParser.test.ts`
- `apps/api/src/services/parsers/UzyteBeleParser.test.ts`
- `apps/api/src/services/parsers/glass-order-txt-parser.test.ts`
- `apps/api/src/services/parsers/okuc-csv-parser.test.ts`

### API - repositories (5)
- `apps/api/src/repositories/DeliveryRepository.test.ts`
- `apps/api/src/repositories/ImportRepository.test.ts`
- `apps/api/src/repositories/LabelCheckRepository.test.ts`
- `apps/api/src/repositories/OrderRepository.test.ts`
- `apps/api/src/repositories/WarehouseRepository.test.ts`

### API - utils (8)
- `apps/api/src/utils/date-helpers.test.ts`
- `apps/api/src/utils/errors.test.ts`
- `apps/api/src/utils/file-validation.test.ts`
- `apps/api/src/utils/logger.test.ts`
- `apps/api/src/utils/money.test.ts`
- `apps/api/src/utils/order-status-machine.test.ts`
- `apps/api/src/utils/prisma-selects.test.ts`
- `apps/api/src/utils/warehouse-utils.test.ts`
- `apps/api/src/utils/warehouse-validation.test.ts`

### API - validators (4)
- `apps/api/src/validators/common.test.ts`
- `apps/api/src/validators/label-check.test.ts`
- `apps/api/src/validators/profile.test.ts`
- `apps/api/src/validators/warehouse.test.ts`

### Web - components (2)
- `apps/web/src/components/ui/button.test.tsx`
- `apps/web/src/components/ui/skeleton.test.tsx`

### Web - hooks (1)
- `apps/web/src/features/manager/hooks/useProductionSelection.test.ts`

### Web - E2E (7)
- `apps/web/e2e/deliveries.spec.ts`
- `apps/web/e2e/imports.spec.ts`
- `apps/web/e2e/navigation.spec.ts`
- `apps/web/e2e/no-console-errors.spec.ts`
- `apps/web/e2e/responsive.spec.ts`
- `apps/web/e2e/settings.spec.ts`
- `apps/web/e2e/warehouse.spec.ts`

### Shared packages (1)
- `packages/shared/src/utils/money.test.ts`

---

## Szablony do kopiowania

### Szablon: Test serwisu API

```typescript
// apps/api/src/services/myService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyService } from './myService';

// Mockowanie zależności (repository, inne serwisy)
vi.mock('../repositories/MyRepository', () => ({
  MyRepository: {
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { MyRepository } from '../repositories/MyRepository';

describe('MyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('zwraca element po ID', async () => {
      const mockItem = { id: 1, name: 'Test' };
      vi.mocked(MyRepository.findById).mockResolvedValue(mockItem);

      const result = await MyService.getById(1);

      expect(result).toEqual(mockItem);
      expect(MyRepository.findById).toHaveBeenCalledWith(1);
    });

    it('rzuca błąd gdy element nie istnieje', async () => {
      vi.mocked(MyRepository.findById).mockResolvedValue(null);

      await expect(MyService.getById(999)).rejects.toThrow(/not found/i);
    });
  });

  describe('create', () => {
    it('tworzy nowy element z poprawnymi danymi', async () => {
      const input = { name: 'Nowy', valuePln: 12345 };
      const mockCreated = { id: 1, ...input };
      vi.mocked(MyRepository.create).mockResolvedValue(mockCreated);

      const result = await MyService.create(input);

      expect(result).toEqual(mockCreated);
      expect(MyRepository.create).toHaveBeenCalledWith(input);
    });
  });
});
```

### Szablon: Test hooka React

```typescript
// apps/web/src/features/myFeature/hooks/useMyHook.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyHook } from './useMyHook';

// Mock API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api-client';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useMyHook', () => {
  it('zwraca dane po załadowaniu', async () => {
    const mockData = [{ id: 1, name: 'Test' }];
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useMyHook(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });
  });

  it('obsługuje błąd', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMyHook(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

### Szablon: Test komponentu React

```tsx
// apps/web/src/components/MyComponent.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renderuje poprawnie z domyślnymi propsami', () => {
    render(<MyComponent title="Test" />);

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('obsługuje kliknięcie', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<MyComponent title="Kliknij" onClick={handleClick} />);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('wyświetla stan disabled', () => {
    render(<MyComponent title="Nieaktywny" disabled />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('wyświetla loading state', () => {
    render(<MyComponent title="Ładowanie" isLoading />);

    expect(screen.getByText(/ładowanie/i)).toBeInTheDocument();
  });

  it('renderuje listę elementów', () => {
    const items = [
      { id: 1, name: 'Element 1' },
      { id: 2, name: 'Element 2' },
    ];

    render(<MyComponent items={items} />);

    expect(screen.getByText('Element 1')).toBeInTheDocument();
    expect(screen.getByText('Element 2')).toBeInTheDocument();
  });
});
```

### Szablon: Test E2E (Playwright)

```typescript
// apps/web/e2e/myFeature.spec.ts
import { test, expect } from '@playwright/test';

/**
 * E2E Tests: My Feature
 *
 * Testuje:
 * - Wyświetlanie listy
 * - Nawigacja do szczegółów
 * - Formularze
 */

test.describe('My Feature - Lista', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/my-feature');
    await page.waitForLoadState('networkidle');
  });

  test('powinien wyświetlić listę elementów', async ({ page }) => {
    // Czekaj na załadowanie danych
    const table = page.locator('table, [data-testid="my-list"]');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Sprawdź że są wiersze
    const rows = table.locator('tbody tr, [data-testid="list-item"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('powinien nawigować do szczegółów po kliknięciu', async ({ page }) => {
    const firstRow = page.locator('tbody tr, [data-testid="list-item"]').first();

    if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstRow.click();
      await page.waitForTimeout(1000);

      // Sprawdź że URL się zmienił
      expect(page.url()).toContain('/my-feature/');
    } else {
      test.skip();
    }
  });
});

test.describe('My Feature - Formularz', () => {
  test('powinien wypełnić i wysłać formularz', async ({ page }) => {
    await page.goto('/my-feature/new');
    await page.waitForLoadState('networkidle');

    // Wypełnij pola
    await page.fill('input[name="name"]', 'Test Element');
    await page.fill('input[name="value"]', '123.45');

    // Wybierz z dropdown
    const select = page.locator('select[name="type"], [data-testid="type-select"]');
    if (await select.isVisible({ timeout: 2000 }).catch(() => false)) {
      await select.selectOption({ label: 'Typ A' });
    }

    // Wyślij formularz
    const submitButton = page.locator('button[type="submit"], button:has-text("Zapisz")');
    await submitButton.click();

    // Sprawdź sukces (toast, redirect, etc.)
    await expect(
      page.locator('[data-testid="toast-success"], .toast, text="Zapisano"').first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('My Feature - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('powinien być responsywny na mobile', async ({ page }) => {
    await page.goto('/my-feature');
    await page.waitForLoadState('networkidle');

    // Sprawdź że główna zawartość jest widoczna
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });

    // Brak horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
```

---

## Best practices

### Ogolne zasady

1. **Nazewnictwo plikow**: `*.test.ts` dla API, `*.test.tsx` dla komponentow React, `*.spec.ts` dla E2E
2. **Lokalizacja**: test obok pliku ktory testuje (np. `myService.ts` -> `myService.test.ts`)
3. **Grupowanie**: `describe` dla klasy/modulu, zagniezdzone `describe` dla metody, `it` dla przypadku
4. **Jezyk opisow**: Opisy testow (describe/it) po polsku, kod po angielsku

### API testy

1. **Mockuj zaleznosci**: Uzyj `vi.mock()` dla repozytoriow i zewnetrznych serwisow
2. **Czysc mocki**: `vi.clearAllMocks()` w `beforeEach`
3. **Testuj happy path i edge cases osobno**: Osobne bloki `describe` dla happy path i bledow
4. **Nie testuj Prisma bezposrednio**: Mockuj repository, nie baze danych
5. **fileParallelism: false**: Testy API dzielą SQLite - brak rownoleglego wykonywania
6. **Kwoty w groszach**: Uzyj branded types (`Grosze`, `Centy`) z `money.ts`

### Frontend testy

1. **Uzywaj `@/test/test-utils`**: Importuj `render` i `screen` z custom utils (nie z `@testing-library/react`)
2. **`userEvent.setup()`**: Zawsze twórz user przed interakcjami (`const user = userEvent.setup()`)
3. **Testuj zachowanie, nie implementacje**: Szukaj po roli (`getByRole`), tekście (`getByText`), nie po klasach CSS
4. **Nie testuj styli**: Sprawdzaj obecnosc klas (`toHaveClass`), nie inline style
5. **Mock router jest w setup.tsx**: Nie musisz go mockować recznie
6. **QueryClient per test**: Custom render tworzy swiezego QueryClient automatycznie

### E2E testy

1. **`waitForLoadState('networkidle')`**: Czekaj na zaladowanie strony przed asercjami
2. **Timeouty**: Uzywaj jawnych timeoutow (`{ timeout: 10000 }`) dla wolnych operacji
3. **Graceful skip**: Jezeli element moze nie istniec, uzywaj `.catch(() => false)` + `test.skip()`
4. **baseURL = localhost:3000**: Nie pisz pelnych URLi, uzywaj sciezek (`/dostawy`)
5. **Tylko Chromium**: Projekt testuje tylko na Chromium (nie Firefox/Safari)
6. **Screenshots on failure**: Automatyczne screenshoty przy bledach - sprawdz w raporcie HTML

### Czego unikac

- **NIE** testuj prywatnych metod - testuj publiczne API
- **NIE** mockuj tego co testujesz - mockuj tylko zaleznosci
- **NIE** pisz testow ktore zależa od kolejnosci (chocby API testy nie sa parallel)
- **NIE** hardcoduj danych z bazy produkcyjnej w testach
- **NIE** uzywaj `sleep`/`setTimeout` zamiast `waitFor` w testach React
- **NIE** uzywaj `page.waitForTimeout()` zamiast wlasciwych locatorow w E2E (chyba ze brak lepszej opcji)

---

**Wersja:** 1.0
**Ostatnia aktualizacja:** 2026-02-25
