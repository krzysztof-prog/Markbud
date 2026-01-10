# 📦 Deployment Documentation

Dokumentacja wdrożenia systemu AKROBUD na środowisko produkcyjne (Windows Server - Sieć Lokalna).

---

## 🚀 Quick Start

**Dla:** Krzysztof
**Środowisko:** Windows Server w biurze (sieć lokalna)
**Czas:** ~2-3h (pierwsze wdrożenie)

### 1. **Szybki start** (Krok po kroku)
→ [QUICK_START_PRODUCTION.md](../../QUICK_START_PRODUCTION.md)

### 2. **Pełny checklist** (Dokładna lista zadań)
→ [DEPLOYMENT_CHECKLIST.md](../../DEPLOYMENT_CHECKLIST.md)

### 3. **Aktualizacja** (Gdy wprowadzisz zmiany)
→ [UPDATE_PRODUCTION.md](../../UPDATE_PRODUCTION.md)

---

## 📋 Pliki konfiguracyjne (Gotowe do użycia)

### `.env` dla produkcji

**Backend API:**
- 📄 [apps/api/.env.production](../../apps/api/.env.production)
- ⚠️ **WYMAGANA EDYCJA:**
  - `JWT_SECRET` - wygeneruj losowy ciąg (min. 32 znaki)
  - `CORS_ORIGIN` - ustaw IP serwera:5001
  - `WATCH_FOLDER_*` - ścieżki do folderów na serwerze

**Frontend Web:**
- 📄 [apps/web/.env.production](../../apps/web/.env.production)
- ⚠️ **WYMAGANA EDYCJA:**
  - `NEXT_PUBLIC_API_URL` - ustaw IP serwera:5000

### PM2 Ecosystem

- 📄 [ecosystem.config.js](../../ecosystem.config.js)
- Konfiguracja procesów API i Web
- Porty: API=5000, Web=5001

### Backup Script

- 📄 [scripts/backup-database.ps1](../../scripts/backup-database.ps1)
- Automatyczne backupy bazy danych
- Czyszczenie backupów starszych niż 30 dni

---

## 🎯 Proces wdrożenia - Overview

```
┌─────────────────────────────────────────────────────────┐
│ 1. PRZYGOTOWANIE (DEV)                                  │
│    - Build aplikacji                                    │
│    - Edycja .env.production                             │
│    - Pakowanie projektu                                 │
└─────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│ 2. INSTALACJA (SERWER)                                  │
│    - Node.js, pnpm, PM2                                 │
│    - Kopiowanie projektu                                │
│    - pnpm install                                       │
└─────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│ 3. KONFIGURACJA                                         │
│    - Baza danych (migracje)                             │
│    - Foldery danych (C:\AKROBUD_DATA\*)                │
│    - PM2 jako Windows Service                           │
└─────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│ 4. URUCHOMIENIE                                         │
│    - pm2 start ecosystem.config.js                      │
│    - Firewall (porty 5000, 5001)                        │
│    - Test połączenia                                    │
└─────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│ 5. BACKUPY & MONITORING                                 │
│    - Task Scheduler (backup-database.ps1)               │
│    - PM2 logs                                           │
│    - Test działania przez 24h                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🗂️ Architektura deployment

### Porty produkcyjne

| Usługa | DEV | PROD | Uwagi |
|--------|-----|------|-------|
| API Backend | 4000 | **5000** | Fastify |
| Web Frontend | 3000 | **5001** | Next.js |

**Powód zmiany portów:** Uniknięcie konfliktów gdy DEV i PROD są testowane równolegle.

### Struktura folderów na serwerze

```
C:\inetpub\akrobud\              # Główny folder projektu
├── apps/
│   ├── api/
│   │   ├── dist/                # Backend skompilowany
│   │   ├── prisma/
│   │   │   └── prod.db          # Baza produkcyjna
│   │   └── .env                 # Konfiguracja API
│   └── web/
│       ├── .next/               # Frontend skompilowany
│       └── .env                 # Konfiguracja Web
├── logs/                        # Logi PM2
│   ├── api-error.log
│   ├── api-out.log
│   ├── web-error.log
│   └── web-out.log
├── backups/                     # Backupy bazy danych
│   └── prod.db.backup-*
└── ecosystem.config.js          # Konfiguracja PM2

