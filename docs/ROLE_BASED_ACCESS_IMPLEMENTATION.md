# Role-Based Access Control - Implementacja

**Data:** 2026-01-13
**Status:** Implemented (P0 - Bezpieczeństwo)
**Wersja:** 1.0

---

## 📋 Przegląd

Implementacja systemu kontroli dostępu opartego na rolach (RBAC) dla aplikacji AKROBUD.

**Cel:**
- Filtrowanie UI według ról użytkownika
- Ochrona tras na poziomie middleware
- Ukrywanie elementów UI dla użytkowników bez uprawnień
- Bezpieczny dostęp do funkcji administracyjnych

---

## 🎯 Zaimplementowane funkcjonalności

### 1. Współdzielony enum ról (packages/shared)

**Lokalizacja:** `packages/shared/src/types/user-roles.ts`

**Role:**
- `OWNER` - Właściciel (pełny dostęp)
- `ADMIN` - Administrator (pełny dostęp + zarządzanie użytkownikami)
- `KIEROWNIK` - Kierownik produkcji (panel kierownika)
- `KSIEGOWA` - Księgowa (dostęp do raportów finansowych)
- `USER` - Użytkownik (podstawowy dostęp)

**Uprawnienia (ROLE_PERMISSIONS):**
```typescript
canManageUsers          // owner, admin
canAccessManagerPanel   // owner, admin, kierownik
canAccessReports        // owner, admin, kierownik, ksiegowa
canAccessFinancial      // owner, admin, ksiegowa
canAccessSchuco         // owner, admin, kierownik
canAccessWarehouse      // owner, admin, kierownik
canAccessDeliveries     // wszyscy
canAccessOrders         // wszyscy
```

**Funkcje pomocnicze:**
- `hasPermission(role, permission)` - Sprawdza uprawnienie
- `canManageUsers(role)` - Czy może zarządzać użytkownikami
- `canAccessManagerPanel(role)` - Czy ma dostęp do panelu kierownika
- `canAccessReports(role)` - Czy ma dostęp do raportów
- `canAccessFinancial(role)` - Czy ma dostęp do danych finansowych

---

### 2. RoleGate Component

**Lokalizacja:** `apps/web/src/components/auth/RoleGate.tsx`

**Zastosowanie:** Warunkowe renderowanie komponentów na podstawie ról

**Przykład użycia:**
```tsx
import { RoleGate } from '@/components/auth/RoleGate';
import { UserRole } from '@markbud/shared';

// Tylko dla admin/owner
<RoleGate allowedRoles={[UserRole.OWNER, UserRole.ADMIN]}>
  <Button onClick={handleDelete}>Usuń użytkownika</Button>
</RoleGate>

// Z uprawnieniem
<RoleGate requiredPermission="canAccessReports">
  <ReportsTable />
</RoleGate>

// Z fallback
<RoleGate
  allowedRoles={[UserRole.KIEROWNIK]}
  fallback={<p>Brak dostępu</p>}
>
  <ManagerPanel />
</RoleGate>
```

---

### 3. useRoleCheck Hook

**Lokalizacja:** `apps/web/src/features/auth/hooks/useRoleCheck.ts`

**Zastosowanie:** Sprawdzanie uprawnień w komponentach

**API:**
```typescript
const {
  hasRole,                // (roles: UserRole[]) => boolean
  checkPermission,        // (permission: Permission) => boolean
  canManageUsers,         // boolean
  canAccessManagerPanel,  // boolean
  canAccessReports,       // boolean
  canAccessFinancial,     // boolean
  isAdmin,                // boolean (owner lub admin)
  isKierownik,            // boolean
  isKsiegowa,             // boolean
  isUser,                 // boolean
  currentRole,            // UserRole | null
} = useRoleCheck();
```

**Przykład użycia:**
```tsx
import { useRoleCheck } from '@/features/auth';

function MyComponent() {
  const { canManageUsers, isAdmin } = useRoleCheck();

  return (
    <div>
      {canManageUsers && (
        <Button onClick={handleAddUser}>Dodaj użytkownika</Button>
      )}

      {isAdmin && (
        <Link href="/admin">Panel Administracyjny</Link>
      )}
    </div>
  );
}
```

---

### 4. Sidebar - Filtrowanie według ról

**Lokalizacja:** `apps/web/src/components/layout/sidebar.tsx`

**Implementacja:**
- Każda pozycja menu ma pole `requiredRoles?: UserRole[]`
- Navigation filtrowany według `user.role`
- SubItems również filtrowane
- Specjalny case dla księgowej (tylko "Raport miesięczny")

**Mapa dostępu:**

