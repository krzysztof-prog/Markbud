# Instrukcja Administratora

Przewodnik dla administratorów systemu MarkBud.

---

## Dostęp Administracyjny

**Wymagana rola:** `ADMIN` lub `OWNER`

**Panel administracyjny:** `/admin`

---

## 1. Zarządzanie Użytkownikami

### Dodawanie Użytkownika

1. Przejdź do **Admin → Użytkownicy**
2. Kliknij **"Dodaj użytkownika"**
3. Wypełnij formularz:
   - Email (unikalny)
   - Imię
   - Hasło (min. 3 znaki)
   - Rola
4. Kliknij **"Zapisz"**

### Role Użytkowników

| Rola | Opis | Dostęp |
|------|------|--------|
| `owner` | Właściciel | Wszystko |
| `admin` | Administrator | Wszystko + zarządzanie użytkownikami |
| `kierownik` | Kierownik produkcji | Panel kierownika, magazyn, dostawy |
| `ksiegowa` | Księgowa | Raporty finansowe, zestawienia, FV |
| `user` | Operator | Dashboard operatora, podstawowe funkcje |

### Edycja Użytkownika

1. Znajdź użytkownika na liście
2. Kliknij **"Edytuj"**
3. Zmień dane (hasło opcjonalne)
4. Kliknij **"Zapisz"**

### Usuwanie Użytkownika

1. Znajdź użytkownika na liście
2. Kliknij **"Usuń"**
3. Potwierdź w dialogu

⚠️ **Uwaga:** Konto systemowe `system@akrobud.local` nie może być usunięte.

---

## 2. Konfiguracja Systemu

### Ustawienia Ogólne

**Lokalizacja:** Admin → Ustawienia → Ogólne

- Porty API i Web
- Ścieżki bazowe
- Konfiguracja PM2

### Foldery Obserwowane

**Lokalizacja:** Admin → Ustawienia → Foldery

System automatycznie importuje pliki z tych folderów:

| Folder | Typ plików | Przeznaczenie |
|--------|------------|---------------|
| Uzyte bele | CSV | Import zużycia profili |
| Ceny | CSV | Aktualizacja cen |
| Projekty OKUC | XLSX | Zapotrzebowanie okuć |
| Zamówienia szyb | PDF | Zamówienia do dostawców |
| Dostawy szyb | PDF | Potwierdzenia dostaw |

**Zmiana ścieżki:**
1. Kliknij na folder
2. Wpisz nową ścieżkę
3. Kliknij **"Zapisz"**
4. System automatycznie zrestartuje watcher

### Typy Palet

**Lokalizacja:** Admin → Ustawienia → Palety

Zarządzanie typami palet produkcyjnych:
- MAŁA
- P2400
- P3000
- P3500
- P4000

### Kolory Profili

**Lokalizacja:** Admin → Ustawienia → Kolory

Dodawanie/edycja kolorów:
- Kod koloru
- Nazwa
- Wartość HEX (opcjonalna)

### Profile PVC

**Lokalizacja:** Admin → Ustawienia → Profile

Zarządzanie profilami:
- Numer profilu
- Nazwa
- System (np. Schuco, Reynaers)
- Głębokość

---

## 3. Mapowanie Autorów Dokumentów

**Lokalizacja:** Admin → Ustawienia → Autorzy dokumentów

Przypisanie autorów z importowanych plików do użytkowników systemu.

**Przykład:**
- Dokument: "JKowalski" → Użytkownik: Jan Kowalski

**Dodawanie mapowania:**
1. Kliknij **"Dodaj mapowanie"**
2. Wpisz nazwę autora z dokumentu
3. Wybierz użytkownika z listy
4. Kliknij **"Zapisz"**

---

## 4. Monitoring Systemu

### Health Check

**Lokalizacja:** Admin → Zdrowie systemu

Sprawdza:
- ✅ Połączenie z bazą danych
- ✅ Dostępność folderów sieciowych
- ✅ Miejsce na dysku
- ✅ Status ostatnich importów
- ✅ Czas działania (uptime)

