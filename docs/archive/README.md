# Archiwum Dokumentacji AKROBUD

Katalog zawiera historyczną dokumentację projektu uporządkowaną chronologicznie.

## Struktura

### 2025/

#### fazy/
Dokumentacja zakończonych faz implementacji:
- FAZA_1: Critical Fixes (naprawy krytyczne)
- FAZA_2: Data Integrity (integrność danych)
- FAZA_3: Optional Enhancements (ulepszenia opcjonalne)
- FAZA_4: Testing (testy)

Pliki te dokumentują proces rozwoju projektu i stanowią źródło wiedzy o podjętych decyzjach.

#### reports/
Raporty z audytów i analiz:
- Audyty kodu (AUDIT_*.md)
- Raporty optymalizacji (INDEX_OPTIMIZATION_*.md, DATABASE_*.md)
- Podsumowania implementacji (IMPLEMENTATION_SUMMARY_*.md)
- Raporty modernizacji (RAPORT_*.md)

#### implementations/
Dokumentacja zakończonych implementacji:
- Migracje bazy danych
- Checklisty zmian
- Plany bezpieczeństwa
- Fixes i usprawnienia

## Zasady Archiwizacji

1. **Kiedy archiwizować:**
   - Po zakończeniu fazy/sprintu
   - Gdy dokument staje się nieaktualny
   - Gdy powstaje nowsza wersja dokumentu

2. **Struktura katalogów:**
   - Rok jako główny katalog (2025/, 2026/, etc.)
   - Podkatalogi według typu dokumentu

3. **Nazewnictwo:**
   - Zachowuj oryginalne nazwy plików
   - Dodaj datę archiwizacji w commits

4. **Metadata:**
   - Git commit message powinien wyjaśniać powód archiwizacji
   - Linki do aktualnych dokumentów zastępujących zarchiwizowane

## Dostęp do Aktualnej Dokumentacji

Aktualna dokumentacja znajduje się w:
- [README.md](../../README.md) - główny entry point
- [docs/](../) - dokumentacja techniczna
- [.plan/](../../.plan/) - aktywne plany
- [.claude/](../../.claude/) - konfiguracja AI

## Historia Archiwizacji

- **2025-12-30:** Utworzenie archiwum, przeniesienie plików FAZA, raportów i implementacji
