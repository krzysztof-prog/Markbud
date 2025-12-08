#!/bin/bash

# pnpm Enforcer - converts npm commands to pnpm
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

./node_modules/.bin/tsx pnpm-enforcer.ts
