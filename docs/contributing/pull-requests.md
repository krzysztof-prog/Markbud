# Pull Requests

Proces tworzenia i review Pull Requests w projekcie AKROBUD.

---

## Tworzenie PR

### 1. Tytul PR

- Jasny i opisowy
- Zgodny z convention (feat/fix/docs)

### 2. Opis PR

```markdown
## Opis
Krotki opis zmian (co i dlaczego)

## Zmiany
- Dodano modul X
- Poprawiono bug Y
- Zaktualizowano dokumentacje Z

## Test Plan
1. Uruchom `pnpm dev`
2. Przejdz do /deliveries
3. Sprawdz czy...

## Screenshots (jesli applicable)
[obrazki]

## Checklist
- [ ] Testy przechodza
- [ ] Linting pass
- [ ] Dokumentacja zaktualizowana
- [ ] Brak breaking changes (lub opisane)
```

### 3. Assignees

- Przypisz siebie jako autor
- Request review od team members

### 4. Labels

- `feature`, `bugfix`, `documentation`, etc.

---

## Code Review Process

### Jako Autor

- Odpowiadaj na komentarze
- Fix requested changes
- Re-request review po zmianach
- Nie merguj wlasnych PR bez review

### Jako Reviewer

- Review w ciagu 24h (jesli mozliwe)
- Sprawdz:
  - Kod quality
  - Testy
  - Dokumentacje
  - Breaking changes
- Uzywaj **Approve** / **Request Changes** / **Comment**

---

## Merge Strategy

| Typ PR | Strategia |
|--------|-----------|
| Male PR | Squash and merge |
| Duze feature branches | Merge commit |

**Wazne:** Never force push po review (chyba ze reviewer prosi)

---

## PR Template

Mozesz uzyc tego template przy tworzeniu PR:

```markdown
## Opis
<!-- Krotki opis co i dlaczego -->

## Zmiany
- [ ] Zmiana 1
- [ ] Zmiana 2

## Test Plan
1. Krok 1
2. Krok 2
3. Oczekiwany rezultat

## Screenshots
<!-- Jesli applicable -->

## Checklist
- [ ] Testy przechodza (`pnpm test`)
- [ ] Linting pass (`pnpm lint`)
- [ ] Type check pass (`pnpm type-check`)
- [ ] Dokumentacja zaktualizowana
- [ ] Brak breaking changes

## Related Issues
<!-- Fixes #123 -->
```

---

**Powrot do:** [CONTRIBUTING](../../CONTRIBUTING.md)
