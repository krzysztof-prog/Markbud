#!/bin/bash

# Simple wrapper that passes stdin directly to TypeScript
# This script runs in the hooks directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Use local npx to run tsx
./node_modules/.bin/tsx skill-activation-prompt.ts
