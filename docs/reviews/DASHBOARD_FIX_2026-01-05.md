# Dashboard Fix - 2026-01-05

## 🐛 Problem

Dashboard nie ładował się - pokazywał błąd "Failed to parse JSON" mimo że backend zwracał prawidłowe dane.

### Objawy:
- ❌ Dashboard pokazuje `ErrorUI` z komunikatem o błędzie
- ❌ Network tab: status 200 OK, size 332 B, ale **pusta odpowiedź** w Response tab
- ❌ Backend logi: `"msg":"premature close"` dla wszystkich `/api/dashboard` requestów
- ❌ Problem występował nawet po `localStorage.clear()` i `location.reload()`
- ❌ Curl do backend działał poprawnie (zwracał pełny JSON)

### Backend logi (przed naprawą):
```
{"level":30,"time":1767471100000,"pid":123428,"msg":"premature close"}
[2026-01-05 09:00:38.066 +0100] WARN: JWT token expired
[2026-01-05 09:00:38.066 +0100] WARN: WebSocket connection rejected: Invalid token
```

---

## 🔍 Root Cause Analysis

### 1. **WebSocket Interference (główna przyczyna)**
`useRealtimeSync()` hook próbował nawiązać połączenie WebSocket z **wygasłym JWT tokenem**:

```typescript
// useRealtimeSync.ts (PRZED naprawą)
const token = await getAuthToken(); // Blokował aplikację
if (!token) {
  wsLogger.error('No authentication token available');
  return; // Ale próbował reconnect w nieskończoność
}
```

**Problem:**
- Token JWT wygasał po 24h
- `getAuthToken()` **nie miał timeout** - mógł blokować na zawsze
- WebSocket próbował się łączyć wielokrotnie (MAX_RECONNECT_ATTEMPTS = 10)
- Każda próba robiła HTTP request do `/api/auth/demo-token`
- To powodowało **"premature close"** głównych HTTP requestów do Dashboard

### 2. **React Query Persistence (wtórna przyczyna)**
`PersistQueryClientProvider` cachował złe odpowiedzi:

```typescript
// providers.tsx (PRZED naprawą)
maxAge: 24 * 60 * 60 * 1000, // 24 godziny!
dehydrateOptions: {
  shouldDehydrateQuery: (query) => {
    return query.state.status === 'success'; // Cachował też puste dane!
  }
}
```

**Problem:**
- Gdy Dashboard request się nie udawał (premature close), czasem status był `success` ale data była pusta
- React Query **zapisywał to w localStorage** na 24h
- Przy kolejnych wizytach używał **złego cache** zamiast fetchować z API
- Nawet po `localStorage.clear()` - nowy błędny request był znowu cachowany

---

## ✅ Rozwiązanie

### 1. **Naprawiono WebSocket - Graceful Degradation**

**Plik:** `apps/web/src/hooks/useRealtimeSync.ts`

#### a) Timeout na pobieranie tokenu (linie 158-171):
```typescript
// PRZED:
const token = await getAuthToken(); // Mógł blokować na zawsze

// PO:
const tokenPromise = getAuthToken();
const timeoutPromise = new Promise<null>((resolve) =>
  setTimeout(() => resolve(null), 2000) // Max 2s
);
const token = await Promise.race([tokenPromise, timeoutPromise]);

if (!token) {
  wsLogger.warn('No authentication token available - WebSocket disabled');
  // NIE próbuj reconnect - brak tokenu to nie błąd przejściowy
  reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;
  return;
}
```

**Efekt:** WebSocket nie blokuje aplikacji gdy nie ma tokenu.

#### b) Wykrywanie błędów auth (linie 204-209):
```typescript
wsRef.current.onclose = (event) => {
  // Jeśli zamknięcie było z powodu błędu auth (1008), nie reconnect
  if (event.code === 1008) {
    wsLogger.warn('WebSocket closed due to auth error - not reconnecting');
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;
    return;
  }
  // ... exponential backoff dla innych błędów
};
```

**Efekt:** WebSocket przestaje próbować gdy token jest nieważny.

#### c) Exponential backoff (linie 212-217):
```typescript
// PRZED: Stały interval 3s
reconnectTimeoutRef.current = setTimeout(() => {
  connectRef.current?.();
}, RECONNECT_INTERVAL); // 3000ms

// PO: Exponential backoff
const delay = Math.min(
  RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttemptsRef.current - 1),
  30000 // Max 30s
);
```

**Efekt:** 3s → 4.5s → 6.75s → ... → max 30s (zamiast agresywnego 3s co chwilę)

#### d) Usunięto nachalne toasty (linia 184-185):
```typescript
// PRZED:
showInfoToast('Połączenie', 'Synchronizacja w real-time aktywna');

// PO:
// NIE pokazuj toast - zbyt nachalne, user nie musi wiedzieć o WebSocket
```

---

### 2. **Naprawiono React Query Persistence**

**Plik:** `apps/web/src/app/providers.tsx`

