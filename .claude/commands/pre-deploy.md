# Pre-Deploy Checklist

Kompletna weryfikacja przed wdrożeniem na produkcję.

## Kiedy używać

- Przed każdym deploy na PROD
- Po zakończeniu feature branch
- Przed merge do main

## Co sprawdzam

### 1. Build & Quality Checks

```bash
# TypeScript - zero błędów
pnpm typecheck

# ESLint - zero warnings
pnpm lint

# Testy - wszystkie pass
pnpm test

# Build - kompiluje się
pnpm build
```

### 2. Database Checks

```bash
# Czy są pending migracje?
cd apps/api && npx prisma migrate status

# Czy schema jest zsynchronizowana?
npx prisma validate
```

### 3. Git Status

```bash
# Czy wszystko commitnięte?
git status

# Zmiany od ostatniego taga/deploy
git log --oneline $(git describe --tags --abbrev=0)..HEAD

# Pliki zmienione
git diff --stat $(git describe --tags --abbrev=0)..HEAD
```

### 4. Environment Check

```bash
# Czy .env.production ma wszystkie wymagane zmienne?
# Porównuję z .env.example
```

### 5. Breaking Changes Detection

Sprawdzam czy są:
- Zmiany w API (nowe/usunięte endpointy)
- Zmiany w schema Prisma (migracje)
- Zmiany w typach shared
- Zmiany w konfiguracji

## Raport Pre-Deploy

```markdown
## Pre-Deploy Report

### Date: [data]
### Branch: [nazwa brancha]
### Target: PRODUCTION

---

### Build Status
| Check | Status | Details |
|-------|--------|---------|
| TypeScript | ✅ PASS | 0 errors |
| ESLint | ✅ PASS | 0 warnings |
| Tests | ✅ PASS | 45/45 passed |
| Build | ✅ PASS | Compiled successfully |

### Database
| Check | Status | Details |
|-------|--------|---------|
| Migrations | ⚠️ PENDING | 2 migrations to apply |
| Schema | ✅ VALID | No issues |

### Changes Summary
- **Commits**: 12 commits since last deploy
- **Files changed**: 34 files
- **Lines**: +1,245 / -456

### Breaking Changes
- [ ] API changes: YES/NO
- [ ] Database migrations: YES/NO
- [ ] Config changes: YES/NO

### Migration Checklist (if applicable)
- [ ] Migration tested on dev.db
- [ ] Rollback plan ready
- [ ] Backup scheduled

### Files Changed
<details>
<summary>Click to expand (34 files)</summary>

- apps/api/src/handlers/orderHandler.ts
- apps/api/src/services/orderService.ts
- apps/web/src/features/orders/...
- ...

</details>

### Deploy Commands
```bash
# 1. Backup current state
pm2 save

# 2. Pull changes
git pull origin main

# 3. Install dependencies
pnpm install

# 4. Run migrations (if any)
cd apps/api && npx prisma migrate deploy

# 5. Build
pnpm build

# 6. Restart services
pm2 restart all

# 7. Verify
pm2 status
curl http://localhost:5000/health
```

### Recommendation
✅ **GO** - Ready for deployment
⚠️ **GO WITH CAUTION** - Review breaking changes first
🛑 **NO-GO** - Fix issues before deploying

---

### Post-Deploy Verification
- [ ] API health check passed
- [ ] Frontend loads correctly
- [ ] Key features tested manually
- [ ] Logs checked for errors
```

## Automatic Checks

Uruchamiam automatycznie:

```bash
#!/bin/bash
echo "=== PRE-DEPLOY CHECKS ==="

echo "1. TypeScript..."
pnpm typecheck || exit 1

echo "2. Lint..."
pnpm lint || exit 1

echo "3. Tests..."
pnpm test || exit 1

echo "4. Build..."
pnpm build || exit 1

echo "5. Prisma validate..."
cd apps/api && npx prisma validate || exit 1

echo "=== ALL CHECKS PASSED ==="
```

## Teraz

Powiedz "sprawdź" a wykonam pełny pre-deploy check i wygeneruję raport.
