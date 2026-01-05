# Quick Wins UX - Plan Implementacji

> **Data:** 31.12.2025
> **Czas realizacji:** 2-3 dni (18h pracy)
> **Priorytet:** CRITICAL ⚡
> **ROI:** Wysoki - natychmiastowa poprawa UX

---

## Cel

Implementacja **szybkich poprawek UX** o wysokim wpływie i niskim koszcie implementacji. Wszystkie zmiany zostały wybrane z raportu audytu UX jako najbardziej efektywne.

**Focus:** Desktop only (system nie jest projektowany dla mobile)

---

## Quick Win #1: Mapowanie Błędów API → User-Friendly (4h)

### Problem
Użytkownicy widzą techniczne komunikaty błędów: "500 Internal Server Error", "Network Error", które nie mówią co zrobić.

### Rozwiązanie
Stworzenie warstwy mapowania błędów na przyjazne komunikaty po polsku.

### Implementacja

#### 1. Utworzyć plik `apps/web/src/lib/error-messages.ts`

```typescript
/**
 * Mapowanie błędów API na komunikaty zrozumiałe dla użytkownika
 */

export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Brak połączenia z serwerem. Sprawdź połączenie internetowe.',
  TIMEOUT: 'Serwer nie odpowiada. Spróbuj ponownie za chwilę.',

  // HTTP errors
  400: 'Wysłane dane są nieprawidłowe. Sprawdź formularz.',
  401: 'Sesja wygasła. Zaloguj się ponownie.',
  403: 'Brak uprawnień do wykonania tej operacji.',
  404: 'Nie znaleziono żądanego zasobu.',
  409: 'Ta operacja koliduje z istniejącymi danymi.',
  422: 'Dane nie przeszły walidacji. Sprawdź poprawność.',
  500: 'Błąd serwera. Skontaktuj się z administratorem.',
  503: 'Serwer jest niedostępny. Spróbuj ponownie później.',

  // Business errors (dodać więcej w miarę potrzeb)
  PROFILE_NOT_FOUND: 'Nie znaleziono profilu w magazynie.',
  INSUFFICIENT_STOCK: 'Niewystarczający stan magazynowy.',
  DELIVERY_HAS_ORDERS: 'Nie można usunąć dostawy zawierającej zlecenia.',
  DUPLICATE_ORDER: 'Zlecenie o tym numerze już istnieje.',
  IMPORT_CONFLICT: 'Plik zawiera dane które już istnieją w systemie.',

  // Generic fallback
  UNKNOWN: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

/**
 * Pobiera przyjazny komunikat błędu
 */
export function getErrorMessage(error: unknown): string {
  // Axios error
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number; data?: { message?: string } } };

    // Sprawdź czy backend zwrócił custom message
    const backendMessage = axiosError.response?.data?.message;
    if (backendMessage && typeof backendMessage === 'string') {
      return backendMessage;
    }

    // Mapuj status code
    const status = axiosError.response?.status;
    if (status && status in ERROR_MESSAGES) {
      return ERROR_MESSAGES[status as keyof typeof ERROR_MESSAGES];
    }
  }

  // Network error
  if (error && typeof error === 'object' && 'code' in error) {
    const networkError = error as { code?: string };
    if (networkError.code === 'ERR_NETWORK') {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (networkError.code === 'ECONNABORTED') {
      return ERROR_MESSAGES.TIMEOUT;
    }
  }

  // Error object with message
  if (error instanceof Error) {
    // Sprawdź czy message zawiera znany kod błędu
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
      if (error.message.includes(code)) {
        return message;
      }
    }
  }

  // Fallback
  return ERROR_MESSAGES.UNKNOWN;
}

/**
 * Pobiera sugestię co użytkownik może zrobić
 */
export function getErrorAction(error: unknown): string | null {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number } };
    const status = axiosError.response?.status;

    switch (status) {
      case 400:
      case 422:
        return 'Popraw dane i spróbuj ponownie';
      case 401:
        return 'Zaloguj się ponownie';
      case 403:
        return 'Skontaktuj się z administratorem w sprawie uprawnień';
      case 409:
        return 'Sprawdź istniejące dane przed kontynuowaniem';
      case 500:
      case 503:
        return 'Poczekaj chwilę i odśwież stronę';
      default:
        return null;
    }
  }

  return null;
}
```

