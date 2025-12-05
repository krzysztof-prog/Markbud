#!/bin/bash

# Wrapper script for post-edit-checks.ts
# Runs TypeScript hook using tsx

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Run the TypeScript hook
./node_modules/.bin/tsx post-edit-checks.ts
