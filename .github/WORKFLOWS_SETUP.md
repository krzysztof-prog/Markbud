# GitHub Actions Workflows - Quick Setup Guide

This guide will help you set up and verify the GitHub Actions workflows for the AKROBUD project.

## Prerequisites

Before using the workflows, ensure you have:

1. GitHub repository with push access
2. Node.js 20.x installed locally
3. pnpm 9.x installed locally
4. All tests passing locally

---

## Step 1: Verify Local Setup

Run these commands to ensure everything works locally:

```bash
# Install dependencies
pnpm install

# Validate configuration
pnpm validate

# Run linting
pnpm lint

# Type check backend
cd apps/api
pnpm typecheck
cd ../..

# Run backend tests with coverage
cd apps/api
pnpm test:coverage
cd ../..

# Build backend
cd apps/api
pnpm build
cd ../..

# Build frontend
cd apps/web
pnpm build
cd ../..
```

If all commands succeed, you're ready to push the workflows!

---

## Step 2: Add Required Files (If Missing)

### Health Check Endpoint for E2E Tests

Add a health check endpoint to your backend:

**File:** `apps/api/src/routes/health.ts`
```typescript
import { FastifyInstance } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
```

**Register in:** `apps/api/src/index.ts`
```typescript
import healthRoutes from './routes/health';

// ... other imports

await fastify.register(healthRoutes);
```

---

## Step 3: Configure GitHub Secrets (Optional)

### Codecov Integration (Optional but Recommended)

1. Go to https://codecov.io/
2. Sign up with your GitHub account
3. Add your repository
4. Copy the upload token
5. Add to GitHub:
   - Go to your repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `CODECOV_TOKEN`
   - Value: Paste your token
   - Click "Add secret"

**Note:** If you don't add this secret, coverage reports will still be generated and uploaded as artifacts, but won't be sent to Codecov.

---

## Step 4: Push Workflows to GitHub

```bash
# Add the workflow files
git add .github/

# Commit
git commit -m "feat: Add GitHub Actions CI/CD workflows

- Add ci.yml for comprehensive checks (lint, test, build)
- Add test.yml for fast PR feedback with coverage
- Add e2e.yml for Playwright E2E tests
- Include workflow documentation and setup guide

Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to main (workflows will run!)
git push origin main
```

---

## Step 5: Verify Workflows

1. Go to your GitHub repository
2. Click on the "Actions" tab
3. You should see the "CI" workflow running
4. Click on the workflow run to see details
5. Wait for all jobs to complete (green checkmarks)

---

## Step 6: Test on a Pull Request

Create a test PR to verify all workflows:

```bash
# Create a new branch
git checkout -b test/workflows

# Make a small change (e.g., update README)
echo "\n## CI Status\n\nCI/CD workflows are now active!" >> README.md

# Commit and push
git add README.md
git commit -m "test: Verify CI/CD workflows"
git push origin test/workflows

# Create PR via GitHub UI or gh CLI
gh pr create --title "Test: Verify CI/CD workflows" --body "Testing the new GitHub Actions workflows"
```

Expected behavior:
- `ci.yml` runs all checks
- `test.yml` runs unit tests (if backend code changed)
- `e2e.yml` runs E2E tests (if web/API code changed)
- PR gets comments with test results and coverage

---

## Step 7: Monitor First Run

Watch the first run carefully:

### Expected Timeline:
- **Lint & Type Check**: ~2-3 minutes (first run, ~1 min with cache)
- **Backend Tests**: ~3-4 minutes (first run, ~1-2 min with cache)
- **Backend Build**: ~2-3 minutes
- **Frontend Build**: ~4-5 minutes
- **E2E Tests**: ~10-15 minutes

### Common Issues:

#### 1. pnpm Installation Fails
**Error:** `pnpm: command not found`

**Fix:** The workflow uses `pnpm/action-setup@v4` which should install pnpm. If it fails, check the version in the workflow matches your `packageManager` in package.json.

#### 2. TypeScript Errors
**Error:** Type checking fails in CI but works locally

**Fix:**
```bash
# Clear local build cache
rm -rf apps/api/dist
rm -rf apps/web/.next

# Regenerate Prisma client
cd apps/api
pnpm db:generate

# Run type check
pnpm typecheck
```

#### 3. Test Database Issues
**Error:** E2E tests fail because database doesn't exist

**Fix:** The workflow copies `dev.db` to create `test.db`. Ensure `dev.db` exists and is committed:
```bash
cd apps/api
pnpm db:migrate:deploy  # Apply migrations
pnpm db:seed  # Seed data
git add prisma/dev.db
git commit -m "chore: Add dev database for E2E tests"
```

#### 4. Frontend Build Fails
**Error:** Environment variables missing

**Fix:** Update `ci.yml` to include all required env vars:
```yaml
env:
  NEXT_PUBLIC_API_URL: http://localhost:3001
  # Add any other required env vars
```

#### 5. Coverage Threshold Fails
**Error:** Coverage below 70%

