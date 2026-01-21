# Development Workflow

Typowy przebieg pracy z projektem AKROBUD.

## Typowy dzien pracy

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
pnpm install

# 3. Apply any new migrations
pnpm db:migrate

# 4. Start dev servers
pnpm dev

# 5. Podczas pracy - sprawdzaj czesto:
pnpm type-check   # TypeScript errors
pnpm lint         # Linting issues
pnpm test         # Unit tests

# 6. Przed commitem:
pnpm lint:fix     # Auto-fix linting
git add .
git commit -m "feat: opis zmiany"
git push
```

## File Watching

Development servers maja hot-reload:
- **Backend:** Auto-restart na zmiany w `apps/api/src/`
- **Frontend:** Hot Module Replacement (HMR) na zmiany w `apps/web/src/`

## Konwencje commitow

Uzyj formatu [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: nowa funkcjonalnosc
fix: naprawa bledu
docs: zmiany w dokumentacji
style: formatowanie, brak zmian w logice
refactor: refaktoryzacja kodu
test: dodanie testow
chore: zmiany w build, CI, etc.
```

Przyklady:
```bash
git commit -m "feat(orders): dodaj pole notes do zlecen"
git commit -m "fix(deliveries): napraw sortowanie po dacie"
git commit -m "docs: zaktualizuj QUICK_START.md"
```

---

**Nastepny krok:** [Common Commands](./05-common-commands.md)

[Powrot do indeksu](../../QUICK_START.md)
