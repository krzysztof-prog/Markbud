# Opis wszystkich tabel w bazie danych AKROBUD

Baza danych składa się z **31 tabel** podzielonych na logiczne grupy.

---

## 👤 UŻYTKOWNICY

### User (`users`)
Użytkownicy systemu - zarządzanie kontami, autoryzacja i uwierzytelnianie.

**Pola:**
- `id` - ID użytkownika
- `email` - Email (unikalny)
- `passwordHash` - Zahashowane hasło
- `name` - Imię i nazwisko
- `role` - Rola użytkownika (domyślnie: "user")
- `createdAt`, `updatedAt` - Znaczniki czasu

**Relacje:** Powiązany z notatkam, aktualizacjami magazynu, zamówieniami, historią i importami.

---

## 🏭 PROFILE ALUMINIOWE

### Profile (`profiles`)
Katalog profili aluminiowych używanych w produkcji okien.

**Pola:**
- `id` - ID profilu
- `number` - Numer profilu (unikalny)
- `articleNumber` - Numer artykułu (unikalny, opcjonalny)
- `name` - Nazwa profilu
- `description` - Opis
- `createdAt`, `updatedAt` - Znaczniki czasu

**Relacje:** ProfileColor, OrderRequirement, WarehouseStock, WarehouseHistory, WarehouseOrder

---

### Color (`colors`)
Katalog kolorów dostępnych dla profili.

**Pola:**
- `id` - ID koloru
- `code` - Kod koloru (unikalny)
- `name` - Nazwa koloru
- `type` - Typ koloru
- `hexColor` - Kod HEX koloru (opcjonalny)
- `createdAt`, `updatedAt` - Znaczniki czasu

**Relacje:** ProfileColor, OrderRequirement, WarehouseStock, WarehouseHistory, WarehouseOrder

---

### ProfileColor (`profile_colors`)
Powiązanie profil-kolor określające dostępne kombinacje.

**Pola:**
- `id` - ID powiązania
- `profileId` - ID profilu (FK)
- `colorId` - ID koloru (FK)
- `isVisible` - Czy kombinacja jest widoczna (domyślnie: true)

**Unikalne:** Para (profileId, colorId)

---

## 📋 ZLECENIA

### Order (`orders`)
Zlecenia produkcyjne - główna tabela zarządzania zamówieniami.

**Pola:**
- `id` - ID zlecenia
- `orderNumber` - Numer zlecenia (unikalny)
- `status` - Status (new, in_progress, completed, archived)
- `client` - Klient
- `project` - Projekt
- `system` - System okien
- `deadline` - Termin realizacji
- `pvcDeliveryDate` - Data dostawy PVC
- `valuePln`, `valueEur` - Wartość w PLN/EUR
- `invoiceNumber` - Numer faktury
- `deliveryDate` - Data dostawy
- `productionDate` - Data produkcji
- `glassDeliveryDate` - Data dostawy szkła
- `notes` - Notatki
- `totalWindows`, `totalSashes`, `totalGlasses` - Liczba okien/skrzydeł/szyb
- `createdAt`, `updatedAt`, `completedAt`, `archivedAt` - Znaczniki czasu

**Relacje:** OrderRequirement, OrderWindow, DeliveryOrder, Note, MonthlyReportItem

**Indeksy:** status, archivedAt, createdAt, invoiceNumber+createdAt, invoiceNumber+deliveryDate

---

### OrderRequirement (`order_requirements`)
Zapotrzebowanie na profile dla konkretnego zlecenia.

**Pola:**
- `id` - ID zapotrzebowania
- `orderId` - ID zlecenia (FK)
- `profileId` - ID profilu (FK)
- `colorId` - ID koloru (FK)
- `beamsCount` - Liczba belek
- `meters` - Metry bieżące
- `restMm` - Reszta w mm
- `createdAt` - Data utworzenia

**Unikalne:** Kombinacja (orderId, profileId, colorId)

**Indeksy:** colorId, profileId, orderId, createdAt

