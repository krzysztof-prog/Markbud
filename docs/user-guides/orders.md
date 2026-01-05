# Zlecenia - Przewodnik Użytkownika

Kompletny przewodnik zarządzania zleceniami produkcyjnymi w systemie AKROBUD.

---

## Co to są Zlecenia?

**Zlecenie** to zamówienie od klienta na produkcję okien aluminiowych. Zawiera:
- Dane klienta
- Listę okien do wyprodukowania
- Specyfikację profili i kolorów
- Terminy realizacji
- Wartość zlecenia

---

## Dostęp do Zleceń

**Menu → Zlecenia** lub kliknij kafelek "Zlecenia" na dashboardzie.

### Widok Listy Zleceń

Zobaczysz tabelę z kolumnami:

| Kolumna | Opis |
|---------|------|
| **Nr zlecenia** | Unikalny numer (np. 53456) |
| **Klient** | Nazwa klienta |
| **Data zlecenia** | Kiedy przyjęto zlecenie |
| **Status** | Nowe / W produkcji / Zakończone / Archiwum |
| **Wartość** | Wartość w PLN |
| **Dostawa** | Przypisana dostawa (jeśli jest) |
| **Akcje** | Przyciski: Zobacz / Edytuj / Usuń |

### Filtry i Wyszukiwanie

**Filtry:**
- **Status** - pokaż tylko nowe, w produkcji, zakończone
- **Data** - zakres dat
- **Klient** - wybierz klienta z listy

**Wyszukiwanie:**
- Wpisz numer zlecenia (np. "53456")
- Wpisz nazwę klienta (np. "Kowalski")
- Wpisz datę (np. "2025-01-15")

**Sortowanie:**
- Kliknij nagłówek kolumny aby posortować

---

## Tworzenie Nowego Zlecenia

### Opcja 1: Import z PDF (Zalecane)

**Krok 1:** Kliknij "Nowe zlecenie" → "Import z PDF"

**Krok 2:** Przeciągnij plik PDF lub kliknij "Wybierz plik"

**Krok 3:** System automatycznie rozpozna:
- Numer zlecenia
- Dane klienta
- Listę okien
- Profile i kolory
- Wartości

**Krok 4:** Sprawdź zaimportowane dane

**Krok 5:** Jeśli wszystko OK - kliknij "Akceptuj i utwórz zlecenie"

**Warianty zlecenia:**
- Jeśli PDF zawiera kilka wariantów okna (różne kolory, profile)
- System pokaże modal "Wybierz wariant"
- Zaznacz preferowany wariant
- Kliknij "Zatwierdź"

**Co jeśli coś jest źle?**
- Możesz ręcznie poprawić dane przed akceptacją
- Kliknij "Edytuj" przy danym polu
- Wprowadź poprawną wartość
- Zapisz

### Opcja 2: Ręczne Wprowadzenie

**Krok 1:** Kliknij "Nowe zlecenie" → "Ręcznie"

**Krok 2:** Wypełnij formularz:

#### Sekcja: Dane Podstawowe
- **Nr zlecenia*** - unikalny numer (np. 53456)
- **Data zlecenia*** - wybierz z kalendarza
- **Klient*** - nazwa klienta
- **Telefon** - kontakt do klienta
- **Email** - email klienta
- **Termin realizacji** - deadline

\* = pole wymagane

#### Sekcja: Okna

Kliknij "Dodaj okno":

- **Pozycja** - numer w zleceniu (1, 2, 3...)
- **Rodzaj** - uchylne, rozwieralne, stałe, etc.
- **Szerokość** - w mm
- **Wysokość** - w mm
- **Ilość** - ile sztuk takiego okna

**Dodaj więcej okien** klikając ponownie "Dodaj okno"

#### Sekcja: Profile

System automatycznie obliczy zapotrzebowanie na profile.

Możesz ręcznie dodać profile:
- **Profil** - wybierz z listy
- **Kolor** - wybierz kolor
- **Długość** - w mm
- **Ilość** - sztuki

**Krok 3:** Kliknij "Utwórz zlecenie"

---

## Szczegóły Zlecenia

Kliknij na zlecenie w liście aby zobaczyć szczegóły.

### Zakładki

