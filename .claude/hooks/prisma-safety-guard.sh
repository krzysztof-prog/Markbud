#!/bin/bash

# Prisma Safety Guard - blocks dangerous Prisma commands
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

./node_modules/.bin/tsx prisma-safety-guard.ts