---

### OrderWindow (`order_windows`)
Wymiary okien w zleceniu (do optymalizacji pakowania).

**Pola:**
- `id` - ID okna
- `orderId` - ID zlecenia (FK)
- `widthMm` - Szerokość w mm
- `heightMm` - Wysokość w mm
- `profileType` - Typ profilu
- `quantity` - Ilość
- `reference` - Referencja (opcjonalna)
- `createdAt` - Data utworzenia

---

## 📦 MAGAZYN PROFILI

### WarehouseStock (`warehouse_stock`)
Aktualny stan magazynowy profili.

**Pola:**
- `id` - ID rekordu
- `profileId` - ID profilu (FK)
- `colorId` - ID koloru (FK)
- `currentStockBeams` - Aktualna liczba belek (nie może być ujemna, domyślnie: 0)
- `updatedAt` - Data aktualizacji
- `updatedById` - ID użytkownika który zaktualizował (FK)

**Unikalne:** Para (profileId, colorId)

**Indeksy:** colorId, profileId

---

### WarehouseOrder (`warehouse_orders`)
Zamówienia magazynowe profili.

**Pola:**
- `id` - ID zamówienia
- `profileId` - ID profilu (FK)
- `colorId` - ID koloru (FK)
- `orderedBeams` - Liczba zamówionych belek
- `expectedDeliveryDate` - Oczekiwana data dostawy
- `status` - Status (pending, received, cancelled)
- `notes` - Notatki
- `createdAt` - Data utworzenia
- `createdById` - ID użytkownika (FK)

**Indeksy:** status, colorId, profileId

---

### WarehouseHistory (`warehouse_history`)
Historia inwentaryzacji magazynu profili.

**Pola:**
- `id` - ID rekordu
- `profileId` - ID profilu (FK)
- `colorId` - ID koloru (FK)
- `calculatedStock` - Stan obliczony
- `actualStock` - Stan rzeczywisty
- `difference` - Różnica
- `recordedAt` - Data rekordu
- `recordedById` - ID użytkownika (FK)

**Indeksy:** colorId, profileId, recordedAt

---

## 🚚 DOSTAWY

### Delivery (`deliveries`)
Dostawy do klientów.

**Pola:**
- `id` - ID dostawy
- `deliveryDate` - Data dostawy
- `deliveryNumber` - Numer dostawy (I, II, III)
- `status` - Status (planned, loading, shipped, delivered)
- `notes` - Notatki
- `createdAt`, `updatedAt` - Znaczniki czasu

**Relacje:** DeliveryOrder, DeliveryItem, PalletOptimization

**Indeksy:** status, deliveryDate, createdAt

---

### DeliveryOrder (`delivery_orders`)
Zlecenia przypisane do dostawy.

**Pola:**
- `id` - ID powiązania
- `deliveryId` - ID dostawy (FK)
- `orderId` - ID zlecenia (FK)
- `position` - Pozycja w kolejności

**Unikalne:** Para (deliveryId, orderId)

---

### DeliveryItem (`delivery_items`)
Dodatkowe artykuły w dostawie (szyby, skrzydła, ramy).

**Pola:**
- `id` - ID pozycji
- `deliveryId` - ID dostawy (FK)
- `itemType` - Typ (glass, sash, frame, other)
- `description` - Opis
- `quantity` - Ilość
- `createdAt` - Data utworzenia

---

## 📐 OPTYMALIZACJA PALET

### PalletType (`pallet_types`)
Typy palet używanych do transportu.

**Pola:**
- `id` - ID typu
- `name` - Nazwa
- `lengthMm` - Długość w mm
- `widthMm` - Szerokość w mm
- `heightMm` - Wysokość w mm
- `loadWidthMm` - Szerokość ładunkowa w mm (domyślnie: 0)
- `createdAt`, `updatedAt` - Znaczniki czasu

---

### PackingRule (`packing_rules`)
Reguły pakowania okien na palety.

