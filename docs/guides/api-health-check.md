# API Health Check - Raport

## Podsumowanie

Frontend i Backend komunikują się prawidłowo, **ale znaleźliśmy kilka kwestii do naprawy**.

---

## 1. Konfiguracja API URL ✅ POPRAWNA

### Frontend (`apps/web`)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Backend (`apps/api`)
```
API_PORT=4000
API_HOST=localhost
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3005,http://localhost:3006
```

**Status**: ✅ API URL są zsynchronizowane - frontend wskazuje na port 4000, na którym słucha API.

---

## 2. API Client - fetchApi Helper ✅ POPRAWNY

[apps/web/src/lib/api-client.ts](apps/web/src/lib/api-client.ts)

**Cechy:**
- ✅ Obsługuje timeouty (3.5 min)
- ✅ Automatycznie dodaje token JWT z `Authorization: Bearer {token}`
- ✅ Obsługuje błędy sieci i timeout
- ✅ Wspiera 3 typy żądań:
  - `fetchApi<T>()` - JSON requests
  - `uploadFile<T>()` - File uploads (FormData)
  - `fetchBlob()` - Binary files (PDF, Excel)

**Implementacja:**
```typescript
// Wszystkie API service files używają fetchApi helper
const data = await fetchApi<Delivery[]>(`/api/deliveries`);
```

---

## 3. API Service Layer ✅ DOBRZE ZORGANIZOWANA

Wszystkie API services znajdują się w `features/{feature}/api/`:

| Feature | API Service |
|---------|------------|
| deliveries | `features/deliveries/api/deliveriesApi.ts` |
| orders | `features/orders/api/ordersApi.ts` |
| dashboard | `features/dashboard/api/dashboardApi.ts` |
| warehouse | `features/warehouse/api/warehouseApi.ts` |
| glass | `features/glass/api/glassOrdersApi.ts` |
| imports | `features/imports/api/importsApi.ts` |
| pallets | `features/pallets/api/palletsApi.ts` |
| settings | `features/settings/api/{colorsApi,profilesApi,settingsApi}` |

**Każde API:**
- ✅ Importuje `fetchApi` z `@/lib/api-client`
- ✅ Definiuje metody dla każdego endpointa
- ✅ Używa TypeScript types z `@/types`

---

## 4. WebSocket Synchronizacja ✅ PRAWIDŁOWO SKONFIGUROWANA

[apps/web/src/hooks/useRealtimeSync.ts](apps/web/src/hooks/useRealtimeSync.ts)

**Konfiguracja:**
```typescript
const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:4000';
```

**Cechy:**
- ✅ Automatycznie zamienia HTTP na WS(S)
- ✅ Obsługuje autentykację (token w query string)
- ✅ Automatycznie reconnectuje (max 10 prób)
- ✅ Heartbeat/ping-pong (35s timeout)
- ✅ Invalidates React Query caches na zmianach

**Event Mapping:**
```
'delivery:created' → invalidate deliveries-calendar-continuous
'order:updated' → invalidate orders, deliveries-calendar-continuous
'warehouse:stock_updated' → invalidate warehouse
```

---

## 5. Backend Routes ✅ PRAWIDŁOWO ZAREJESTROWANE

