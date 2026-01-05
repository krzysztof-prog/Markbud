# Magazyn - Przewodnik Użytkownika

Kompletny przewodnik zarządzania magazynem profili aluminiowych w systemie AKROBUD.

---

## Co to jest Magazyn?

**Magazyn** to moduł zarządzania stanem profili aluminiowych. System śledzi:
- Stan magazynowy (ile mamy każdego profilu w każdym kolorze)
- Zapotrzebowanie (ile potrzeba na zlecenia)
- Niedobory (czego brakuje)
- Historię operacji (co się działo)
- Zamówienia do dostawcy (Schuco)

---

## Dostęp do Magazynu

**Menu → Magazyn** lub kafelek "Magazyn" na dashboardzie.

### Magazyny w Systemie

System może zarządzać wieloma magazynami:

- **🏭 Magazyn AKROBUD** - główny magazyn profili
- **🏢 Magazyn Schuco** - profile zamówione od Schuco (oczekujące)
- **🚚 W drodze** - profile w transporcie

**Wybierz magazyn:** Dropdown w górnym pasku

---

## Widok Magazynu AKROBUD

### Tabela Stanu Magazynowego

Główna tabela pokazuje profile:

| Kolumna | Opis |
|---------|------|
| **Profil** | Nazwa profilu (np. "Profile 65mm") |
| **Artykuł** | Kod artykułu |
| **Kolor** | Kolor profilu |
| **Stan** | Aktualna ilość (mm) |
| **Zapotrzebowanie** | Ile potrzeba na zlecenia (mm) |
| **Niedobór** | Ile brakuje (mm) - CZERWONE |
| **Dostępne** | Ile można jeszcze użyć (mm) |
| **Jednostka** | mm / szt / kg |
| **Akcje** | Edytuj / Historia / Zamów |

### Kolory i Oznaczenia

**Niedobory (kolumna "Niedobór"):**
- 🔴 **Czerwony** - niedobór > 1000mm - PILNE
- 🟡 **Żółty** - niedobór 0-1000mm - do monitorowania
- 🟢 **Zielony** - brak niedoboru - OK

**Stan magazynowy:**
- 🟢 Stan > Zapotrzebowanie - OK
- 🟡 Stan ≈ Zapotrzebowanie - na wyczerpaniu
- 🔴 Stan < Zapotrzebowanie - niedobór!

---

## Filtrowanie i Wyszukiwanie

### Filtry

**Filtry dostępne:**
- **Tylko niedobory** - pokaż tylko profile z niedoborem
- **Kolor** - wybierz konkretny kolor
- **Grupa profili** - np. "Profile 65mm", "Profile 85mm"
- **Głębokość** - filtruj po głębokości profilu
- **Dostawca** - Schuco / Inny

### Wyszukiwanie

**Szukaj po:**
- Nazwa profilu (np. "65mm")
- Artykuł (np. "A12345")
- Kolor (np. "RAL 9016")

**Ctrl + K** → Szybkie wyszukiwanie

### Sortowanie

Kliknij nagłówek kolumny:
- **Stan** - od najmniejszego/największego
- **Niedobór** - najpilniejsze pierwsze
- **Zapotrzebowanie** - najwięcej potrzebne

---

## Operacje Magazynowe

### 1. Korekta Stanu (Manual Adjustment)

**Kiedy używać:**
- Inwentaryzacja - znalazłeś różnicę
- Korekta błędu
- Uszkodzenie materiału

**Jak:**
1. Znajdź profil w tabeli
2. Kliknij "Edytuj" (ikona ołówka)
3. Wpisz **nowy stan** (nie różnicę!)
4. Podaj **powód** korekty
5. Zapisz

**Przykład:**
```
Stan aktualny: 5000 mm
Znalazłeś przy inwentaryzacji: 4800 mm
Wpisz: 4800 mm
Powód: "Inwentaryzacja - uszkodzony profil"
```

