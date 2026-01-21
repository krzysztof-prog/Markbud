# Dokumentacja Techniczna - AKROBUD

> **Centralny indeks dokumentacji projektu**

---

## Co czytac najpierw? (Nowi deweloperzy)

### 1. Podstawy projektu (WYMAGANE)
| Dokument | Czas | Opis |
|----------|------|------|
| [CLAUDE.md](../CLAUDE.md) | 15 min | Konwencje projektu, zasady dla Claude |
| [QUICK_REFERENCE.md](../QUICK_REFERENCE.md) | 5 min | Najwazniejsze zasady na 1 stronie |
| [COMMON_MISTAKES.md](../COMMON_MISTAKES.md) | 10 min | DO/DON'T - bledy ktorych unikac |

### 2. Quick Start (pierwsze uruchomienie)
| Dokument | Opis |
|----------|------|
| [01-prerequisites.md](./quick-start/01-prerequisites.md) | Wymagane narzedzia |
| [02-installation.md](./quick-start/02-installation.md) | Instalacja projektu |
| [03-first-run.md](./quick-start/03-first-run.md) | Pierwsze uruchomienie |
| [04-development-workflow.md](./quick-start/04-development-workflow.md) | Workflow deweloperski |
| [05-common-commands.md](./quick-start/05-common-commands.md) | Czesto uzywane komendy |
| [06-first-task-tutorial.md](./quick-start/06-first-task-tutorial.md) | Tutorial - pierwsze zadanie |
| [07-troubleshooting.md](./quick-start/07-troubleshooting.md) | Rozwiazywanie problemow |

### 3. Architektura (zrozumienie systemu)
| Dokument | Opis |
|----------|------|
| [tech-stack.md](./architecture/tech-stack.md) | Uzyty stack technologiczny |
| [backend.md](./architecture/backend.md) | Architektura backendu |
| [frontend.md](./architecture/frontend.md) | Architektura frontendu |
| [database.md](./architecture/database.md) | Struktura bazy danych |

---

## Katalogi dokumentacji

### `architecture/` - Architektura systemu
Dokumentacja architektury, decyzji technicznych i struktury projektu.

| Plik | Opis |
|------|------|
| [tech-stack.md](./architecture/tech-stack.md) | Stack technologiczny (Fastify, Next.js, Prisma, etc.) |
| [backend.md](./architecture/backend.md) | Architektura backendu (Route -> Handler -> Service -> Repository) |
| [frontend.md](./architecture/frontend.md) | Architektura frontendu (App Router, features/, components/) |
| [database.md](./architecture/database.md) | Struktura bazy danych, modele Prisma, relacje |
| [api-endpoints.md](./architecture/api-endpoints.md) | Dokumentacja API REST - wszystkie endpointy |
| [communication-flow.md](./architecture/communication-flow.md) | Przeplywy komunikacji (REST, WebSocket, SSE) |
| [external-integrations.md](./architecture/external-integrations.md) | Integracje zewnetrzne (Schuco, file watchers) |
| [protected-modules.md](./architecture/protected-modules.md) | Moduly chronione - nie modyfikowac bez zgody |
| [security.md](./architecture/security.md) | Architektura bezpieczenstwa |
| [decisions.md](./architecture/decisions.md) | ADR - Architecture Decision Records |
| [performance.md](./architecture/performance.md) | Optymalizacje wydajnosci |

---

### `common-mistakes/` - Typowe bledy (DO/DON'T)
Szczegolowa dokumentacja typowych bledow i jak ich unikac.

| Plik | Opis |
|------|------|
| [README.md](./common-mistakes/README.md) | Indeks typowych bledow |
| [money-operations.md](./common-mistakes/money-operations.md) | **P0 CRITICAL** - Operacje na pieniadzyach (grosze, money.ts) |
| [data-deletion.md](./common-mistakes/data-deletion.md) | **P0 CRITICAL** - Soft delete vs hard delete |
| [imports-parsing.md](./common-mistakes/imports-parsing.md) | **P1** - Import plikow, parsowanie |
| [buttons-mutations.md](./common-mistakes/buttons-mutations.md) | **P1** - disabled={isPending} na buttonach |
| [backend-architecture.md](./common-mistakes/backend-architecture.md) | **P1** - Architektura backendu |
| [frontend-react.md](./common-mistakes/frontend-react.md) | **P1** - React patterns, hooks |
| [validation-security.md](./common-mistakes/validation-security.md) | **P1** - Walidacja Zod, bezpieczenstwo |
| [other.md](./common-mistakes/other.md) | Inne typowe bledy |

