# Zmiana ścieżek folderów i wdrożenie auto-archiwizacji

**Data:** 2026-01-05
**Wersja:** 1.0
**Status:** ✅ WDROŻONE

---

## 📋 Podsumowanie zmian

### Cel
1. Przeniesienie folderów importów z desktop na dedykowaną lokalizację `C:\MB\`
2. Automatyczna archiwizacja zaimportowanych plików do `_archiwum/`

---

## 🔧 Zmiany techniczne

### 1. Zmiana ścieżek folderów

#### Pliki zmodyfikowane:
- `apps/api/.env`
- `apps/api/.env.example`

#### Nowe ścieżki:
```env
# PRZED (stare lokalizacje)
WATCH_FOLDER_UZYTE_BELE=./uzyte bele
WATCH_FOLDER_CENY=../../ceny

# PO (nowe lokalizacje)
WATCH_FOLDER_UZYTE_BELE=C:/MB/uzyte_bele
WATCH_FOLDER_CENY=C:/MB/ceny
WATCH_FOLDER_GLASS_ORDERS=C:/MB/zamowienia_szyb
WATCH_FOLDER_GLASS_DELIVERIES=C:/MB/dostawy_szyb
```

**Uwagi:**
- Używamy forward slash `/` zamiast backslash `\` dla kompatybilności Node.js
- Ścieżki bezwzględne - brak problemów z relative paths

---

### 2. Funkcja auto-archiwizacji

#### Plik zmodyfikowany:
- `apps/api/src/services/file-watcher.ts`

#### Dodane metody:

##### A) `archiveSuccessfulFolder(folderPath, basePath)`
Archiwizuje cały folder po pomyślnym imporcie wszystkich plików CSV.

**Wywołanie:**
```typescript
// Po imporcie folderu "użyte bele"
if (successCount > 0 && failCount === 0) {
  await this.archiveSuccessfulFolder(folderPath, uzyteBelePath);
}
```

**Efekt:**
```
C:\MB\uzyte_bele\05.01.2025\
  → C:\MB\uzyte_bele\_archiwum\05.01.2025\
```

**Logika:**
- ✅ Wszystkie pliki zaimportowane → ARCHIWIZUJ
- ❌ Były błędy → NIE ARCHIWIZUJ (ostrzeżenie w logach)

---

##### B) `archiveFile(filePath)`
Archiwizuje pojedynczy plik po pomyślnym imporcie.

**Wywołania:**
- Po imporcie zamówienia szyb (TXT)
- Po imporcie dostawy szyb (CSV)
- Po imporcie korekty zamówienia (TXT)

**Efekt:**
```
C:\MB\zamowienia_szyb\WETERING___5.01.txt
  → C:\MB\zamowienia_szyb\_archiwum\WETERING___5.01.txt
```

---

### 3. Integracja z istniejącym kodem

#### Miejsca integracji:

**1. Import folderu "użyte bele"** (linia 437-446):
```typescript
logger.info(`   🎉 Import zakończony: ${successCount}/${csvFiles.length}`);

// NOWE: Archiwizacja
if (successCount > 0 && failCount === 0) {
  await this.archiveSuccessfulFolder(folderPath, uzyteBelePath);
} else if (failCount > 0) {
  logger.warn(`   ⚠️ Folder NIE został zarchiwizowany - wykryto ${failCount} błędów`);
}
```

**2. Korekta zamówienia szyb** (linia 666):
```typescript
await this.prisma.fileImport.create({...});

// NOWE: Archiwizacja
await this.archiveFile(filePath);
```

**3. Nowe zamówienie szyb** (linia 710):
```typescript
await this.prisma.fileImport.create({...});

// NOWE: Archiwizacja
await this.archiveFile(filePath);
```

**4. Dostawa szyb** (linia 754):
```typescript
await this.prisma.fileImport.create({...});

