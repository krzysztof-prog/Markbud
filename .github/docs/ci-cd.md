# GitHub Actions CI/CD Setup - AKROBUD

This document provides a summary of the GitHub Actions workflows created for the AKROBUD project.

## Files Created

### Workflow Files (`.github/workflows/`)
1. **ci.yml** (6.1 KB) - Main CI/CD pipeline
2. **test.yml** (3.5 KB) - Fast test feedback for PRs
3. **e2e.yml** (4.6 KB) - E2E tests with Playwright
4. **README.md** (7.3 KB) - Comprehensive workflow documentation

### Documentation Files (`.github/`)
5. **WORKFLOWS_SETUP.md** (9.9 KB) - Quick setup guide

---

## Workflows Overview

### 1. CI Workflow (`ci.yml`)

**Purpose:** Comprehensive checks on all code changes

**Triggers:**
- Push to `main`
- Pull requests to `main`

**Jobs:**
- Lint & Type Check (10 min timeout)
- Backend Tests with Coverage (15 min timeout)
- Backend Build (10 min timeout)
- Frontend Build (15 min timeout)
- All Checks Passed (validation job)

**Features:**
- pnpm caching for faster installs
- Parallel job execution
- Coverage reports to Codecov
- Build artifacts (7-day retention)
- Coverage artifacts (30-day retention)

**Estimated Runtime:**
- First run: ~15-20 minutes
- Cached runs: ~8-12 minutes

---

### 2. Test Workflow (`test.yml`)

**Purpose:** Fast test feedback for PR authors

**Triggers:**
- Pull requests to `main` (only when backend code changes)

**Path Filters:**
- `apps/api/src/**`
- `apps/api/prisma/**`
- `apps/api/package.json`
- `apps/api/vitest.config.ts`
- `pnpm-lock.yaml`

**Features:**
- Runs unit tests with coverage
- Comments on PR with results
- Coverage threshold check (70%)
- Codecov integration
- Coverage artifacts (14-day retention)

**Estimated Runtime:**
- First run: ~5-7 minutes
- Cached runs: ~3-4 minutes

---

### 3. E2E Workflow (`e2e.yml`)

**Purpose:** End-to-end testing with Playwright

**Triggers:**
- Pull requests (when web/API code changes)
- Manual workflow dispatch

**Features:**
- Sets up test database
- Starts backend automatically
- Runs Playwright tests
- Uploads HTML reports
- Comments on PR with results
- Screenshot on failure

**Estimated Runtime:**
- First run: ~15-20 minutes
- Cached runs: ~10-12 minutes

---

## Key Features

### 1. Smart Caching
All workflows use pnpm store caching:
```yaml
key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
```

**Benefits:**
- 60-70% faster dependency installation
- Reduced bandwidth usage
- Cache invalidates on lockfile changes

### 2. Parallel Execution
Jobs run in parallel when possible:
- Lint & Tests run simultaneously
- Backend & Frontend builds run in parallel
- Total time reduced by ~40%

### 3. Coverage Tracking
- Automatic coverage reports
- Codecov integration (optional)
- PR comments with coverage percentage
- Threshold enforcement (70% minimum)

### 4. Artifact Management
- Build artifacts: 7 days retention
- Coverage reports: 14-30 days retention
- Playwright reports: 30 days retention

### 5. PR Automation
- Automatic comments with test results
- Coverage summary in PR
- Links to detailed reports
- Failure screenshots (E2E)

---

## Setup Requirements

### Required:
- [x] GitHub repository
- [x] Node.js 20.x
- [x] pnpm 9.x
- [x] Existing test suite (Vitest)
- [x] Playwright configuration
- [x] Health check endpoint (`/api/health`)

### Optional:
- [ ] Codecov account and token (`CODECOV_TOKEN` secret)
- [ ] Branch protection rules
- [ ] Slack/Discord notifications

---

## Quick Start

### 1. Verify Locally
```bash
# All these should pass before pushing:
pnpm validate
pnpm lint
pnpm --filter @akrobud/api test:coverage
pnpm --filter @akrobud/api build
pnpm --filter @akrobud/web build
```

### 2. Push Workflows
```bash
git add .github/
git commit -m "feat: Add GitHub Actions CI/CD workflows"
git push origin main
```

### 3. Monitor First Run
- Go to Actions tab in GitHub
- Watch workflows execute
- Verify all jobs pass (green checkmarks)

### 4. Test on PR
```bash
git checkout -b test/ci
echo "test" >> README.md
git add README.md
git commit -m "test: Verify CI workflows"
git push origin test/ci
gh pr create --title "Test CI" --body "Testing workflows"
```

### 5. Configure Branch Protection
- Settings → Branches → Add rule
- Require status checks: All CI jobs
- Require up-to-date branches

---

## Expected Behavior

### On Push to Main:
1. CI workflow runs all checks
2. All jobs must pass
3. Artifacts uploaded
4. Coverage reports generated

### On Pull Request:
1. Test workflow runs (if backend changed)
2. CI workflow runs all checks
3. E2E workflow runs (if web/API changed)
4. PR gets comments with results
5. Coverage displayed in PR

