# Import Plików - Przewodnik Użytkownika

Kompletny przewodnik importowania danych z plików CSV i PDF do systemu AKROBUD.

---

## Co Można Importować?

System obsługuje import:

| Typ danych | Format pliku | Gdzie importować |
|------------|--------------|------------------|
| **Zlecenia** | PDF | Zlecenia → Import z PDF |
| **Dostawy profili** | CSV | Magazyn → Import CSV |
| **Zamówienia szyb** | PDF | Szyby → Import PDF |
| **Dostawy szyb** | PDF | Szyby → Dostawy → Import PDF |
| **Stany magazynowe** | CSV | Magazyn → Import stanu |

---

## Import Zleceń z PDF

### Obsługiwane Formaty PDF

System rozpoznaje PDF od:
- **Schuco** - zlecenia produkcyjne
- **Inne systemy** - z ustaloną strukturą

### Proces Importu

**Krok 1:** Zlecenia → "Nowe zlecenie" → "Import z PDF"

**Krok 2:** Wybierz plik

**Przeciągnij i upuść** lub kliknij "Wybierz plik PDF"

**Krok 3:** System analizuje PDF

Zobaczy sz pasek postępu:
```
🔄 Analizowanie PDF...
📄 Rozpoznawanie tekstu...
🔍 Wyodrębnianie danych...
✅ Gotowe!
```

**Krok 4:** Podgląd zaimportowanych danych

System pokaże:
- **Dane zlecenia** - numer, klient, data
- **Lista okien** - pozycje, wymiary, rodzaje
- **Profile** - potrzebne profile i kolory
- **Cena** - jeśli dostępna w PDF

**Kolory statusów:**
- 🟢 Zielony - dane rozpoznane poprawnie
- 🟡 Żółty - dane niepewne, sprawdź
- 🔴 Czerwony - brak danych, wypełnij ręcznie

**Krok 5:** Weryfikacja i korekta

Sprawdź każde pole:
- Kliknij pole aby edytować
- Popraw błędy
- Uzupełnij brakujące dane

**Krok 6:** Obsługa wariantów (jeśli są)

Jeśli PDF zawiera warianty:
1. System pokaże modal "Warianty zlecenia"
2. Zobacz wszystkie warianty (różne kolory/profile)
3. Zaznacz preferowane
4. Możesz:
   - Zaakceptować wszystkie
   - Wybrać tylko niektóre
   - Zaznaczyć domyślny wariant

**Krok 7:** Cena oczekująca (jeśli brak ceny)

Jeśli PDF nie zawiera ceny:
- System zaznaczy "Oczekuje na cenę"
- Możesz:
  - Wpisać cenę ręcznie teraz
  - Lub zaimportować ponownie PDF z ceną później
  - Lub pozostawić jako "Pending" - auto-expire po 30 dniach

**Krok 8:** Utwórz zlecenie

Kliknij "Akceptuj i utwórz zlecenie"

System:
- Utworzy zlecenie w bazie
- Obliczy zapotrzebowanie na profile
- Pokaże potwierdzenie
- Otworzy szczegóły zlecenia

### Częste Problemy przy Imporcie PDF

#### Problem: "Nie rozpoznano numeru zlecenia"

**Przyczyna:** PDF ma niestandardowy format

**Rozwiązanie:**
1. Wpisz numer zlecenia ręcznie
2. Kontynuuj import reszty danych

#### Problem: "Duplikat - zlecenie już istnieje"

**Przyczyna:** Importujesz ponownie to samo zlecenie

**Rozwiązanie:**
- Jeśli chcesz zaktualizować (np. dodać cenę) → Kontynuuj
- Jeśli to pomyłka → Anuluj

#### Problem: "Wymiary okien niezgodne"

**Przyczyna:** OCR źle odczytał cyfry

**Rozwiązanie:**
1. Sprawdź w oryginalnym PDF
2. Popraw ręcznie wymiary
3. Zapisz

---

## Import Dostaw Profili (CSV)

### Format Pliku CSV

**Wymagane kolumny:**
```csv
Profil,Kolor,Ilość,Jednostka,Dokument,Data
Profile 65mm,RAL 9016,5000,mm,WZ-12345,2025-01-15
Profile 85mm,RAL 7016,3000,mm,WZ-12345,2025-01-15
```

**Opcjonalne kolumny:**
- `Dostawca` - nazwa dostawcy
- `Uwagi` - notatki
- `Cena` - cena jednostkowa

### Proces Importu

**Krok 1:** Magazyn → "Import CSV"

**Krok 2:** Wybierz typ importu: "Dostawa profili"

**Krok 3:** Przeciągnij plik CSV

**Krok 4:** Mapowanie kolumn

System automatycznie wykrywa kolumny.

Jeśli trzeba - zmapuj ręcznie:
```
Kolumna CSV          →  Pole systemu
"Profile Name"       →  Profil
"Color Code"         →  Kolor
"Quantity (mm)"      →  Ilość
```

**Krok 5:** Walidacja danych

System sprawdza:
- ✅ Czy profile istnieją w systemie
- ✅ Czy kolory istnieją
- ✅ Czy ilości są liczbami
- ✅ Czy daty są poprawne