**Pola:**
- `id` - ID reguły
- `name` - Nazwa reguły
- `description` - Opis
- `isActive` - Czy aktywna (domyślnie: true)
- `ruleConfig` - Konfiguracja JSON
- `createdAt`, `updatedAt` - Znaczniki czasu

---

### PalletOptimization (`pallet_optimizations`)
Wyniki optymalizacji pakowania dla dostawy.

**Pola:**
- `id` - ID optymalizacji
- `deliveryId` - ID dostawy (FK, unikalny)
- `totalPallets` - Całkowita liczba palet
- `optimizationData` - Pełne dane JSON z wynikiem
- `createdAt`, `updatedAt` - Znaczniki czasu

**Indeksy:** deliveryId

---

### OptimizedPallet (`optimized_pallets`)
Szczegóły każdej zoptymalizowanej palety.

**Pola:**
- `id` - ID palety
- `optimizationId` - ID optymalizacji (FK)
- `palletNumber` - Numer palety
- `palletTypeName` - Nazwa typu palety
- `palletWidth` - Szerokość palety
- `usedDepthMm` - Wykorzystana głębokość w mm
- `maxDepthMm` - Maksymalna głębokość w mm
- `utilizationPercent` - Procent wykorzystania
- `windowsData` - JSON z listą okien na palecie

**Indeksy:** optimizationId

---

## 🔩 MAGAZYN OKUĆ

### OkucArticle (`okuc_articles`)
Katalog artykułów okuć okiennych.

**Pola:**
- `id` - ID artykułu
- `articleNumber` - Numer artykułu (unikalny)
- `name` - Nazwa
- `description` - Opis
- `group` - Grupa (domyślnie: "UCHWYTY")
- `warehouse` - Magazyn
- `price` - Cena (domyślnie: 0)
- `priceHistory` - Historia cen
- `minStock` - Minimalny stan (domyślnie: 0)
- `maxStock` - Maksymalny stan (domyślnie: 100)
- `avgMonthlyUsage` - Średnie zużycie miesięczne (domyślnie: 0)
- `proportion` - Proporcja (domyślnie: 1.0)
- `doNotOrder` - Nie zamawiać (domyślnie: false)
- `hidden` - Ukryty (domyślnie: false)
- `orderType` - Typ zamówienia (domyślnie: "Po RW")
- `packageSize` - Wielkość opakowania (domyślnie: 1.0)
- `notes` - Notatki
- `alternativeNumbers` - Alternatywne numery
- `createdAt`, `updatedAt` - Znaczniki czasu

**Relacje:** OkucStock, OkucOrder, OkucRequirement, OkucHistory, OkucProductImage

**Indeksy:** group, warehouse

---

### OkucStock (`okuc_stock`)
Aktualny stan magazynowy okuć.

**Pola:**
- `id` - ID rekordu
- `articleId` - ID artykułu (FK, unikalny)
- `currentQuantity` - Aktualna ilość (nie może być ujemna, domyślnie: 0)
- `status` - Status (domyślnie: "OK")
- `updatedAt` - Data aktualizacji
- `updatedById` - ID użytkownika (FK)

---

### OkucOrder (`okuc_orders`)
Zamówienia okuć.

**Pola:**
- `id` - ID zamówienia
- `articleId` - ID artykułu (FK)
- `orderedQuantity` - Zamówiona ilość
- `expectedDeliveryDate` - Oczekiwana data dostawy
- `status` - Status (domyślnie: "pending")
- `notes` - Notatki
- `createdAt` - Data utworzenia
- `createdById` - ID użytkownika (FK)

**Indeksy:** status, articleId

---

### OkucRequirement (`okuc_requirements`)
Zapotrzebowanie na okucia z dokumentów RW/PW.

**Pola:**
- `id` - ID zapotrzebowania
- `articleId` - ID artykułu (FK)
- `documentType` - Typ dokumentu (RW/PW)
- `documentNumber` - Numer dokumentu
- `quantity` - Ilość
- `sourceGroup` - Grupa źródłowa
- `sourceFile` - Plik źródłowy
- `recordedAt` - Data zapisu
- `recordedById` - ID użytkownika (FK)

