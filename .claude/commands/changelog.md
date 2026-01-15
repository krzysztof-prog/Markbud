# Changelog Generator

Generuje changelog z commitów od ostatniego release/taga.

## Kiedy używać

- Przed release
- Po zakończeniu sprintu
- Do dokumentacji dla użytkowników

## Co robię

### 1. Zbieram commity

```bash
# Od ostatniego taga
git log --oneline $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~50")..HEAD

# Lub od konkretnej daty
git log --oneline --since="2024-01-01"

# Lub od konkretnego commita
git log --oneline abc123..HEAD
```

### 2. Grupuję według typu

Rozpoznaję prefiks:
- `feat:` → New Features
- `fix:` → Bug Fixes
- `refactor:` → Refactoring
- `docs:` → Documentation
- `test:` → Tests
- `chore:` → Maintenance
- `perf:` → Performance

### 3. Generuję changelog

```markdown
# Changelog

## [1.2.0] - 2024-01-15

### New Features
- Dodano możliwość filtrowania zleceń po statusie (#123)
- Nowy widok kalendarza dostaw (#125)
- Eksport raportów do PDF (#128)

### Bug Fixes
- Naprawiono błąd wyświetlania kwot w podsumowaniu (#124)
- Poprawiono sortowanie listy zleceń (#126)
- Naprawiono brak walidacji daty dostawy (#127)

### Refactoring
- Wydzielono deliveryService z orderService (#129)
- Uproszczono logikę kalkulacji cen (#130)

### Documentation
- Zaktualizowano README z nowymi instrukcjami (#131)
- Dodano dokumentację API dla /deliveries (#132)

### Maintenance
- Zaktualizowano zależności (#133)
- Poprawiono konfigurację ESLint (#134)

---

## [1.1.0] - 2024-01-01

### New Features
- ...
```

## Format dla użytkowników (CHANGELOG_USER.md)

Uproszczony changelog bez szczegółów technicznych:

```markdown
# Co nowego w aplikacji

## Wersja 1.2.0 (15 stycznia 2024)

### Nowe funkcje
- **Filtrowanie zleceń** - Możesz teraz filtrować zlecenia po statusie (W realizacji, Zakończone, itp.)
- **Kalendarz dostaw** - Nowy widok kalendarza pokazujący planowane dostawy
- **Eksport do PDF** - Raporty można teraz eksportować do pliku PDF

### Poprawki
- Poprawiono wyświetlanie kwot w podsumowaniach
- Naprawiono sortowanie listy zleceń
- Poprawiono walidację dat

---

## Wersja 1.1.0 (1 stycznia 2024)
...
```

## Przykłady użycia

```bash
# Changelog od ostatniego taga
/changelog

# Changelog od konkretnej daty
/changelog --since 2024-01-01

# Changelog od konkretnego commita
/changelog --from abc123

# Tylko dla użytkowników (bez tech details)
/changelog --user

# Zapisz do pliku
/changelog --output CHANGELOG.md
```

## Mapowanie commit message → changelog entry

| Commit | Changelog Entry |
|--------|-----------------|
| `feat: add order filtering by status` | Dodano możliwość filtrowania zleceń po statusie |
| `fix: resolve price calculation bug` | Naprawiono błąd kalkulacji cen |
| `fix(delivery): correct date validation` | Poprawiono walidację dat dostaw |

## Teraz

Podaj zakres commitów do wygenerowania changelog:

```
Przykład: "od ostatniego taga"
Przykład: "od 2024-01-01"
Przykład: "ostatnie 20 commitów"
```
