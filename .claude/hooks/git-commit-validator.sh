#!/bin/bash

# Git Commit Validator - validates commits before execution
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

./node_modules/.bin/tsx git-commit-validator.ts