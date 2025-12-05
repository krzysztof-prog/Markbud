# Plan wdrożenia automatyzacji Claude Code

## CZĘŚĆ A: CO MOŻNA ZAUTOMATYZOWAĆ (wdrożę bez Twojego udziału)

### ✅ Już zaimplementowane w projekcie:
- **#4 Wyspecjalizowane agenty** - masz 8 agentów w `.claude/agents/`
- **#8 Hooki Claude Code** - `UserPromptSubmit` i `PostToolUse` skonfigurowane
- **#17 Osobne agenty dla frontend/backend** - skills `backend-dev-guidelines` i `frontend-dev-guidelines`
- **#26 Pre-defined agents i rules** - skills z resources dla techstacka

---

### 🔧 Do wdrożenia automatycznego:

#### 1. CLAUDE.md - Główny plik kontekstu (#15, #24, #32, #49)
**Co robi:** Automatycznie ładowany przy każdej sesji z kontekstem projektu
```
Utworzę: /CLAUDE.md
```

#### 2. PROJECT_CONTEXT.md - Stan projektu (#15, #28)
**Co robi:** Aktualizowany po każdej sesji - co zostało zrobione, co w trakcie
```
Utworzę: /PROJECT_CONTEXT.md
```

#### 3. DONT_DO.md - Lista błędów do unikania (#23)
**Co robi:** Przechowuje lekcje z przeszłych błędów
```
Utworzę: /DONT_DO.md
```

#### 4. Hook: Auto-typecheck po edycji (#39, #44)
**Co robi:** Po każdej zmianie kodu automatycznie sprawdza TypeScript
```
Dodam do PostToolUse hook
```

#### 5. Hook: Przypomnienie o commit (#20)
**Co robi:** Po X zmianach przypomina o commitowaniu
```
Dodam do PostToolUse hook
```

#### 6. Slash commands dla rutynowych zadań (#7, #34)
**Co robią:** Automatyzują powtarzalne operacje
```
Utworzę: /.claude/commands/
  - debug.md - plan debugowania
  - review.md - przegląd kodu
  - test-fix.md - napraw błędy testów
  - commit.md - przygotuj commit
```

#### 7. Security scanner hook (#44, #45)
**Co robi:** Sprawdza kod pod kątem SQL injection, XSS itp.
```
Dodam pattern matching w hook
```

#### 8. Pre-commit validation (#39)
**Co robi:** Przed commitem sprawdza lint + typecheck
```
Dodam do git hooks lub Claude hooks
```

---

## CZĘŚĆ B: CHECKLIST DLA CIEBIE (wymaga manualnego działania)

### Przed każdą sesją:
- [ ] **#1** Napisz spec funkcji PRZED otwarciem Claude (planning doc)
- [ ] **#2** Przygotuj kontekst: screenshoty, schematy DB, API docs
- [ ] **#9** Jedna funkcja na chat - nie mieszaj zadań
- [ ] **#24** Sprawdź czy CLAUDE.md jest aktualny

### Podczas sesji:
- [ ] **#11** Używaj screenshotów - przeciągnij do terminala
- [ ] **#16** Przy fixach mów "Fix this without changing anything else"
- [ ] **#18** Pytaj "Explain what you changed and why"
- [ ] **#19** Ustawiaj checkpointy: "Stop after X and wait"
- [ ] **#25** Jeśli Claude się myli - wyjaśnij sobie problem pierwszy
- [ ] **#26** Dawaj jedno zadanie naraz, nie łańcuchy
- [ ] **#30** Mów konkretnie: "Use X agent for Y task"
- [ ] **#31** Używaj sub-agentów do research, nie do zmian
- [ ] **#33** Przed długimi promptami - puść przez inny LLM
- [ ] **#36** Po każdym zadaniu: "Re-check your work and prove it was done correctly"
- [ ] **#37** Przy zapętleniu - poproś o debug output, potem podaj
- [ ] **#47** Dla trudnych problemów pisz "think hard" lub "ultrathink"
- [ ] **#48** Jeśli Claude ignoruje reguły - powtórz je z #

### Po każdej funkcji:
- [ ] **#10** "Review your work and list what might be broken"
- [ ] **#12** Testuj aż działa - "Should work" = nie działa
- [ ] **#20** Git commit po KAŻDEJ działającej funkcji

### Po sesji:
- [ ] **#15** Zaktualizuj PROJECT_CONTEXT.md (lub poproś Claude)
- [ ] **#23** Dodaj do DONT_DO.md jeśli były problemy
- [ ] **#50** Zaktualizuj global knowledge base

### Organizacja pracy:
- [ ] **#6** Przy 50% tokenlimit - zacznij nową sesję
- [ ] **#13** Pliki reguł < 100 linii
- [ ] **#14** TDD - napisz test przed kodem
- [ ] **#21** Przed debugowaniem - stwórz plan
- [ ] **#22** Pisz kod który "future self can modify"
- [ ] **#35** Przy refactoring - prowadź log w .md lub .json

### MCPs i narzędzia (jednorazowa konfiguracja):
- [ ] **#5** Zainstaluj niezbędne MCPs (Sequential Thinker, Context7, GitHub)
- [ ] **#27** Rozważ Playwright MCP dla UI
- [ ] **#38** Usuń niepotrzebne MCPs
- [ ] **#43** Rozważ ccundo dla version control edycji
- [ ] **#46** Dodaj rate limiting do APIs (Upstash)

---

## HARMONOGRAM WDROŻENIA

### Faza 1 (teraz):
1. ✅ Utworzę CLAUDE.md
2. ✅ Utworzę PROJECT_CONTEXT.md
3. ✅ Utworzę DONT_DO.md
4. ✅ Utworzę slash commands

### Faza 2 (po aprobacie):
1. Hook: auto-typecheck
2. Hook: przypomnienie commit
3. Hook: security scan

---

## Czy zatwierdzasz plan?

Po Twojej aprobacie wdrożę Fazę 1 automatycznie.
