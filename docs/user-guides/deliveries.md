# Dostawy - Przewodnik Użytkownika

Kompletny przewodnik planowania i zarządzania dostawami w systemie AKROBUD.

---

## Co to są Dostawy?

**Dostawa** to transport gotowych okien do klienta. System pomaga:
- Planować daty dostaw
- Przypisywać zlecenia do dostaw
- Optymalizować pakowanie na palety
- Generować protokoły dostawy PDF
- Śledzić status dostawy

---

## Dostęp do Dostaw

**Menu → Dostawy** lub kafelek "Dostawy" na dashboardzie.

### Widoki Dostaw

#### 1. Widok Kalendarza (domyślny)

**Kalendarz miesięczny** pokazuje:
- 📅 Daty dostaw
- 🚚 Liczba dostaw danego dnia
- 🎨 Kolory według statusu

**Kolory:**
- 🔵 Niebieski - Zaplanowana
- 🟡 Żółty - W załadunku
- 🟢 Zielony - Wysłana
- ⚪ Szary - Dostarczona

**Nawigacja:**
- ← → Poprzedni/następny miesiąc
- "Dzisiaj" - powrót do bieżącego miesiąca
- Kliknij datę aby zobaczyć dostawy

#### 2. Widok Listy

Tabela z kolumnami:
- **Data dostawy** - kiedy wysłać
- **Klient** - główny klient (lub wielu)
- **Zlecenia** - liczba przypisanych zleceń
- **Palety** - liczba palet
- **Status** - Zaplanowana / W załadunku / Wysłana / Dostarczona
- **Akcje** - Zobacz / Edytuj / Generuj protokół

---

## Tworzenie Nowej Dostawy

### Sposób 1: Z Kalendarza (Zalecane)

**Krok 1:** Widok kalendarza

**Krok 2:** Kliknij na datę dostawy

**Krok 3:** Kliknij "Nowa dostawa"

**Krok 4:** System pokaże **zlecenia gotowe do dostawy**:
- Status: Zakończone
- Nieprzypisane do innych dostaw
- Możesz filtrować po kliencie

**Krok 5:** Zaznacz zlecenia do tej dostawy

**Krok 6:** (Opcjonalnie) Wprowadź dodatkowe dane:
- **Godzina dostawy** - preferowana godzina
- **Notatki** - uwagi dla kierowcy
- **Kontakt** - telefon do klienta

**Krok 7:** Kliknij "Utwórz dostawę"

**System automatycznie:**
- Przypisze zlecenia do dostawy
- Obliczy liczbę palet (wstępnie)
- Ustawi status "Zaplanowana"

### Sposób 2: Z Listy Zleceń

**Krok 1:** Zlecenia → Zaznacz zlecenia (checkbox)

**Krok 2:** Akcje masowe → "Przypisz do dostawy"

**Krok 3:** Wybierz istniejącą dostawę lub utwórz nową

**Krok 4:** Wybierz datę i potwierdź

---

## Szczegóły Dostawy

Kliknij na dostawę aby zobaczyć szczegóły.

### Zakładki

#### 1. Informacje
- Data i godzina dostawy
- Status dostawy
- Notatki
- Historia zmian

**Akcje:**
- **Edytuj** - zmień datę, notatki
- **Zmień status** - Zaplanowana → W załadunku → Wysłana → Dostarczona
- **Generuj protokół PDF** - dokument dostawy
- **Usuń** - usuń dostawę (tylko zaplanowane)

#### 2. Zlecenia
Lista przypisanych zleceń:
- Numer zlecenia
- Klient
- Liczba okien
- Wartość

**Akcje:**
- **Dodaj zlecenie** - przypisz kolejne
- **Odepnij zlecenie** - usuń z dostawy
- **Zobacz zlecenie** - przejdź do szczegółów

#### 3. Optymalizacja Palet

**Najważniejsza funkcja!** 🎯

System automatycznie pakuje okna na palety.

**Widok:**
- Lista palet (Paleta 1, 2, 3...)
- Okna na każdej palecie
- Wizualizacja 2D rozmieszczenia
- Statystyki wykorzystania przestrzeni

