# Szczegółowa Specyfikacja Funkcjonalności z Backlogu

**Data:** 2025-12-07
**Autor:** Claude Opus 4.5

---

## Spis treści

1. [Zarządzanie profilami UI](#1-zarządzanie-profilami-ui)
2. [Protokoły odbioru dostaw](#2-protokoły-odbioru-dostaw)
3. [Historia magazynu](#3-historia-magazynu)
4. [Pełny raport braków materiałowych](#4-pełny-raport-braków-materiałowych)
5. [System notatek](#5-system-notatek)
6. [Zarządzanie dniami wolnymi](#6-zarządzanie-dniami-wolnymi)
7. [Statystyki miesięczne](#7-statystyki-miesięczne)

---

## 1. Zarządzanie Profilami UI

### Status
- **Backend:** ✅ Gotowy (`/api/profiles/*`)
- **Frontend:** ❌ Częściowo istnieje w `/ustawienia` (tab "Profile PVC")

### Obecny stan
W pliku `apps/web/src/app/ustawienia/page.tsx` istnieje już zakładka "Profile PVC" z podstawowym CRUD. **ALE** brakuje:
- Zarządzania widocznością profili dla kolorów
- Numeru artykułu w formularzu
- Sortowania/drag-drop kolejności

### Mockup UI - Rozszerzenie zakładki Profile

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Ustawienia > Profile aluminiowe                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [🔍 Szukaj profilu...]                               [+ Dodaj profil]   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ #  │ Numer   │ Nr artykułu │ Nazwa        │ Opis          │ Widoczność  │ │
│ │────│─────────│─────────────│──────────────│───────────────│─────────────│ │
│ │ ≡  │ 58120   │ 501.58120   │ Rama         │ Profil ramowy │ 8/12 kol.   │ │
│ │ ≡  │ 60245   │ 501.60245   │ Skrzydło     │ Profil skrz.  │ 12/12 kol.  │ │
│ │ ≡  │ 58866   │ 501.58866   │ Słupek       │ Słupek środ.  │ 10/12 kol.  │ │
│ │ ≡  │ 59671   │ 501.59671   │ Próg         │ Próg dolny    │ 6/12 kol.   │ │
│ │ ≡  │ 59315   │ -           │ Uszczelka    │ Uszczelka gł. │ 12/12 kol.  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Legenda: ≡ = drag handle do zmiany kolejności                               │
│          Kliknij "Widoczność" aby zarządzać dla których kolorów widoczny    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mockup - Dialog dodawania/edycji profilu

```
┌─────────────────────────────────────────────────────────────────┐
│ Dodaj profil                                              [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Numer profilu *                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 58120                                                      │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Numer artykułu (opcjonalny)                                     │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 501.58120                                                  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Nazwa *                                                          │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Rama                                                       │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Opis (opcjonalny)                                               │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Profil ramowy do okien standardowych                       │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Widoczność dla kolorów:                                         │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ [✓] Zaznacz wszystkie  [ ] Odznacz wszystkie              │   │
│ │                                                            │   │
│ │ Typowe:                                                    │   │
│ │ [✓] 000 - Biały         [✓] 050 - Kremowy                 │   │
│ │ [✓] 730 - Antracyt      [✓] 750 - Biały strukturalny      │   │
│ │                                                            │   │
│ │ Nietypowe:                                                 │   │
│ │ [ ] 680 - Brąz          [ ] 710 - Szary                   │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                              [Anuluj]  [Zapisz]                 │
└─────────────────────────────────────────────────────────────────┘
```

### Komponenty do utworzenia/modyfikacji

1. **Rozszerzyć istniejący dialog w `ustawienia/page.tsx`:**
   - Dodać pole `articleNumber` (numer artykułu)
   - Dodać sekcję widoczności dla kolorów (checkboxy)

2. **Dodać kolumnę "Widoczność" w tabeli:**
   - Pokazuje "X/Y kolorów"
   - Kliknięcie otwiera dialog zarządzania widocznością

3. **Drag & drop dla sortowania (opcjonalnie):**
   - Użyć `@dnd-kit/core` lub `react-beautiful-dnd`
   - Zapisywać `sortOrder` przez API

### API do wykorzystania

```typescript
// Istniejące endpointy
GET    /api/profiles              // Lista profili
POST   /api/profiles              // Dodaj profil
PUT    /api/profiles/:id          // Edytuj profil
DELETE /api/profiles/:id          // Usuń profil

// Do wykorzystania dla widoczności
PUT    /api/colors/:colorId/profiles/:profileId/visibility
// Body: { visible: boolean }

// Do dodania (backend) - zmiana kolejności
PATCH  /api/profiles/:id/sort-order
// Body: { sortOrder: number }
```

### Schemat danych

```typescript
interface Profile {
  id: number;
  number: string;           // np. "58120"
  articleNumber?: string;   // np. "501.58120"
  name: string;             // np. "Rama"
  description?: string;     // np. "Profil ramowy"
  sortOrder: number;        // kolejność wyświetlania
  colors?: ProfileColor[];  // powiązania z kolorami
}

interface ProfileColor {
  profileId: number;
  colorId: number;
  visible: boolean;
  color: Color;
}
```

### Szacowany czas: 3-4h

| Zadanie | Czas |
|---------|------|
| Rozszerzenie dialogu (articleNumber, widoczność) | 1.5h |
| Kolumna "Widoczność" + dialog zarządzania | 1h |
| Drag & drop sortowanie (opcjonalne) | 1-1.5h |
| Testy i poprawki | 0.5h |

---

## 2. Protokoły Odbioru Dostaw

### Status
- **Backend:** ✅ Gotowy (`/api/deliveries/:id/protocol`)
- **Frontend:** ❌ Brakuje przycisku

### Obecny stan
Endpoint istnieje, generuje PDF. Brakuje tylko przycisku w UI.

### Mockup - Przycisk w szczegółach dostawy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dostawa: 18.12.2025                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Zlecenia w dostawie:                                                        │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ #53520 - Firma ABC      │ 12 okien │ 45,000 PLN                        │ │
│ │ #53521 - Firma XYZ      │ 8 okien  │ 32,000 PLN                        │ │
│ │ #53522 - Jan Kowalski   │ 4 okna   │ 18,000 PLN                        │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Podsumowanie:                                                               │
│ • Okna: 24 szt.                                                             │
│ • Szyby: 48 szt.                                                            │
│ • Wartość: 95,000 PLN                                                       │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [📄 Generuj protokół odbioru]  [📊 Optymalizuj palety]  [✏️ Edytuj]    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mockup - Dialog podglądu przed pobraniem (opcjonalnie)

```
┌─────────────────────────────────────────────────────────────────┐
│ Protokół odbioru - Dostawa 18.12.2025                     [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │                     PROTOKÓŁ ODBIORU                       │   │
│ │                                                            │   │
│ │ Data dostawy: 18.12.2025                                   │   │
│ │ Liczba zleceń: 3                                           │   │
│ │ Liczba okien: 24                                           │   │
│ │ Liczba szyb: 48                                            │   │
│ │ Liczba palet: 4                                            │   │
│ │                                                            │   │
│ │ Wartość: 95,000 PLN                                        │   │
│ │                                                            │   │
│ │ ─────────────────────────────────────────────────────────  │   │
│ │                                                            │   │
│ │ Podpis wydającego: ________________                        │   │
│ │                                                            │   │
│ │ Podpis odbierającego: ________________                     │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                              [Anuluj]  [⬇️ Pobierz PDF]          │
└─────────────────────────────────────────────────────────────────┘
```

### Implementacja

```typescript
// W komponencie szczegółów dostawy (np. DeliveryDetailModal)

const handleDownloadProtocol = async () => {
  try {
    const response = await fetch(`/api/deliveries/${deliveryId}/protocol`, {
      method: 'GET',
    });

    if (!response.ok) throw new Error('Błąd generowania protokołu');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `protokol-odbioru-${deliveryDate}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);

    showSuccessToast('Protokół pobrany');
  } catch (error) {
    showErrorToast('Nie udało się wygenerować protokołu');
  }
};

// JSX
<Button onClick={handleDownloadProtocol} variant="outline">
  <FileText className="h-4 w-4 mr-2" />
  Generuj protokół odbioru
</Button>
```

### Lokalizacja w kodzie

Dodać przycisk w:
- `apps/web/src/app/dostawy/page.tsx` - w widoku szczegółów dostawy
- Lub w modalu szczegółów dostawy jeśli istnieje

### Szacowany czas: 30 min - 1h

| Zadanie | Czas |
|---------|------|
| Dodanie przycisku + logika pobierania | 20 min |
| Dialog podglądu (opcjonalnie) | 30 min |
| Obsługa błędów i loading state | 10 min |

---

## 3. Historia Magazynu

### Status
- **Backend:** ✅ Gotowy (`/api/warehouse/history/:colorId`)
- **Frontend:** ❌ Brakuje zakładki

### Obecny stan
W `MagazynAkrobudPageContent.tsx` są dwie zakładki: "Tabela zleceń" i "Stan magazynowy". Trzeba dodać trzecią: "Historia".

### Mockup - Nowa zakładka "Historia"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Magazyn Akrobud > Kolor: 050 - Kremowy                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Tabela zleceń] [Stan magazynowy] [📜 Historia]                             │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Filtruj:  [Wszystkie profile ▼]   Pokaż: [50 ▼] wyników                 │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Data          │ Profil  │ Obliczony │ Rzeczywisty │ Różnica │ Wykonał   │ │
│ │───────────────│─────────│───────────│─────────────│─────────│───────────│ │
│ │ 01.12.2025    │ 58120   │ 45 bel    │ 43 bel      │ -2      │ Jan K.    │ │
│ │ 01.12.2025    │ 60245   │ 12 bel    │ 12 bel      │ 0       │ Jan K.    │ │
│ │ 01.12.2025    │ 58866   │ 28 bel    │ 30 bel      │ +2      │ Jan K.    │ │
│ │───────────────│─────────│───────────│─────────────│─────────│───────────│ │
│ │ 01.11.2025    │ 58120   │ 52 bel    │ 50 bel      │ -2      │ Anna M.   │ │
│ │ 01.11.2025    │ 60245   │ 18 bel    │ 18 bel      │ 0       │ Anna M.   │ │
│ │ 01.11.2025    │ 58866   │ 22 bel    │ 25 bel      │ +3      │ Anna M.   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ 💡 Różnica dodatnia = więcej na stanie niż obliczono                        │
│    Różnica ujemna = mniej na stanie (potencjalne straty)                    │
│                                                                              │
│ [← Poprzednie]                                        [Następne →]          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Schemat danych z API

```typescript
// GET /api/warehouse/history/:colorId?limit=50&profileId=1

interface WarehouseHistoryItem {
  id: number;
  profileId: number;
  colorId: number;
  calculatedStock: number;  // stan obliczony
  actualStock: number;      // stan rzeczywisty (wprowadzony)
  difference: number;       // różnica (actual - calculated)
  recordedAt: string;       // data inwentaryzacji
  recordedBy: string;       // kto wykonał
  profile: {
    id: number;
    number: string;
    name: string;
  };
}

// Response
{
  data: WarehouseHistoryItem[];
  total: number;
  page: number;
  limit: number;
}
```

### Komponent do utworzenia

```typescript
// apps/web/src/features/warehouse/components/WarehouseHistoryTable.tsx

interface WarehouseHistoryTableProps {
  colorId: number;
}

export function WarehouseHistoryTable({ colorId }: WarehouseHistoryTableProps) {
  const [profileFilter, setProfileFilter] = useState<number | null>(null);
  const [limit, setLimit] = useState(50);

  const { data, isLoading } = useQuery({
    queryKey: ['warehouse-history', colorId, profileFilter, limit],
    queryFn: () => warehouseApi.getHistory(colorId, {
      limit,
      profileId: profileFilter
    }),
  });

  // Grupowanie po dacie
  const groupedByDate = useMemo(() => {
    if (!data?.data) return {};
    return data.data.reduce((acc, item) => {
      const date = format(new Date(item.recordedAt), 'dd.MM.yyyy');
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {} as Record<string, WarehouseHistoryItem[]>);
  }, [data]);

  return (
    <div>
      {/* Filtry */}
      <div className="flex gap-4 mb-4">
        <Select value={profileFilter} onValueChange={setProfileFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Wszystkie profile" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Wszystkie profile</SelectItem>
            {profiles?.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.number} - {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={limit} onValueChange={setLimit}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={25}>25</SelectItem>
            <SelectItem value={50}>50</SelectItem>
            <SelectItem value={100}>100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Profil</TableHead>
            <TableHead className="text-right">Obliczony</TableHead>
            <TableHead className="text-right">Rzeczywisty</TableHead>
            <TableHead className="text-right">Różnica</TableHead>
            <TableHead>Wykonał</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(groupedByDate).map(([date, items]) => (
            <>
              {items.map((item, idx) => (
                <TableRow key={item.id}>
                  {idx === 0 && (
                    <TableCell rowSpan={items.length} className="font-medium">
                      {date}
                    </TableCell>
                  )}
                  <TableCell>{item.profile.number}</TableCell>
                  <TableCell className="text-right">{item.calculatedStock} bel</TableCell>
                  <TableCell className="text-right">{item.actualStock} bel</TableCell>
                  <TableCell className={cn(
                    "text-right font-medium",
                    item.difference > 0 && "text-green-600",
                    item.difference < 0 && "text-red-600"
                  )}>
                    {item.difference > 0 ? '+' : ''}{item.difference}
                  </TableCell>
                  <TableCell>{item.recordedBy}</TableCell>
                </TableRow>
              ))}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Szacowany czas: 2-3h

| Zadanie | Czas |
|---------|------|
| Komponent WarehouseHistoryTable | 1.5h |
| Dodanie zakładki do MagazynAkrobudPageContent | 20 min |
| Filtry i paginacja | 40 min |
| Kolorowanie różnic + legenda | 20 min |
| Testy | 20 min |

---

## 4. Pełny Raport Braków Materiałowych

### Status
- **Backend:** ✅ Gotowy (`/api/warehouse/shortages`)
- **Frontend:** ❌ Tylko top 5 na dashboardzie

### Obecny stan
Na dashboardzie jest widget "Braki materiałowe" pokazujący top 5. Potrzebna pełna strona.

### Mockup - Strona `/magazyn/braki`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Magazyn > Braki materiałowe                              [⬇️ Export CSV]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Filtry:                                                                  │ │
│ │                                                                          │ │
│ │ Krytyczność: [Wszystkie ▼]   Kolor: [Wszystkie kolory ▼]                │ │
│ │                                                                          │ │
│ │ Sortuj po: [Wielkość braku ▼]   Kierunek: [Malejąco ▼]                  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Podsumowanie: 🔴 5 krytycznych  🟠 8 wysokich  🟡 12 średnich               │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Profil  │ Kolor       │ Stan   │ Zapotrz. │ Brak   │ Krytyczność       │ │
│ │─────────│─────────────│────────│──────────│────────│───────────────────│ │
│ │ 58120   │ 050 Kremowy │ 5 bel  │ 25 bel   │ -20    │ 🔴 KRYTYCZNY      │ │
│ │ 60245   │ 730 Antracy │ 8 bel  │ 22 bel   │ -14    │ 🔴 KRYTYCZNY      │ │
│ │ 58866   │ 050 Kremowy │ 12 bel │ 20 bel   │ -8     │ 🟠 WYSOKI         │ │
│ │ 59671   │ 000 Biały   │ 15 bel │ 22 bel   │ -7     │ 🟠 WYSOKI         │ │
│ │ 58120   │ 000 Biały   │ 20 bel │ 25 bel   │ -5     │ 🟡 ŚREDNI         │ │
│ │ 60245   │ 050 Kremowy │ 18 bel │ 22 bel   │ -4     │ 🟡 ŚREDNI         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Legenda krytyczności:                                                       │
│ 🔴 KRYTYCZNY: Brak > 10 bel lub > 50% zapotrzebowania                       │
│ 🟠 WYSOKI: Brak 5-10 bel lub 25-50% zapotrzebowania                         │
│ 🟡 ŚREDNI: Brak < 5 bel lub < 25% zapotrzebowania                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Schemat danych

```typescript
// GET /api/warehouse/shortages?colorId=1&severity=critical

interface ShortageItem {
  profileId: number;
  profileNumber: string;
  profileName: string;
  colorId: number;
  colorCode: string;
  colorName: string;
  currentStock: number;      // aktualny stan
  demand: number;            // zapotrzebowanie
  shortage: number;          // brak (ujemna wartość)
  severity: 'critical' | 'high' | 'medium';
  shortagePercent: number;   // % braku względem zapotrzebowania
}
```

### Lokalizacja w kodzie

- Utworzyć: `apps/web/src/app/magazyn/braki/page.tsx`
- Dodać link w nawigacji sidebar

### Szacowany czas: 2-3h

| Zadanie | Czas |
|---------|------|
| Strona + layout | 30 min |
| Tabela z danymi | 45 min |
| Filtry (krytyczność, kolor) | 45 min |
| Export CSV | 30 min |
| Kolorowanie + legenda | 20 min |
| Testy | 20 min |

---

## 5. System Notatek

### Status
- **Backend:** ✅ Gotowy (model `Note` w Prisma)
- **Frontend:** ❌ Całkowicie brakuje

### Mockup - Sekcja notatek w szczegółach zlecenia

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Zlecenie #53520 - Firma ABC                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Szczegóły] [Profile] [Okna] [📝 Notatki (3)]                               │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                                                                          │ │
│ │ ┌───────────────────────────────────────────────────────────────────┐   │ │
│ │ │ 💬 Nowa notatka...                                                 │   │ │
│ │ │                                                                    │   │ │
│ │ │                                                                    │   │ │
│ │ └───────────────────────────────────────────────────────────────────┘   │ │
│ │ [ ] Ważna notatka                                    [Dodaj notatkę]    │ │
│ │                                                                          │ │
│ │ ─────────────────────────────────────────────────────────────────────   │ │
│ │                                                                          │ │
│ │ ⭐ WAŻNE • Jan Kowalski • 05.12.2025 14:30                    [✏️] [🗑️] │ │
│ │ ┌───────────────────────────────────────────────────────────────────┐   │ │
│ │ │ Klient prosi o dodatkową kontrolę jakości przed wysyłką.          │   │ │
│ │ │ Sprawdzić uszczelki i okucia.                                     │   │ │
│ │ └───────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                          │ │
│ │ Anna Nowak • 03.12.2025 10:15                                [✏️] [🗑️] │ │
│ │ ┌───────────────────────────────────────────────────────────────────┐   │ │
│ │ │ Zmieniono kolor profili na życzenie klienta (z 050 na 730).       │   │ │
│ │ └───────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                          │ │
│ │ System • 01.12.2025 09:00                                               │ │
│ │ ┌───────────────────────────────────────────────────────────────────┐   │ │
│ │ │ Zlecenie zaimportowane z pliku 53520_uzyte_bele.csv               │   │ │
│ │ └───────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Schemat danych

```typescript
// Prisma model (już istnieje)
model Note {
  id        Int      @id @default(autoincrement())
  orderId   Int?
  order     Order?   @relation(fields: [orderId], references: [id])
  content   String
  isImportant Boolean @default(false)
  author    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// API
GET    /api/orders/:orderId/notes       // Lista notatek
POST   /api/orders/:orderId/notes       // Dodaj notatkę
PATCH  /api/notes/:id                   // Edytuj notatkę
DELETE /api/notes/:id                   // Usuń notatkę
```

### Komponent do utworzenia

```typescript
// apps/web/src/features/orders/components/OrderNotes.tsx

interface OrderNotesProps {
  orderId: number;
}

export function OrderNotes({ orderId }: OrderNotesProps) {
  const [newNote, setNewNote] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const { data: notes } = useQuery({
    queryKey: ['order-notes', orderId],
    queryFn: () => notesApi.getByOrder(orderId),
  });

  const addMutation = useMutation({
    mutationFn: (data: { content: string; isImportant: boolean }) =>
      notesApi.create(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['order-notes', orderId]);
      setNewNote('');
      setIsImportant(false);
    },
  });

  return (
    <div className="space-y-4">
      {/* Formularz dodawania */}
      <div className="space-y-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Nowa notatka..."
          rows={3}
        />
        <div className="flex justify-between items-center">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={isImportant}
              onCheckedChange={setIsImportant}
            />
            <span className="text-sm">Ważna notatka</span>
          </label>
          <Button
            onClick={() => addMutation.mutate({ content: newNote, isImportant })}
            disabled={!newNote.trim()}
          >
            Dodaj notatkę
          </Button>
        </div>
      </div>

      <Separator />

      {/* Lista notatek */}
      <div className="space-y-4">
        {notes?.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onEdit={() => setEditingNote(note)}
            onDelete={() => deleteMutation.mutate(note.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

### Szacowany czas: 3-4h

| Zadanie | Czas |
|---------|------|
| Komponent OrderNotes | 1.5h |
| Integracja w OrderDetailModal | 30 min |
| Edycja inline | 45 min |
| Usuwanie z potwierdzeniem | 30 min |
| Stylowanie + animacje | 30 min |

---

## 6. Zarządzanie Dniami Wolnymi

### Status
- **Backend:** ✅ Gotowy (`/api/working-days/*`)
- **Frontend:** ❌ Tylko prawy klik w kalendarzu

### Mockup - Strona `/ustawienia/dni-wolne`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Ustawienia > Dni wolne                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────┐          │
│ │ Rok: [2025 ▼]                                                   │          │
│ │                                                                 │          │
│ │ [🇵🇱 Import świąt PL]  [🇩🇪 Import świąt DE]  [+ Dodaj dzień]   │          │
│ └────────────────────────────────────────────────────────────────┘          │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │         Grudzień 2025                  Styczeń 2026                     │ │
│ │ ┌───┬───┬───┬───┬───┬───┬───┐  ┌───┬───┬───┬───┬───┬───┬───┐          │ │
│ │ │Pn │Wt │Śr │Cz │Pt │So │Nd │  │Pn │Wt │Śr │Cz │Pt │So │Nd │          │ │
│ │ ├───┼───┼───┼───┼───┼───┼───┤  ├───┼───┼───┼───┼───┼───┼───┤          │ │
│ │ │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │  │   │   │ 1 │ 2 │ 3 │ 4 │ 5 │          │ │
│ │ │ 8 │ 9 │10 │11 │12 │13 │14 │  │🔴6│ 7 │ 8 │ 9 │10 │11 │12 │          │ │
│ │ │15 │16 │17 │18 │19 │20 │21 │  │13 │14 │15 │16 │17 │18 │19 │          │ │
│ │ │22 │23 │🔴│🔴│🔴│27 │28 │  │20 │21 │22 │23 │24 │25 │26 │          │ │
│ │ │29 │30 │🔴│   │   │   │   │  │27 │28 │29 │30 │31 │   │   │          │ │
│ │ └───┴───┴───┴───┴───┴───┴───┘  └───┴───┴───┴───┴───┴───┴───┘          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Lista dni wolnych:                                                       │ │
│ │                                                                          │ │
│ │ Data         │ Opis                              │ Typ        │ Akcje   │ │
│ │──────────────│───────────────────────────────────│────────────│─────────│ │
│ │ 24.12.2025   │ Wigilia                           │ 🇵🇱 Święto │ [🗑️]    │ │
│ │ 25.12.2025   │ Boże Narodzenie                   │ 🇵🇱 Święto │ [🗑️]    │ │
│ │ 26.12.2025   │ Drugi dzień świąt                 │ 🇵🇱 Święto │ [🗑️]    │ │
│ │ 31.12.2025   │ Sylwester (zakład zamknięty)      │ 📅 Własny  │ [✏️][🗑️]│ │
│ │ 06.01.2026   │ Trzech Króli                      │ 🇵🇱 Święto │ [🗑️]    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mockup - Dialog dodawania dnia wolnego

```
┌─────────────────────────────────────────────────────────────────┐
│ Dodaj dzień wolny                                         [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Typ:                                                            │
│ ○ Pojedynczy dzień   ● Zakres dni                               │
│                                                                  │
│ Data od: [📅 24.12.2025]     Data do: [📅 26.12.2025]           │
│                                                                  │
│ Opis:                                                            │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Święta Bożego Narodzenia                                   │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                              [Anuluj]  [Dodaj]                  │
└─────────────────────────────────────────────────────────────────┘
```

### Import świąt - funkcja pomocnicza

```typescript
// Święta PL 2025/2026
const polishHolidays = {
  2025: [
    { date: '2025-01-01', name: 'Nowy Rok' },
    { date: '2025-01-06', name: 'Trzech Króli' },
    { date: '2025-04-20', name: 'Wielkanoc' },
    { date: '2025-04-21', name: 'Poniedziałek Wielkanocny' },
    { date: '2025-05-01', name: 'Święto Pracy' },
    { date: '2025-05-03', name: 'Święto Konstytucji' },
    { date: '2025-06-08', name: 'Zielone Świątki' },
    { date: '2025-06-19', name: 'Boże Ciało' },
    { date: '2025-08-15', name: 'Wniebowzięcie NMP' },
    { date: '2025-11-01', name: 'Wszystkich Świętych' },
    { date: '2025-11-11', name: 'Święto Niepodległości' },
    { date: '2025-12-24', name: 'Wigilia' },
    { date: '2025-12-25', name: 'Boże Narodzenie' },
    { date: '2025-12-26', name: 'Drugi dzień świąt' },
  ],
  // ... 2026
};

// Święta DE (różnią się w landach)
const germanHolidays = {
  2025: [
    { date: '2025-01-01', name: 'Neujahr' },
    { date: '2025-04-18', name: 'Karfreitag' },
    { date: '2025-04-20', name: 'Ostersonntag' },
    { date: '2025-04-21', name: 'Ostermontag' },
    { date: '2025-05-01', name: 'Tag der Arbeit' },
    // ...
  ],
};
```

### Szacowany czas: 3-4h

| Zadanie | Czas |
|---------|------|
| Strona + kalendarz | 1.5h |
| Lista dni wolnych (tabela) | 45 min |
| Dialog dodawania (pojedynczy/zakres) | 45 min |
| Import świąt PL/DE | 30 min |
| Edycja/usuwanie | 30 min |

---

## 7. Statystyki Miesięczne

### Status
- **Backend:** ✅ Gotowy (`/api/dashboard/stats/monthly`)
- **Frontend:** ❌ Brakuje widoku

### Mockup - Zakładka "Statystyki" na dashboardzie

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dashboard > Statystyki miesięczne                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Okres: [Grudzień ▼] [2025 ▼]                    [← Poprzedni] [Następny →]  │
│                                                                              │
│ ┌───────────────────────────────────────────────────────────────────────────┐
│ │                                                                           │
│ │  📊 PODSUMOWANIE MIESIĄCA                                                 │
│ │                                                                           │
│ │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│ │  │   OKNA      │  │   SZYBY     │  │  SKRZYDŁA   │  │  DOSTAWY    │      │
│ │  │    156      │  │    312      │  │    248      │  │     8       │      │
│ │  │   +12%      │  │    +8%      │  │   +15%      │  │    +2       │      │
│ │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘      │
│ │                                                                           │
│ └───────────────────────────────────────────────────────────────────────────┘
│                                                                              │
│ ┌───────────────────────────────────────────────────────────────────────────┐
│ │                                                                           │
│ │  📈 TREND (ostatnie 6 miesięcy)                                           │
│ │                                                                           │
│ │      200 ┤                                              ╭───╮             │
│ │          │                                         ╭────╯   │             │
│ │      150 ┤                               ╭─────────╯        │             │
│ │          │                    ╭──────────╯                  │             │
│ │      100 ┤         ╭─────────╯                              │             │
│ │          │  ╭──────╯                                        │             │
│ │       50 ┤──╯                                               │             │
│ │          │                                                  │             │
│ │        0 ┼────┬────┬────┬────┬────┬────                     │             │
│ │          Lip  Sie  Wrz  Paź  Lis  Gru                       │             │
│ │                                                             │             │
│ │    ─── Okna   ─── Szyby   ─── Skrzydła                     │             │
│ │                                                             │             │
│ └───────────────────────────────────────────────────────────────────────────┘
│                                                                              │
│ ┌───────────────────────────────────────────────────────────────────────────┐
│ │                                                                           │
│ │  🥧 PODZIAŁ KOLORÓW (grudzień)           📊 TOP 5 KLIENTÓW               │
│ │                                                                           │
│ │     ████ 35% - 050 Kremowy                  1. Firma ABC    - 45,000 PLN │
│ │     ████ 25% - 000 Biały                    2. Firma XYZ    - 38,000 PLN │
│ │     ███  20% - 730 Antracyt                 3. Jan Kowalski - 22,000 PLN │
│ │     ██   12% - 750 Biały strukturalny       4. Anna Nowak   - 18,000 PLN │
│ │     █     8% - Inne                         5. Firma DEF    - 15,000 PLN │
│ │                                                                           │
│ └───────────────────────────────────────────────────────────────────────────┘
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Schemat danych

```typescript
// GET /api/dashboard/stats/monthly?year=2025&month=12

interface MonthlyStats {
  year: number;
  month: number;
  windows: number;          // liczba okien
  glass: number;            // liczba szyb
  sashes: number;           // liczba skrzydeł
  deliveries: number;       // liczba dostaw
  totalValue: number;       // wartość w PLN

  // Porównanie z poprzednim miesiącem
  comparison: {
    windows: number;        // % zmiany
    glass: number;
    sashes: number;
    deliveries: number;
    value: number;
  };

  // Podział po kolorach
  colorBreakdown: Array<{
    colorId: number;
    colorCode: string;
    colorName: string;
    count: number;
    percent: number;
  }>;

  // Top klienci
  topCustomers: Array<{
    name: string;
    value: number;
    ordersCount: number;
  }>;
}

// GET /api/dashboard/stats/trend?months=6
interface TrendData {
  months: Array<{
    year: number;
    month: number;
    label: string;         // "Gru 2025"
    windows: number;
    glass: number;
    sashes: number;
  }>;
}
```

### Komponenty do utworzenia

1. **StatCard** - karta z liczbą i porównaniem
2. **TrendChart** - wykres liniowy (Recharts)
3. **ColorPieChart** - wykres kołowy
4. **TopCustomersTable** - mini tabela

### Szacowany czas: 3-4h

| Zadanie | Czas |
|---------|------|
| Layout strony + selektory | 30 min |
| StatCards (4 karty) | 45 min |
| TrendChart (Recharts) | 1h |
| ColorPieChart | 45 min |
| TopCustomersTable | 30 min |
| Responsywność + testy | 30 min |

---

## Podsumowanie

| # | Funkcjonalność | Czas | Priorytet |
|---|----------------|------|-----------|
| 1 | Zarządzanie profilami UI | 3-4h | WYSOKI |
| 2 | Protokoły odbioru dostaw | 30min-1h | WYSOKI |
| 3 | Historia magazynu | 2-3h | WYSOKI |
| 4 | Pełny raport braków | 2-3h | ŚREDNI |
| 5 | System notatek | 3-4h | ŚREDNI |
| 6 | Zarządzanie dniami wolnymi | 3-4h | ŚREDNI |
| 7 | Statystyki miesięczne | 3-4h | ŚREDNI |

**Łączny czas:** ~18-23h

**Rekomendowana kolejność:**
1. Protokoły odbioru (najszybsze)
2. Historia magazynu (prosta tabela)
3. Pełny raport braków (rozszerzenie istniejącego)
4. Zarządzanie profilami (rozszerzenie istniejącego)
5. Statystyki miesięczne (ładne wykresy)
6. System notatek (nowy moduł)
7. Dni wolne (najmniej pilne)

---

*Specyfikacja wygenerowana: 2025-12-07*
*Wersja: 1.0*
