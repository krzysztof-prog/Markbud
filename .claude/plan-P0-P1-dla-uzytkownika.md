# PROBLEMY AKROBUD - Co to znaczy dla użytkownika

**Data:** 2026-01-09

---

## PODSUMOWANIE

System AKROBUD ma kilka poważnych problemów, które wpływają na codzienną pracę. Poniżej wyjaśniam każdy problem prostym językiem - co się dzieje, dlaczego to ważne i co się zmieni po naprawie.

---

# PROBLEMY KRYTYCZNE (P0) - do naprawy natychmiast

## Problem 1: Dashboard pokazuje złe kwoty

### Co widzisz teraz
Patrzysz na dashboard i widzisz np.:
- "Wartość zleceń w tym miesiącu: **2,400,000 zł**"

### Co jest nie tak
Ta kwota jest **100 razy za duża**. Prawdziwa wartość to **24,000 zł**.

### Dlaczego to się dzieje
System przechowuje kwoty w groszach (np. 2400000 groszy = 24000 zł), ale dashboard wyświetla te grosze jakby to były złotówki.

### Jakie są konsekwencje
- **Błędne raporty finansowe** - eksporty do Excela mają złe liczby
- **Złe decyzje biznesowe** - myślisz że masz 2.4M przychodu, a masz 24k
- **Rozbieżność z księgowością** - twoje dane nie zgadzają się z fakturami

### Co się zmieni po naprawie
Dashboard i raporty będą pokazywać prawidłowe kwoty w złotówkach.

---

## Problem 2: Można "wysłać" dostawę z niezaczętymi zleceniami

### Co możesz teraz zrobić
1. Masz dostawę ze zleceniami które mają status "Nowe" (jeszcze nie w produkcji)
2. Zmieniasz status dostawy na "Wysłana"
3. System to akceptuje bez ostrzeżenia

### Co jest nie tak
Fizycznie nie możesz wysłać czegoś, czego jeszcze nie zrobiłeś. Ale system na to pozwala.

### Jakie są konsekwencje
- **Bałagan w statusach** - dostawa "wysłana" ale zlecenia "nowe"
- **Błędne raporty** - zlecenia liczą się jako "do zrobienia" mimo że dostawa pojechała
- **Chaos w magazynie** - system myśli że materiały są jeszcze potrzebne

### Co się zmieni po naprawie
System będzie pilnował kolejności:
- Dostawa może być "W załadunku" tylko jeśli była "Zaplanowana"
- Dostawa może być "Wysłana" tylko jeśli wszystkie zlecenia są "W produkcji" lub "Zakończone"
- Nie da się przeskoczyć etapów

---

## Problem 3: Import "udany" mimo że część danych zniknęła

### Co widzisz teraz
1. Importujesz CSV z 500 zleceniami
2. System mówi: **"Import zakończony pomyślnie!"**
3. Klikasz OK i idziesz dalej

### Co jest nie tak
W rzeczywistości tylko 350 zleceń się zaimportowało. 150 zostało pominiętych bo np.:
- Kolor w pliku był napisany inaczej niż w systemie
- Profil nie istnieje
- Brakło jakiejś wartości

**Ale system Ci o tym nie powiedział!**

### Jakie są konsekwencje
- **Zaginione zlecenia** - za tydzień odkrywasz że czegoś brakuje
- **Ręczne szukanie** - musisz porównywać CSV z bazą wiersz po wierszu
- **Opóźnienia** - klienci czekają na zlecenia które "zniknęły"

### Co się zmieni po naprawie
Po imporcie zobaczysz jasny komunikat:
- **"Zaimportowano 350 z 500 wierszy"**
- **"150 wierszy pominięto - pobierz raport błędów"**
- Możesz pobrać plik z dokładną listą co i dlaczego się nie zaimportowało

---

# PROBLEMY WAŻNE (P1) - do naprawy w tym tygodniu

## Problem 4: Usunięta dostawa "trzyma" zlecenia

### Co możesz teraz zrobić
1. Usuwasz dostawę #45
2. Zlecenia które były w tej dostawie... są w dziwnym stanie
3. Próbujesz dodać je do nowej dostawy - system mówi "już są przypisane"

### Co jest nie tak
Usunięcie dostawy nie "zwalnia" zleceń. One nadal myślą że są przypisane do dostawy która nie istnieje.

### Jakie są konsekwencje
- **Zlecenia "uwięzione"** - nie możesz ich nigdzie przypisać
- **Ręczna naprawa** - trzeba grzebać w bazie danych

### Co się zmieni po naprawie
Usunięcie dostawy automatycznie "zwolni" wszystkie zlecenia - będą widoczne jako nieprzypisane i gotowe do dodania do innej dostawy.

---

## Problem 5: Ten sam klient w dwóch dostawach

