# Kontekst Biznesowy - AKROBUD

> Ten plik opisuje CO robi kazdy modul z perspektywy uzytkownika.
> Sekcje oznaczone **[?]** wymagaja uzupelnienia przez wlasciciela projektu.
> Sekcje oznaczone **[v]** zostaly wypelnione na podstawie kodu.
>
> Ostatnia aktualizacja: 2026-02-25

---

## Ogolny opis systemu

AKROBUD to system ERP dla firmy produkujacej okna aluminiowe (i PVC). System obsluguje pelny cykl zycia zlecenia: od importu danych z plikow CSV/PDF, przez planowanie produkcji, zarzadzanie magazynem profili/okuc/stali/szyb, az po logistyke dostaw i raporty produkcyjne.

**[v] Tech stack:** Fastify + Next.js + SQLite (Prisma), monorepo pnpm
**[v] Skala:** 5-10 uzytkownikow, 200-250 zlecen/miesiac
**[v] Role uzytkownikow:** owner, admin, kierownik, ksiegowa, user
**[v] Klienci (typy):** akrobud, ct, living, other (konfiguracja w ProductionEfficiencyConfig)

**[?] Uzupelnij:**
- Czym dokladnie zajmuje sie firma? Jakie produkty wytwarza?
- Kto korzysta z systemu? (np. biuro, hala produkcyjna, kierownik magazynu)
- Ile osob uzywa systemu na co dzien i na jakich stanowiskach?
- Jaki jest typowy dzien pracy? O ktorej zaczynaja sie dostawy?
- Czy sa integracje z innymi systemami poza Schuco Connect i Gmail?

---

## Moduly

---

### 1. Zlecenia (Orders)

**Cel:** [v] Zarzadzanie zleceniami produkcyjnymi okien aluminiowych. Centralna encja systemu - zlecenie laczy w sobie dane o profilu, kolorze, oknach, szkleniu, okuciach, dostawach i kosztach.

**Uzytkownicy:** [?] Kto tworzy zlecenia? Kto je edytuje? Czy zlecenia powstaja wylacznie z importu CSV czy tez recznie?

**Flow statusow:** [v]
```
new -----> in_progress -----> completed -----> archived
  \            \    ^              |
   \            \   |              |
    \--> archived   +-- (revert)   +--> archived
```
- `new` -> `in_progress`: wymaga walidacji stanow magazynowych (profili + okuc + szyby)
- `in_progress` -> `completed`: automatyczne RW (rozchod wewnetrzny) dla okuc, profili i stali
- `completed` -> `in_progress`: mozliwe cofniecie produkcji (revert) z odwroceniem RW
- `completed` -> `archived`: zakonczenie cyklu zycia
- `archived`: stan koncowy, brak dalszych przejsc

**Kluczowe reguly:**
- [v] Kwoty w groszach/centach (`valuePln`, `valueEur`) - nigdy float
- [v] Soft delete (`deletedAt`) - zlecenia nie sa kasowane na stale
- [v] Soft delete mozliwy TYLKO dla zlecen w statusie `new`
- [v] Nie mozna usunac zlecenia przypisanego do wyslane/dostarczonej dostawy
- [v] Automatyczne przypisywanie cen z `PendingOrderPrice` przy tworzeniu zlecenia
- [v] Dziedziczenie ceny EUR z zamowienia bazowego dla wariantow (-a, -b, -c)
- [v] Propagacja zmiany ceny EUR do wariantow
- [v] Status manualny (NIE CIAC, Anulowane, Wstrzymane, Reklamacja, Serwis)
- [v] Typ specjalny (drzwi, PSK, HS, ksztalt) - dla nietypowek
- [v] Readiness check przed startem produkcji (magazyn + szyby + okucia)
- [?] Kiedy zlecenie przechodzi z `new` do `in_progress`? Czysto recznie czy jest jakis trigger?
- [?] Czy zlecenie moze byc cofniete do `new` z `in_progress`?
- [?] Kto decyduje o archiwizacji?

**Powiazania:**
- [v] Zlecenie -> Dostawa (przez `DeliveryOrder`, N:M)
- [v] Zlecenie -> Zapotrzebowanie profili (`OrderRequirement` -> Profile, Color)
- [v] Zlecenie -> Okna (`OrderWindow`)
- [v] Zlecenie -> Szyby (`OrderGlass`)
- [v] Zlecenie -> Kosztorys (`OrderMaterial`: okno/montaz/dodatki/inne)
- [v] Zlecenie -> Okucia (`OkucDemand` -> `OkucArticle`)
- [v] Zlecenie -> Stal (`OrderSteelRequirement` -> `Steel`)
- [v] Zlecenie -> Schuco (`OrderSchucoLink` -> `SchucoDelivery`)
- [v] Zlecenie -> Notatki (`Note`)

**Typowe scenariusze:** [?]
- Jak wyglada typowy proces tworzenia zlecenia?
- Kiedy i kto zmienia status na "w produkcji"?
- Co sie dzieje gdy brakuje materialow?

---

### 2. Dostawy (Deliveries)

**Cel:** [v] Planowanie i realizacja wysylek do klientow. Dostawa grupuje wiele zlecen na jedna date i numer dostawy (I, II, III).

**Uzytkownicy:** [?] Kto tworzy dostawy? Kto decyduje o dacie? Kto zmienia status?