#### 2. Zaktualizować `apps/web/src/lib/api-client.ts`

```typescript
import { getErrorMessage } from './error-messages';

// ... istniejący kod ...

// W interceptorze błędów:
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const friendlyMessage = getErrorMessage(error);

    // Możesz dodać error do error lub zachować oryginalny
    error.userMessage = friendlyMessage;

    return Promise.reject(error);
  }
);
```

#### 3. Zaktualizować hooki mutacji (przykład)

```typescript
// apps/web/src/features/deliveries/hooks/useDeliveryMutations.ts
import { getErrorMessage, getErrorAction } from '@/lib/error-messages';

const createDeliveryMutation = useMutation({
  mutationFn: createDelivery,
  onError: (error) => {
    const message = getErrorMessage(error);
    const action = getErrorAction(error);

    toast({
      title: 'Błąd tworzenia dostawy',
      description: message,
      variant: 'destructive',
      action: action ? { label: action } : undefined
    });
  },
  onSuccess: () => {
    toast({
      title: 'Sukces',
      description: 'Dostawa została utworzona'
    });
  }
});
```

### Testowanie
- [ ] Symuluj błąd 500 - powinien pokazać "Błąd serwera..."
- [ ] Symuluj brak sieci - powinien pokazać "Brak połączenia..."
- [ ] Symuluj 409 conflict - powinien pokazać "Ta operacja koliduje..."

### Oczekiwany Rezultat
✅ Wszystkie błędy pokazują zrozumiałe komunikaty PL
✅ Użytkownik wie co zrobić (action suggestions)
✅ -30% pytań do supportu związanych z błędami

---

## Quick Win #2: ARIA Labels - Podstawowe (6h)

### Problem
Formularze i interaktywne elementy nie mają ARIA labels → WCAG Level A failure, screen readers nie działają.

### Rozwiązanie
Dodać podstawowe ARIA attributes do wszystkich interaktywnych elementów.

### Implementacja

#### 1. Utworzyć komponent wrapper `apps/web/src/components/ui/form-field.tsx`

```typescript
'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactElement;
  className?: string;
}

export function FormField({
  id,
  label,
  error,
  required,
  hint,
  children,
  className
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  // Clone child element i dodaj ARIA attributes
  const childWithAria = React.cloneElement(children, {
    id,
    'aria-invalid': !!error,
    'aria-describedby': cn(
      error ? errorId : undefined,
      hint ? hintId : undefined
    ),
    'aria-required': required
  });

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="wymagane">*</span>}
      </Label>

      {hint && (
        <p id={hintId} className="text-sm text-slate-500">
          {hint}
        </p>
      )}

      {childWithAria}

      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

#### 2. Zaktualizować formularze - przykład `DostawyPageContent.tsx`

**PRZED:**
```typescript
<input
  type="text"
  className="w-full border..."
  placeholder="Numer dostawy"
/>
```

**PO:**
```typescript
<FormField
  id="delivery-number"
  label="Numer dostawy"
  required
  error={errors.deliveryNumber}
  hint="Format: D-XXXX lub dowolny"
>
  <Input
    type="text"
    placeholder="np. D-2024-001"
  />
</FormField>
```

#### 3. Dodać ARIA labels do buttonów bez tekstu

**Lokalizacja:** Wszystkie komponenty z icon-only buttons

```typescript
// ❌ ZŁE
<button onClick={handleDelete}>
  <TrashIcon />
</button>

// ✅ DOBRE
<button
  onClick={handleDelete}
  aria-label="Usuń dostawę"
>
  <TrashIcon aria-hidden="true" />
</button>
```

#### 4. Dodać role i labels do głównych sekcji

**Lokalizacja:** `apps/web/src/components/layout/sidebar.tsx`

```typescript
<nav aria-label="Nawigacja główna" role="navigation">
  <ul role="menu">
    {navigationItems.map((item) => (
      <li key={item.href} role="menuitem">
        <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
          {item.name}
        </Link>
      </li>
    ))}
  </ul>
</nav>
```

**Lokalizacja:** `apps/web/src/components/layout/header.tsx`

```typescript
<header role="banner">
  <h1 className="sr-only">AKROBUD - System zarządzania produkcją</h1>
  {/* visible content */}
