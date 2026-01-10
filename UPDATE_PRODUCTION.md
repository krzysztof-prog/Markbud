# 🔄 AKTUALIZACJA APLIKACJI PRODUKCYJNEJ

**Gdy wprowadzisz zmiany w kodzie i chcesz je wdrożyć na serwer.**

---

## ⚠️ WAŻNE - Przed każdą aktualizacją

### 1. **Backup bazy danych**

```powershell
# Na serwerze (ZAWSZE przed aktualizacją!)
cd C:\inetpub\akrobud
powershell -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1
```

### 2. **Sprawdź czy są zmiany w schema.prisma**

```powershell
# Na DEV (porównaj z ostatnią wersją produkcyjną)
git diff origin/main -- apps/api/prisma/schema.prisma
```

**Jeśli TAK:**
- ✅ Będziesz musiał uruchomić migracje na produkcji
- ✅ Sprawdź czy migracje są **bezpieczne** (nie usuwają danych)

### 3. **Sprawdź czy są nowe zmienne w .env**

```powershell
# Porównaj .env.production
git diff origin/main -- apps/api/.env.production
git diff origin/main -- apps/web/.env.production
```

**Jeśli TAK:**
- ✅ Zaktualizuj .env na serwerze przed uruchomieniem

---

## 🎯 PROCES AKTUALIZACJI

### Opcja A: Przez Git (polecane)

```powershell
# ═══════════════════════════════════════════════════
# 1. NA SERWERZE - Zatrzymaj aplikację
# ═══════════════════════════════════════════════════
cd C:\inetpub\akrobud
pm2 stop all

# ═══════════════════════════════════════════════════
# 2. Backup bazy (jeśli jeszcze nie zrobiłeś)
# ═══════════════════════════════════════════════════
powershell -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1

# ═══════════════════════════════════════════════════
# 3. Pobierz nową wersję
# ═══════════════════════════════════════════════════
git pull origin main

# ═══════════════════════════════════════════════════
# 4. Zainstaluj nowe zależności (jeśli były zmiany w package.json)
# ═══════════════════════════════════════════════════
pnpm install --frozen-lockfile

# ═══════════════════════════════════════════════════
# 5. Build nowej wersji
# ═══════════════════════════════════════════════════
pnpm build

# ═══════════════════════════════════════════════════
# 6. JEŚLI BYŁY ZMIANY W SCHEMA.PRISMA:
# ═══════════════════════════════════════════════════
cd apps\api
pnpm prisma migrate deploy
pnpm prisma generate

# ═══════════════════════════════════════════════════
# 7. JEŚLI BYŁY ZMIANY W .env:
# ═══════════════════════════════════════════════════
# Edytuj ręcznie apps/api/.env i apps/web/.env
# Dodaj nowe zmienne z .env.production

# ═══════════════════════════════════════════════════
# 8. Restart aplikacji
# ═══════════════════════════════════════════════════
cd C:\inetpub\akrobud
pm2 restart all

# ═══════════════════════════════════════════════════
# 9. Sprawdź logi (przez 1-2 minuty)
# ═══════════════════════════════════════════════════
pm2 logs

# ═══════════════════════════════════════════════════
# 10. Test aplikacji
# ═══════════════════════════════════════════════════
# Otwórz przeglądarkę: http://192.168.1.XXX:5001
# Sprawdź czy wszystko działa
```

---

### Opcja B: Ręczne kopiowanie (bez Git)

