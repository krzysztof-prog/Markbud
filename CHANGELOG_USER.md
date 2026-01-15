# 📝 Co nowego? - AKROBUD

Historia zmian w aplikacji (dla użytkowników).

---

## [1.0.0] - 2026-01-13

### ✨ Nowe funkcje

**System Zgłaszania Błędów**
- Dodano przycisk "🐛 Zgłoś problem" w prawym dolnym rogu każdej strony
- Możesz teraz łatwo zgłosić problem bezpośrednio z aplikacji
- Zgłoszenia trafiają do administratora automatycznie

**System Health Dashboard (tylko dla administratorów)**
- Nowa strona **Admin → System Health** z monitoringiem stanu systemu
- Sprawdzanie połączenia z bazą danych, folderami sieciowymi, ostatnimi importami
- Automatyczne odświeżanie co 30 sekund

**Bezpieczne Aktualizacje**
- Nowy system aktualizacji z automatycznym rollbackiem
- Jeśli coś pójdzie nie tak podczas aktualizacji, system automatycznie wróci do poprzedniej wersji
- Backupy bazy danych przed każdą aktualizacją

### 🐛 Poprawki

*Brak (pierwsza wersja produkcyjna)*

### ⚙️ Zmiany techniczne

- Zaktualizowano ścieżkę projektu produkcyjnego na `C:\markbud`
- Dodano automatyczne health checks
- Dodano logi zgłoszeń błędów w `logs/bug-reports.log`

---

## Jak czytać ten dokument?

- **✨ Nowe funkcje** - co zostało dodane
- **🐛 Poprawki** - co zostało naprawione
- **⚙️ Zmiany techniczne** - zmiany które nie są widoczne dla użytkownika (ale ważne)

---

## Gdzie zgłosić problem?

Kliknij przycisk **"🐛 Zgłoś problem"** w prawym dolnym rogu aplikacji.

---

## Gdzie znaleźć więcej informacji?

- [Przewodnik testowania](docs/guides/production-testing-guide.md) - jak zgłaszać problemy
- [Dokumentacja użytkownika](docs/user-guides/) - jak używać aplikacji
