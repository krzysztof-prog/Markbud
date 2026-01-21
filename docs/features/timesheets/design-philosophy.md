# Timesheets - Filozofia Projektowa

## Przegląd

**Modul:** Godzinowki (Panel Kierownika)
**Wersja:** 1.1
**Data:** 2026-01-12

---

## Decyzje Wdrożeniowe (v1.1)

### Uproszczenia na start:
- **Brak "zamykania dnia"** - tylko statusy: pusty / częściowy / kompletny
- **CLOSED** - zarezerwowane na przyszły etap (patrz sekcja Stany i przepływy)

### Strategia wdrożenia backend:
1. **FAZA 1:** TimeEntry + NonProductiveTask (podstawowa funkcjonalność)
2. **FAZA 2:** SpecialWork (nietypówki)

### Nietypówki:
> "Nietypówki są rejestrowane do przyszłej analizy wydajności."
> Pełna analityka wydajności nietypówek = osobny etap rozwoju.

---

## Oś systemu

```
CZAS → CZŁOWIEK → STRUKTURA PRACY → EFEKT
```

**Jednostka danych:** Jeden dzień pracy jednego pracownika

---

## Zasada 90/10

90% pracowników ma "standardowy dzień produkcyjny" - kierownik NIE powinien ich dotykać.
10% to wyjątki - kierownik skupia się TYLKO na wyjątkach.

**Konsekwencja UX:**
- Domyślność musi być możliwa jednym kliknięciem
- Wyjątki muszą być widoczne na pierwszy rzut oka
- Edycja pojedynczego pracownika NIE wymaga opuszczania widoku dnia

---

## Oddzielenie warstw czasu pracy

| Warstwa | Co zawiera | Dlaczego osobno |
|---------|------------|-----------------|
| **Czas produkcyjny** | Godziny pracy przy oknach | Wpływa na wskaźnik wydajności |
| **Czas nieprodukcyjny** | Pakowanie, profile, palety, serwis | NIE wpływa na wydajność |
| **Czas nietypówek** | Drzwi, HS, PSK, szprosy, trapez | Osobny wskaźnik wydajności |

**Dlaczego?** Jeśli pracownik spędził 4h na paletach, nie można go karać za niższą wydajność okien.

---

## Uzasadnienia decyzji UX

### Dlaczego domyślność + wyjątki?

**Problem:** Kierownik ma 12-15 pracowników. Wpisywanie danych dla każdego CODZIENNIE to 15 × 250 dni roboczych = **3750 operacji rocznie**.

**Rozwiązanie:**
- "Ustaw standard" = 1 klik dla 90% przypadków
- Kierownik dotyka TYLKO wyjątki (10%)
- **Efekt:** ~400 operacji zamiast 3750

### Dlaczego panel boczny (nie nowa strona)?

**Problem:** Przeskakiwanie między stronami przy edycji pojedynczych pracowników:
- Tracisz kontekst listy
- Musisz klikać "Wróć"
- Nie widzisz jak wygląda dzień globalnie

**Rozwiązanie:**
- Panel boczny = edycja bez opuszczania widoku dnia
- Lista cały czas widoczna (choć węższa)
- Zmiana pracownika = jedno kliknięcie na liście

### Dlaczego rozdział: produkcyjne / nieprodukcyjne / nietypowe?

**Problem biznesowy:** Wydajność = jednostki / godzina.

Ale:
- Jeśli pracownik spędził 4h na paletach → jego wydajność okien NIE może być liczona z 8h
- Jeśli robił drzwi (nietypówka) → standardowa wydajność też nie ma sensu

**Rozwiązanie (v1 - uproszczone):**
```
Wydajność standard = jednostki / godziny_produkcyjne
Godziny nieprodukcyjne = NIE wliczane do wskaźnika wydajności
Nietypówki = rejestrowane do przyszłej analizy (FAZA 2)
```

> **Uwaga:** Pełna analityka wydajności nietypówek = osobny etap rozwoju.

### Dlaczego kalendarz miesięczny jako punkt wejścia?

**Problem:** Godzinówki dotyczą KONKRETNYCH DNI. Bez kontekstu kalendarza:
- Nie wiesz które dni już uzupełnione
- Nie wiesz gdzie są luki
- Nie widzisz wzorców (np. piątki zawsze mniej godzin)

**Rozwiązanie:** Kalendarz daje:
- Przegląd całego miesiąca
- Wizualne oznaczenie statusów
- Łatwa nawigacja do dowolnego dnia

### Dlaczego brak limitów godzin?

**Problem:** Produkcja jest NIEREGULARNA. Ludzie pracują:
- 6h (krótszy dzień)
- 8h (standard)
- 10-12h (nadgodziny, sezon)

**Rozwiązanie:** System NIE wymusza norm:
- Można wpisać dowolną liczbę godzin
- Suma może przekroczyć 8h
- To jest RZECZYWISTOŚĆ, nie ideał

### Dlaczego wiele zadań nieprodukcyjnych / nietypówek na dzień?

**Problem:** Jeden pracownik jednego dnia może:
- 2h pakować
- 1h serwis
- 4h produkcja standardowa
- 1h drzwi (nietypówka)

**Rozwiązanie:**
- Każda sekcja może mieć WIELE wpisów
- Każdy wpis = typ + godziny
- UI umożliwia dodawanie/usuwanie dynamicznie

---

## Podsumowanie kluczowych decyzji

| Decyzja | Uzasadnienie |
|---------|--------------|
| Kalendarz jako punkt wejścia | Kontekst czasowy, widoczność statusów |
| "Ustaw standard" jednym klikiem | 90% pracowników = standard |
| Panel boczny (nie nowa strona) | Szybkość edycji, zachowanie kontekstu |
| Trzy typy godzin | Różne wpływy na wskaźniki wydajności |
| Brak limitów godzin | Realistyczna produkcja, nie idealna |
| Wiele zadań na dzień | Rzeczywistość pracy produkcyjnej |
| Soft delete w słownikach | Zachowanie historii danych |
| Statusy wizualne (✓ ⚠ ○) | Szybka identyfikacja wyjątków |

---

## Zobacz też

- [Ekran kalendarza](screens-calendar.md)
- [Ekran widoku dnia](screens-day-view.md)
- [Panel edycji pracownika](screens-worker-panel.md)
- [Model danych](data-model.md)
- [Implementacja](implementation.md)