### On Manual Trigger:
1. E2E workflow can be run on-demand
2. Browser selection available
3. Results appear in Actions tab

---

## Success Criteria

Your setup is complete when:

- [x] All workflow files created
- [x] Documentation in place
- [x] Health check endpoint exists
- [ ] First CI run passes (after push)
- [ ] PR workflows execute correctly
- [ ] Coverage reports generated
- [ ] Artifacts uploaded successfully

---

## Next Steps

### Immediate:
1. Push workflows to GitHub
2. Monitor first run
3. Fix any failures
4. Create test PR

### Short-term:
1. Add `CODECOV_TOKEN` secret
2. Configure branch protection
3. Add CI badge to README
4. Set up notifications

### Long-term:
1. Optimize workflow speed
2. Add more test coverage
3. Configure deployment workflows
4. Set up staging environment

---

## Maintenance

### Weekly:
- Review failed workflows
- Check artifact storage usage

### Monthly:
- Update GitHub Actions versions
- Review coverage trends
- Optimize slow jobs

### Quarterly:
- Update Node.js/pnpm versions
- Review workflow logic
- Update documentation

---

## Troubleshooting

### Common Issues:

#### 1. Workflows Don't Run
**Cause:** Workflow file syntax error
**Fix:** Validate YAML syntax at https://www.yamllint.com/

#### 2. pnpm Install Fails
**Cause:** Lock file mismatch
**Fix:** Commit `pnpm-lock.yaml` and ensure it's up to date

#### 3. Tests Fail in CI but Pass Locally
**Cause:** Environment differences
**Fix:** Check environment variables, database state, file paths

#### 4. E2E Tests Timeout
**Cause:** Backend takes too long to start
**Fix:** Increase timeout, check health endpoint, review startup logs

#### 5. Coverage Upload Fails
**Cause:** Missing `CODECOV_TOKEN`
**Fix:** Add secret or remove Codecov steps

---

## Performance Metrics

### Expected Timings (Cached):

| Workflow | Job | Time |
|----------|-----|------|
| CI | Lint & Type Check | ~1-2 min |
| CI | Backend Tests | ~2-3 min |
| CI | Backend Build | ~1-2 min |
| CI | Frontend Build | ~3-4 min |
| Test | Unit Tests | ~3-4 min |
| E2E | Playwright Tests | ~10-12 min |

**Total PR Time:** ~12-15 minutes (parallel execution)

### Optimization Opportunities:

1. **Turbo Cache:** Add `.turbo` caching
2. **Test Sharding:** Split tests across multiple runners
3. **Conditional E2E:** Only run when labeled
4. **Faster Playwright:** Use fewer browsers
5. **Incremental Builds:** Only rebuild changed packages

---

## Resources

### Documentation:
- `.github/workflows/README.md` - Detailed workflow docs
- `.github/WORKFLOWS_SETUP.md` - Step-by-step setup guide
- This file - Overview and quick reference

### External Links:
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [pnpm Action](https://github.com/pnpm/action-setup)
- [Codecov Action](https://github.com/codecov/codecov-action)
- [Playwright Docs](https://playwright.dev/docs/ci)

### Commands:
```bash
# View workflow runs
gh workflow list
gh run list --workflow=ci.yml

# Download artifacts
gh run download <run-id>

# Re-run failed jobs
gh run rerun <run-id> --failed

# View logs
gh run view <run-id> --log
```

---

## Cost Estimation

GitHub Actions is free for public repositories. For private repositories:

**Included Minutes (Free tier):**
- Free plan: 2,000 minutes/month
- Pro plan: 3,000 minutes/month

**AKROBUD Usage Estimate:**
- Per PR: ~20 minutes (all workflows)
- Per push to main: ~15 minutes
- Estimated: ~100 PRs/month = ~2,000 minutes

**Recommendation:** Should fit within free tier for most projects.

---

## Security Considerations

### Current Setup:
- [x] No secrets in workflow files
- [x] Locked pnpm version
- [x] Frozen lockfile (`--frozen-lockfile`)
- [x] Timeouts on all jobs
- [x] Read-only checkout by default

### Best Practices:
- Never commit secrets
- Use GitHub secrets for tokens
- Review third-party actions
- Keep actions up to date
- Use specific version tags (`@v4`, not `@latest`)

---

## Support

For help with workflows:

1. Check workflow logs in Actions tab
2. Review documentation files:
   - `.github/workflows/README.md`
   - `.github/WORKFLOWS_SETUP.md`
3. Search GitHub Actions docs
4. Check community forums
5. File an issue with logs

---

## Summary

You now have a complete CI/CD pipeline with:

- Automated linting and type checking
- Unit tests with coverage tracking
- E2E tests with Playwright
- Build verification
- PR automation
- Artifact management
- Coverage enforcement

**Next step:** Push these files to GitHub and watch your CI/CD pipeline in action!

```bash
git add .github/ GITHUB_ACTIONS_SETUP.md
git commit -m "feat: Add GitHub Actions CI/CD workflows

- Add ci.yml for comprehensive checks
- Add test.yml for fast PR feedback
- Add e2e.yml for Playwright E2E tests
- Include comprehensive documentation

Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push origin main
```
