# 🚀 DEPLOYMENT CHECKLIST - AKROBUD PRODUKCJA

**Serwer:** Windows Server (Sieć Lokalna)
**Data wdrożenia:** _______________
**Wykonał:** _______________

---

## ✅ PRE-DEPLOYMENT (Przed wdrożeniem)

### 🖥️ Serwer Windows - Wymagania

- [ ] **Node.js zainstalowany** (v18+ lub v20 LTS)
  ```powershell
  node --version  # Powinno być v18+ lub v20+
  ```

- [ ] **pnpm zainstalowany** (v8.x+)
  ```powershell
  pnpm --version  # Powinno być 8.x+
  ```

- [ ] **PM2 zainstalowany globalnie**
  ```powershell
  npm install -g pm2
  npm install -g pm2-windows-service
  ```

- [ ] **Git zainstalowany** (opcjonalne, ale przydatne)
  ```powershell
  git --version
  ```

- [ ] **IP serwera znane**
  ```powershell
  ipconfig  # Szukaj "IPv4 Address"
  ```
  IP Serwera: _______________

---

## 📦 PRZYGOTOWANIE PLIKÓW (Na komputerze DEV)

### Build aplikacji

- [ ] **Zainstalowane zależności**
  ```powershell
  cd C:\Users\Krzysztof\Desktop\AKROBUD
  pnpm install
  ```

- [ ] **Build wykonany**
  ```powershell
  pnpm build
  ```

- [ ] **Sprawdzone foldery build**
  ```powershell
  ls apps/api/dist       # Backend skompilowany
  ls apps/web/.next      # Frontend skompilowany
  ```

### Konfiguracja .env

- [ ] **apps/api/.env.production - uzupełniony**
  - [ ] `JWT_SECRET` - wygenerowany losowy ciąg (min. 32 znaki)
  - [ ] `CORS_ORIGIN` - ustawiony na IP serwera:5001
  - [ ] `WATCH_FOLDER_*` - ścieżki do folderów na serwerze

- [ ] **apps/web/.env.production - uzupełniony**
  - [ ] `NEXT_PUBLIC_API_URL` - ustawiony na IP serwera:5000

### Pakowanie projektu

- [ ] **Spakowany projekt** (bez node_modules, .next, dist)
  - Metoda: Pendrive / Git / Kopia sieciowa
  - Lokalizacja: _______________

---

## 🎯 DEPLOYMENT (Na serwerze Windows)

### Skopiowanie projektu

- [ ] **Projekt skopiowany na serwer**
  - Lokalizacja: `C:\inetpub\akrobud` (lub inna: _______________)

- [ ] **.env.production skopiowany do .env**
  ```powershell
  cd C:\inetpub\akrobud
  copy apps\api\.env.production apps\api\.env
  copy apps\web\.env.production apps\web\.env
  ```

### Instalacja zależności

- [ ] **Zależności zainstalowane**
  ```powershell
  cd C:\inetpub\akrobud
  pnpm install --frozen-lockfile
  ```
  ⏱️ Czas: ~10-15 minut

- [ ] **Build wykonany** (jeśli nie zrobiony na DEV)
  ```powershell
  pnpm build
  ```

### Baza danych

- [ ] **Wybrana strategia:**
  - [ ] Opcja A: Czysty start (nowa pusta baza)
  - [ ] Opcja B: Migracja z DEV (kopiuj dev.db jako prod.db)

- [ ] **Baza przygotowana**
  ```powershell
  cd C:\inetpub\akrobud\apps\api

  # Opcja A (czysty start):
  pnpm prisma migrate deploy

  # Opcja B (migracja z DEV):
  copy prisma\dev.db prisma\prod.db
  pnpm prisma migrate deploy
  ```

- [ ] **Prisma Client wygenerowany**
  ```powershell
  pnpm prisma generate
  ```

### Uprawnienia do folderów sieciowych

⚠️ **WAŻNE:** Aplikacja PROD używa folderów sieciowych `//192.168.1.6/Public/Markbud_import/*`

- [ ] **Dostęp do folderu sieciowego sprawdzony**
  ```powershell
  ping 192.168.1.6
  dir \\192.168.1.6\Public\Markbud_import
  ```

- [ ] **Credentials skonfigurowane (jeśli potrzeba)**
  ```powershell
  cmdkey /add:192.168.1.6 /user:USERNAME /pass:PASSWORD
  ```

- [ ] **Sprawdzono dostęp do monitorowanych folderów:**
  - [ ] `\\192.168.1.6\Public\Markbud_import\uzyte_bele`
  - [ ] `\\192.168.1.6\Public\Markbud_import\ceny`
  - [ ] `\\192.168.1.6\Public\Markbud_import\zamowienia_szyb`
  - [ ] `\\192.168.1.6\Public\Markbud_import\dostawy_szyb`
  - [ ] `\\192.168.1.6\Public\Markbud_import\okucia_zap`
  - [ ] `\\192.168.1.6\Public\Markbud_import\uzyte_bele_prywatne`

- [ ] **Folder na logi utworzony**
  ```powershell
  New-Item -ItemType Directory -Force -Path C:\inetpub\akrobud\logs
  ```

- [ ] **Folder na backupy utworzony**
  ```powershell
  New-Item -ItemType Directory -Force -Path C:\inetpub\akrobud\backups
  ```

---

## 🚀 PM2 - Process Manager

### Instalacja PM2 jako Windows Service

- [ ] **PM2 Service zainstalowany**
  ```powershell
  pm2-service-install -n PM2
  ```
  - PM2_HOME: `C:\ProgramData\pm2`
  - PM2_SERVICE_SCRIPTS: (pozostaw puste)