**Flow statusow (dostawa):** [v]
```
planned -----> in_progress -----> completed
   ^               |
   +---------------+
   (mozna cofnac z in_progress)
```
- `planned` -> `in_progress`: rozpoczecie przygotowania dostawy
- `in_progress` -> `completed`: stan koncowy (terminal), nie mozna cofnac
- `in_progress` -> `planned`: mozliwe cofniecie (np. anulowanie ladowania)
- [v] Walidacja: przed `completed` wszystkie zlecenia musza miec status `in_progress` lub `completed` (nie `new` ani `archived`)
- [v] Auto-complete dostawy gdy wszystkie zlecenia sa `completed`

**System gotowosci (Readiness):** [v]
```
Moduly gotowosci: warehouse | glass | okuc | pallet | approval | variant
Status: ready | conditional | blocked | pending
Agregacja: DeliveryReadinessAggregator
```
- [v] Sprawdza: czy profili wystarczy, czy szyby zamowione/dostarczone, czy okucia sa, czy palety sa, czy listy zweryfikowane

**Kluczowe reguly:**
- [v] Status machine z walidacja przejsc (delivery-status-machine.ts)
- [v] Numer dostawy generowany automatycznie (DeliveryNumberGenerator)
- [v] Optymalizacja ukladu palet (PalletOptimizerService)
- [v] Kontrola etykiet OCR (LabelCheckService) na dostawie
- [v] Powiazanie z listami logistycznymi (LogisticsMailList)
- [v] Soft delete
- [?] Jak wyglada typowy dzien wysylki?
- [?] Kto decyduje o dacie dostawy?
- [?] Ile dostaw jest typowo w tygodniu?

**Powiazania:**
- [v] Dostawa -> Zlecenia (przez `DeliveryOrder`, N:M z pozycja/kolejnoscia)
- [v] Dostawa -> Optymalizacja palet (`PalletOptimization` -> `OptimizedPallet`)
- [v] Dostawa -> Kontrola etykiet (`LabelCheck` -> `LabelCheckResult`)
- [v] Dostawa -> Gotowsc (`DeliveryReadiness`)
- [v] Dostawa -> Weryfikacja Akrobud (`AkrobudVerificationList`)
- [v] Dostawa -> Logistyka (`LogisticsMailList`)

**Typowe scenariusze:** [?]
- Jak wyglada proces od zaplanowania do zrealizowania dostawy?
- Co sie dzieje gdy dostawa nie jest gotowa w zaplanowanym terminie?

---

### 3. Magazyn Profili (Warehouse)

**Cel:** [v] Zarzadzanie stanami magazynowymi profili aluminiowych. Sledzenie ilosci bel w podziale na profil (6 typow: 9016, 8866, 8869, 9671, 9677, 9315) i kolor.

**Uzytkownicy:** [?] Kto zarzadza magazynem profili? Kto robi inwentaryzacje?

**Flow statusow (zamowienie magazynowe):** [v]
```
pending -----> received
    \
     +--> archived
```

**Kluczowe reguly:**
- [v] Stan w belach (beamsCount), dlugosc belki 6000mm
- [v] Optimistic locking na stanie magazynowym (pole `version`)
- [v] Inwentaryzacja miesieczna (monthlyUpdate) i zamkniecie miesiaca (finalizeMonth)
- [v] Automatyczne RW (rozchod wewnetrzny) przy zakonczeniu zlecenia
- [v] Wykrywanie brakow magazynowych (shortages) z priorytetami (critical/high/medium)
- [v] Walidacja wystarczajacego stanu przed startem produkcji
- [v] Historia zmian (WarehouseHistory) z calculated vs actual stock
- [v] Kolory typowe (12) i atypowe (6) - rozne zestawy
- [?] Jak czesto dostawy profili? Od kogo?
- [?] Ile profili typowo jest na magazynie?
- [?] Co robic gdy brakuje profili?

**Powiazania:**
- [v] Magazyn -> Profile (`WarehouseStock.profileId`)
- [v] Magazyn -> Kolory (`WarehouseStock.colorId`)
- [v] Magazyn -> Zamowienia (`WarehouseOrder`)
- [v] Magazyn -> Historia (`WarehouseHistory`)
- [v] Zlecenie -> Zapotrzebowanie (`OrderRequirement`)

**Typowe scenariusze:** [?]
- Jak wyglada proces zamawiania profili?
- Jak czesto jest inwentaryzacja?

---

### 4. Zamowienia Szyb (Glass Orders)

**Cel:** [v] Sledzenie zamowien szyb u dostawcow. Zamowienie szyb powstaje na podstawie danych z zlecen (OrderGlass).

**Uzytkownicy:** [?] Kto zamawia szyby? Kto sprawdza dostawy?

**Flow statusow:** [v]
```
ordered -----> partially_delivered -----> delivered
    \
     +--> cancelled
```

**Kluczowe reguly:**
- [v] Walidacja szyb (GlassValidationService) - porownanie zamowionych vs potrzebnych
- [v] Severity: error / warning / info
- [v] Powiazanie z readiness dostawy (modul `glass`)
- [?] Od kogo firma zamawia szyby?
- [?] Jaki jest typowy czas realizacji zamowienia szyb?

**Powiazania:**
- [v] GlassOrder -> GlassOrderItem (pozycje)
- [v] GlassOrder -> GlassOrderValidation (walidacja)
- [v] GlassOrder -> Zlecenie (przez numer zamowienia)

