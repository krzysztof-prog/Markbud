# Common Commands

Najczesciej uzywane komendy w projekcie.

## Development

```bash
pnpm dev              # Start all apps
pnpm dev:api          # Backend only
pnpm dev:web          # Frontend only
```

## Database

```bash
pnpm db:migrate       # Create/apply migrations
pnpm db:generate      # Generate Prisma Client
pnpm db:seed          # Seed database
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:reset         # Reset database (UWAGA: kasuje dane!)
```

## Testing

```bash
pnpm test             # Unit tests
pnpm test:watch       # Tests in watch mode
pnpm test:coverage    # With coverage report
pnpm test:e2e         # E2E tests (Playwright)
pnpm test:e2e:ui      # E2E with UI
```

## Code Quality

```bash
pnpm lint             # Check linting
pnpm lint:fix         # Auto-fix linting issues
pnpm type-check       # TypeScript type checking
pnpm format           # Format code (Prettier)
```

## Build

```bash
pnpm build            # Build all apps for production
pnpm build:api        # Build backend only
pnpm build:web        # Build frontend only
```

## Cleanup

```bash
pnpm clean            # Remove node_modules, dist, .next
pnpm clean:cache      # Clear all caches
```

## Szybka sciaga

| Chce... | Komenda |
|---------|---------|
| Uruchomic projekt | `pnpm dev` |
| Sprawdzic typy | `pnpm type-check` |
| Naprawic linting | `pnpm lint:fix` |
| Otworzyc baze danych | `pnpm db:studio` |
| Uruchomic testy | `pnpm test` |
| Zbudowac na produkcje | `pnpm build` |

---

**Nastepny krok:** [First Task Tutorial](./06-first-task-tutorial.md)

[Powrot do indeksu](../../QUICK_START.md)
