#!/bin/bash

# TDD Guard - enforces Test-Driven Development
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

./node_modules/.bin/tsx tdd-guard.ts