**Typowe scenariusze:** [?]
- Jak wyglada proces zamawiania szyb?

---

### 5. Dostawy Szyb (Glass Deliveries)

**Cel:** [v] Rejestracja i sledzenie dostaw szyb od dostawcow. Import danych z CSV (glass-delivery-csv-parser). Matchowanie pozycji dostawy do zlecen.

**Uzytkownicy:** [?] Kto przyjmuje dostawy szyb? Kto importuje dane?

**Kluczowe reguly:**
- [v] Kategorie szyb: standard, loose (luzne), aluminum, reclamation (reklamacyjne)
- [v] Matching dostawy do zlecenia po numerze zamowienia
- [v] Import z CSV
- [?] Jak czesto przychodza dostawy szyb?

**Powiazania:**
- [v] GlassDelivery -> GlassDeliveryItem
- [v] GlassDelivery -> LooseGlass, AluminumGlass, ReclamationGlass

**Typowe scenariusze:** [?]
- Jak wyglada odbiorcze sprawdzenie dostawy szyb?

---

### 6. Okucia - OKUC (Hardware/Fittings)

**Cel:** [v] Zarzadzanie magazynem okuci (osprzetu okiennego). System DualStock: PVC i ALU, kazdy z 3 podmagazynami (production, buffer, gabaraty).

**Uzytkownicy:** [?] Kto zarzadza okuciam? Kto robi zamowienia?

**Flow statusow (zamowienie okuc):** [v]
```
draft --> pending_approval --> approved --> sent --> confirmed --> in_transit --> received
    \                                                                              |
     +------------------------> cancelled <----------------------------------------+
```

**Flow statusow (zapotrzebowanie):** [v]
```
pending --> confirmed --> in_production --> completed
    \                                        |
     +-----------> cancelled <---------------+
```

**Kluczowe reguly:**
- [v] Typy koszykow: typical_standard, typical_gabarat, atypical
- [v] Klasa artykulu: typical / atypical
- [v] Klasa rozmiaru: standard / gabarat
- [v] Jednostka zamowienia: sztuka (piece) / opakowanie (pack)
- [v] Proporcje: multiplier (mnoznik) i split (podzial) miedzy artykulami
- [v] Zamienniki artykulow (ArticleReplacementService) z obsluga phase-out
- [v] Automatyczne RW (rozchod wewnetrzny) przy zakonczeniu zlecenia
- [v] Historia zdarzen: rw, manual_consumption, adjustment, return, inventory_count, transfer, order_received
- [v] Optimistic locking na stanie (pole `version`)
- [?] Jak czesto zamawiane sa okucia?
- [?] Kto decyduje o poziomach minimalnych?

**Powiazania:**
- [v] OkucArticle -> OkucStock (stan per magazyn/podmagazyn)
- [v] OkucArticle -> OkucDemand (zapotrzebowanie per zlecenie)
- [v] OkucArticle -> OkucProportion (proporcje/zamienniki)
- [v] OkucArticle -> OkucArticleAlias (stare numery)
- [v] OkucOrder -> OkucOrderItem (pozycje zamowienia)
- [v] OkucArticle -> OkucHistory (historia zdarzen)
- [v] OkucArticle -> OkucLocation (lokalizacja w magazynie)

**Typowe scenariusze:** [?]
- Jak wyglada proces zamawiania okuc?
- Jak dziala mechanizm zamiennikow w praktyce?

---

### 7. Stal (Steel)

**Cel:** [v] Zarzadzanie magazynem stali (zbrojen do okien). Analogiczna struktura do magazynu profili.

**Uzytkownicy:** [?] Kto zarzadza stalem?

**Kluczowe reguly:**
- [v] Stan w belach (beamsCount)
- [v] Automatyczne RW przy zakonczeniu zlecenia (SteelRwService)
- [v] Optimistic locking (pole `version`)
- [v] Historia zmian (SteelHistory)
- [v] Zapotrzebowanie per zlecenie (OrderSteelRequirement)
- [?] Od kogo dostawca stali?

**Powiazania:**
- [v] Steel -> SteelStock (stan)
- [v] Steel -> SteelOrder (zamowienia)
- [v] Steel -> SteelHistory (historia)
- [v] Order -> OrderSteelRequirement -> Steel

**Typowe scenariusze:** [?]
- Jak czesto zamawianie stali?

---

### 8. Import Danych (Imports)

**Cel:** [v] Import danych z plikow CSV i PDF. Glowne typy importu: `uzyte_bele` (CSV z danymi zlecen), `ceny_pdf` (cenniki z PDF), `dostawa_szkla` (CSV z dostawami szyb), `potwierdzenie_zamowienia`.

**Uzytkownicy:** [?] Kto importuje pliki? Skad pochodza pliki CSV?

**Flow statusow:** [v]
```
pending -----> processing -----> completed
    \              |
     \             +--> error
      \
       +--> rejected
```

