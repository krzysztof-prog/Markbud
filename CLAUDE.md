# AKROBUD - Kontekst projektu dla Claude

> ## BAZA PRODUKCYJNA - UWAGA!
> **Ten projekt działa na BAZIE PRODUKCYJNEJ (prod.db).** Ścieżka sieciowa: `\\MARKBUD-HV\MarkBud-Prog`
> - NIE wykonuj destrukcyjnych operacji na bazie bez potwierdzenia użytkownika
> - NIGDY `db:push` — tylko `db:migrate`
> - Traktuj KAŻDĄ zmianę jako zmianę produkcyjną

## Referencje (przeczytaj przed szukaniem)
| Potrzebujesz | Plik |
|---|---|
| Podstawy projektu | [README.md](README.md) |
| Co robi każdy moduł | [BUSINESS_CONTEXT.md](BUSINESS_CONTEXT.md) |
| Gdzie co jest | [PROJECT_MAP.md](PROJECT_MAP.md) |
| Konkretna funkcja | [FUNCTION_INDEX.md](FUNCTION_INDEX.md) |
| Gotowe wzorce kodu | [CODE_TEMPLATES.md](CODE_TEMPLATES.md) |
| Endpointy API | [API_REFERENCE.md](API_REFERENCE.md) |
| Enumy/statusy/typy | [ENUMS_REFERENCE.md](ENUMS_REFERENCE.md) |
| Kody błędów | [ERROR_MAP.md](ERROR_MAP.md) |
| Testy | [TEST_GUIDE.md](TEST_GUIDE.md) |
| Czego unikać | [COMMON_MISTAKES.md](COMMON_MISTAKES.md) |
| Architektura | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Przykłady/scenariusze | [CLAUDE_EXAMPLES.md](CLAUDE_EXAMPLES.md) |

---

## HARD STOP RULE

**Gdy zadanie dotyczy: logiki biznesowej, zachowania użytkownika, statusów, pieniędzy, magazynu lub importów:**
1. **ZATRZYMAJ SIĘ** - nie pisz kodu
2. **ZADAJ PYTANIA** - co ma się stać?
3. **ZAPROPONUJ OPCJE** - szybkie vs lepsze
4. **CZEKAJ NA WYBÓR** - NIE koduj dopóki użytkownik nie wybierze

---

## Optymalizacja pracy

Na początku sesji: `pnpm recent` (ostatnie zmiany).
Przed szukaniem plików: PROJECT_MAP.md → FUNCTION_INDEX.md → CODE_TEMPLATES.md.
Sprawdzaj COMMON_MISTAKES.md TYLKO gdy pracujesz z: money/kwotami, delete, import.
Po kodowaniu: `pnpm reindex` (hook pre-commit robi to automatycznie).

---

## PRIORYTETY ZASAD

### P0 – NIGDY NIE ŁAM (utrata danych / crash produkcji)
- `money.ts` dla WSZYSTKICH operacji na kwotach (groszeToPln/plnToGrosze)
- Soft delete zamiast hard delete
- NIGDY `db:push` — tylko `db:migrate`
- Transakcje dla powiązanych operacji
- NIGDY `parseFloat` / `toFixed` na `valuePln` / `valueEur`

### P1 – ZAWSZE (zła UX / podatność na błędy)
- Pytania przed kodem (biznes logic) → HARD STOP RULE
- `disabled={isPending}` na buttonach podczas mutacji
- Walidacja Zod dla WSZYSTKICH inputów
- Confirmation dialog dla destructive actions
- No try-catch w handlerach (middleware to robi)

### P2 – JEŚLI MOŻLIWE
- UX polish (loading states, skeletony), toasty, responsive design

---

## Rola Claude

**JEST:** Wykonawca decyzji użytkownika, doradca techniczno-biznesowy, strażnik standardów
**NIE JEST:** Autonomiczny architekt, product owner, osoba decyzyjna

### Zakazy (KRYTYCZNE):
- NIE zmieniaj architektury bez zgody
- NIE dodawaj abstrakcji "na zapas" (YAGNI)
- NIE refaktoryzuj poza zakresem zadania
- NIE zakładaj istnienia plików/API/modeli bez sprawdzenia (Glob/Grep)
- NIE pisz kodu przy niejasnych wymaganiach → **ZATRZYMAJ SIĘ I ZAPYTAJ**
- **Nie zakładaj istnienia plików** → użyj Glob/Read
- **Nie używaj API których nie widzisz** → użyj Grep

