# Konfiguracja Folderów - Dokumentacja Funkcji

**Data implementacji:** 2025-12-07
**Status:** ✅ Zaimplementowane

---

## Opis funkcji

Funkcja umożliwia konfigurowanie ścieżek folderów przez UI zamiast hardcoded wartości w kodzie. Użytkownik może przeglądać dyski i foldery Windows, ręcznie wpisać ścieżkę z walidacją, oraz restartować File Watcher po zmianie ustawień.

---

## Skonfigurowane foldery

| Ustawienie | Opis | Domyślna wartość |
|------------|------|------------------|
| `importsBasePath` | Główna ścieżka do folderów z dostawami (CSV z PROF) | `C:\Dostawy` |
| `watchFolderUzyteBele` | Folder z plikami CSV "użyte bele" | `./uzyte bele` |
| `watchFolderCeny` | Folder z plikami PDF cen | `./ceny` |

---

## Komponenty

### Backend (API)

#### Nowe endpointy w `settings.ts`:

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/api/settings/browse-folders` | GET | Przeglądanie dysków i folderów Windows |
| `/api/settings/validate-folder` | POST | Walidacja czy ścieżka istnieje |
| `/api/settings/file-watcher/status` | GET | Status i aktualne ścieżki file watchera |
| `/api/settings/file-watcher/restart` | POST | Restart file watchera po zmianie ustawień |

#### Zmiany w `imports.ts`:

- Dodano funkcję `getImportsBasePath()` - pobiera ścieżkę z bazy zamiast hardcoded
- 3 miejsca zmienione z `process.env.IMPORTS_BASE_PATH || 'C:\\Dostawy'` na `await getImportsBasePath()`

#### Zmiany w `file-watcher.ts`:

- Dodano metodę `restart()` - zatrzymuje i uruchamia watchery ponownie
- Dodano metodę `getCurrentPaths()` - zwraca aktualne ścieżki do UI

#### Zmiany w `index.ts`:

- Eksportowany `fileWatcher` jako `let` (zamiast lokalnej zmiennej) do użytku w routes

### Frontend (Web)

#### Nowy komponent `FolderBrowser`:

**Lokalizacja:** `apps/web/src/components/ui/folder-browser.tsx`

**Funkcje:**
- Przeglądanie dysków Windows (A-Z)
- Nawigacja po folderach z przyciskiem "wstecz"
- Ręczne wpisywanie ścieżki z walidacją (debounce 500ms)
- Wizualny feedback: zielona ramka = valid, czerwona = invalid
- Dialog z listą folderów (ScrollArea)

**Props:**
```typescript
interface FolderBrowserProps {
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  label?: string;
  description?: string;
}
```

#### Nowe komponenty UI:

- `scroll-area.tsx` - przewijalna lista (Radix)
- `alert.tsx` - alerty statusów (default, destructive, warning)

#### Zmiany w `ustawienia/page.tsx`:

- Nowa karta "Folder importów dostaw" dla `importsBasePath`
- Użycie `FolderBrowser` dla wszystkich ścieżek
- Karta "Status monitorowania" z aktualną konfiguracją file watchera
- Przycisk "Zapisz i restartuj watcher"

---

## Przepływ danych

```
1. Użytkownik otwiera Ustawienia → Foldery
2. FolderBrowser pobiera aktualną wartość z settings API
3. Użytkownik klika ikonę folderu → otwiera się dialog
4. Dialog pobiera listę dysków/folderów z /api/settings/browse-folders
5. Użytkownik nawiguje (double-click) i wybiera folder
6. Po kliknięciu "Wybierz" → onChange wywołuje handleSettingChange
7. Użytkownik klika "Zapisz i restartuj watcher"
8. PUT /api/settings zapisuje ustawienia
9. POST /api/settings/file-watcher/restart restartuje watchery
10. File Watcher używa nowych ścieżek
```

---

## Priorytet ścieżek (od najwyższego)

1. **Zmienna środowiskowa** (`process.env.WATCH_FOLDER_*`)
2. **Ustawienie w bazie** (tabela `Setting`)
3. **Wartość domyślna** (hardcoded fallback)

---

## Walidacja bezpieczeństwa

- Normalizacja ścieżek (`path.normalize`)
- Sprawdzenie czy ścieżka jest folderem (nie plikiem)
- Sprawdzenie uprawnień do odczytu (`fs.constants.R_OK`)
- Filtrowanie plików systemowych (`$RECYCLE.BIN`, `System Volume Information`, etc.)
- Filtrowanie ukrytych folderów (`.nazwa`)

---

## Użycie

### W ustawieniach (UI):

1. Przejdź do **Ustawienia → Foldery**
2. Kliknij ikonę folderu przy polu ścieżki
3. Przeglądaj dyski i foldery, double-click aby wejść
4. Kliknij "Wybierz" aby potwierdzić
5. Kliknij "Zapisz i restartuj watcher" aby zastosować

### Programowo (API):

```typescript
// Pobranie aktualnych ścieżek
const response = await fetch('/api/settings/file-watcher/status');
const { paths } = await response.json();
// paths.importsBasePath, paths.watchFolderUzyteBele, paths.watchFolderCeny

// Zmiana ścieżki
await fetch('/api/settings', {
  method: 'PUT',
  body: JSON.stringify({ importsBasePath: 'D:\\Dostawy' }),
});

// Restart file watchera
await fetch('/api/settings/file-watcher/restart', { method: 'POST' });
```

---

## Zależności

### Backend:
- `fs` (Node.js built-in) - operacje na systemie plików
- `path` (Node.js built-in) - normalizacja ścieżek

### Frontend:
- `@radix-ui/react-scroll-area` - przewijalna lista folderów
- `class-variance-authority` - warianty Alert

---

## Testowanie

### Manualne:

1. Uruchom aplikację
2. Przejdź do Ustawienia → Foldery
3. Sprawdź czy wyświetlają się aktualne ścieżki
4. Kliknij przeglądaj → wybierz folder → zapisz
5. Sprawdź status file watchera po restarcie

### API:

```bash
# Lista dysków
curl http://localhost:3001/api/settings/browse-folders

# Zawartość folderu
curl "http://localhost:3001/api/settings/browse-folders?path=C:\\"

# Walidacja
curl -X POST http://localhost:3001/api/settings/validate-folder \
  -H "Content-Type: application/json" \
  -d '{"path": "C:\\Dostawy"}'

# Status file watchera
curl http://localhost:3001/api/settings/file-watcher/status
```

---

## Znane ograniczenia

1. **Tylko foldery** - nie można wybierać plików
2. **Tylko Windows** - endpoint browse-folders sprawdza dyski A-Z
3. **Brak breadcrumbs** - nawigacja tylko przez "wstecz"
4. **Brak tworzenia folderów** - użytkownik musi stworzyć folder w Eksploratorze

---

*Dokumentacja wygenerowana: 2025-12-07*