**Fix:**
- Add more tests to increase coverage
- Or adjust threshold in `test.yml`:
  ```yaml
  THRESHOLD=60  # Lower to current coverage level
  ```

---

## Step 8: Configure Branch Protection (Recommended)

Require workflows to pass before merging PRs:

1. Go to Settings → Branches
2. Click "Add rule"
3. Branch name pattern: `main`
4. Check "Require status checks to pass before merging"
5. Select these status checks:
   - `Lint & Type Check`
   - `Backend Tests`
   - `Build Backend`
   - `Build Frontend`
   - `All Checks Passed`
6. Check "Require branches to be up to date before merging"
7. Click "Create" or "Save changes"

---

## Step 9: Optimize Workflows (Optional)

### Reduce E2E Test Frequency

If E2E tests take too long, run them only on specific conditions:

**Edit `.github/workflows/e2e.yml`:**
```yaml
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, labeled]  # Add labeled
    paths:
      - 'apps/web/**'
      - 'apps/api/**'
```

Then add a `run-e2e` label to PRs when you want E2E tests:
```yaml
jobs:
  e2e-tests:
    if: contains(github.event.pull_request.labels.*.name, 'run-e2e')
```

### Speed Up Builds

Add turbo cache to workflows:

**Edit all workflow files:**
```yaml
- name: Setup Turbo cache
  uses: actions/cache@v4
  with:
    path: .turbo
    key: ${{ runner.os }}-turbo-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-turbo-
```

---

## Step 10: Maintenance Checklist

Regular maintenance tasks:

### Monthly:
- [ ] Update GitHub Actions versions (check for `@v5`, etc.)
- [ ] Review Codecov reports and improve coverage
- [ ] Check artifact storage usage (Settings → Actions → General)
- [ ] Review and update coverage threshold

### Quarterly:
- [ ] Update Node.js version in workflows (when LTS changes)
- [ ] Update pnpm version (check releases)
- [ ] Review workflow timeouts (increase if needed)
- [ ] Optimize caching strategy

### Yearly:
- [ ] Review all workflow logic
- [ ] Check for deprecated actions
- [ ] Update best practices

---

## Troubleshooting Commands

### View Workflow Logs Locally
```bash
# Download workflow run artifacts
gh run download <run-id>

# View specific job logs
gh run view <run-id> --job=<job-id> --log
```

### Test Workflows Locally
```bash
# Install act (GitHub Actions local runner)
brew install act  # macOS
choco install act-cli  # Windows

# Run CI workflow
act push

# Run specific job
act -j lint-and-typecheck

# Run with secrets
act -s CODECOV_TOKEN=your-token
```

### Debug CI Failures
```bash
# Enable debug logging
# Add this secret in GitHub: ACTIONS_STEP_DEBUG=true

# Re-run failed jobs with debug logs
# Go to Actions → Click on run → Click "Re-run jobs" → "Re-run failed jobs"
```

---

## Success Criteria

Your workflows are set up correctly when:

1. ✅ All CI jobs pass on `main` branch
2. ✅ PR gets automatic comments with test results
3. ✅ Coverage reports are generated and uploaded
4. ✅ Build artifacts are created
5. ✅ E2E tests run and pass on PRs
6. ✅ Branch protection rules enforce workflow success
7. ✅ Workflows complete in under 20 minutes total

---

## Next Steps

After successful setup:

1. Add CI status badge to README:
   ```markdown
   ![CI](https://github.com/YOUR_USERNAME/AKROBUD/workflows/CI/badge.svg)
   ```

2. Configure notifications:
   - GitHub → Settings → Notifications
   - Enable "Actions" notifications for your workflow preferences

3. Set up Slack/Discord integration (optional):
   - Use GitHub Actions marketplace integrations
   - Get notified in your team chat when workflows fail

4. Review analytics:
   - Go to Actions → Click on a workflow → "..." → "View workflow usage"
   - See execution time trends and optimize slow jobs

---

## Support

If you encounter issues:

1. Check workflow logs in Actions tab
2. Review this setup guide
3. Check `.github/workflows/README.md` for detailed documentation
4. Search GitHub Actions documentation
5. File an issue with workflow logs attached

---

## Quick Reference

### Workflow Files:
- `ci.yml` - Main CI pipeline (runs on push and PRs)
- `test.yml` - Fast test feedback (runs on PRs)
- `e2e.yml` - E2E tests (runs on PRs with web/API changes)

### Key Commands:
```bash
pnpm validate      # Validate config
pnpm lint          # Run linters
pnpm test:coverage # Run tests with coverage
pnpm build         # Build all apps
pnpm test:e2e      # Run E2E tests
```

### Important URLs:
- Actions Tab: `https://github.com/YOUR_USERNAME/AKROBUD/actions`
- Codecov Dashboard: `https://app.codecov.io/gh/YOUR_USERNAME/AKROBUD`
- Settings: `https://github.com/YOUR_USERNAME/AKROBUD/settings`

---

**That's it! Your CI/CD workflows are now ready to use.**