**System zapisze:**
- Nowy stan: 4800 mm
- Operacja: -200 mm
- Historia: Korekta, powód, data, użytkownik

### 2. Przyjęcie Dostawy od Dostawcy

**Kiedy używać:**
- Przyszła dostawa od Schuco
- Dostawa od innego dostawcy

**Jak:**
1. Magazyn → "Przyjmij dostawę"
2. Wybierz dostawcę: Schuco / Inny
3. Wprowadź pozycje:
   - Profil, Kolor
   - Ilość (mm)
   - Numer dokumentu WZ
   - Data dostawy
4. Kliknij "Przyjmij"

**System automatycznie:**
- Zwiększy stan magazynowy
- Zapisze w historii
- Zaktualizuje niedobory
- Oznaczy zamówienie Schuco jako "Dostarczone" (jeśli było)

### 3. Zużycie na Zlecenie (Order Consumption)

**Automatyczne!**

System automatycznie zmniejsza stan gdy:
- Zlecenie zmienia status na "W produkcji"
- Operator potwierdza zużycie materiału

**Ręczne zużycie:**
1. Magazyn → Profil → "Zużycie"
2. Wybierz zlecenie
3. Wpisz rzeczywiste zużycie (może różnić się od zapotrzebowania)
4. Zapisz

### 4. Transfer Między Magazynami

**Kiedy używać:**
- Przenosisz profile między lokalizacjami
- Oddajesz materiał do innego działu

**Jak:**
1. Magazyn źródłowy → Profil → "Transfer"
2. Wybierz magazyn docelowy
3. Wpisz ilość
4. Potwierdź

**System:**
- Zmniejszy stan w źródle
- Zwiększy stan w celu
- Zapisze operację transferu

---

## Zamówienia do Dostawcy (Schuco)

### Automatyczne Zamówienia

**System pomaga zamawiać:**
1. Magazyn → "Niedobory"
2. Zobacz listę profili z niedoborem
3. Kliknij "Utwórz zamówienie do Schuco"
4. System automatycznie:
   - Zgrupuje profile
   - Obliczy ilości z buforem (+10%)
   - Utworzy listę zamówienia

### Integracja z Schuco Connect

**Automatyczne pobieranie statusu:**
1. System łączy się ze Schuco Connect
2. Pobiera status zamówień
3. Aktualizuje w systemie:
   - Zamówione
   - W produkcji u Schuco
   - Wysłane
   - Oczekiwane (data dostawy)

**Ręczna synchronizacja:**
Magazyn → Schuco → "Synchronizuj teraz"

### Śledzenie Zamówień

**Magazyn Schuco (osobny widok):**
- Lista zamówionych profili
- Status każdego zamówienia
- Przewidywana data dostawy
- Możliwość anulowania (jeśli możliwe)

---

## Historia Operacji

### Widok Historii

**Dla konkretnego profilu:**
1. Magazyn → Profil → "Historia"
2. Zobacz wszystkie operacje:
   - Data i godzina
   - Typ operacji (Korekta / Dostawa / Zużycie / Transfer)
   - Ilość (+/-)
   - Stan przed / po
   - Użytkownik
   - Powód / Notatka

**Dla całego magazynu:**
1. Magazyn → "Historia operacji"
2. Filtruj:
   - Okres (dzisiaj / tydzień / miesiąc)
   - Typ operacji
   - Użytkownik
   - Profil

**Export historii:**
- Kliknij "Eksportuj"
- Format: Excel / CSV / PDF
- Do audytu, raportów

---

## Remanent Miesięczny

**Co to jest remanent?**
Regularne (miesięczne) spisywanie stanu magazynu.

### Proces Remanentu

**Krok 1: Rozpoczęcie**
1. Magazyn → "Remanent"
2. Kliknij "Rozpocznij remanent"
3. System:
   - Zapisuje aktualny stan jako "stan przed"
   - Blokuje operacje magazynowe (opcjonalnie)
   - Tworzy arkusz remanentu

