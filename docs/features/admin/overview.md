# Moduł Admin - Panel Administracyjny

## Przegląd

Panel administracyjny umożliwia zarządzanie użytkownikami systemu, monitorowanie stanu aplikacji oraz konfigurację ustawień systemowych.

**Dostęp:** Tylko użytkownicy z rolami `OWNER` lub `ADMIN`

**Lokalizacja:** `/admin`

---

## Funkcjonalności

### 1. Zarządzanie Użytkownikami

**Strona:** `/admin/users`

Umożliwia:
- Przeglądanie listy wszystkich użytkowników
- Dodawanie nowych użytkowników
- Edycję istniejących użytkowników (email, imię, rola, hasło)
- Usuwanie użytkowników (z wyjątkiem konta systemowego)

#### Role użytkowników

| Rola | Opis | Uprawnienia |
|------|------|-------------|
| `owner` | Właściciel | Pełny dostęp do wszystkiego |
| `admin` | Administrator | Pełny dostęp + zarządzanie użytkownikami |
| `kierownik` | Kierownik produkcji | Panel kierownika, magazyn, dostawy |
| `ksiegowa` | Księgowa | Raporty finansowe, zestawienia |
| `user` | Operator | Podstawowy dostęp, dashboard operatora |

### 2. Ustawienia Systemu

**Strona:** `/admin/settings`

Konfiguracja:
- Ścieżki do folderów obserwowanych (import)
- Typy palet
- Kolory profili
- Profile PVC
- Mapowanie autorów dokumentów

### 3. Monitoring Stanu Systemu

**Strona:** `/admin/health`

Sprawdza:
- Połączenie z bazą danych
- Dostępność folderów sieciowych
- Miejsce na dysku
- Status ostatnich importów
- Czas działania aplikacji (uptime)

### 4. Zgłoszenia Błędów

**Strona:** `/admin/bug-reports`

Przeglądanie zgłoszeń błędów od użytkowników aplikacji.

---

## API Endpointy

### Użytkownicy

```
GET    /api/users       - Lista użytkowników
GET    /api/users/:id   - Szczegóły użytkownika
POST   /api/users       - Dodaj użytkownika
PUT    /api/users/:id   - Edytuj użytkownika
DELETE /api/users/:id   - Usuń użytkownika
```

### Health Check

```
GET    /api/health/detailed   - Szczegółowy status systemu
```

### Bug Reports

```
POST   /api/bug-reports       - Zgłoś błąd
GET    /api/bug-reports       - Pobierz zgłoszenia
```

---

## Bezpieczeństwo

- Wszystkie endpointy wymagają autoryzacji JWT
- Zarządzanie użytkownikami wymaga roli `OWNER` lub `ADMIN`
- Hasła są hashowane (bcrypt, salt=10)
- Hasła nigdy nie są zwracane w odpowiedziach API

---

## Komponenty Frontend

| Komponent | Opis |
|-----------|------|
| `UsersList` | Tabela użytkowników z akcjami |
| `UserFormDialog` | Dialog do tworzenia/edycji użytkownika |
| `AdminSidebar` | Menu nawigacyjne panelu |
| `HealthDashboard` | Dashboard monitoringu |
| `BugReportsList` | Lista zgłoszeń błędów |

---

## Pliki

**Frontend:**
- `apps/web/src/features/admin/` - komponenty i API
- `apps/web/src/app/admin/` - strony

**Backend:**
- `apps/api/src/handlers/userHandler.ts`
- `apps/api/src/services/userService.ts`
- `apps/api/src/routes/users.ts`

---

## Zobacz też

- [Dokumentacja ról i uprawnień](../../ROLE_BASED_ACCESS_IMPLEMENTATION.md)
- [Ustawienia systemu](../settings/overview.md)