**Błędy:**
🔴 Wiersz 3: Profil "XYZ" nie istnieje → Pomiń lub dodaj ręcznie

**Krok 6:** Podgląd

Zobaczysz tabelę:
- Ile wierszy zostanie zaimportowanych
- Które pominięte (błędy)
- Całkowita ilość do przyjęcia

**Krok 7:** Import

Kliknij "Importuj dostawę"

System:
- Zwiększy stany magazynowe
- Zapisze w historii
- Zaktualizuje niedobory
- Pokaże podsumowanie

---

## Import Zamówień Szyb (PDF)

### Obsługiwane Formaty

- **Pilkington** - standardowy format
- **Guardian** - standardowy format
- **Inne** - z konfiguracją

### Proces Importu

**Krok 1:** Szyby → Zamówienia → "Import z PDF"

**Krok 2:** Wybierz plik PDF

**Krok 3:** System rozpoznaje:
- Numer zamówienia
- Pozycje szyb (wymiary, typ)
- Ilości
- Ceny
- Termin dostawy

**Krok 4:** Weryfikacja

Sprawdź:
- Czy wymiary są poprawne
- Czy typu szyb się zgadzają
- Czy ilości

**Krok 5:** Przypisz do zleceń (opcjonalnie)

Możesz przypisać szyby do konkretnych zleceń:
1. System pokaże listę zleceń
2. Zaznacz do którego zlecenia przypisać
3. Lub zostaw "Niezapisane" - przypiszesz później

**Krok 6:** Utwórz zamówienie

System:
- Utworzy zamówienie szyb
- Zapisze wszystkie pozycje
- Ustawi status "Zamówione"
- Doda do śledzenia

---

## Import Stanów Magazynowych (CSV)

**Kiedy używać:**
- Inwentaryzacja
- Migracja z innego systemu
- Korekta masowa

### Format CSV

```csv
Profil,Kolor,Stan
Profile 65mm,RAL 9016,5000
Profile 65mm,RAL 7016,3200
Profile 85mm,RAL 9016,1500
```

### Proces

**Krok 1:** Magazyn → "Import stanu" → "CSV"

**Krok 2:** Wybierz tryb:
- **Zastąp stany** - nadpisz istniejące (⚠️ Ostrożnie!)
- **Dodaj do stanów** - zwiększ o podane ilości
- **Porównaj i skoryguj** - pokaż różnice (zalecane)

**Krok 3:** Import pliku CSV

**Krok 4:** Walidacja

System sprawdzi czy wszystkie profile istnieją.

**Krok 5:** Porównanie (jeśli wybrałeś "Porównaj")

Tabela różnic:
| Profil | Kolor | Stan systemowy | Stan z CSV | Różnica |
|--------|-------|----------------|------------|---------|
| Profile 65mm | RAL 9016 | 4800 | 5000 | +200 |

**Krok 6:** Zatwierdź korekty

Dla każdej różnicy:
- Wpisz powód (np. "Inwentaryzacja")
- Zatwierdź

**Krok 7:** Wykonaj import

System zaktualizuje stany + zapisze historię.

---

## Konfiguracja Folderów Importu

### Automatyczny Import z Folderów

System może automatycznie importować pliki z obserwowanych folderów.

**Setup:**
1. Ustawienia → Import → "Foldery obserwowane"
2. Dodaj folder:
   - Ścieżka: `C:\Imports\Orders\`
   - Typ: Zlecenia PDF
   - Akcja: Automatyczny import
   - Przenieś po imporcie do: `C:\Imports\Archive\`

**Działanie:**
- System sprawdza folder co 5 minut
- Znajdzie nowy PDF → automatycznie importuje
- Przenosi plik do archiwum
- Powiadamia email o sukcesie/błędzie

**Blokada importu:**
Możesz zablokować folder dla innych użytkowników:
- Ustawienia → Folder → "Tylko ja mogę importować"
- Przydatne gdy kilka osób ma dostęp do tego samego folderu

---

## Obsługa Konfliktów

### Konflikt: Duplikat Zlecenia

**Scenariusz:** Importujesz zlecenie które już istnieje

**System pyta:**
```
⚠️ Zlecenie 53456 już istnieje