#### Krótszy cache + lepsza walidacja (linie 73-82):
```typescript
// PRZED:
maxAge: 24 * 60 * 60 * 1000, // 24 godziny
dehydrateOptions: {
  shouldDehydrateQuery: (query) => {
    return query.state.status === 'success'; // Cachował też puste dane!
  }
}

// PO:
maxAge: 10 * 60 * 1000, // 10 minut
dehydrateOptions: {
  shouldDehydrateQuery: (query) => {
    // Only persist successful queries without errors
    return (
      query.state.status === 'success' &&
      query.state.data !== null &&
      query.state.data !== undefined
    );
  }
}
```

**Efekty:**
- ✅ Cache wygasa po 10 min (zamiast 24h) - mniejsze ryzyko starych danych
- ✅ Nie cachuje pustych/null/undefined odpowiedzi
- ✅ Tylko prawdziwe sukcesy są persistowane

---

### 3. **Dodano timeout do fetchDemoToken**

**Plik:** `apps/web/src/lib/auth-token.ts`

```typescript
// PRZED:
const response = await fetch(`${API_URL}/api/auth/demo-token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
}); // Mógł blokować na zawsze!

// PO:
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 3000);

const response = await fetch(`${API_URL}/api/auth/demo-token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
  signal: controller.signal, // Timeout po 3s
});

clearTimeout(timeoutId);
```

**Efekt:** Fetch tokenu nie blokuje dłużej niż 3s.

---

## 📊 Rezultat

### ✅ Dashboard działa stabilnie:
- Dashboard ładuje się prawidłowo
- Backend zwraca pełne dane (2234 bajty JSON)
- Frontend parsuje odpowiedź bez błędów
- React Query cache działa poprawnie
- WebSocket nie interferuje z HTTP requests

### ⚠️ Warningi (nieszkodliwe):
```
[2026-01-05 09:00:38.066 +0100] WARN: JWT token expired
[2026-01-05 09:00:38.066 +0100] WARN: WebSocket connection rejected: Invalid token
```

**Dlaczego to OK:**
- Dashboard **nie wymaga WebSocket** (działa na HTTP)
- WebSocket to "nice to have" dla real-time sync
- Aplikacja funkcjonuje normalnie bez WebSocket (graceful degradation)
- Warningi informują że real-time sync nie działa, ale nie crashują aplikacji

---

## 🎯 Zmiany w plikach

### 1. `apps/web/src/hooks/useRealtimeSync.ts`
```diff
+ Timeout 2s na getAuthToken() - Promise.race
+ Wykrywanie błędu auth (code 1008) - nie reconnect
+ Exponential backoff (3s → 4.5s → 6.75s → max 30s)
+ Lepsze logi błędów
- Usunięto nachalne toasty
```

### 2. `apps/web/src/app/providers.tsx`
```diff
+ maxAge: 10 minut (było 24h)
+ Walidacja data !== null && !== undefined
+ Komentarze wyjaśniające zmiany
```

### 3. `apps/web/src/lib/auth-token.ts`
```diff
+ AbortController + timeout 3s
+ Obsługa AbortError
+ Logi timeout warningów
```

---

## 📚 Wnioski do LESSONS_LEARNED

### 1. **WebSocket może interferować z HTTP requests**
- WebSocket który agresywnie się reconnectuje może powodować "premature close" HTTP
- Zawsze używaj **graceful degradation** - aplikacja musi działać bez WebSocket
- Timeout na wszystkie async operacje w critical path

### 2. **React Query persistence może cachować złe dane**
- Zawsze waliduj `data !== null && data !== undefined` przed cachowaniem
- Krótszy `maxAge` (minuty, nie godziny) zmniejsza ryzyko
- Cache persistence to optimization, nie requirement

### 3. **JWT token management**
- Tokeny wygasają - zawsze obsługuj expired tokens gracefully
- Nie blokuj aplikacji na fetch tokenu
- Auth errors (1008) to signal do stop retry, nie do reconnect

### 4. **Debugging techniki**
- `curl` do backend potwierdza że problem jest w frontend
- "premature close" w logach backend = frontend zamyka połączenie za wcześnie
- DevTools Network Response "empty" mimo 200 OK = parsing issue lub premature close

---

## 🔄 Opcjonalne ulepszenia (future)

### Opcja A: Automatyczne odświeżanie tokenu
```typescript
// W auth-token.ts
export async function getAuthToken(): Promise<string | null> {
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (storedToken) {
    // Sprawdź czy token jest ważny
    const payload = JSON.parse(atob(storedToken.split('.')[1]));
    const expiresAt = payload.exp * 1000;

    // Jeśli wygasa w ciągu 5 minut, pobierz nowy
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      const newToken = await fetchDemoToken();
      if (newToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
        return newToken;
      }
    }
    return storedToken;
  }

  // Brak tokenu - pobierz nowy
  const token = await fetchDemoToken();
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
  return token;
}
```

**Efekt:** Warningi "JWT token expired" znikną - token będzie automatycznie odświeżany.

### Opcja B: WebSocket connection status indicator
Dodać subtelny indicator w UI że real-time sync działa/nie działa.

---

## ✅ Status: FIXED ✅

**Data:** 2026-01-05
**Czas debugowania:** ~2h
**Zmienione pliki:** 3
**Testy:** Manual - Dashboard ładuje się poprawnie, cache działa, WebSocket nie blokuje

**Autor fix:** Claude Sonnet 4.5
**Zgłoszenie:** Krzysztof (user)
