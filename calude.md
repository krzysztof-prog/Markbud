claude.md — Specyfikacja systemu do realizacji
Cel

Zaprojektuj i zaimplementuj kompletną aplikację do automatyzacji obsługi zamówień, dostaw, produkcji okien oraz magazynu profili i szyb.
System integruje dane z maili, plików (CSV, PDF, XLSX) oraz baz PostgreSQL, generuje zestawienia oraz zarządza magazynem i zapotrzebowaniem.

Aplikacja ma działać automatycznie, być modułowa i umożliwiać wygodną obsługę magazynu oraz analizy danych.

1. Moduły systemu

System ma składać się z następujących modułów:

Import danych

Magazyn profili

Zarządzanie magazynem i zapotrzebowaniem

Zamówienia i dostawy

Zestawienia i raporty

Optymalizacja pakowania palet

Integracja z pocztą i bazą danych

2. Import danych
2.1 Automatyczne wykrywanie plików

Monitoruj foldery:

/uzyte bele

/ceny

Po wykryciu nowego pliku wyświetl użytkownikowi komunikat do zatwierdzenia importu.

Jeśli drugi plik dotyczy tego samego numeru zamówienia – porównaj dane i zapytaj:
„Nadpisać czy dodać jako oddzielne zlecenie?”

Struktura numerów artykułów

Format:
X – numer profilu – numer koloru
np. 19016050 → 9016 = profil, 050 = kolor

Numery profili

9016, 8866, 8869, 9671, 9677, 9315

Numery kolorów

Typowe: 000, 050, 730, 750, 148, 145, 146, 147, 830, 890, 128, 864

Nietypowe: 680, 533, 154, 155, 537, 201

Wymagania:

Możliwość dodawania nowych kolorów

Podział na kolory typowe i nietypowe

Możliwość wyboru, które profile mają być widoczne dla wybranego koloru

2.2 Przetwarzanie plików „użyte bele”

Plik zawiera 2 tabele.

Tabela 1:

num zlec / num art / nowych bel / reszta

Logika przeliczania:

„nowe bele” = sztangi 6 m

„reszta” = odpad w mm

zaokrąglić „resztę” w górę do 500 mm

jeśli reszta > 0 → odjąć 1 belkę (zużycie faktyczne)

„reszta2” = 6000 mm – zaokrąglona reszta → przeliczyć na metry

Przykłady:

3 bele, reszta 1324 → 2 bele + 4,5 m

4 bele, reszta 0 → 4 bele

5 bel, reszta 3499 → 4 bele + 2,5 m

System tworzy:

Tabelę zleceń dla danego koloru (format jak „tabela zlecen.jpg”)

Tabelę magazynową (format „tabela magazynowa.jpg”), uzupełnianą ręcznie – ilość zamówionych bel + data dostawy

Aktualizacja stanu:

Stan magazynu jest wprowadzany ręcznie raz w miesiącu

Po aktualizacji:

wykonane zlecenia → przeniesienie do archiwum

system ma automatycznie obliczać aktualny stan, zapotrzebowanie itd.

2.3 Tabela 2 (użyte bele):

lp / szer / wys / typ profilu / ilość / referencja

szer / wys w mm

dane wykorzystywane do:

optymalizacji pakowania palet

protokołów odbioru

2.4 Import wartości zamówień z PDF

PDF w folderze /ceny

Odczytaj wartość zamówienia i przypisz do zlecenia

2.5 Import dostawy szkła (CSV)

Plik: „przykładowy plik dostawcy szkła.csv”

Kolumna „zlecenie” ma format: 2 53430 poz.2

Należy:

wyciągnąć numer zlecenia (np. 53430)

zsumować ilość szyb

porównać z wymaganymi szybami

2.6 Import potwierdzenia zamówienia (PDF)

Wyciągnij:

przewidywany termin dostawy w formacie „Tydz. 49/2025”

przelicz na datę poniedziałku danego tygodnia

odczytaj tabelę z:

nr art

zamówione bele

zamówione metry

Możliwe porównanie: zamówiono vs zużyto

3. Magazyn
3.1 Podgląd braków

System generuje listę aktualnych i przyszłych braków materiałowych.

3.2 Tabela profili danego koloru

Interfejs:

Prawa strona: lista kolorów (z opisami)

Po kliknięciu: tabela (profile × zlecenia)

Dla każdego profilu 2 kolumny:

bele

metry

4. Zarządzanie magazynem

Stała aktualizacja stanu magazynowego na podstawie:

zleceń

zamówień

dostaw

Raz w miesiącu kierownik wpisuje fizyczny stan magazynu

Po aktualizacji:

wykonane zlecenia → archiwizacja

zapisać różnicę magazynową w statystykach (do predykcji)

5. Zamówienia

Kierownik może ręcznie wprowadzić dane zamówienia

Lub zaimportować z PDF

Każde zamówienie ma przypisaną przewidywaną datę dostawy

6. Zestawienia miesięczne

Automatyczne zestawienie zawiera:

nr zlecenia

ilość okien

ilość jednostek

ilość skrzydeł

wartość zamówienia (PLN i EUR)

numer faktury

7. Dostawy

Widok dostaw:

lista dat dostaw

lista zleceń przypisanych do danej daty

drag & drop między datami

lista zleceń bez daty → można przypisać

Dla każdej daty generuj:

optymalizację pakowania palet

protokół odbioru:

liczba okien

ewentualne szyby

zamówienia reklamacyjne

liczba palet

wartość dostawy

8. Optymalizacja pakowania palet

Użytkownik definiuje:

rodzaje palet

wymiary palet

Zestaw reguł (checkboxy)

Algorytm minimalizuje liczbę palet na dostawę

9. Integracje

Połączenie z bazą PostgreSQL

Połączenie z zewnętrzną bazą danych

Integracja z pocztą:

Odbieranie maili

Pobieranie załączników do dalszego przetwarzania

10. Funkcje dodatkowe

Edycja zamówień i cen

Notatki

Rozbudowane ustawienia:

ścieżki do plików

parametry magazynu

definicje profili

definicje palet