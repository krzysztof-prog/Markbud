# Claude Code Hooks - AKROBUD

Kompletny zestaw hooków dla projektu AKROBUD.

---

## 📋 Przegląd Hooków

### SessionStart (na starcie sesji)

| Hook | Cel |
|------|-----|
| **codebase-map** | Generuje mapę projektu: struktura, tech stack, git status, Prisma schema |

### UserPromptSubmit (przed przetworzeniem promptu)

| Hook | Cel |
|------|-----|
| **session-context-loader** | Ładuje CLAUDE.md, README.md, anti-patterns.md (tylko raz na sesję) |
| **skill-activation-prompt** | Auto-aktywuje skills na podstawie promptu |

### PreToolUse (przed wykonaniem narzędzia)

| Hook | Matcher | Cel |
|------|---------|-----|
| **prisma-safety-guard** | Bash | Blokuje niebezpieczne komendy Prisma (`migrate reset`, `db push`) |
| **pnpm-enforcer** | Bash | Konwertuje `npm` → `pnpm`, blokuje `yarn` |
| **git-commit-validator** | Bash | Sprawdza TypeScript, linting przed commitem |
| **tdd-guard** | Write/Edit | Wymusza TDD - blokuje kod bez failing testu (domyślnie OFF) |

### PostToolUse (po wykonaniu narzędzia)

| Hook | Matcher | Cel |
|------|---------|-----|
| **post-tool-use-tracker** | Edit/Write | Śledzi edytowane pliki i repos |
| **post-edit-checks** | Edit/Write | TypeScript check, security scan, commit reminder |

### Notification (powiadomienia)

| Hook | Cel |
|------|-----|
| **notification-handler** | Desktop notifications, webhook Slack/Discord, logowanie |

### Stop (przed zakończeniem sesji)

| Hook | Cel |
|------|-----|
| **final-validation** | TypeScript check, uncommitted files warning, critical TODOs |

---

## 🚀 Aktywacja

Wszystkie hooki są już skonfigurowane w [.claude/settings.json](../.claude/settings.json).

**Wymagania:**
- Node.js + npm/pnpm
- Zainstalowane zależności w `.claude/hooks/`:

```bash
cd .claude/hooks
npm install
```

---

## 🔧 Konfiguracja

### 1. Prisma Safety Guard

**Domyślnie:** Blokuje `prisma migrate reset`, `prisma db push`

**Auto-backup:** Tworzy backup SQLite przed migracjami

### 2. pnpm Enforcer

**Konwersje:**
- `npm install` → `pnpm install`
- `npm run build` → `pnpm build`
- `npm add` → `pnpm add`

**Blokuje:** `yarn` (exit code 2)

### 3. Git Commit Validator

**Sprawdza:**
- TypeScript compilation (`pnpm exec tsc --noEmit`)
- ESLint (jeśli `lint-staged` dostępne)
- Conventional commit format (warn only)

**Nie blokuje:** tylko ostrzeżenia dla non-conventional commits

### 4. TDD Guard

**Domyślnie:** OFF (nie blokuje)

**Włączenie:** Ustaw w session state:
```json
// .claude/.session-state/tdd-<session-id>.json
{
  "tddEnabled": true
}
```

**Zasada:** Wymaga failing testu przed implementacją

### 5. Notification Handler

**Desktop notifications:** Windows (PowerShell), macOS (osascript), Linux (notify-send)

**Webhook:** Ustaw `CLAUDE_WEBHOOK_URL` w environment:
```bash
export CLAUDE_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

### 6. Codebase Map

**Generuje:**
- Project info (package.json)
- Tech stack (Fastify, Next.js, Prisma, etc.)
- Git status + recent commits
- Prisma schema overview (modele)
- Directory structure (max depth: 3)

### 7. Final Validation (Stop Hook)

**Sprawdza:**
- TypeScript compilation (apps/api, apps/web)
- Uncommitted changes
- Critical TODOs (FIXME, HACK, XXX)
- console.log w staged files (warning)

**Build check:** Zakomentowany domyślnie (wolny), odkomentuj w `final-validation.ts`

---

## 📊 Cost Tracker (opcjonalnie)

**Instalacja:** Zobacz [COST_TRACKER_SETUP.md](./COST_TRACKER_SETUP.md)

```bash
# Globalnie
pnpm add -g @ryoppippi/ccusage

