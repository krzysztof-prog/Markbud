# GitHub Actions Workflows

This directory contains CI/CD workflows for the AKROBUD project.

## Workflows Overview

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**Jobs:**
- **lint-and-typecheck**: Runs ESLint and TypeScript type checking
- **test-backend**: Runs backend unit tests with coverage
- **build-backend**: Builds the backend application
- **build-frontend**: Builds the frontend Next.js application
- **all-checks-passed**: Validates that all jobs passed successfully

**Features:**
- Caches pnpm store for faster builds
- Uploads coverage reports to Codecov (requires `CODECOV_TOKEN` secret)
- Archives build artifacts for 7 days
- Archives coverage reports for 30 days
- Validates configuration before running other checks

---

### 2. Test Workflow (`test.yml`)

**Triggers:**
- Pull requests to `main` branch (only when backend code changes)

**Path Filters:**
- `apps/api/src/**`
- `apps/api/prisma/**`
- `apps/api/package.json`
- `apps/api/vitest.config.ts`
- `pnpm-lock.yaml`

**Features:**
- Fast feedback for PR authors (only runs tests)
- Generates coverage summary
- Comments on PR with test results and coverage
- Checks coverage threshold (70%)
- Uploads coverage to Codecov
- Archives coverage reports for 14 days

**Coverage Threshold:**
- Minimum: 70% line coverage
- Fails if coverage drops below threshold

---

### 3. E2E Tests Workflow (`e2e.yml`)

**Triggers:**
- Pull requests to `main` branch (when web or API code changes)
- Manual workflow dispatch (for on-demand testing)

**Features:**
- Runs Playwright E2E tests
- Sets up test database
- Starts backend server automatically
- Installs Playwright browsers
- Uploads Playwright HTML report (30 days retention)
- Uploads test results (14 days retention)
- Comments on PR with test results
- Supports manual browser selection

**Manual Trigger:**
You can manually run E2E tests from the Actions tab and select a browser:
- chromium (default)
- firefox
- webkit

---

## Setup Requirements

### 1. GitHub Secrets

Add the following secrets in your repository settings:

#### Optional:
- `CODECOV_TOKEN`: Token for uploading coverage to Codecov
  - Get from https://codecov.io/
  - Go to Settings > General > Repository Upload Token

### 2. Environment Variables

The workflows use the following environment variables:

```yaml
# Frontend build
NEXT_PUBLIC_API_URL: http://localhost:3001
NODE_ENV: production

# E2E tests
CI: true
```

### 3. Required Files

Ensure these files exist in your repository:
- `scripts/validate-config.js` - Configuration validation script
- `apps/api/vitest.config.ts` - Vitest configuration
- `apps/web/playwright.config.ts` - Playwright configuration

---

## Workflow Execution Order

### On Pull Request:
1. `test.yml` runs first (fast feedback, 10 min timeout)
2. `ci.yml` runs in parallel (comprehensive checks, 10-15 min timeout per job)
3. `e2e.yml` runs if web/API files changed (30 min timeout)

### On Push to Main:
1. `ci.yml` runs all checks
2. E2E tests are skipped (only run on PRs)

---

## Caching Strategy

All workflows use the same pnpm cache strategy:

```yaml
- name: Get pnpm store directory
  run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
```

**Benefits:**
- Faster dependency installation (from ~2-3 min to ~30 sec)
- Reduced bandwidth usage
- Cache invalidates when `pnpm-lock.yaml` changes

---

## Artifacts

### CI Workflow:
- `backend-coverage-report` (30 days)
- `backend-dist` (7 days)
- `frontend-dist` (7 days)

### Test Workflow:
- `test-coverage` (14 days)

### E2E Workflow:
- `playwright-report` (30 days) - HTML report
- `playwright-results` (14 days) - Test results and screenshots

---

## Troubleshooting

### Coverage Upload Fails
If Codecov upload fails, the workflow will continue (non-blocking):
```yaml
fail_ci_if_error: false
```

To fix:
1. Add `CODECOV_TOKEN` secret
2. Or remove Codecov steps if not needed

### E2E Tests Timeout
If backend doesn't start in time:
```bash
timeout 60 bash -c 'until curl -s http://localhost:3001/health > /dev/null; do sleep 2; done'
```

Solutions:
- Increase timeout in workflow
- Add `/health` endpoint to backend
- Check backend startup logs

### Playwright Installation Issues
If Playwright browsers fail to install:
```bash
pnpm exec playwright install --with-deps chromium
```

This installs:
- Chromium browser
- System dependencies (fonts, libraries)

### Test Database Issues
The E2E workflow creates a test database:
```bash
cp prisma/dev.db prisma/test.db
DATABASE_URL="file:./prisma/test.db" pnpm db:migrate:deploy
```

If migrations fail:
- Check Prisma schema syntax
- Ensure migrations are committed
- Verify `dev.db` exists

---

## Local Testing

Test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
choco install act-cli  # Windows

# Run CI workflow
act push

# Run PR workflow
act pull_request

# Run specific job
act -j test-backend

# Run with secrets
act -s CODECOV_TOKEN=your-token
```

---

## Optimization Tips

### 1. Skip CI on Commits
Add to commit message:
```
[skip ci]
```

### 2. Parallel Execution
Jobs run in parallel by default. Dependencies:
```yaml
needs: [lint-and-typecheck, test-backend]
```

### 3. Conditional Steps
Skip steps based on conditions:
```yaml
if: github.event_name == 'pull_request'
```

### 4. Matrix Strategy
Run tests on multiple Node.js versions:
```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
```

---

## Monitoring

### View Workflow Runs:
- Go to **Actions** tab in GitHub
- Click on a workflow run to see details
- Download artifacts from the run page

### Check Coverage Trends:
- Visit Codecov dashboard
- View coverage over time
- See which files need more tests

### PR Comments:
- Test results appear as PR comments
- Coverage percentage shown
- Links to detailed reports

---

## Maintenance

### Update Dependencies:
```bash
# Update GitHub Actions
# Edit workflow files and bump version numbers:
# actions/checkout@v4 -> actions/checkout@v5

# Update pnpm version
# Edit all workflows:
version: 9  # Change to latest
```

### Update Coverage Threshold:
Edit `test.yml`:
```yaml
THRESHOLD=70  # Increase to 75, 80, etc.
```

### Add New Checks:
1. Add job to `ci.yml`
2. Update `needs` in `all-checks-passed` job
3. Test locally with `act`

---

## Best Practices

1. **Keep workflows fast**: Use caching, parallel jobs
2. **Fail fast**: Run quick checks (lint) before slow ones (build)
3. **Provide feedback**: Comment on PRs with results
4. **Archive artifacts**: Keep logs and reports for debugging
5. **Use path filters**: Only run tests when relevant files change
6. **Set timeouts**: Prevent stuck workflows from wasting resources

---

## Support

For issues or questions:
1. Check workflow logs in Actions tab
2. Review this README
3. Check GitHub Actions documentation
4. File an issue in the repository
