# Instrukcja Safe Update - Bezpieczna Aktualizacja Produkcji

> **Dla kogo:** Administrator systemu, właściciel
> **Kiedy używać:** Gdy chcesz zaktualizować aplikację na serwerze produkcyjnym

---

## Co to robi?

Script `safe-update.ps1` automatycznie aktualizuje aplikację na serwerze produkcyjnym z zabezpieczeniami:

1. **Backup bazy danych** - zapisuje kopię przed zmianami
2. **Health check PRZED** - sprawdza czy aplikacja działa
3. **Zatrzymanie aplikacji** - bezpieczne wyłączenie PM2
4. **Pobranie zmian** - `git pull` z repozytorium
5. **Instalacja zależności** - `pnpm install`
6. **Build projektu** - `pnpm build`
7. **Migracje bazy** - `pnpm db:migrate`
8. **Restart aplikacji** - uruchomienie PM2
9. **Health check PO** - sprawdza czy wszystko działa

**Jeśli COKOLWIEK się nie powiedzie** → automatyczny ROLLBACK do poprzedniej wersji!

---

## Jak uruchomić?

### Krok 1: Połącz się z serwerem

Użyj Remote Desktop (RDP) lub połącz się przez sieć do serwera Windows.

### Krok 2: Otwórz PowerShell

1. Kliknij **Start**
2. Wpisz `PowerShell`
3. Kliknij prawym → **Uruchom jako Administrator**

### Krok 3: Przejdź do folderu aplikacji

```powershell
cd C:\markbud
```

### Krok 4: Uruchom script

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\safe-update.ps1
```

### Krok 5: Obserwuj wynik

Script wyświetli postęp każdego kroku:

```
[2026-01-14 10:30:15] [INFO] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2026-01-14 10:30:15] [INFO] KROK 1/8: Backup bazy danych
[2026-01-14 10:30:15] [INFO] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2026-01-14 10:30:18] [SUCCESS] Backup zakończony pomyślnie

[2026-01-14 10:30:18] [INFO] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2026-01-14 10:30:18] [INFO] KROK 2/8: Health check PRZED aktualizacją
...
```

---

## Opcje uruchomienia

### Standardowe (zalecane)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\safe-update.ps1
```

Wykonuje pełną aktualizację z backupem i wszystkimi sprawdzeniami.

### Bez backupu (NIE POLECANE!)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\safe-update.ps1 -SkipBackup
```

**UWAGA:** Używaj tylko gdy wiesz co robisz! Jeśli coś pójdzie nie tak, nie będziesz mieć kopii bazy.

### Bez testów

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\safe-update.ps1 -SkipTests
```

Pomija testy po aktualizacji. Przydatne gdy testy są zepsute ale chcesz zaktualizować.

---

## Co się stanie gdy aktualizacja się nie powiedzie?

### Scenariusz 1: Błąd podczas buildu

```
[2026-01-14 10:35:22] [ERROR] Build nie powiódł się
[2026-01-14 10:35:22] [WARNING] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2026-01-14 10:35:22] [WARNING] ROLLBACK - Przywracanie poprzedniej wersji
[2026-01-14 10:35:22] [WARNING] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2026-01-14 10:35:30] [SUCCESS] Rollback zakończony - aplikacja działa
```

**Co to znaczy?**
- Nowa wersja miała błąd kompilacji
- Script automatycznie wrócił do poprzedniej wersji
- Aplikacja działa tak jak przed aktualizacją
- **Ty nie musisz nic robić!**

### Scenariusz 2: Health check po update nie przechodzi

```
[2026-01-14 10:40:15] [ERROR] Health check PO aktualizacji FAILED
[2026-01-14 10:40:15] [WARNING] Aplikacja nie odpowiada po aktualizacji
[2026-01-14 10:40:15] [WARNING] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2026-01-14 10:40:15] [WARNING] ROLLBACK - Przywracanie poprzedniej wersji
...
```

**Co to znaczy?**
- Nowa wersja uruchomiła się ale nie działa poprawnie
- Script automatycznie przywrócił poprzednią wersję
- Aplikacja znów działa

### Co robić po rollbacku?

1. **NIE PANIKUJ** - aplikacja działa na starej wersji
2. **Skopiuj logi** - output z PowerShell (zaznacz → Enter)
3. **Zgłoś problem** - wyślij logi do programisty
4. **Poczekaj na poprawkę** - programista naprawi błąd
5. **Spróbuj ponownie** - po naprawie uruchom script jeszcze raz

