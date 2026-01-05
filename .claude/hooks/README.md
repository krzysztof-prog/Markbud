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
| **intent-scope-action-validator** | Sprawdza czy zadanie ma INTENT → SCOPE → ACTION (⚠️ WARNING) |

### PreToolUse (przed wykonaniem narzędzia)

| Hook | Matcher | Cel |
|------|---------|-----|
| **npm-guard** | Bash | Blokuje npm/yarn w projekcie pnpm (🛑 BLOKUJE) |
| **prisma-safety-guard** | Bash | Blokuje niebezpieczne komendy Prisma (`migrate reset`, `db push`) |
| **pnpm-enforcer** | Bash | Konwertuje `npm` → `pnpm`, blokuje `yarn` |
| **git-commit-validator** | Bash | Sprawdza TypeScript, linting przed commitem |
| **money-validator** | Write/Edit | Blokuje parseFloat/toFixed na valuePln/valueEur (🛑 BLOKUJE) |
| **tdd-guard** | Write/Edit | Wymusza TDD - blokuje kod bez failing testu (domyślnie OFF) |
| **assumption-disclosure-guard** | Write/Edit | Wykrywa magiczne liczby bez komentarzy (⚠️ WARNING) |
| **no-code-before-decision-guard** | Write/Edit | Blokuje kod w business logic jeśli NIE było pytania (🛑 BLOKUJE) |
| **change-impact-matrix-validator** | Write/Edit | Wykrywa ripple effects (types, API, schema) (⚠️ WARNING) |

### PostToolUse (po wykonaniu narzędzia)

| Hook | Matcher | Cel |
|------|---------|-----|
| **post-tool-use-tracker** | Edit/Write | Śledzi edytowane pliki i repos |
| **post-edit-checks** | Edit/Write | TypeScript check, security scan, commit reminder |
| **self-review-gate** | Edit/Write | Checklist samooceny (INTENT? YAGNI? COMMON_MISTAKES?) (ℹ️ INFO) |

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

### 1. Intent-Scope-Action Validator

**Typ:** UserPromptSubmit (⚠️ WARNING)

**Cel:** Wymusza jasny INTENT → SCOPE → ACTION przed rozpoczęciem pracy

**Jak działa:**
- Wykrywa triggery: "dodaj", "zmień", "usuń", "zrefaktoruj"
- Sprawdza czy prompt ma:
  - **INTENT** - Po co? (żeby użytkownik mógł...)
  - **SCOPE** - Co konkretnie? (w pliku X, endpoint Y)
  - **ACTION** - Jak? (krok 1, 2, 3)
- Jeśli brak - pokazuje reminder (nie blokuje)

**Przykład:**
```
User: "Dodaj przycisk usuń"

Hook: 💡 REMINDER
"Rozważ dodanie:
 🎯 INTENT: Żeby użytkownik mógł...
 📦 SCOPE: W komponencie X
 ⚡ ACTION: 1. Dodaj button, 2. Handler, 3. API"
```

### 2. NPM Guard

**Typ:** PreToolUse Bash (🛑 BLOKUJE)

**Cel:** Blokuje npm/yarn w projekcie pnpm

**Blokuje:**
- `npm install`, `npm add`, `npm run`
- `yarn add`, `yarn install`

**Pokazuje poprawną komendę:**
```
❌ npm install lodash
✅ pnpm add lodash
```

### 3. Money Validator

**Typ:** PreToolUse Write/Edit (🛑 BLOKUJE)

**Cel:** Blokuje niebezpieczne operacje na kwotach

**Blokowane patterny:**
- `parseFloat(order.valuePln)` → "Użyj groszeToPln()"
- `valuePln.toFixed(2)` → "Użyj formatPln()"
- `valuePln / 100` → "Użyj groszeToPln()"
- `valuePln * 100` → "Użyj plnToGrosze()"

**Dlaczego:** Baza przechowuje grosze (integer), nie złotówki!

### 4. Assumption Disclosure Guard

**Typ:** PreToolUse Write/Edit (⚠️ WARNING)

**Cel:** Wykrywa założenia które powinny być wyjaśnione

**Wykrywa:**
- Magic numbers: `const limit = 100;` (bez komentarza)
- Timeouts: `setTimeout(fn, 3000)` (bez wyjaśnienia)
- Hardcoded roles: `if (role === 'admin')` (bez kontekstu)
- Slice bez wyjaśnienia: `.slice(0, 10)` (dlaczego 10?)

**Sugestia:** Dodaj komentarz wyjaśniający INTENCJĘ

### 5. No Code Before Decision Guard

**Typ:** PreToolUse Write/Edit (🛑 BLOKUJE dla business logic)

**Cel:** Wymusza HARD STOP RULE dla logiki biznesowej

**Aktywuje się dla:**
- `handlers/`, `services/`, `validators/`, `routes/`

**Blokuje gdy:**
- NIE było pytania do użytkownika (brak `?` w konwersacji)
- NIE było potwierdzenia użytkownika

**HARD STOP RULE:**
1. ⏸️ ZATRZYMAĆ SIĘ
2. ❓ ZADAĆ PYTANIA
3. 🔀 ZAPROPONOWAĆ OPCJE
4. ⏳ CZEKAĆ NA WYBÓR

### 6. Change Impact Matrix Validator

**Typ:** PreToolUse Write/Edit (⚠️ WARNING)

**Cel:** Wykrywa zmiany które mogą mieć ripple effect

**Wykrywa zmiany w:**
- TypeScript types/interfaces (wpływ na wszystkie importy)
- Exported API (wpływ na wszystkich użytkowników)
- Prisma models (wpływ na migracje + queries)
- API endpoints (wpływ na frontend)
- Zod schemas (wpływ na walidację)

**Sugestia:** Sprawdź Grep/Glob jakie pliki będą dotknięte

### 7. Self-Review Gate

**Typ:** PostToolUse Write/Edit (ℹ️ INFO)

**Cel:** Checklist samooceny po zapisie kodu

**5 pytań:**
1. **INTENT** - Czy to odpowiada na zadanie?
2. **YAGNI** - Czy nie za-engineerowałem?
3. **COMMON_MISTAKES** - Czy złamałem zasady?
4. **ARCHITECTURE** - Czy zgodne ze standardami?
5. **RIPPLE EFFECTS** - Czy coś się zepsuje?

**Nie blokuje** - to reminder przed przejściem dalej

---

### 8. Prisma Safety Guard

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

## 📊 Podsumowanie Hooków

**Automatyczne blokady (🛑 CRITICAL):**
1. npm-guard - Blokuje npm/yarn
2. money-validator - Blokuje parseFloat na kwotach
3. no-code-before-decision-guard - Blokuje kod bez pytań (business logic)

**Ostrzeżenia (⚠️ WARNING):**
1. intent-scope-action-validator - Przypomina o strukturze zadania
2. assumption-disclosure-guard - Przypomina o komentarzach
3. change-impact-matrix-validator - Przypomina o ripple effects

**Informacyjne (ℹ️ INFO):**
1. self-review-gate - Checklist samooceny

**Całkowita liczba hooków:** 12 (7 nowych + 5 istniejących)

---

**Wersja:** 2.0 (+ 5 nowych quality guards)
**Data:** 2026-01-03
**Projekt:** AKROBUD