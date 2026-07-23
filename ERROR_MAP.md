# Error Map - AKROBUD

Mapa wszystkich komunikatow bledow w systemie z lokalizacja w kodzie zrodlowym.
Ostatnia aktualizacja: 2026-02-24

---

## Spis tresci

1. [Klasy bledow i middleware](#error-classes--middleware)
2. [Backend Errors - Autentykacja i Autoryzacja](#backend---autentykacja-i-autoryzacja)
3. [Backend Errors - Handlery](#backend---handlery)
4. [Backend Errors - Serwisy](#backend---serwisy)
5. [Backend Errors - Repozytoria](#backend---repozytoria)
6. [Backend Errors - Walidacja i Utility](#backend---walidacja-i-utility)
7. [Backend Errors - Parsery](#backend---parsery)
8. [Backend Errors - Error Handler Middleware (generyczne)](#backend---error-handler-middleware)
9. [Backend Errors - Prisma (baza danych)](#backend---prisma-baza-danych)
10. [Frontend Errors - Toast Messages](#frontend---toast-messages)
11. [Frontend Errors - Centralne komunikaty bledow](#frontend---centralne-komunikaty-bledow)
12. [Frontend Errors - Feature-specific toasty](#frontend---feature-specific-toasty)
13. [Typowe scenariusze debugowania](#typowe-scenariusze-debugowania)

---

## Error Classes & Middleware

### Klasy bledow (`apps/api/src/utils/errors.ts`)

| Klasa | HTTP Code | Kod | Opis |
|-------|-----------|-----|------|
| `AppError` | 500 (domyslny) | - | Bazowa klasa bledow |
| `ValidationError` | 400 | `VALIDATION_ERROR` | Blad walidacji danych |
| `NotFoundError` | 404 | `NOT_FOUND` | Zasob nie znaleziony (format: `"${resource} nie znaleziono"`) |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` | Brak autoryzacji |
| `ForbiddenError` | 403 | `FORBIDDEN` | Brak uprawnien |
| `ConflictError` | 409 | `CONFLICT` | Konflikt danych (np. duplikat) |
| `InternalServerError` | 500 | `INTERNAL_SERVER_ERROR` | Blad wewnetrzny serwera |
| `DatabaseError` | 500 | `DATABASE_ERROR` | Blad bazy danych |

### Dodatkowe klasy bledow

| Klasa | Plik | Opis |
|-------|------|------|
| `OptimisticLockError` | `apps/api/src/utils/optimistic-locking.ts:10` | Konflikt wersji przy jednoczesnej edycji |

### Helper: `parseIntParam` (`apps/api/src/utils/errors.ts:93`)

Rzuca `ValidationError`: `"${paramName} musi byc liczba calkowita"`

---

## Backend - Autentykacja i Autoryzacja

### Middleware auth (`apps/api/src/middleware/auth.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Brak tokenu autoryzacji` | 401 | UnauthorizedError | 25 |
| `Nieprawidlowy lub wygasly token` | 401 | UnauthorizedError | 31 |

### Handler auth (`apps/api/src/handlers/authHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nieprawidlowy email lub haslo` | 401 | UnauthorizedError | 32 |
| `Nie jestes zalogowany` | 401 | UnauthorizedError | 70 |
| `Uzytkownik nie znaleziono` | 404 | NotFoundError | 76 |

### Middleware role-check (`apps/api/src/middleware/role-check.ts`)

| Komunikat | HTTP Code | Klasa | Linia | Kontekst |
|-----------|-----------|-------|-------|----------|
| `Brak autoryzacji. Zaloguj sie ponownie.` | 401 | UnauthorizedError | 50, 83, 116, 146 | Brak userId w req |
| `Uzytkownik nie istnieje.` | 401 | UnauthorizedError | 63, 96, 129, 158 | User nie w bazie |
| `Brak uprawnien. Tylko wlasciciel i administrator moga zarzadzac uzytkownikami.` | 403 | ForbiddenError | 67 | requireUserManagement |
| `Brak uprawnien. Tylko wlasciciel, administrator i kierownik maja dostep do tego panelu.` | 403 | ForbiddenError | 100 | requireManagerAccess |
| `Dostep tylko dla administratorow.` | 403 | ForbiddenError | 133 | requireAdmin |
| `Brak uprawnien. Ta akcja wymaga uprawnienia: ${permission}` | 403 | ForbiddenError | 162 | requirePermission |

---

## Backend - Handlery

### deliveryHandler (`apps/api/src/handlers/deliveryHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nieprawidlowy rok lub miesiac` | 400 | ValidationError | 175 |
| `Parametr months jest wymagany` | 400 | ValidationError | 189 |
| `Nieprawidlowy format JSON w parametrze months` | 400 | ValidationError | 198 |
| `Parametr months musi byc niepusta tablica` | 400 | ValidationError | 204 |
| `Nieprawidlowy parametr months (musi byc miedzy 1 a 60)` | 400 | ValidationError | 227, 241, 255 |
| `Lista numerow zlecen jest pusta` | 400 | ValidationError | 327 |
| `Parametr date jest wymagany` | 400 | ValidationError | 374, 393 |

### orderHandler (`apps/api/src/handlers/orderHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Tylko administrator lub kierownik moze usuwac zlecenia` | 403 | ForbiddenError | 132 |
| `Brak identyfikatora uzytkownika` | 403 | ForbiddenError | 139 |
| `Tylko administrator lub kierownik moze cofac produkcje` | 403 | ForbiddenError | 191 |

### steelHandler (`apps/api/src/handlers/steelHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nieprawidlowe ID` | 400 | AppError | 34, 59, 76, 101, 117 |

### settingsHandler (`apps/api/src/handlers/settingsHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Invalid pallet type ID` | 400 | ValidationError | 65, 77 |
| `Invalid packing rule ID` | 400 | ValidationError | 100, 123 |
| `Brak autoryzacji` | 401 | UnauthorizedError | 135, 149 |
| `authorName i userId sa wymagane` | 400 | ValidationError | 170 |
| `Invalid document author mapping ID` | 400 | ValidationError | 183, 196 |

### productionReportHandler (`apps/api/src/handlers/productionReportHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Brak uprawnien do wykonania tej operacji` | 403 | ForbiddenError | 45 |
| `orderId musi byc liczba calkowita` | 400 | ValidationError | 65 |
| `Pole verified musi byc typu boolean` | 400 | ValidationError | 146 |
| `Brak parametru sourceOrderId` | 400 | ValidationError | 264 |
| `Brak lub nieprawidlowy parametr sourceOrderId` | 400 | ValidationError | 291 |
| `Brak lub nieprawidlowy parametr invoiceNumber` | 400 | ValidationError | 294 |
| `Kurs EUR musi byc dodatnia liczba` | 400 | ValidationError | 327 |

### glassOrderHandler (`apps/api/src/handlers/glassOrderHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Zamowienie szklane nie znaleziono` | 404 | NotFoundError | 23 |
| `Brak pliku` | 400 | ValidationError | 33 |

### glassDeliveryHandler (`apps/api/src/handlers/glassDeliveryHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Dostawa szklana nie znaleziono` | 404 | NotFoundError | 23 |
| `Brak pliku` | 400 | ValidationError | 34 |

### importHandler (`apps/api/src/handlers/importHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Brak pliku` | 400 | ValidationError | 31 |
| `Brak ID do przetworzenia` | 400 | ValidationError | 268 |

### schucoHandler (`apps/api/src/handlers/schucoHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Blad odswiezania dostaw Schuco` | 500 | InternalServerError | 50 |
| `Historia pobierania nie znaleziono` | 404 | NotFoundError | 62 |

### palletHandler (`apps/api/src/handlers/palletHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Optymalizacja nie znaleziono` | 404 | NotFoundError | 56, 89 |

### logisticsHandler (`apps/api/src/handlers/logisticsHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Brak autoryzacji` | 403 | ForbiddenError | 28 |
| `Lista mailowa o ID ${id} nie znaleziono` | 404 | NotFoundError | 90 |
| `Lista mailowa dla kodu ${code} nie znaleziono` | 404 | NotFoundError | 134 |

### mojaPracaHandler (`apps/api/src/handlers/mojaPracaHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nieprawidlowy format daty` | 400 | ValidationError | 21 |
| `Brak autoryzacji` | 403 | ForbiddenError | 30 |
| `Konflikt nie zostal znaleziony nie znaleziono` | 404 | NotFoundError | 77 |

### profilePalletConfigHandler (`apps/api/src/handlers/profilePalletConfigHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Przelicznik palety nie znaleziono` | 404 | NotFoundError | 38 |

### profileDepthHandler (`apps/api/src/handlers/profileDepthHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Glebokosc profilu nie znaleziono` | 404 | NotFoundError | 38 |

### helpHandler (`apps/api/src/handlers/helpHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Instrukcja dla strony '${pageId}' nie znaleziono` | 404 | NotFoundError | 33 |

### pendingOrderPriceCleanupHandler (`apps/api/src/handlers/pendingOrderPriceCleanupHandler.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Czyszczenie nie powiodlo sie: ...` | 500 | InternalServerError | 75 |

---

## Backend - Serwisy

### orderService (`apps/api/src/services/orderService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Order nie znaleziono` | 404 | NotFoundError | 50, 60 |
| `Orders with IDs ... not found` | 404 | NotFoundError | 480, 877 |
| (walidacje statusu zamowien) | 400 | ValidationError | 198, 369, 382, 508, 885 |
| `Year must be between 2000 and 2100` | 400 | ValidationError | 988 |
| `Month must be between 1 and 12` | 400 | ValidationError | 991 |
| `Nie znaleziono uzytkownika o ID ${id}` | 500 | Error | 1070 |

### deliveryService (`apps/api/src/services/delivery/DeliveryService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Delivery nie znaleziono` | 404 | NotFoundError | 97, 270, 300, 488 |
| `Nie mozna wyslac dostawy - weryfikacja palet nie powiodla sie` | 400 | ValidationError | 154 |

### DeliveryOrderService (`apps/api/src/services/delivery/DeliveryOrderService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Order nie znaleziono` | 404 | NotFoundError | 95, 154 |
| `Zlecenie ${nr} jest wariantem (ma sufix "...")...` | 400 | ValidationError | 101 |
| `Lista zlecen zawiera duplikaty` | 400 | ValidationError | 245 |
| `Nastepujace zlecenia nie naleza do tej dostawy: ...` | 400 | ValidationError | 254 |
| `Lista zlecen jest niepelna...` | 400 | ValidationError | 261 |
| `Zlecenie ${nr} jest wariantem zlecenia ${nr}...` | 400 | ValidationError | 375 |
| `Zlecenie ${nr} jest korekta zlecenia ${nr}...` | 400 | ValidationError | 405 |

### QuickDeliveryService (`apps/api/src/services/delivery/QuickDeliveryService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Lista numerow zlecen jest pusta` | 400 | ValidationError | 110 |
| `Musisz podac deliveryId (istniejaca dostawa) lub deliveryDate (nowa dostawa)` | 400 | ValidationError | 341 |
| `Delivery nie znaleziono` | 404 | NotFoundError | 356 |

### DeliveryOptimizationService (`apps/api/src/services/delivery/DeliveryOptimizationService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Delivery not ready for optimization: ...` | 400 | ValidationError | 84 |

### steelService (`apps/api/src/services/steelService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nie znaleziono stali o ID ${id}` | 404 | AppError | 29, 81, 116, 156 |
| `Stal o numerze "${nr}" juz istnieje` | 400 | AppError | 55, 88 |
| (bledy aktualizacji stali) | 500 | AppError | 64, 99 |
| `Stal jest powiazana z istniejacymi stanami...` | 409 | AppError | 122 |
| `Nie znaleziono stanu magazynowego dla stali ${id}` | 404 | AppError | 144 |

### colorService (`apps/api/src/services/colorService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Color nie znaleziono` | 404 | NotFoundError | 30 |
| `Color with this code already exists` | 409 | ConflictError | 41 |

### profileService (`apps/api/src/services/profileService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Profile nie znaleziono` | 404 | NotFoundError | 26 |
| `Profile with this number already exists` | 409 | ConflictError | 37 |
| `Profil z tym numerem artykulu juz istnieje` | 409 | ConflictError | 44, 71 |
| (blad usuwania profilu z powiazaniami) | 409 | ConflictError | 111 |

### glassOrderService (`apps/api/src/services/glassOrderService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Zamowienie ${nr} juz istnieje` | 409 | ConflictError | 28 |
| `Zamowienie nie istnieje` | 500 | Error | 355, 443 |

### productionReportService (`apps/api/src/services/productionReportService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `ProductionReport nie znaleziono` | 404 | NotFoundError | 340, 375, 401, 430, 476, 595 |
| `Zlecenie nie znalezione w raporcie nie znaleziono` | 404 | NotFoundError | 534 |
| `Zlecenie nie ma przypisanej daty dostawy` | 400 | ValidationError | 538 |
| `Rok musi byc miedzy 2000 a 2100` | 400 | ValidationError | 656 |
| `Miesiac musi byc miedzy 1 a 12` | 400 | ValidationError | 659 |
| (konflikty raportow - juz zweryfikowane/zatwierdzone) | 409 | ConflictError | 348, 406, 435, 456, 480 |
| (walidacja okresu raportu) | 400 | ValidationError | 640 |

### AkrobudVerificationService (`apps/api/src/services/akrobud-verification/AkrobudVerificationService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Lista weryfikacyjna nie znaleziono` | 404 | NotFoundError | 201, 226, 238, 263, 356, 373, 392, 477, 779, 882 |
| `Lista weryfikacyjna 1 nie znaleziono` | 404 | NotFoundError | 815 |
| `Lista weryfikacyjna 2 nie znaleziono` | 404 | NotFoundError | 818 |
| `Element listy nie znaleziono` | 404 | NotFoundError | 361 |
| `Dostawa nie znaleziono` | 404 | NotFoundError | 492 |
| `Lista rodzica nie znaleziono` | 404 | NotFoundError | 649 |
| `Lista nie jest polaczona z dostawa. Najpierw uruchom weryfikacje.` | 400 | ValidationError | 481 |

### attendanceService (`apps/api/src/services/attendanceService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Pracownik nie istnieje` | 400 | ValidationError | 191 |
| `Mozna edytowac tylko biezacy miesiac` | 400 | ValidationError | 206 |
| `Brak stanowisk w systemie. Dodaj przynajmniej jedno stanowisko.` | 400 | ValidationError | 241 |

### palletStockService (`apps/api/src/services/palletStockService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nieprawidlowy typ palety: ${type}` | 400 | ValidationError | 173, 541, 626, 994 |
| `Stan poczatkowy nie moze byc ujemny` | 400 | ValidationError | 176 |
| `Ten dzien jest zamkniety i nie mozna go edytowac` | 400 | ValidationError | 530, 643 |
| (editBlockReason lub domyslny) | 400 | ValidationError | 535, 648 |
| `Wartosc "uzyte" nie moze byc ujemna` | 400 | ValidationError | 544 |
| `Stan poranny nie moze byc ujemny` | 400 | ValidationError | 547, 635 |
| `Nie znaleziono wpisu dla typu: ${type}` | 400 | ValidationError | 557, 654 |
| `Dzien paletowy nie znaleziono` | 404 | NotFoundError | 584, 699, 1080 |
| `Komentarz do korekty musi miec minimum 3 znaki` | 400 | ValidationError | 631 |
| `Ten dzien jest juz zamkniety` | 400 | ValidationError | 703 |
| `Miesiac musi byc w zakresie 1-12` | 400 | ValidationError | 748, 844 |
| `Rok musi byc w zakresie 2020-2100` | 400 | ValidationError | 751, 847 |
| `Prog alertu nie moze byc ujemny` | 400 | ValidationError | 997 |
| `Nieprawidlowy format daty` | 400 | ValidationError | 1216, 1237, 1253, 1268, 1332 |

### importLockService (`apps/api/src/services/importLockService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| (import lock - folder importowany przez innego) | 409 | ConflictError | 101, 163 |
| `Folder jest obecnie importowany przez innego uzytkownika` | 409 | ConflictError | 169 |

### OkucStockService (`apps/api/src/services/okuc/OkucStockService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Stock nie znaleziono` | 404 | NotFoundError | 105, 116 |
| `Stock not found or version mismatch` | 404 | NotFoundError | 136, 151 |
| `Plik CSV jest pusty lub zawiera tylko naglowek` | 400 | ValidationError | 181 |
| `Brak pozycji do importu` | 400 | ValidationError | 342 |

### OkucArticleService (`apps/api/src/services/okuc/OkucArticleService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Article nie znaleziono` | 404 | NotFoundError | 92, 103, 122, 133, 145 |
| `Plik CSV jest pusty lub zawiera tylko naglowek` | 400 | ValidationError | 164 |
| `Brak artykulow do importu` | 400 | ValidationError | 284 |
| `Brak artykulow do aktualizacji` | 400 | ValidationError | 404 |

### OkucLocationService (`apps/api/src/services/okuc/OkucLocationService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Location nie znaleziono` | 404 | NotFoundError | 73, 107, 132 |

### ArticleReplacementService (`apps/api/src/services/okuc/ArticleReplacementService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Artykul do wygaszenia nie zostal znaleziony` | 404 | NotFoundError | 94 |
| (blad walidacji zamiennika) | 400 | ValidationError | 104 |
| `Artykul nie zostal znaleziony` | 404 | NotFoundError | 167 |
| `Artykul nie jest wygaszany lub nie ma przypisanego zamiennika` | 400 | ValidationError | 171 |

### OkucOrderImportService (`apps/api/src/services/okuc/OkucOrderImportService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Plik XLSX nie zawiera zadnego arkusza` | 500 | Error | 37 |
| `Plik XLSX nie zawiera zadnych poprawnych pozycji zamowienia` | 500 | Error | 92 |
| (duplikaty artykulow w XLSX) | 500 | Error | 97, 250 |

### userService (`apps/api/src/services/userService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Uzytkownik z tym emailem juz istnieje` | 500 | Error | 74 |
| `Uzytkownik nie istnieje` | 500 | Error | 114, 175, 218 |
| `Email jest juz zajety` | 500 | Error | 128 |
| `Nie mozesz usunac samego siebie` | 500 | Error | 180 |
| `Nie mozna usunac ostatniego administratora/wlasciciela systemu` | 500 | Error | 194 |
| `Uzytkownik nie jest usuniety` | 500 | Error | 222 |

### WarehouseStockService (`apps/api/src/services/warehouse/WarehouseStockService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Color nie znaleziono` | 404 | NotFoundError | 77 |
| `Stan magazynu nie moze byc ujemny` | 400 | ValidationError | 227 |
| `Stan magazynu musi byc liczba skonczona` | 400 | ValidationError | 231 |
| `Stock record not found for profile ${id} and color ${id}` | 404 | NotFoundError | 250 |
| (walidacje wersji optimistic lock) | 400 | ValidationError | 255 |

### LogisticsMailService (`apps/api/src/services/logistics/LogisticsMailService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nie znaleziono wersji ${v1} lub ${v2} dla ${code}` | 500 | Error | 581 |
| `Nieznane pole do przywrocenia: ${field}` | 500 | Error | 829 |
| `Zlecenie o ID ${id} nie znaleziono` | 404 | NotFoundError | 941, 1213 |
| `Zlecenie ${nr} nie ma ustawionej daty dostawy` | 400 | ValidationError | 1217 |
| `Nieprawidlowy format kodu dostawy: ${code}` | 400 | ValidationError | 1254 |
| `Nieprawidlowa data w kodzie dostawy: ${code}` | 400 | ValidationError | 1260 |
| `Nieprawidlowy index dostawy: ${index}` | 400 | ValidationError | 1270 |

### currencyConfigService (`apps/api/src/services/currencyConfigService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `No currency configuration found. Please set exchange rate first.` | 500 | Error | 105, 118 |

### operatorDashboardService (`apps/api/src/services/operatorDashboardService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Uzytkownik nie istnieje` | 500 | Error | 39 |

### monthlyReportService (`apps/api/src/services/monthlyReportService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Invalid year: ${year}...` | 500 | Error | 44 |
| `Invalid month: ${month}...` | 500 | Error | 47 |
| `Cannot generate report for future month` | 500 | Error | 56 |

### ImportOrchestrator (`apps/api/src/services/import/ImportOrchestrator.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Import nie znaleziono` | 404 | NotFoundError | 121 |
| `File nie znaleziono` | 404 | NotFoundError | 246, 452 |
| `Nieobslugiwany typ pliku` | 400 | ValidationError | 277 |
| (import lock - folder blokowany) | 409 | ConflictError | 332 |
| `Nie mozna zalokowac folderu do importu` | 409 | ConflictError | 336 |
| `Variant conflict detected - resolution required` | 400 | ValidationError | 462 |

### importFileSystemService (`apps/api/src/services/import/importFileSystemService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Folder musi znajdowac sie w dozwolonej lokalizacji` | 403 | ForbiddenError | 127 |
| `Folder nie znaleziono` | 404 | NotFoundError | 140 |
| `Sciezka nie jest folderem` | 400 | ValidationError | 145 |

### importValidationService (`apps/api/src/services/import/importValidationService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Import nie znaleziono` | 404 | NotFoundError | 171 |
| (blad walidacji importu) | 400 | ValidationError | 179 |
| `Brak numeru zlecenia w pliku CSV` | 400 | ValidationError | 298 |
| `Blad parsowania pliku CSV: ${msg}` | 400 | ValidationError | 315, 340 |
| `Brak numeru zlecenia w pliku PDF` | 400 | ValidationError | 372 |
| `Brak lub nieprawidlowa wartosc netto w pliku PDF` | 400 | ValidationError | 376 |
| `Blad parsowania pliku PDF: ${msg}` | 400 | ValidationError | 393 |
| `Brak daty w nazwie folderu` | 400 | ValidationError | 411 |
| `Brak plikow CSV` | 400 | ValidationError | 417 |

### importConflictService (`apps/api/src/services/import/importConflictService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nieznany typ rozwiazania konfliktu` | 400 | ValidationError | 169 |
| `Nie znaleziono zlecenia do zastapienia: ${nr}` | 400 | ValidationError | 198 |
| (blad rozwiazywania konfliktu) | 400 | ValidationError | 214 |
| `Blad usuwania starszych wariantow: ${err}` | 400 | ValidationError | 295 |

### importTransactionService (`apps/api/src/services/import/importTransactionService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Blad aktualizacji statusu importu: ${msg}` | 500 | DatabaseError | 135 |

### UzyteBeleProcessor (`apps/api/src/services/import/UzyteBeleProcessor.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Brak daty w nazwie folderu` | 400 | ValidationError | 280 |
| `Brak plikow CSV` | 400 | ValidationError | 289 |

### excelImportService (`apps/api/src/services/import/parsers/excelImportService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Plik nie istnieje: ${filepath}` | 404 | AppError | 113 |
| `Nieprawidlowy format pliku: ${ext}. Oczekiwano: xlsx lub xls` | 400 | AppError | 119 |
| (blad odczytu pliku Excel) | 500 | AppError | 125 |

### PalletOptimizerService (`apps/api/src/services/pallet-optimizer/PalletOptimizerService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Delivery has no windows to optimize` | 400 | ValidationError | 125 |
| `No profile depths configured in database` | 400 | ValidationError | 132 |
| `No pallet types defined in database` | 400 | ValidationError | 139 |
| (brak config dla profilu) | 400 | ValidationError | 233 |
| `Window width must be positive (order: ${nr})` | 400 | ValidationError | 533 |
| `Window height must be positive (order: ${nr})` | 400 | ValidationError | 537 |
| `Window quantity must be positive (order: ${nr})` | 400 | ValidationError | 541 |
| `Unknown profile type: ${type} - please configure it in settings` | 400 | ValidationError | 556 |

### LabelCheckService (`apps/api/src/services/label-check/LabelCheckService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Delivery not found: ${id}` | 500 | Error | 111 |
| `Brak zlecen w dostawie: ${id}` | 500 | Error | 115 |

### OcrService (`apps/api/src/services/label-check/OcrService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Plik nie istnieje: ${path}` | 500 | Error | 53 |
| `Nie mozna wczytac obrazu: ${msg}` | 500 | Error | 62 |
| (blad przetwarzania OCR) | 500 | Error | 73 |

### HelpPdfService (`apps/api/src/services/help/HelpPdfService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Brak tresci instrukcji dla strony: ${pageId}` | 500 | Error | 650 |

### File Watchers (`apps/api/src/services/file-watcher/OkucZapotrzebowaWatcher.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nie mozna wyodrebnic numeru zlecenia z nazwy pliku: ${name}` | 500 | Error | 213 |
| `Plik CSV jest pusty - brak jakiejkolwiek zawartosci` | 500 | Error | 239 |

### Schuco scraper (`apps/api/src/services/schuco/schucoScraper.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| (bledy inicjalizacji przegladarki) | 500 | Error | 28, 188 |
| `Browser not initialized` | 500 | Error | 200, 238, 348, 427, 933 |
| `Login submit button not found` | 500 | Error | 308 |
| `Orders page content not found` | 500 | Error | 402 |
| `Download button not found` | 500 | Error | 991 |
| `No CSV file was downloaded` | 500 | Error | 1023 |
| `Download timeout after ${ms}ms` | 500 | Error | 1053 |

### Schuco item service (`apps/api/src/services/schuco/schucoItemService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Item fetch already in progress` | 500 | Error | 221, 279, 322, 379, 772 |
| `Could not get page from scraper...` | 500 | Error | 478 |

---

## Backend - Repozytoria

### WarehouseRepository (`apps/api/src/repositories/WarehouseRepository.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| (version mismatch - optimistic lock) | 500 | OptimisticLockError | 92 |

### PalletOptimizerRepository (`apps/api/src/repositories/PalletOptimizerRepository.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Delivery nie znaleziono` | 404 | NotFoundError | 59 |
| `Invalid JSON data in pallet ${nr}: ${error}` | 500 | Error | 148 |
| `Pallet type nie znaleziono` | 404 | NotFoundError | 250, 268, 283 |

### SteelRepository (`apps/api/src/repositories/SteelRepository.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nie znaleziono stanu magazynowego dla stali ${id}` | 500 | Error | 158 |

### OkucProportionRepository (`apps/api/src/repositories/okuc/OkucProportionRepository.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Proportion between these articles already exists` | 500 | Error | 121 |

### OkucOrderRepository (`apps/api/src/repositories/okuc/OkucOrderRepository.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Order ${id} not found after update` | 500 | Error | 354 |

---

## Backend - Walidacja i Utility

### delivery-status-machine (`apps/api/src/utils/delivery-status-machine.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nieprawidlowy status poczatkowy dostawy: "${status}"...` | 400 | ValidationError | 96 |
| `Nieprawidlowy status docelowy dostawy: "${status}"...` | 400 | ValidationError | 104 |
| `Niedozwolona zmiana statusu dostawy: "${from}" -> "${to}"...` | 400 | ValidationError | 123 |
| `Nieprawidlowy status dostawy: "${status}"...` | 400 | ValidationError | 154 |
| `Nie mozna oznaczyc dostawy jako zrealizowana...` | 400 | ValidationError | 218 |

### order-status-machine (`apps/api/src/utils/order-status-machine.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| (nieprawidlowy status zamowienia) | 400 | ValidationError | 81 |
| (nieprawidlowy status docelowy) | 400 | ValidationError | 90 |
| (niedozwolona zmiana statusu) | 400 | ValidationError | 99 |
| (dodatkowe warunki zmiany statusu) | 400 | ValidationError | 126 |

### file-validation (`apps/api/src/utils/file-validation.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Brak typu MIME pliku` | 400 | ValidationError | 36 |
| `Nieprawidlowy typ pliku` | 400 | ValidationError | 43 |
| `Brak rozszerzenia pliku` | 400 | ValidationError | 59 |
| `Nieprawidlowe rozszerzenie pliku` | 400 | ValidationError | 66 |
| `Nieprawidlowa nazwa pliku` | 400 | ValidationError | 81, 89 |
| `Pusta nazwa pliku` | 400 | ValidationError | 97 |
| `Nazwa pliku zbyt dluga` | 400 | ValidationError | 105 |
| `Nieprawidlowy rozmiar pliku` | 400 | ValidationError | 117 |
| `Plik jest zbyt duzy` | 400 | ValidationError | 126 |

### validation (`apps/api/src/utils/validation.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `${field} must be a number, received: "${val}"` | 400 | ValidationError | 29, 136 |
| `${field} must be positive, received: ${val}` | 400 | ValidationError | 33 |
| `${field} must be an integer, received: ${val}` | 400 | ValidationError | 37, 140 |
| `${field} must be an array` | 400 | ValidationError | 82 |
| `${error.message} at index ${i}` | 400 | ValidationError | 90 |
| `${field} must be >= ${min}, received: ${val}` | 400 | ValidationError | 144 |
| `${field} must be <= ${max}, received: ${val}` | 400 | ValidationError | 148 |
| `${field} is required` | 400 | ValidationError | 173 |

### warehouse-validation (`apps/api/src/utils/warehouse-validation.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| (walidacja danych magazynowych) | 400 | ValidationError | 148 |

### config (`apps/api/src/utils/config.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| (brak zmiennych srodowiskowych) | 500 | Error | 49, 57, 66, 99 |
| `Invalid API_PORT: ${port}. Must be between 1 and 65535.` | 500 | Error | 121 |

### optimistic-locking (`apps/api/src/utils/optimistic-locking.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Optimistic lock conflict: Failed after ${n} retries...` | 500 | Error | 77 |

### jwt (`apps/api/src/utils/jwt.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Token encoding failed` | 500 | Error | 33 |

### date-helpers (`apps/api/src/utils/date-helpers.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Invalid date string: ${str}` | 500 | Error | 81 |

---

## Backend - Parsery

### glass-order-txt-parser (`apps/api/src/services/parsers/glass-order-txt-parser.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nie znaleziono numeru zamowienia w pliku` | 500 | Error | 129 |
| `Nie znaleziono tabeli z pozycjami` | 500 | Error | 139 |

### glass-order-pdf-parser (`apps/api/src/services/parsers/glass-order-pdf-parser.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nie znaleziono pozycji szyb w pliku PDF: ${name}` | 500 | Error | 260 |

### glass-delivery-csv-parser (`apps/api/src/services/parsers/glass-delivery-csv-parser.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nie mozna sparsowac referencji zlecenia: ${ref}` | 500 | Error | 173 |
| `Plik CSV jest pusty lub nieprawidlowy` | 500 | Error | 199 |
| `Brak wymaganej kolumny "Zlecenie" w pliku CSV` | 500 | Error | 233 |

### pdf-parser (`apps/api/src/services/parsers/pdf-parser.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Zlecenie ${nr} nie znalezione w bazie danych` | 500 | Error | 76 |
| `OCR failed: ${msg}` | 500 | Error | 235 |

### OrderNumberParser (`apps/api/src/services/parsers/OrderNumberParser.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Numer zlecenia nie moze byc pusty` | 500 | Error | 25 |
| `Numer zlecenia zbyt dlugi (max 20 znakow)` | 500 | Error | 33 |
| (nieprawidlowy format numeru zlecenia) | 500 | Error | 60 |

### ArticleNumberParser (`apps/api/src/services/parsers/ArticleNumberParser.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Numer artykulu nie moze byc pusty` | 500 | Error | 44 |
| (blad parsowania numeru artykulu) | 500 | Error | 51 |

### BeamCalculator (`apps/api/src/services/parsers/BeamCalculator.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Wartosci musza byc liczbami skonczonym` | 500 | Error | 29 |
| `Liczba bel nie moze byc ujemna` | 500 | Error | 33 |
| `Reszta nie moze byc ujemna` | 500 | Error | 37, 93 |
| `Reszta (${mm}mm) nie moze byc wieksza niz dlugosc beli (${L}mm)` | 500 | Error | 41 |
| `Brak bel do odjecia...` | 500 | Error | 58 |

### okuc-csv-parser (`apps/api/src/services/parsers/okuc-csv-parser.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Plik CSV jest pusty lub nieprawidlowy` | 500 | Error | 229, 352, 528, 595 |
| `Brak wymaganych naglowkow: ${missing}` | 500 | Error | 237, 360, 536, 603 |
| `Okuc RW parser temporarily disabled...` | 500 | Error | 221 |
| `Okuc Demand parser temporarily disabled...` | 500 | Error | 344 |

### CsvDataTransformer (`apps/api/src/services/import/parsers/transformers/CsvDataTransformer.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nieprawidlowy numer artykulu: "${nr}"` | 500 | Error | 67 |
| `Wartosci musza byc liczbami skonczonymi` | 500 | Error | 99 |
| `Liczba bel nie moze byc ujemna` | 500 | Error | 103 |
| `Reszta nie moze byc ujemna` | 500 | Error | 107 |
| `Reszta (${mm}mm) nie moze byc wieksza niz dlugosc beli (${L}mm)` | 500 | Error | 111 |
| `Brak bel do odjecia...` | 500 | Error | 120 |

### UzyteBeleParser (`apps/api/src/services/parsers/UzyteBeleParser.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Zlecenie ${new} juz istnieje w systemie. Nie mozna zastapic zlecenia ${old}...` | 500 | Error | 360 |

### pdfImportService (`apps/api/src/services/import/parsers/pdfImportService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Zlecenie ${nr} nie znalezione w bazie danych` | 500 | Error | 62 |

### glass-delivery (query) (`apps/api/src/services/glass-delivery/GlassDeliveryQueryService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Dostawa nie istnieje` | 500 | Error | 132 |

### glass-delivery (import) (`apps/api/src/services/glass-delivery/GlassDeliveryImportService.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| (blad importu dostawy szyb) | 500 | Error | 75 |

### glass validators (`apps/api/src/validators/glass.ts`)

| Komunikat | HTTP Code | Klasa | Linia |
|-----------|-----------|-------|-------|
| `Nieprawidlowe ID` | 500 | Error | 13, 32, 63 |

---

## Backend - Error Handler Middleware

### Mapowanie nazw bledow (`apps/api/src/middleware/error-handler.ts:239`)

| HTTP Code | Nazwa (PL) |
|-----------|------------|
| 400 | `Nieprawidlowe dane` |
| 401 | `Brak autoryzacji` |
| 403 | `Brak uprawnien` |
| 404 | `Nie znaleziono` |
| 409 | `Konflikt` |
| 500 | `Blad serwera` |
| 503 | `Usluga niedostepna` |

### Generyczne odpowiedzi error handlera

| Komunikat | HTTP Code | Kod | Zrodlo | Linia |
|-----------|-----------|-----|--------|-------|
| `Walidacja nie powiodla sie` | 400 | VALIDATION_ERROR | error-handler.ts | 57 |
| `Blad walidacji danych dla bazy` | 400 | PRISMA_VALIDATION_ERROR | error-handler.ts | 103 |
| `Nie mozna polaczyc z baza danych` | 503 | DATABASE_CONNECTION_ERROR | error-handler.ts | 124 |
| `Wystapil nieoczekiwany blad bazy danych` | 500 | DATABASE_UNKNOWN_ERROR | error-handler.ts | 145 |
| `Krytyczny blad bazy danych` | 500 | DATABASE_CRITICAL_ERROR | error-handler.ts | 166 |
| `Wystapil nieoczekiwany blad` (prod) / error.message (dev) | 500 | INTERNAL_SERVER_ERROR | error-handler.ts | 228 |

---

## Backend - Prisma (baza danych)

### Prisma Known Errors (`apps/api/src/middleware/error-handler.ts:255`)

| Prisma Code | Komunikat | HTTP Code | Kod |
|-------------|-----------|-----------|-----|
| P2002 | `Rekord z wartoscia ${field} juz istnieje` | 409 | CONFLICT |
| P2025 | `Rekord nie zostal znaleziony` | 404 | NOT_FOUND |
| P2003 | `Nieprawidlowe odniesienie: ${field} nie istnieje` | 400 | VALIDATION_ERROR |
| P2014 | `Nie mozna usunac rekordu posiadajacego powiazane rekordy` | 409 | CONFLICT |
| P2016 | `Blad interpretacji zapytania do bazy danych` | 500 | DATABASE_ERROR |
| P2021 | `Tabela nie istnieje w bazie danych` | 500 | DATABASE_ERROR |
| P2022 | `Kolumna nie istnieje w bazie danych` | 500 | DATABASE_ERROR |
| default | `Operacja bazodanowa nie powiodla sie` | 500 | DATABASE_ERROR |

---

## Frontend - Toast Messages

### Centralna definicja (`apps/web/src/lib/toast-messages.ts`)

#### Delivery (Dostawy)

| Klucz | Komunikat |
|-------|-----------|
| `delivery.errorCreate` | `Blad tworzenia dostawy` |
| `delivery.errorDelete` | `Blad usuwania dostawy` |
| `delivery.errorAddOrder` | `Blad dodawania zlecenia` |
| `delivery.errorRemoveOrder` | `Blad usuwania zlecenia` |
| `delivery.errorMoveOrder` | `Blad przenoszenia zlecenia` |
| `delivery.errorAddItem` | `Blad dodawania artykulu` |
| `delivery.errorDeleteItem` | `Blad usuwania artykulu` |
| `delivery.errorCompleteOrders` | `Blad konczenia zlecen` |

#### Order (Zlecenia)

| Klucz | Komunikat |
|-------|-----------|
| `order.errorCreate` | `Blad tworzenia zlecenia` |
| `order.errorUpdate` | `Blad aktualizacji zlecenia` |
| `order.errorDelete` | `Blad usuwania zlecenia` |
| `order.errorArchive` | `Blad archiwizacji zlecenia` |

#### Warehouse (Magazyn)

| Klucz | Komunikat |
|-------|-----------|
| `warehouse.errorUpdate` | `Blad aktualizacji magazynu` |
| `warehouse.errorOrder` | `Blad skladania zamowienia` |
| `warehouse.errorDelivery` | `Blad przyjmowania dostawy` |

#### Import (Importy)

| Klucz | Komunikat |
|-------|-----------|
| `import.errorUpload` | `Blad przesylania` |
| `import.errorApprove` | `Blad importu` |
| `import.errorReject` | `Blad` |
| `import.errorDelete` | `Blad usuwania` |
| `import.errorBulk` | `Blad przetwarzania` |
| `import.errorScan` | `Blad skanowania` |
| `import.errorFolderImport` | `Blad importu` |
| `import.errorArchive` | `Blad archiwizacji` |
| `import.errorFolderDelete` | `Blad usuwania` |
| `import.noCsvFiles` | `Brak plikow CSV` |
| `import.noDate` | `Brak daty w nazwie folderu` |

#### Glass (Szyby)

| Klucz | Komunikat |
|-------|-----------|
| `glass.errorCreate` | `Blad tworzenia zamowienia szyb` |
| `glass.errorUpdate` | `Blad aktualizacji zamowienia szyb` |

#### Settings / Working Days / Schuco

| Klucz | Komunikat |
|-------|-----------|
| `settings.errorSave` | `Blad zapisywania ustawien` |
| `workingDays.errorToggle` | `Blad zmiany dnia` |
| `schuco.syncError` | `Blad synchronizacji Schuco` |

---

## Frontend - Centralne komunikaty bledow

### ERROR_MESSAGES (`apps/web/src/lib/error-messages.ts`)

#### Network

| Kod | Komunikat |
|-----|-----------|
| `NETWORK_ERROR` | `Brak polaczenia z serwerem. Sprawdz polaczenie internetowe.` |
| `TIMEOUT` | `Serwer nie odpowiada. Sprobuj ponownie za chwile.` |
| `ECONNABORTED` | `Polaczenie przerwane. Sprobuj ponownie.` |

#### HTTP Status Codes

| HTTP Code | Komunikat |
|-----------|-----------|
| 400 | `Wyslane dane sa nieprawidlowe. Sprawdz formularz.` |
| 401 | `Sesja wygasla. Zaloguj sie ponownie.` |
| 403 | `Brak uprawnien do wykonania tej operacji.` |
| 404 | `Nie znaleziono zadanego zasobu.` |
| 409 | `Ta operacja koliduje z istniejacymi danymi.` |
| 422 | `Dane nie przeszly walidacji. Sprawdz poprawnosc.` |
| 500 | `Blad serwera. Skontaktuj sie z administratorem.` |
| 502 | `Serwer tymczasowo niedostepny. Sprobuj ponownie pozniej.` |
| 503 | `Serwis w trakcie konserwacji. Sprobuj ponownie pozniej.` |
| 504 | `Przekroczono czas oczekiwania na odpowiedz serwera.` |

#### Business Errors

| Kod | Komunikat |
|-----|-----------|
| `PROFILE_NOT_FOUND` | `Nie znaleziono profilu w magazynie.` |
| `INSUFFICIENT_STOCK` | `Niewystarczajacy stan magazynowy.` |
| `WAREHOUSE_ORDER_EXISTS` | `Zamowienie magazynowe juz istnieje.` |
| `REMANENT_ALREADY_FINALIZED` | `Remanent zostal juz sfinalizowany.` |
| `CANNOT_MODIFY_FINALIZED` | `Nie mozna modyfikowac sfinalizowanego remanentu.` |
| `DELIVERY_HAS_ORDERS` | `Nie mozna usunac dostawy zawierajacej zlecenia.` |
| `DELIVERY_NOT_FOUND` | `Nie znaleziono dostawy.` |
| `DELIVERY_DATE_INVALID` | `Data dostawy jest nieprawidlowa.` |
| `DELIVERY_ALREADY_EXISTS` | `Dostawa na ten dzien juz istnieje.` |
| `DUPLICATE_ORDER` | `Zlecenie o tym numerze juz istnieje w systemie.` |
| `ORDER_NOT_FOUND` | `Nie znaleziono zlecenia.` |
| `ORDER_ALREADY_ARCHIVED` | `Zlecenie zostalo juz zarchiwizowane.` |
| `CANNOT_DELETE_ARCHIVED` | `Nie mozna usunac zarchiwizowanego zlecenia.` |
| `IMPORT_CONFLICT` | `Plik zawiera dane ktore juz istnieja w systemie.` |
| `IMPORT_VALIDATION_FAILED` | `Plik zawiera nieprawidlowe dane.` |
| `FILE_TOO_LARGE` | `Plik jest zbyt duzy. Maksymalny rozmiar to 10MB.` |
| `INVALID_FILE_FORMAT` | `Nieprawidlowy format pliku. Dozwolone: CSV, PDF.` |
| `FILE_PARSE_ERROR` | `Nie mozna odczytac pliku. Sprawdz format.` |
| `GLASS_ORDER_NOT_FOUND` | `Nie znaleziono zamowienia szyb.` |
| `GLASS_DELIVERY_NOT_FOUND` | `Nie znaleziono dostawy szyb.` |
| `SCHUCO_SYNC_FAILED` | `Nie udalo sie zsynchronizowac danych Schuco.` |
| `SCHUCO_LOGIN_FAILED` | `Blad logowania do systemu Schuco.` |
| `UNKNOWN` | `Wystapil nieoczekiwany blad. Sprobuj ponownie lub skontaktuj sie z administratorem.` |

### Kategoryzacja bledow (`apps/web/src/lib/toast-helpers.ts:83`)

| Kategoria | Komunikat toast | Warunek |
|-----------|----------------|---------|
| `timeout` | `Przekroczono czas oczekiwania` | message zawiera "timeout"/"czas" |
| `network` | `Blad polaczenia` | message zawiera "network"/"fetch"/"siec" |
| `validation` | `Blad walidacji` (warning) | message zawiera "validation"/"walidacja"/"wymagane" |
| `server` | `Blad serwera` | message zawiera "500"/"server"/"serwer" |
| `unknown` | `Wystapil blad` | fallback |

---

## Frontend - Feature-specific toasty

### Akrobud Verification (`apps/web/src/features/akrobud-verification/hooks/useVerificationMutations.ts`)

| Komunikat (toast title) | Linia | Kontekst |
|--------------------------|-------|----------|
| `Blad tworzenia listy` | 43 | createList mutation |
| `Blad aktualizacji` | 75 | updateList mutation |
| `Blad usuwania` | 98 | deleteList mutation |
| `Blad dodawania` | 138 | addItem mutation |
| `Blad usuwania` | 164 | deleteItem mutation |
| `Blad czyszczenia` | 189 | clearItems mutation |
| `Blad weryfikacji` | 236, 401 | verify mutation |
| `Blad aplikowania zmian` | 279 | applyChanges mutation |
| `Blad tworzenia wersji` | 344 | createVersion mutation |
| `Blad porownywania` | 358 | compare mutation |

### Deliveries (`apps/web/src/features/deliveries/hooks/useDeliveryMutations.ts`)

Uzywa `TOAST_MESSAGES.delivery.*` i `TOAST_MESSAGES.workingDays.*` - patrz sekcja [Toast Messages](#frontend---toast-messages)

### Dostawy page (`apps/web/src/app/dostawy/`)

| Komunikat | Zrodlo | Linia | Kontekst |
|-----------|--------|-------|----------|
| `Nie udalo sie wczytac dane zlecenia` | DostawyPageContent.tsx | 224 | fetch error |
| `Blad tworzenia dostawy` | hooks/useDeliveryActions.ts | 136 | create mutation |
| `Blad usuwania dostawy` | hooks/useDeliveryActions.ts | 157 | delete mutation |
| `Blad dodawania zlecenia` | hooks/useDeliveryActions.ts | 208 | add order |
| `Blad usuwania zlecenia` | hooks/useDeliveryActions.ts | 230 | remove order |
| `Blad przenoszenia zlecenia` | hooks/useDeliveryActions.ts | 294 | move order |
| `Blad dodawania artykulu` | hooks/useDeliveryActions.ts | 320 | add item |
| `Blad usuwania artykulu` | hooks/useDeliveryActions.ts | 337 | delete item |
| `Blad konczenia zlecen` | hooks/useDeliveryActions.ts | 354 | complete orders |
| `Blad zmiany dnia` | hooks/useDeliveryActions.ts | 373 | toggle working day |
| `Blad pobierania protokolu` | hooks/useDeliveryExport.ts | 30 | PDF export |
| `Nie udalo sie dodac zlecenia ${id} do dostawy` | hooks/useDeliverySelection.ts | 183 | add order |
| `Nie udalo sie usunac zlecenia ${id} z dostawy` | hooks/useDeliverySelection.ts | 199 | remove order |
| `Blad konczenia zlecen` | components/DeliveriesListView.tsx | 139 | complete orders |
| `Blad usuwania zlecenia` | components/DeliveriesListView.tsx | 152 | remove order |
| `Blad pobierania protokolu` | components/DeliveriesListView.tsx | 191 | PDF download |

### Quick Delivery Dialog (`apps/web/src/app/dostawy/components/QuickDeliveryDialog.tsx`)

| Komunikat | Linia | Kontekst |
|-----------|-------|----------|
| `Blad walidacji numerow zlecen` | 94 | validation error |
| `Blad podczas przypisywania zlecen` | 119 | assign error |
| `Wpisz numery zlecen` | 127 | empty input |
| `Popraw nieznalezione numery zlecen przed kontynuacja` | 138 | not found orders |
| `Wybierz date dostawy` | 144 | no date selected |
| `Wybierz dostawe` | 148 | no delivery selected |
| `Brak zlecen do przypisania` | 161 | no orders to assign |

### Optymalizacja palet (`apps/web/src/app/dostawy/[id]/optymalizacja/page.tsx`)

| Komunikat | Linia | Kontekst |
|-----------|-------|----------|
| `Blad podczas optymalizacji` | 87 | optimize mutation |
| `Blad podczas usuwania optymalizacji` | 108 | delete mutation |
| `Blad podczas pobierania PDF` | 117 | PDF download |

### Glass (`apps/web/src/features/glass/hooks/`)

| Komunikat | Zrodlo | Linia | Kontekst |
|-----------|--------|-------|----------|
| `Blad importu` | useGlassOrders.ts | 53 | import mutation |
| `Blad` | useGlassOrders.ts | 71 | generic error |
| `Blad importu` | useGlassDeliveries.ts | 77 | import mutation |
| `Blad` | useGlassDeliveries.ts | 92 | generic error |

### Timesheets (`apps/web/src/features/timesheets/hooks/useTimesheets.ts`)

| Komunikat | Linia | Kontekst |
|-----------|-------|----------|
| `Blad dodawania pracownika` | 99 | addEmployee |
| `Blad aktualizacji pracownika` | 116 | updateEmployee |
| `Blad dezaktywacji pracownika` | 132 | deactivateEmployee |
| `Blad dodawania stanowiska` | 166 | addPosition |
| `Blad aktualizacji stanowiska` | 181 | updatePosition |
| `Blad dodawania typu zadania` | 215 | addTaskType |
| `Blad aktualizacji typu zadania` | 235 | updateTaskType |
| `Blad dodawania nietypowki` | 269 | addCustomTask |
| `Blad aktualizacji nietypowki` | 289 | updateCustomTask |
| `Blad dodawania wpisu` | 328 | addEntry |
| `Blad aktualizacji wpisu` | 347 | updateEntry |
| `Blad usuwania wpisu` | 363 | deleteEntry |
| `Blad ustawiania dnia standardowego` | 386 | setStandardDay |
| `Blad zapisywania nieobecnosci` | 404 | saveAbsence |

### Attendance (`apps/web/src/features/attendance/hooks/useMonthlyAttendance.ts`)

| Komunikat | Linia | Kontekst |
|-----------|-------|----------|
| `Blad zapisu` | 47 | save attendance |

### Warehouse (`apps/web/src/features/warehouse/`)

| Komunikat | Zrodlo | Linia | Kontekst |
|-----------|--------|-------|----------|
| `Blad dodawania zamowienia` | components/WarehouseStockTable.tsx | 61 | add order |
| `Blad usuwania zamowienia` | components/WarehouseStockTable.tsx | 72 | delete order |
| `Blad aktualizacji zamowienia` | components/WarehouseStockTable.tsx | 96 | update order |
| `Blad zapisu remanentu` | remanent/hooks/useRemanent.ts | 24 | save remanent |
| `Blad cofania remanentu` | remanent/hooks/useRemanent.ts | 41 | undo remanent |
| `Blad finalizacji miesiaca` | remanent/hooks/useRemanent.ts | 72 | finalize month |
| `Blad cofania remanentu` | remanent/hooks/useRemanentHistory.ts | 92 | undo history |

### Steel (`apps/web/src/features/steel/components/SteelStockTable.tsx`)

| Komunikat | Linia | Kontekst |
|-----------|-------|----------|
| `Blad aktualizacji stanu` | 46 | update stock |
| `Nieprawidlowa wartosc` / `Podaj poprawna liczbe belek` | 74 | validation |

### Schuco (`apps/web/src/features/schuco/hooks/useDeliveryActions.ts`)

| Komunikat | Linia | Kontekst |
|-----------|-------|----------|
| `Blad odswiezania` | 79 | refresh mutation |
| `Blad czyszczenia` | 92 | clear mutation |

### Settings (`apps/web/src/features/settings/components/`)

| Komunikat | Zrodlo | Linia | Kontekst |
|-----------|--------|-------|----------|
| `Blad podczas dodawania` | ProfileDepthsTab.tsx | 74 | add depth |
| `Blad podczas aktualizacji` | ProfileDepthsTab.tsx | 87 | update depth |
| `Blad podczas usuwania` | ProfileDepthsTab.tsx | 99 | delete depth |
| `Blad podczas dodawania` | ProfilePalletConfigTab.tsx | 70 | add config |
| `Blad podczas aktualizacji` | ProfilePalletConfigTab.tsx | 83 | update config |
| `Blad podczas usuwania` | ProfilePalletConfigTab.tsx | 95 | delete config |
| `Blad walidacji` / `Ilosc beli na palete musi byc wieksza od 0` | ProfilePalletConfigTab.tsx | 105 | validation |
| `Blad walidacji` / `Wybierz profil` | ProfilePalletConfigTab.tsx | 111 | validation |

### Archiwum (`apps/web/src/app/zestawienia/archiwum/page.tsx`)

| Komunikat | Linia | Kontekst |
|-----------|-------|----------|
| `Blad` / `Nie udalo sie odarchiwizowac zlecenia` | 95 | unarchive |
| `Blad` / `Blad podczas archiwizacji` | 113 | archive |

### Private Colors (`apps/web/src/features/private-colors/hooks/usePrivateColors.ts`)

| Komunikat | Linia | Kontekst |
|-----------|-------|----------|
| `Blad aktualizacji` | 40 | update color |
| `Blad usuwania` | 58 | delete color |

### Label Checks (`apps/web/src/features/label-checks/hooks/useLabelChecks.ts`)

| Komunikat | Linia | Kontekst |
|-----------|-------|----------|
| `Blad` | 86 | check label |
| `Blad usuwania` | 109 | delete check |

### Production Planning (`apps/web/src/features/production-planning/hooks/`)

| Komunikat | Zrodlo | Linia | Kontekst |
|-----------|--------|-------|----------|
| (getErrorMessage) | useProfilePalletized.ts | 31, 47 | toggle palletized |
| (getErrorMessage) | useEfficiencyConfigs.ts | 33, 49, 64 | CRUD configs |
| `Blad aktualizacji koloru` | useColorTypical.ts | 35 | update color |
| (getErrorMessage) | useColorTypical.ts | 51 | toggle typical |

### Realtime Sync (`apps/web/src/hooks/useRealtimeSync.ts`)

| Komunikat | Linia | Kontekst |
|-----------|-------|----------|
| (bledy WebSocket) | 73, 83, 89 | connection/reconnect errors |

### Undo Actions (`apps/web/src/hooks/useUndoableAction.ts`)

| Komunikat | Linia | Kontekst |
|-----------|-------|----------|
| `Nie udalo sie cofnac` | 186 | undo error |
| `Wystapil blad` | 212 | general error |

### Error Report Button (`apps/web/src/components/ErrorReportButton.tsx`)

| Komunikat | Linia | Kontekst |
|-----------|-------|----------|
| `Blad` | 25, 58 | error reporting itself failed |

---

## Typowe scenariusze debugowania

| Objaw | Prawdopodobna przyczyna | Gdzie szukac |
|-------|------------------------|--------------|
| **401 na dowolny endpoint** | Token wygasl lub brak | `middleware/auth.ts:25,31` -> sprawdz `Authorization` header |
| **403 na endpoint** | Rola uzytkownika niewystarczajaca | `middleware/role-check.ts` -> sprawdz `user.role` vs wymagane uprawnienie |
| **404 na endpoint** | Zasob nie istnieje w bazie | Odpowiedni service (szukaj `NotFoundError`) -> sprawdz ID w DB |
| **400 "Walidacja nie powiodla sie"** | Zod validation failed | `middleware/error-handler.ts:37` -> sprawdz `validation` w response body |
| **400 od ValidationError** | Blad logiki biznesowej | Szukaj komunikatu w service/handler -> sprawdz warunki |
| **409 "Rekord juz istnieje"** | Prisma P2002 unique violation | `middleware/error-handler.ts:261` -> sprawdz ktore pole jest duplikatem |
| **409 od ConflictError** | Blad biznesowy (np. duplikat) | Szukaj komunikatu w service -> sprawdz dane wejsciowe |
| **500 na endpoint** | Nieobsluzony wyjatek w service | Sprawdz logi API -> szukaj `[ErrorHandler] Error caught` + stack trace |
| **500 "Nie mozna polaczyc z baza"** | Prisma connection error | `middleware/error-handler.ts:113` -> sprawdz `DATABASE_URL`, status DB |
| **503 na health-check** | Serwer sie uruchamia | `apps/api/src/index.ts:302` -> poczekaj na inicjalizacje |
| **Toast "Blad polaczenia"** | Network error frontend | `lib/toast-helpers.ts:131` -> sprawdz czy API dziala, CORS |
| **Toast "Sesja wygasla"** | 401 z API | `lib/error-messages.ts:16` -> sprawdz auth token |
| **Toast "Przekroczono czas oczekiwania"** | Timeout request | `lib/toast-helpers.ts:120` -> sprawdz czas odpowiedzi API |
| **Optimistic lock conflict** | Jednoczesna edycja tego samego rekordu | `utils/optimistic-locking.ts` -> automatyczny retry (3x) |
| **"Folder jest importowany przez innego"** | Import lock conflict | `services/importLockService.ts:169` -> poczekaj na zakonczenie importu |
| **"Browser not initialized"** | Schuco scraper crash | `services/schuco/schucoScraper.ts` -> restart procesu API |
| **"Item fetch already in progress"** | Rownolegle wywolanie Schuco fetch | `services/schuco/schucoItemService.ts` -> poczekaj na zakonczenie |
| **Bledy parsowania CSV/PDF** | Nieprawidlowy format pliku | Odpowiedni parser w `services/parsers/` -> sprawdz format pliku |
| **"Brak plikow CSV" przy imporcie folderow** | Brak plikow z "uzyte"/"bele" w nazwie | `services/import/importValidationService.ts:417` -> sprawdz nazwy plikow |
| **"Brak daty w nazwie folderu"** | Folder bez daty DD.MM.YYYY | `services/import/importValidationService.ts:411` -> zmien nazwe folderu |

---

## Flow: Jak blad z backendu trafia do uzytkownika

```
1. Backend rzuca blad (np. throw new NotFoundError('Delivery'))
      |
2. Error Handler Middleware (error-handler.ts) lapie blad
   -> Generuje ErrorResponse { statusCode, error, message, code }
      |
3. Frontend fetch dostaje HTTP error response
      |
4. getErrorMessage() (error-messages.ts) mapuje:
   a) Sprawdza response.data.message (jesli po polsku -> uzywa)
   b) Sprawdza response.data.code vs ERROR_MESSAGES
   c) Sprawdza HTTP status vs ERROR_MESSAGES
   d) Fallback: "Wystapil nieoczekiwany blad"
      |
5. showErrorToast(title, message) wyswietla toast uzytkownikowi
```

---

## Kluczowe pliki do edycji przy dodawaniu nowych bledow

| Co chcesz zrobic | Plik |
|------------------|------|
| Nowa klasa bledu | `apps/api/src/utils/errors.ts` |
| Obsluga nowego Prisma error | `apps/api/src/middleware/error-handler.ts` (handlePrismaKnownError) |
| Nowy komunikat frontend | `apps/web/src/lib/error-messages.ts` (ERROR_MESSAGES) |
| Nowy toast message | `apps/web/src/lib/toast-messages.ts` (TOAST_MESSAGES) |
| Sugestia akcji dla uzytkownika | `apps/web/src/lib/error-messages.ts` (ERROR_ACTIONS) |