Co chcesz zrobić?
○ Pomiń import (zostaw istniejące)
○ Zastąp (nadpisz danymi z PDF)
○ Utwórz wariant (dodaj jako alternatywę)
○ Scalij (połącz dane)
```

**Rekomendacja:**
- Jeśli aktualizujesz cenę → "Zastąp"
- Jeśli to inny wariant → "Utwórz wariant"
- Jeśli pomyłka → "Pomiń"

### Konflikt: Profil Nie Istnieje

**Scenariusz:** CSV zawiera profil którego nie ma w systemie

**Opcje:**
1. **Pomiń wiersz** - nie importuj tego profilu
2. **Utwórz profil** - dodaj nowy profil do systemu
3. **Zmapuj na istniejący** - zamień na podobny profil

### Konflikt: Niepoprawne Wymiary

**Scenariusz:** Wymiary okna są nierealistyczne (np. 10mm x 10mm)

**System ostrzega:**
```
⚠️ Okno pozycja 3: Wymiary 10 x 10 mm - czy na pewno?
```

**Opcje:**
- Popraw ręcznie
- Pomiń to okno
- Kontynuuj mimo ostrzeżenia

---

## Validacja Importowanych Danych

### Reguły Walidacji

System sprawdza:

**Zlecenia:**
- ✅ Numer zlecenia unikalny
- ✅ Data zlecenia nie w przyszłości
- ✅ Wymiary okien > 100mm
- ✅ Klient niepusty
- ✅ Profile istnieją w systemie

**Dostawy profili:**
- ✅ Ilości > 0
- ✅ Profile istnieją
- ✅ Kolory istnieją
- ✅ Data dostawy poprawna

**Zamówienia szyb:**
- ✅ Wymiary realistyczne
- ✅ Typy szyb znane
- ✅ Ilości > 0

### Poziomy Walidacji

**Błąd (🔴):** Import niemożliwy - musisz poprawić
**Ostrzeżenie (🟡):** Możesz kontynuować, ale sprawdź
**Info (🔵):** Informacja, wszystko OK

---

## Export Szablonów

### Pobierz Szablon CSV

Przed importem - pobierz szablon:

1. Magazyn → Import → "Pobierz szablon CSV"
2. Wybierz typ: Dostawy / Stany / Profile
3. Pobierz plik .csv
4. Otwórz w Excel
5. Wypełnij dane
6. Zapisz jako CSV (UTF-8)
7. Importuj

**Szablony zawierają:**
- Przykładowe dane
- Poprawne nazwy kolumn
- Opisy w komentarzach

---

## Typowe Scenariusze

### Scenariusz A: Masowy import zleceń z końca miesiąca

**Mam 20 PDF-ów z zleceniami**

**Rozwiązanie:**
1. Ustawienia → Import → Dodaj folder obserwowany
2. Skopiuj wszystkie PDF do folderu
3. System automatycznie zaimportuje wszystkie
4. Sprawdź logi czy wszystko OK
5. Przejrzyj zaimportowane zlecenia (filtruj po dzisiejszej dacie)

### Scenariusz B: Inwentaryzacja - mam stany w Excelu

**Excel z kolumnami: Profil, Kolor, Stan**

**Rozwiązanie:**
1. Excel → Zapisz jako CSV (UTF-8)
2. Magazyn → Import stanu → CSV
3. Wybierz tryb: "Porównaj i skoryguj"
4. Import pliku
5. Zobacz różnice
6. Zatwierdź korekty z powodem "Inwentaryzacja 2025-01"
7. Wykonaj import

### Scenariusz C: Błąd w PDF - OCR źle odczytało

**Import zlecenia - wymiary się nie zgadzają**

**Rozwiązanie:**
1. Podczas importu - zobacz podgląd
2. Kliknij na pole z błędnym wymiarem
3. Edytuj (sprawdź w oryginalnym PDF)
4. Zapisz poprawkę
5. Kontynuuj import

### Scenariusz D: Duplikat wariantu

**Importuję ponownie PDF z innym kolorem**

**Rozwiązanie:**
1. System wykryje duplikat
2. Wybierz "Utwórz wariant"
3. Nowy wariant zostanie dodany do zlecenia
4. Zobacz zlecenie → Zakładka "Warianty"
5. Możesz przełączać między wariantami

---

## FAQ - Import

**Q: Jakie kodowanie powinien mieć CSV?**
A: UTF-8 (ważne dla polskich znaków!)

**Q: Czy mogę importować wiele plików naraz?**
A: Tak, użyj folderu obserwowanego lub zaznacz wiele plików.

**Q: Co się stanie z plikiem po imporcie?**
A: Domyślnie - nic. Możesz skonfigurować auto-przeniesienie do archiwum.

**Q: Czy import jest odwracalny?**
A: Nie bezpośrednio. Możesz usunąć zaimportowane zlecenia ręcznie lub użyć backupu bazy.

**Q: Dlaczego import PDF nie działa?**
A: Sprawdź czy PDF ma tekst (nie skan). OCR działa tylko na tekście.

**Q: Czy mogę importować z innych systemów ERP?**
A: Tak, jeśli wyeksportujesz do CSV z odpowiednimi kolumnami.

---

## Skróty Klawiszowe

| Skrót | Akcja |
|-------|-------|
| `Ctrl + I` | Otwórz import |
| `Ctrl + D` | Pobierz szablon |
| `Ctrl + V` | Wklej dane (przy mapowaniu) |
| `Esc` | Anuluj import |

---

## Powiązane Przewodniki

- [Zlecenia](orders.md) - praca z zaimportowanymi zleceniami
- [Magazyn](warehouse.md) - import dostaw profili
- [Rozwiązywanie problemów](troubleshooting.md) - problemy z importem

---

**Potrzebujesz pomocy?** Zobacz [FAQ](faq.md) lub [Rozwiązywanie problemów](troubleshooting.md)

---

*Ostatnia aktualizacja: 2025-12-30*
