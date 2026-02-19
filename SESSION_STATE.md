# SESSION STATE – AKROBUD

> **Cel:** Śledzenie stanu bieżącej sesji roboczej z Claude. Pozwala wznowić pracę po przerwie bez utraty kontekstu.

---

## 🎯 Aktualne zadanie
**PRODUCTION DEPLOYMENT - ZAKOŃCZONY ✅**

Deployment aplikacji AKROBUD na serwer produkcyjny Windows Server w sieci lokalnej.

---

## 📊 Kontekst zadania

### Moduł/Feature:
- Production Deployment (Full Stack)
- Konfiguracja środowiska produkcyjnego
- Network drives i file watchers
- Schedulers i background jobs

### Cel biznesowy:
Uruchomienie aplikacji na serwerze produkcyjnym (192.168.1.5) w sieci lokalnej firmy:
- Frontend dostępny dla użytkowników na http://192.168.1.5:5001
- Backend API na http://192.168.1.5:5000
- File watchers monitorujące foldery sieciowe (Y:/Markbud_import/*)
- Label checking scheduler (codziennie o 7:00)
- PM2 zarządzanie procesami

---

## ✅ Decyzje podjęte

### 1. Frontend Configuration (.env.production)
- [x] Zmieniono NEXT_PUBLIC_API_URL z placeholder (XXX.XXX.XXX.XXX:5000) na prawdziwy IP (192.168.1.5:5000)
- [x] Rebuild frontendu z clean state (usunięto .next/, pnpm build)
- [x] Zrozumienie hierarchii: Next.js production mode używa .env.production > .env
- [x] NEXT_PUBLIC_* variables są baked into build - KONIECZNY rebuild po zmianie

### 2. File Watchers (6 folderów)
- [x] Przełączono z UNC paths (//192.168.1.6/...) na Y: drive (Y:/Markbud_import/*)
- [x] Zmapowano Y: jako persistent drive: net use Y: \\192.168.1.6\Public /persistent:yes
- [x] Credentials: cmdkey /add:192.168.1.6 /user:markbud_pracownicy /pass:Omega1@#4
- [x] Foldery: uzyte_bele, uzyte_bele_prywatne, ceny, zamowienia_szyb, dostawy_szyb, okucia_zap

### 3. Label Checking Scheduler
- [x] Pozostawiono UNC path (\\pila21\KABANTRANSFER) - działa poprawnie
- [x] Credentials: cmdkey /add:pila21 /user:pila21 /pass:pila
- [x] Scheduler uruchamia się codziennie o 7:00 (Europe/Warsaw)
- [x] Weryfikacja: 2026-02-13 o 7:00 sprawdzono 11 dostaw, 0 błędów

### 4. PM2 Process Management
- [x] API i Web działają jako PM2 managed processes (user: admin)
- [x] Restart z --update-env po zmianach w .env
- [x] PM2 save - konfiguracja zapisana

---

## 📁 Zmienione pliki

### apps/web/.env.production
**Linia 15:**
```diff
- NEXT_PUBLIC_API_URL=http://XXX.XXX.XXX.XXX:5000
+ NEXT_PUBLIC_API_URL=http://192.168.1.5:5000
```

### apps/api/.env
**Linie 51-67:** 6x WATCH_FOLDER_* + 2x IMPORTS_*_PATH
```diff
- WATCH_FOLDER_UZYTE_BELE=//192.168.1.6/Public/Markbud_import/uzyte_bele
+ WATCH_FOLDER_UZYTE_BELE=Y:/Markbud_import/uzyte_bele

(... analogicznie dla pozostałych 5 folderów)
```

### System Configuration
**Windows Credentials:**
```powershell
cmdkey /add:192.168.1.6 /user:markbud_pracownicy /pass:Omega1@#4
cmdkey /add:pila21 /user:pila21 /pass:pila
```

**Network Drives:**
```powershell
net use Y: \\192.168.1.6\Public /user:markbud_pracownicy Omega1@#4 /persistent:yes
```

**PM2:**
```powershell
pm2 restart markbud-api --update-env
pm2 restart markbud-web --update-env
pm2 save
```

---

## 📋 Status Komponentów

| Komponent | Status | Port | Uptime | Uwagi |
|-----------|--------|------|--------|-------|
| **API** | ✅ Online | 5000 | 18h+ | PM2 managed, PID: 11232 |
| **Web** | ✅ Online | 5001 | 19h+ | PM2 managed, PID: 8960 |
| **Login** | ✅ Działa | - | - | Potwierdzone: "juz dziala!" |
| **File Watchers** | ✅ Działa | - | - | Y:/Markbud_import/* |
| **Label Checking** | ✅ Działa | - | - | Scheduler o 7:00, 11 dostaw OK |
| **Import Queue** | ✅ Działa | - | - | Glass order import o 9:51 |
| **Database** | ✅ OK | - | - | prod.db, SQLite WAL mode |

---

## 🔧 Weryfikacja Działania

### 1. Login (Frontend + Backend)
**Test:** User zalogował się przez http://192.168.1.5:5001
**Wynik:** ✅ "juz dziala!" (potwierdzone)
**Fix:** Rebuild frontendu z poprawnym .env.production

### 2. File Watchers
**Test:** Import glass order o 9:51
**Wynik:** ✅ Sukces - plik zaimportowany i zarchiwizowany
**Logs:**
```
09:51:28: [ImportQueue] Dodano do kolejki: Y:\Markbud_import\zamowienia_szyb\00079  AKR 10 MARZEC.txt
09:51:28: Nowe zamowienie szyb: 00079  AKR 10 MARZEC.txt
09:51:30: Zarchiwizowano plik: 00079  AKR 10 MARZEC.txt → _archiwum/
```

### 3. Label Checking Scheduler
**Test:** Automatyczne uruchomienie o 7:00
**Wynik:** ✅ 11 dostaw sprawdzonych, 0 błędów
**Logs:**
```
07:00:00: [LabelCheckScheduler] Found 11 uncompleted deliveries
07:00:00-07:00:19: Checking labels for deliveries...
07:00:19: Check completed. Checked: 11, Skipped: 0, Errors: 0
```

### 4. PM2 Status
```
┌────┬────────────────┬─────────┬────────┬───────────┬──────────┐
│ id │ name           │ mode    │ pid    │ status    │ mem      │
├────┼────────────────┼─────────┼────────┼───────────┼──────────┤
│ 3  │ markbud-api    │ fork    │ 11232  │ online    │ 210.2mb  │
│ 0  │ markbud-web    │ fork    │ 8960   │ online    │ 111.2mb  │
└────┴────────────────┴─────────┴────────┴───────────┴──────────┘
```

---

## 🐛 Problemy i Rozwiązania

### Problem 1: Login - "TypeError: failed to fetch"
**Przyczyna:** Frontend zbudowany z placeholder URL z .env.production
**Rozwiązanie:** Edycja .env.production + delete .next/ + rebuild
**Status:** ✅ NAPRAWIONE

### Problem 2: File Watchers - "EPERM: operation not permitted"
**Przyczyna:** UNC paths nie działały, Y: drive już było zmapowane
**Rozwiązanie:** Zmiana .env z UNC na Y: drive + restart API
**Status:** ✅ NAPRAWIONE

### Problem 3: Label Checking - ręczny dostęp do \\pila21\KABANTRANSFER
**Przyczyna:** Share nie mapuje się przez net use (error 67)
**Rozwiązanie:** Aplikacja używa UNC path z cmdkey credentials - DZIAŁA
**Status:** ✅ DZIAŁA (ręczne mapowanie niepotrzebne)

---

## 📚 Kluczowe Lekcje

### 1. Next.js Environment Variables
- Production mode: `.env.production` > `.env`
- `NEXT_PUBLIC_*` są baked into build
- Po zmianie KONIECZNY rebuild (nie wystarczy restart)
- Zawsze usuwaj `.next/` przed rebuild

### 2. UNC Paths vs Mapped Drives
- File watchers: Mapped drives (Y:) stabilniejsze
- Schedulers: UNC paths działają z cmdkey credentials
- PM2 (user: admin) dziedziczy credentials z Windows Credential Manager

### 3. Weryfikacja Schedulers
- Sprawdzaj logi zamiast manual testing
- Scheduler może działać gdy ręczny dostęp nie działa
- `grep "SchedulerName" logs/api-out.log`

---

## 🚀 Jak Wystartować Serwery

### **Production (PM2 - Obecna Konfiguracja):**

```powershell
# Sprawdź status
pm2 status

# Start (jeśli zatrzymane)
pm2 start ecosystem.config.js

# Restart (jeśli działają)
pm2 restart all

# Restart z przeładowaniem .env
pm2 restart all --update-env

# Stop wszystkich
pm2 stop all

# Logi w czasie rzeczywistym
pm2 logs

# Logi tylko API lub Web
pm2 logs markbud-api
pm2 logs markbud-web

# Monitor
pm2 monit

# Zapisz konfigurację
pm2 save
```

### **Development (Lokalny Komputer):**

```powershell
cd C:\MarkBud_new

# Oba serwery naraz
pnpm dev

# Lub osobno:
pnpm dev:api    # Backend (port 3001)
pnpm dev:web    # Frontend (port 3000)
```

### **Porty:**

| Środowisko | API | Frontend |
|------------|-----|----------|
| **Production** | 5000 | 5001 |
| **Development** | 3001 | 3000 |

---

## 🧹 Czyszczenie Cache

### **Frontend Cache:**
```powershell
# Usuń build cache Next.js
Remove-Item -Recurse -Force apps/web/.next

# Usuń turbo cache
Remove-Item -Recurse -Force .turbo

# Opcjonalnie - node_modules (jeśli problemy z dependencies)
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force apps/web/node_modules
Remove-Item -Recurse -Force apps/api/node_modules
pnpm install
```

### **Backend Cache:**
```powershell
# Usuń Prisma generated client
Remove-Item -Recurse -Force apps/api/node_modules/.prisma

# Regeneruj Prisma Client
cd apps/api
pnpm exec prisma generate
```

### **PM2 Logs (jeśli za duże):**
```powershell
# Wyczyść wszystkie logi PM2
pm2 flush

# Lub tylko konkretnego procesu
pm2 flush markbud-api
pm2 flush markbud-web
```

### **Pełne Czyszczenie (Nuclear Option):**
```powershell
# UWAGA: To usunie wszystko i wymaga pełnego rebuildu!
pm2 stop all
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force apps/web/.next
Remove-Item -Recurse -Force apps/api/node_modules
Remove-Item -Recurse -Force apps/web/node_modules
Remove-Item -Recurse -Force .turbo
pnpm install
cd apps/api
pnpm exec prisma generate
cd ../..
pnpm build
pm2 restart all --update-env
```

---

## ➡️ Następne Kroki (opcjonalne)

### Monitoring
```powershell
pm2 logs                                      # Real-time logs
pm2 status                                    # Status procesów
Get-Content apps/api/logs/api-out.log -Tail 100
```

### Update z GitHub
```powershell
git pull origin main
pnpm install
pnpm build
pm2 restart all --update-env
```

### Backup Database
```powershell
$date = Get-Date -Format "yyyy-MM-dd_HHmm"
Copy-Item apps/api/prisma/prod.db "C:\Backups\prod_$date.db"
```

---

**Utworzono:** 2026-02-13
**Ostatnia aktualizacja:** 2026-02-13 10:10
**Aktualna sesja:** Production Deployment - ZAKOŃCZONY ✅
**Serwer:** 192.168.1.5 (MARKBUD-HV)
**Dokumentacja:** QUICK_START_PRODUCTION.md, DEPLOYMENT_CHECKLIST.md