**Jak działa:**
1. System grupuje okna według wymiarów
2. Algorytm bin-packing optymalizuje pakowanie
3. Pokazuje 2D layout każdej palety
4. Maksymalizuje wykorzystanie przestrzeni

**Akcje:**
- **Ponowna optymalizacja** - przeliczy palety
- **Ręczne przepakowanie** - przenieś okna między paletami
- **Eksport PDF** - wydrukuj layout palet

**Przykład wizualizacji palety:**
```
┌─────────────────────────────┐
│  Paleta 1 (1200x1000 mm)    │
├─────────────────────────────┤
│ ┌──────┐  ┌──────┐          │
│ │ Okno │  │ Okno │          │
│ │  1   │  │  2   │          │
│ │800x  │  │800x  │          │
│ │1200  │  │1200  │          │
│ └──────┘  └──────┘          │
│                              │
│ ┌──────┐  ┌──────┐          │
│ │ Okno │  │ Okno │          │
│ │  3   │  │  4   │          │
│ └──────┘  └──────┘          │
└─────────────────────────────┘
Wykorzystanie: 85%
```

#### 4. Protokół Dostawy

Automatycznie generowany dokument PDF zawiera:
- Dane dostawy (data, klient)
- Lista zleceń
- Lista okien z wymiarami
- Layout palet (wizualizacja)
- Miejsce na podpis

**Generowanie:**
1. Zakładka "Protokół"
2. Kliknij "Generuj PDF"
3. Podgląd dokumentu
4. "Pobierz" lub "Drukuj"

---

## Zmiana Statusu Dostawy

### Workflow Statusów

```
📋 Zaplanowana
    ↓
⚙️ W załadunku (pakowanie okien)
    ↓
🚚 Wysłana (w drodze do klienta)
    ↓
✅ Dostarczona (odebrana przez klienta)
```

### Jak zmienić status

**Sposób 1: Z widoku dostawy**
1. Otwórz dostawę
2. Dropdown "Status"
3. Wybierz nowy status
4. Potwierdź

**Sposób 2: Z listy dostaw**
1. Kliknij prawym na dostawę
2. "Zmień status" → wybierz
3. Potwierdź

**Automatyzacja:**
- System może automatycznie zmienić status po określonym czasie
- Powiadomienia o zbliżających się dostawach

---

## Edycja Dostawy

### Zmiana Daty Dostawy

**⚠️ Ważne:** Jeśli dostawa jest zsynchronizowana z kalendarzem Google, zmiana daty zaktualizuje też kalendarz.

1. Otwórz dostawę
2. Kliknij "Edytuj"
3. Wybierz nową datę
4. Zapisz

**System pyta:**
- Czy zaktualizować event w Google Calendar?
- Czy powiadomić klienta o zmianie?

### Dodawanie/Usuwanie Zleceń

**Dodawanie:**
1. Zakładka "Zlecenia"
2. Kliknij "Dodaj zlecenie"
3. Wybierz z listy dostępnych
4. Potwierdź

**Usuwanie:**
1. Zakładka "Zlecenia"
2. Kliknij "Odepnij" przy zleceniu
3. Potwierdź

**System automatycznie przeliczy palety!**

---

## Optymalizacja Palet - Szczegóły

### Algorytm Pakowania

System używa zaawansowanego algorytmu **bin-packing**:

1. **Grupowanie** - okna podobnych wymiarów razem
2. **Sortowanie** - największe okna najpierw
3. **Pakowanie** - optymalne rozmieszczenie 2D
4. **Wizualizacja** - graficzne przedstawienie

### Parametry Palety

**Domyślne wymiary palety:**
- Szerokość: 1200 mm
- Długość: 1000 mm
- Wysokość: 1800 mm (max stack)

**Możesz zmienić:**
Ustawienia → Optymalizacja palet → Wymiary standardowe

### Ręczne Przepakowanie

**Kiedy używać:**
- Algorytm nie optymalnie spakował
- Masz specyficzne wymagania
- Chcesz pogrupować zlecenia tego samego klienta

