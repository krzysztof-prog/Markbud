# Development Workflow - AKROBUD

## Problem: Duplikujące się procesy dev

Gdy uruchamiasz `pnpm dev` kilka razy bez zabijania poprzednich procesów, dostajesz konflikty portów i błędy WebSocket.

## ✅ Rozwiązanie automatyczne

```bash
# To AUTOMATYCZNIE zabije stare procesy i uruchomi nowe
pnpm dev
```

Hook `predev` automatycznie zabija wszystkie procesy na portach 3000 i 4000 przed uruchomieniem serwerów.

## Ręczne zarządzanie procesami

```bash
# Zabij wszystkie dev servery
pnpm kill

# Sprawdź co działa na portach
netstat -ano | findstr ":3000\|:4000"

# Uruchom tylko frontend
pnpm dev:web

# Uruchom tylko backend
pnpm dev:api
```

## Porty

- **Frontend (Next.js):** `3000`
- **Backend (Fastify API):** `4000`
- **WebSocket:** `ws://localhost:4000/ws`

## Konfiguracja portów

### Backend
[apps/api/.env](apps/api/.env)
```env
API_PORT=4000
API_HOST=localhost
```

### Frontend
[apps/web/.env.local](apps/web/.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Troubleshooting

### Dashboard się nie ładuje
1. Sprawdź czy backend działa: `curl http://localhost:4000/api/deliveries`
2. Sprawdź konsolę przeglądarki (F12)
3. Zrestartuj serwery: `pnpm kill && pnpm dev`

### WebSocket errors
- Upewnij się że backend działa na porcie 4000
- Frontend automatycznie łączy się z `ws://localhost:4000/ws`
- Hard refresh przeglądarki: Ctrl+F5

### Port already in use
```bash
# Zabij procesy automatycznie
pnpm kill

# Lub ręcznie znajdź PID
netstat -ano | findstr :4000
taskkill /F /PID <PID>
```

## Best Practices

1. **Zawsze używaj `pnpm dev`** zamiast uruchamiać servery osobno
2. Jeśli masz problem - najpierw `pnpm kill`
3. W razie wątpliwości - hard refresh przeglądarki (Ctrl+F5)
4. Backend API i Frontend muszą być na różnych portach
