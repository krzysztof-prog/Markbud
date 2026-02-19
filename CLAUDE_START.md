# 🚀 CLAUDE START - Wdrożenie AKROBUD na Serwer Produkcyjny

**INSTRUKCJA DLA CLAUDE:** Ten prompt daj Claude na serwerze produkcyjnym Windows.

---

## 📋 KONTEKST

> **BAZA PRODUKCYJNA!** Pracujesz na bazie produkcyjnej (prod.db). Każda zmiana wpływa na prawdziwych użytkowników. Zachowaj szczególną ostrożność.
> Ścieżka sieciowa: `\\MARKBUD-HV\MarkBud-Prog`

Jesteś na **serwerze produkcyjnym Windows** w biurze.
Twoim zadaniem jest **wdrożyć aplikację AKROBUD** zgodnie z przygotowaną konfiguracją.

**WAŻNE:**
- Projekt jest już na tym serwerze (skopiowany z DEV)
- Wszystkie pliki konfiguracyjne są gotowe
- Musisz tylko wykonać kroki deployment zgodnie z checklistą

---

## 🎯 TWOJE ZADANIE

Wykonaj **KROK PO KROKU** deployment aplikacji AKROBUD na produkcję zgodnie z plikiem:

**📄 [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)**

---

## ⚠️ KRYTYCZNE ZASADY

### 1. **NIE zmieniaj konfiguracji .env.production**
   - Plik `apps/api/.env.production` jest już skonfigurowany
   - Plik `apps/web/.env.production` jest już skonfigurowany
   - **JEDYNE CO MUSISZ ZROBIĆ:**
     - Skopiować `.env.production` jako `.env` (dla obu apps)
     - **NIE EDYTUJ zawartości!**

### 2. **Używaj TYLKO PM2 (NIE npm/yarn)**
   - Projekt używa **pnpm**
   - Komenda package manager: `pnpm`
   - PM2 dla uruchomienia w produkcji

### 3. **Foldery sieciowe są już skonfigurowane**
   - PROD używa: `//192.168.1.6/Public/Markbud_import/*`
   - **NIE twórz** lokalnych folderów `C:\AKROBUD_DATA\`
   - Tylko sprawdź dostęp do folderów sieciowych

### 4. **Porty produkcyjne**
   - API: **5000** (NIE 4000)
   - Web: **5001** (NIE 3000)

### 5. **Baza danych**
   - Nazwa: `prod.db` (NIE dev.db)
   - Lokalizacja: `apps/api/prisma/prod.db`

---

## 📝 CHECKLIST - WYKONAJ KROK PO KROKU

### ✅ PRE-FLIGHT CHECK

Sprawdź czy jesteś na właściwym serwerze:

```powershell
# 1. Sprawdź IP serwera (powinno być 192.168.1.X w sieci lokalnej)
ipconfig

# 2. Sprawdź czy projekt jest skopiowany
Test-Path C:\inetpub\akrobud
# Jeśli FALSE - STOP! Projekt nie jest skopiowany

# 3. Sprawdź czy .env.production istnieje
Test-Path C:\inetpub\akrobud\apps\api\.env.production
Test-Path C:\inetpub\akrobud\apps\web\.env.production
# Jeśli FALSE - STOP! Brak plików konfiguracyjnych
```

**Jeśli wszystkie 3 sprawdzenia OK → Przejdź dalej**

---

### 📋 DEPLOYMENT - Wykonuj zgodnie z DEPLOYMENT_CHECKLIST.md

**Otwórz plik:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

**Wykonaj WSZYSTKIE kroki z sekcji:**

1. ✅ **PRZYGOTOWANIE PLIKÓW** (powinno być już zrobione)
2. ✅ **DEPLOYMENT (Na serwerze Windows)**
   - Skopiowanie projektu ✓ (już jest)
   - `.env.production → .env` ⚠️ **TO ZRÓB TERAZ**
   - Instalacja zależności
   - Build (jeśli nie zrobiony na DEV)
   - Baza danych (migracje)
   - **Uprawnienia do folderów sieciowych** ⚠️ **WAŻNE!**
   - PM2 instalacja
   - PM2 uruchomienie
3. ✅ **TESTOWANIE**
4. ✅ **BACKUPY**

---

## 🚨 NAJCZĘSTSZE PUŁAPKI - UNIKAJ!

### ❌ **BŁĄD 1: Tworzenie lokalnych folderów zamiast używać sieciowych**

```powershell
# ❌ ŹLE - NIE RÓB TEGO!
New-Item -ItemType Directory -Force -Path C:\AKROBUD_DATA\uzyte_bele

