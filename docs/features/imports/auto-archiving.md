# Auto-archiwizacja zaimportowanych plików

## 📦 Przegląd

System AKROBUD automatycznie **archiwizuje pomyślnie zaimportowane pliki** przenosząc je do podfolderu `_archiwum`.

**Cel:** Uporządkowanie folderów importów - pliki już przetworzone są oddzielone od nowych.

---

## 🎯 Jak to działa

### 1. **Foldery "użyte bele"** (cały folder)

```
C:\MB\uzyte_bele\
├── 05.01.2025\              ← Folder z plikami CSV
│   ├── 53330_uzyte_bele.csv
│   └── 53348_uzyte_bele.csv
├── 08.01.2025\
└── _archiwum\               ← AUTOMATYCZNIE UTWORZONE
    ├── 05.01.2025\          ← Przeniesione PO IMPORCIE
    └── 08.01.2025\
```

**Logika archiwizacji:**
- ✅ **Import zakończony pomyślnie** (wszystkie pliki zaimportowane) → folder przeniesiony do `_archiwum/`
- ❌ **Błędy podczas importu** → folder POZOSTAJE na miejscu (ręczna interwencja)

**Kiedy folder jest przenoszony:**
```typescript
if (successCount > 0 && failCount === 0) {
  // Przenieś cały folder do _archiwum/
  await this.archiveSuccessfulFolder(folderPath, basePath);
}
```

---

### 2. **Pliki szyb i cen** (pojedyncze pliki)

```
C:\MB\zamowienia_szyb\
├── WETERING_SZYBA___5.01.txt
├── SWAANS_CHORUS___5.01.txt
└── _archiwum\                      ← AUTOMATYCZNIE UTWORZONE
    ├── WETERING_SZYBA___5.01.txt   ← Przeniesione PO IMPORCIE
    └── SWAANS_CHORUS___5.01.txt
```

**Logika archiwizacji:**
- ✅ **Import pliku zakończony pomyślnie** → plik przeniesiony do `_archiwum/`
- ❌ **Błąd importu** → plik POZOSTAJE na miejscu

**Typy plików z auto-archiwizacją:**
- 🪟 Zamówienia szyb (TXT)
- 🪟 Dostawy szyb (CSV)
- 🪟 Korekty zamówień szyb (TXT)

---

## 📁 Struktura po archiwizacji

### Przykład: `C:\MB\uzyte_bele\`
```
uzyte_bele/
├── 15.01.2025\              ← NOWY folder (czeka na import)
│   ├── 53714_uzyte_bele.csv
│   └── 53716_uzyte_bele.csv
├── 16.01.2025\              ← W TRAKCIE importu
└── _archiwum\               ← ZARCHIWIZOWANE
    ├── 05.01.2025\          ← Zaimportowane 2025-01-05
    ├── 08.01.2025\
    ├── 09.01.2025_I\
    ├── 09.01.2025_II\
    └── 11.01.2025\
```

### Przykład: `C:\MB\zamowienia_szyb\`
```
zamowienia_szyb/
├── NEW_ORDER___16.01.txt    ← NOWY plik (czeka na import)
└── _archiwum\               ← ZARCHIWIZOWANE
    ├── WETERING___5.01.txt  ← Zaimportowane 2025-01-05
    ├── SWAANS___8.01.txt
    └── KOREKTA_WETERING___5.01.txt
```

---

## ⚙️ Konfiguracja

### Włączona domyślnie
Auto-archiwizacja jest **włączona automatycznie** od wersji z 2026-01-05.

### Wyłączenie (jeśli potrzebne)
Edytuj `apps/api/src/services/file-watcher.ts` i zakomentuj wywołania:

```typescript
// await this.archiveSuccessfulFolder(folderPath, basePath);
// await this.archiveFile(filePath);
```

---

## 🛡️ Bezpieczeństwo

### Co się dzieje z oryginalnymi plikami?
1. **Import:** Plik KOPIOWANY do `apps/api/uploads/` (z timestampem)
2. **Przetwarzanie:** Parser pracuje na KOPII
3. **Archiwizacja:** Oryginał PRZENOSZONY do `_archiwum/`

