# Troubleshooting

Rozwiazania najczestszych problemow.

---

## Problem: `pnpm: command not found`

**Rozwiazanie:**
```bash
npm install -g pnpm
```

---

## Problem: Port 3000/3001 already in use

**Rozwiazanie:**
```bash
# Zabij procesy na portach
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

Lub zmien port w `.env` files.

---

## Problem: Database migration failed

**Rozwiazanie:**
```bash
# Reset database (UWAGA: kasuje dane!)
pnpm db:reset

# Lub recznie:
rm apps/api/prisma/dev.db
pnpm db:migrate
pnpm db:seed
```

---

## Problem: TypeScript errors po instalacji

**Rozwiazanie:**
```bash
# Regeneruj Prisma Client
pnpm db:generate

# Clear cache
rm -rf apps/web/.next
rm -rf apps/api/dist

# Restart TS Server w VS Code
# Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

---

## Problem: Frontend shows "API connection error"

**Sprawdz:**
1. Backend dziala? (`curl http://localhost:3001/health`)
2. Poprawny `NEXT_PUBLIC_API_URL` w `apps/web/.env.local`?
3. CORS issues? (Sprawdz console w DevTools)

**Rozwiazanie:**
```bash
# Restart dev servers
pnpm dev
```

---

## Problem: Playwright tests fail

**Rozwiazanie:**
```bash
# Install browsers
pnpm exec playwright install

# Update Playwright
pnpm add -D @playwright/test@latest
```

---

## Problem: `MODULE_NOT_FOUND` errors

**Rozwiazanie:**
```bash
# Reinstall dependencies
rm -rf node_modules
rm -rf apps/*/node_modules
pnpm install
```

---

## Problem: Slow dev server

**Optymalizacje:**

1. **Next.js cache:**
   ```bash
   rm -rf apps/web/.next
   ```

2. **Node memory:**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

3. **Turbo cache:**
   ```bash
   rm -rf .turbo
   ```

---

## Nadal masz problemy?

1. Sprawdz [docs/user-guides/troubleshooting.md](../user-guides/troubleshooting.md) - rozszerzone troubleshooting
2. Utworz Issue na GitHub z opisem problemu
3. Skontaktuj sie z zespolem

---

[Powrot do indeksu](../../QUICK_START.md)