---

### `contributing/` - Przewodnik kontrybutora
Jak kontrybuowac do projektu.

| Plik | Opis |
|------|------|
| [getting-started.md](./contributing/getting-started.md) | Jak zaczac kontrybuowac |
| [development-workflow.md](./contributing/development-workflow.md) | Workflow deweloperski |
| [coding-standards.md](./contributing/coding-standards.md) | Standardy kodowania |
| [git-workflow.md](./contributing/git-workflow.md) | Git workflow, branche, commity |
| [pull-requests.md](./contributing/pull-requests.md) | Jak tworzyc PR |
| [testing.md](./contributing/testing.md) | Testowanie kodu |
| [documentation.md](./contributing/documentation.md) | Pisanie dokumentacji |
| [issue-reporting.md](./contributing/issue-reporting.md) | Raportowanie bledow |

---

### `deployment/` - Wdrozenie produkcyjne
Dokumentacja wdrozenia i konfiguracji produkcyjnej.

| Plik | Opis |
|------|------|
| [README.md](./deployment/README.md) | Przeglad procesu wdrozenia |
| [production.md](./deployment/production.md) | Konfiguracja produkcyjna |
| [checklist.md](./deployment/checklist.md) | Checklist przed wdrozeniem |

**Zobacz tez:** [QUICK_START_PRODUCTION.md](../QUICK_START_PRODUCTION.md), [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)

---

### `features/` - Dokumentacja funkcjonalnosci
Szczegolowa dokumentacja modulow biznesowych.

| Plik | Opis |
|------|------|
| [deliveries.md](./features/deliveries.md) | Modul dostaw, optymalizacja palet |
| [reports.md](./features/reports.md) | Raporty, eksporty PDF |
| [schuco.md](./features/schuco.md) | Integracja Schuco Connect |
| [schuco-status-modal.md](./features/schuco-status-modal.md) | Modal statusu Schuco |

#### `features/imports/` - Modul importow
| Plik | Opis |
|------|------|
| [variant-integration.md](./features/imports/variant-integration.md) | Integracja wariantow |
| [folder-settings-api.md](./features/imports/folder-settings-api.md) | API ustawien folderow |
| [conflict-handling.md](./features/imports/conflict-handling.md) | Obsluga konfliktow |
| [auto-archiving.md](./features/imports/auto-archiving.md) | Auto-archiwizacja plikow |
| [ZMIANA_SCIEZEK...](./features/imports/ZMIANA_SCIEZEK_I_ARCHIWIZACJA_2026-01-05.md) | Zmiany sciezek i archiwizacja |

---

### `guides/` - Przewodniki deweloperskie
Przewodniki techniczne i best practices.