[apps/api/src/index.ts:131-151](apps/api/src/index.ts#L131-L151)

Wszystkie routy zarejestrowane z prefixem `/api`:

```
POST/GET   /api/auth
GET/POST   /api/orders
GET/POST   /api/deliveries
GET/POST   /api/warehouse
GET/POST   /api/imports
GET/POST   /api/dashboard
GET/POST   /api/glass-orders
GET/POST   /api/glass-deliveries
GET/POST   /api/glass-validations
```

**CORS skonfigurowany dla 3 portów:**
- `http://localhost:3000`
- `http://localhost:3005`
- `http://localhost:3006`

---

## 6. Potencjalne Problemy ⚠️

### Problem 1: Frontend Port 3001, a CORS Whitelist ma 3000

**Sytuacja:**
```
Actual frontend port:  3001 (bo port 3000 zajęty)
CORS whitelist:        http://localhost:3000
```

**Wpływ:**
- ❌ CORS preflight requests mogą być odrzucane z frontenda na porcie 3001
- ❌ Żądania z 3001 mogą otrzymać błąd CORS

**Rozwiązanie:**
Dodaj `http://localhost:3001` do `ALLOWED_ORIGINS` w `.env`:

```diff
- ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3005,http://localhost:3006
+ ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3005,http://localhost:3006
```

### Problem 2: Frontend NEXT_PUBLIC_API_URL wskazuje na 3000 w Produkcji?

**Jeśli na produkcji:**
- Frontend byłby deployowany na innym domenie (np. https://app.example.com)
- API byłby na (np. https://api.example.com)

**Brakuje:**
Zmiennej dla produkcji w `.env.local`:
```
# .env.local (development)
NEXT_PUBLIC_API_URL=http://localhost:4000

# .env.production (do dodania)
NEXT_PUBLIC_API_URL=https://api.example.com
```

### Problem 3: WebSocket Token Authentication

**Bieżąca implementacja:**
```typescript
const wsUrl = `${WS_URL}/ws?token=${encodeURIComponent(token)}`;
```

**Potencjalne problemy:**
- ⚠️ Token w URL może być logowany (reverse proxies, logs)
- ⚠️ Token zamiast Authorization headera
- ⚠️ Brak refreshu tokenu dla długiego połączenia

**Zalecenie:** Sprawdzić, czy backend prawidłowo obsługuje token w query params.

---

## 7. Checklist Prawidłowego Działania API

### Przed uruchomieniem:

- [ ] `pnpm install` - zainstaluj zależności
- [ ] `pnpm db:generate` - wygeneruj Prisma client
- [ ] `pnpm db:migrate` - wykonaj migracje bazy

### Uruchomienie:

```bash
# Terminal 1: Backend
pnpm dev:api

# Terminal 2: Frontend
pnpm dev:web
```

### Testy:

1. **Health Check Backend:**
   ```bash
   curl http://localhost:4000/api/health
   ```
   Oczekiwany response:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-12-17T11:18:00Z",
     "uptime": 45.123,
     "environment": "development"
   }
   ```

2. **CORS Preflight:**
   ```bash
   curl -i -X OPTIONS http://localhost:4000/api/orders \
     -H "Origin: http://localhost:3001" \
     -H "Access-Control-Request-Method: GET"
   ```
   Oczekiwane headery:
   ```
   Access-Control-Allow-Origin: http://localhost:3001
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
   ```

3. **WebSocket Connection:**
   ```javascript
   // W DevTools Console
   ws = new WebSocket("ws://localhost:4000/ws?token=YOUR_TOKEN");
   ws.onopen = () => console.log("Connected!");
   ws.onmessage = (e) => console.log(e.data);
   ```

4. **API Request Sample:**
   ```javascript
   // W DevTools Console
   fetch('http://localhost:4000/api/orders', {
     headers: {
       'Authorization': 'Bearer YOUR_TOKEN',
       'Content-Type': 'application/json'
     }
   })
   .then(r => r.json())
   .then(data => console.log(data))
   .catch(err => console.error(err));
   ```

---

## 8. Rekomendacje

### Wysokiego Priorytetu:

1. **[TERAZ] Dodaj port 3001 do CORS whitelist**
   ```bash
   # apps/api/.env
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3005,http://localhost:3006
   ```

2. **[TERAZ] Testuj CORS w developerskich tools**
   - Otwórz DevTools → Network
   - Sprawdź, czy żądania mają nagłówek `Origin`
   - Sprawdź response `Access-Control-Allow-Origin`

### Średniego Priorytetu:

3. **[LATER] Dodaj .env.production dla frontendu**
   ```bash
   # apps/web/.env.production
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

4. **[LATER] Rozważ zabezpieczenie WebSocket tokena**
   - Obecnie token w URL (visible w logs)
   - Rozważ `Authorization` header po handshake'u

### Niskiego Priorytetu:

5. **[OPTIONAL] Health check endpoint**
   - Dodaj button "Check API Connection" w UI
   - Call `/api/health` periodically

---

## 9. Podsumowanie Status API

| Komponent | Status | Uwagi |
|-----------|--------|-------|
| **API URL Sync** | ✅ OK | Frontend i Backend zsynchronizowane |
| **fetchApi Helper** | ✅ OK | Prawidłowa obsługa tokenów i błędów |
| **API Services** | ✅ OK | Dobrze zorganizowane w features/ |
| **WebSocket** | ✅ OK | Prawidłowo konfigurowane |
| **Routes Registration** | ✅ OK | Wszystkie routy zarejestrowane |
| **CORS** | ⚠️ WYMAGA POPRAWY | Brak portu 3001 w whitelist |
| **Production Config** | ⚠️ WYMAGA POPRAWY | Brak .env.production dla frontendu |
| **Error Handling** | ✅ OK | Obsługiwane timeouty i błędy sieci |

---

## Następne Kroki

1. ✅ Zaktualizuj ALLOWED_ORIGINS w `apps/api/.env`
2. ✅ Testuj API z frontendu
3. ✅ Sprawdzić WebSocket connection w browser DevTools
4. ✅ Monitoring błędów w console i network tab
5. ✅ Przygotuj production env files

---

**Raport wygenerowany:** 2025-12-17
