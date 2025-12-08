#!/bin/bash

# Codebase Map Generator - creates project overview at session start
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

./node_modules/.bin/tsx codebase-map.ts
