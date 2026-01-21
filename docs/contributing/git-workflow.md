# Git Workflow

Zasady pracy z Git w projekcie AKROBUD.

---

## Branching Strategy

### Main Branches

- `main` - production-ready kod
- `develop` - development branch (if used)

### Supporting Branches

- `feature/*` - nowe funkcje
- `fix/*` - bugfix
- `docs/*` - dokumentacja

---

## Commit Message Convention

Uzywamy **Conventional Commits**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Opis |
|------|------|
| `feat` | nowa funkcja |
| `fix` | poprawka buga |
| `docs` | zmiany w dokumentacji |
| `refactor` | refactoring bez zmian funkcjonalnosci |
| `test` | dodanie/aktualizacja testow |
| `chore` | zmiany w build process, dependencies |
| `style` | formatowanie kodu (no logic changes) |

### Scope (opcjonalnie)

- `api` - backend changes
- `web` - frontend changes
- `db` - database changes

### Przyklady

```bash
feat(api): dodaj endpoint GET /orders/:id
fix(web): napraw blad w kalendarzu dostaw
docs: aktualizuj README z instrukcjami instalacji
refactor(api): przenies logike walidacji do serwisu
test(web): dodaj testy dla OrderCard component
chore: aktualizuj dependencies (Next.js 15.5.7)
```

---

## Commit Best Practices

- **Atomic commits** - jeden commit = jedna logiczna zmiana
- **Descriptive messages** - wyjasni "co" i "dlaczego"
- **Test before commit** - upewnij sie ze testy przechodza
- **No broken commits** - kazdy commit powinien byc w stanie budowac sie

```bash
# Przed commitem:
pnpm type-check
pnpm lint
pnpm test
```

---

## Przyklady dobrego workflow

### Feature development

```bash
# 1. Utworz branch
git checkout -b feature/export-pdf

# 2. Wprowadz zmiany i commituj
git add .
git commit -m "feat(api): dodaj generowanie PDF"

git add .
git commit -m "feat(web): dodaj przycisk exportu PDF"

git add .
git commit -m "test: dodaj testy dla PDF export"

# 3. Push
git push origin feature/export-pdf
```

### Bugfix

```bash
# 1. Utworz branch
git checkout -b fix/calendar-display

# 2. Napraw i commituj
git add .
git commit -m "fix(web): napraw wyswietlanie dat w kalendarzu

Daty byly wyswietlane w zlej strefie czasowej.
Dodano konwersje UTC -> local."

# 3. Push
git push origin fix/calendar-display
```

---

**Powrot do:** [CONTRIBUTING](../../CONTRIBUTING.md)