#### 1. Dane Zlecenia
- Numer, klient, daty
- Status zlecenia
- Wartość
- Przypisana dostawa
- Notatki

**Akcje:**
- **Edytuj** - zmień dane
- **Zmień status** - nowe → w produkcji → zakończone
- **Przypisz do dostawy** - wybierz dostawę
- **Archiwizuj** - przenieś do archiwum

#### 2. Okna
Lista okien w zleceniu:
- Pozycja, rodzaj, wymiary
- Ilość
- Specyfikacja

**Akcje:**
- **Dodaj okno**
- **Edytuj okno**
- **Usuń okno**

#### 3. Zapotrzebowanie
Automatycznie obliczone profile:
- Profil, kolor
- Długość potrzebna
- Stan magazynu
- Niedobór (jeśli jest)

**Kolory:**
- 🟢 Zielony - wystarczająco w magazynie
- 🟡 Żółty - mało w magazynie
- 🔴 Czerwony - niedobór, trzeba zamówić

#### 4. Historia
Wszystkie zmiany w zleceniu:
- Kto, kiedy, co zmienił
- Status changes
- Przypisania do dostaw

---

## Edycja Zlecenia

### Zmiana Danych Podstawowych

1. Otwórz zlecenie
2. Kliknij "Edytuj"
3. Zmień dane (klient, daty, etc.)
4. Kliknij "Zapisz"

### Dodawanie/Edycja Okien

1. Zakładka "Okna"
2. Kliknij "Dodaj okno" lub "Edytuj" przy istniejącym
3. Wprowadź dane
4. Zapisz

**System automatycznie przeliczy zapotrzebowanie na profile!**

### Zmiana Statusu

**Statusy:**
- 🆕 **Nowe** - dopiero przyjęte
- ⚙️ **W produkcji** - okna są produkowane
- ✅ **Zakończone** - gotowe do dostawy
- 📦 **Archiwum** - dostarczone, zakończone

**Jak zmienić:**
1. Otwórz zlecenie
2. Dropdown "Status"
3. Wybierz nowy status
4. Potwierdź

---

## Przypisywanie do Dostawy

### Automatyczne (podczas tworzenia dostawy)
1. Dostawy → Nowa dostawa
2. System pokaże zlecenia gotowe do dostawy
3. Zaznacz zlecenia
4. Utwórz dostawę

### Ręczne (z poziomu zlecenia)
1. Otwórz zlecenie
2. Kliknij "Przypisz do dostawy"
3. Wybierz dostawę z listy
4. Potwierdź

**Odpięcie od dostawy:**
1. Otwórz zlecenie
2. Kliknij "Odepnij od dostawy"
3. Potwierdź

---

## Warianty Zleceń

**Co to są warianty?**
Czasami klient podaje kilka opcji dla tego samego okna (np. różne kolory). System tworzy "warianty" zlecenia.

### Obsługa Wariantów

**Podczas importu PDF:**
- System wykryje warianty automatycznie
- Pokaże modal "Wybierz wariant"
- Zaznacz preferowany wariant
- Możesz zaakceptować wszystkie warianty lub tylko wybrane

**Widok wariantów:**
- Zlecenia z wariantami mają ikonę 🔀
- Kliknij na zlecenie aby zobaczyć wszystkie warianty
- Możesz:
  - Aktywować inny wariant
  - Usunąć wariant
  - Porównać warianty

---

## Zarządzanie Ceną

### Ceny Oczekujące (Pending Prices)

Podczas importu PDF czasami cena nie jest dostępna od razu.

**Proces:**
1. System importuje zlecenie bez ceny
2. Status: "Oczekuje na cenę"
3. Gdy cena będzie dostępna:
   - Import ponownie ten sam PDF (z ceną)
   - Lub ręcznie wprowadź cenę
4. Kliknij "Akceptuj cenę"
5. System zaktualizuje wartość zlecenia

**Wygasłe ceny:**
- Ceny oczekujące wygasają po 30 dniach
- System automatycznie usuwa wygasłe
- Możesz ręcznie usunąć: Zlecenia → Ceny oczekujące → Usuń

---

## Usuwanie Zlecenia