```powershell
# ═══════════════════════════════════════════════════
# 1. NA DEV - Przygotuj nową wersję
# ═══════════════════════════════════════════════════
cd C:\Users\Krzysztof\Desktop\AKROBUD
pnpm install
pnpm build

# Spakuj projekt (BEZ node_modules!)
# Skopiuj na pendrive lub przez sieć

# ═══════════════════════════════════════════════════
# 2. NA SERWERZE - Zatrzymaj aplikację
# ═══════════════════════════════════════════════════
cd C:\inetpub\akrobud
pm2 stop all

# ═══════════════════════════════════════════════════
# 3. Backup bazy + starej wersji kodu
# ═══════════════════════════════════════════════════
powershell -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1

# Backup starej wersji (na wszelki wypadek)
cd C:\inetpub
Rename-Item akrobud akrobud.backup-$(Get-Date -Format "yyyy-MM-dd_HHmmss")

# ═══════════════════════════════════════════════════
# 4. Skopiuj nową wersję
# ═══════════════════════════════════════════════════
# Z pendrive → C:\inetpub\akrobud

# ═══════════════════════════════════════════════════
# 5. Przywróć bazę danych (z backupu)
# ═══════════════════════════════════════════════════
cd C:\inetpub\akrobud
# Skopiuj prod.db ze starego folderu:
copy C:\inetpub\akrobud.backup-XXXX\apps\api\prisma\prod.db apps\api\prisma\prod.db

# ═══════════════════════════════════════════════════
# 6. Przywróć .env
# ═══════════════════════════════════════════════════
copy C:\inetpub\akrobud.backup-XXXX\apps\api\.env apps\api\.env
copy C:\inetpub\akrobud.backup-XXXX\apps\web\.env apps\web\.env

# ═══════════════════════════════════════════════════
# 7. Zainstaluj zależności
# ═══════════════════════════════════════════════════
cd C:\inetpub\akrobud
pnpm install --frozen-lockfile

# ═══════════════════════════════════════════════════
# 8. JEŚLI BYŁY ZMIANY W SCHEMA.PRISMA:
# ═══════════════════════════════════════════════════
cd apps\api
pnpm prisma migrate deploy
pnpm prisma generate

# ═══════════════════════════════════════════════════
# 9. Restart aplikacji
# ═══════════════════════════════════════════════════
cd C:\inetpub\akrobud
pm2 restart all

# ═══════════════════════════════════════════════════
# 10. Sprawdź logi i test
# ═══════════════════════════════════════════════════
pm2 logs
```

---

## 🔙 ROLLBACK (Powrót do starej wersji)

**Jeśli coś poszło nie tak:**

```powershell
# 1. Zatrzymaj aplikację
pm2 stop all

# 2. Przywróć starą wersję
cd C:\inetpub
Remove-Item -Recurse -Force akrobud
Rename-Item akrobud.backup-XXXX akrobud

# 3. Restart
cd akrobud
pm2 restart all

# 4. Sprawdź
pm2 logs
```

---

## ✅ CHECKLIST PO AKTUALIZACJI

- [ ] **Backup bazy wykonany przed aktualizacją**
- [ ] **PM2 pokazuje status "online" dla obu aplikacji**
  ```powershell
  pm2 status
  ```

- [ ] **Logi bez błędów (sprawdź przez 2-3 minuty)**
  ```powershell
  pm2 logs --lines 100
  ```

- [ ] **Test funkcjonalności:**
  - [ ] Logowanie działa
  - [ ] Lista zleceń się ładuje
  - [ ] Import plików działa
  - [ ] File watchery działają (jeśli używasz)

- [ ] **Test z innego komputera w sieci:**
  - Dostęp: `http://192.168.1.XXX:5001`
  - Sprawdź wszystkie kluczowe funkcje

- [ ] **Backup nowej wersji bazy (po weryfikacji)**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1
  ```

---

## 🚨 TROUBLESHOOTING

### Problem: "Cannot find module..."

```powershell
# Zainstaluj ponownie zależności
cd C:\inetpub\akrobud
Remove-Item -Recurse -Force node_modules
pnpm install --frozen-lockfile
pm2 restart all
```

### Problem: "Database locked"

```powershell
# Zatrzymaj wszystko
pm2 stop all

# Sprawdź procesy
tasklist | findstr "node"

# Jeśli trzeba, zakończ
taskkill /F /IM node.exe

# Uruchom ponownie
pm2 restart all
```

### Problem: "Migration failed"

```powershell
# Przywróć backup bazy
cd C:\inetpub\akrobud\apps\api\prisma
copy ..\..\..\..\backups\prod.db.backup-XXXX prod.db

# Spróbuj ponownie
pnpm prisma migrate deploy
```

### Problem: Aplikacja działa, ale błędy w logach

```powershell
# Sprawdź szczegóły
pm2 logs akrobud-api --lines 200
pm2 logs akrobud-web --lines 200

# Jeśli nie możesz naprawić, ROLLBACK:
# (patrz sekcja ROLLBACK wyżej)
```

---

## 📊 LOG AKTUALIZACJI (Zapisuj co zmieniłeś)

| Data | Wersja/Commit | Co zmieniono | Problemy | Czas |
|------|---------------|--------------|----------|------|
| 2026-01-10 | abc123 | Dodano feature X | Brak | 15 min |
| | | | | |
| | | | | |

---

## 📖 Więcej informacji

- **Problem z migracją?** → [docs/guides/migration-safety-fix.md](docs/guides/migration-safety-fix.md)
- **Problem z bazą?** → [docs/architecture/database.md](docs/architecture/database.md)

---

💡 **Pro Tip:** Rób aktualizacje w godzinach najmniejszego ruchu (np. wieczorem lub w weekend)