**Krok 2: Liczenie**
1. Wydrukuj arkusz remanentu (lista profili)
2. Fizycznie policz profile w magazynie
3. Wpisz rzeczywiste stany w system:
   - Magazyn → Remanent → "Wprowadź stan"
   - Profil po profilu

**Krok 3: Porównanie**
System pokaże różnice:
- Kolumna "Stan systemowy" - co pokazuje system
- Kolumna "Stan rzeczywisty" - co naliczono
- Kolumna "Różnica" - rozbieżności (🔴 czerwone)

**Krok 4: Korekty**
Dla każdej różnicy:
1. Sprawdź przyczynę (błąd systemu? kradzież? uszkodzenie?)
2. Wpisz powód różnicy
3. Zatwierdź korektę

**Krok 5: Zamknięcie**
1. Kliknij "Zakończ remanent"
2. System:
   - Zapisze wszystkie korekty
   - Wygeneruje raport PDF
   - Odblokuje magazyn
   - Archiwizuje remanent

### Raporty Remanentu

**Raport zawiera:**
- Data remanentu
- Stan przed / po
- Wszystkie korekty
- Suma różnic
- Wartość różnic (PLN)
- Podpisy: Magazynier, Kierownik

**Archiwum:**
Magazyn → Remanent → "Historia remanentu"
- Zobacz poprzednie remanentu
- Porównaj z aktualnymi

---

## Statystyki i Raporty

### Widok Statystyk

Magazyn → "Statystyki"

**Wykresy:**
1. **Stan magazynu** - wartość w PLN w czasie
2. **Top 10 profili** - najbardziej używane
3. **Niedobory** - trend niedoborów
4. **Obroty** - szybkość rotacji profili

**Wskaźniki:**
- Wartość magazynu (PLN)
- Liczba pozycji
- Liczba niedoborów
- % zapełnienia magazynu

### Raporty Magazynowe

**Dostępne raporty:**

1. **Raport stanu magazynu**
   - Pełna lista profili
   - Stan, zapotrzebowanie, niedobory
   - Export: Excel / PDF

2. **Raport niedoborów**
   - Tylko profile z niedoborem
   - Sortowane po pilności
   - Gotowe do zamówienia

3. **Raport rotacji**
   - Które profile szybko się zużywają
   - Które leżą bez ruchu
   - Optymalizacja zamówień

4. **Raport wartości**
   - Wartość magazynu (PLN)
   - Wartość według kolorów
   - Wartość według grup profili

**Generowanie:**
1. Magazyn → Raporty
2. Wybierz typ raportu
3. Ustaw parametry (okres, filtry)
4. Generuj PDF / Excel

---

## Typowe Scenariusze

### Scenariusz A: Przyszła dostawa od Schuco

**Rozwiązanie:**
1. Magazyn → "Przyjmij dostawę"
2. Wybierz "Schuco"
3. System pokaże oczekiwane zamówienia
4. Zaznacz które przyjmujesz
5. Potwierdź ilości (sprawdź z WZ)
6. Kliknij "Przyjmij"
7. System zaktualizuje stany automatycznie

### Scenariusz B: Niedobór profilu - muszę pilnie zamówić

**Rozwiązanie:**
1. Magazyn → Filtry → "Tylko niedobory"
2. Zobacz listę (sortuj po niedoborze - największe pierwsze)
3. Zaznacz profile do zamówienia (checkbox)
4. Kliknij "Utwórz zamówienie Schuco"
5. System wygeneruje listę
6. Potwierdź i wyślij do Schuco

### Scenariusz C: Inwentaryzacja - znalazłem różnicę

**Rozwiązanie:**
1. Magazyn → Znajdź profil
2. Kliknij "Edytuj"
3. Wpisz rzeczywisty stan (nie różnicę!)
4. Powód: "Inwentaryzacja - [opisz co się stało]"
5. Zapisz
6. System zapisze korektę w historii

### Scenariusz D: Chcę zobaczyć historię konkretnego profilu