| Plik | Opis |
|------|------|
| [anti-patterns.md](./guides/anti-patterns.md) | **WAZNE** - Czego unikac |
| [transactions.md](./guides/transactions.md) | Transakcje Prisma - kiedy i jak |
| [reverse-operations.md](./guides/reverse-operations.md) | Operacje odwrotne w systemie |
| [development-workflow.md](./guides/development-workflow.md) | Workflow deweloperski |
| [git-workflow-and-dependencies.md](./guides/git-workflow-and-dependencies.md) | Git i zarzadzanie zaleznosciami |
| [vitest-testing-patterns.md](./guides/vitest-testing-patterns.md) | Testowanie z Vitest |
| [production-testing-guide.md](./guides/production-testing-guide.md) | Testowanie na produkcji |
| [api-testing.md](./guides/api-testing.md) | Testowanie API |
| [api-health-check.md](./guides/api-health-check.md) | Health check API |
| [swagger-testing.md](./guides/swagger-testing.md) | Testowanie przez Swagger |
| [schuco-testing-guide.md](./guides/schuco-testing-guide.md) | Testowanie integracji Schuco |
| [table-component-migration.md](./guides/table-component-migration.md) | Migracja komponentow tabeli |
| [migration-safety-fix.md](./guides/migration-safety-fix.md) | Bezpieczne migracje bazy |
| [SAFE_UPDATE_INSTRUKCJA.md](./guides/SAFE_UPDATE_INSTRUKCJA.md) | Bezpieczne aktualizacje |
| [edge-cases-analysis.md](./guides/edge-cases-analysis.md) | Analiza edge cases |
| [EDGE_CASES_ANALYSIS.md](./guides/EDGE_CASES_ANALYSIS.md) | Szczegolowa analiza edge cases |
| [EDGE_CASES_FIXES_SUMMARY.md](./guides/EDGE_CASES_FIXES_SUMMARY.md) | Podsumowanie fixow edge cases |
| [manager-panel-edge-cases.md](./guides/manager-panel-edge-cases.md) | Edge cases panelu managera |
| [manager-panel-edge-cases-fixes-summary.md](./guides/manager-panel-edge-cases-fixes-summary.md) | Fixy edge cases panelu managera |
| [DYNAMIC_IMPORTS_IMPLEMENTATION_PLAN.md](./guides/DYNAMIC_IMPORTS_IMPLEMENTATION_PLAN.md) | Plan implementacji dynamic imports |
| [HANDLER_TRY_CATCH_CLEANUP.md](./guides/HANDLER_TRY_CATCH_CLEANUP.md) | Cleanup try-catch w handlerach |
| [SUSPENSE_QUERY_MIGRATION_GUIDE.md](./guides/SUSPENSE_QUERY_MIGRATION_GUIDE.md) | Migracja do Suspense Query |

#### `guides/edge-cases/` - Katalog edge cases
Szczegolowa dokumentacja przypadkow brzegowych.

| Plik | Opis |
|------|------|
| [README.md](./guides/edge-cases/README.md) | Indeks edge cases |
| [data-validation.md](./guides/edge-cases/data-validation.md) | Walidacja danych |
| [concurrency.md](./guides/edge-cases/concurrency.md) | Wspolbieznosc |
| [data-integrity.md](./guides/edge-cases/data-integrity.md) | Integralnosc danych |
| [file-operations.md](./guides/edge-cases/file-operations.md) | Operacje na plikach |
| [datetime.md](./guides/edge-cases/datetime.md) | Daty i strefy czasowe |
| [numeric-precision.md](./guides/edge-cases/numeric-precision.md) | Precyzja numeryczna |
| [business-logic.md](./guides/edge-cases/business-logic.md) | Logika biznesowa |
| [security.md](./guides/edge-cases/security.md) | Bezpieczenstwo |
| [error-handling.md](./guides/edge-cases/error-handling.md) | Obsluga bledow |
| [performance.md](./guides/edge-cases/performance.md) | Wydajnosc |

---

### `lessons-learned/` - Lekcje z przeszlosci
Dokumentacja bledow z przeszlosci i wnioskow.

| Plik | Opis |
|------|------|
| [auth-security.md](./lessons-learned/auth-security.md) | Autoryzacja i bezpieczenstwo |
| [money-financial.md](./lessons-learned/money-financial.md) | **WAZNE** - Operacje finansowe |
| [imports-parsing.md](./lessons-learned/imports-parsing.md) | Import i parsowanie plikow |
| [data-operations.md](./lessons-learned/data-operations.md) | Operacje na danych |
| [frontend-performance.md](./lessons-learned/frontend-performance.md) | Wydajnosc frontendu |
| [infrastructure.md](./lessons-learned/infrastructure.md) | Infrastruktura |
| [testing.md](./lessons-learned/testing.md) | Testowanie |

**Zobacz tez:** [LESSONS_LEARNED.md](../LESSONS_LEARNED.md) - glowny plik z lekcjami

---

### `quick-start/` - Szybki start
Krok po kroku jak zaczac prace z projektem.

| Plik | Opis |
|------|------|
| [01-prerequisites.md](./quick-start/01-prerequisites.md) | Wymagane narzedzia (Node.js, pnpm, VS Code) |
| [02-installation.md](./quick-start/02-installation.md) | Instalacja projektu |
| [03-first-run.md](./quick-start/03-first-run.md) | Pierwsze uruchomienie |
| [04-development-workflow.md](./quick-start/04-development-workflow.md) | Codzienny workflow |
| [05-common-commands.md](./quick-start/05-common-commands.md) | Czesto uzywane komendy |
| [06-first-task-tutorial.md](./quick-start/06-first-task-tutorial.md) | Tutorial - pierwsze zadanie |
| [07-troubleshooting.md](./quick-start/07-troubleshooting.md) | Rozwiazywanie problemow |