**Indeksy:** articleId, documentType, documentNumber, recordedAt

---

### OkucHistory (`okuc_history`)
Historia remanentów okuć.

**Pola:**
- `id` - ID rekordu
- `articleId` - ID artykułu (FK)
- `calculatedStock` - Stan obliczony
- `actualStock` - Stan rzeczywisty
- `difference` - Różnica
- `remanentNumber` - Numer remanentu
- `recordedAt` - Data zapisu
- `recordedById` - ID użytkownika (FK)

**Indeksy:** articleId, recordedAt

---

### OkucImport (`okuc_imports`)
Logi importu plików okuć.

**Pola:**
- `id` - ID importu
- `filename` - Nazwa pliku
- `fileType` - Typ pliku
- `status` - Status (domyślnie: "pending")
- `processedAt` - Data przetworzenia
- `errorMessage` - Komunikat błędu
- `importedRows` - Liczba zaimportowanych wierszy (domyślnie: 0)
- `previewData` - Podgląd danych
- `createdAt` - Data utworzenia
- `createdById` - ID użytkownika (FK)

**Indeksy:** status, createdAt

---

### OkucProductImage (`okuc_product_images`)
Zdjęcia produktów okuć.

**Pola:**
- `id` - ID zdjęcia
- `articleId` - ID artykułu (FK)
- `imageUrl` - URL zdjęcia
- `createdAt` - Data utworzenia

---

### OkucSettings (`okuc_settings`)
Ustawienia magazynu okuć.

**Pola:**
- `id` - ID ustawień
- `eurPlnRate` - Kurs EUR/PLN (domyślnie: 4.35)
- `defaultDeliveryTime` - Domyślny czas dostawy w dniach (domyślnie: 1)
- `averageFromDate` - Data od której liczyć średnie

---

## 🏭 DOSTAWY SCHÜCO

### SchucoDelivery (`schuco_deliveries`)
Zamówienia i dostawy ze Schüco Connect.

**Pola:**
- `id` - ID dostawy
- `orderDate` - Data zamówienia (DD.MM.YYYY)
- `orderDateParsed` - Data sparsowana do DateTime
- `orderNumber` - Nr zamówienia (unikalny)
- `projectNumber` - Numer projektu
- `orderName` - Zlecenie
- `shippingStatus` - Status wysyłki
- `deliveryWeek` - Tydzień dostawy
- `deliveryType` - Rodzaj dostawy
- `tracking` - Tracking
- `complaint` - Reklamacja
- `orderType` - Rodzaj zamówienia
- `totalAmount` - Suma
- `rawData` - Cały wiersz jako backup JSON
- `changeType` - Typ zmiany (new, updated, null)
- `changedAt` - Kiedy wykryto zmianę
- `changedFields` - JSON lista zmienionych pól
- `previousValues` - JSON poprzednich wartości
- `fetchedAt` - Data pobrania
- `createdAt`, `updatedAt` - Znaczniki czasu

**Indeksy:** fetchedAt, orderNumber, orderDate, orderDateParsed, changeType, changedAt

---

### SchucoFetchLog (`schuco_fetch_logs`)
Logi pobierania danych ze Schüco.

**Pola:**
- `id` - ID logu
- `status` - Status (success, error, pending)
- `triggerType` - Typ wyzwalacza (manual, scheduled)
- `recordsCount` - Liczba rekordów
- `newRecords` - Liczba nowych rekordów
- `updatedRecords` - Liczba zaktualizowanych
- `unchangedRecords` - Liczba bez zmian
- `errorMessage` - Komunikat błędu
- `startedAt` - Data rozpoczęcia
- `completedAt` - Data zakończenia
- `durationMs` - Czas trwania w ms

**Indeksy:** startedAt, triggerType

---

## 📊 ZESTAWIENIA MIESIĘCZNE

