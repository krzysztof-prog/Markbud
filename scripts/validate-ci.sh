#!/bin/bash

# Validation script for GitHub Actions CI/CD setup
# Run this before pushing workflows to GitHub

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "GitHub Actions CI/CD Validation"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counters
PASSED=0
FAILED=0
WARNINGS=0

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $2"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $2"
    echo "   Missing: $1"
    ((FAILED++))
  fi
}

check_command() {
  if command -v "$1" &> /dev/null; then
    echo -e "${GREEN}✓${NC} $2 ($(command -v $1))"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $2"
    echo "   Please install: $1"
    ((FAILED++))
  fi
}

check_warning() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $2"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} $2 (optional)"
    echo "   Missing: $1"
    ((WARNINGS++))
  fi
}

echo "1. Checking workflow files..."
echo "----------------------------"
check_file "$PROJECT_ROOT/.github/workflows/ci.yml" "CI workflow exists"
check_file "$PROJECT_ROOT/.github/workflows/test.yml" "Test workflow exists"
check_file "$PROJECT_ROOT/.github/workflows/e2e.yml" "E2E workflow exists"
check_file "$PROJECT_ROOT/.github/workflows/README.md" "Workflow documentation exists"
echo ""

echo "2. Checking documentation..."
echo "----------------------------"
check_file "$PROJECT_ROOT/.github/WORKFLOWS_SETUP.md" "Setup guide exists"
check_file "$PROJECT_ROOT/GITHUB_ACTIONS_SETUP.md" "Summary document exists"
echo ""

echo "3. Checking required tools..."
echo "----------------------------"
check_command "node" "Node.js installed"
check_command "pnpm" "pnpm installed"
check_command "git" "Git installed"
echo ""

echo "4. Checking Node.js version..."
echo "----------------------------"
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 20 ]; then
  echo -e "${GREEN}✓${NC} Node.js version: v$(node --version | cut -d'v' -f2) (>= 20.x required)"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Node.js version: v$(node --version | cut -d'v' -f2) (>= 20.x required)"
  echo "   Please upgrade to Node.js 20.x or higher"
  ((FAILED++))
fi
echo ""

echo "5. Checking pnpm version..."
echo "----------------------------"
PNPM_VERSION=$(pnpm --version | cut -d'.' -f1)
if [ "$PNPM_VERSION" -ge 8 ]; then
  echo -e "${GREEN}✓${NC} pnpm version: $(pnpm --version) (>= 8.x required)"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} pnpm version: $(pnpm --version) (>= 8.x required)"
  echo "   Please upgrade to pnpm 8.x or higher"
  ((FAILED++))
fi
echo ""

echo "6. Checking project structure..."
echo "----------------------------"
check_file "$PROJECT_ROOT/package.json" "Root package.json exists"
check_file "$PROJECT_ROOT/pnpm-lock.yaml" "pnpm lockfile exists"
check_file "$PROJECT_ROOT/apps/api/package.json" "API package.json exists"
check_file "$PROJECT_ROOT/apps/web/package.json" "Web package.json exists"
echo ""

echo "7. Checking test configuration..."
echo "----------------------------"
check_file "$PROJECT_ROOT/apps/api/vitest.config.ts" "Vitest config exists"
check_file "$PROJECT_ROOT/apps/web/playwright.config.ts" "Playwright config exists"
echo ""

echo "8. Checking scripts..."
echo "----------------------------"
check_file "$PROJECT_ROOT/scripts/validate-config.js" "Config validation script exists"
echo ""

echo "9. Checking health endpoint..."
echo "----------------------------"
if grep -q "'/api/health'" "$PROJECT_ROOT/apps/api/src/index.ts" 2>/dev/null; then
  echo -e "${GREEN}✓${NC} Health check endpoint found in index.ts"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠${NC} Health check endpoint not found"
  echo "   E2E tests may fail to verify backend startup"
  ((WARNINGS++))
fi
echo ""

echo "10. Running package.json checks..."
echo "----------------------------"
cd "$PROJECT_ROOT"

# Check if all required scripts exist
REQUIRED_SCRIPTS=("validate" "lint" "build" "test:e2e")
for script in "${REQUIRED_SCRIPTS[@]}"; do
  if pnpm run --silent --dry-run "$script" &>/dev/null; then
    echo -e "${GREEN}✓${NC} Script '$script' exists"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Script '$script' missing"
    ((FAILED++))
  fi
done
echo ""

echo "11. Optional: Codecov setup..."
echo "----------------------------"
if [ -n "$CODECOV_TOKEN" ]; then
  echo -e "${GREEN}✓${NC} CODECOV_TOKEN environment variable set"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠${NC} CODECOV_TOKEN not set (optional)"
  echo "   Coverage will be uploaded as artifacts only"
  echo "   To enable Codecov: export CODECOV_TOKEN=your-token"
  ((WARNINGS++))
fi
echo ""

echo "12. Checking git repository..."
echo "----------------------------"
if git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Git repository initialized"
  ((PASSED++))

  # Check if on a branch
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
  if [ -n "$CURRENT_BRANCH" ]; then
    echo -e "${GREEN}✓${NC} Current branch: $CURRENT_BRANCH"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} Not on a branch (detached HEAD)"
    ((WARNINGS++))
  fi

  # Check for uncommitted changes in .github/
  if git diff --quiet .github/ && git diff --cached --quiet .github/ 2>/dev/null; then
    echo -e "${GREEN}✓${NC} No uncommitted changes in .github/"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} Uncommitted changes in .github/"
    echo "   Remember to commit workflow files before pushing"
    ((WARNINGS++))
  fi
else
  echo -e "${RED}✗${NC} Not a git repository"
  ((FAILED++))
fi
echo ""

echo "========================================="
echo "Validation Summary"
echo "========================================="
echo ""
echo -e "${GREEN}Passed:${NC} $PASSED"
if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
fi
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Failed:${NC} $FAILED"
fi
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}=========================================${NC}"
  echo -e "${GREEN}✓ All checks passed!${NC}"
  echo -e "${GREEN}=========================================${NC}"
  echo ""
  echo "You're ready to push the workflows to GitHub!"
  echo ""
  echo "Next steps:"
  echo "1. Commit the workflow files:"
  echo "   git add .github/ GITHUB_ACTIONS_SETUP.md"
  echo "   git commit -m 'feat: Add GitHub Actions CI/CD workflows'"
  echo ""
  echo "2. Push to GitHub:"
  echo "   git push origin main"
  echo ""
  echo "3. Monitor the first run:"
  echo "   Visit: https://github.com/YOUR_USERNAME/AKROBUD/actions"
  echo ""

  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Note: There are $WARNINGS warnings, but they won't prevent CI from working.${NC}"
    echo ""
  fi

  exit 0
else
  echo -e "${RED}=========================================${NC}"
  echo -e "${RED}✗ Validation failed with $FAILED error(s)${NC}"
  echo -e "${RED}=========================================${NC}"
  echo ""
  echo "Please fix the errors above before pushing to GitHub."
  echo ""
  exit 1
fi