---

### `refactoring/` - Plany refaktoryzacji
Dokumentacja planow i postepow refaktoryzacji.

| Plik | Opis |
|------|------|
| [README.md](./refactoring/README.md) | Indeks planow refaktoryzacji |
| [REFACTORING_PLAN_2026-01-20.md](./refactoring/REFACTORING_PLAN_2026-01-20.md) | **AKTUALNY** - Plan refaktoryzacji |
| [comprehensive-refactoring-plan-2025-12-30.md](./refactoring/comprehensive-refactoring-plan-2025-12-30.md) | Kompleksowy plan |
| [comprehensive-refactoring-complete-2025-12-31.md](./refactoring/comprehensive-refactoring-complete-2025-12-31.md) | Podsumowanie zakonczonych prac |
| [dashboard-refactor-plan-2025-12-30.md](./refactoring/dashboard-refactor-plan-2025-12-30.md) | Refaktor dashboardu |
| [warehouse-routes-refactor-plan-2025-12-30.md](./refactoring/warehouse-routes-refactor-plan-2025-12-30.md) | Refaktor tras magazynu |
| [import-service-refactor-plan-2025-12-30.md](./refactoring/import-service-refactor-plan-2025-12-30.md) | Refaktor serwisu importu |
| [delivery-service-refactor-plan-2025-12-30.md](./refactoring/delivery-service-refactor-plan-2025-12-30.md) | Refaktor serwisu dostaw |
| [dostawy-page-refactor-plan-2025-12-30.md](./refactoring/dostawy-page-refactor-plan-2025-12-30.md) | Refaktor strony dostaw |
| [FINAL-SUMMARY-2025-12-31.md](./refactoring/FINAL-SUMMARY-2025-12-31.md) | Finalne podsumowanie |
| *...inne pliki z postepami* | |

---

### `reviews/` - Audyty i przeglady kodu
Raporty z audytow i przegladow kodu.

| Plik | Opis |
|------|------|
| [COMPREHENSIVE_AUDIT_2026-01-14.md](./reviews/COMPREHENSIVE_AUDIT_2026-01-14.md) | **NAJNOWSZY** - Kompleksowy audyt |
| [COMPREHENSIVE_AUDIT_REPORT_2026-01-02.md](./reviews/COMPREHENSIVE_AUDIT_REPORT_2026-01-02.md) | Audyt ze stycznia 2026 |
| [TECH_DEBT_AUDIT_2026-01-15.md](./reviews/TECH_DEBT_AUDIT_2026-01-15.md) | Audyt dlugu technicznego |
| [PERFORMANCE_AUDIT_2026-01-15.md](./reviews/PERFORMANCE_AUDIT_2026-01-15.md) | Audyt wydajnosci |
| [UX_AUDIT_2026-01-14.md](./reviews/UX_AUDIT_2026-01-14.md) | Audyt UX |
| [UX_AUDIT_2026-01-06.md](./reviews/UX_AUDIT_2026-01-06.md) | Wczesniejszy audyt UX |
| [DATABASE_AUDIT_2026-01-06.md](./reviews/DATABASE_AUDIT_2026-01-06.md) | Audyt bazy danych |
| [DASHBOARD_AUDIT_2026-01-03.md](./reviews/DASHBOARD_AUDIT_2026-01-03.md) | Audyt dashboardu |
| [DASHBOARD_FIX_2026-01-05.md](./reviews/DASHBOARD_FIX_2026-01-05.md) | Fixy dashboardu |
| [schuco-integration-code-review.md](./reviews/schuco-integration-code-review.md) | Code review integracji Schuco |
| [SCHUCO_CODE_REVIEW_SUMMARY.md](./reviews/SCHUCO_CODE_REVIEW_SUMMARY.md) | Podsumowanie code review Schuco |

---

### `security/` - Bezpieczenstwo
Dokumentacja bezpieczenstwa systemu.