### MonthlyReport (`monthly_reports`)
Raporty miesięczne - zestawienia zleceń.

**Pola:**
- `id` - ID raportu
- `year` - Rok
- `month` - Miesiąc (1-12)
- `reportDate` - Data wygenerowania raportu
- `totalOrders` - Całkowita liczba zleceń (domyślnie: 0)
- `totalWindows` - Całkowita liczba okien (domyślnie: 0)
- `totalSashes` - Całkowita liczba skrzydeł (domyślnie: 0)
- `totalValuePln` - Całkowita wartość PLN (domyślnie: 0)
- `totalValueEur` - Całkowita wartość EUR (domyślnie: 0)
- `createdAt`, `updatedAt` - Znaczniki czasu

**Unikalne:** Para (year, month)

**Indeksy:** (year, month), reportDate

---

### MonthlyReportItem (`monthly_report_items`)
Pozycje raportu miesięcznego - szczegóły zleceń.

**Pola:**
- `id` - ID pozycji
- `reportId` - ID raportu (FK)
- `orderId` - ID zlecenia (FK)
- `orderNumber` - Numer zlecenia
- `invoiceNumber` - Numer faktury
- `windowsCount` - Liczba okien (domyślnie: 0)
- `sashesCount` - Liczba skrzydeł (domyślnie: 0)
- `unitsCount` - Liczba jednostek (domyślnie: 0)
- `valuePln` - Wartość PLN
- `valueEur` - Wartość EUR
- `createdAt` - Data utworzenia

**Indeksy:** reportId, orderId

---

### CurrencyConfig (`currency_config`)
Konfiguracja kursów walut.

**Pola:**
- `id` - ID konfiguracji
- `eurToPlnRate` - Kurs EUR/PLN
- `effectiveDate` - Data obowiązywania
- `createdAt`, `updatedAt` - Znaczniki czasu

**Indeksy:** effectiveDate

---

## ⚙️ POZOSTAŁE

### FileImport (`file_imports`)
Logi importu plików (ogólne).

**Pola:**
- `id` - ID importu
- `filename` - Nazwa pliku
- `filepath` - Ścieżka do pliku
- `fileType` - Typ pliku
- `status` - Status (domyślnie: "pending")
- `processedAt` - Data przetworzenia
- `errorMessage` - Komunikat błędu
- `metadata` - Metadane
- `createdAt`, `updatedAt` - Znaczniki czasu

**Indeksy:** status, createdAt

---

### Setting (`settings`)
Ustawienia systemowe klucz-wartość.

**Pola:**
- `key` - Klucz (PK)
- `value` - Wartość
- `updatedAt` - Data aktualizacji

---

### Note (`notes`)
Notatki przypisane do zleceń.

**Pola:**
- `id` - ID notatki
- `orderId` - ID zlecenia (FK, opcjonalne)
- `content` - Treść notatki
- `createdAt`, `updatedAt` - Znaczniki czasu
- `createdById` - ID użytkownika (FK)

---

### WorkingDay (`working_days`)
Dni wolne i robocze (kalendarz).

**Pola:**
- `id` - ID dnia
- `date` - Data (unikalna)
- `isWorking` - Czy dzień roboczy (domyślnie: true, false = dzień wolny)
- `description` - Opis (np. "Boże Narodzenie")
- `isHoliday` - Czy święto (domyślnie: false)
- `country` - Kraj (PL lub DE)
- `createdAt`, `updatedAt` - Znaczniki czasu

---

## 📈 Podsumowanie

**Łącznie: 31 tabel**

- **Użytkownicy:** 1 tabela
- **Profile aluminiowe:** 3 tabele
- **Zlecenia:** 3 tabele
- **Magazyn profili:** 3 tabele
- **Dostawy:** 3 tabele
- **Optymalizacja palet:** 4 tabele
- **Magazyn okuć:** 8 tabel
- **Dostawy Schüco:** 2 tabele
- **Zestawienia miesięczne:** 3 tabele
- **Pozostałe:** 4 tabele