**Kluczowe reguly:**
- [v] Orkiestracja przez ImportOrchestrator
- [v] Wykrywanie typu pliku po nazwie
- [v] Obsluga konfliktow wariantow (replace_base / replace_variant / keep_both / cancel)
- [v] Numer dostawy przy imporcie folderowym (I, II, III)
- [v] Locking na folderze (ImportLockService) - zapobiega rownoleglemu importowi
- [v] Archiwizacja folderow po imporcie
- [v] Auto-import dla PDF cennikow
- [v] Kolejka importow w tle (ImportQueueService)
- [v] Streaming eventow przez WebSocket (ImportWebSocketBridge)
- [v] Walidacja plikow (rozmiar, typ, bezpieczenstwo)
- [v] File Watcher - automatyczne monitorowanie folderow importu
- [v] Import z Gmail (GmailFetcher, GmailScheduler) - co godzine
- [?] Skad pochodza pliki CSV (jakie oprogramowanie je generuje)?
- [?] Ile plikow typowo importowanych dziennie?
- [?] Kto zatwierdza importy (approve)?

**Powiazania:**
- [v] Import -> Zlecenie (tworzenie/aktualizacja)
- [v] Import -> Dostawa (automatyczne przypisanie)
- [v] Import -> PendingOrderPrice (ceny z PDF)
- [v] Import -> PendingImportConflict (konflikty wariantow)

**Typowe scenariusze:** [?]
- Jak wyglada typowy proces importu danych z poczatku do konca?
- Jak czesto zdarzaja sie konflikty wariantow?

---

### 9. Dashboard

**Cel:** [v] Glowny panel z podsumowaniem systemu. Wyswietla kluczowe metryki, alerty i nadchodzace dostawy.

**Uzytkownicy:** [v] Admin/Owner widza dashboard glowny. Operatorzy maja osobny dashboard.

**Metryki (Dashboard glowny):** [v]
- Liczba aktywnych zlecen
- Nadchodzace dostawy (7 dni)
- Oczekujace importy
- Braki magazynowe (top 5 z priorytetami)
- Ostatnie zlecenia

**Alerty:** [v]
- Braki magazynowe (critical: > -10 bel, high: > -5 bel, medium: reszta)
- Oczekujace importy CSV/PDF
- Dostawy zaplanowane na dzis

**Statystyki:** [v]
- Tygodniowe (8 tygodni): dostawy, zlecenia, okna, skrzydla, szyby
- Miesieczne: zlecenia, okna, wartosc PLN/EUR, dostawy

**Dashboard operatora:** [v]
- Kompletnosc zlecen (pliki, szyby, okucia)
- Powiadomienia o zmianach (order_created, glass_status_changed, hardware_status_changed, delivery_assigned)
- Priorytety: missing_files, missing_glass, missing_hardware, pending_conflict

**Powiazania:**
- [v] Dashboard agreguje dane z: Orders, Deliveries, Warehouse, Imports

**Typowe scenariusze:** [?]
- Co robi uzytkownik gdy widzi alert na dashboardzie?
- Czy dashboard jest "ekranem startowym"?

---

### 10. Profile (Profiles)

**Cel:** [v] Slownik profili aluminiowych uzywanych w produkcji. 6 glownych numerow: 9016, 8866, 8869, 9671, 9677, 9315.

**Uzytkownicy:** [?] Kto dodaje/edytuje profile?

**Kluczowe reguly:**
- [v] Typ: typical / atypical
- [v] Flagi: isAkrobud, isLiving, isBlok, isVlak, isCt70, isFocusing, isPalletized
- [v] Numer artykulu (articleNumber)
- [v] Kazdy profil ma glebokosci (ProfileDepth) i konfiguracje palet (ProfilePalletConfig)
- [v] Relacja z kolorami przez ProfileColor (z polem widocznosci isVisible)
- [v] Soft delete

**Powiazania:**
- [v] Profile -> Kolory (ProfileColor, N:M)
- [v] Profile -> Magazyn (WarehouseStock)
- [v] Profile -> Zlecenia (OrderRequirement)
- [v] Profile -> Glebokosci (ProfileDepth)
- [v] Profile -> Konfiguracja palet (ProfilePalletConfig)

**Typowe scenariusze:** [?]
- Czy profile sie zmieniaja/dodaja nowe, czy to staly zestaw?

---

### 11. Kolory (Colors)

**Cel:** [v] Slownik kolorow stosowanych na profilach. Rozroznienie na kolory typowe (12) i atypowe (6).

**Uzytkownicy:** [?] Kto zarzadza kolorami?

**Kluczowe reguly:**
- [v] Typ koloru: powder (proszkowy), ral, anodized (anodowany)
- [v] Kody unikalne (code)
- [v] Flagi: isAkrobud, isTypical
- [v] Hexadecymalny kolor (hexColor) do wyswietlania w UI
- [v] Widocznosc profilu w kolorze (ProfileColor.isVisible)
- [v] Kolory prywatne (PrivateColor) - z importow, osobny model
- [v] Soft delete

**Powiazania:**
- [v] Color -> Profile (ProfileColor, N:M)
- [v] Color -> Magazyn (WarehouseStock)
- [v] Color -> Zlecenia (OrderRequirement)

**Typowe scenariusze:** [?]
- Jak czesto dodawane sa nowe kolory?
- Czym roznia sie kolory typowe od atypowych w praktyce?

---

### 12. Palety (Pallets)

**Cel:** [v] Zarzadzanie typami palet uzywanych do transportu. 5 typow: MALA, P2400, P3000, P3500, P4000.

**Uzytkownicy:** [?] Kto zarzadza paletami?

**Kluczowe reguly:**
- [v] Typy z wymiarami (lengthMm, widthMm, heightMm)
- [v] Optymalizacja ukladu okien na paletach (PalletOptimizerService)
- [v] Eksport optymalizacji do PDF
- [v] Reguly pakowania (PackingRule)
- [?] Czy palety sa wlasne czy wynajmowane?

