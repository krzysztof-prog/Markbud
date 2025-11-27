# Przepływ Importu Pliku CSV - Dokumentacja Techniczna

## Spis treści
1. [Wrzucenie pliku (Upload)](#1-wrzucenie-pliku-upload)
2. [Podgląd danych (Preview)](#2-podgląd-danych-preview)
3. [Zatwierdzenie importu (Approval)](#3-zatwierdzenie-importu-approval)
4. [Zapis do bazy danych](#4-zapis-do-bazy-danych-database-writing)
5. [Schemat relacji w bazie](#5-schemat-relacji-w-bazie)
6. [Co się dzieje na froncie](#6-co-się-dzieje-na-froncie)
7. [Konwersja danych](#7-konwersja-danych---ważne)
8. [Błędy i ostrzeżenia](#8-błędy-i-ostrzeżenia)
9. [Co możesz zrobić z importem](#9-co-możesz-zrobić-z-importem)
10. [Podsumowanie ścieżki danych](#10-podsumowanie-ścieżki-danych)

---

## 1. WRZUCENIE PLIKU (Upload)

Kiedy uploadzisz plik CSV do systemu:

```
Plik CSV (np. "uzyte-bele-53529.csv")
        ↓
POST /api/imports/upload
        ↓
System sprawdza nazwę pliku:
├─ Zawiera "uzyte" lub "bele" lub ".csv" → Typ: "uzyte_bele"
└─ Zawiera ".pdf" → Typ: "ceny_pdf"
        ↓
Plik zostaje zapisany na dysku:
./uploads/1732727000000_uzyte-bele-53529.csv
        ↓
Baza danych - tabela "file_imports":
┌─────────────────────────────────┐
│ FileImport {                    │
│   id: 1                         │
│   filename: "uzyte-bele..."     │
│   filepath: "./uploads/..."     │
│   fileType: "uzyte_bele"        │
│   status: "pending"             │
│   createdAt: teraz              │
│ }                               │
└─────────────────────────────────┘
```

### Kod źródłowy
- **Endpoint:** `c:\Users\Krzysztof\Desktop\AKROBUD\apps\api\src\routes\imports.ts` (lines 11-63)
- **Route:** `POST /api/imports/upload`

---

## 2. PODGLĄD DANYCH (Preview)

Zanim zatwierdzisz import, możesz zobaczyć co będzie importowane:

```
GET /api/imports/:id/preview
        ↓
Parser czyta plik z dysku
        ↓
Struktura zwracana do frontendu:
{
  "orderNumber": "53529",
  "requirements": [
    {
      "articleNumber": "18866000",    // Numer artykułu z CSV
      "profileNumber": "8866",        // Wyciągnięty z artykułu
      "colorCode": "000",             // Ostatnie 3 cyfry artykułu
      "originalBeams": 5,             // Liczba bel z CSV
      "originalRest": 3317,           // Reszta w mm z CSV
      "calculatedBeams": 4,           // Przeliczone
      "calculatedMeters": 2.683       // Przeliczone na metry
    },
    {
      "articleNumber": "19016000",
      "profileNumber": "9016",
      "colorCode": "000",
      "originalBeams": 2,
      "originalRest": 3860,
      "calculatedBeams": 1,
      "calculatedMeters": 2.14
    }
  ],
  "windows": [
    {
      "lp": 1,
      "szer": 3008,              // Szerokość okna w mm
      "wys": 1185,               // Wysokość okna w mm
      "typProfilu": "BLOK",
      "ilosc": 1,                // Ilość sztuk
      "referencja": "D4190"
    }
  ],
  "totals": {
    "windows": 5,              // Łączna liczba okien z CSV
    "sashes": 7,               // Liczba skrzydel z CSV
    "glasses": 12              // Liczba szyb z CSV
  }
}
```

**W tej fazie nic nie jest zapisywane do bazy** - to tylko podgląd.

### Kod źródłowy
- **Endpoint:** `GET /api/imports/:id/preview` (lines 105-136)
- **Parser:** `c:\Users\Krzysztof\Desktop\AKROBUD\apps\api\src\services\parsers\csv-parser.ts`

---

## 3. ZATWIERDZENIE IMPORTU (Approval)

Kiedy klikniesz "Zatwierdzam":

```
POST /api/imports/:id/approve
        ↓
Status w "file_imports" zmienia się: pending → processing
        ↓
Parser przystępuje do zapisu do bazy danych
```

### Opcje zatwierdzenia
- `overwrite` - Zastępuje istniejące dane dla tego zlecenia
- `add_new` (domyślnie) - Tworzy nowe lub zachowuje istniejące

---

## 4. ZAPIS DO BAZY DANYCH (Database Writing)

To jest kluczowa część. Dane trafiają do 4 tabel:

### **A. Tabela: `orders`**

System sprawdza czy zlecenie o numerze "53529" już istnieje:

```
Scenariusz 1: Zlecenie ISTNIEJĄCE + opcja "overwrite"
├─ Usuwa wszystkie stare OrderRequirement dla tego zlecenia
├─ Usuwa wszystkie stare OrderWindow dla tego zlecenia
└─ Aktualizuje totals (liczba okien, skrzydel, szyb)

Scenariusz 2: Zlecenie ISTNIEJĄCE + opcja "add_new" (domyślnie)
└─ Nie zmienia zlecenia, pomija to

Scenariusz 3: Zlecenie NOWE
└─ Tworzy nowy rekord Order z numerem "53529" i totalami
```

**Rezultat w tabeli `orders`:**
```
┌────────────────────────────────────┐
│ Order {                            │
│   id: 10                           │
│   orderNumber: "53529"             │
│   totalWindows: 5                  │
│   totalSashes: 7                   │
│   totalGlasses: 12                 │
│   createdAt: ...                   │
│ }                                  │
└────────────────────────────────────┘
```

---

### **B. Tabela: `order_requirements`**

Dla każdego wiersza z sekcji "Numer artykułu" w CSV:

```
CSV: 53529;18866000;5;3317
CSV: 53529;19016000;2;3860
        ↓
System robi dla każdego wiersza:

1️⃣ Szuka profilu po numerze
   ├─ Szuka po "number" = "8866"
   ├─ Jeśli nie znajduje, szuka po "articleNumber" = "18866000"
   ├─ Jeśli nadal nie znajduje → TWORZY nowy profil
   └─ Jeśli znajduje bez articleNumber → AKTUALIZUJE articleNumber

2️⃣ Szuka koloru po kodzie
   ├─ Szuka koloru gdzie code = "000" (ostatnie 3 cyfry artykułu)
   ├─ Jeśli nie znajduje → POMIJA ten requirement (log warning)
   └─ Jeśli znajduje → KONTYNUUJE

3️⃣ UPSERT (wstaw lub aktualizuj) w table order_requirements
   └─ Klucz unikalny: (orderId, profileId, colorId)
      Jeśli już istnieje - aktualizuj, jeśli nie - dodaj nowy
```

**Rezultat w tabeli `order_requirements`:**
```
┌────────────────────────────────────────────────┐
│ OrderRequirement {                             │
│   id: 47                                       │
│   orderId: 10         ← Powiązanie z Order    │
│   profileId: 1        ← Profil 8866           │
│   colorId: 1          ← Kolor biały (000)     │
│   beamsCount: 4       ← Przeliczone bele      │
│   meters: 2.683       ← Przeliczone metry     │
│   restMm: 3317        ← Oryginalna reszta     │
│ }                                              │
├────────────────────────────────────────────────┤
│ OrderRequirement {                             │
│   id: 48                                       │
│   orderId: 10                                  │
│   profileId: 3        ← Profil 9016           │
│   colorId: 1          ← Kolor biały (000)     │
│   beamsCount: 1                                │
│   meters: 2.14                                 │
│   restMm: 3860                                 │
│ }                                              │
└────────────────────────────────────────────────┘
```

---

### **C. Tabela: `order_windows`**

Dla każdego okna z sekcji "Lista okien i drzwi":

```
CSV:
Lp.;Szerokosc;Wysokosc;Typ profilu;Ilosc sztuk;Referencja
1;3008;1185;BLOK;1;D4190
        ↓
INSERT INTO order_windows
```

**Rezultat w tabeli `order_windows`:**
```
┌─────────────────────────────────────┐
│ OrderWindow {                       │
│   id: 23                            │
│   orderId: 10                       │
│   widthMm: 3008    ← Szerokość okna │
│   heightMm: 1185   ← Wysokość okna  │
│   profileType: "BLOK"               │
│   quantity: 1      ← Ilość sztuk    │
│   reference: "D4190"                │
│ }                                   │
└─────────────────────────────────────┘
```

---

### **D. Tabela: `file_imports`** (Update)

```
Zmiana statusu:
┌─────────────────────────────────────────┐
│ FileImport {                            │
│   id: 1                                 │
│   status: "processing" → "completed" ✓ │
│   processedAt: 2025-11-27 16:30:45     │
│   metadata: {                           │
│     "orderId": 10,                      │
│     "requirementsCount": 2,             │
│     "windowsCount": 1                   │
│   }                                     │
│ }                                       │
└─────────────────────────────────────────┘
```

---

## 5. SCHEMAT RELACJI W BAZIE

```
orders (Zlecenie)
│
├─→ order_requirements (Zapotrzebowanie na profile/kolory)
│   ├─→ profile (Profil 8866, 9016, itp)
│   └─→ color (Kolor biały, antracyt, itp)
│
└─→ order_windows (Okna w zleceniu)
    └─ Wymiary, ilość, referencja
```

**Konkretnie dla zlecenia 53529:**
```
Order "53529"
│
├─ OrderRequirement: profil 8866 + biały (000) → 4 bele, 2.683 m
├─ OrderRequirement: profil 9016 + biały (000) → 1 bela, 2.14 m
│
└─ OrderWindow: 3008x1185 mm, typ BLOK, 1 szt, ref D4190
```

---

## 6. CO SIĘ DZIEJE NA FRONCIE

Po zatwierdzeniu importu:

```
Backend przetwarza...
        ↓
Frontend otrzymuje odpowiedź:
{
  "success": true,
  "result": {
    "orderId": 10,
    "requirementsCount": 2,
    "windowsCount": 1
  }
}
        ↓
Import pojawia się na liście importów ze statusem "completed"
        ↓
Dane są dostępne w systemie:
- Widać je na "/zestawienia/zlecenia"
- Widać je w komponencie "Profile na dostawy"
  (kolumna SUM pokazuje beamsCount z order_requirements)
```

---

## 7. KONWERSJA DANYCH - WAŻNE!

Liczby z CSV są **przeliczane** zanim trafią do bazy:

```
CSV ma: newBeans=5, rest=3317mm

Logika:
├─ Długość beli: 6000mm
├─ Zaokrąglenie do góry do 500mm: 3317 → 3500mm
├─ Jeśli reszta > 0: odejmij 1 od liczby bel
│  5 bel → 4 bele
├─ Oblicz pozostały materiał: 6000 - 3500 = 2500mm
├─ Przelicz na metry: 2500 / 1000 = 2.5m
└─ Zaokrąglij do 3 miejsc: 2.683m

Baza dostaje: beamsCount=4, meters=2.683, restMm=3317
```

### Funkcja konwersji
- **Lokalizacja:** `csv-parser.ts` - funkcja `calculateBeamsAndMeters()`
- **Specyfikacja:**
  - Długość beli: 6000mm
  - Zaokrąglenie reszt do: 500mm

---

## 8. BŁĘDY I OSTRZEŻENIA

Podczas importu mogą się pojawić problemy:

```
❌ Kolor nie istnieje
   CSV ma: 19016999  (ostatnie 3 cyfry = 999)
   Baza nie ma koloru z code="999"
   → Requirement jest POMIJANY, log warning

⚠️ Profil nie istnieje
   CSV ma: 19016000 (profil 9016)
   Baza nie ma profilu
   → TWORZY NOWY profil automatycznie

⚠️ Uszkodzony CSV
   Błędy w parsowaniu
   → Import ustawiony na status "error"
```

---

## 9. CO MOŻESZ ZROBIĆ Z IMPORTEM

Po zatwierdzeniu importu masz opcje:

```
✓ Podgląd: GET /api/imports/:id/preview
✓ Usunięcie: DELETE /api/imports/:id
  └─ Usuwa Order i wszystkie jego dane (cascading delete)

✓ Ponowny import tego samego pliku:
  └─ Jeśli zatwierdzisz z opcją "overwrite"
     - Usuwa stare requirements i windows
     - Dodaje nowe z pliku
```

---

## 10. PODSUMOWANIE ŚCIEŻKI DANYCH

```
CSV FILE
  ↓
┌──────────────────────┐
│ Upload i zapis na    │
│ dysk + file_imports  │ Status: pending
└──────────────────────┘
  ↓
┌──────────────────────┐
│ Podgląd danych       │ (opcjonalnie)
│ parseUzyteBeleFile() │
└──────────────────────┘
  ↓
┌──────────────────────┐
│ Zatwierdzenie        │ Status: processing
│ POST /approve        │
└──────────────────────┘
  ↓
┌──────────────────────────────────────┐
│ Zapis do bazy:                       │
├──────────────────────────────────────┤
│ 1. orders (nowe lub overwrite)       │
│ 2. order_requirements                │
│ 3. order_windows                     │
│ 4. profiles (tworzy jeśli brakuje)   │
│ 5. file_imports (status: completed)  │
└──────────────────────────────────────┘
  ↓
DANE DOSTĘPNE W SYSTEMIE ✓
```

---

## STRUKTURY DANYCH PARSERA

### Interface: `UzyteBeleRow`
Pojedynczy wiersz z sekcji requirements w CSV:
```typescript
interface UzyteBeleRow {
  numZlec: string;      // Order number (e.g., "53529")
  numArt: string;       // Article number (e.g., "19016000")
  nowychBel: number;    // Number of new beams
  reszta: number;       // Remainder in mm
}
```

### Interface: `UzyteBeleWindow`
Pojedynczy wiersz z sekcji okien w CSV:
```typescript
interface UzyteBeleWindow {
  lp: number;           // Line number
  szer: number;         // Width in mm (e.g., 3008)
  wys: number;          // Height in mm (e.g., 1185)
  typProfilu: string;   // Profile type (e.g., "BLOK")
  ilosc: number;        // Quantity (e.g., 1)
  referencja: string;   // Reference (e.g., "D4190")
}
```

### Interface: `ParsedUzyteBele`
Główna struktura wyjściowa parsera:
```typescript
interface ParsedUzyteBele {
  orderNumber: string;
  requirements: Array<{
    articleNumber: string;     // e.g., "19016000"
    profileNumber: string;     // Extracted from article (e.g., "9016")
    colorCode: string;         // Last 3 digits (e.g., "000")
    originalBeams: number;     // From CSV
    originalRest: number;      // From CSV (in mm)
    calculatedBeams: number;   // After processing
    calculatedMeters: number;  // Converted from rest
  }>;
  windows: UzyteBeleWindow[];
  totals: {
    windows: number;
    sashes: number;
    glasses: number;
  };
}
```

---

## FUNKCJE PARSERA

### `parseArticleNumber()`
Konwertuje numer artykułu na numer profilu i kod koloru:
```
Przykład: 19016000 → profile: 9016, color: 000
Logika: usuń pierwszą cyfrę, ostatnie 3 cyfry = kolor, reszta = profil
```

### `calculateBeamsAndMeters()`
Implementuje logikę biznesową dla konwersji bel/metrów:
```
Dane wejściowe: liczba bel, reszta w mm
Dane wyjściowe: przeliczone bele, metry
Algorytm:
  1. Zaokrąglij resztę W GÓRĘ do najbliższej wielokrotności 500mm
  2. Jeśli reszta > 0: odejmij 1 belę od oryginalnej liczby
  3. Oblicz pozostały materiał: 6000mm - zaokrąglona_reszta
  4. Przelicz na metry: / 1000
```

### `parseUzyteBeleFile()`
Główna funkcja parsowania:
- Czyta plik CSV linia po linii (delimiter: ;)
- Dzieli na dwie sekcje: requirements i windows
- Ekstrahuje totals z linii zawierających "łączna liczba"
- Waliduje format danych

---

## POWIĄZANE PLIKI ŹRÓDŁOWE

| Komponent | Lokalizacja | Opis |
|-----------|-------------|------|
| Upload Endpoint | `apps/api/src/routes/imports.ts` (11-63) | Obsługuje przesłanie pliku |
| Preview Endpoint | `apps/api/src/routes/imports.ts` (105-136) | Podgląd parsowanych danych |
| Approval Endpoint | `apps/api/src/routes/imports.ts` (139-203) | Zatwierdzenie i zapis do bazy |
| CSV Parser | `apps/api/src/services/parsers/csv-parser.ts` | Logika parsowania CSV |
| File Watcher | `apps/api/src/services/file-watcher.ts` | Auto-rejestracja nowych plików |
| API Client | `apps/web/src/lib/api.ts` (line 65) | Frontend API dla importów |

---

## AUTOMATYCZNE OBSERWOWANIE PLIKÓW

**FileWatcherService** (`file-watcher.ts`):
- Obserwuje skonfigurowane foldery ("uzyte bele" i "ceny")
- Auto-rejestruje nowe pliki jako pending imports
- Używa Chokidar do monitorowania systemu plików
- Zapobiega duplikatom przez sprawdzenie istniejących rekordów

---

## CYKL ŻYCIA IMPORTU

```
pending
  ↓
  ↙─ (user rejects) → rejected
  ↓
processing → completed (SUCCESS)
         ↘ → error (FAILURE)
```

---

## PRZYKŁAD PLIKU CSV

```
Numer zlecenia;Numer art.;Nowych bel;reszta
53529;18866000;5;3317
53529;19016000;2;3860

Lista okien i drzwi dla tego zlecenia:
Lp.;Szerokosc;Wysokosc;Typ profilu;Ilosc sztuk;Referencja
1;3008;1185;BLOK;1;D4190
2;2590;1185;BLOK;1;D4191

Laczna liczba sztuk okien i drzwi:;5
Laczna liczba skrzydel:;7
Laczna liczba szyb:;12
```

---

## UWAGI WAŻNE

⚠️ **Kolory muszą już istnieć w bazie** - jeśli kolor z CSV nie istnieje, requirement zostaje pominięty
✓ **Profile mogą być tworzone automatycznie** - jeśli profil nie istnieje, system go utworzy
✓ **ArticleNumber jest aktualizowany** - jeśli profil istnieje bez articleNumber, zostanie dodany
✓ **Dane są konwertowane** - liczby z CSV są przeliczane zanim trafią do bazy
✓ **Transakcje są bezpieczne** - cały import jest transakcją, albo wszystko się zapisy albo nic

---

**Dokument generowany:** 2025-11-27
**Wersja:** 1.0
