# Konfiguracja Ścieżek Sieciowych - Markbud Import

## 📁 Struktura folderów na dysku sieciowym

Stwórz na komputerze `192.168.1.6` następującą strukturę:

```
\\192.168.1.6\Public\Markbud_import\
├── uzyte_bele\          ← Pliki użycia materiałów
├── ceny\                ← Pliki PDF z cenami
├── zamowienia_szyb\     ← Zamówienia szyb (pliki CSV/Excel)
├── dostawy_szyb\        ← Dostawy szyb (pliki CSV/Excel)
└── dostawy\             ← Główne importy zleceń (pliki CSV)
```

---

## ✅ Krok 1: Weryfikacja dostępu z serwera

**Na serwerze (gdzie działa API)** otwórz PowerShell i sprawdź dostęp:

```powershell
# Test dostępu do dysku sieciowego
dir \\192.168.1.6\Public\Markbud_import
```

### Jeśli działa:
✅ Przejdź do kroku 2

### Jeśli pyta o hasło:
Zapisz poświadczenia:

```powershell
# Zapisz hasło do dysku sieciowego (TYLKO RAZ)
cmdkey /add:192.168.1.6 /user:NAZWA_UZYTKOWNIKA /pass:HASLO
```

Lub przez GUI:
1. Panel sterowania → Menedżer poświadczeń
2. Poświadczenia systemu Windows → Dodaj poświadczenie Windows
3. Adres: `192.168.1.6`
4. Nazwa użytkownika i hasło

---

## ✅ Krok 2: Konfiguracja aplikacji

Ścieżki są już ustawione w pliku `.env`:

```bash
# Ścieżki do monitorowanych folderów (UNC path - dysk sieciowy)
WATCH_FOLDER_UZYTE_BELE=//192.168.1.6/Public/Markbud_import/uzyte_bele
WATCH_FOLDER_CENY=//192.168.1.6/Public/Markbud_import/ceny
WATCH_FOLDER_GLASS_ORDERS=//192.168.1.6/Public/Markbud_import/zamowienia_szyb
WATCH_FOLDER_GLASS_DELIVERIES=//192.168.1.6/Public/Markbud_import/dostawy_szyb

# Ścieżka bazowa dla importów zleceń
IMPORTS_BASE_PATH=//192.168.1.6/Public/Markbud_import/dostawy

# Ścieżka dla importów cen (PDF)
IMPORTS_CENY_PATH=//192.168.1.6/Public/Markbud_import/ceny
```

**UWAGA:** Używamy `//` zamiast `\\` dla kompatybilności z Node.js

---

## ✅ Krok 3: Restart aplikacji

Po zmianie `.env` zrestartuj serwer API:

```powershell
# Zatrzymaj serwer (Ctrl+C)
# Uruchom ponownie
pnpm dev
```

Sprawdź logi przy starcie:
```
👀 Uruchamiam File Watcher...
   📁 Folder "użyte bele": //192.168.1.6/Public/Markbud_import/uzyte_bele
   📁 Folder "ceny": //192.168.1.6/Public/Markbud_import/ceny
   📁 Folder "zamówienia szyb": //192.168.1.6/Public/Markbud_import/zamowienia_szyb
   📁 Folder "dostawy szyb": //192.168.1.6/Public/Markbud_import/dostawy_szyb
```

---

## 🔧 Alternatywne opcje konfiguracji

### Opcja A: Dysk zmapowany (zalecane dla produkcji)

1. Na serwerze zmapuj dysk sieciowy jako `Z:\`:
   ```
   \\192.168.1.6\Public\Markbud_import → Z:\
   ```

2. W `.env` użyj litery dysku:
   ```bash
   WATCH_FOLDER_UZYTE_BELE=Z:/uzyte_bele
   WATCH_FOLDER_CENY=Z:/ceny
   # itd.
   ```

### Opcja B: Konfiguracja przez bazę danych

Można też ustawić ścieżki w bazie (tabela `Settings`):

```sql
INSERT INTO Settings (key, value) VALUES
  ('watchFolderUzyteBele', '//192.168.1.6/Public/Markbud_import/uzyte_bele'),
  ('watchFolderCeny', '//192.168.1.6/Public/Markbud_import/ceny'),
  ('watchFolderGlassOrders', '//192.168.1.6/Public/Markbud_import/zamowienia_szyb'),
  ('watchFolderGlassDeliveries', '//192.168.1.6/Public/Markbud_import/dostawy_szyb');
```

**Priorytet:**
1. Baza danych (Settings) - najwyższy
2. Zmienne środowiskowe (.env)
3. Domyślne wartości w kodzie

---

## 📝 Testowanie

### 1. Test File Watchera

Wrzuć testowy plik do folderu:
```powershell
# Stwórz testowy plik PDF w folderze "ceny"
echo "Test" > \\192.168.1.6\Public\Markbud_import\ceny\test.pdf
```

Sprawdź logi API - powinien wykryć:
```
📄 Wykryto nowy plik PDF: //192.168.1.6/Public/Markbud_import/ceny/test.pdf
   ✅ Zarejestrowano do importu: test.pdf (ID: 123)
```

### 2. Test importu zleceń

Wrzuć plik CSV do `dostawy/`:
```powershell
copy lokalny_plik.csv \\192.168.1.6\Public\Markbud_import\dostawy\
```

Następnie w aplikacji webowej:
1. Otwórz stronę "Importy"
2. Plik powinien być widoczny na liście
3. Kliknij "Importuj"

---

## ⚠️ Troubleshooting

### Błąd: "Access denied"
```powershell
# Sprawdź poświadczenia
cmdkey /list | findstr "192.168.1.6"

# Usuń stare poświadczenia
cmdkey /delete:192.168.1.6

# Dodaj ponownie
cmdkey /add:192.168.1.6 /user:NAZWA /pass:HASLO
```

### Błąd: "Network path not found"
1. Sprawdź czy `192.168.1.6` jest dostępny: `ping 192.168.1.6`
2. Sprawdź czy folder `Public` jest udostępniony
3. Sprawdź firewall

### File Watcher nie wykrywa plików
1. Sprawdź uprawnienia do folderu (odczyt + zapis)
2. Sprawdź logi API - czy ścieżki są poprawne
3. Sprawdź czy foldery istnieją na dysku sieciowym

### Zmieniłem `.env` ale nic się nie dzieje
Pamiętaj o restarcie serwera API (Ctrl+C + `pnpm dev`)

---

## 🎯 Podsumowanie

✅ Ścieżki ustawione w `.env`
✅ Wspiera UNC paths (`//192.168.1.6/...`)
✅ Fallback do domyślnych wartości
✅ Można nadpisać przez bazę danych
✅ File Watcher automatycznie monitoruje wszystkie foldery

**Następny krok:** Stwórz foldery na `192.168.1.6` i zrestartuj API.
