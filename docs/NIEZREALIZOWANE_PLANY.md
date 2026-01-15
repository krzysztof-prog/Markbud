# Niezrealizowane Plany i Funkcje

> Ostatnia aktualizacja: 2026-01-14

Ten dokument zawiera listę zaplanowanych funkcji, które nie zostały jeszcze zaimplementowane lub są częściowo ukończone.

---

## Podsumowanie

| Funkcja | Status | Szacowany czas |
|---------|--------|----------------|
| Panel Kierownika | 60% | 2h |
| Optymalizacja Palet | 50% | 8h |
| System Brain | 100% ✅ | - |
| Backlog (7 funkcji) | 15% | 25-35h |
| Refaktoryzacja Backend | 0% | 27h |
| Refaktoryzacja Frontend | 0% | 20h |
| **RAZEM** | ~25% | ~95h |

---

## 1. Panel Kierownika Produkcji

**Status:** 60% ukończone
**Plan:** `.claude/plan.md`

### Zrobione ✅
- Backend endpointy
- Strona `/kierownik`
- Zakładki: Dodaj do produkcji, Zakończ zlecenia
- Wrappery: Godzinówki, Paletówki

### Do zrobienia ❌
- Integracja MonthlyReportTab
- Testy manualne

---

## 2. Optymalizacja Pakowania Palet

**Status:** 50% ukończone
**Plan:** `.claude/plan-optymalizacja-palet.md`

### Zrobione ✅
- Backend: `PalletOptimizerService`, `PalletValidationService`
- Modele DB: `PalletType`, `PackingRule`, `OptimizedPallet`
- API routes

### Do zrobienia ❌
- Frontend strona optymalizacji `/dostawy/[id]/optymalizacja`
- Komponenty wizualizacji palet
- Integracja przycisku "Optymalizuj palety" w dostawach
- CRUD typów palet w ustawieniach

---

## 3. Backlog - Funkcjonalności

**Źródło:** `docs/archive/2025/planning/BACKLOG_SPECYFIKACJA.md`

### 3.1 Zarządzanie Profilami UI
**Status:** Backend ✅, Frontend ❌

Brakuje:
- Widoczność kolorów per profil
- Numer artykułu
- Drag-drop sortowanie

### 3.2 Protokoły Odbioru Dostaw
**Status:** Backend ✅, Frontend ❌

Brakuje:
- Przycisk "Generuj protokół" w UI

### 3.3 Historia Magazynu
**Status:** Backend ✅, Frontend ❌

Brakuje:
- Zakładka "Historia" w widoku magazynu

### 3.4 Raport Braków Materiałowych
**Status:** Częściowe

Brakuje:
- Pełny raport (nie tylko top 5 na dashboardzie)
- Eksport PDF/Excel

### 3.5 System Notatek
**Status:** Niezrobione ❌

Brakuje:
- Dodawanie notatek do zleceń
- Historia notatek
- Powiadomienia

### 3.6 Zarządzanie Dniami Wolnymi
**Status:** Częściowe

Brakuje:
- Dedykowany widok kalendarza
- Batch dodawanie świąt
- UI poza prawym kliknięciem

### 3.7 Statystyki Miesięczne
**Status:** Backend ✅, Frontend ❌

Brakuje:
- Dedykowany widok statystyk
- Wykresy

---

## 4. Refaktoryzacja Backend

**Źródło:** `.claude/plan-refaktoryzacja-2026-01-14.md`

### P0 - Krytyczne ❌
| Problem | Lokalizacja |
|---------|-------------|
| `parseFloat` na kwotach | `productionReportHandler.ts:230` |
| `parseFloat` na kwotach | `currency-config.ts:191,241` |

### P1 - Wysokie ❌
| Problem | Lokalizacja |
|---------|-------------|
| Brak architektury Route→Handler→Service | Moduł OKUC |
| God object | `importService.ts` (1188 linii) |
| Zbyt wiele odpowiedzialności | `csv-parser.ts` (887 linii) |
| Hard delete zamiast soft delete | 30+ lokalizacji |

---

## 5. Refaktoryzacja Frontend

### Duże komponenty ❌
| Komponent | Linie |
|-----------|-------|
| `MagazynAkrobudPageContent.tsx` | 854 |
| `OrdersTable.tsx` | 679 |
| `api.ts` (centralny) | 982 |

### Duplikacje ❌
- `OrderDetailModal` w 2 miejscach

---

## 6. Quick Wins (szybkie do zrobienia)

| Funkcja | Czas | Priorytet |
|---------|------|-----------|
| MonthlyReportTab integracja | 1h | Wysoki |
| Przycisk "Generuj protokół" | 1h | Wysoki |
| Zakładka Historia w magazynie | 2h | Średni |
| Dashboard Operator - prawdziwe dane | 3h | Średni |

---

## 7. Dalsze kroki

1. **Dokończ Panel Kierownika** - integracja MonthlyReportTab
2. **Frontend Optymalizacji Palet** - wizualizacja i UI
3. **Quick Wins z backlogu** - protokoły, historia
4. **Refaktoryzacja P0** - napraw `parseFloat` na kwotach
5. **Podział dużych plików** - importService, csv-parser

---

## Zobacz też

- [ARCHITECTURE.md](../ARCHITECTURE.md) - architektura systemu
- [COMMON_MISTAKES.md](../COMMON_MISTAKES.md) - czego unikać
- [docs/guides/anti-patterns.md](guides/anti-patterns.md) - anti-patterns
