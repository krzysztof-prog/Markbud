#!/bin/bash

# Session Context Loader Hook Wrapper
# Automatically loads project documentation at session start
# Files: CLAUDE.md, README.md, docs/guides/anti-patterns.md

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Use local npx to run tsx
./node_modules/.bin/tsx session-context-loader.ts
