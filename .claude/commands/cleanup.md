# Code Cleanup

Czyści kod z unused imports, dead code, console.log i innych śmieci.

## Kiedy używać

- Przed commitem
- Po refactorze
- Gdy ESLint krzyczy
- Okresowo (co tydzień)

## Co czyszczę

### 1. Unused Imports

```typescript
// ❌ BEFORE
import { useState, useEffect, useCallback } from 'react';  // useCallback unused
import { Button, Card, Badge } from '@/components/ui';     // Badge unused

function Component() {
  const [data, setData] = useState(null);
  useEffect(() => { ... }, []);
  return <Button>Click</Button>;
}

// ✅ AFTER
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';

function Component() {
  const [data, setData] = useState(null);
  useEffect(() => { ... }, []);
  return <Button>Click</Button>;
}
```

### 2. Console.log Statements

```typescript
// ❌ BEFORE
function handleSubmit(data) {
  console.log('data:', data);
  console.log('submitting...');
  // actual code
  console.log('done');
}

// ✅ AFTER
function handleSubmit(data) {
  // actual code
}
```

### 3. Commented Out Code

```typescript
// ❌ BEFORE
function calculate(value) {
  // const oldResult = value * 2;
  // if (oldResult > 100) {
  //   return oldResult / 2;
  // }
  return value * 3;
}

// ✅ AFTER
function calculate(value) {
  return value * 3;
}
```

### 4. Dead Code (unreachable)

```typescript
// ❌ BEFORE
function process(type) {
  if (type === 'a') return 'A';
  if (type === 'b') return 'B';
  return 'Default';
  console.log('This never runs');  // Dead code!
}

// ✅ AFTER
function process(type) {
  if (type === 'a') return 'A';
  if (type === 'b') return 'B';
  return 'Default';
}
```

### 5. Unused Variables

```typescript
// ❌ BEFORE
function Component({ data, options, config }) {  // config unused
  const result = processData(data);
  const unused = 'never used';  // Unused variable
  return <div>{result}</div>;
}

// ✅ AFTER
function Component({ data, options }) {
  const result = processData(data);
  return <div>{result}</div>;
}
```

### 6. Empty Files

```bash
# Znajduję puste pliki
find . -name "*.ts" -empty
find . -name "*.tsx" -empty
```

### 7. Duplicate Imports

```typescript
// ❌ BEFORE
import { Button } from '@/components/ui';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui';  // Duplicate!

// ✅ AFTER
import { Button, Card } from '@/components/ui';
```

## Komendy

```bash
# Automatyczny cleanup z ESLint
pnpm lint --fix

# Znajdź unused exports
npx ts-prune

# Znajdź console.log
grep -rn "console.log" --include="*.ts" --include="*.tsx" apps/
```

## Raport cleanup

```markdown
## Cleanup Report

### Files processed: 145
### Issues found: 23
### Issues fixed: 21
### Manual review needed: 2

---

### Fixed Automatically

| Type | Count | Files |
|------|-------|-------|
| Unused imports | 12 | 8 files |
| Console.log | 5 | 4 files |
| Unused variables | 3 | 2 files |
| Empty blocks | 1 | 1 file |

### Requires Manual Review

1. **apps/api/src/services/oldService.ts**
   - Entire file appears unused
   - Recommendation: Verify and delete

2. **apps/web/src/utils/legacy.ts**
   - Contains 3 unused exports
   - May be used dynamically - verify before removing
```

## Checklist po cleanup

```bash
# 1. TypeScript nadal kompiluje
pnpm typecheck

# 2. Brak ESLint errors
pnpm lint

# 3. Testy przechodzą
pnpm test

# 4. Build działa
pnpm build
```

## Teraz

Powiedz "czyść" a:
1. Znajdę wszystkie problemy
2. Naprawię automatycznie co się da
3. Pokażę co wymaga ręcznego review
