# Husky Git Hooks

This directory contains Git hooks managed by Husky.

## Pre-commit Hook

The pre-commit hook runs automatically before every commit and performs:

1. **Configuration Validation** - Runs `scripts/validate-config.js` to ensure all configuration files are valid
   - If validation fails (exit code 1), the commit will be blocked
   - Fix any configuration errors before attempting to commit again

## Setup

If you've just cloned the repository, run:

```bash
pnpm install
```

This will automatically set up Husky via the `prepare` script in package.json.

## Manual Setup

If hooks are not working, you can manually initialize Husky:

```bash
pnpm exec husky install
```

## Bypassing Hooks (Emergency Only)

In rare cases where you need to bypass the hooks, use:

```bash
git commit --no-verify -m "your message"
```

**Warning:** Only bypass hooks when absolutely necessary, as they ensure code quality and configuration integrity.