</header>

<main role="main" aria-label="Główna zawartość">
  {children}
</main>
```

### Pliki do Aktualizacji (Priority Order)

1. **FormField component** - nowy plik (1h)
2. **DostawyPageContent.tsx** - dialog nowej dostawy (1h)
3. **Sidebar.tsx** - navigation ARIA (30min)
4. **Header.tsx** - landmark roles (30min)
5. **Button components** - icon-only buttons (1h)
6. **Dialogs** - wszystkie modal dialogs (2h)

### Testowanie
- [ ] Użyj NVDA/JAWS screen reader - wszystkie pola powinny być ogłaszane
- [ ] Tab navigation - focus visible na wszystkich elementach
- [ ] Sprawdź z axe DevTools - brak critical a11y issues

### Oczekiwany Rezultat
✅ WCAG Level A compliance dla formularzy
✅ Screen readers działają poprawnie
✅ +50% dostępności aplikacji

---

## Quick Win #3: Required Field Indicators - Spójność (2h)

### Problem
Niektóre formularze mają `*` przy wymaganych polach, inne nie. Użytkownik nie wie co jest required.

### Rozwiązanie
Automatyczne `*` w komponencie FormField (już zaimplementowane w Quick Win #2).

### Implementacja

#### 1. FormField już obsługuje `required` prop

```typescript
<FormField
  id="delivery-number"
  label="Numer dostawy"
  required  // ← automatycznie doda *
>
  <Input />
</FormField>
```

#### 2. Dodać CSS dla lepszej widoczności

**Lokalizacja:** `apps/web/src/app/globals.css`

```css
/* Required field indicator */
.form-field-required::after {
  content: '*';
  color: rgb(239 68 68); /* red-500 */
  margin-left: 0.25rem;
  font-weight: 600;
}

/* Focus ring dla better visibility */
*:focus-visible {
  @apply outline-2 outline-offset-2 outline-blue-600 ring-2 ring-blue-600;
}
```

#### 3. Audit wszystkich formularzy

**Lista formularzy do sprawdzenia:**
- [ ] Nowa dostawa dialog (DostawyPageContent.tsx)
- [ ] Edycja zlecenia (OrderDetailModal.tsx)
- [ ] Import szyb (GlassOrderImportSection.tsx)
- [ ] Ustawienia (GeneralSettingsTab.tsx)
- [ ] Nowy profil (warehouse forms)

### Oczekiwany Rezultat
✅ 100% spójność required fields
✅ Użytkownik zawsze wie co jest wymagane
✅ -20% błędów walidacji formularzy

---

## Quick Win #4: Focus Indicators - Widoczność (2h)

### Problem
Default browser focus outline jest słabo widoczny, użytkownicy keyboard navigation gubią focus.

### Rozwiązanie
Custom focus styles z wysokim kontrastem.

### Implementacja

#### 1. Zaktualizować `tailwind.config.js`

```javascript
module.exports = {
  theme: {
    extend: {
      ringWidth: {
        3: '3px',
      },
      ringOffsetWidth: {
        3: '3px',
      }
    }
  },
  plugins: [
    // Dodać custom focus-visible styles
    function({ addBase }) {
      addBase({
        '*:focus-visible': {
          outline: '2px solid rgb(37 99 235)', // blue-600
          outlineOffset: '2px',
          borderRadius: '2px'
        }
      })
    }
  ]
}
```

#### 2. Zaktualizować `globals.css`

```css
/* High contrast focus indicators */
*:focus-visible {
  outline: 2px solid rgb(37 99 235); /* blue-600 */
  outline-offset: 2px;
  border-radius: 2px;
}

/* Special focus for buttons */
button:focus-visible {
  outline: 3px solid rgb(37 99 235);
  outline-offset: 3px;
}

/* Special focus for inputs */
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid rgb(37 99 235);
  outline-offset: 0;
  border-color: rgb(37 99 235);
}

/* Skip to main content link (accessibility best practice) */
.skip-to-main {
  position: absolute;
  left: -9999px;
  z-index: 999;
  padding: 1rem;
  background: white;
  color: rgb(37 99 235);
  text-decoration: none;
  border: 2px solid rgb(37 99 235);
}

