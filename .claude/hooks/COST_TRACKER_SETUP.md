# Cost Tracker Setup - ccusage

## Instalacja

**ccusage** to narzędzie do śledzenia zużycia tokenów i kosztów Claude Code.

### Metoda 1: Instalacja globalna (zalecane)

```bash
# Instalacja via npm/pnpm
pnpm add -g @ryoppippi/ccusage

# Lub via Homebrew (macOS/Linux)
brew install ryoppippi/tap/ccusage
```

### Metoda 2: npx (bez instalacji)

```bash
npx @ryoppippi/ccusage
```

---

## Komendy

```bash
# Pokaż użycie tokenów
ccusage

# Dzienny raport
ccusage --daily

# Miesięczny raport
ccusage --monthly

# Live monitoring
ccusage --live

# Szczegółowy raport sesji
ccusage --session <session-id>

# Integracja ze statusline (Claude Code Beta)
ccusage --statusline
```

---

## Funkcjonalności

| Funkcja | Opis |
|---------|------|
| **Dzienny raport** | Zużycie tokenów w ciągu dnia |
| **Miesięczny raport** | Podsumowanie miesięczne |
| **5-Hour billing window** | Śledzi okna rozliczeniowe |
| **Token burn rate** | Projekcja zużycia |
| **Live dashboard** | Monitoring w czasie rzeczywistym |
| **MCP integration** | Integracja z MCP serverem |

---

## Przykładowy output

```
┌─────────────────────────────────────────────┐
│  Claude Code Usage Report - Today           │
├─────────────────────────────────────────────┤
│  Input tokens:     150,000                  │
│  Output tokens:     45,000                  │
│  Total tokens:     195,000                  │
│  Estimated cost:    $5.85                   │
│                                             │
│  Sessions:          3                       │
│  Active time:       2h 15m                  │
│  Burn rate:         ~86k tokens/hour        │
└─────────────────────────────────────────────┘
```

---

## Integracja z Claude Code

### Opcja 1: MCP Server (zalecane)

Dodaj do `.claude/settings.json`:

```json
{
  "mcpServers": {
    "ccusage": {
      "command": "ccusage",
      "args": ["--mcp"]
    }
  }
}
```

### Opcja 2: Hook (monitoring)

Dodaj do `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "ccusage --summary"
          }
        ]
      }
    ]
  }
}
```

---

## Progi alertów

Dodaj do `~/.config/ccusage/config.json`:

```json
{
  "alerts": {
    "dailyTokenLimit": 200000,
    "monthlyCostLimit": 150,
    "burnRateThreshold": 100000
  }
}
```

---

## Źródła

- GitHub: https://github.com/ryoppippi/ccusage
- Dokumentacja: https://github.com/ryoppippi/ccusage#readme