// NOWE: Archiwizacja
await this.archiveFile(filePath);
```

---

## 📁 Struktura folderów

### PRZED zmianą:
```
C:\Users\Krzysztof\Desktop\AKROBUD\
├── uzyte bele\
│   ├── 04.12.2025\
│   ├── 05.12.2025\
│   ├── 08.12.2025\
│   ├── ... (50+ folderów!)
├── ceny\
├── zamowienia_szyb\ (nie istniał)
└── dostawy_szyb\ (nie istniał)
```

### PO zmianie:
```
C:\MB\
├── uzyte_bele\
│   ├── 15.01.2026\          ← NOWE (czekają na import)
│   ├── 16.01.2026\
│   └── _archiwum\           ← AUTO-TWORZONE
│       ├── 04.12.2025\      ← Zaimportowane
│       ├── 05.12.2025\
│       └── ...
├── ceny\
│   └── _archiwum\
├── zamowienia_szyb\
│   ├── NEW_ORDER.txt        ← NOWY
│   └── _archiwum\
│       └── OLD_ORDER.txt    ← Zaimportowany
└── dostawy_szyb\
    └── _archiwum\
```

---

## 🚀 Instalacja i wdrożenie

### Krok 1: Utworzenie folderów

**Automatycznie (PowerShell):**
```powershell
.\create-import-folders.ps1
```

**Ręcznie (PowerShell):**
```powershell
New-Item -Path "C:\MB\uzyte_bele" -ItemType Directory -Force
New-Item -Path "C:\MB\uzyte_bele\_archiwum" -ItemType Directory -Force
New-Item -Path "C:\MB\ceny" -ItemType Directory -Force
New-Item -Path "C:\MB\ceny\_archiwum" -ItemType Directory -Force
New-Item -Path "C:\MB\zamowienia_szyb" -ItemType Directory -Force
New-Item -Path "C:\MB\zamowienia_szyb\_archiwum" -ItemType Directory -Force
New-Item -Path "C:\MB\dostawy_szyb" -ItemType Directory -Force
New-Item -Path "C:\MB\dostawy_szyb\_archiwum" -ItemType Directory -Force
```

---

### Krok 2: Migracja istniejących plików (opcjonalnie)

**UWAGA:** Przenieś TYLKO jeśli chcesz zachować starą historię.

```powershell
# Przenieś foldery "użyte bele" (zachowaj strukturę dat)
Get-ChildItem "C:\Users\Krzysztof\Desktop\AKROBUD\uzyte bele" -Directory |
  Move-Item -Destination "C:\MB\uzyte_bele\_archiwum\"

# Przenieś pliki "ceny" (jeśli istnieją)
Get-ChildItem "C:\Users\Krzysztof\Desktop\AKROBUD\ceny" -File |
  Move-Item -Destination "C:\MB\ceny\_archiwum\"
```

---

### Krok 3: Restart API

```bash
# Zatrzymaj API (Ctrl+C jeśli działa)
# Uruchom ponownie
pnpm dev:api
```

---

### Krok 4: Weryfikacja

Sprawdź logi - powinno być:
```
👀 Uruchamiam File Watcher...
   📁 Folder "użyte bele": C:/MB/uzyte_bele
   📁 Folder "ceny": C:/MB/ceny
   📁 Folder "zamówienia szyb": C:/MB/zamowienia_szyb
   📁 Folder "dostawy szyb": C:/MB/dostawy_szyb
   🔍 Skanuje istniejące foldery w: C:/MB/uzyte_bele
   🔍 Nasłuchuję nowych podfolderów w: C:/MB/uzyte_bele
   👀 Obserwuję zamówienia szyb: C:/MB/zamowienia_szyb
   👀 Obserwuję dostawy szyb: C:/MB/dostawy_szyb
