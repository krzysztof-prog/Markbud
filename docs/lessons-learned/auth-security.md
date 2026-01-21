# Lessons Learned - Auth & Security

> Błędy związane z autoryzacją, tokenami i bezpieczeństwem.

---

## 2026-01-15 - API Client nie wysyłał tokenu autoryzacji + niezgodność kluczy tokena

**Co się stało:**
Po restarcie aplikacji wszystkie strony pokazywały błąd "Brak autoryzacji":
- Dashboard, Dashboard Operatora, Moja Praca, Panel Kierownika - wszystkie 401
- Użytkownik był zalogowany (widział strony), ale API odrzucało requesty

**Root cause:**
1. **api-client.ts** miał przestarzały komentarz "No authentication required - single-user system" i NIE wysyłał nagłówka `Authorization: Bearer <token>` w requestach HTTP
2. **Niezgodność kluczy tokena** - dwa różne klucze w localStorage:
   - `AuthContext.tsx` zapisywał token pod kluczem `'auth_token'`
   - `auth-token.ts` szukał tokena pod kluczem `'akrobud_auth_token'`
   - `api-client.ts` używał `'auth_token'`
3. **stockHandler.ts** miał lokalną definicję `AuthenticatedRequest` z `user.id` zamiast `user.userId` (niezgodność z middleware auth)

**Impact:**
- **Krytyczny:** Wszystkie strony wymagające autoryzacji nie działały
- Użytkownik widział tylko błędy "Brak autoryzacji" mimo że był zalogowany
- Aplikacja była praktycznie niefunkcjonalna

**Fix:**
1. **api-client.ts** - Dodano token autoryzacji do wszystkich funkcji:
```typescript
const TOKEN_KEY = 'auth_token';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

// W fetchApi, uploadFile, fetchBlob, checkExists:
const token = getAuthToken();
const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
```

2. **auth-token.ts** - Zmieniono klucz na spójny:
```typescript
// Przed: const TOKEN_STORAGE_KEY = 'akrobud_auth_token';
const TOKEN_STORAGE_KEY = 'auth_token'; // Teraz zgodny z AuthContext
```

3. **stockHandler.ts** - Użyto globalnego typu z middleware:
```typescript
// Usunięto lokalną definicję, zaimportowano z middleware/auth.js
import type { AuthenticatedRequest } from '../../middleware/auth.js';
// + konwersja userId: string | number → number
```

**Prevention:**
1. **Jeden klucz tokena** - zawsze używaj stałej z centralnego miejsca (np. constants.ts)
2. **Token w API client** - ZAWSZE dodawaj nagłówek Authorization jeśli system wymaga auth
3. **Nie duplikuj typów** - importuj `AuthenticatedRequest` z middleware, nie definiuj lokalnie
4. **Testuj po wylogowaniu/zalogowaniu** - sprawdź czy tokeny są poprawnie wysyłane
5. **Grep po hardcodowanych kluczach** - `git grep "auth_token\|akrobud_auth"` znajdzie niespójności

**Lekcja:** Gdy widzisz 401 na wielu stronach mimo zalogowania - sprawdź czy API client wysyła token. Nigdy nie duplikuj kluczy localStorage - użyj centralnej stałej.

---

[Powrót do indeksu](../../LESSONS_LEARNED.md)