**Powiazania:**
- [v] Palety -> Optymalizacja dostawy (PalletOptimization)
- [v] Palety -> Konfiguracja profili (ProfilePalletConfig)

**Typowe scenariusze:** [?]
- Jak wyglada proces pakowania okien na palety?

---

### 13. Stan Palet (Pallet Stock)

**Cel:** [v] Sledzenie dziennego stanu palet - ile jest na stanie rano, ile zuzyte, ile wyprodukowane.

**Uzytkownicy:** [?] Kto codziennie raportuje stan palet?

**Flow:** [v]
```
Dzien: OPEN -----> CLOSED
```

**Kluczowe reguly:**
- [v] Jeden rekord na dzien (PalletStockDay)
- [v] Per typ palety: morningStock, used, produced (PalletStockEntry)
- [v] Zamkniecie dnia (close) - nie mozna juz edytowac
- [v] Progi alertow per typ (PalletAlertConfig)
- [v] Stan poczatkowy (PalletInitialStock)
- [?] O ktorej zamykany jest dzien?

**Powiazania:**
- [v] PalletStockDay -> PalletStockEntry (per typ palety)
- [v] PalletAlertConfig, PalletInitialStock

**Typowe scenariusze:** [?]
- Kto i kiedy wpisuje dane o paletach?

---

### 14. Godzinowki (Timesheets)

**Cel:** [v] Rejestracja czasu pracy pracownikow produkcyjnych. Godziny produktywne, absencje, zadania nieprodukcyjne, prace specjalne.

**Uzytkownicy:** [?] Kto wpisuje godzinowki? Kierownik czy sami pracownicy?

**Kluczowe reguly:**
- [v] Wpis per pracownik per dzien (TimeEntry)
- [v] Godziny produktywne + stanowisko (Position)
- [v] Typy absencji: SICK (chorobowe), VACATION (urlop), ABSENT (nieobecnosc)
- [v] Zadania nieprodukcyjne (NonProductiveTask) z typami (NonProductiveTaskType)
- [v] Prace specjalne (SpecialWork) z typami (SpecialWorkType)
- [v] Pracownicy (Worker) z domyslnym stanowiskiem i flaga aktywnosci
- [?] Czy godzinowki sa dzienne czy tygodniowe?
- [?] Kto zatwierdza godzinowki?

**Powiazania:**
- [v] TimeEntry -> Worker, Position
- [v] TimeEntry -> NonProductiveTask -> NonProductiveTaskType
- [v] TimeEntry -> SpecialWork -> SpecialWorkType

**Typowe scenariusze:** [?]
- Jak wyglada codzienny proces wpisywania godzinowek?

---

### 15. Obecnosc - BZ (Attendance)

**Cel:** [v] Modul obecnosci pracownikow (BZ). Sledzenie kto jest w pracy, kto choruje, kto na urlopie.

**Uzytkownicy:** [?] Kto prowadzi ewidencje obecnosci?

**Kluczowe reguly:**
- [v] Typy: work, sick, vacation, absent
- [v] Miesieczny widok obecnosci (useMonthlyAttendance)
- [?] Czy BZ jest polaczone z godzinowkami (Timesheets)?
- [?] Czy dane pochodza z systemu RCP?

**Powiazania:**
- [v] Attendance -> Worker/User

**Typowe scenariusze:** [?]
- Jak wyglada codzienny proces ewidencji obecnosci?

---

### 16. Raporty Produkcji (Production Reports)

**Cel:** [v] Miesieczne raporty produkcji. Agregacja danych o zleceniach zakonczonych w danym miesiacu.

**Uzytkownicy:** [?] Kto generuje/przesyga raporty?

**Kluczowe reguly:**
- [v] Raport per miesiac/rok (ProductionReport)
- [v] Status: open / closed
- [v] Pozycje raportu (ProductionReportItem) z mozliwoscia nadpisania wartosci (overrideWindows/Units/Sashes)
- [v] Sledzenie: rwOkucia, rwProfile, invoiceNumber
- [v] Klienci: akrobud, ct, living, other (ProductionEfficiencyConfig)
- [v] Wydajnosc: glazingsPerHour, wingsPerHour per klient
- [?] Kto analizuje raporty? Do czego sluza?

**Powiazania:**
- [v] ProductionReport -> ProductionReportItem -> Order
- [v] ProductionEfficiencyConfig

**Typowe scenariusze:** [?]
- Jak wyglada proces zamykania miesiaca?

---

### 17. Planowanie Produkcji (Production Planning)

**Cel:** [v] Planowanie kalendarza produkcji. Zarzadzanie dniami roboczymi, swietami, sobotami produkcyjnymi.

**Uzytkownicy:** [?] Kto planuje produkcje?

**Kluczowe reguly:**
- [v] Typy dni: working, holiday, production_saturday, custom_off
- [v] Kalendarz produkcji (ProductionCalendar)
- [v] Ustawienia produkcji (ProductionSettings)
- [v] Widok "For Production" - zlecenia pogrupowane: opoznione, nadchodzace, prywatne, dostawy
- [?] Jak daleko w przyszlosc planowana jest produkcja?

**Powiazania:**
- [v] ProductionCalendar
- [v] ProductionSettings
- [v] WorkingDay (kalendarz dni roboczych)