**Jak:**
1. Zakładka "Optymalizacja palet"
2. Włącz "Tryb ręczny"
3. Przeciągnij okna między paletami (drag & drop)
4. Zapisz układ

### Export Layoutu Palet PDF

**Co zawiera:**
- Wizualizacja każdej palety (widok z góry)
- Wymiary okien
- Numeracja okien
- Kody QR (opcjonalnie)

**Jak wygenerować:**
1. Zakładka "Optymalizacja palet"
2. Kliknij "Eksportuj PDF"
3. Wybierz opcje:
   - [ ] Z kodami QR
   - [ ] Kolorowe / Czarno-białe
   - [ ] Z wymiarami
4. Generuj

---

## Kalendarz Dostaw

### Widok Kalendarza

**Funkcje:**
- Zobacz wszystkie dostawy w miesiącu
- Kliknij datę → zobacz dostawy danego dnia
- Filtruj po statusie
- Eksportuj do PDF/Excel

### Integracja z Google Calendar

**Setup:**
1. Ustawienia → Integracje → Google Calendar
2. Połącz konto Google
3. Wybierz kalendarz docelowy

**Automatyczna synchronizacja:**
- ✅ Nowa dostawa → event w kalendarzu
- ✅ Zmiana daty → aktualizacja eventu
- ✅ Usunięcie dostawy → usunięcie eventu

**W evencie kalendarza:**
- Tytuł: "Dostawa - [Klient]"
- Opis: Lista zleceń
- Przypomnienie: 1 dzień wcześniej

---

## Protokoły Dostawy PDF

### Generowanie Protokołu

**Krok 1:** Otwórz dostawę

**Krok 2:** Zakładka "Protokół"

**Krok 3:** Kliknij "Generuj protokół PDF"

**Krok 4:** Podgląd - sprawdź czy wszystko OK

**Krok 5:** "Pobierz" lub "Drukuj"

### Zawartość Protokołu

1. **Nagłówek:**
   - Logo firmy
   - Tytuł: "Protokół Dostawy"
   - Numer dostawy, data

2. **Dane Dostawy:**
   - Klient
   - Adres dostawy
   - Data i godzina
   - Osoba kontaktowa

3. **Zlecenia:**
   - Tabela: Nr zlecenia, Opis, Liczba okien, Wartość

4. **Okna:**
   - Szczegółowa lista wszystkich okien
   - Pozycja, Wymiary, Rodzaj, Kolor

5. **Palety:**
   - Wizualizacja każdej palety
   - Rozmieszczenie okien
   - Numeracja

6. **Podsumowanie:**
   - Suma: Zlecenia, Okna, Palety
   - Wartość całkowita

7. **Podpisy:**
   - Kierowca: _______________
   - Klient: _______________
   - Data odbioru: _______________

### Personalizacja Protokołu

Ustawienia → Protokoły → Szablon:
- Logo firmy
- Dane kontaktowe
- Stopka
- Dodatkowe informacje

---

## Typowe Scenariusze

### Scenariusz A: Planuję dostawy na tydzień

**Rozwiązanie:**
1. Widok kalendarza → Zobacz cały tydzień
2. Dla każdego dnia:
   - Kliknij datę
   - "Nowa dostawa"
   - Przypisz zlecenia gotowe na ten dzień
3. Wygeneruj protokoły dla wszystkich dostaw
4. Wydrukuj i daj kierowcom

### Scenariusz B: Klient prosi o zmianę daty

**Rozwiązanie:**
1. Znajdź dostawę (Ctrl+K → nr zlecenia klienta)
2. Kliknij "Edytuj"
3. Zmień datę
4. System zapyta o aktualizację Google Calendar → Tak
5. Zapisz
6. System wyśle powiadomienie (jeśli skonfigurowane)

### Scenariusz C: Okna nie mieszczą się na paletach

**Rozwiązanie:**
1. Zakładka "Optymalizacja palet"
2. Jeśli algorytm źle spakował:
   - Kliknij "Ponowna optymalizacja"
   - Lub: Włącz tryb ręczny i przepakuj
