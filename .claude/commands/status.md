# Project Status

Pokazuje aktualny stan projektu - błędy, testy, zależności, metryki.

## Kiedy używać

- Na początku sesji (orientacja)
- Przed planowaniem pracy
- Do raportowania

## Co pokazuję

### 1. Build Status

```bash
# TypeScript errors
pnpm typecheck 2>&1 | tail -5

# ESLint warnings/errors
pnpm lint 2>&1 | grep -E "(error|warning)" | wc -l
```

### 2. Test Status

```bash
# Test results
pnpm test --reporter=dot 2>&1 | tail -10

# Coverage (jeśli dostępne)
pnpm test:coverage 2>&1 | grep -E "Statements|Branches|Functions|Lines"
```

### 3. Dependencies

```bash
# Outdated packages
pnpm outdated 2>&1 | wc -l

# Security vulnerabilities
pnpm audit 2>&1 | grep -E "(high|critical)" | wc -l
```

### 4. Git Status

```bash
# Uncommitted changes
git status --short | wc -l

# Branches
git branch | wc -l

# Last commit
git log -1 --format="%h %s (%ar)"
```

### 5. Code Metrics

```bash
# Lines of code (rough)
find apps -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1

# Number of files
find apps -name "*.ts" -o -name "*.tsx" | wc -l
```

## Raport Status

```markdown
## Project Status Report

### Date: [data]
### Branch: main

---

### Quick Summary

| Metric | Status | Value |
|--------|--------|-------|
| TypeScript | ✅ | 0 errors |
| ESLint | ⚠️ | 3 warnings |
| Tests | ✅ | 45/45 passed |
| Coverage | 🟡 | 67% |
| Security | ✅ | 0 vulnerabilities |
| Outdated deps | ⚠️ | 5 packages |

**Overall Health: 85%** 🟢

---

### Build & Quality

```
TypeScript: ✅ PASS (0 errors)
ESLint:     ⚠️ 3 warnings
  - apps/web/src/features/orders/OrderList.tsx: unused variable
  - apps/api/src/handlers/deliveryHandler.ts: missing return type
  - apps/api/src/services/importService.ts: any type used
```

---

### Tests

```
Test Suites: 12 passed, 12 total
Tests:       45 passed, 45 total
Snapshots:   0 total
Time:        8.234s

Coverage:
  Statements: 67%
  Branches:   54%
  Functions:  71%
  Lines:      68%
```

---

### Dependencies

| Status | Count |
|--------|-------|
| Up to date | 42 |
| Minor updates | 5 |
| Major updates | 2 |
| Security issues | 0 |

Outdated (major):
- next: 14.0.0 → 15.0.0
- @tanstack/react-query: 4.36.1 → 5.17.9

---

### Git Status

```
Branch: main
Last commit: abc1234 feat: add order filtering (2 hours ago)
Uncommitted: 3 files modified
Branches: 5 (main, develop, feature/*, ...)
```

---

### Code Stats

```
Total files:     234
Total lines:     28,456
  TypeScript:    18,234
  React (TSX):   10,222

By area:
  Backend (api): 12,345 lines
  Frontend (web): 16,111 lines
```

---

### Database

```
Tables: 65
Records: ~15,000 (estimated)
Size: 45.2 MB

Recent migrations:
- 20240115_add_glass_tracking (applied)
- 20240110_update_order_status (applied)
```

---

### Action Items

Based on current status:

1. ⚠️ Fix 3 ESLint warnings
2. ⚠️ Review 5 outdated packages
3. 📈 Consider improving test coverage (67% → 80%)
4. 📋 Commit 3 uncommitted files or stash

---

### Compared to Last Week

| Metric | Last Week | Now | Trend |
|--------|-----------|-----|-------|
| TS Errors | 2 | 0 | ✅ ↓ |
| Tests | 42 | 45 | ✅ ↑ |
| Coverage | 65% | 67% | ✅ ↑ |
| Warnings | 5 | 3 | ✅ ↓ |
```

## Szybki widok (one-liner)

```
✅ TS:0 | ⚠️ Lint:3 | ✅ Tests:45/45 | 🟡 Cov:67% | ⚠️ Outdated:5 | ✅ Sec:0
```

## Teraz

Powiedz "status" a pokażę pełny raport stanu projektu.
