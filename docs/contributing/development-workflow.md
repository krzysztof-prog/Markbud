# Development Workflow

Ten dokument opisuje proces pracy z kodem w projekcie AKROBUD.

---

## 1. Wybierz Task

- Sprawdz otwarte Issues lub Beads tasks:
  ```bash
  bd list
  ```
- Wybierz task albo stworz nowy Issue
- Przypisz sie do task

---

## 2. Utworz Branch

```bash
# Feature branch
git checkout -b feature/nazwa-funkcji

# Bugfix branch
git checkout -b fix/opis-bugfixa

# Dokumentacja
git checkout -b docs/opis-zmian
```

**Konwencja nazewnictwa:**
- `feature/` - nowe funkcje
- `fix/` - poprawki bugow
- `docs/` - zmiany w dokumentacji
- `refactor/` - refactoring kodu
- `test/` - dodanie/poprawa testow

---

## 3. Wprowadz Zmiany

- Stosuj sie do [Coding Standards](./coding-standards.md)
- Commituj czesto, male atomic commits
- Pisz testy dla nowego kodu
- Aktualizuj dokumentacje

---

## 4. Commit Changes

```bash
git add .
git commit -m "feat: dodaj modul eksportu raportow PDF"
```

Zobacz: [Git Workflow - Commit Message Convention](./git-workflow.md#commit-message-convention)

---

## 5. Push & Create PR

```bash
git push origin feature/nazwa-funkcji
```

Nastepnie utworz Pull Request na GitHubie.

Zobacz: [Pull Requests](./pull-requests.md)

---

## Podsumowanie Workflow

```
1. Wybierz/stworz Issue
          |
          v
2. Utworz branch (feature/fix/docs)
          |
          v
3. Koduj + testy + docs
          |
          v
4. Commit (conventional commits)
          |
          v
5. Push + Create PR
          |
          v
6. Code Review
          |
          v
7. Merge
```

---

**Powrot do:** [CONTRIBUTING](../../CONTRIBUTING.md)