**Statusy:**
- 🟢 Healthy - wszystko OK
- 🟡 Degraded - niektóre problemy
- 🔴 Unhealthy - krytyczne problemy

### Zgłoszenia Błędów

**Lokalizacja:** Admin → Zgłoszenia błędów

Przeglądanie zgłoszeń od użytkowników:
- Data zgłoszenia
- Użytkownik
- Opis problemu
- URL strony

---

## 5. Backup i Przywracanie

### Backup Bazy Danych

**PowerShell:**
```powershell
cd C:\MarkBud
.\scripts\backup-database.ps1
```

**Lokalizacja backupów:** `C:\MarkBud\backups\`

### Przywracanie z Backupu

1. Zatrzymaj aplikację: `pm2 stop all`
2. Skopiuj backup do `apps/api/prisma/prod.db`
3. Uruchom aplikację: `pm2 start all`

---

## 6. Aktualizacja Systemu

### Przed aktualizacją

1. ✅ Zrób backup bazy danych
2. ✅ Sprawdź czy nikt nie pracuje w systemie
3. ✅ Przeczytaj CHANGELOG

### Procedura aktualizacji

```powershell
# 1. Zatrzymaj aplikację
pm2 stop all

# 2. Pobierz zmiany
git pull origin main

# 3. Zainstaluj zależności
pnpm install

# 4. Uruchom migracje
cd apps/api
pnpm db:migrate

# 5. Zbuduj aplikację
cd ../..
pnpm build

# 6. Uruchom aplikację
pm2 start all
```

Szczegóły: [UPDATE_PRODUCTION.md](../../UPDATE_PRODUCTION.md)

---

## 7. Rozwiązywanie Problemów

### Aplikacja nie uruchamia się

1. Sprawdź logi: `pm2 logs`
2. Sprawdź czy porty są wolne
3. Sprawdź konfigurację `.env`

### Import nie działa

1. Sprawdź czy folder istnieje
2. Sprawdź uprawnienia do folderu
3. Restart watchera: Admin → Ustawienia → Restart Watcher

### Użytkownik nie może się zalogować

1. Sprawdź czy konto istnieje
2. Zresetuj hasło
3. Sprawdź rolę użytkownika

### Baza danych jest wolna

1. Sprawdź rozmiar bazy
2. Rozważ archiwizację starych zleceń
3. Sprawdź indeksy

---

## 8. Bezpieczeństwo

### Hasła

- Minimum 3 znaki (zalecane 8+)
- Hasła są hashowane (bcrypt)
- Tokeny JWT ważne 30 dni

### Sesje

- Wylogowanie usuwa token
- Nieaktywne sesje wygasają po 30 dniach

### Uprawnienia

- RBAC (Role-Based Access Control)
- Każdy endpoint sprawdza uprawnienia
- Logowanie prób dostępu

---

## 9. Komendy Administracyjne

### PM2

```powershell
pm2 status           # Status aplikacji
pm2 logs             # Logi
pm2 restart all      # Restart
pm2 stop all         # Zatrzymaj
pm2 start all        # Uruchom
```

### Baza danych

```powershell
cd apps/api
pnpm db:studio       # GUI do bazy
pnpm db:migrate      # Uruchom migracje
pnpm db:generate     # Wygeneruj klienta Prisma
```

### Czyszczenie cache

```powershell
Remove-Item -Recurse -Force apps/web/.next
pnpm install
pnpm build
```

---

## 10. Kontakt i Wsparcie

### Dokumentacja

- [DEPLOYMENT_CHECKLIST.md](../../DEPLOYMENT_CHECKLIST.md)
- [UPDATE_PRODUCTION.md](../../UPDATE_PRODUCTION.md)
- [troubleshooting.md](troubleshooting.md)

### Logi

- PM2: `pm2 logs`
- Aplikacja: `apps/api/logs/`

---

*Ostatnia aktualizacja: 2026-01-14*