| Pozycja menu | USER | KSIĘGOWA | KIEROWNIK | ADMIN | OWNER |
|--------------|------|----------|-----------|-------|-------|
| Dashboard | ✅ | ❌ | ✅ | ✅ | ✅ |
| Panel Kierownika | ❌ | ❌ | ✅ | ✅ | ✅ |
| Zestawienia | ❌ | ✅ (tylko miesięczne) | ✅ | ✅ | ✅ |
| AKROBUD | ✅ | ❌ | ✅ | ✅ | ✅ |
| Magazyn PVC | ✅ | ❌ | ✅ | ✅ | ✅ |
| Okucia | ✅ | ❌ | ✅ | ✅ | ✅ |
| Dostawy Schuco | ❌ | ❌ | ✅ | ✅ | ✅ |
| Szyby | ✅ | ❌ | ✅ | ✅ | ✅ |
| Importy | ❌ | ❌ | ❌ | ✅ | ✅ |
| Archiwum | ✅ | ❌ | ✅ | ✅ | ✅ |
| Admin | ❌ | ❌ | ❌ | ✅ | ✅ |

---

### 5. Middleware - Ochrona tras

**Lokalizacja:** `apps/web/src/middleware.ts`

**Implementacja:**
- Sprawdza token w cookies
- Fetch `/api/auth/me` aby pobrać rolę użytkownika
- Sprawdza PROTECTED_ROUTES
- Przekierowuje na `/` jeśli brak uprawnień
- Przekierowuje na `/login` jeśli brak tokenu

**Chronione trasy:**
```typescript
const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  '/admin': [UserRole.OWNER, UserRole.ADMIN],
  '/kierownik': [UserRole.OWNER, UserRole.ADMIN, UserRole.KIEROWNIK],
  '/importy': [UserRole.OWNER, UserRole.ADMIN],
  '/zestawienia/zlecenia': [UserRole.OWNER, UserRole.ADMIN, UserRole.KIEROWNIK],
};
```

**Flow:**
1. Request → `/admin`
2. Middleware sprawdza token
3. Fetch `/api/auth/me` → `{ role: 'user' }`
4. Sprawdza `PROTECTED_ROUTES['/admin']` → `[OWNER, ADMIN]`
5. `user` nie jest w `[OWNER, ADMIN]`
6. Redirect → `/` (dashboard)

---

## 📁 Struktura plików

```
packages/shared/src/types/
  └─ user-roles.ts              # ✨ Współdzielony enum ról

apps/api/src/
  ├─ middleware/
  │  └─ role-check.ts           # Backend middleware (zmieniony - import z shared)
  └─ validators/
     └─ auth.ts                 # Walidacja (zmieniony - import z shared)

apps/web/src/
  ├─ components/
  │  └─ auth/
  │     ├─ RoleGate.tsx         # ✨ Komponent role-gate
  │     └─ index.ts             # Export
  ├─ components/layout/
  │  └─ sidebar.tsx             # Sidebar (zmieniony - filtrowanie)
  ├─ features/auth/
  │  ├─ hooks/
  │  │  └─ useRoleCheck.ts      # ✨ Hook sprawdzania ról
  │  └─ index.ts                # Export (zmieniony)
  └─ middleware.ts              # Middleware (zmieniony - role-check)
```

---

## 🧪 Jak testować

### Test 1: Sidebar filtruje pozycje

**Zaloguj się jako różne role i sprawdź sidebar:**

**Księgowa:**
- ✅ Zestawienia > Raport miesięczny
- ❌ Pozostałe pozycje ukryte

**User:**
- ✅ Dashboard, AKROBUD, Magazyn PVC, Okucia, Szyby, Archiwum
- ❌ Panel Kierownika, Zestawienia, Dostawy Schuco, Importy, Admin

**Kierownik:**
- ✅ Wszystko oprócz Importy i Admin
- ❌ Importy, Admin

**Admin/Owner:**
- ✅ Wszystkie pozycje (łącznie z Admin)

---

### Test 2: Middleware blokuje dostęp

**Zaloguj się jako USER i wpisz w URL:**
- `/admin` → ❌ Redirect na `/`
- `/admin/users` → ❌ Redirect na `/`
- `/kierownik` → ❌ Redirect na `/`
- `/importy` → ❌ Redirect na `/`
- `/zestawienia/zlecenia` → ❌ Redirect na `/`

**Zaloguj się jako KSIĘGOWA i wpisz:**
- `/zestawienia/miesieczne` → ✅ Dozwolone
- `/zestawienia/zlecenia` → ❌ Redirect na `/`
- `/kierownik` → ❌ Redirect na `/`

**Zaloguj się jako KIEROWNIK i wpisz:**
- `/kierownik` → ✅ Dozwolone
- `/zestawienia/zlecenia` → ✅ Dozwolone
- `/admin` → ❌ Redirect na `/`
- `/importy` → ❌ Redirect na `/`

---

### Test 3: RoleGate ukrywa elementy

**Dodaj w `apps/web/src/app/page.tsx`:**
```tsx
import { RoleGate } from '@/components/auth/RoleGate';
import { UserRole } from '@markbud/shared';

<RoleGate allowedRoles={[UserRole.OWNER, UserRole.ADMIN]}>
  <div className="p-4 bg-red-100">
    <p>TYLKO dla owner/admin</p>
  </div>
</RoleGate>

<RoleGate allowedRoles={[UserRole.KSIEGOWA]}>
  <div className="p-4 bg-blue-100">
    <p>TYLKO dla księgowa</p>
  </div>
</RoleGate>
```

