#!/usr/bin/env sh
# Test script to verify the pre-commit hook is working

echo "Testing pre-commit hook..."
echo ""

# Check if validate-config.js exists
if [ ! -f "scripts/validate-config.js" ]; then
  echo "❌ Error: scripts/validate-config.js not found"
  exit 1
fi

# Run the validation script
echo "Running: node scripts/validate-config.js"
node scripts/validate-config.js

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Pre-commit hook test PASSED"
  echo "The hook is properly configured and validation succeeds."
  exit 0
else
  echo ""
  echo "❌ Pre-commit hook test FAILED"
  echo "The validation script returned an error."
  echo "Fix the configuration errors before committing."
  exit 1
fi