---

## Przed aktualizacją - Checklist

- [ ] Czy masz dostęp do serwera (RDP)?
- [ ] Czy jest pora z niskim ruchem (np. wieczór)?
- [ ] Czy poinformowałeś użytkowników o przerwie (opcjonalnie)?
- [ ] Czy masz pod ręką numer telefonu programisty (na wszelki wypadek)?

---

## Po aktualizacji - Weryfikacja

### Sprawdź czy PM2 działa

```powershell
pm2 status
```

Powinno pokazać:

```
┌────┬───────────────┬─────────┬──────┬───────┬──────────┐
│ id │ name          │ status  │ cpu  │ mem   │ uptime   │
├────┼───────────────┼─────────┼──────┼───────┼──────────┤
│ 0  │ markbud-api   │ online  │ 0%   │ 150mb │ 5m       │
│ 1  │ markbud-web   │ online  │ 0%   │ 200mb │ 5m       │
└────┴───────────────┴─────────┴──────┴───────┴──────────┘
```

### Sprawdź czy strona odpowiada

```powershell
curl http://localhost:5001
```

Powinno zwrócić HTML.

### Sprawdź czy API działa

```powershell
curl http://localhost:5000/api/health
```

Powinno zwrócić: `{"status":"ok"}`

### Test w przeglądarce

1. Otwórz http://192.168.1.XXX:5001 (IP serwera)
2. Zaloguj się
3. Sprawdź czy dane się ładują
4. Kliknij kilka przycisków - czy działają?

---

## Rozwiązywanie problemów

### "Folder aplikacji nie istnieje"

```
[ERROR] Folder aplikacji nie istnieje: C:\markbud
```

**Rozwiązanie:** Sprawdź czy aplikacja jest zainstalowana w `C:\markbud`. Jeśli w innym miejscu, zmień ścieżkę w script.

### "PM2 nie jest zainstalowany"

```
[ERROR] PM2 nie jest zainstalowany
```

**Rozwiązanie:**
```powershell
npm install -g pm2
```

### "pnpm nie jest zainstalowany"

```
[ERROR] pnpm nie jest zainstalowany
```

**Rozwiązanie:**
```powershell
npm install -g pnpm
```

### "Aplikacja nie odpowiada przed aktualizacją"

```
[ERROR] Aplikacja nie odpowiada
```

**Rozwiązanie:** Aplikacja nie działała jeszcze przed aktualizacją. Najpierw ją uruchom:
```powershell
cd C:\markbud
pm2 start ecosystem.config.js
```

### "Git pull failed"

```
[ERROR] Git pull nie powiódł się
```

**Możliwe przyczyny:**
1. Brak połączenia z internetem
2. Konflikty w plikach (lokalne zmiany)
3. Brak uprawnień do repozytorium

**Rozwiązanie:**
```powershell
cd C:\markbud
git status
git stash  # Zapisz lokalne zmiany
git pull
git stash pop  # Przywróć lokalne zmiany
```

---

## FAQ

### Jak często aktualizować?

Gdy programista powie "jest nowa wersja" lub gdy zobaczysz w Git nowe commity.

### Czy mogę aktualizować w godzinach pracy?

Tak, ale aktualizacja trwa 2-5 minut i w tym czasie aplikacja jest niedostępna. Lepiej wieczorem.

### Co jeśli script się zawiesi?

1. Zamknij PowerShell (X)
2. Otwórz nowy PowerShell jako Administrator
3. Uruchom: `pm2 restart all`
4. Sprawdź: `pm2 status`

### Czy rollback naprawdę działa?

Tak! Script zapisuje wersję Git przed aktualizacją i może do niej wrócić. Backup bazy również jest tworzony automatycznie.

### Gdzie są backupy bazy?

```powershell
dir C:\markbud\backups
```

---

## Kontakt w razie problemów

Jeśli aktualizacja się nie powiedzie i nie wiesz co robić:

1. **Skopiuj output z PowerShell** (zaznacz wszystko → Enter)
2. **Sprawdź logi PM2:** `pm2 logs --lines 100`
3. **Zgłoś problem programiście** z załączonymi logami

---

*Ostatnia aktualizacja: 2026-01-14*