**Typowe scenariusze:** [?]
- Jak wyglada tydzieniowe planowanie produkcji?

---

### 18. Logistyka (Logistics)

**Cel:** [v] Parsowanie maili z listami logistycznymi. Wersjonowanie list. Audit trail decyzji logistycznych.

**Uzytkownicy:** [?] Kto korzysta z modulu logistyki?

**Kluczowe reguly:**
- [v] Lista z maila (LogisticsMailList) -> pozycje (LogisticsMailItem)
- [v] Wersjonowanie list (version)
- [v] Flagi pozycji: requiresMesh, missingFile
- [v] Status pozycji: ok, blocked, waiting, excluded
- [v] Flagi zlecen: REQUIRES_MESH, MISSING_FILE, UNCONFIRMED, DIMENSIONS_UNCONFIRMED, DRAWING_UNCONFIRMED, EXCLUDE_FROM_PRODUCTION, SPECIAL_HANDLE, CUSTOM_COLOR
- [v] Audit trail (LogisticsDecisionLog)
- [v] Integracja z Gmail (import poczty)
- [?] Kto wysyla maile logistyczne?
- [?] Jaki jest format tych maili?

**Powiazania:**
- [v] LogisticsMailList -> LogisticsMailItem -> Order
- [v] LogisticsMailList -> Delivery
- [v] LogisticsDecisionLog

**Typowe scenariusze:** [?]
- Jak wyglada przetwarzanie maila logistycznego?

---

### 19. Moja Praca (My Work)

**Cel:** [v] Panel pracownika (operatora). Widok zlecen i konfliktow przypisanych do zalogowanego uzytkownika.

**Uzytkownicy:** [v] Wszyscy zalogowani uzytkownicy (rola: user i wyzej).

**Kluczowe reguly:**
- [v] Status: pending, resolved
- [v] Obsluga konfliktow wariantow (replace_base, replace_variant, keep_both, cancel)
- [v] Filtrowanie po uzytkownikach
- [?] Jakie dane widzi pracownik na swoim panelu?

**Powiazania:**
- [v] Moja Praca -> Orders (widok pracownika)
- [v] Moja Praca -> Import conflicts

**Typowe scenariusze:** [?]
- Co typowo robi pracownik na swoim panelu?

---

### 20. Schuco Connect

**Cel:** [v] Integracja z systemem Schuco Connect - automatyczne pobieranie danych o dostawach od dostawcy Schuco.

**Uzytkownicy:** [?] Kto konfiguruje/monitoruje integracje?

**Kluczowe reguly:**
- [v] Automatyczny fetch 3x dziennie (8:00, 12:00, 15:00) - scheduler
- [v] Scraper (schucoScraper) + Parser (schucoParser)
- [v] Sledzenie zmian (SchucoOrderItem.changeType: new/updated)
- [v] Dostawy (SchucoDelivery) z: orderNumber, shippingStatus, deliveryDate, isWarehouseItem
- [v] Log pobierania (SchucoFetchLog)
- [v] Mozliwosc archiwizacji dostawy
- [v] Realtime progress przez WebSocket
- [?] Co to jest Schuco Connect? (portal dostawcy?)
- [?] Jakie dane sie z niego pobiera?

**Powiazania:**
- [v] SchucoDelivery -> SchucoOrderItem
- [v] SchucoDelivery -> OrderSchucoLink -> Order
- [v] SchucoFetchLog

**Typowe scenariusze:** [?]
- Co sie dzieje gdy Schuco pokazuje nowa dostawe?

---

### 21. OKUC (podstrony)

**Cel:** [v] Rozbudowany podsystem okuci. Obejmuje artykuly, stany, zapotrzebowanie, zamowienia, proporcje, zamienniki, lokalizacje.

