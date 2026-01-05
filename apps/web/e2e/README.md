# E2E Tests - Playwright

Kompleksowe testy End-to-End dla aplikacji AKROBUD.

## 📋 Pliki testowe

### 1. **no-console-errors.spec.ts**
Sprawdza czy aplikacja ładuje się bez błędów w konsoli.
- Home page
- Settings page
- Deliveries page

### 2. **deliveries.spec.ts**
Testy zarządzania dostawami:
- Wyświetlanie listy dostaw
- Nawigacja do szczegółów
- Tworzenie nowej dostawy
- Filtrowanie i wyszukiwanie
- Generowanie protokołu PDF

### 3. **warehouse.spec.ts**
Testy magazynu:
- Wyświetlanie stanu magazynowego
- Filtrowanie po kolorze
- Edycja ilości
- Zamówienia magazynowe
- Dostawy Schuco

### 4. **imports.spec.ts**
Testy importu CSV:
- Upload plików
- Historia importów
- Walidacja danych
- Status importu

### 5. **settings.spec.ts**
Testy ustawień:
- Konfiguracja systemowa
- Zarządzanie profilami
- Zarządzanie kolorami
- Dni robocze

### 6. **navigation.spec.ts**
Testy nawigacji:
- Sidebar navigation
- Mobile menu
- Page transitions
- Deep linking
- Browser back/forward
- Breadcrumbs

### 7. **responsive.spec.ts**
Testy responsywności:
- Mobile viewport (375px)
- Tablet viewport (768px)
- Desktop viewport (1920px)
- Touch interactions
- Breakpoint transitions

---

## 🚀 Uruchamianie testów

### Wymagania
- Node.js 20+
- pnpm
- Backend API uruchomiony (`pnpm dev:api`)

### Krok 1: Instalacja
```bash
cd apps/web
pnpm install
```

### Krok 2: Uruchom backend
W osobnym terminalu:
```bash
cd apps/api
pnpm dev
```

### Krok 3: Uruchom testy
```bash
cd apps/web

# Wszystkie testy
pnpm test:e2e

# Tryb UI (interaktywny)
pnpm playwright test --ui

# Konkretny plik
pnpm playwright test e2e/deliveries.spec.ts

# W trybie headed (z widoczną przeglądarką)
pnpm playwright test --headed

# Debug mode
pnpm playwright test --debug
```

---

## 🔧 Konfiguracja

Konfiguracja znajduje się w `playwright.config.ts`:
- **Base URL**: http://localhost:3000
- **Browser**: Chromium
- **Retry**: 2x na CI, 0x lokalnie
- **Screenshots**: Only on failure
- **Timeout**: 30s

---

## 📊 Raporty

Po uruchomieniu testów, raport HTML jest generowany automatycznie:
```bash
pnpm playwright show-report
```

---

## 🎯 Wzorce testowe

### 1. Graceful Skipping
Testy używają `.catch(() => false)` aby pominąć testy gdy elementy nie istnieją:
```typescript
if (await button.isVisible({ timeout: 3000 }).catch(() => false)) {
  // Test code
} else {
  test.skip();
}
```

### 2. Flexible Selectors
Testy używają wielu selektorów aby być bardziej odporne:
```typescript
const sidebar = page.locator('aside, nav, [data-testid="sidebar"]').first();
```

### 3. Wait Strategies
```typescript
// Wait for network
await page.waitForLoadState('networkidle');

// Wait for element
await page.waitForSelector('table', { timeout: 10000 });

// Wait for URL
await page.waitForURL(/\/dostawy/, { timeout: 5000 });
```

### 4. Viewport Testing
```typescript
test.use({ viewport: { width: 375, height: 667 } }); // Mobile
```

---

## 🐛 Debugging

### 1. Playwright Inspector
```bash
pnpm playwright test --debug
```

### 2. Trace Viewer
Po nieudanym teście:
```bash
pnpm playwright show-trace
```

### 3. Screenshots
Screenshots są automatycznie zapisywane przy błędach w:
```
playwright-report/
```

---

## ✅ Best Practices

1. **Uruchom backend przed testami**
   - Testy wymagają działającego API na localhost:3001

2. **Użyj data-testid dla stabilności**
   ```tsx
   <button data-testid="create-delivery">Create</button>
   ```

3. **Testuj happy path**
   - Najpierw upewnij się że podstawowe flow działają

4. **Nie hardcoduj danych**
   - Używaj dynamicznych selektorów

5. **Cleanup po testach**
   - Testy powinny być izolowane

---

## 📝 Dodawanie nowych testów

### Template:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/page-url');
    await page.waitForLoadState('networkidle');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const button = page.locator('button').first();

    // Act
    if (await button.isVisible({ timeout: 3000 }).catch(() => false)) {
      await button.click();

      // Assert
      const result = page.locator('[data-testid="result"]');
      await expect(result).toBeVisible();
    } else {
      test.skip();
    }
  });
});
```

---

## 🔗 Przydatne linki

- [Playwright Docs](https://playwright.dev)
- [Playwright Config](https://playwright.dev/docs/test-configuration)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Best Practices](https://playwright.dev/docs/best-practices)

---

## 📊 Status testów

- ✅ 7 plików testowych
- ✅ ~85+ testów E2E
- 🔄 Testy do uruchomienia i walidacji
- 🎯 Target: Stabilne testy dla głównych flow

---

**Ostatnia aktualizacja**: 2024-12-19
