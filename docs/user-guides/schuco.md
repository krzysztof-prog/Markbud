# 📦 Dostawy Schuco - Instrukcja użytkownika

## Dostęp do funkcji

1. Otwórz aplikację AKROBUD
2. W menu bocznym przejdź do: **Magazyn**
3. Rozwiń menu i kliknij: **Dostawy Schuco**

## Jak pobrać dane ze strony Schuco?

### Pierwszy raz:

1. Na stronie "Dostawy Schuco" kliknij przycisk **"Odśwież dane"**
2. Poczekaj 30-60 sekund (system loguje się na stronę Schuco i pobiera dane)
3. Po zakończeniu zobaczysz:
   - Status pobrania (zielony = sukces)
   - Liczbę pobranych rekordów
   - Tabelę z 50 najnowszymi dostawami

### Kolejne razy:

- Kliknij **"Odśwież dane"** aby pobrać najnowsze dane
- Dane są automatycznie aktualizowane w bazie
- Duplikaty są omijane (na podstawie numeru zamówienia)

## Co pokazuje tabela?

Tabela wyświetla **50 najnowszych dostaw** z następującymi kolumnami:

| Kolumna | Opis | Przykład |
|---------|------|----------|
| **Data zamówienia** | Data złożenia zamówienia | 28.11.2025 |
| **Nr zamówienia** | Unikalny numer zamówienia | 787/2025 |
| **Zlecenie** | Nazwa/opis zlecenia | Dostawa cwarta |
| **Status wysyłki** | Status dostawy | TIR |
| **Tydzień dostawy** | Planowany tydzień dostawy | - |
| **rodzaj zamówienia** | Typ zamówienia | Zamówienie |
| **Suma** | Całkowita wartość | 249,91 EUR |

## Status pobrania

W górnej części strony znajduje się karta ze statusem:

- 🟢 **Sukces** - dane pobrane prawidłowo
- 🔴 **Błąd** - wystąpił problem podczas pobierania
- 🟡 **W trakcie** - pobieranie w toku

Informacje o statusie:
- Liczba pobranych rekordów
- Czas trwania pobierania
- Data ostatniego pobrania
- Komunikat błędu (jeśli wystąpił)

## Jak często odświeżać dane?

- **Zalecane**: 1-2 razy dziennie
- **Minimum**: Raz przed rozpoczęciem pracy
- **Uwaga**: Nie odświeżaj zbyt często (może to spowodować blokadę przez Schuco)

## Filtrowanie danych

System automatycznie pobiera zamówienia z ostatnich **6 miesięcy** licząc wstecz od dzisiejszej daty.

## Rozwiązywanie problemów

### Problem: "Błąd podczas odświeżania"

**Możliwe przyczyny:**
1. Brak połączenia z internetem
2. Strona Schuco jest niedostępna
3. Błędne dane logowania
4. Zmiana struktury strony Schuco

**Co zrobić:**
1. Sprawdź połączenie internetowe
2. Spróbuj ponownie za kilka minut
3. Skontaktuj się z administratorem jeśli problem się powtarza

### Problem: "Pusta tabela / Brak danych"

**Rozwiązanie:**
1. Kliknij przycisk "Odśwież dane"
2. Poczekaj na zakończenie pobierania
3. Jeśli nadal pusto - sprawdź status pobrania

### Problem: "Pobieranie trwa zbyt długo"

**To normalne przy pierwszym pobraniu!**
- Puppeteer musi uruchomić przeglądarkę
- System loguje się na stronę Schuco
- Pobiera i parsuje plik CSV

**Typowy czas:**
- Pierwsze pobranie: 30-60 sekund
- Kolejne: 20-40 sekund

### Problem: "Dane się nie aktualizują"

**Sprawdź:**
1. Czy kliknąłeś "Odśwież dane"?
2. Czy status pokazuje "Sukces"?
3. Czy jest połączenie z internetem?

## Dane techniczne

### Dane logowania (tylko dla administratorów)

Dane logowania są przechowywane w pliku `.env` (nie commituj tego pliku do repozytorium!):
```
SCHUCO_EMAIL=your-email@example.com
SCHUCO_PASSWORD=your-password-here
```

**UWAGA:** Te zmienne środowiskowe są wymagane. Jeśli nie są ustawione, system zwróci błąd.

### Miejsce przechowywania

- Pobrane pliki CSV: `apps/api/downloads/schuco/`
- Baza danych: `apps/api/prisma/dev.db` (tabela: `schuco_deliveries`)

## FAQ

**Q: Czy mogę eksportować dane do Excel?**
A: Ta funkcja nie jest jeszcze zaimplementowana, ale może zostać dodana w przyszłości.

**Q: Jak długo dane są przechowywane?**
A: Wszystkie pobrane dane są przechowywane w bazie bez limitu czasu.

**Q: Czy mogę filtrować/wyszukiwać w tabeli?**
A: Obecnie nie, ale funkcja może być dodana w przyszłości.

**Q: Dlaczego widzę tylko 50 wierszy?**
A: System pokazuje 50 najnowszych rekordów dla wydajności. Starsze dane są w bazie.

**Q: Co się stanie jeśli zmienią się dane logowania Schuco?**
A: Skontaktuj się z administratorem aby zaktualizować dane w pliku `.env`.

## Wsparcie techniczne

W razie problemów skontaktuj się z działem IT podając:
- Dokładny komunikat błędu
- Screenshot strony
- Datę i godzinę wystąpienia problemu
- Informacje ze statusu pobrania

---

**Wersja dokumentacji:** 1.0
**Data:** 2025-12-01
**Autor:** Claude Code