3. Jeśli naprawdę za dużo okien:
   - Odepnij część zleceń
   - Utwórz drugą dostawę na inny dzień

### Scenariusz D: Muszę pilnie dodać zlecenie do jutrzejszej dostawy

**Rozwiązanie:**
1. Znajdź jutrzejszą dostawę
2. Sprawdź status - jeśli "Zaplanowana" można edytować
3. Zakładka "Zlecenia" → "Dodaj zlecenie"
4. Wybierz zlecenie
5. System przeliczy palety automatycznie
6. Wygeneruj nowy protokół (stary jest nieaktualny)

### Scenariusz E: Dostawa została dostarczona

**Rozwiązanie:**
1. Znajdź dostawę
2. Zmień status na "Dostarczona"
3. System:
   - Zaktualizuje statusy zleceń na "Dostarczone"
   - Oznaczy jako zakończone
   - Przeniesie do archiwum (opcjonalnie)

---

## Filtrowanie i Wyszukiwanie

### Filtry Dostaw

**W widoku listy:**
- **Status** - Zaplanowana / W załadunku / Wysłana / Dostarczona
- **Okres** - Dzisiaj / Ten tydzień / Ten miesiąc / Zakres dat
- **Klient** - Wybierz z listy
- **Liczba zleceń** - Min/Max

### Szybkie Wyszukiwanie

**Ctrl + K → wpisz:**
- Numer zlecenia (system znajdzie dostawę)
- Nazwę klienta
- Datę (np. "2025-01-15")

---

## Raporty Dostaw

### Raport Miesięczny Dostaw

1. Zestawienia → Raporty miesięczne
2. Wybierz miesiąc
3. Typ: "Dostawy"
4. Generuj PDF

**Zawiera:**
- Liczba dostaw w miesiącu
- Liczba zleceń dostarczonych
- Wartość dostaw
- Wykres dostaw według dni
- Top klienci

### Export Listy Dostaw

1. Widok listy → Ustaw filtry
2. Kliknij "Eksportuj"
3. Format: Excel / CSV / PDF
4. Pobierz plik

---

## FAQ - Dostawy

**Q: Co się stanie jeśli usunę dostawę?**
A: Przypisane zlecenia zostaną odpięte i wrócą do puli "gotowych do dostawy". Status zleceń się nie zmieni.

**Q: Czy mogę mieć 2 dostawy tego samego dnia?**
A: Tak, możesz planować wiele dostaw jednego dnia.

**Q: Jak cofnąć status dostawy?**
A: Możesz zmienić status wstecz (np. Wysłana → W załadunku), ale nie jest to zalecane. Lepiej dodać notatkę o problemie.

**Q: Co jeśli klient nie odbierze dostawy?**
A: Zmień status z powrotem na "Wysłana" i dodaj notatkę. Zaplanuj ponowną dostawę.

**Q: Czy protokół PDF można edytować?**
A: Nie, to finalny dokument. Jeśli trzeba zmienić - edytuj dostawę i wygeneruj nowy protokół.

**Q: Optymalizacja palet nie działa - co robić?**
A: Sprawdź czy okna mają poprawne wymiary w zleceniach. Jeśli tak - użyj trybu ręcznego.

---

## Skróty Klawiszowe

| Skrót | Akcja |
|-------|-------|
| `Ctrl + N` | Nowa dostawa |
| `Ctrl + P` | Generuj protokół (gdy dostawa otwarta) |
| `Ctrl + O` | Optymalizuj palety |
| `←` `→` | Poprzedni/następny miesiąc (kalendarz) |
| `Esc` | Zamknij modal |

---

## Powiązane Przewodniki

- [Zlecenia](orders.md) - zarządzanie zleceniami
- [Magazyn](warehouse.md) - sprawdzanie dostępności przed dostawą
- [Raporty](reports.md) - raporty dostaw

---

**Potrzebujesz pomocy?** Zobacz [FAQ](faq.md) lub [Rozwiązywanie problemów](troubleshooting.md)

---

*Ostatnia aktualizacja: 2025-12-30*
