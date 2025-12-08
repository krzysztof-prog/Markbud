# Plan Refaktoryzacji Dokumentacji Projektu AKROBUD

## Stan Aktualny

### Statystyki dokumentacji (bez node_modules)
| Lokalizacja | Pliki .md | Linii | Opis |
|------------|-----------|-------|------|
| **Root (/)** | 40 | ~16,343 | Chaos - brak organizacji |
| **docs/** | 9 | ~800 | Dokumentacja techniczna |
| **dev/active/** | 8 | ~500 | Aktywna praca deweloperska |
| **.plan/** | 11 | ~5,575 | Plany rozwoju i backlog |
| **.claude/** | 29 | ~2,500 | Konfiguracja Claude Code |
| **.beads/** | 1 | ~82 | Issue tracker |
| **claude-int/** | 40+ | ~7,500 | **DUPLIKAT .claude/** |

### Zidentyfikowane Problemy

| # | Problem | Wpływ | Priorytet |
|---|---------|-------|-----------|
| 1 | **40 plików .md w root** bez organizacji | Chaos, trudność nawigacji | 🔴 Krytyczny |
| 2 | **Brak README.md** w root | Nowi nie wiedzą gdzie zacząć | 🔴 Krytyczny |
| 3 | **Katalog `claude-int/`** duplikuje `.claude/` | 7.5MB niepotrzebnych danych | 🔴 Krytyczny |
| 4 | **Istniejący katalog `.plan/`** nie używany do planów w root | Niespójność | 🟡 Średni |
| 5 | **Mieszanie docs aktualnych i historycznych** | Trudność znalezienia info | 🟡 Średni |
| 6 | **Rozproszona dokumentacja feature'ów** | Śledzenie implementacji | 🟢 Niski |

---

## Proponowana Struktura Docelowa

```
Markbud/
├── README.md                        # NOWY: Główny punkt wejścia
├── CLAUDE.md                        # ✅ Kontekst Claude (bez zmian)
├── CHANGELOG.md                     # ✅ Historia zmian (bez zmian)
│
├── .beads/                          # ✅ Issue tracker (bez zmian)
├── .claude/                         # ✅ Konfiguracja Claude Code (bez zmian)
│
├── .plan/                           # Plany i specyfikacje (ROZSZERZYĆ)
│   ├── README.md                    # Spis treści planów
│   ├── BACKLOG_SPECYFIKACJA.md      # ✅ Istnieje
│   ├── PLAN_WDROZENIE_PRODUKCYJNE.md # ✅ Istnieje
│   ├── ROZWOJ_SYSTEMU.md            # ✅ Istnieje
│   ├── features/                    # ✅ Istnieje
│   │   └── FOLDER_SETTINGS.md
│   ├── remanent/                    # Przenieść pliki remanent-*
│   │   ├── archiving-requirements.md
│   │   ├── database-changes.md
│   │   ├── implementation.md
│   │   ├── technical-plan.md
│   │   └── ux-analysis.md
│   └── archive/                     # NOWY: Zakończone plany z root
│
├── docs/                            # Dokumentacja techniczna (ROZSZERZYĆ)
│   ├── README.md                    # ✅ Istnieje - zaktualizować
│   ├── architecture/                # NOWY
│   │   ├── database.md              # Z DATABASE_TABLES_DESCRIPTION.md
│   │   └── api-endpoints.md         # Z DOCS.md
│   ├── guides/                      # NOWY
│   │   ├── transactions.md          # Przenieść z docs/
│   │   ├── reverse-operations.md    # Przenieść z docs/
│   │   └── anti-patterns.md         # Z DONT_DO.md
│   ├── features/                    # NOWY: Dokumentacja funkcji
│   │   ├── deliveries.md            # Konsolidacja opt. palet
│   │   ├── warehouse.md             # Magazyn
│   │   ├── orders.md                # Zlecenia
│   │   ├── reports.md               # PDF, raporty miesięczne
│   │   └── schuco.md                # Integracja Schuco
│   ├── user-guides/                 # NOWY: Dla użytkowników
│   │   └── schuco.md                # Z SCHUCO_UZYTKOWNIK.md
│   ├── security/                    # NOWY
│   │   └── analysis.md              # Z ANALIZA_BEZPIECZENSTWA...
│   └── archive/                     # NOWY: Historyczne docs
│       ├── sprints/
│       └── reviews/
│
├── dev/                             # Dokumentacja deweloperska
│   ├── active/                      # ✅ Istnieje (bez zmian)
│   └── archive/                     # NOWY: Zakończone prace
│
└── apps/                            # ✅ Kod źródłowy (bez zmian)
```

---

## Plan Wykonania w 6 Fazach

### Faza 1: Usunięcie Duplikatów
**Agent:** `code-refactor-master`
**Czas:** ~5 min

| Zadanie | Szczegóły |
|---------|-----------|
| Usunąć `claude-int/` | Stara kopia `.claude/` - wszystko aktualne jest w `.claude/` |

```bash
# Komenda do wykonania
rm -rf claude-int/
```

---

### Faza 2: Utworzenie Struktury Katalogów
**Agent:** `documentation-architect`
**Czas:** ~5 min

```bash
# Nowe katalogi
mkdir -p docs/architecture
mkdir -p docs/guides
mkdir -p docs/features
mkdir -p docs/user-guides
mkdir -p docs/security
mkdir -p docs/archive/sprints
mkdir -p docs/archive/reviews
mkdir -p dev/archive
mkdir -p .plan/remanent
mkdir -p .plan/archive
```

---

### Faza 3: Reorganizacja Plików z Root
**Agent:** `documentation-architect`
**Czas:** ~20 min

#### 3.1 Pliki do `docs/architecture/`

| Źródło | Cel |
|--------|-----|
| `DATABASE_TABLES_DESCRIPTION.md` | `docs/architecture/database.md` |
| `DOCS.md` | `docs/architecture/api-endpoints.md` |

#### 3.2 Pliki do `docs/guides/`

| Źródło | Cel |
|--------|-----|
| `docs/DEVELOPER_GUIDE_TRANSACTIONS.md` | `docs/guides/transactions.md` |
| `docs/REVERSE_OPERATIONS.md` | `docs/guides/reverse-operations.md` |
| `DONT_DO.md` | `docs/guides/anti-patterns.md` |

#### 3.3 Pliki do `docs/features/` (konsolidacja)

| Temat | Pliki źródłowe | Cel |
|-------|----------------|-----|
| Dostawy | `FULL_STACK_PALLET_OPTIMIZATION_COMPLETE.md`, `PALLET_OPTIMIZATION_FIXES.md`, `OPTIMIZATION_IMPLEMENTATION.md`, `PLAN_LIST_VIEW_DOSTAW.md`, `PLAN_WIZUALIZACJA_PALET.md` | `docs/features/deliveries.md` |
| Raporty | `PDF_EXPORT_IMPLEMENTATION.md`, `MONTHLY_REPORTS_FEATURE.md`, `MONTHLY_REPORTS_DOCUMENTATION.md`, `PROFILE_STATS_FEATURE.md` | `docs/features/reports.md` |
| Schuco | `SCHUCO_OPTIMIZATIONS.md` | `docs/features/schuco.md` |

#### 3.4 Pliki do `docs/user-guides/`

| Źródło | Cel |
|--------|-----|
| `SCHUCO_UZYTKOWNIK.md` | `docs/user-guides/schuco.md` |

#### 3.5 Pliki do `docs/security/`

| Źródło | Cel |
|--------|-----|
| `ANALIZA_BEZPIECZENSTWA_I_BLEDOW.md` | `docs/security/analysis.md` |

#### 3.6 Pliki do `.plan/` (reorganizacja)

| Źródło | Cel |
|--------|-----|
| `PLAN_PROJEKTU.md` | `.plan/PLAN_PROJEKTU.md` |
| `STAN_PROJEKTU.md` | `.plan/STAN_PROJEKTU.md` |
| `.plan/remanent-*.md` (5 plików) | `.plan/remanent/*.md` (bez prefixu) |

#### 3.7 Pliki do `.plan/archive/` (zakończone plany)

| Plik | Powód archiwizacji |
|------|-------------------|
| `DATABASE_OPTIMIZATION_PLAN.md` | Zakończony |
| `DB_OPTIMIZATION_SUMMARY.md` | Zakończony |
| `OPTIMIZATION_COMPLETE.md` | Zakończony |
| `OPTIMIZATION_FINAL_SUMMARY.md` | Zakończony |
| `NEXT_OPTIMIZATION_PROMPT.md` | Historyczny |

#### 3.8 Pliki do `docs/archive/reviews/` (zakończone przeglądy)

| Plik |
|------|
| `CODE_REVIEW_2_FIXES.md` |
| `PDF_CODE_REVIEW_FIXES.md` |
| `CRITICAL_REVIEW.md` |
| `FINAL_REVIEW.md` |
| `IMPLEMENTATION_REVIEW.md` |

#### 3.9 Pliki do `dev/archive/` (zakończone implementacje)

| Plik |
|------|
| `BACKEND_COMPLETE_SUMMARY.md` |
| `FIX_COMPLETE.md` |
| `FIXES_TO_APPLY.md` |
| `IMPROVEMENTS_APPLIED.md` |
| `OPTION_B_COMPLETE.md` |

---

### Faza 4: Pliki Pozostające w Root

| Plik | Powód |
|------|-------|
| `CLAUDE.md` | Wymagany przez Claude Code |
| `CHANGELOG.md` | Standardowa lokalizacja |
| `zarys.md` | Krótki zarys → może być częścią README |
| `PROJECT_CONTEXT.md` | Kontekst projektu |
| `DEV_WORKFLOW.md` | Workflow dewelopera |
| `DEPLOYMENT_READY.md` | Status wdrożenia |
| `NEXT_STEPS.md` | Aktywne następne kroki |
| `COMPONENT_TEMPLATE.md` | Aktywny szablon |
| `TODO_FRONTEND.md` | Aktywne TODO |

---

### Faza 5: Utworzenie README.md
**Agent:** `documentation-architect`
**Czas:** ~15 min

Utworzenie głównego `README.md` zawierającego:
- Krótki opis projektu (z `zarys.md`)
- Quick start (komendy `pnpm dev`)
- Struktura projektu (drzewo katalogów)
- Linki do dokumentacji
- Tech stack
- Jak kontrybuować

---

### Faza 6: Aktualizacja README i Walidacja
**Agent:** `code-architecture-reviewer`
**Czas:** ~10 min

1. Aktualizacja `docs/README.md` - nowy spis treści
2. Utworzenie `.plan/README.md` - spis planów
3. Weryfikacja wszystkich linków między dokumentami
4. Test nawigacji dla nowego użytkownika

---

## Podsumowanie Zmian

### Do Usunięcia
| Element | Rozmiar |
|---------|---------|
| `claude-int/` (cały katalog) | ~7.5 MB |

### Do Przeniesienia
- ~25 plików `.md` z root do odpowiednich katalogów
- ~5 plików `.plan/remanent-*.md` do `.plan/remanent/`

### Do Utworzenia
- `README.md` w root
- 8 nowych katalogów w `docs/`
- 2 nowe katalogi w `.plan/`
- 1 nowy katalog w `dev/`
- 3 pliki README.md (docs, .plan, root)

### Oczekiwany Rezultat
| Lokalizacja | Przed | Po |
|-------------|-------|-----|
| Root `.md` | 40 | 8-10 |
| docs/ | 9 | ~15 (zorganizowane) |
| .plan/ | 11 | ~15 (zorganizowane) |
| **Duplikaty** | 7.5 MB | 0 |

---

## Ryzyka i Mitygacja

| Ryzyko | Prawdopodobieństwo | Mitygacja |
|--------|-------------------|-----------|
| Zerwane linki w dokumentach | Średnie | Grep dla wszystkich referencji przed przeniesieniem |
| Utrata ważnych informacji | Niskie | Commit checkpoint przed rozpoczęciem |
| Konflikt z aktywną pracą | Niskie | Komunikacja z zespołem |

---

## Agenci do Użycia

1. **code-refactor-master** - Faza 1 (usunięcie duplikatów)
2. **documentation-architect** - Fazy 2-5 (reorganizacja i tworzenie)
3. **code-architecture-reviewer** - Faza 6 (walidacja)

---

## Zatwierdzenie

Po zatwierdzeniu tego planu:
1. Utworzę commit checkpoint: "chore: checkpoint przed refaktoryzacją dokumentacji"
2. Uruchomię agentów równolegle gdzie to możliwe
3. Utworzę commit finalny z pełnym opisem zmian