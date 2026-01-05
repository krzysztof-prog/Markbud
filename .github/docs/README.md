# GitHub Workflow Documentation

Dokumentacja związana z procesami GitHub - CI/CD, hooks, actions.

## Zawartość

- [ci-cd.md](ci-cd.md) - Konfiguracja GitHub Actions
- [hooks.md](hooks.md) - Git hooks (Husky) setup

## GitHub Workflows

Workflows znajdują się w [.github/workflows/](../workflows/).

## Useful Commands

```bash
# Run Husky hooks manually
npx husky run pre-commit

# Test GitHub Actions locally
act -l
```

## Links

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contributing guidelines
- [Husky Documentation](https://typicode.github.io/husky/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
