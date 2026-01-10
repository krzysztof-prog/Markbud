# Protected Modules - System zabezpieczania gotowych modułów

## Cel

Chroni "gotowe i przetestowane" moduły przed przypadkową modyfikacją przez Claude lub dewelopera.

Szczególnie przydatne dla:
- Modułów które już działają i są w produkcji
- Core utils (money.ts, logger.ts, errors.ts)
- Krytycznej logiki biznesowej
- Plików które były źródłem bugów w przeszłości

---

## Jak to działa

### 3 poziomy ochrony:

1. **File Lock Guard Hook** (`.claude/hooks/file-lock-guard.ts`)
   - Blokuje Claude przed zapisem do chronionych plików
   - Pokazuje ostrzeżenie z opcjami: Anuluj / Override / Odblokuj

2. **Protected Files Config** (`.claude/protected-files.json`)
   - Lista plików chronionych przed modyfikacją
   - Łatwa do edycji (JSON)

3. **Dokumentacja** (ten plik)
   - Rejestr chronionych modułów
   - Historia: kiedy i dlaczego zostały zablokowane
   - Dla ludzi (nie dla hooka)

---

## Jak dodać plik do ochrony

### Krok 1: Dodaj do `.claude/protected-files.json`

```json
{
  "protectedFiles": [
    "apps/api/src/utils/money.ts",
    "apps/api/src/utils/logger.ts",
    "apps/api/src/services/deliveryService.ts"
  ]
}
```

**Uwaga:** Ścieżki są **relatywne do roota projektu** (bez początkowego `/`).

### Krok 2: Dodaj wpis do dokumentacji (poniżej)

Zapisz:
- **Plik** - co zabezpieczono
- **Data** - kiedy
- **Powód** - dlaczego (np. "produkcja", "core logic", "źródło bugów")
- **Ostatnia zmiana** - ostatnia modyfikacja przed zablokowaniem

---

## Lista chronionych modułów

### 🔒 Core Utils

*Brak chronionych plików - lista pusta*

---

### 🔒 Services

*Brak chronionych plików - lista pusta*

---

### 🔒 Repositories

*Brak chronionych plików - lista pusta*

---

### �� Frontend Components

*Brak chronionych plików - lista pusta*

---

## Jak odblokować plik

### Opcja A: Tymczasowy override (jednorazowo)

Gdy Claude zobaczy ostrzeżenie File Lock Guard:
1. Zapytaj Claude: "Override - modyfikuj mimo ostrzeżenia"
2. Claude zapisze plik
3. **Dodaj komentarz w kodzie DLACZEGO była potrzebna zmiana**

### Opcja B: Trwałe odblokowanie

1. **Usuń plik z `.claude/protected-files.json`**
   ```json
   {
     "protectedFiles": [
       // Usuń linię z tym plikiem
     ]
   }
   ```

2. **Zaktualizuj ten dokument** (usuń wpis z listy powyżej)

3. **Dodaj notkę** - dlaczego został odblokowany

---

## FAQ

**Q: Czy mogę użyć wildcards (np. `apps/api/src/utils/*.ts`)?**
A: Nie, hook sprawdza dokładne dopasowanie lub substring. Możesz dodać folder: `apps/api/src/utils/` - zablokuje wszystkie pliki w tym folderze.

**Q: Czy hook blokuje manualne edycje (VS Code)?**
A: Nie, hook blokuje tylko Claude (Write/Edit/MultiEdit tools). Dewelopera nie powstrzyma.

**Q: Co jeśli hook się nie aktywuje?**
A: Sprawdź:
1. Czy hook jest włączony w `.claude/settings.json` (sekcja `hooks`)
2. Czy ścieżka w `protected-files.json` jest poprawna (relatywna, bez `/` na początku)
3. Czy plik faktycznie jest modyfikowany (nie tylko czytany)

**Q: Czy mogę chronić cały folder?**
A: Tak, dodaj ścieżkę do folderu: `"apps/api/src/utils/"` - wszystkie pliki w tym folderze będą chronione.

**Q: Co jeśli potrzebuję tylko ostrzeżenia (bez blokady)?**
A: Obecnie hook **zawsze blokuje**. Jeśli chcesz tylko reminder, użyj komentarza `// @protected` na górze pliku + dodaj do dokumentacji.

---

## Historia zmian

| Data       | Akcja                          | Kto          |
|------------|--------------------------------|--------------|
| 2026-01-08 | Utworzenie systemu protected files | Krzysztof + Claude |

---

**Pamiętaj:** System blokowania to **ostatnia deska ratunku**, nie substytut code review. Używaj z umiarem.
