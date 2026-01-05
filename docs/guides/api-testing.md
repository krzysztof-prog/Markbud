# API Testing Guide - Instrukcje Testowania

## Szybki Start

### 1. Zainstaluj zależności (jeśli nie zrobione)
```bash
pnpm install
pnpm db:generate
```

### 2. Uruchom serwery

```bash
# Terminal 1: Backend API (port 4000)
pnpm dev:api

# Terminal 2: Frontend (port 3000 lub 3001)
pnpm dev:web

# Terminal 3 (opcjonalnie): Baza danych
pnpm db:studio
```

### 3. Sprawdź czy API działa
Otwórz przeglądarkę:
```
http://localhost:4000/api/health
```

Oczekiwany response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-17T12:18:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

---

## Testy CORS (Cross-Origin)

### Test 1: CORS Preflight Request

```bash
curl -i -X OPTIONS http://localhost:4000/api/orders \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type"
```

**Oczekiwany Response (HTTP 200 lub 204):**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### Test 2: Rzeczywisty Request z Frontendu

**W Browser DevTools (F12) Console:**

```javascript
// Test bez autoryzacji
fetch('http://localhost:4000/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ OK:', d))
  .catch(e => console.error('❌ ERROR:', e));
```

**W DevTools Network tab:**
- Kliknij na żądanie
- Sprawdź tab "Headers"
- Powinieneś zobaczyć:
  - Request Header: `Origin: http://localhost:3001`
  - Response Header: `Access-Control-Allow-Origin: http://localhost:3001`

---

## Testy API Endpoints

### Test 3: GET /api/dashboard

```javascript
// W Browser DevTools Console
const token = localStorage.getItem('auth_token'); // Lub z where token przechowujesz

fetch('http://localhost:4000/api/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => {
  console.log('Status:', r.status);
  console.log('Headers:', Object.fromEntries(r.headers));
  return r.json();
})
.then(d => console.log('Data:', d))
.catch(e => console.error('Error:', e));
```

**Oczekiwany Response:**
```json
{
  "ordersCount": 45,
  "activeDeliveries": 8,
  "pendingImports": 2,
  "warehouseLevel": 85,
  "recentAlerts": [...]
}
```

### Test 4: POST /api/orders (Create Order)

```javascript
const token = localStorage.getItem('auth_token');

const newOrder = {
  projectName: "Test Project",
  colorId: 1,
  profileId: 2,
  quantity: 10,
  dueDate: "2025-12-24"
};

fetch('http://localhost:4000/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newOrder)
})
.then(r => r.json())
.then(d => console.log('Created:', d))
.catch(e => console.error('Error:', e));
```

### Test 5: GET /api/orders (Get All Orders)

```javascript
const token = localStorage.getItem('auth_token');

fetch('http://localhost:4000/api/orders?status=new', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(d => console.log('Orders:', d))
.catch(e => console.error('Error:', e));
```

---

## WebSocket Testing

### Test 6: WebSocket Connection

```javascript
// W Browser DevTools Console

// Najpierw pobierz token
const token = localStorage.getItem('auth_token');

// Stwórz WebSocket
const ws = new WebSocket(`ws://localhost:4000/ws?token=${encodeURIComponent(token)}`);

// Listen na events
ws.onopen = () => {
  console.log('✅ WebSocket Connected!');
  console.log('Ready State:', ws.readyState);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('📨 Message received:', data);
};

ws.onerror = (error) => {
  console.error('❌ WebSocket Error:', error);
};

ws.onclose = () => {
  console.log('🔌 WebSocket Closed');
};