### Uruchomienie aplikacji

- [ ] **PM2 uruchomiony**
  ```powershell
  cd C:\inetpub\akrobud
  pm2 start ecosystem.config.js
  ```

- [ ] **PM2 zapisany (autostart)**
  ```powershell
  pm2 save
  pm2 startup
  ```
  ⚠️ Skopiuj i uruchom komendę którą wyświetli PM2

- [ ] **Status sprawdzony**
  ```powershell
  pm2 status
  ```
  Oczekiwany wynik:
  ```
  ┌─────┬────────────────┬─────────┬─────────┐
  │ id  │ name           │ mode    │ status  │
  ├─────┼────────────────┼─────────┼─────────┤
  │ 0   │ akrobud-api    │ fork    │ online  │
  │ 1   │ akrobud-web    │ fork    │ online  │
  └─────┴────────────────┴─────────┴─────────┘
  ```

- [ ] **Logi sprawdzone (brak błędów)**
  ```powershell
  pm2 logs --lines 50
  ```

---

## 🔥 Windows Firewall

- [ ] **Port 5000 (API) otwarty**
  ```powershell
  New-NetFirewallRule -DisplayName "AKROBUD API" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
  ```

- [ ] **Port 5001 (Web) otwarty**
  ```powershell
  New-NetFirewallRule -DisplayName "AKROBUD Web" -Direction Inbound -LocalPort 5001 -Protocol TCP -Action Allow
  ```

---

## 🧪 TESTOWANIE

### Test z serwera

- [ ] **API działa lokalnie**
  ```powershell
  curl http://localhost:5000/health
  ```
  Oczekiwany wynik: `{"status":"ok"}`

- [ ] **Frontend działa lokalnie**
  - Otwórz: `http://localhost:5001`
  - Powinien załadować się interfejs AKROBUD

### Test z innego komputera w sieci

- [ ] **API dostępne z sieci**
  - Z innego komputera: `http://192.168.1.XXX:5000/health`

- [ ] **Frontend dostępny z sieci**
  - Z innego komputera: `http://192.168.1.XXX:5001`
  - Sprawdź:
    - [ ] Logowanie działa
    - [ ] Dane się ładują (połączenie z API)
    - [ ] Brak błędów w konsoli przeglądarki (F12)

---

## 💾 BACKUPY - Automatyczne

### Task Scheduler - Backup bazy danych

- [ ] **Task Scheduler otwarty**
  ```powershell
  taskschd.msc
  ```

- [ ] **Zadanie utworzone:**
  - Nazwa: `AKROBUD Database Backup`
  - Trigger: Daily, 3:00 AM
  - Action: Start a program
    - Program: `powershell.exe`
    - Arguments: `-ExecutionPolicy Bypass -File "C:\inetpub\akrobud\scripts\backup-database.ps1"`
  - Uruchom niezależnie od logowania: ✓

- [ ] **Test backupu ręcznego**
  ```powershell
  cd C:\inetpub\akrobud
  powershell -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1
  ```

- [ ] **Backup utworzony w folderze**
  ```powershell
  ls backups\
  ```

---

## 📊 MONITORING - Opcjonalny (Nice to Have)

- [ ] **PM2 Monit**
  ```powershell
  pm2 monit
  ```

- [ ] **Logi sprawdzane regularnie**
  ```powershell
  # Ostatnie błędy API
  Get-Content C:\inetpub\akrobud\logs\api-error.log -Tail 50

  # Ostatnie błędy Web
  Get-Content C:\inetpub\akrobud\logs\web-error.log -Tail 50
  ```

---

## ✅ POST-DEPLOYMENT

### Dokumentacja

- [ ] **IP serwera zapisane**
  - Dostęp: `http://192.168.1.XXX:5001`
  - Zapisane w: _______________

- [ ] **Hasła/Secrets zapisane bezpiecznie**
  - JWT_SECRET: _______________
  - Inne: _______________

### Komunikacja z zespołem

- [ ] **Zespół poinformowany o:**
  - [ ] Nowym adresie aplikacji
  - [ ] Dacie wdrożenia
  - [ ] Kontakcie w razie problemów

### Backup planu powrotu (Rollback)

- [ ] **Plan powrotu przygotowany:**
  - [ ] Backup bazy DEV zachowany
  - [ ] Stary adres DEV (localhost:3000) nadal działa
  - [ ] Możliwość szybkiego powrotu w razie problemów

---

## 🚨 TROUBLESHOOTING

### Jeśli coś nie działa:

**Problem: Aplikacja nie startuje**
```powershell
pm2 logs
pm2 restart all
```

**Problem: Brak połączenia z API**
```powershell
# Sprawdź czy API działa
netstat -an | findstr "5000"

# Sprawdź firewall
Get-NetFirewallRule -DisplayName "AKROBUD API"
```

**Problem: PM2 nie uruchamia się po restarcie**
```powershell
Get-Service PM2
Start-Service PM2
pm2 resurrect
```

---

## 📞 KONTAKT W RAZIE PROBLEMÓW

**Administrator serwera:** _______________
**Telefon:** _______________
**Email:** _______________

---

## ✅ FINALIZACJA

- [ ] **Wszystkie checklisty zaznaczone**
- [ ] **Aplikacja działa stabilnie przez 24h**
- [ ] **Backupy działają automatycznie**
- [ ] **Zespół przeszkolony**
- [ ] **Dokumentacja zaktualizowana**

---

**Data zakończenia wdrożenia:** _______________
**Podpis:** _______________

---

🎉 **Gratulacje! AKROBUD działa na produkcji!**