.skip-to-main:focus {
  left: 1rem;
  top: 1rem;
}
```

#### 3. Dodać "Skip to main content" link

**Lokalizacja:** `apps/web/src/app/layout.tsx`

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <a href="#main-content" className="skip-to-main">
          Przejdź do głównej treści
        </a>

        <Providers>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Header />
              <main id="main-content" className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
```

### Testowanie
- [ ] Tab przez całą stronę - focus zawsze widoczny
- [ ] Sprawdź kontrast (min 3:1 ratio)
- [ ] Test z keyboard-only navigation

### Oczekiwany Rezultat
✅ Focus zawsze widoczny
✅ WCAG 2.4.7 Focus Visible - compliance
✅ +100% usability dla keyboard users

---

## Quick Win #5: Komunikaty Toast - Po Polsku (2h)

### Problem
Niektóre toasty są po angielsku: "Success", "Error", "Created".

### Rozwiązanie
Audit wszystkich toast messages i zamiana na polski.

### Implementacja

#### 1. Utworzyć helper `apps/web/src/lib/toast-messages.ts`

```typescript
/**
 * Standardowe komunikaty toast po polsku
 */

export const TOAST_MESSAGES = {
  // Generic success
  created: (item: string) => `${item} został utworzony`,
  updated: (item: string) => `${item} został zaktualizowany`,
  deleted: (item: string) => `${item} został usunięty`,

  // Specific entities
  delivery: {
    created: 'Dostawa została utworzona',
    updated: 'Dostawa została zaktualizowana',
    deleted: 'Dostawa została usunięta',
    assigned: 'Zlecenia zostały przypisane do dostawy'
  },

  order: {
    created: 'Zlecenie zostało utworzone',
    updated: 'Zlecenie zostało zaktualizowane',
    deleted: 'Zlecenie zostało usunięte',
    archived: 'Zlecenie zostało zarchiwizowane'
  },

  warehouse: {
    stockUpdated: 'Stan magazynowy został zaktualizowany',
    orderPlaced: 'Zamówienie zostało złożone',
    deliveryReceived: 'Dostawa została przyjęta'
  },

  import: {
    started: 'Import został rozpoczęty',
    completed: 'Import zakończony pomyślnie',
    failed: 'Import zakończony błędem',
    conflicts: (count: number) => `Znaleziono ${count} konfliktów`
  },

  // Generic errors
  error: {
    generic: 'Wystąpił błąd',
    network: 'Błąd połączenia z serwerem',
    validation: 'Dane nie przeszły walidacji',
    permission: 'Brak uprawnień do wykonania operacji'
  }
} as const;

/**
 * Helper do tworzenia toast messages
 */
export function createToastMessage(
  category: keyof typeof TOAST_MESSAGES,
  action: string,
  customData?: Record<string, any>
): string {
  const categoryMessages = TOAST_MESSAGES[category];

  if (typeof categoryMessages === 'object' && action in categoryMessages) {
    const message = categoryMessages[action as keyof typeof categoryMessages];

    if (typeof message === 'function') {
      return message(customData);
    }

    return message as string;
  }

  return `Operacja wykonana pomyślnie`;
}
```

#### 2. Zaktualizować mutation hooks

**Przykład:** `apps/web/src/features/deliveries/hooks/useDeliveryMutations.ts`

```typescript
import { TOAST_MESSAGES } from '@/lib/toast-messages';

const createDeliveryMutation = useMutation({
  mutationFn: createDelivery,
  onSuccess: () => {
    toast({
      title: 'Sukces',
      description: TOAST_MESSAGES.delivery.created
    });
    queryClient.invalidateQueries({ queryKey: ['deliveries'] });
  },
  onError: (error) => {
    const message = getErrorMessage(error);
    toast({
      title: 'Błąd',
      description: message,
      variant: 'destructive'
    });
  }
});

const deleteDeliveryMutation = useMutation({
  mutationFn: deleteDelivery,
  onSuccess: () => {
    toast({
      title: 'Sukces',
      description: TOAST_MESSAGES.delivery.deleted
    });
  }
});
```

#### 3. Audit wszystkich toast calls

**Skrypt do znalezienia wszystkich toastów:**

```bash
cd apps/web
grep -r "toast({" src/ --include="*.tsx" --include="*.ts" | grep -i "success\|error\|created\|updated\|deleted"
```