//192.168.1.6/Public/Markbud_import/  # Foldery sieciowe (PROD)
├── uzyte_bele/
├── uzyte_bele_prywatne/
├── ceny/
├── zamowienia_szyb/
├── dostawy_szyb/
├── okucia_zap/
├── dostawy/
└── ceny/

C:\DEV_DATA\                      # Foldery testowe (DEV - opcjonalne)
├── uzyte_bele/
├── uzyte_bele_prywatne/
├── ceny/
├── zamowienia_szyb/
├── dostawy_szyb/
├── okucia_zap/
├── dostawy/
└── ceny_import/
```

---

## 🔐 Bezpieczeństwo

### Secrets (NIE commituj do Git!)

- ✅ `.env` (produkcyjny) - lokalne na serwerze
- ✅ `.env.production` - template w repo (wymaga edycji)
- ❌ `JWT_SECRET` - **NIGDY** nie commituj rzeczywistej wartości

### Firewall

- Port 5000 (API) - otwarty tylko dla sieci lokalnej
- Port 5001 (Web) - otwarty tylko dla sieci lokalnej
- **NIE** wystawiaj na internet bez SSL i dodatkowego zabezpieczenia

### Backup

- Automatyczne backupy codziennie (3:00 AM)
- Retention: 30 dni
- Folder: `C:\inetpub\akrobud\backups\`

---

## 📊 Monitoring i utrzymanie

### PM2 - Process Manager

```powershell
# Status aplikacji
pm2 status

# Logi na żywo
pm2 logs

# Restart
pm2 restart all

# Stop
pm2 stop all

# Monitor zasobów
pm2 monit
```

### Logi

**Lokalizacja:**
- API: `C:\inetpub\akrobud\logs\api-error.log`
- Web: `C:\inetpub\akrobud\logs\web-error.log`

**Sprawdzanie:**
```powershell
# Ostatnie 50 linii błędów API
Get-Content C:\inetpub\akrobud\logs\api-error.log -Tail 50

# Monitorowanie na żywo
Get-Content C:\inetpub\akrobud\logs\api-error.log -Wait
```

### Backupy

**Automatyczne:**
- Task Scheduler → Daily, 3:00 AM
- Script: `scripts/backup-database.ps1`

**Ręczne:**
```powershell
cd C:\inetpub\akrobud
powershell -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1
```

**Restore:**
```powershell
cd C:\inetpub\akrobud\apps\api\prisma
copy ..\..\..\backups\prod.db.backup-YYYY-MM-DD_HHmmss prod.db
```

---

## 🚨 Troubleshooting

### Aplikacja nie startuje

```powershell
pm2 logs
pm2 restart all
```

### Brak połączenia z API

```powershell
# Sprawdź czy API słucha na porcie
netstat -an | findstr "5000"

# Sprawdź firewall
Get-NetFirewallRule -DisplayName "AKROBUD API"
```

### PM2 nie uruchamia się po restarcie

```powershell
Get-Service PM2
Start-Service PM2
pm2 resurrect
```

### Database locked

```powershell
pm2 stop all
tasklist | findstr "node"
taskkill /F /IM node.exe
pm2 restart all
```

---

## 📚 Dodatkowe zasoby

### Dokumenty główne

- [production.md](production.md) - Przewodnik wdrożenia produkcyjnego (starszy)
- [checklist.md](checklist.md) - Checklist przed deployment (starszy)

### Architektura

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Architektura systemu
- [Backend Guidelines](../../.claude/skills/backend-dev-guidelines/) - Standardy backend

### Inne

- [COMMON_MISTAKES.md](../../COMMON_MISTAKES.md) - Częste błędy
- [LESSONS_LEARNED.md](../../LESSONS_LEARNED.md) - Historia projektu

---

## ✅ TODO - Planowane ulepszenia

- [ ] SSL/TLS (jeśli będzie dostęp przez internet)
- [ ] PostgreSQL zamiast SQLite (jeśli wzrost danych)
- [ ] Monitoring (uptime, alerty email)
- [ ] Automatyczne updaty (CI/CD)

---

**Ostatnia aktualizacja:** 2026-01-10
**Wersja dokumentacji:** 2.0
**Autor:** Krzysztof (z pomocą Claude Sonnet 4.5)
