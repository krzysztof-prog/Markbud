# Specyfikacja funkcjonalna aplikacji

## 1. Cel systemu
Aplikacja automatyzuje obsługę zamówień, dostaw, produkcji okien oraz magazynu profili i szyb. System zbiera dane z maili, plików CSV, PDF i XLSX oraz integruje je z bazą Postgres.

## 2. Moduły systemu
- Import danych
- Magazyn profili
- Zarządzanie magazynem -> tabela zleceń z zapotrzebowaniem do tych zleceń -> każdy kolor ma swoją tabelę, kolor wybrany z listy (jakas mala tabela z boku - gdy uzytkownik kliknie na dany numer koloru pojawia sie table dotyczaca tego koloru), tabela magazynowa
- Zamówienia i dostawy
- Zestawienia i raporty
- Optymalizacja pakowania palet
- Integracja z pocztą i zewnętrzną bazą danych

## 3. Import danych
### 3.1 Automatyczne wykrywanie plików
- System monitoruje wskazane foldery: `/uzyte bele`, `/ceny`.
- Po pojawieniu się nowego pliku wyświetla komunikat do zatwierdzenia.
- Jeśli pojawi się drugi plik dotyczący tego samego numeru zlecenia, system porównuje dane i pyta: „nadpisać czy dodać jako oddzielne zlecenie?”.

### Struktura numerów artykułów

Numery
19016050 
1-nic nie znaczy
9016-numer profilu
050-numer koloru

Numery profili:
9016
8866
8869
9671
9677
9315

Numery kolorów:
Typowe:
000 – biały
050 – kremowy
730 – antracyt x1
750 – biała folia x1
148 – krem folia x1
145 – antracyt x1 (b.krem)
146 – granat x1 (b.krem)
147 – jodłowy x1 (b.krem)
830 – granat x1 
890 – jodłowy x1
128 – Schwarzgrau
864 – zielony monumentalny

Nietypowe
680 – biała folia x2
533 – szary czarny x2
154 – antracyt x2
155 – krem folia/biały (b.krem)
537 – quartgrau x1
201 – biała folia/antracyt 

Pozwól dodać kolory
Pozwól wybrać kolory typowe i nietypowe
Pozwól wybrać jakie profile w danym kolorze mają być wyświetlane


### 3.2 Przetwarzanie plików „użyte bele”
Plik zawiera dwie tabele.

#### Tabela 1: num zlec / num art / nowych bel / reszta
Logika:
- nowe bele = sztangi 6 m
- reszta = odpad w mm
- resztę zaokrąglić w górę do wielokrotności 500 mm
- jeśli reszta > 0 → od nowych bel odjąć 1 (to faktycznie zużyty materiał)
- reszta2 dla nas to 6000mm - reszta z pliku po zaokrableniu - pozniej przeliczamy na metry

Przykłady:
- 3 bele, reszta 1324 → 2 bele + 4,5 m
- 4 bele, reszta 0 → 4 bele
- 5 bel, reszta 3499 → 4 bele + 2,5 m

Program tworzy dla danego koloru oddzielna tabelę w formacie jak w pliku "tabela zlecen.jpg"
i drugą tabelę uzupełnianą ręcznie - tabela magazynowa.jpg - tam musi być miejsce na ilość zamówionych bel i datę dostawy

Stan magazynu wpisany jest ręcznie i raz w miesiącu aktualizowany. Przy aktualizacji zlecenia które zostały zrobione powinny być przenoszone do archiwum i znikac z tabeli zleceń.

W międzyczasie program sam liczy aktualny stan magazynu, zapotrzebowanie, stan po zapotrzebowaniu itp

#### Tabela 2: lp / szer / wys / typ profilu / ilość / referencja
- szerokość i wysokość w mm
- dane używane do optymalizacji pakowania
- dane wykorzystywane w protokołach odbioru

### 3.3 Import wartości zamówień (PDF)
- System automatycznie odczytuje wartość zamówienia z PDF znajdującego się w folderze `/ceny`.

### 3.4 Import CSV z dostawy szkła
- Plik: „przykładowy plik dostawcy szkła.csv”
- Kolumna: „zlecenie” np. „2   53430 poz.2”
- System wyciąga numer zlecenia (53430) i sumuje ilości szyb → później porównanie z wymaganymi szybami.

### 3.5 Import potwierdzenia zamówienia (PDF)
- Odczyt przewidywanego terminu dostawy np. „Tydz. 49/2025”
- Terminy dostaw wypadają w poniedziałki → system wylicza datę (np. 17.11.2025)
- System odczytuje tabelę z:
  - nr art.
  - zamówione bele (szt)
  - zamówione metry
- Możliwe porównanie: ile zamówiono vs ile faktycznie zużyto

## 4. Magazyn
### 4.1 Podgląd braków
- System generuje listę potencjalnych braków materiałowych.

### 4.2 Tabela profili danego koloru
- Po prawej lista kolorów z opisami.
- Po kliknięciu: tabela z profilami (kolumny) i zleceniami (wiersze).
- Każda komórka: ilość wymaganych bel i metrów.
- Każdy profil potrzebuje 2 kolumn: „bele” + „metry”.

## 5. Zarządzanie magazynem
- System stale aktualizuje stan magazynowy.
- Raz w miesiącu kierownik wprowadza stan z natury.
- Po wprowadzeniu:
  - zlecenia zrealizowane → archiwum
  - system zapisuje różnice między wyliczeniem a faktycznym stanem (statystyki + predykcje).

## 6. Zamówienia
- Kierownik ręcznie wpisuje zamówione ilości lub system pobiera je automatycznie z PDF.
- Każde zamówienie ma przypisaną planowaną datę dostawy.

## 7. Zestawienia miesięczne
System generuje automatyczne zestawienie:
- numer zlecenia  
- ilość okien  
- ilość jednostek  
- ilość skrzydeł  
- wartość zamówienia w PLN  
- wartość zamówienia w EUR  
- numer faktury  

## 8. Dostawy
- Do każdego zlecenia przypisana jest data dostawy.
- Widok:
  - lista dat dostaw  
  - lista zleceń przypisanych do danej daty  
  - funkcja drag & drop aby przenieść zlecenie między datami 
  - lista zleceń bez daty - zeby mozna je było przenieść do dostawy 

Dla każdej daty system generuje:
- optymalizację pakowania palet  
- protokół odbioru zawierający:
  - liczba okien
  - ewentualne szyby
  - zamówienia reklamacyjne
  - liczba palet
  - wartość dostawy

## 9. Optymalizacja pakowania palet
- Użytkownik definiuje rodzaje palet i ich wymiary.
- System stosuje zestaw reguł (checkboxy).
- Algorytm układa okna na palety minimalizując liczbę palet.

## 10. Integracje
- Połączenie z bazą Postgres + odczyt z innej zewnętrznej bazy.
- Odbieranie maili i przetwarzanie załączników.

## 11. Dodatkowe funkcje
- Edycja zamówień i cen
- Notatki
- Ustawienia: ścieżki do plików, parametry magazynu, definicje profili i palet

