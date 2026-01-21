# Issue Reporting

Jak zglaszac bugi i feature requests w projekcie AKROBUD.

---

## Zglaszanie Bugow

### Template

```markdown
## Opis problemu
Krotki opis co nie dziala

## Kroki do reprodukcji
1. Przejdz do...
2. Kliknij...
3. Obserwuj blad...

## Oczekiwane zachowanie
Co powinno sie stac

## Aktualne zachowanie
Co sie dzieje zamiast tego

## Screenshots
(jesli applicable)

## Environment
- OS: Windows 10
- Browser: Chrome 120
- Node version: 20.10.0
- AKROBUD version: 1.0.0

## Dodatkowy kontekst
Logi, error messages, etc.
```

### Przyklad dobrego bug report

```markdown
## Opis problemu
Kalendarz dostaw nie wyswietla dostaw z dzisiejszego dnia

## Kroki do reprodukcji
1. Przejdz do /dostawy/kalendarz
2. Wybierz dzisiejszy dzien
3. Nie wyswietlaja sie dostawy mimo ze sa w bazie

## Oczekiwane zachowanie
Powinny wyswietlic sie 3 dostawy zaplanowane na dzis

## Aktualne zachowanie
Kalendarz pokazuje pusty dzien

## Screenshots
[Screenshot pustego kalendarza]

## Environment
- OS: Windows 10
- Browser: Chrome 120
- Node version: 20.10.0
- AKROBUD version: 1.2.0

## Dodatkowy kontekst
Console log:
```
Error: Invalid date format in delivery query
```
```

---

## Feature Requests

### Template

```markdown
## Opis feature
Co chcesz dodac i dlaczego

## Use Case
Jak bedzie uzywane

## Proposed Solution
Twoj pomysl na implementacje (opcjonalnie)

## Alternatives
Inne rozwazane opcje

## Additional Context
Screenshots, mockupy, etc.
```

### Przyklad dobrego feature request

```markdown
## Opis feature
Eksport listy zlecen do PDF

## Use Case
Uzytkownik chce wydrukowac liste zlecen na dany tydzien
aby miec papierowa kopie dla produkcji

## Proposed Solution
1. Dodac przycisk "Eksport PDF" na stronie /zlecenia
2. Generowac PDF z tabela zlecen (numer, klient, status, termin)
3. Pobierac plik automatycznie

## Alternatives
- Export do Excel (ale uzytkownicy wola PDF)
- Drukowanie strony (ale formatowanie jest zle)

## Additional Context
Mockup przycisku:
[obrazek]

Uzytkownicy chca PDF bo:
- Latwiejszy do wydruku
- Lepiej wyglada
- Mozna dodac logo firmy
```

---

## Labels

Uzywaj odpowiednich labels przy tworzeniu Issue:

| Label | Opis |
|-------|------|
| `bug` | Cos nie dziala |
| `feature` | Nowa funkcjonalnosc |
| `enhancement` | Ulepszenie istniejacego feature |
| `documentation` | Zmiany w dokumentacji |
| `question` | Pytanie do dyskusji |
| `help wanted` | Potrzebna pomoc |
| `good first issue` | Dobre dla nowych kontrybutorów |

---

## Priorytety

| Priorytet | Kiedy uzywac |
|-----------|--------------|
| `critical` | Aplikacja nie dziala, dane ginace |
| `high` | Wazna funkcja nie dziala |
| `medium` | Bug/feature moze poczekac |
| `low` | Nice to have |

---

**Powrot do:** [CONTRIBUTING](../../CONTRIBUTING.md)
