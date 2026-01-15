# 🛠️ DEV SETUP - Lokalne Foldery Testowe

**Cel:** Przełączyć DEV z folderów sieciowych na lokalne testowe foldery

**Dlaczego?**
- Nie mieszasz danych testowych z produkcyjnymi
- Szybsze działanie (lokalne vs sieciowe)
- Możesz testować bez wpływu na produkcję

---

## 🎯 KROK 1: Stwórz lokalne foldery testowe

```powershell
# Uruchom w PowerShell (jako Administrator):

New-Item -ItemType Directory -Force -Path C:\DEV_DATA\uzyte_bele
New-Item -ItemType Directory -Force -Path C:\DEV_DATA\uzyte_bele_prywatne
New-Item -ItemType Directory -Force -Path C:\DEV_DATA\ceny
New-Item -ItemType Directory -Force -Path C:\DEV_DATA\zamowienia_szyb
New-Item -ItemType Directory -Force -Path C:\DEV_DATA\dostawy_szyb
New-Item -ItemType Directory -Force -Path C:\DEV_DATA\okucia_zap
New-Item -ItemType Directory -Force -Path C:\DEV_DATA\dostawy
New-Item -ItemType Directory -Force -Path C:\DEV_DATA\ceny_import

# Sprawdź czy foldery są stworzone:
ls C:\DEV_DATA\
```

---

## 🎯 KROK 2: Zaktualizuj `.env` w DEV

### Opcja A: Użyj przykładowego pliku

```powershell
# Skopiuj .env.example jako .env
cd C:\Users\Krzysztof\Desktop\AKROBUD\apps\api
copy .env.example .env

# Edytuj .env i dodaj Schuco credentials (jeśli używasz):
# SCHUCO_EMAIL=twoj-email@example.com
# SCHUCO_PASSWORD=twoje-haslo
```

### Opcja B: Edytuj istniejący `.env` ręcznie

Otwórz `apps/api/.env` i zmień:

**BYŁO (foldery sieciowe):**
```env
WATCH_FOLDER_UZYTE_BELE=//192.168.1.6/Public/Markbud_import/uzyte_bele
WATCH_FOLDER_CENY=//192.168.1.6/Public/Markbud_import/ceny
# ...itd
```

**BĘDZIE (foldery lokalne):**
```env
WATCH_FOLDER_UZYTE_BELE=C:/DEV_DATA/uzyte_bele
WATCH_FOLDER_UZYTE_BELE_PRYWATNE=C:/DEV_DATA/uzyte_bele_prywatne
WATCH_FOLDER_CENY=C:/DEV_DATA/ceny
WATCH_FOLDER_GLASS_ORDERS=C:/DEV_DATA/zamowienia_szyb
WATCH_FOLDER_GLASS_DELIVERIES=C:/DEV_DATA/dostawy_szyb
WATCH_FOLDER_OKUC_ZAPOTRZEBOWANIE=C:/DEV_DATA/okucia_zap

IMPORTS_BASE_PATH=C:/DEV_DATA/dostawy
IMPORTS_CENY_PATH=C:/DEV_DATA/ceny_import
```

---

## 🎯 KROK 3: Test file watchers

```powershell
# 1. Uruchom aplikację
cd C:\Users\Krzysztof\Desktop\AKROBUD
pnpm dev:api

# 2. W logach powinieneś zobaczyć:
# "👀 Uruchamiam File Watcher..."
# "📁 Folder "użyte bele": C:\DEV_DATA\uzyte_bele"
# "📁 Folder "ceny": C:\DEV_DATA\ceny"
# ...itd

# 3. Test - skopiuj przykładowy plik do folderu testowego
# (aplikacja powinna go wykryć i zaimportować)
```

---

## 🎯 KROK 4: Skopiuj przykładowe dane testowe (opcjonalne)

Jeśli chcesz testować z prawdziwymi danymi:

```powershell
# Skopiuj kilka plików z produkcji do testowych folderów:
copy "\\192.168.1.6\Public\Markbud_import\uzyte_bele\*.csv" "C:\DEV_DATA\uzyte_bele\"
copy "\\192.168.1.6\Public\Markbud_import\ceny\*.pdf" "C:\DEV_DATA\ceny\"

# UWAGA: To są kopie, zmiany w C:\DEV_DATA NIE wpływają na produkcję
```

---

## ✅ Gotowe!

**Teraz masz:**
- ✅ DEV używa lokalnych folderów testowych (`C:\DEV_DATA\*`)
- ✅ PROD będzie używać folderów sieciowych (`//192.168.1.6/...`)
- ✅ Brak konfliktów między DEV a PROD

**Porównanie:**

| Element | DEV | PROD |
|---------|-----|------|
| **Porty** | 3001/3000 | 5000/5001 |
| **Baza** | `dev.db` | `prod.db` |
| **Foldery** | `C:\DEV_DATA\*` | `//192.168.1.6/...` |
| **Lokalizacja** | Twój komputer | Serwer w biurze |

---

## 🔄 Powrót do folderów sieciowych

Jeśli chcesz wrócić do folderów sieciowych w DEV:

```powershell
# Edytuj apps/api/.env i zmień z powrotem:
WATCH_FOLDER_UZYTE_BELE=//192.168.1.6/Public/Markbud_import/uzyte_bele
# ...itd
```

---

## 📚 Więcej informacji

- **Przykładowy .env:** [apps/api/.env.example](apps/api/.env.example)
- **PROD config:** [apps/api/.env.production](apps/api/.env.production)