**Rozwiązanie:**
1. Magazyn → Znajdź profil
2. Kliknij "Historia" (ikona zegara)
3. Zobacz wszystkie operacje:
   - Kto, kiedy, ile, dlaczego
4. Możesz eksportować do Excel

### Scenariusz E: Remanent miesięczny

**Rozwiązanie:**
1. Koniec miesiąca → Magazyn → "Remanent"
2. "Rozpocznij remanent"
3. Wydrukuj arkusz
4. Policz profile fizycznie
5. Wprowadź stany do systemu
6. Sprawdź różnice
7. Zatwierdź korekty
8. "Zakończ remanent"
9. Wygeneruj raport PDF
10. Archiwum

---

## Optymalizacja Magazynu

### Minimalne Stany Magazynowe

**Setup:**
1. Magazyn → Profil → "Ustawienia"
2. Wpisz "Minimalny stan" (mm)
3. Zapisz

**System będzie:**
- Ostrzegać gdy stan < minimum
- Automatycznie sugerować zamówienia
- Pokazywać alert na dashboardzie

### Automatyczne Zamówienia

**Konfiguracja:**
1. Ustawienia → Magazyn → "Automatyczne zamówienia"
2. Włącz: "Auto-generuj zamówienia gdy niedobór"
3. Ustaw parametry:
   - Bufor bezpieczeństwa (+10%, +20%)
   - Częstotliwość sprawdzania (codziennie / co tydzień)
   - Email powiadomienia

**System będzie:**
- Codziennie sprawdzać niedobory
- Generować propozycje zamówień
- Wysyłać email do magazyniera
- Czekać na zatwierdzenie

### ABC Analysis

**Klasyfikacja profili:**
- **A (20%)** - najbardziej używane, zawsze w magazynie
- **B (30%)** - średnio używane, zamawiane regularnie
- **C (50%)** - rzadko używane, zamawiane na zamówienie

Magazyn → "Analiza ABC" → Zobacz klasyfikację

**Korzyści:**
- Skupiasz się na profil ach A
- Optymalizujesz zapasy
- Oszczędzasz miejsce i pieniądze

---

## FAQ - Magazyn

**Q: Co oznacza ujemny stan magazynu?**
A: Błąd! Najprawdopodobniej zużyto więcej niż było. Wykonaj korektę stanu + zbadaj przyczynę.

**Q: Dlaczego zapotrzebowanie się nie zgadza?**
A: Zapotrzebowanie to suma z wszystkich aktywnych zleceń. Sprawdź statusy zleceń.

**Q: Czy mogę usunąć profil z magazynu?**
A: Nie, jeśli ma historię operacji. Możesz ustawić stan na 0 i oznaczyć jako "nieaktywny".

**Q: Co to "wersja" przy profilu?**
A: Optimistic locking - zapobiega konfliktom gdy 2 osoby edytują jednocześnie. System automatycznie zarządza.

**Q: Jak często robić remanent?**
A: Zalecane: raz w miesiącu. Minimum: raz na kwartał.

**Q: Czy mogę cofnąć operację magazynową?**
A: Nie można usunąć historii. Ale możesz wykonać operację odwrotną (np. korekta w drugą stronę).

---

## Skróty Klawiszowe

| Skrót | Akcja |
|-------|-------|
| `Ctrl + F` | Szukaj profilu |
| `Ctrl + N` | Nowa operacja |
| `Ctrl + R` | Odśwież dane |
| `Alt + N` | Tylko niedobory (toggle filter) |
| `Esc` | Zamknij modal |

---

## Powiązane Przewodniki

- [Zlecenia](orders.md) - zapotrzebowanie pochodzi ze zleceń
- [Dostawy](deliveries.md) - sprawdzanie dostępności przed dostawą
- [Import](imports.md) - importowanie stanów z plików

---

**Potrzebujesz pomocy?** Zobacz [FAQ](faq.md) lub [Rozwiązywanie problemów](troubleshooting.md)

---

*Ostatnia aktualizacja: 2025-12-30*
