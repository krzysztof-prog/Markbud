# Moduł Auth - Autentykacja

## Przegląd

Moduł autentykacji zarządza logowaniem, wylogowywaniem i weryfikacją sesji użytkowników. Używa tokenów JWT do autoryzacji.

---

## Flow Logowania

```
1. Użytkownik wchodzi na /login
2. Wpisuje email i hasło
3. System weryfikuje dane (bcrypt)
4. Generuje token JWT (ważny 30 dni)
5. Token zapisywany w localStorage + cookies
6. Przekierowanie na stronę główną
```

---

## Funkcjonalności

### 1. Logowanie

**Strona:** `/login`

- Formularz: email + hasło
- Walidacja po stronie klienta i serwera
- Komunikaty błędów w toast

### 2. Wylogowanie

- Usunięcie tokenu z localStorage i cookies
- Wywołanie endpointu `/api/auth/logout`
- Przekierowanie na `/login`

### 3. Weryfikacja Sesji

Przy starcie aplikacji:
1. Sprawdzenie czy token istnieje
2. Walidacja tokenu przez `/api/auth/me`
3. Jeśli ważny → załadowanie danych użytkownika
4. Jeśli nieważny → przekierowanie na login

---

## API Endpointy

```
POST  /api/auth/login    - Logowanie
POST  /api/auth/logout   - Wylogowanie
GET   /api/auth/me       - Pobierz dane zalogowanego użytkownika
```

### Request: Login

```json
{
  "email": "user@example.com",
  "password": "haslo123"
}
```

### Response: Login

```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Jan Kowalski",
    "role": "kierownik"
  }
}
```

---

## Token JWT

**Konfiguracja:**
- Czas życia: 30 dni (konfigurowalny przez `JWT_EXPIRES_IN`)
- Secret: `JWT_SECRET` z pliku .env
- Przechowywanie: localStorage + cookies

**Payload:**
```json
{
  "userId": 1,
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## Komponenty Frontend

| Komponent | Opis |
|-----------|------|
| `LoginForm` | Formularz logowania |
| `UserMenu` | Menu użytkownika w nagłówku |
| `AuthProvider` | Context provider dla autentykacji |
| `RoleGate` | Warunkowe renderowanie na podstawie ról |

---

## Hooki

### useAuth()
```typescript
const { user, isLoading, isAuthenticated, login, logout } = useAuth();
```

### useRoleCheck()
```typescript
const {
  isAdmin,
  isKierownik,
  canManageUsers,
  canAccessReports,
  hasRole
} = useRoleCheck();
```

---

## Middleware Backend

### withAuth
Weryfikuje token JWT w nagłówku `Authorization: Bearer <token>`

### requireUserManagement
Sprawdza czy użytkownik ma rolę `OWNER` lub `ADMIN`

### requireManagerAccess
Sprawdza czy użytkownik ma rolę `OWNER`, `ADMIN` lub `KIEROWNIK`

---

## Bezpieczeństwo

- Hasła hashowane bcrypt (salt=10)
- Tokeny JWT z czasem wygaśnięcia
- Cookies z SameSite=Lax (ochrona CSRF)
- Logowanie prób dostępu

---

## Konfiguracja (.env)

```env
JWT_SECRET=<losowy_ciag_min_32_znaki>
JWT_EXPIRES_IN=30d
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Pliki

**Frontend:**
- `apps/web/src/features/auth/` - komponenty, context, hooks
- `apps/web/src/app/login/` - strona logowania

**Backend:**
- `apps/api/src/handlers/authHandler.ts`
- `apps/api/src/services/authService.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/utils/jwt.ts`

---

## Zobacz też

- [Panel administracyjny](../admin/overview.md)
- [Dokumentacja ról](../../ROLE_BASED_ACCESS_IMPLEMENTATION.md)