// Wysłanie testowej wiadomości (pong)
setTimeout(() => {
  ws.send(JSON.stringify({ type: 'pong' }));
  console.log('Pong sent');
}, 1000);
```

**Oczekiwane zachowanie:**
1. `onopen` zostanie wywoływane → Connected ✅
2. Co ~30 sekund powinieneś otrzymać `ping` message
3. Aplikacja automatycznie odpowiada `pong`
4. Nowe dane zmienia się → `dataChange` event

---

## Monitoring w DevTools

### Otwórz DevTools (F12)

#### 1. Network Tab
- Obserwuj wszystkie żądania HTTP
- Szukaj CORS błędów
- Sprawdź status code (200, 201, 400, 401, etc.)

#### 2. Console Tab
- Sprawdź dla błędów JavaScript
- Szukaj komunikatów z `fetchApi` helpera
- Szukaj WebSocket debugów

#### 3. Application Tab → Storage → Local Storage
- Sprawdzaj token: `auth_token`
- Sprawdzaj czy token jest prawidłowy

#### 4. Network → WS (WebSockets)
- Filtruj typ: `WS`
- Zobacz WebSocket connections
- Sprawdź frames (ping/pong messages)

---

## Testy Performance

### Test 7: Sprawdzenie czasu odpowiedzi

```javascript
const token = localStorage.getItem('auth_token');

console.time('fetch-orders');
const response = await fetch('http://localhost:4000/api/orders', {
  headers: {
    'Authorization': `Bearer ${token}`,
  }
});
const data = await response.json();
console.timeEnd('fetch-orders');

console.log('Response time: ~', performance.now(), 'ms');
```

**Oczekiwane:**
- GET requests: < 500ms
- POST requests: < 1000ms

---

## Błędy i Rozwiązania

### ❌ Error: CORS policy: No 'Access-Control-Allow-Origin' header

**Przyczyna:**
- Frontend na porcie 3001, ale ALLOWED_ORIGINS nie zawiera 3001

**Rozwiązanie:**
```bash
# apps/api/.env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,...
```

Restartuj backend:
```bash
# Zabiś proces (Ctrl+C)
pnpm dev:api  # Uruchom ponownie
```

### ❌ Error: 401 Unauthorized

**Przyczyna:**
- Token nie jest wysyłany
- Token wygasł
- Token jest niepoprawny

**Rozwiązanie:**
```javascript
// Sprawdź token
const token = localStorage.getItem('auth_token');
console.log('Token:', token ? 'exists' : 'missing');

// Upewnij się, że jest wysyłany
fetch('http://localhost:4000/api/orders', {
  headers: {
    'Authorization': `Bearer ${token}`,  // ← WAŻNE: Bearer ${token}
  }
})
```

### ❌ Error: 404 Not Found

**Przyczyna:**
- Endpoint nie istnieje
- Zła ścieżka API

**Rozwiązanie:**
```bash
# Sprawdzić wszystkie dostępne routy
curl http://localhost:4000/api/health

# Sprawdzić Swagger dokumentację
# http://localhost:4000/docs
```

### ❌ Error: WebSocket connection failed

**Przyczyna:**
- WebSocket server nie działa
- Zła URL (http zamiast ws)
- Token nie jest wysyłany

**Rozwiązanie:**
```javascript
// Upewnij się, że URL jest prawidłowy
const WS_URL = 'ws://localhost:4000'; // nie http!
const token = localStorage.getItem('auth_token');
const ws = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}`);
```

---

## Checklist Weryfikacji

Przed wysłaniem do produkcji:

- [ ] **Health Check** - GET /api/health zwraca 200
- [ ] **CORS** - Preflight requests zwracają prawidłowe headery
- [ ] **Authorization** - Endpoints wymagające tokenu zwracają 401 bez tokenu
- [ ] **Validation** - POST z invalid data zwraca 400
- [ ] **Database** - GET /api/ready zwraca database: "connected"
- [ ] **WebSocket** - Połączenie nawiązane, ping/pong działa
- [ ] **Error Handling** - 500 errors zwracają error message
- [ ] **Rate Limiting** - Brak error 429 przy normalnym użytkowaniu
- [ ] **Timeouts** - Długie żądania (>3.5 min) są timeout'owane
- [ ] **Frontend Integration** - Wszystkie API services pracują

---

## Полезные ссылки

- Backend Health: http://localhost:4000/api/health
- Database Status: http://localhost:4000/api/ready
- Swagger Docs: http://localhost:4000/docs
- Frontend: http://localhost:3000 (lub 3001)

---

**Ostatnia aktualizacja:** 2025-12-17