# Uruchom
ccusage --daily
ccusage --live
```

---

## 🧪 Testowanie Hooków

```bash
cd .claude/hooks

# Test Prisma Safety Guard
echo '{"tool_name":"Bash","tool_input":{"command":"prisma migrate reset"},"session_id":"test"}' | ./node_modules/.bin/tsx prisma-safety-guard.ts

# Test pnpm Enforcer
echo '{"tool_name":"Bash","tool_input":{"command":"npm install"},"session_id":"test"}' | ./node_modules/.bin/tsx pnpm-enforcer.ts

# Test Session Context Loader
echo '{"session_id":"test-123","transcript_path":"/tmp","cwd":"'$(pwd)/../..'","permission_mode":"default","prompt":"test"}' | ./node_modules/.bin/tsx session-context-loader.ts
```

---

## 🔒 Bezpieczeństwo

### Blokowane operacje:
- `prisma migrate reset` (kasuje wszystkie dane)
- `prisma db push` (nadpisuje bez migracji)
- `yarn` w projekcie pnpm (lockfile corruption)

### Ostrzeżenia:
- Uncommitted changes przed Stop
- console.log w production code
- Non-conventional commit messages

---

## 📁 Struktura Plików

```
.claude/hooks/
├── README.md                       # Ten plik
├── COST_TRACKER_SETUP.md           # Dokumentacja ccusage
│
├── session-context-loader.ts/sh    # UserPromptSubmit
├── skill-activation-prompt.ts/sh   # UserPromptSubmit
│
├── prisma-safety-guard.ts/sh       # PreToolUse (Bash)
├── pnpm-enforcer.ts/sh             # PreToolUse (Bash)
├── git-commit-validator.ts/sh      # PreToolUse (Bash)
├── tdd-guard.ts/sh                 # PreToolUse (Write/Edit)
│
├── post-tool-use-tracker.sh        # PostToolUse
├── post-edit-checks.ts/sh          # PostToolUse
│
├── notification-handler.ts/sh      # Notification
├── final-validation.ts/sh          # Stop
├── codebase-map.ts/sh              # SessionStart
│
├── package.json                    # Dependencies
└── node_modules/                   # tsx, typescript, @types/node
```

---

## 🎯 Tips & Tricks

### Wyłączenie TDD Guard

TDD Guard jest domyślnie wyłączony. Jeśli chcesz go włączyć na stałe, dodaj do session state:

```bash
mkdir -p .claude/.session-state
echo '{"tddEnabled":true}' > .claude/.session-state/tdd-default.json
```

### Wyłączenie konkretnego hooka tymczasowo

Edytuj `.claude/settings.json` i zakomentuj hook:

```json
// "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/prisma-safety-guard.sh"
```

### Debug hooków

Wszystkie hooki logują błędy do stderr. Sprawdź output w konsoli Claude Code.

### Custom webhook dla notyfikacji

```bash
# Slack
export CLAUDE_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK"

# Discord
export CLAUDE_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR/WEBHOOK"
```

---

## 🐛 Troubleshooting

### Hook się nie uruchamia

1. Sprawdź czy `node_modules` są zainstalowane:
   ```bash
   cd .claude/hooks && npm install
   ```

2. Sprawdź uprawnienia plików `.sh`:
   ```bash
   chmod +x .claude/hooks/*.sh
   ```

3. Sprawdź logi Claude Code

### TypeScript błędy w hookach

```bash
cd .claude/hooks
pnpm exec tsc --noEmit
```

### Windows: PowerShell script execution policy

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## 📚 Źródła i Inspiracje

- [Claude Code Hooks Documentation](https://docs.claude.com/hooks)
- [disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery)
- [carlrannaberg/claudekit](https://github.com/carlrannaberg/claudekit)
- [nizos/tdd-guard](https://github.com/nizos/tdd-guard)
- [ryoppippi/ccusage](https://github.com/ryoppippi/ccusage)

---

**Wersja:** 1.0
**Data:** 2025-12-08
**Projekt:** AKROBUD