**⚠️ UWAGA:** Usunięcie zlecenia jest nieodwracalne!

**Krok 1:** Otwórz zlecenie

**Krok 2:** Kliknij "Usuń" (ikona kosza)

**Krok 3:** Potwierdź usunięcie

**Kiedy NIE MOŻNA usunąć:**
- Zlecenie przypisane do dostawy → najpierw odepnij
- Zlecenie ma historię produkcji → zarchiwizuj zamiast usuwać

**Alternatywa:** Archiwizacja
- Kliknij "Archiwizuj"
- Zlecenie przeniesie się do archiwum
- Możesz je przywrócić później

---

## Raporty i Eksporty

### Export Listy Zleceń

1. Ustaw filtry (np. miesiąc, status)
2. Kliknij "Eksportuj" (ikona ⬇️)
3. Wybierz format:
   - **Excel** - .xlsx
   - **CSV** - dla importu do innych systemów
   - **PDF** - do druku

### Drukowanie Zlecenia

1. Otwórz zlecenie
2. Kliknij "Drukuj" (ikona 🖨️)
3. System wygeneruje PDF z:
   - Danymi zlecenia
   - Listą okien
   - Zapotrzebowaniem

---

## Typowe Scenariusze

### Scenariusz A: Klient zmienił specyfikację

**Problem:** Klient chce inne kolory/wymiary

**Rozwiązanie:**
1. Otwórz zlecenie
2. Zakładka "Okna"
3. Edytuj okno → zmień specyfikację
4. Zapisz
5. System automatycznie przeliczy zapotrzebowanie

### Scenariusz B: Muszę podzielić zlecenie na 2 dostawy

**Rozwiązanie:**
1. Stwórz pierwszą dostawę - przypisz część okien
2. Stwórz drugą dostawę - przypisz resztę okien
3. Lub: Duplikuj zlecenie, podziel okna, przypisz do różnych dostaw

### Scenariusz C: Znalazłem duplikat zlecenia

**Rozwiązanie:**
1. Sprawdź który jest poprawny
2. Usuń duplikat (lub zarchiwizuj)
3. Jeśli są różnice - scal ręcznie dane

### Scenariusz D: Brak profili w magazynie

**Rozwiązanie:**
1. Zakładka "Zapotrzebowanie"
2. Zobacz niedobory (czerwone)
3. Magazyn → Złóż zamówienie do dostawcy
4. Lub: Zmień status zlecenia na "Oczekujące na materiały"

---

## FAQ - Zlecenia

**Q: Co oznacza "wariant" zlecenia?**
A: To alternatywna wersja tego samego zlecenia (np. inne kolory okien).

**Q: Dlaczego nie mogę edytować zlecenia?**
A: Zlecenia zarchiwizowane lub dostarczone są tylko do odczytu. Zmień status lub duplikuj.

**Q: Jak cofnąć zmiany w zleceniu?**
A: Historia → Zobacz poprzednie wersje → Przywróć (jeśli dostępne)

**Q: Co to "cena oczekująca"?**
A: Zlecenie zaimportowane bez ceny. Czeka na aktualizację z ceną.

**Q: Czy mogę mieć 2 zlecenia z tym samym numerem?**
A: Nie, numery zleceń muszą być unikalne.

**Q: Jak szybko znaleźć zlecenie?**
A: Ctrl+K → wpisz numer zlecenia lub klienta

---

## Skróty Klawiszowe

| Skrót | Akcja |
|-------|-------|
| `Ctrl + N` | Nowe zlecenie |
| `Ctrl + F` | Szukaj w liście |
| `Ctrl + E` | Edytuj (gdy zlecenie otwarte) |
| `Delete` | Usuń (z potwierdzeniem) |
| `Esc` | Zamknij modal |

---

## Powiązane Przewodniki

- [Dostawy](deliveries.md) - jak przypisywać zlecenia do dostaw
- [Magazyn](warehouse.md) - sprawdzanie dostępności profili
- [Import](imports.md) - importowanie zleceń z PDF

---

**Potrzebujesz pomocy?** Zobacz [FAQ](faq.md) lub [Rozwiązywanie problemów](troubleshooting.md)

---

*Ostatnia aktualizacja: 2025-12-30*