| Plik | Opis |
|------|------|
| [README.md](./security/README.md) | Indeks dokumentacji bezpieczenstwa |
| [01-overview.md](./security/01-overview.md) | Przeglad bezpieczenstwa |
| [02-critical-issues.md](./security/02-critical-issues.md) | **CRITICAL** - Krytyczne problemy |
| [03-high-priority.md](./security/03-high-priority.md) | **HIGH** - Wysokie priorytety |
| [04-medium-priority.md](./security/04-medium-priority.md) | **MEDIUM** - Srednie priorytety |
| [05-low-priority.md](./security/05-low-priority.md) | **LOW** - Niskie priorytety |
| [06-remediation-plan.md](./security/06-remediation-plan.md) | Plan naprawczy |
| [websocket.md](./security/websocket.md) | Bezpieczenstwo WebSocket |

---

### `templates/` - Szablony
Szablony do tworzenia nowych elementow.

| Plik | Opis |
|------|------|
| [README.md](./templates/README.md) | Indeks szablonow |
| [component.md](./templates/component.md) | Szablon komponentu React |

---

### `user-guides/` - Instrukcje dla uzytkownikow
Dokumentacja dla uzytkownikow koncowych (nie-technicznych).

| Plik | Opis |
|------|------|
| [getting-started.md](./user-guides/getting-started.md) | Pierwsze kroki |
| [orders.md](./user-guides/orders.md) | Obsluga zlecen |
| [deliveries.md](./user-guides/deliveries.md) | Obsluga dostaw |
| [warehouse.md](./user-guides/warehouse.md) | Magazyn |
| [imports.md](./user-guides/imports.md) | Importy plikow |
| [reports.md](./user-guides/reports.md) | Raporty |
| [schuco.md](./user-guides/schuco.md) | Modul Schuco |
| [admin-guide.md](./user-guides/admin-guide.md) | Panel administratora |
| [faq.md](./user-guides/faq.md) | FAQ - Czeste pytania |
| [troubleshooting.md](./user-guides/troubleshooting.md) | Rozwiazywanie problemow |

---

### `archive/` - Archiwum
Historyczne dokumenty, zakonczone prace, stare plany.

| Podkatalog | Opis |
|------------|------|
| [archive/](./archive/) | Glowne archiwum |
| [archive/2025/](./archive/2025/) | Dokumenty z 2025 roku |
| [archive/reviews/](./archive/reviews/) | Stare code reviews |

---

## Pliki w katalogu glownym docs/

| Plik | Opis |
|------|------|
| [CLAUDE_COMMUNICATION.md](./CLAUDE_COMMUNICATION.md) | Jak Claude ma sie komunikowac |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Dokumentacja API |
| [FRONTEND_DOCUMENTATION.md](./FRONTEND_DOCUMENTATION.md) | Dokumentacja frontendu |
| [DATABASE_INDEX_OPTIMIZATION.md](./DATABASE_INDEX_OPTIMIZATION.md) | Optymalizacja indeksow bazy |
| [AUDIT_ACTION_PLAN_2026-01-14.md](./AUDIT_ACTION_PLAN_2026-01-14.md) | Plan dzialan z audytu |
| [ROLE_BASED_ACCESS_IMPLEMENTATION.md](./ROLE_BASED_ACCESS_IMPLEMENTATION.md) | Implementacja RBAC |
| [DYNAMIC_IMPORTS_CURRENT_STATE.md](./DYNAMIC_IMPORTS_CURRENT_STATE.md) | Stan dynamic imports |
| [PENDING_ORDER_PRICE_CLEANUP.md](./PENDING_ORDER_PRICE_CLEANUP.md) | Cleanup cen zlecen |
| [NIEZREALIZOWANE_PLANY.md](./NIEZREALIZOWANE_PLANY.md) | Niezrealizowane plany |
| [RAPORT_KOMPLEKSOWEJ_ANALIZY_PROJEKTU.md](./RAPORT_KOMPLEKSOWEJ_ANALIZY_PROJEKTU.md) | Raport kompleksowej analizy |
| [RAPORT_ZGODNOSCI_SKILLAMI...](./RAPORT_ZGODNOSCI_SKILLAMI_2025-12-31.md) | Raport zgodnosci ze skillami |
| [PROGRESS_ZGODNOSC_SKILLAMI...](./PROGRESS_ZGODNOSC_SKILLAMI_2025-12-31.md) | Postep zgodnosci ze skillami |
| [UX_COMPREHENSIVE_AUDIT...](./UX_COMPREHENSIVE_AUDIT_2025-12-31.md) | Kompleksowy audyt UX |
| [UX_IMPROVEMENTS_*.md](.) | Pliki z ulepszeniami UX |
| [QUICK_WINS_UX_PLAN.md](./QUICK_WINS_UX_PLAN.md) | Quick wins UX |
| [DOKUMENTACJA_*.md](.) | Raporty z dokumentacji |