Opisane w szczegolach w sekcji [6. Okucia](#6-okucia---okuc-hardwarefittings).

Podstrony frontendowe:
- [v] `/magazyn/okuc` - Glowna strona
- [v] `/magazyn/okuc/artykuly` - Katalog artykulow
- [v] `/magazyn/okuc/stan` - Stany magazynowe (PVC/ALU, 3 podmagazyny)
- [v] `/magazyn/okuc/zamowienia` - Zamowienia do dostawcy
- [v] `/magazyn/okuc/zapotrzebowanie` - Zapotrzebowanie per zlecenie
- [v] `/magazyn/okuc/rw` - Rozchody wewnetrzne
- [v] `/magazyn/okuc/zastepstwa` - Zamienniki artykulow
- [v] `/magazyn/okuc/remanent` - Inwentaryzacja

---

### 22. Kontrola Etykiet (Label Checks)

**Cel:** [v] Automatyczna kontrola etykiet na oknach za pomoca OCR. Porownanie daty na etykiecie z oczekiwana data dostawy.

**Uzytkownicy:** [?] Kto uruchamia kontrole etykiet?

**Flow statusow:** [v]
```
pending -----> completed
    \
     +--> failed
```

**Kluczowe reguly:**
- [v] Status wynikow: OK, MISMATCH (niezgodnosc), NO_FOLDER, NO_BMP (brak obrazu), OCR_ERROR, SKIPPED
- [v] Per dostawa: totalOrders, okCount, mismatchCount
- [v] Porownanie: expectedDate vs detectedDate
- [v] Alert scheduler (codziennie 7:00)
- [?] Jak wyglada fizyczny proces skanowania etykiet?
- [?] Co sie dzieje gdy etykieta nie pasuje (MISMATCH)?

**Powiazania:**
- [v] LabelCheck -> Delivery
- [v] LabelCheck -> LabelCheckResult -> Order

**Typowe scenariusze:** [?]
- Kiedy i jak uruchamiana jest kontrola etykiet?

---

### 23. Weryfikacja Akrobud (Akrobud Verification)

**Cel:** [v] Weryfikacja list zlecen od klienta Akrobud. Matchowanie numerow zlecen z bazy z numerami na liscie.

**Uzytkownicy:** [?] Kto weryfikuje listy Akrobud?

**Flow statusow:** [v]
```
draft -----> verified -----> applied
```

**Kluczowe reguly:**
- [v] Lista weryfikacyjna (AkrobudVerificationList) per dostawa/data
- [v] Pozycje listy z matchowaniem (AkrobudVerificationItem)
- [v] Status matcha: found, variant_match, not_found
- [v] Obsluga duplikatow: keep_first, keep_last, keep_all, remove_all
- [v] Tryb wejscia: textarea (wiele na raz), single (jeden po jednym)
- [v] Wersjonowanie (version)
- [?] Czym sa "listy Akrobud"? Co na nich jest?

**Powiazania:**
- [v] AkrobudVerificationList -> AkrobudVerificationItem -> Order
- [v] AkrobudVerificationList -> Delivery
- [v] VerificationItemOrder (N:M)

**Typowe scenariusze:** [?]
- Jak wyglada proces weryfikacji listy?

---

### 24. Magazyn PVC (PVC Warehouse)

**Cel:** [v] Zarzadzanie magazynem PVC. Osobny modul z wlasnym frontend feature, stanami i zapotrzebowaniem.

**Uzytkownicy:** [?] Kto zarzadza magazynem PVC?

**Kluczowe reguly:**
- [v] Filtry systemowe (SystemFilters)
- [v] Tabela stanow (PvcStockTable)
- [v] Tabela zapotrzebowania (PvcDemandTable)
- [v] Remanent PVC
- [?] Czym rozni sie magazyn PVC od magazynu profili aluminiowych?
- [?] Jakie artykuly sa na magazynie PVC?

**Powiazania:**
- [v] Powiazanie z systemem OKUC (OkucStock.warehouseType = 'pvc')

**Typowe scenariusze:** [?]
- Jak wyglada obsluga magazynu PVC?

---

### 25. Zestawienia Miesieczne (Monthly Reports)

**Cel:** [v] Zestawienia miesieczne agregatow: zlecenia, okna, skrzydla, wartosci PLN/EUR.

**Uzytkownicy:** [?] Kto korzysta z zestawien? Do czego sluza?

**Kluczowe reguly:**
- [v] Raport per rok/miesiac (MonthlyReport)
- [v] Pozycje (MonthlyReportItem): orderId, windowsCount, sashesCount
- [v] Podstrony: zlecenia, miesieczne, do sprawdzenia, archiwum
- [?] Czym roznia sie od "Raportow Produkcji"?

**Powiazania:**
- [v] MonthlyReport -> MonthlyReportItem -> Order

**Typowe scenariusze:** [?]
- Kto i kiedy generuje zestawienia?

---

### 26. Konfiguracja Walut (Currency Config)

**Cel:** [v] Zarzadzanie kursami walut EUR/PLN. Przechowywanie historii kursow z datami obowiazywania.

**Uzytkownicy:** [?] Kto ustawia kursy walut?

**Kluczowe reguly:**
- [v] Kurs EUR -> PLN (eurToPlnRate)
- [v] Data obowiazywania (effectiveDate)
- [v] Historia kursow (CurrencyConfig)
- [?] Jak czesto zmienia sie kurs?
- [?] Skad bierze sie kurs (NBP, recznie)?

**Powiazania:**
- [v] Uzywane przy przeliczeniach PLN <-> EUR w zleceniach

---

### 27. Ustawienia (Settings)

**Cel:** [v] Globalne ustawienia aplikacji. Key-value store.

**Uzytkownicy:** [v] Admin/Owner.

**Kluczowe reguly:**
- [v] Model Setting: key (PK), value
- [v] Podstrony ustawien: glebokosci profili, konfiguracja palet
- [?] Jakie ustawienia sa najczesciej zmieniane?

---

### 28. Uzytkownicy i Autoryzacja (Users/Auth)

**Cel:** [v] Zarzadzanie uzytkownikami i ich rolami. Logowanie JWT.

**Uzytkownicy:** [v] Admin/Owner zarzadzaja uzytkownikami.

**Kluczowe reguly:**
- [v] Role: owner > admin > kierownik > ksiegowa > user
- [v] RBAC: requireUserManagement, requireManagerAccess, requireAdmin, requirePermission
- [v] JWT token z hashowanym haslem
- [v] Mapowanie autorow CSV na uzytkownikow (DocumentAuthorMapping)
- [v] Ustawienia folderow per user (UserFolderSettings)
- [?] Czy jest integracja z AD/LDAP?

**Powiazania:**
- [v] User -> Orders (documentAuthorUser)
- [v] User -> DocumentAuthorMapping
- [v] User -> UserFolderSettings
- [v] User -> Notes (createdById)

---

### 29. Panel Kierownika (Manager)

**Cel:** [v] Panel kierownika produkcji. Szybki dostep do kluczowych operacji.

**Uzytkownicy:** [v] Owner, Admin, Kierownik.

**Kluczowe zakladki:** [v]
- AddToProductionTab - Dodawanie zlecen do produkcji
- CompleteOrdersTab - Zakonczanie zlecen
- TimeTrackerTab - Sledzenie czasu
- PalletsTab - Palety
- BZTab - Obecnosc (BZ)

**Typowe scenariusze:** [?]
- Jak wyglada typowy dzien kierownika korzystajacego z tego panelu?

---

### 30. Zgloszenia Bledow (Bug Reports)

**Cel:** [v] Wewnetrzny system zglaszania bledow w aplikacji.

**Uzytkownicy:** [v] Wszyscy moga zglaszac. Admin/Owner przegladaja.

**Kluczowe reguly:**
- [v] Model BugReport
- [v] Zgloszenie przez formularz w aplikacji
- [?] Czy sa priorytety zgloszen?

---

### 31. Integracja Gmail

**Cel:** [v] Automatyczny import plikow CSV z zalacznikow Gmail. Pobieranie danych logistycznych.

**Uzytkownicy:** [?] Kto konfiguruje Gmail?

**Kluczowe reguly:**
- [v] IMAP fetcher (GmailFetcher)
- [v] Scheduler co godzine (GmailScheduler)
- [v] Log pobierania (GmailFetchLog): messageUid, subject, attachmentName, status
- [?] Z jakiego konta Gmail importowane sa dane?
- [?] Jakie maile sa brane pod uwage?

---

### 32. Pogoda (Weather)

**Cel:** [v] Widget pogody na dashboardzie.

**Uzytkownicy:** [v] Wszyscy.

**Kluczowe reguly:**
- [v] WeatherWidget z hookiem useWeather()
- [?] Dlaczego pogoda jest wazna w kontekscie produkcji okien?

---

### 33. Pomoc (Help)

**Cel:** [v] Wbudowany system pomocy z generacja PDF instrukcji.

**Uzytkownicy:** [v] Wszyscy.

**Kluczowe reguly:**
- [v] Rejestr tresci pomocy (HELP_CONTENT_REGISTRY)
- [v] Generacja PDF instrukcji
- [v] Hook useHelpContent()

---

### 34. Kolory Prywatne (Private Colors)

**Cel:** [v] Zarzadzanie kolorami prywatnymi - kolorami ktore pojawiaja sie w importach ale nie sa w standardowym slowniku kolorow.

**Uzytkownicy:** [v] Admin/Owner.

**Kluczowe reguly:**
- [v] Model PrivateColor: code (unique), name
- [v] Powstaja automatycznie podczas importu uzyte_bele_prywatne
- [v] Osobne od standardowych kolorow (Color)
- [?] Czym roznia sie kolory prywatne od standardowych?

---

## Kluczowe procesy cross-modulowe

### Proces "Od importu do dostawy" [?]

```
[?] Opisz typowy cykl zycia zlecenia od poczatku do konca:

1. Import CSV -> tworzenie zlecenia
2. Sprawdzanie stanow magazynowych
3. Zamawianie brakujacych materialow
4. Start produkcji
5. Produkcja
6. Kontrola etykiet
7. Pakowanie na palety
8. Wysylka
```

### Proces inwentaryzacji [?]

```
[?] Opisz jak wyglada miesieczna inwentaryzacja:

1. Profile aluminiowe
2. Okucia (PVC + ALU)
3. Stal
4. Szyby
5. Palety
```

### Proces zamawiania materialow [?]

```
[?] Opisz jak wyglada zamawianie:

1. Skad wiadomo ze czegos brakuje?
2. Kto decyduje o zamowieniu?
3. Jakie sa czasy realizacji (profili, okuc, stali, szyb)?
4. Jak rejestruje sie dostawy materialow?
```

---

## Slownik pojec [?]

| Pojecie | Znaczenie |
|---------|-----------|
| **Bela** | [v] Pojedynczy profil aluminiowy o dlugosci 6000mm |
| **RW** | [v] Rozchod wewnetrzny - automatyczne pobranie materialow z magazynu przy zakonczeniu produkcji |
| **Gabarat** | [?] Duzy element? (okuc sizeClass: standard vs gabarat) |
| **Uzyte bele** | [v] Plik CSV z danymi o zuzytych belach w zleceniu |
| **Ceny PDF** | [v] Plik PDF z cennikiem (wartoscia zlecenia) |
| **Schuco** | [?] Dostawca okuc/profili? |
| **BZ** | [?] Skrot od...? (modul obecnosci) |
| **PSK** | [?] Typ okna - co to jest? |
| **HS** | [?] Typ okna - co to jest? |
| **CT/CT70** | [?] Typ profilu? Klient? |
| **Living** | [?] Typ profilu? Klient? |
| **Focusing** | [?] Typ profilu? |
| **VLAK** | [?] Typ profilu? |
| **BLOK** | [?] Typ profilu? |

---

## Powiazany dokument

- [CLAUDE.md](CLAUDE.md) - Kontekst techniczny dla Claude
- [PROJECT_MAP.md](PROJECT_MAP.md) - Mapa projektu (pliki, funkcje, endpointy)
- [ENUMS_REFERENCE.md](ENUMS_REFERENCE.md) - Enumy, statusy, typy
- [API_REFERENCE.md](API_REFERENCE.md) - Endpointy API
