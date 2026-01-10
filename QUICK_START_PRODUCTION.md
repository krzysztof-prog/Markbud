# 🚀 QUICK START - AKROBUD PRODUKCJA (Sieć Lokalna)

**Dla:** Krzysztof
**Cel:** Szybkie wdrożenie AKROBUD na serwer Windows w biurze
**Czas:** ~2-3h (pierwszy raz)

---

## 📋 PRZED ROZPOCZĘCIEM - Co potrzebujesz?

### Na serwerze Windows:
- ✅ Node.js v20 LTS → https://nodejs.org
- ✅ pnpm → `npm install -g pnpm`
- ✅ PM2 → `npm install -g pm2 pm2-windows-service`

### Dane:
- IP serwera w sieci lokalnej: **_______________** (sprawdź: `ipconfig`)

---

## 🎯 KROK 1: Przygotuj na DEV (Twój komputer)

```powershell
# 1. Wejdź do projektu
cd C:\Users\Krzysztof\Desktop\AKROBUD

# 2. Build aplikacji
pnpm install
pnpm build

# 3. EDYTUJ PLIKI .env.production:
#    - apps/api/.env.production
#      → Zmień JWT_SECRET (losowy ciąg 32+ znaków)
#      → Zmień CORS_ORIGIN na IP serwera:5001
#      → Zmień XXX.XXX.XXX.XXX na IP serwera we wszystkich miejscach
#
#    - apps/web/.env.production
#      → Zmień NEXT_PUBLIC_API_URL na IP serwera:5000

# 4. Spakuj projekt na pendrive (BEZ node_modules!)
#    Albo skopiuj przez sieć
```

---

## 🎯 KROK 2: Przenieś na serwer

```powershell
# Na serwerze Windows (jako Administrator):

# 1. Skopiuj projekt do C:\inetpub\akrobud
#    (Możesz wybrać inną lokalizację)

# 2. Zainstaluj zależności
cd C:\inetpub\akrobud
pnpm install --frozen-lockfile

# 3. Skopiuj .env.production jako .env
copy apps\api\.env.production apps\api\.env
copy apps\web\.env.production apps\web\.env
```

---

## 🎯 KROK 3: Baza danych

```powershell
cd C:\inetpub\akrobud\apps\api

# WYBIERZ JEDNĄ OPCJĘ:

# OPCJA A - Czysty start (nowa pusta baza)
pnpm prisma migrate deploy
pnpm prisma generate

# OPCJA B - Skopiuj dane z DEV
copy prisma\dev.db prisma\prod.db
pnpm prisma migrate deploy
pnpm prisma generate
```

---

## 🎯 KROK 4: Uprawnienia do folderów sieciowych

⚠️ **WAŻNE:** Aplikacja PROD używa **folderów sieciowych** (`//192.168.1.6/Public/Markbud_import/*`)

```powershell
# 1. Sprawdź dostęp do folderu sieciowego
ping 192.168.1.6
dir \\192.168.1.6\Public\Markbud_import

# 2. Jeśli NIE MASZ dostępu, skonfiguruj Windows credentials:
# (Podmień USERNAME i PASSWORD na prawdziwe dane dostępowe)
cmdkey /add:192.168.1.6 /user:USERNAME /pass:PASSWORD

# 3. Sprawdź ponownie dostęp
dir \\192.168.1.6\Public\Markbud_import\uzyte_bele

# 4. Stwórz folder na logi
New-Item -ItemType Directory -Force -Path C:\inetpub\akrobud\logs

# 5. Stwórz folder na backupy
New-Item -ItemType Directory -Force -Path C:\inetpub\akrobud\backups
```

**Uwaga:** Foldery `uzyte_bele`, `ceny`, `zamowienia_szyb` itd. **już istnieją** na `//192.168.1.6/Public/Markbud_import/` - aplikacja ich używa.

---

## 🎯 KROK 5: PM2 - Zainstaluj jako service

```powershell
# 1. Zainstaluj PM2 jako Windows Service
pm2-service-install -n PM2
# PM2_HOME: C:\ProgramData\pm2
# PM2_SERVICE_SCRIPTS: (pozostaw puste)

# 2. Uruchom aplikację
cd C:\inetpub\akrobud
pm2 start ecosystem.config.js

# 3. Zapisz i autostart
pm2 save
pm2 startup
# ⚠️ Skopiuj i uruchom komendę którą wyświetli PM2

# 4. Sprawdź status
pm2 status
```

**Oczekiwany wynik:**
```
┌─────┬────────────────┬─────────┬─────────┐
│ id  │ name           │ mode    │ status  │
├─────┼────────────────┼─────────┼─────────┤
│ 0   │ akrobud-api    │ fork    │ online  │
│ 1   │ akrobud-web    │ fork    │ online  │
└─────┴────────────────┴─────────┴─────────┘
```

---

## 🎯 KROK 6: Firewall - Otwórz porty

```powershell
# Port 5000 (API)
New-NetFirewallRule -DisplayName "AKROBUD API" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow

# Port 5001 (Web)
New-NetFirewallRule -DisplayName "AKROBUD Web" -Direction Inbound -LocalPort 5001 -Protocol TCP -Action Allow
```

---

## 🎯 KROK 7: TEST!

### Na serwerze:
```powershell
# API
curl http://localhost:5000/health

# Przeglądarka
http://localhost:5001
```

### Z innego komputera w sieci:
```
Przeglądarka: http://192.168.1.XXX:5001
(gdzie XXX = IP serwera)
```

**Sprawdź:**
- ✅ Logowanie działa
- ✅ Dane się ładują
- ✅ Brak błędów (F12 → Console)

---

## 🎯 KROK 8: Automatyczne backupy

```powershell
# 1. Otwórz Task Scheduler
taskschd.msc

# 2. Create Basic Task...
#    Nazwa: AKROBUD Database Backup
#    Trigger: Daily, 3:00 AM
#    Action: Start a program
#      Program: powershell.exe
#      Arguments: -ExecutionPolicy Bypass -File "C:\inetpub\akrobud\scripts\backup-database.ps1"

# 3. Test backupu ręcznego
cd C:\inetpub\akrobud
powershell -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1

# 4. Sprawdź czy backup się utworzył
ls backups\
```

---

## ✅ GOTOWE!

**Aplikacja dostępna pod:**
- Frontend: `http://192.168.1.XXX:5001`
- API: `http://192.168.1.XXX:5000`

**Przydatne komendy PM2:**
```powershell
pm2 status          # Status aplikacji
pm2 logs            # Logi na żywo
pm2 restart all     # Restart
pm2 stop all        # Stop
pm2 monit           # Monitor zasobów
```

---

## 🚨 TROUBLESHOOTING

**Problem:** Aplikacja nie działa
```powershell
pm2 logs
pm2 restart all
```

**Problem:** Brak połączenia z API
```powershell
# Sprawdź czy API działa
netstat -an | findstr "5000"

# Sprawdź logi
Get-Content C:\inetpub\akrobud\logs\api-error.log -Tail 50
```

**Problem:** PM2 nie startuje po restarcie
```powershell
Get-Service PM2
Start-Service PM2
pm2 resurrect
```

---

## 📖 Więcej informacji

- **Pełny checklist:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **Dokumentacja:** [docs/deployment/](docs/deployment/)

---

🎉 **Powodzenia z wdrożeniem!**
