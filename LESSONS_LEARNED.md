# Lessons Learned - Błędy z historii projektu

> **Claude:** Przeczytaj ten plik żeby NIE POWTARZAĆ błędów z przeszłości!
> Każdy wpis to rzeczywisty błąd który został popełniony i naprawiony.

---

## Indeks - Pliki tematyczne

Dokumentacja została podzielona na mniejsze pliki tematyczne dla łatwiejszej nawigacji:

| Kategoria | Plik | Opis |
|-----------|------|------|
| **Auth & Security** | [auth-security.md](docs/lessons-learned/auth-security.md) | Tokeny, autoryzacja, klucze localStorage |
| **Money & Financial** | [money-financial.md](docs/lessons-learned/money-financial.md) | Operacje na kwotach, grosze vs PLN |
| **Imports & Parsing** | [imports-parsing.md](docs/lessons-learned/imports-parsing.md) | Import CSV, raportowanie błędów |
| **Data Operations** | [data-operations.md](docs/lessons-learned/data-operations.md) | Usuwanie danych, double-submit, UX buttonów |
| **Frontend & Performance** | [frontend-performance.md](docs/lessons-learned/frontend-performance.md) | Lazy loading, responsive, type safety |
| **Infrastructure** | [infrastructure.md](docs/lessons-learned/infrastructure.md) | Kompresja, routing, WebSocket, cache |
| **Testing** | [testing.md](docs/lessons-learned/testing.md) | Brak testów, regresje |

---

## Szybki przegląd - Najważniejsze lekcje

### P0 - Krytyczne (NIE IGNORUJ!)

| Data | Problem | Lekcja | Plik |
|------|---------|--------|------|
| 2025-12-30 | Kwoty x100 za duże | ZAWSZE `money.ts` dla operacji na pieniądzach | [money-financial.md](docs/lessons-learned/money-financial.md) |
| 2026-01-15 | 401 mimo zalogowania | JEDEN klucz tokena, ZAWSZE wysyłaj Authorization | [auth-security.md](docs/lessons-learned/auth-security.md) |
| 2026-01-05 | Dashboard nie ładował się | WebSocket graceful degradation, cache validation | [infrastructure.md](docs/lessons-learned/infrastructure.md) |

### P1 - Ważne

| Data | Problem | Lekcja | Plik |
|------|---------|--------|------|
| 2025-12-XX | Import "successful" ale dane znikły | Raportuj `{ success, failed, errors[] }` | [imports-parsing.md](docs/lessons-learned/imports-parsing.md) |
| 2025-12-XX | Przypadkowe usunięcie dostawy | Soft delete + confirmation dialog | [data-operations.md](docs/lessons-learned/data-operations.md) |
| 2025-12-XX | Double-submit = duplikaty | `disabled={isPending}` na buttonach | [data-operations.md](docs/lessons-learned/data-operations.md) |

### P2 - Jakość

| Data | Problem | Lekcja | Plik |
|------|---------|--------|------|
| 2026-01-16 | gzip + CORS = puste odpowiedzi | NIE używaj @fastify/compress z CORS | [infrastructure.md](docs/lessons-learned/infrastructure.md) |
| 2025-12-XX | Tabele nieużywalne na telefonie | Card view dla mobile < 768px | [frontend-performance.md](docs/lessons-learned/frontend-performance.md) |
| 2025-12-XX | Wolny initial load (8-10s) | Lazy loading ciężkich komponentów | [frontend-performance.md](docs/lessons-learned/frontend-performance.md) |
| 2026-01-02 | Regresja bez testów | Minimum: happy path tests dla services | [testing.md](docs/lessons-learned/testing.md) |

---

## Format wpisu (dla nowych błędów)

```markdown
## [Data] - [Tytuł błędu]
**Co się stało:** [opis problemu]
**Root cause:** [dlaczego to się stało]
**Impact:** [jakie były konsekwencje]
**Fix:** [jak naprawiono]
**Prevention:** [jak zapobiec w przyszłości]
**Lekcja:** [główny wniosek]
```

---

## Jak dodawać nowe wpisy

### Gdy znajdziesz nowy błąd:

1. **Wybierz odpowiedni plik** z `docs/lessons-learned/`
2. **Skopiuj template** (format powyżej)
3. **Wypełnij wszystkie sekcje** - bądź szczegółowy!
4. **Dodaj datę** w formacie YYYY-MM-DD
5. **Umieść na początku pliku** (najnowsze wpisy na górze)
6. **Zaktualizuj tabelę** w tym indeksie jeśli to błąd P0/P1
7. **Aktualizuj [COMMON_MISTAKES.md](COMMON_MISTAKES.md)** jeśli potrzeba nowej sekcji DO/DON'T

### Format commit message:
```
docs: Add lesson learned - [krótki tytuł]

Date: YYYY-MM-DD
Severity: [Low/Medium/High/Critical]
Category: [Backend/Frontend/Database/UX/Performance]
```

---

## Statystyki błędów

**Całkowite wpisy:** 12
**Ostatnia aktualizacja:** 2026-01-20

**Kategorie:**
- Auth/Security: 1 wpis
- Money/Financial: 1 wpis
- Imports/Parsing: 1 wpis
- Data Operations: 2 wpisy
- Frontend/Performance: 3 wpisy
- Infrastructure: 3 wpisy
- Testing: 1 wpis

**Severity:**
- Critical: 3 (Dashboard kwoty, Auth token, WebSocket interference)
- High: 2 (Import, Deletion)
- Medium: 7 (reszta)

---

**Pamiętaj:** Każdy błąd to lekcja. Nie powtarzaj historii!

**Następny krok:** Sprawdź [COMMON_MISTAKES.md](COMMON_MISTAKES.md) - konkretne DO/DON'T rules.
