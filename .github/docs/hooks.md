# Husky Installation Guide

## Quick Install

Since `husky` is already in `package.json` devDependencies, simply run:

```bash
pnpm install
```

The `prepare` script will automatically initialize husky.

## Verify Installation

Check if the pre-commit hook is active:

```bash
# List hook files
ls -la .husky/

# You should see:
# .husky/pre-commit (the validation hook)
# .husky/_/ (husky runtime directory)
```

## Test the Hook

Try making a test commit to verify the hook runs:

```bash
# Create a test file
echo "test" > test.txt
git add test.txt

# Attempt to commit (hook should run)
git commit -m "test: verify hook"

# You should see:
# Running configuration validation...
# Configuration validation passed.

# Clean up
git reset HEAD~1
rm test.txt
```

## If Hook Doesn't Work

### Option 1: Reinstall

```bash
# Remove node_modules and reinstall
rm -rf node_modules
pnpm install
```

### Option 2: Manual Initialization

```bash
# Initialize husky manually
pnpm exec husky install
```

### Option 3: Verify Git Hooks Path

```bash
# Check Git hooks directory
git config core.hooksPath

# Should output: .husky
```

If it doesn't, set it manually:

```bash
git config core.hooksPath .husky
```

## Windows Users

If you're on Windows and hooks aren't running:

1. Use Git Bash (comes with Git for Windows)
2. Or use WSL (Windows Subsystem for Linux)
3. Or ensure you have proper shell support for Git hooks

Git for Windows typically handles this automatically.

## Troubleshooting

### "command not found: husky"

Install husky:

```bash
pnpm add -D husky
pnpm exec husky install
```

### "Permission denied" (Linux/Mac)

Make the hook executable:

```bash
chmod +x .husky/pre-commit
```

### Hook runs but validation script fails

Ensure the validation script exists:

```bash
node scripts/validate-config.js
```

If it fails, check the script for errors or create it if missing.

## What the Hook Does

The pre-commit hook:
1. Runs `node scripts/validate-config.js` before each commit
2. If validation passes (exit code 0), commit proceeds
3. If validation fails (exit code 1), commit is blocked
4. Forces you to fix configuration errors before committing

## Bypass Hook (Emergency Only)

If you absolutely must commit without validation:

```bash
git commit --no-verify -m "emergency fix"
```

Use sparingly - invalid configuration can break the application.
