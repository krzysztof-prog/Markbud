# Przygotowanie Commit

Checklist przed commitem.

## Pre-commit Checks

```bash
# 1. TypeScript - brak błędów
pnpm typecheck

# 2. Lint - brak warnings
pnpm lint

# 3. Testy - wszystkie pass
pnpm test

# 4. Build - kompiluje się
pnpm build
```

## Jeśli wszystko OK

```bash
# Sprawdź co się zmieniło
git status
git diff

# Stage zmiany
git add .

# Commit z dobrym message
git commit -m "feat: opis co zostało dodane"
```

## Konwencja commit messages

```
feat:     Nowa funkcjonalność
fix:      Naprawa błędu
refactor: Refaktoryzacja (bez zmiany funkcji)
docs:     Dokumentacja
test:     Testy
chore:    Maintenance (deps, config)
```

## Przykłady

```
feat: add order status filtering
fix: resolve delivery date calculation bug
refactor: extract order validation to separate service
docs: update API documentation for /orders endpoint
```

## Teraz

Powiedz co zrobiłeś w tej sesji, a:
1. Sprawdzę czy kod się kompiluje
2. Przejrzę zmiany
3. Zaproponuję commit message
