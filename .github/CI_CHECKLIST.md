# GitHub Actions CI/CD - Pre-Push Checklist

Use this checklist before pushing workflows to GitHub.

## Files Created

- [x] `.github/workflows/ci.yml` - Main CI pipeline
- [x] `.github/workflows/test.yml` - Fast test feedback
- [x] `.github/workflows/e2e.yml` - E2E tests with Playwright
- [x] `.github/workflows/README.md` - Workflow documentation
- [x] `.github/WORKFLOWS_SETUP.md` - Setup guide
- [x] `GITHUB_ACTIONS_SETUP.md` - Summary document
- [x] `scripts/validate-ci.sh` - Validation script

## Pre-Push Validation

### 1. Local Environment

- [ ] Node.js 20.x or higher installed
- [ ] pnpm 9.x or higher installed
- [ ] Git repository initialized
- [ ] On the correct branch (usually `main` or feature branch)

**Check:**
```bash
node --version  # Should be v20.x.x or higher
pnpm --version  # Should be 9.x.x or higher
git branch --show-current
```

---

### 2. Dependencies

- [ ] All dependencies installed
- [ ] pnpm lockfile is up to date
- [ ] No dependency warnings or errors

**Check:**
```bash
pnpm install
# Should complete without errors
```

---

### 3. Linting & Type Checking

- [ ] ESLint passes
- [ ] TypeScript type checking passes
- [ ] No console errors or warnings

**Check:**
```bash
pnpm lint
cd apps/api && pnpm typecheck
```

---

### 4. Tests

- [ ] Backend unit tests pass
- [ ] All tests complete without errors
- [ ] Coverage meets threshold (70%+)

**Check:**
```bash
cd apps/api
pnpm test:coverage
# Check that all tests pass
# Check coverage percentage
```

---

### 5. Builds

- [ ] Backend builds successfully
- [ ] Frontend builds successfully
- [ ] No build errors or warnings

**Check:**
```bash
# Backend
cd apps/api
pnpm build

# Frontend
cd apps/web
pnpm build
```

---

### 6. Configuration

- [ ] `scripts/validate-config.js` exists
- [ ] Configuration validation passes
- [ ] Environment variables documented

**Check:**
```bash
pnpm validate
# Should complete without errors
```

---

### 7. E2E Tests (Optional but Recommended)

- [ ] Playwright installed
- [ ] E2E tests pass locally
- [ ] No failing tests

**Check:**
```bash
cd apps/web
pnpm exec playwright install chromium
pnpm test:e2e
```

---

### 8. Health Check Endpoint

- [ ] `/api/health` endpoint exists
- [ ] Endpoint returns correct response
- [ ] Backend starts successfully

**Check:**
```bash
# Start backend
cd apps/api
pnpm dev

# In another terminal:
curl http://localhost:3001/api/health
# Should return: {"status":"ok","timestamp":"...","uptime":...}
```

---

### 9. Workflow Files

- [ ] All `.yml` files are valid YAML
- [ ] No syntax errors
- [ ] Indentation is correct (2 spaces)

**Check:**
```bash
# Validate YAML syntax
# Visit: https://www.yamllint.com/
# Or use: yamllint .github/workflows/*.yml
```

---

### 10. Git Status

- [ ] All workflow files are staged
- [ ] Commit message prepared
- [ ] No sensitive data in files (tokens, passwords)

**Check:**
```bash
git status
git diff --cached .github/

# Make sure no secrets are committed:
grep -r "token\|password\|secret" .github/workflows/
```

---

## Optional Setup

### 1. Codecov (Recommended)

- [ ] Codecov account created
- [ ] Repository added to Codecov
- [ ] Upload token obtained
- [ ] `CODECOV_TOKEN` secret added to GitHub

**Setup:**
1. Go to https://codecov.io/
2. Sign in with GitHub
3. Add repository
4. Copy upload token
5. Add as secret: Settings → Secrets → New repository secret

---

### 2. Branch Protection (Recommended)

- [ ] Branch protection rule created for `main`
- [ ] Required status checks configured
- [ ] "Require branches to be up to date" enabled

**Setup:**
1. Go to Settings → Branches
2. Add rule for `main`
3. Enable "Require status checks to pass"
4. Select all CI jobs
5. Save changes

---

### 3. Notifications (Optional)

- [ ] Email notifications configured
- [ ] Slack/Discord webhook set up (optional)

**Setup:**
1. GitHub → Settings → Notifications
2. Enable Actions notifications
3. Configure delivery preferences

---

## Pre-Commit Checklist

Before committing:

```bash
# 1. Review changes
git status
git diff .github/

# 2. Add files
git add .github/ GITHUB_ACTIONS_SETUP.md

# 3. Verify what will be committed
git diff --cached --name-only

# 4. Commit with descriptive message
git commit -m "feat: Add GitHub Actions CI/CD workflows

- Add ci.yml for comprehensive checks
- Add test.yml for fast PR feedback
- Add e2e.yml for Playwright E2E tests
- Include documentation and setup guides

Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Pre-Push Checklist

Before pushing:

```bash
# 1. Check commit history
git log -1 --pretty=oneline

# 2. Verify branch
git branch --show-current

# 3. Check remote
git remote -v

# 4. Push to GitHub
git push origin main

# Or for feature branch:
# git push origin your-feature-branch
```

---

## Post-Push Verification

After pushing to GitHub:

### Immediate (within 5 minutes):

- [ ] Go to Actions tab
- [ ] Verify CI workflow started
- [ ] Check job progress
- [ ] No immediate failures

**Check:**
Visit: `https://github.com/YOUR_USERNAME/AKROBUD/actions`

---

### Within 15-20 minutes:

- [ ] All jobs completed
- [ ] All jobs passed (green checkmarks)
- [ ] Artifacts uploaded
- [ ] No errors in logs

**If failures occur:**
1. Click on failed job
2. Read error logs
3. Fix locally
4. Push fix
5. Verify new run passes

---

### Within 1 hour:

- [ ] Create test PR
- [ ] Verify PR workflows run
- [ ] Check PR comments
- [ ] Verify coverage reports

**Test PR:**
```bash
git checkout -b test/ci-workflows
echo "test" >> README.md
git add README.md
git commit -m "test: Verify CI workflows"
git push origin test/ci-workflows
gh pr create --title "Test CI" --body "Testing workflows"
```

---

## Common Issues & Solutions

### Issue 1: Workflows Don't Appear
**Cause:** YAML syntax error
**Solution:**
- Validate YAML at https://www.yamllint.com/
- Check indentation (must be 2 spaces)
- Ensure file is in `.github/workflows/`

### Issue 2: pnpm Install Fails
**Cause:** Lockfile not committed or out of date
**Solution:**
```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: Update lockfile"
git push
```

### Issue 3: Tests Fail in CI
**Cause:** Environment differences
**Solution:**
- Check Node.js version matches (20.x)
- Verify all dependencies installed
- Check for missing environment variables
- Review test database setup

### Issue 4: Build Fails
**Cause:** Missing files or environment variables
**Solution:**
- Verify all source files committed
- Check `tsconfig.json` exists
- Add required env vars to workflow

### Issue 5: E2E Tests Timeout
**Cause:** Backend doesn't start
**Solution:**
- Verify health endpoint exists
- Check database migrations
- Increase timeout in workflow
- Review backend logs

---

## Emergency Rollback

If workflows break production:

```bash
# 1. Revert commit
git revert HEAD

# 2. Push immediately
git push origin main

# 3. Fix locally
# (make changes)

# 4. Test thoroughly
pnpm validate
pnpm lint
pnpm test

# 5. Push fix
git add .
git commit -m "fix: Resolve CI workflow issues"
git push origin main
```

---

## Success Criteria

Your CI/CD setup is successful when:

- [x] Workflows created and documented
- [ ] All local checks pass
- [ ] First push triggers CI
- [ ] All CI jobs pass
- [ ] PR workflows execute correctly
- [ ] Coverage reports generated
- [ ] No errors in logs
- [ ] Team can create PRs successfully

---

## Next Steps After Success

1. **Update README**
   ```markdown
   ## CI/CD Status
   ![CI](https://github.com/YOUR_USERNAME/AKROBUD/workflows/CI/badge.svg)
   ```

2. **Configure Branch Protection**
   - Require CI to pass
   - Require up-to-date branches

3. **Set Up Codecov**
   - Add token
   - Enable PR comments

4. **Optimize Workflows**
   - Add Turbo cache
   - Reduce timeout if possible
   - Add matrix testing (optional)

5. **Train Team**
   - Share documentation
   - Explain workflow process
   - Set expectations for PR reviews

---

## Validation Script

Run the automated validation:

```bash
# Make executable
chmod +x scripts/validate-ci.sh

# Run validation
./scripts/validate-ci.sh

# Or directly with bash
bash scripts/validate-ci.sh
```

Expected output: All checks should pass with green checkmarks.

---

## Final Checklist

Before marking this setup as complete:

- [ ] All files created
- [ ] Local validation passes
- [ ] Workflows pushed to GitHub
- [ ] First CI run successful
- [ ] Test PR created and passed
- [ ] Documentation reviewed
- [ ] Team notified
- [ ] Branch protection enabled
- [ ] Codecov configured (optional)
- [ ] This checklist completed

---

**Status:** Ready to push to GitHub!

**Estimated setup time:** 30-45 minutes (first time)

**Support:** See `.github/workflows/README.md` and `.github/WORKFLOWS_SETUP.md`