```

---

## 🧪 Scenariusze testowe

### Test 1: Import folderu "użyte bele" + archiwizacja

**Kroki:**
1. Utwórz folder: `C:\MB\uzyte_bele\05.01.2026\`
2. Wrzuć plik CSV: `53714_uzyte_bele.csv`
3. Poczekaj 2-3 sekundy

**Oczekiwany rezultat:**
```
📁 Wykryto nowy podfolder: C:\MB\uzyte_bele\05.01.2026
📅 Wykryto folder z datą: 05.01.2026
📦 Numer dostawy: I
📄 Znaleziono 1 plików CSV
✨ Utworzono nową dostawę 05.01.2026_I
✅ Zaimportowano: 53714_uzyte_bele.csv → zlecenie 53714
🎉 Import zakończony: 1/1 plików zaimportowano pomyślnie
📦 Zarchiwizowano folder: 05.01.2026 → _archiwum/
```

**Weryfikacja:**
- ✅ Folder przeniósł się do `_archiwum/05.01.2026/`
- ✅ W bazie jest dostawa `05.01.2026_I`
- ✅ W bazie jest zlecenie `53714`

---

### Test 2: Import zamówienia szyb + archiwizacja

**Kroki:**
1. Wrzuć plik TXT: `C:\MB\zamowienia_szyb\TEST___16.01.txt`
2. Poczekaj 2-3 sekundy

**Oczekiwany rezultat:**
```
📄 Nowe zamówienie szyb: TEST___16.01.txt
✅ Zaimportowano zamówienie (ID: 123)
📦 Zarchiwizowano plik: TEST___16.01.txt → _archiwum/
```

**Weryfikacja:**
- ✅ Plik przeniósł się do `_archiwum/TEST___16.01.txt`
- ✅ W bazie jest `GlassOrder` z ID 123

---

### Test 3: Import z błędem - NIE archiwizuje

**Kroki:**
1. Wrzuć NIEPRAWIDŁOWY plik CSV (zły format)
2. Poczekaj 2-3 sekundy

**Oczekiwany rezultat:**
```
❌ Błąd importu: Invalid CSV format
🎉 Import zakończony: 0/1 plików zaimportowano pomyślnie
⚠️ Folder NIE został zarchiwizowany - wykryto 1 błędów
```

**Weryfikacja:**
- ✅ Folder/plik POZOSTAJE na miejscu (nie przeniesiony)
- ✅ Użytkownik może naprawić i spróbować ponownie

---

## 📊 Monitoring i logi

### Pomyślna archiwizacja folderu:
```
[INFO] 🎉 Import zakończony: 2/2 plików zaimportowano pomyślnie
[INFO] 📦 Zarchiwizowano folder: 05.01.2026 → _archiwum/
```

### Folder z błędami (NIE archiwizowany):
```
[INFO] 🎉 Import zakończony: 1/2 plików zaimportowano pomyślnie
[WARN] ⚠️ Folder NIE został zarchiwizowany - wykryto 1 błędów
```

### Pomyślna archiwizacja pliku:
```
[INFO] ✅ Zaimportowano zamówienie (ID: 123)
[INFO] 📦 Zarchiwizowano plik: ORDER.txt → _archiwum/
```

### Błąd archiwizacji (rzadki):
```
[WARN] ⚠️ Nie udało się zarchiwizować folderu C:\MB\...: Permission denied
```

---

## 🔧 Troubleshooting

### Problem: Folder nie został zarchiwizowany
**Przyczyna:** Import zakończył się błędami

**Rozwiązanie:**
1. Sprawdź logi - znajdź błąd importu
2. Napraw problem (popraw plik)
3. Przenieś folder ręcznie po naprawie:
   ```powershell
   Move-Item "C:\MB\uzyte_bele\05.01.2026" "C:\MB\uzyte_bele\_archiwum\"
   ```

---

### Problem: "Permission denied" podczas archiwizacji
**Przyczyna:** Brak uprawnień do zapisu

**Rozwiązanie:**
1. Uruchom API jako Administrator
2. LUB zmień uprawnienia folderu:
   ```powershell
   icacls "C:\MB" /grant Users:F /T
   ```

---

### Problem: Nie mogę znaleźć zaimportowanego pliku
**Sprawdź:** Folder `_archiwum/` - prawdopodobnie został pomyślnie zarchiwizowany

---

### Problem: Folder `_archiwum` nie istnieje
**Przyczyna:** Jeszcze nie było pomyślnego importu

**Rozwiązanie:**
- Folder zostanie automatycznie utworzony przy pierwszym imporcie
- Możesz utworzyć ręcznie:
  ```powershell
  New-Item -Path "C:\MB\uzyte_bele\_archiwum" -ItemType Directory
  ```

---

## 🗂️ Zarządzanie archiwum

### Strategia przechowywania

**Rekomendacja:** Zachowaj archiwum przez **30 dni**, potem usuń lub przenieś na backup.

#### Opcja A: Automatyczne czyszczenie (co miesiąc)
```powershell
# Skrypt do Task Schedulera (uruchamiaj 1x w miesiącu)
$archivePath = "C:\MB\uzyte_bele\_archiwum"
$cutoffDate = (Get-Date).AddDays(-30)

