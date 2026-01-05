# AKROBUD - Pierwsze Kroki

Przewodnik dla nowych użytkowników systemu AKROBUD.

## Witamy w systemie AKROBUD!

AKROBUD to system do zarządzania produkcją okien aluminiowych. Pomaga w:
- Zarządzaniu zleceniami produkcyjnymi
- Planowaniu dostaw do klientów
- Kontroli stanu magazynu profili
- Zamawianiu i śledzeniu szyb
- Generowaniu raportów

---

## Logowanie do Systemu

### Krok 1: Otwórz aplikację

Wpisz w przeglądarce adres:
```
http://localhost:3000
```
(lub adres podany przez administratora)

### Krok 2: Zaloguj się

Wprowadź swoje dane logowania:
- **Login:** Twoja nazwa użytkownika
- **Hasło:** Twoje hasło

**Pierwsze logowanie?** Skontaktuj się z administratorem po dane dostępu.

---

## Interfejs Użytkownika

### Dashboard (Strona Główna)

Po zalogowaniu widzisz **Dashboard** z:

1. **Statystyki** - kluczowe liczby (zlecenia, dostawy, braki)
2. **Wykresy** - wizualizacja danych
3. **Ostatnie aktywności** - co się działo w systemie
4. **Skróty** - szybki dostęp do często używanych funkcji

### Menu Nawigacyjne (Lewy Panel)

| Ikona | Moduł | Do czego służy |
|-------|-------|----------------|
| 📋 | **Zlecenia** | Zarządzanie zleceniami produkcyjnymi |
| 🚚 | **Dostawy** | Planowanie dostaw do klientów |
| 🏭 | **Magazyn** | Stan magazynowy profili |
| 🪟 | **Szyby** | Zamówienia i dostawy szyb |
| 📊 | **Zestawienia** | Raporty i eksporty |
| ⚙️ | **Ustawienia** | Konfiguracja systemu |

---

## Pierwsze Zadania

### Zadanie 1: Przeglądnij Zlecenia

1. Kliknij **Zlecenia** w menu
2. Zobaczysz listę wszystkich zleceń
3. Możesz:
   - **Filtrować** - po statusie, dacie, kliencie
   - **Sortować** - kliknij nagłówek kolumny
   - **Szukać** - wpisz numer zlecenia lub klienta

**Kolumny tabeli:**
- **Nr zlecenia** - unikalny numer
- **Klient** - nazwa klienta
- **Data** - data przyjęcia zlecenia
- **Status** - nowe / w produkcji / zakończone
- **Wartość** - wartość zlecenia w PLN
- **Dostawa** - przypisana dostawa

### Zadanie 2: Zobacz Szczegóły Zlecenia

1. Kliknij na dowolne zlecenie
2. Zobaczysz:
   - **Dane zlecenia** - szczegóły, klient, daty
   - **Okna** - lista okien w zleceniu
   - **Zapotrzebowanie** - potrzebne profile
   - **Historia** - zmiany w zleceniu

### Zadanie 3: Sprawdź Dostawy

1. Kliknij **Dostawy** w menu
2. Zobacz kalendarz dostaw
3. Kliknij na dostawę aby zobaczyć:
   - Przypisane zlecenia
   - Status dostawy
   - Liczba palet

---

## Typowe Scenariusze

### Scenariusz A: Mam nowe zlecenie od klienta

**Co zrobić?**

1. **Import z PDF:**
   - Zlecenia → Nowe zlecenie
   - Przeciągnij plik PDF
   - System automatycznie rozpozna dane
   - Sprawdź i zatwierdź

2. **Ręczne wprowadzenie:**
   - Zlecenia → Nowe zlecenie → Ręcznie
   - Wypełnij formularz
   - Dodaj okna
   - Zapisz

**Co dalej?**
- System automatycznie obliczy zapotrzebowanie na profile
- Możesz przypisać zlecenie do dostawy

Szczegóły: [orders.md](orders.md)

### Scenariusz B: Planuję dostawę na przyszły tydzień

**Co zrobić?**

1. Dostawy → Kalendarz
2. Wybierz datę dostawy
3. Kliknij "Nowa dostawa"
4. Przypisz zlecenia do dostawy
5. System pomoże:
   - Zoptymalizować palety
   - Wygenerować protokół dostawy PDF

Szczegóły: [deliveries.md](deliveries.md)

### Scenariusz C: Sprawdzam stan magazynu

**Co zrobić?**

1. Magazyn → Akrobud (lub inny magazyn)
2. Zobacz listę profili
3. Sprawdź kolumny:
   - **Stan** - ile mamy (mm)
   - **Zapotrzebowanie** - ile potrzeba
   - **Niedobór** - ile brakuje (czerwone)
4. Złóż zamówienie jeśli trzeba

Szczegóły: [warehouse.md](warehouse.md)

### Scenariusz D: Generuję raport miesięczny

**Co zrobić?**

1. Zestawienia → Raporty miesięczne
2. Wybierz miesiąc
3. Wybierz typ raportu:
   - Zlecenia
   - Dostawy
   - Obroty
4. Kliknij "Generuj PDF"
5. Pobierz plik

Szczegóły: [reports.md](reports.md)

---

## Najczęstsze Pytania (FAQ)

### Jak zmienić hasło?
Ustawienia → Profil → Zmień hasło

### Jak cofnąć ostatnią operację?
Większość operacji ma przycisk "Cofnij" lub możesz użyć historii zmian.

### Co oznacza status "w produkcji"?
Zlecenie jest aktualnie realizowane - okna są produkowane.

### Dlaczego nie mogę edytować zlecenia?
Niektóre zlecenia (zarchiwizowane lub dostarczone) są tylko do odczytu.

### Jak wydrukować protokół dostawy?
Dostawy → Wybierz dostawę → Generuj protokół PDF → Drukuj

Więcej: [faq.md](faq.md)

---

## Co dalej?

Teraz gdy znasz podstawy, przeczytaj szczegółowe przewodniki:

1. **[Zlecenia](orders.md)** - jak tworzyć i zarządzać zleceniami
2. **[Dostawy](deliveries.md)** - planowanie i optymalizacja dostaw
3. **[Magazyn](warehouse.md)** - zarządzanie stanem profili
4. **[Import](imports.md)** - importowanie plików CSV/PDF
5. **[Raporty](reports.md)** - generowanie raportów i eksportów

---

## Potrzebujesz Pomocy?

### W systemie
- **Ikona "?" (Help)** - podpowiedzi kontekstowe
- **Tooltips** - najedź myszką na ikonę

### Dokumentacja
- [FAQ](faq.md) - najczęstsze pytania
- [Rozwiązywanie problemów](troubleshooting.md) - typowe błędy

### Kontakt
- **Administrator systemu** - techniczne problemy
- **Kierownik** - pytania biznesowe

---

## Skróty Klawiszowe

| Skrót | Akcja |
|-------|-------|
| `Ctrl + K` | Szybkie wyszukiwanie |
| `Ctrl + N` | Nowe zlecenie/dostawa (w danym module) |
| `Ctrl + S` | Zapisz zmiany |
| `Esc` | Zamknij modal |
| `F5` | Odśwież dane |

---

**Powodzenia w pracy z systemem AKROBUD!** 🚀

Masz pytania? Zobacz [FAQ](faq.md) lub skontaktuj się z administratorem.

---

*Ostatnia aktualizacja: 2025-12-30*
