# Moduł Settings - Ustawienia Systemu

## Przegląd

Konfiguracja globalna systemu - katalogi, kolory, profile, dni robocze, mapowania autorów.

**Dostęp:** OWNER, ADMIN

**Lokalizacja:** `/admin/settings` lub `/ustawienia`

---

## Zakładki Ustawień

### 1. Ogólne (GeneralSettingsTab)

**Ustawienia główne:**
- Porty API i Web
- Ścieżki bazowe
- Konfiguracja PM2

### 2. Foldery (FoldersTab)

**Obserwowane katalogi (watch folders):**
- Uzyte bele
- Ceny
- Projekty OKUC
- Zamówienia szyb
- Dostawy szyb

Te foldery są monitorowane przez file watcher i automatycznie importowane.

### 3. Auto-Watch Szyb (GlassWatchTab)

**Konfiguracja:**
- Automatyczne śledzenie zamówień szyb
- Częstotliwość sprawdzania
- Alerty o nowych zamówieniach

### 4. Typy Palet (PalletTypesTab)

**CRUD typów palet:**
- Nazwa typu (MALA, P2400, P3000, P3500, P4000)
- Wymiary
- Kolejność wyświetlania

### 5. Kolory (ColorsTab)

**CRUD kolorów profili:**
- Kod koloru
- Nazwa
- Wartość HEX
- Aktywność

### 6. Profile (ProfilesTab)

**CRUD profili PVC:**
- Numer profilu
- Nazwa
- System
- Głębokość

### 7. Głębokości Profili (ProfileDepthsTab)

**Zarządzanie głębokościami:**
- Standard (np. 70mm, 82mm)
- Niestandardowe

### 8. Folder Użytkownika (UserFolderTab)

**Indywidualny folder:**
- Ścieżka do folderu użytkownika
- Mapowanie autorów dokumentów

### 9. Mapowanie Autorów (DocumentAuthorMappingsTab)

**Przypisanie autorów dokumentów:**
- Autor z pliku → Użytkownik w systemie
- Używane przy imporcie do przypisania zleceń

### 10. Lokalizacje OKUC (OkucLocationsTab)

**Zarządzanie lokalizacjami magazynowymi:**
- Tworzenie lokalizacji (PVC_A, PVC_B, PVC_C, ALU)
- Zmiana kolejności
- Aktywacja/dezaktywacja

---

## API Endpointy

### Główne Ustawienia

```
GET    /api/settings                    - Pobierz wszystkie ustawienia
PUT    /api/settings                    - Zapisz ustawienia
```

### Typy Palet

```
GET    /api/settings/pallet-types       - Lista typów
POST   /api/settings/pallet-types       - Dodaj typ
PUT    /api/settings/pallet-types/:id   - Edytuj
DELETE /api/settings/pallet-types/:id   - Usuń
```

### Kolory

```
GET    /api/colors                      - Lista kolorów
POST   /api/colors                      - Dodaj kolor
PUT    /api/colors/:id                  - Edytuj
DELETE /api/colors/:id                  - Usuń
```

### Profile

```
GET    /api/profiles                    - Lista profili
POST   /api/profiles                    - Dodaj profil
PUT    /api/profiles/:id                - Edytuj
DELETE /api/profiles/:id                - Usuń
```

### Dni Robocze

```
GET    /api/working-days                - Dni robocze (zakres)
POST   /api/working-days                - Dodaj dzień wolny
DELETE /api/working-days/:date          - Usuń dzień wolny
GET    /api/working-days/holidays       - Święta (PL/DE)
```

### File Watcher

```
POST   /api/settings/file-watcher/restart - Restart watchera
```

### Folder Użytkownika

```
PUT    /api/settings/user-folder-path   - Ustaw folder
```

### Mapowanie Autorów

```
GET    /api/settings/document-author-mappings     - Lista mapowań
POST   /api/settings/document-author-mappings     - Dodaj mapowanie
PUT    /api/settings/document-author-mappings/:id - Edytuj
DELETE /api/settings/document-author-mappings/:id - Usuń
```

---

## Komponenty Frontend

| Komponent | Opis |
|-----------|------|
| `GeneralSettingsTab` | Ustawienia ogólne |
| `FoldersTab` | Ścieżki folderów |
| `PalletTypesTab` | Typy palet |
| `ColorsTab` | Zarządzanie kolorami |
| `ProfilesTab` | Zarządzanie profilami |
| `ProfileDepthsTab` | Głębokości profili |
| `GlassWatchTab` | Auto-watch szyb |
| `UserFolderTab` | Folder użytkownika |
| `DocumentAuthorMappingsTab` | Mapowanie autorów |
| `OkucLocationsTab` | Lokalizacje OKUC |
| `SettingsDialogs` | Dialogi pomocnicze |

---

## Hooki

```typescript
useUpdateSettings()              // Zapisz ustawienia główne
usePalletTypeMutations()         // CRUD palet
useColorMutations()              // CRUD kolorów
useProfileMutations()            // CRUD profili
useFileWatcher()                 // Restart watchera
useUserFolderPath()              // Folder użytkownika
useDocumentAuthorMappingMutations() // Mapowanie autorów
```

---

## Typy Danych

### Settings

```typescript
interface Settings {
  watchFolders: {
    uzyteBele: string;
    ceny: string;
    projektyOkuc: string;
    zamowieniaSzyb: string;
    dostawySzyb: string;
  };
  glassWatch: {
    enabled: boolean;
    intervalMinutes: number;
  };
  userFolderPath: string | null;
}
```

### Color

```typescript
interface Color {
  id: number;
  code: string;
  name: string;
  hexValue: string | null;
  isActive: boolean;
  sortOrder: number;
}
```

### Profile

```typescript
interface Profile {
  id: number;
  number: string;
  name: string;
  system: string;
  depth: number;
  isActive: boolean;
}
```

### DocumentAuthorMapping

```typescript
interface DocumentAuthorMapping {
  id: number;
  documentAuthor: string;  // Nazwa z pliku
  userId: number;           // ID użytkownika w systemie
  user?: User;
}
```

---

## File Watcher

System obserwuje określone foldery i automatycznie importuje nowe pliki:

**Obsługiwane formaty:**
- CSV (uzyte bele, ceny)
- XLSX (projekty OKUC)
- PDF (projekty)

**Restart watchera:**
Po zmianie ścieżek można zrestartować watcher bez restartu aplikacji.

---

## Pliki

**Frontend:**
- `apps/web/src/features/settings/`
- `apps/web/src/app/admin/settings/`

**Backend:**
- `apps/api/src/handlers/settingsHandler.ts`
- `apps/api/src/services/settingsService.ts`
- `apps/api/src/routes/settings.ts`

---

## Zobacz też

- [Panel administracyjny](../admin/overview.md)
- [Magazyn OKUC](../okuc/overview.md)