### Co możesz teraz zrobić
1. Masz zlecenie 52335 przypisane do dostawy #45
2. Importujesz poprawioną wersję 52335-a
3. Dodajesz 52335-a do dostawy #48
4. System to akceptuje

### Co jest nie tak
52335 i 52335-a **mogą** być tym samym zamówieniem (korekta), ale **mogą też** być dwoma osobnymi plikami do tego samego klienta (np. druga partia okien). System nie rozróżnia tych przypadków.

### Jakie są konsekwencje gdy to korekta
- **Podwójne zużycie materiałów** - produkcja robi dwa razy to samo
- **Klient dostaje duplikat** - reklamacja
- **Bałagan w magazynie** - stan się nie zgadza

### Co się zmieni po naprawie
Przy imporcie lub dodawaniu wariantu zobaczysz pytanie:
- **"Korekta poprzedniego zlecenia"** - poprawione dane (wymiary, kolory). System zablokuje dodanie do innej dostawy niż oryginał.
- **"Dodatkowy plik do zamówienia"** - osobna partia dla tego samego klienta. System pozwoli na różne dostawy.

Dzięki temu Ty decydujesz jak traktować wariant, a system pilnuje konsekwencji Twojej decyzji.

---

## Problem 6: Przycisk "Usuń" bez ostrzeżenia co stracisz

### Co widzisz teraz
1. Klikasz "Usuń" przy dostawie
2. Pojawia się pytanie: "Czy na pewno usunąć?"
3. Klikasz "Tak"

### Co jest nie tak
Dialog nie mówi **co się stanie**:
- Ile zleceń stanie się nieprzypisanych?
- Czy optymalizacja palet zniknie?
- Czy to na pewno ta dostawa którą chcesz usunąć?

### Jakie są konsekwencje
- **Przypadkowe usunięcia** - kliknąłeś za szybko
- **Utrata pracy** - musiałeś ręcznie optymalizować palety, teraz trzeba od nowa
- **Brak możliwości cofnięcia** - to co usunięte, znikło

### Co się zmieni po naprawie
Dialog powie jasno:
- "Ta dostawa ma **8 zleceń** które staną się nieprzypisane"
- "Optymalizacja palet zostanie usunięta"
- "Data dostawy: 15.01.2026"
- Przycisk "Usuń" będzie czerwony żebyś wiedział że to poważna operacja

---

## Problem 7: Optymalizacja palet nie aktualizuje się

### Co możesz teraz zrobić
1. Masz dostawę z optymalizacją palet (ładnie rozłożone okna)
2. Dodajesz nowe zlecenie do dostawy
3. Patrzysz na wizualizację palet - **nowe okna nie są widoczne**

### Co jest nie tak
Optymalizacja została zrobiona dla "starej" wersji dostawy. Po dodaniu/usunięciu zlecenia powinna się przeliczyć, ale tego nie robi.

### Jakie są konsekwencje
- **Błędny załadunek** - kierowca patrzy na wizualizację która nie odpowiada rzeczywistości
- **Puste miejsca lub przepełnienie** - palety źle rozłożone
- **Ręczne poprawki** - trzeba od nowa uruchomić optymalizację

### Co się zmieni po naprawie
Po każdej zmianie w dostawie (dodanie/usunięcie/zmiana kolejności zleceń):
- Stara optymalizacja zostanie usunięta
- Zobaczysz ostrzeżenie: "Brak optymalizacji palet - uruchom ponownie"
- Przycisk do ponownej optymalizacji

---

# PODSUMOWANIE

## Co zyskasz po naprawach

| Problem | Teraz | Po naprawie |
|---------|-------|-------------|
| Dashboard | Pokazuje x100 za dużo | Prawidłowe kwoty |
| Status dostawy | Można przeskoczyć etapy | Pilnuje kolejności |
| Import | "Sukces" nawet gdy dane zginęły | Jasna informacja co się udało, co nie |
| Usunięcie dostawy | Zlecenia "uwięzione" | Zlecenia automatycznie zwolnione |
| Warianty zleceń | Mogą być w różnych dostawach | System blokuje konflikt |
| Dialog usuwania | "Czy na pewno?" bez szczegółów | Pełna informacja co stracisz |
| Optymalizacja palet | Nieaktualna po zmianach | Automatyczne ostrzeżenie + reset |

## Kiedy to będzie naprawione

| Priorytet | Problemy | Czas |
|-----------|----------|------|
| **Krytyczne (P0)** | Dashboard, statusy, import | 1-2 dni |
| **Ważne (P1)** | Usuwanie, warianty, dialogi, palety | 3-4 dni |

---

## Pytania?

Jeśli coś jest niejasne lub chcesz wiedzieć więcej o konkretnym problemie - pytaj!