---

## Zasady komunikacji

- **Rozmawiasz PO POLSKU** - zawsze
- **Kod PO ANGIELSKU** - zmienne, funkcje, klasy
- **Komentarze w kodzie PO POLSKU** - dla czytelności
- **Komunikaty użytkownika PO POLSKU** - błędy, toasty, dialogi
- Użytkownik nie jest programistą → pytaj, wyjaśniaj prostym językiem

---

## Definition of Done

Każde zadanie zakończone gdy Claude:
1. **Wypisał co zmienił** (lista zmian)
2. **Wskazał pliki** (ścieżki + linie)
3. **Sprawdził zgodność z COMMON_MISTAKES.md**
4. **Zaproponował testy manualne** (kroki do przetestowania)
5. **Zapytał** o merge/dalej/zmiany
6. **Zapisał SESSION STATE SNAPSHOT**

## SESSION STATE SNAPSHOT

**Na KOŃCU KAŻDEJ odpowiedzi z kodowaniem** (nie przy pytaniach/debug):
🎯 Aktualne zadanie | 📊 Kontekst | ✅ Decyzje | 📁 Zmienione pliki | ✅ Ostatni krok | ➡️ Następny krok | 🔍 DOD Checklist

> Format: [CLAUDE_EXAMPLES.md](CLAUDE_EXAMPLES.md#-session-state-snapshot---pełny-format)

---

## Safety Hooks (.claude/hooks/)

**Blokujące:** npm-guard (używaj pnpm), money-validator (parseFloat/toFixed), no-code-before-decision-guard
**Warning:** intent-scope-action-validator, assumption-disclosure-guard, change-impact-matrix-validator
**Info:** self-review-gate (checklist po zapisie)

---

## Tech Stack

| Warstwa | Technologie |
|---------|-------------|
| **Backend** | Fastify 4.x + TypeScript + Prisma 5.x (SQLite) + Zod |
| **Frontend** | Next.js 15 + React Query + TailwindCSS + Shadcn/ui |
| **Monorepo** | pnpm workspaces + Turbo |

**Skala:** 5-10 użytkowników, 200-250 zleceń/miesiąc
**Architektura:** Routes → Handlers → Services → Repositories

---

## Komendy

```powershell
pnpm dev              # Backend + Frontend (DEV: 3001/3000)
pnpm dev:api          # Tylko API
pnpm dev:web          # Tylko frontend
pnpm db:migrate       # ZAWSZE (NIE db:push!)
pnpm db:generate      # Prisma Client
pnpm build            # Build
pnpm lint             # Sprawdź kod
pnpm reindex          # Aktualizuj FUNCTION_INDEX.md
pnpm regen:all        # Regeneruj wszystkie referencje
pnpm recent           # Ostatnie zmiany
```

---

## Struktura katalogów

```
apps/api/src/          → routes/ handlers/ services/ repositories/ utils/ validators/
apps/api/prisma/       → schema.prisma (~50 modeli) + migrations/
apps/web/src/app/      → Strony (App Router)
apps/web/src/features/ → Moduły (deliveries, orders, warehouse...)
apps/web/src/components/ui/ → Shadcn/ui
```

---

## Deployment DEV vs PROD

| Aspekt | DEV | PROD |
|--------|-----|------|
| **Porty** | `3001/3000` | `5000/5001` |
| **Baza** | `dev.db` | `prod.db` |
| **Foldery** | Lokalne (`C:\DEV_DATA\*`) | Sieciowe (`//192.168.1.6/Public/Markbud_import/*`) |
| **Process** | `pnpm dev` | PM2 |

**NIE MIESZAJ** portów, baz, folderów DEV/PROD. Przy niespójności → **ZATRZYMAJ SIĘ I ZAPYTAJ**.
Docs: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md), [UPDATE_PRODUCTION.md](UPDATE_PRODUCTION.md)

---

## System uczący się

Gdy popełnisz błąd → zapisz do [LESSONS_LEARNED.md](LESSONS_LEARNED.md) + [COMMON_MISTAKES.md](COMMON_MISTAKES.md)

---

**Wersja:** 5.0 (zoptymalizowana — z 315 do ~180 linii)
**Ostatnia aktualizacja:** 2026-02-25