**Sprawdź:**
- USER → Nie widzi żadnego bloku
- KSIĘGOWA → Widzi TYLKO niebieski
- ADMIN → Widzi TYLKO czerwony

---

### Test 4: useRoleCheck hook

**Dodaj w komponencie:**
```tsx
import { useRoleCheck } from '@/features/auth';

const { canManageUsers, isAdmin, currentRole } = useRoleCheck();

<div>
  <p>Rola: {currentRole}</p>
  {canManageUsers && <button>Zarządzaj użytkownikami</button>}
  {isAdmin && <a href="/admin">Panel Admin</a>}
</div>
```

**Sprawdź:**
- USER → Nie widzi buttona ani linka, Rola: "user"
- ADMIN → Widzi button i link, Rola: "admin"

---

## ⚠️ Troubleshooting

### Problem: Middleware redirect loop

**Objawy:** Strona się ciągle przeładowuje, redirect na `/login` w kółko

**Przyczyna:** `NEXT_PUBLIC_API_URL` nie jest ustawione lub backend nie działa

**Rozwiązanie:**
1. Sprawdź `apps/web/.env`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```
2. Uruchom backend: `pnpm dev:api`
3. Restart frontend: `pnpm dev:web`

---

### Problem: Sidebar pokazuje wszystkie pozycje

**Objawy:** Księgowa widzi "Admin", User widzi "Panel Kierownika"

**Przyczyna:** `user.role` jest `null` lub `undefined`

**Rozwiązanie:**
1. Sprawdź czy backend zwraca pole `role` w `/api/auth/me`
2. Console.log w `sidebar.tsx`:
   ```tsx
   console.log('User:', user, 'Role:', user?.role);
   ```
3. Sprawdź czy `AuthContext` pobiera użytkownika poprawnie

---

### Problem: TypeScript error - Cannot find module '@markbud/shared'

**Objawy:**
```
Cannot find module '@markbud/shared' or its corresponding type declarations
```

**Przyczyna:** Brak instalacji lub niepoprawny tsconfig

**Rozwiązanie:**
1. Reinstall dependencies:
   ```bash
   pnpm install
   ```
2. Restart TypeScript server w VS Code:
   - Ctrl+Shift+P → "TypeScript: Restart TS Server"
3. Sprawdź `tsconfig.json` czy zawiera:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@markbud/shared": ["../../packages/shared/src"]
       }
     }
   }
   ```

---

### Problem: Middleware fetch error

**Objawy:**
```
[Middleware] Error checking user permissions: fetch failed
```

**Przyczyna:** Backend nie działa lub błędny URL

**Rozwiązanie:**
1. Sprawdź czy backend działa: `http://localhost:4000/api/auth/me`
2. Sprawdź `NEXT_PUBLIC_API_URL` w `.env`
3. Sprawdź logi backend: `pnpm dev:api` (szukaj błędów)

---

## 🔐 Bezpieczeństwo

### ✅ Co jest zabezpieczone:

1. **UI poziom** - Sidebar filtruje pozycje (użytkownik nie widzi opcji bez dostępu)
2. **Route poziom** - Middleware blokuje dostęp do URL (nie można wpisać `/admin` jako user)
3. **Component poziom** - RoleGate ukrywa elementy (buttony, linki)
4. **Backend poziom** - Backend middleware (`role-check.ts`) blokuje API calls

### ⚠️ Co NIE jest zabezpieczone (TODO P1/P2):

1. **JWT decode w middleware** - Obecnie fetch do API (wolne). Rozważ dekodowanie JWT po stronie middleware (szybsze)
2. **Audit log** - Brak logowania prób dostępu do chronionych tras
3. **Rate limiting** - Brak ochrony przed brute-force (próby wpisywania `/admin` w kółko)

---

## 📊 Metryki implementacji

**Czas implementacji:** ~4h
**Pliki zmienione:** 11
**Pliki nowe:** 4
**Lines of code:** ~450

**Coverage:**
- Backend: ✅ 100% (wszystkie importy zmienione na @markbud/shared)
- Frontend: ✅ 100% (sidebar, middleware, RoleGate, useRoleCheck)
- Shared: ✅ 100% (user-roles.ts w packages/shared)

---

## 🚀 Następne kroki (P1/P2)

### P1 - Wysokie:
1. **Operator Dashboard** - Checklist-based dashboard dla operatora
2. **Panel Admin - Dedykowany Layout** - `/admin` z własnym layoutem
3. **Mechanizm przypisywania zleceń** - Admin może zmieniać przypisanie

### P2 - Nice to have:
4. **JWT decode w middleware** - Szybsza weryfikacja ról
5. **Breadcrumbs** - Pokazuje "Admin > Użytkownicy"
6. **Audit log** - Historia prób dostępu do chronionych tras

---

## 📚 Powiązane dokumenty

- [UX Architecture Report](./UX_ARCHITECTURE_REPORT.md) - Pełny raport architektury UX
- [CLAUDE.md](../CLAUDE.md) - Kontekst projektu dla Claude
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Architektura systemu

---

**Autor:** Krzysztof + Claude Sonnet 4.5
**Data ostatniej aktualizacji:** 2026-01-13