---

## Jak nawigowac po dokumentacji

### Szukasz konkretnej informacji?

| Potrzebujesz | Idz do |
|--------------|--------|
| Jak zaczac z projektem? | [quick-start/](./quick-start/) |
| Czego unikac w kodzie? | [common-mistakes/](./common-mistakes/) + [COMMON_MISTAKES.md](../COMMON_MISTAKES.md) |
| Jak dziala architektura? | [architecture/](./architecture/) |
| Jak testowac kod? | [guides/vitest-testing-patterns.md](./guides/vitest-testing-patterns.md) |
| Jak wdrozyc na produkcje? | [deployment/](./deployment/) |
| Jak dziala modul X? | [features/](./features/) |
| Co poszlo nie tak w przeszlosci? | [lessons-learned/](./lessons-learned/) + [LESSONS_LEARNED.md](../LESSONS_LEARNED.md) |
| Jak uzytkownik ma uzywac systemu? | [user-guides/](./user-guides/) |
| Audyt bezpieczenstwa? | [security/](./security/) |
| Najnowszy audyt kodu? | [reviews/COMPREHENSIVE_AUDIT_2026-01-14.md](./reviews/COMPREHENSIVE_AUDIT_2026-01-14.md) |

### Workflow dla nowego dewelopera

```
1. CLAUDE.md (konwencje)
      |
      v
2. quick-start/ (instalacja)
      |
      v
3. COMMON_MISTAKES.md (czego unikac)
      |
      v
4. architecture/ (jak to dziala)
      |
      v
5. features/ (modul nad ktorym pracujesz)
      |
      v
6. guides/ (szczegoly techniczne)
```

### Workflow dla przegladu kodu

```
1. COMMON_MISTAKES.md (checklist)
      |
      v
2. common-mistakes/ (szczegoly)
      |
      v
3. lessons-learned/ (bledy z przeszlosci)
      |
      v
4. reviews/ (poprzednie audyty)
```

---

## Quick Reference - Transakcje Prisma

```typescript
await prisma.$transaction(async (tx) => {
  await tx.table1.update({ ... });
  await tx.table2.update({ ... });
});
```

## Quick Reference - Operacje na pieniadzyach

```typescript
// ZAWSZE uzyj money.ts
import { groszeToPln, plnToGrosze } from './utils/money';

// Z bazy (grosze) do wyswietlenia (PLN)
const displayValue = groszeToPln(order.valuePln as Grosze);

// Z inputu (PLN) do bazy (grosze)
const dbValue = plnToGrosze(inputValue);
```

## Quick Reference - Soft Delete

```typescript
// NIGDY hard delete
// await prisma.delivery.delete({ where: { id } });

// ZAWSZE soft delete
await prisma.delivery.update({
  where: { id },
  data: { deletedAt: new Date() }
});
```

---

## Wazne linki

| Dokument | Lokalizacja |
|----------|-------------|
| Glowny README projektu | [../README.md](../README.md) |
| Kontekst dla Claude | [../CLAUDE.md](../CLAUDE.md) |
| Quick Reference | [../QUICK_REFERENCE.md](../QUICK_REFERENCE.md) |
| Common Mistakes | [../COMMON_MISTAKES.md](../COMMON_MISTAKES.md) |
| Lessons Learned | [../LESSONS_LEARNED.md](../LESSONS_LEARNED.md) |
| Architektura | [../ARCHITECTURE.md](../ARCHITECTURE.md) |
| Stan sesji | [../SESSION_STATE.md](../SESSION_STATE.md) |

---

**Wersja dokumentacji:** 3.0
**Data ostatniej aktualizacji:** 2026-01-20
**Liczba katalogow:** 13
**Liczba dokumentow:** 100+