# ✅ DOBRZE - Sprawdź dostęp do folderów sieciowych:
dir \\192.168.1.6\Public\Markbud_import\uzyte_bele
```

### ❌ **BŁĄD 2: Edytowanie .env.production zamiast kopiowania**

```powershell
# ❌ ŹLE - NIE EDYTUJ!
notepad apps\api\.env.production

# ✅ DOBRZE - Skopiuj jako .env:
copy apps\api\.env.production apps\api\.env
copy apps\web\.env.production apps\web\.env
```

### ❌ **BŁĄD 3: Użycie npm/yarn zamiast pnpm**

```powershell
# ❌ ŹLE
npm install

# ✅ DOBRZE
pnpm install --frozen-lockfile
```

### ❌ **BŁĄD 4: Uruchomienie na portach DEV (4000/3000)**

```powershell
# ❌ ŹLE
pnpm dev

# ✅ DOBRZE (używaj PM2 z ecosystem.config.js)
pm2 start ecosystem.config.js
```

---

## 📊 OCZEKIWANY REZULTAT

Po zakończeniu deployment:

```powershell
# 1. PM2 pokazuje status "online"
pm2 status
# Oczekiwany wynik:
# ┌─────┬────────────────┬─────────┬─────────┐
# │ id  │ name           │ mode    │ status  │
# ├─────┼────────────────┼─────────┼─────────┤
# │ 0   │ akrobud-api    │ fork    │ online  │
# │ 1   │ akrobud-web    │ fork    │ online  │
# └─────┴────────────────┴─────────┴─────────┘

# 2. API odpowiada na porcie 5000
curl http://localhost:5000/health
# Oczekiwany wynik: {"status":"ok"}

# 3. Frontend działa na porcie 5001
# Otwórz: http://localhost:5001

# 4. Z innego komputera w sieci:
# http://192.168.1.XXX:5001 (gdzie XXX = IP serwera)
```

---

## 🆘 JEŚLI COŚ NIE DZIAŁA

### Problem: "Cannot access network folder"

```powershell
# Rozwiązanie:
ping 192.168.1.6
cmdkey /add:192.168.1.6 /user:USERNAME /pass:PASSWORD
dir \\192.168.1.6\Public\Markbud_import
```

### Problem: "Port already in use"

```powershell
# Sprawdź co używa portu:
netstat -ano | findstr "5000"
netstat -ano | findstr "5001"

# Jeśli DEV jest uruchomiony - zatrzymaj go!
```

### Problem: "Module not found"

```powershell
# Zainstaluj ponownie zależności:
Remove-Item -Recurse -Force node_modules
pnpm install --frozen-lockfile
```

### Problem: PM2 nie uruchamia się

```powershell
# Sprawdź service:
Get-Service PM2

# Jeśli zatrzymany:
Start-Service PM2

# Uruchom aplikację:
pm2 start ecosystem.config.js
```

---

## ✅ FINALIZACJA

**Gdy wszystko działa:**

1. ✅ Sprawdź logi przez 5 minut:
   ```powershell
   pm2 logs
   # Szukaj błędów
   ```

2. ✅ Przetestuj kluczowe funkcje:
   - Logowanie
   - Lista zleceń
   - Import pliku (skopiuj testowy plik do folderu sieciowego)

3. ✅ Skonfiguruj automatyczne backupy:
   - Task Scheduler
   - `scripts/backup-database.ps1`
   - Daily, 3:00 AM

4. ✅ Zapisz snapshot PM2:
   ```powershell
   pm2 save
   ```

---

## 📚 DOKUMENTACJA

Jeśli potrzebujesz więcej szczegółów:

- **Quick Start:** [QUICK_START_PRODUCTION.md](QUICK_START_PRODUCTION.md)
- **Pełny checklist:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **Update guide:** [UPDATE_PRODUCTION.md](UPDATE_PRODUCTION.md)
- **Troubleshooting:** [docs/deployment/README.md](docs/deployment/README.md)

---

## 🎯 TWOJE ZADANIE - PODSUMOWANIE

1. ✅ Sprawdź pre-flight check
2. ✅ Wykonaj DEPLOYMENT_CHECKLIST.md krok po kroku
3. ✅ Unikaj 4 najczęstszych błędów
4. ✅ Sprawdź oczekiwany rezultat
5. ✅ Zfinalizuj deployment

**Powodzenia! 🚀**