**Lista plików do sprawdzenia:**
- [ ] useDeliveryMutations.ts
- [ ] useOrderMutations.ts
- [ ] useWarehouseMutations.ts
- [ ] useGlassMutations.ts
- [ ] useImportMutations.ts
- [ ] useSettingsMutations.ts

### Oczekiwany Rezultat
✅ 100% komunikatów po polsku
✅ Spójność komunikatów
✅ Profesjonalny wygląd aplikacji

---

## Quick Win #6: Keyboard Navigation - Sidebar (4h)

### Problem
Sidebar nie wspiera Arrow keys, Enter, Escape. Tylko Tab działa.

### Rozwiązanie
Dodać keyboard handlers do sidebar navigation.

### Implementacja

**Lokalizacja:** `apps/web/src/components/layout/sidebar.tsx`

```typescript
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const menuRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const flatNavigationItems = useMemo(() => {
    // Spłaszcz navigationItems do listy (włączając subitems gdy expanded)
    const flat: { href: string; name: string; level: number }[] = [];

    navigationItems.forEach(item => {
      flat.push({ href: item.href, name: item.name, level: 0 });

      if (item.subItems && expandedItems.includes(item.href)) {
        item.subItems.forEach(subItem => {
          flat.push({ href: subItem.href, name: subItem.name, level: 1 });
        });
      }
    });

    return flat;
  }, [expandedItems]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = Math.min(focusedIndex + 1, flatNavigationItems.length - 1);
        setFocusedIndex(nextIndex);
        menuRefs.current[nextIndex]?.focus();
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = Math.max(focusedIndex - 1, 0);
        setFocusedIndex(prevIndex);
        menuRefs.current[prevIndex]?.focus();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        const item = flatNavigationItems[index];

        // Sprawdź czy to parent z subItems
        const parentItem = navigationItems.find(nav => nav.href === item.href);
        if (parentItem?.subItems) {
          // Toggle expand
          setExpandedItems(prev =>
            prev.includes(item.href)
              ? prev.filter(h => h !== item.href)
              : [...prev, item.href]
          );
        } else {
          // Navigate
          router.push(item.href);
        }
        break;

      case 'Escape':
        e.preventDefault();
        // Close all expanded items
        setExpandedItems([]);
        break;

      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        menuRefs.current[0]?.focus();
        break;

      case 'End':
        e.preventDefault();
        const lastIndex = flatNavigationItems.length - 1;
        setFocusedIndex(lastIndex);
        menuRefs.current[lastIndex]?.focus();
        break;
    }
  }, [focusedIndex, flatNavigationItems, navigationItems, router]);

  return (
    <nav
      className="w-64 bg-white border-r"
      aria-label="Nawigacja główna"
      role="navigation"
    >
      <ul role="menu" className="py-4">
        {flatNavigationItems.map((item, index) => (
          <li key={item.href} role="menuitem">
            <a
              ref={el => menuRefs.current[index] = el}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                handleKeyDown({ key: 'Enter', preventDefault: () => {} } as any, index);
              }}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'flex items-center px-4 py-2',
                item.level === 1 && 'pl-8',
                pathname === item.href && 'bg-blue-50 text-blue-600'
              )}
              tabIndex={index === focusedIndex ? 0 : -1}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### Testowanie
- [ ] Arrow Down/Up - nawigacja między items
- [ ] Enter - aktywuje link lub toggle submenu
- [ ] Space - tak samo jak Enter
- [ ] Escape - zamyka wszystkie submenus
- [ ] Home/End - jump do początku/końca
- [ ] Tab - działa normalnie

### Oczekiwany Rezultat
✅ Pełna keyboard navigation
✅ WCAG 2.1.1 Keyboard compliance
✅ +200% productivity dla power users

---

## Harmonogram Implementacji

### Dzień 1 (8h)
**Rano (4h):**
- [ ] Quick Win #1: Error Messages (4h)
  - Utworzyć error-messages.ts
  - Zaktualizować api-client.ts
  - Zaktualizować 3 główne mutation hooks (deliveries, orders, warehouse)
  - Testowanie

**Popołudnie (4h):**
- [ ] Quick Win #2: ARIA Labels - Część 1 (4h)
  - Utworzyć FormField component
  - Zaktualizować DostawyPageContent dialog
  - Zaktualizować Sidebar navigation
  - Testowanie

### Dzień 2 (8h)
**Rano (4h):**
- [ ] Quick Win #2: ARIA Labels - Część 2 (2h)
  - Zaktualizować Header
  - Zaktualizować icon-only buttons
  - Zaktualizować 2 główne dialogs

- [ ] Quick Win #3: Required Field Indicators (2h)
  - Audit wszystkich formularzy
  - Dodać required prop gdzie trzeba
  - Testowanie

**Popołudnie (4h):**
- [ ] Quick Win #4: Focus Indicators (2h)
  - Zaktualizować tailwind.config
  - Zaktualizować globals.css
  - Dodać skip-to-main link
  - Testowanie

- [ ] Quick Win #5: Toast Messages PL (2h)
  - Utworzyć toast-messages.ts
  - Audit wszystkich toast calls
  - Zamienić na polski
  - Testowanie

### Dzień 3 (2h) - Finalizacja
- [ ] Quick Win #6: Keyboard Navigation Sidebar (4h)
  - Zaimplementować keyboard handlers
  - Testowanie z keyboard-only
  - Final testing całości

**Optional jeśli zostanie czas:**
- [ ] Accessibility audit z axe DevTools
- [ ] Screen reader testing (NVDA)
- [ ] Dokumentacja zmian

---

## Testowanie Końcowe

### Checklist Przed Wdrożeniem

**Funkcjonalność:**
- [ ] Wszystkie błędy API pokazują przyjazne komunikaty PL
- [ ] Wszystkie formularze mają ARIA labels
- [ ] Required fields mają * indicator
- [ ] Focus jest zawsze widoczny
- [ ] Wszystkie toasty po polsku
- [ ] Keyboard navigation w sidebar działa

**Accessibility:**
- [ ] axe DevTools: 0 critical issues
- [ ] NVDA screen reader: wszystkie elementy ogłaszane
- [ ] Keyboard-only navigation: wszystko dostępne
- [ ] Color contrast: min 4.5:1

**Performance:**
- [ ] Brak regresji performance (sprawdź Lighthouse)
- [ ] Bundle size: +/- 5KB max

**Browser Testing:**
- [ ] Chrome - działa ✅
- [ ] Firefox - działa ✅
- [ ] Edge - działa ✅

---

## Metryki Sukcesu

### Przed Quick Wins
- Accessibility score: ~40/100
- User error rate: wysoki
- Support tickets (errors): ~15/tydzień
- Keyboard navigation: 30%

### Po Quick Wins (Target)
- Accessibility score: **70+/100** (+75%)
- User error rate: **-40%**
- Support tickets (errors): **-50%** (~7/tydzień)
- Keyboard navigation: **90%**

### ROI
- **Czas implementacji:** 18h (2.5 dnia)
- **Oszczędność support:** ~4h/tydzień = 16h/miesiąc
- **Break-even:** 1 miesiąc
- **Roczny ROI:** 192h oszczędności

---

## Następne Kroki

Po zakończeniu Quick Wins:

1. **Tydzień 1-2 po wdrożeniu:**
   - Monitoring błędów (Sentry)
   - Zbieranie feedbacku użytkowników
   - Bug fixing jeśli potrzeba

2. **Tydzień 3-4:**
   - Start Phase 2: Decision Colors (6h)
   - Start Phase 2: Mode Toggle (8h)

3. **Miesiąc 2:**
   - Start Phase 3: Business Tooltips (6h)
   - A11y Sprint: pełna WCAG compliance (16h)

---

## Dodatkowe Zasoby

**Dokumentacja:**
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Accessible Form Patterns](https://webaim.org/techniques/forms/)

**Testing Tools:**
- axe DevTools (Chrome extension)
- NVDA Screen Reader (Windows)
- WAVE Accessibility Tool
- Lighthouse (Chrome DevTools)

**Wsparcie:**
- Frontend Dev Guidelines: `.claude/skills/frontend-dev-guidelines/`
- UX Audit: `docs/UX_COMPREHENSIVE_AUDIT_2025-12-31.md`
- Anti-patterns: `docs/guides/anti-patterns.md`

---

**Dokument przygotowany:** 31.12.2025
**Autor:** Claude Code + AKROBUD Team
**Status:** ✅ Ready to implement