**Efekt:** Masz **2 kopie** każdego pliku:
- `apps/api/uploads/1767005624682_53330_uzyte_bele.csv` (kopia robocza)
- `C:\MB\uzyte_bele\_archiwum\05.01.2025\53330_uzyte_bele.csv` (oryginał zarchiwizowany)

### Czy mogę usunąć pliki z archiwum?
✅ **TAK** - pliki w `_archiwum/` mogą być bezpiecznie usunięte po weryfikacji importu.

**Rekomendacja:** Zachowaj archiwum przez **30 dni** na wypadek problemów.

---

## 🔧 Rozwiązywanie problemów

### Problem: Folder nie został zarchiwizowany
**Przyczyna:** Import zakończył się błędami

**Rozwiązanie:**
1. Sprawdź logi API - znajdź komunikat błędu
2. Napraw problem (np. popraw plik CSV)
3. **Ręcznie przenieś** folder do `_archiwum/` po naprawie

```powershell
# PowerShell
Move-Item -Path "C:\MB\uzyte_bele\05.01.2025" -Destination "C:\MB\uzyte_bele\_archiwum\"
```

### Problem: Nie mogę znaleźć zaimportowanego pliku
**Sprawdź:** `_archiwum/` - prawdopodobnie został pomyślnie zaimportowany

### Problem: Folder `_archiwum` nie istnieje
**Przyczyna:** Jeszcze nie było pomyślnego importu

**Rozwiązanie:** Folder zostanie **automatycznie utworzony** przy pierwszym imporcie.

Możesz też utworzyć ręcznie:
```powershell
New-Item -Path "C:\MB\uzyte_bele\_archiwum" -ItemType Directory
```

---

## 📊 Monitoring

### Logi przy archiwizacji

#### Pomyślna archiwizacja folderu:
```
✅ Zaimportowano: 53330_uzyte_bele.csv → zlecenie 53330
✅ Zaimportowano: 53348_uzyte_bele.csv → zlecenie 53348
🎉 Import zakończony: 2/2 plików zaimportowano pomyślnie
📦 Zarchiwizowano folder: 05.01.2025 → _archiwum/
```

#### Błąd - folder NIE jest archiwizowany:
```
✅ Zaimportowano: 53330_uzyte_bele.csv → zlecenie 53330
❌ Błąd importu 53348_uzyte_bele.csv: Invalid CSV format
🎉 Import zakończony: 1/2 plików zaimportowano pomyślnie
⚠️ Folder NIE został zarchiwizowany - wykryto 1 błędów
```

#### Pomyślna archiwizacja pliku:
```
✅ Zaimportowano zamówienie (ID: 123)
📦 Zarchiwizowano plik: WETERING_SZYBA___5.01.txt → _archiwum/
```

---

## 🗂️ Zarządzanie archiwum

### Strategia przechowywania (rekomendacja)

#### Opcja A: Czyść co miesiąc
```powershell
# Usuń archiwa starsze niż 30 dni
$archivePath = "C:\MB\uzyte_bele\_archiwum"
$cutoffDate = (Get-Date).AddDays(-30)

Get-ChildItem -Path $archivePath -Directory |
  Where-Object { $_.CreationTime -lt $cutoffDate } |
  Remove-Item -Recurse -Force
```

#### Opcja B: Przenieś do archiwum długoterminowego
```powershell
# Przenieś stare archiwa na dysk zewnętrzny/sieciowy
$source = "C:\MB\uzyte_bele\_archiwum"
$backup = "D:\Backup\AKROBUD\uzyte_bele"

Move-Item -Path "$source\*" -Destination $backup
```

---

## 📈 Korzyści

✅ **Uporządkowane foldery** - widoczne tylko nowe pliki czekające na import
✅ **Historia** - łatwe wyszukanie co było importowane i kiedy
✅ **Bezpieczeństwo** - oryginały zachowane przez 30 dni
✅ **Automatyzacja** - zero ręcznej pracy

---

## 🔗 Powiązane

- [File Watcher - Dokumentacja](../file-watcher.md)
- [Importy - Konfiguracja folderów](../folder-configuration.md)
- [Troubleshooting - Problemy z importami](../../user-guides/troubleshooting.md#importy)

---

**Wersja:** 1.0
**Data:** 2026-01-05
**Autor:** Krzysztof (z pomocą Claude Sonnet 4.5)
