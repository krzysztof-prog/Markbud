# Rozwiązywanie Problemów

Przewodnik rozwiązywania typowych problemów w systemie AKROBUD.

---

## Problemy z Logowaniem

### Nie mogę się zalogować

**Objawy:** Błąd "Nieprawidłowy login lub hasło"

**Rozwiązania:**
1. Sprawdź czy Caps Lock jest wyłączony
2. Upewnij się że wpisujesz poprawny login (wielkość liter ma znaczenie)
3. Sprawdź czy nie kopiujesz spacji na końcu hasła
4. Skontaktuj się z administratorem po reset hasła

### Sesja wygasła

**Objawy:** "Sesja wygasła - zaloguj się ponownie"

**Przyczyna:** Brak aktywności przez > 2 godziny

**Rozwiązanie:** Zaloguj się ponownie

---

## Problemy z Wydajnością

### System jest wolny

**Rozwiązania:**
1. **Odśwież przeglądarkę:** F5 lub Ctrl+R
2. **Wyczyść cache przeglądarki:**
   - Chrome: Ctrl+Shift+Delete → Wyczyść cache
3. **Sprawdź połączenie internetowe:**
   - Szybkość > 5 Mbps wymagana
4. **Zamknij inne karty** przeglądarki

### Tabela się nie ładuje

**Objawy:** Kółko ładowania nie znika

**Rozwiązania:**
1. Odśwież stronę (F5)
2. Wyczyść filtry
3. Zmniejsz zakres dat
4. Sprawdź konsol ę błędów (F12 → Console)

---

## Problemy z Importem

### Import PDF nie działa

**Objawy:** "Błąd podczas analizy PDF"

**Przyczyny i rozwiązania:**

**Przyczyna 1:** PDF jest skanem (nie ma tekstu)
- Rozwiązanie: Użyj PDF z tekstem lub wprowadź ręcznie

**Przyczyna 2:** PDF zaszyfrowany/chroniony
- Rozwiązanie: Usuń hasło z PDF

**Przyczyna 3:** Niestandardowy format
- Rozwiązanie: Sprawdź czy format jest obsługiwany

### Import CSV - błędy walidacji

**Objawy:** "Wiersz X: Profil nie istnieje"

**Rozwiązanie:**
1. Sprawdź pisownię nazwy profilu
2. Zobacz listę profili w systemie (Magazyn → Profile)
3. Dodaj brakujący profil lub zmień nazwę w CSV

**Kodowanie CSV:**
- Zawsze używaj UTF-8 dla polskich znaków
- W Excelu: Zapisz jako → CSV UTF-8

---

## Problemy z Dostawami

### Optymalizacja palet nie działa

**Objawy:** "Nie można optymalnie spakować okien"

**Rozwiązania:**
1. Sprawdź wymiary okien w zleceniach
2. Użyj trybu ręcznego przepakowania
3. Podziel na więcej dostaw

### Protokół PDF pusty

**Objawy:** PDF generuje się ale jest pusty

**Przyczyna:** Brak przypisanych zleceń

**Rozwiązanie:** Przypisz zlecenia do dostawy

---

## Problemy z Magazynem

### Ujemny stan magazynu

**Objawy:** Stan profilu pokazuje wartość ujemną (np. -500mm)

**Przyczyna:** Zużyto więcej niż było

**Rozwiązanie:**
1. Magazyn → Profil → Edytuj
2. Ustaw poprawny stan (np. 0)
3. Powód: "Korekta - ujemny stan"
4. Zbadaj dlaczego: sprawdź historię operacji

### Niedobór się nie aktualizuje

**Objawy:** Dostarczyłem profile ale niedobór dalej czerwony

**Rozwiązanie:**
1. Odśwież stronę (F5)
2. Sprawdź czy przyjęcie dostawy się zapisało (Historia)
3. Przeliczy zapotrzebowanie: Magazyn → "Przelicz zapotrzebowanie"

---

## Problemy z Drukowaniem

### Protokół nie drukuje się

**Rozwiązania:**
1. Sprawdź czy masz zainstalowaną drukarkę
2. Pobierz PDF i drukuj z pliku
3. Sprawdź ustawienia przeglądarki (blokada popupów)

### PDF ma złe czcionki

**Przyczyna:** Brak czcionek w systemie

**Rozwiązanie:** Skontaktuj się z administratorem

---

## Problemy z Danymi

### Nie widzę nowych danych

**Objawy:** Kolega dodał zlecenie ale ja go nie widzę

**Rozwiązania:**
1. Odśwież stronę: F5
2. Wyczyść filtry (mogą ukrywać)
3. Sprawdź zakres dat

### Duplikat danych

**Objawy:** To samo zlecenie 2 razy

**Rozwiązanie:**
1. Sprawdź który jest poprawny
2. Usuń duplikat (lub zarchiwizuj)
3. Jeśli są różnice - scal ręcznie

---

## Błędy Systemowe

### "Konflikt wersji"

**Pełny komunikat:** "Konflikt wersji - ktoś zmienił te dane"

**Przyczyna:** Optimistic locking - 2 osoby edytowały jednocześnie

**Rozwiązanie:**
1. Kliknij "Anuluj"
2. Odśwież stronę (F5)
3. Wprowadź zmiany ponownie

### "401 Unauthorized"

**Przyczyna:** Sesja wygasła

**Rozwiązanie:** Zaloguj się ponownie

### "500 Internal Server Error"

**Przyczyna:** Błąd serwera

**Rozwiązanie:**
1. Odśwież stronę
2. Spróbuj za chwilę
3. Jeśli dalej - kontakt z administratorem

---

## Problemy z Przeglądarką

### Zalecane przeglądarki

✅ **Wspierane:**
- Chrome 120+
- Edge 120+
- Firefox 120+

❌ **Niewspierane:**
- Internet Explorer (nie działa!)
- Opera (problemy z wydajnością)

### Wyczyść cache przeglądarki

**Chrome/Edge:**
1. Ctrl+Shift+Delete
2. Zaznacz "Cached images and files"
3. Zakres: "All time"
4. Wyczyść

**Firefox:**
1. Ctrl+Shift+Delete
2. Zaznacz "Cache"
3. OK

---

## Kiedy Kontaktować się z Administratorem

Skontaktuj się jeśli:
- ✅ Zapomniałeś hasła
- ✅ Błędy 500 nie znikają
- ✅ System kompletnie nie działa
- ✅ Trzeba dodać nowego użytkownika
- ✅ Problemy z integracją Schuco

**Jak zgłosić problem:**
1. Opisz co robiłeś
2. Jaki był wynik (błąd)
3. Screenshot błędu (F12 → Console)
4. Przeglądarka i system operacyjny

---

## Logi Błędów (dla admin)

**Lokalizacja logów:**
- Backend: `apps/api/logs/`
- Frontend: Konsola przeglądarki (F12)

**Poziomy:**
- ERROR - krytyczne błędy
- WARN - ostrzeżenia
- INFO - informacje

---

## Powiązane

- [FAQ](faq.md) - najczęstsze pytania
- [Getting Started](getting-started.md) - podstawy systemu

---

**Dalej masz problem?** Skontaktuj się z administratorem systemu.

---

*Ostatnia aktualizacja: 2025-12-30*
