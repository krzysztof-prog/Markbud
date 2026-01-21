# Edge Cases Analysis - AKROBUD System

> **Data analizy:** 2025-12-31
> **Wersja systemu:** Next.js 15.5.7, Fastify 4.x, Prisma 5.x, SQLite

## O dokumentacji

Ta dokumentacja zawiera szczegółową analizę edge cases, potencjalnych problemów i rekomendowanych rozwiązań dla systemu AKROBUD. Podzielona jest na tematyczne sekcje dla łatwiejszej nawigacji.

## Spis treści

| Plik | Opis | Poziom ryzyka |
|------|------|---------------|
| [data-validation.md](data-validation.md) | Walidacja danych wejściowych, boundary cases | Medium |
| [concurrency.md](concurrency.md) | Race conditions, optimistic locking, import locks | Critical/High |
| [data-integrity.md](data-integrity.md) | Relacje bazodanowe, cascade delete, orphaned records | Critical/High |
| [file-operations.md](file-operations.md) | Importy plików, sanitization, concurrent imports | High/Medium |
| [datetime.md](datetime.md) | Strefy czasowe, tygodnie, porównania dat | Critical/Medium |
| [numeric-precision.md](numeric-precision.md) | Precyzja liczb, konwersje walut, overflow | High/Medium |
| [business-logic.md](business-logic.md) | Statusy zleceń, walidacja stanów magazynowych | High/Medium |
| [security.md](security.md) | Autoryzacja, WebSocket, audit trail | High/Medium |
| [error-handling.md](error-handling.md) | Transakcje, obsługa błędów, recovery | High/Medium |
| [performance.md](performance.md) | N+1 queries, bulk operations, indeksy | High/Medium |

## Priorytety napraw

### P0 - Critical (Natychmiastowe działanie)

1. **OkucStock Optimistic Locking** - Implementacja używania pola version
2. **SQLite Timezone Loss** - Standaryzacja na UTC date-only strings
3. **Cascade Delete Audit** - Implementacja soft delete + audit trail

### P1 - High (Następny sprint)

4. Import Lock Cleanup Race - Użycie transakcji
5. Negative Stock Validation - Zapobieganie produkcji bez materiałów
6. User Context Missing - Wymaganie userId we wszystkich mutacjach
7. N+1 Queries - Dodanie includes do częstych zapytań
8. Float to Int Money - Dokumentacja i wymuszanie groszy/centów

### P2 - Medium (Backlog)

9. Order Status Transitions - Implementacja state machine
10. WebSocket Memory Leak - Cleanup przy rozłączeniu
11. Bulk Operations - Batching dla dużych aktualizacji
12. File Size Bypass - Streaming parsers
13. Week Number Inconsistency - Konsekwentne użycie date-fns

### P3 - Low (Nice to Have)

14. Pagination Limits - Max page/limit
15. Database Indexes - Brakujące composite indexes
16. WebSocket Heartbeat - Ping/pong
17. Silent Error Swallowing - Łapanie tylko oczekiwanych błędów

## Następne kroki

1. **Code Review** - Przejrzyj dokumentację z zespołem
2. **Priorytetyzacja** - Wybierz top 5 do implementacji
3. **Testy** - Dodaj testy dla zidentyfikowanych edge cases
4. **Dokumentacja** - Zaktualizuj [anti-patterns.md](../anti-patterns.md)
5. **Monitoring** - Dodaj alerty dla critical issues

## Powiązane dokumenty

- [Anti-patterns](../anti-patterns.md) - Czego unikać
- [Transactions Guide](../transactions.md) - Jak używać transakcji
- [Testing Patterns](../vitest-testing-patterns.md) - Wzorce testowania