Get-ChildItem -Path $archivePath -Directory |
  Where-Object { $_.CreationTime -lt $cutoffDate } |
  Remove-Item -Recurse -Force

Write-Host "Usunięto archiwa starsze niż 30 dni"
```

#### Opcja B: Backup do lokalizacji zewnętrznej
```powershell
# Przenieś stare archiwa na dysk sieciowy
$source = "C:\MB\uzyte_bele\_archiwum"
$backup = "\\NAS\Backup\AKROBUD\uzyte_bele"

Get-ChildItem -Path $source -Directory |
  Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-7) } |
  Move-Item -Destination $backup
```

---

## 📈 Korzyści wdrożenia

### Przed:
- ❌ Foldery na Desktop - nieuporządkowane
- ❌ 50+ folderów w jednym miejscu
- ❌ Ciężko znaleźć nowe pliki
- ❌ Brak rozróżnienia zaimportowane/nowe

### Po:
- ✅ Dedykowana lokalizacja `C:\MB\`
- ✅ Tylko nowe pliki widoczne w głównym folderze
- ✅ Zaimportowane automatycznie w `_archiwum/`
- ✅ Łatwe zarządzanie i wyszukiwanie
- ✅ Uporządkowana historia importów

---

## 📚 Powiązane dokumenty

- [Auto-archiwizacja - szczegóły techniczne](./auto-archiving.md)
- [File Watcher - dokumentacja](./file-watcher.md)
- [Troubleshooting - problemy z importami](../../user-guides/troubleshooting.md#importy)

---

## 📝 Changelog

### 2026-01-05 (v1.0) - Wdrożenie początkowe
- ✅ Zmieniono ścieżki folderów na `C:\MB\`
- ✅ Dodano funkcję `archiveSuccessfulFolder()`
- ✅ Dodano funkcję `archiveFile()`
- ✅ Zintegrowano archiwizację z importem folderów "użyte bele"
- ✅ Zintegrowano archiwizację z importem plików szyb
- ✅ Utworzono skrypt PowerShell `create-import-folders.ps1`
- ✅ Dodano dokumentację

---

## ✅ Checklist wdrożenia

### Przed uruchomieniem produkcyjnym:
- [x] Zmieniono ścieżki w `.env`
- [x] Zaktualizowano `.env.example`
- [ ] Utworzono foldery `C:\MB\` w systemie (użytkownik)
- [ ] Przeniesiono istniejące pliki (opcjonalnie)
- [ ] Zrestartowano API
- [ ] Przetestowano import + archiwizację
- [ ] Sprawdzono logi - czy ścieżki są poprawne
- [ ] Zaplanowano strategię czyszczenia archiwum (30 dni)

---

**Status:** ✅ Gotowe do wdrożenia
**Data implementacji:** 2026-01-05
**Autor:** Krzysztof (z pomocą Claude Sonnet 4.5)
