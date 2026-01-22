# Plan: Rozszerzenie strony Ustawienia

**Data:** 2026-01-21
**Status:** W trakcie realizacji

---

## Wykonane zadania ✅

### 1. Podpięcie istniejących zakładek do strony Ustawienia
**Pliki:**
- `apps/web/src/app/ustawienia/page.tsx`

**Zmiany:**
- Dodano 3 nowe zakładki: Stal, Głębokości, Autorzy
- Import nowych komponentów: SteelTab, ProfileDepthsTab, DocumentAuthorMappingsTab
- Import hooków: useSteelMutations, useDocumentAuthorMappingMutations
- Nowe stany dialogów i walidacji dla Steel i DocumentAuthorMapping
- Query dla danych: steels, documentAuthorMappings, users
- Handlery: handleSaveSteel, handleSaveDocumentAuthorMapping
- Rozszerzony handleDelete o obsługę 'steel' i 'documentAuthorMapping'
- Dialogi: SteelDialog, DocumentAuthorMappingDialog

### 2. Ustawienie: Domyślna strona po logowaniu
**Plik:** `apps/web/src/features/settings/components/GeneralSettingsTab.tsx`

**Zmiany:**
- Dodano sekcję "Strona startowa" z Select
- Dostępne opcje: Dashboard, Zlecenia, Dostawy, Magazyn (Stock/Remanent/Okucia), Panel kierownika
- Klucz ustawienia: `defaultHomePage`
- Domyślna wartość: `/`

### 3. Ustawienie: Próg tolerancji dla auto-match szyb
**Plik:** `apps/web/src/features/settings/components/GlassWatchTab.tsx`

**Zmiany:**
- Dodano sekcję "Automatyczne dopasowanie szyb"
- Input dla tolerancji wymiarów (0-10 mm)
- Klucz ustawienia: `glassMatchToleranceMm`
- Domyślna wartość: `2` mm

### 4. Ustawienie: Okres retencji soft delete
**Plik:** `apps/web/src/features/settings/components/GeneralSettingsTab.tsx`

**Zmiany:**
- Dodano sekcję "Retencja usuniętych danych"
- Input dla liczby dni (7-365)
- Klucz ustawienia: `softDeleteRetentionDays`
- Domyślna wartość: `90` dni

---

## Zadania do zrobienia 📋

### 5. UI dla kalendarza dni roboczych (WorkingDay)
**Priorytet:** Średni
**Złożoność:** Wysoka (wymaga nowego komponentu z kalendarzem)

**Do zrobienia:**
- Utworzyć komponent `WorkingDaysTab.tsx`
- Wyświetlić kalendarz z zaznaczonymi dniami wolnymi
- Możliwość oznaczania dni jako pracujące/niepracujące
- Integracja z `workingDaysApi` (już istnieje)
- Wyświetlanie świąt z API (getHolidays)

**API (już istnieje):**
```typescript
workingDaysApi.getAll({ from, to, month, year })
workingDaysApi.getHolidays(year, country)
workingDaysApi.setWorkingDay(date, isWorking, description)
workingDaysApi.delete(date)
```

### 6. Ustawienie: Odbiorcy powiadomień email
**Priorytet:** Niski
**Złożoność:** Średnia

**Do zrobienia:**
- Dodać sekcję w GeneralSettingsTab lub nowa zakładka
- Lista email odbiorców (tagowane inputy)
- Możliwość dodawania/usuwania adresów
- Klucz ustawienia: `emailRecipients` (JSON array)

### 7. UI dla Packing Rules
**Priorytet:** Niski
**Złożoność:** Średnia

**Do zrobienia:**
- Sprawdzić czy istnieje backend dla packing rules
- Utworzyć komponent PackingRulesTab
- CRUD dla reguł pakowania

### 8. Panel integracji (API keys, webhooks)
**Priorytet:** Niski
**Złożoność:** Wysoka

**Do zrobienia:**
- Nowa zakładka "Integracje"
- Generowanie/odnawianie API keys
- Konfiguracja webhooków (URL, eventy)
- Historia wywołań webhooków

### 9. Harmonogram backupów
**Priorytet:** Niski
**Złożoność:** Średnia

**Do zrobienia:**
- Sekcja w ustawieniach ogólnych lub admin
- Wybór częstotliwości (dzienny, tygodniowy)
- Wybór godziny
- Ścieżka docelowa backupu
- Status ostatniego backupu

### 10. Preferencje użytkownika (theme, timezone)
**Priorytet:** Niski
**Złożoność:** Niska

**Do zrobienia:**
- Nowa zakładka lub sekcja "Personalizacja"
- Wybór motywu (light/dark/system)
- Wybór strefy czasowej
- Zapisywane per użytkownik (nie globalnie)

---

## Jak przetestować wykonane zmiany

1. Uruchom aplikację: `pnpm dev`
2. Przejdź do: http://localhost:3000/ustawienia
3. Sprawdź nowe zakładki:
   - **Stal** - dodawanie/edycja/usuwanie typów stali
   - **Głębokości** - głębokości profili (self-contained)
   - **Autorzy** - mapowanie autorów CSV do użytkowników
4. W zakładce **Ogólne** sprawdź:
   - Strona startowa (dropdown z opcjami)
   - Retencja usuniętych danych (input z dniami)
5. W zakładce **Auto-watch Szyb** sprawdź:
   - Tolerancja wymiarów dla auto-match (input mm)

---

## Uwagi techniczne

### Nowe ustawienia wymagają obsługi w backendzie:
- `defaultHomePage` - redirect po logowaniu
- `glassMatchToleranceMm` - używane w glass matching service
- `softDeleteRetentionDays` - używane w cleanup job

### Zależności:
- Wszystkie nowe zakładki korzystają z istniejących API
- Dialogi SteelDialog i DocumentAuthorMappingDialog już istnieją
- Hooki useSteelMutations i useDocumentAuthorMappingMutations już istnieją