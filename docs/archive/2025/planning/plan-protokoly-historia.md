# Plan Implementacji: Protokoły Odbioru (2) i Historia Magazynu (3)

## Podsumowanie Analizy

### Co Odkryłem:

#### Backend - Protocol Endpoint (GET /api/deliveries/:id/protocol)
**Lokalizacja:** `apps/api/src/routes/deliveries.ts:520-594`

**WAŻNE:** Endpoint **zwraca JSON**, nie PDF:
```typescript
return {
  deliveryId: deliveryId,
  deliveryDate: delivery.deliveryDate,
  orders: [...],  // Lista zleceń z detalami
  totalWindows,
  totalPallets,
  totalValue,
  generatedAt: new Date(),
};
```

**Wniosek:** Trzeba dodać generowanie PDF na backendzie (analogicznie do `/api/pallets/export/:id`)

#### Backend - History Endpoint (GET /api/warehouse/history/:colorId)
**Lokalizacja:** `apps/api/src/routes/warehouse.ts:263-322`

**Status:** ✅ W pełni gotowy, zwraca:
```typescript
{
  id, profileId, colorId,
  calculatedStock, actualStock, difference,
  recordedAt,
  profile: { id, number, name },
  color: { id, code, name }
}
```

#### Frontend - Wzorzec PDF Download
**Znaleziony wzorzec:** `apps/web/src/app/dostawy/[id]/optymalizacja/page.tsx`
- Hook: `useDownloadPdf()` z `@/features/pallets/hooks/usePalletOptimization.ts`
- API: `palletsApi.exportToPdf()` w `apps/web/src/lib/api.ts:478-501`

#### Frontend - Szczegóły Dostawy (Dialog)
**Lokalizacja:** `apps/web/src/app/dostawy/DostawyPageContent.tsx:1364-1534`
- Dialog ze szczegółami dostawy
- Przyciski: "Zlecenia zakończone", "Optymalizuj palety", "Usuń dostawę"
- **Tu trzeba dodać:** przycisk "Generuj protokół"

#### Frontend - Magazyn Akrobud
**Lokalizacja:** `apps/web/src/app/magazyn/akrobud/MagazynAkrobudPageContent.tsx`
- Aktualnie 2 zakładki: "zlecenia" i "magazyn"
- **Trzeba dodać:** trzecią zakładkę "historia"

---

## Plan Implementacji

### FAZA 1: Protokół Odbioru Dostaw

#### 1.1 Backend - Dodać PDF Generator
**Plik:** `apps/api/src/services/DeliveryProtocolService.ts` (NOWY)

```typescript
// Analogicznie do PdfExportService dla palet
// Użyć biblioteki pdfkit lub pdf-lib

export class DeliveryProtocolService {
  async generateProtocolPdf(deliveryId: number): Promise<Buffer> {
    // 1. Pobierz dane protokołu (istniejący endpoint)
    // 2. Wygeneruj PDF z:
    //    - Nagłówek: "Protokół Odbioru Dostawy"
    //    - Data dostawy
    //    - Tabela zleceń
    //    - Podsumowanie (okna, palety, wartość)
    //    - Miejsce na podpis
  }
}
```

#### 1.2 Backend - Nowy Endpoint PDF
**Plik:** `apps/api/src/routes/deliveries.ts`

```typescript
// GET /api/deliveries/:id/protocol/pdf
fastify.get<{ Params: { id: string } }>(
  '/:id/protocol/pdf',
  async (request, reply) => {
    const buffer = await protocolService.generateProtocolPdf(id);
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="protokol-${id}.pdf"`)
      .send(buffer);
  }
);
```

#### 1.3 Frontend - API Client
**Plik:** `apps/web/src/lib/api.ts`

```typescript
// Dodać do deliveriesApi:
getProtocolPdf: async (deliveryId: number): Promise<Blob> => {
  const url = `${API_URL}/api/deliveries/${deliveryId}/protocol/pdf`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Błąd pobierania protokołu');
  return response.blob();
}
```

#### 1.4 Frontend - Hook
**Plik:** `apps/web/src/features/deliveries/hooks/useDeliveryProtocol.ts` (NOWY)

```typescript
export function useDownloadProtocol() {
  return useMutation({
    mutationFn: async (deliveryId: number) => {
      const blob = await deliveriesApi.getProtocolPdf(deliveryId);
      // Download logic (jak w useDownloadPdf)
    },
  });
}
```

#### 1.5 Frontend - Przycisk w Dialogu
**Plik:** `apps/web/src/app/dostawy/DostawyPageContent.tsx`

Dodać w DialogFooter (linia ~1501):
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleDownloadProtocol}
  disabled={downloadProtocol.isPending}
>
  <FileText className="h-4 w-4 mr-2" />
  {downloadProtocol.isPending ? 'Generuję...' : 'Protokół odbioru'}
</Button>
```

---

### FAZA 2: Historia Magazynu

#### 2.1 Frontend - API Client
**Plik:** `apps/web/src/lib/api.ts`

```typescript
// Dodać do warehouseApi:
getHistory: (colorId: number, limit?: number) =>
  fetchApi<WarehouseHistoryEntry[]>(
    `/api/warehouse/history/${colorId}${limit ? `?limit=${limit}` : ''}`
  ),
```

#### 2.2 Frontend - Typ TypeScript
**Plik:** `apps/web/src/types/warehouse.ts` lub index.ts

```typescript
export interface WarehouseHistoryEntry {
  id: number;
  profileId: number;
  colorId: number;
  calculatedStock: number;
  actualStock: number;
  difference: number;
  recordedAt: string;
  profile: {
    id: number;
    number: string;
    name: string;
  };
  color: {
    id: number;
    code: string;
    name: string;
  };
}
```

#### 2.3 Frontend - Komponent Historii
**Plik:** `apps/web/src/features/warehouse/components/WarehouseHistory.tsx` (NOWY)

```tsx
interface Props {
  colorId: number;
}

export function WarehouseHistory({ colorId }: Props) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['warehouse-history', colorId],
    queryFn: () => warehouseApi.getHistory(colorId, 100),
  });

  // Tabela z kolumnami:
  // Data | Profil | Stan obliczony | Stan rzeczywisty | Różnica
  // Z kolorowaniem różnic (zielony +, czerwony -)
}
```

#### 2.4 Frontend - Trzecia Zakładka
**Plik:** `apps/web/src/app/magazyn/akrobud/MagazynAkrobudPageContent.tsx`

Zmienić:
```tsx
// Z:
const [activeTab, setActiveTab] = useState<'zlecenia' | 'magazyn'>('zlecenia');

// Na:
const [activeTab, setActiveTab] = useState<'zlecenia' | 'magazyn' | 'historia'>('zlecenia');
```

Dodać w TabsList:
```tsx
<TabsTrigger value="historia">
  Historia
</TabsTrigger>
```

Dodać TabsContent:
```tsx
<TabsContent value="historia">
  {selectedColorId && <WarehouseHistory colorId={selectedColorId} />}
</TabsContent>
```

---

## Kolejność Implementacji (Optymalna)

### Krok 1: Historia Magazynu (~1h)
- Backend jest **gotowy** ✅
- Tylko frontend do zrobienia
- Niższe ryzyko

**Pliki do edycji:**
1. `apps/web/src/lib/api.ts` - dodać `getHistory`
2. `apps/web/src/types/index.ts` - dodać typ
3. `apps/web/src/features/warehouse/components/WarehouseHistory.tsx` - NOWY
4. `apps/web/src/app/magazyn/akrobud/MagazynAkrobudPageContent.tsx` - trzecia zakładka

### Krok 2: Protokół Odbioru (~2-3h)
- Wymaga pracy backend + frontend
- Większy zakres zmian

**Pliki do utworzenia/edycji:**
1. `apps/api/src/services/DeliveryProtocolService.ts` - NOWY (PDF generator)
2. `apps/api/src/routes/deliveries.ts` - nowy endpoint
3. `apps/web/src/lib/api.ts` - dodać `getProtocolPdf`
4. `apps/web/src/features/deliveries/hooks/useDeliveryProtocol.ts` - NOWY
5. `apps/web/src/app/dostawy/DostawyPageContent.tsx` - przycisk

---

## Potencjalne Ryzyka i Mitigacje

### 1. Biblioteka PDF
**Ryzyko:** Może nie być zainstalowanej biblioteki PDF w backendzie
**Mitigacja:** Sprawdzić package.json, zainstalować `pdfkit` lub `pdf-lib` jeśli brak

### 2. Struktura danych protokołu
**Ryzyko:** Obecny endpoint `/protocol` może nie zwracać wszystkich potrzebnych danych
**Mitigacja:** Reużyć istniejący kod pobierania danych, rozszerzyć jeśli potrzeba

### 3. Testy
**Ryzyko:** Brak testów może prowadzić do regresji
**Mitigacja:** Testować ręcznie po każdym kroku, dodać podstawowe testy jednostkowe

---

---

## Status Implementacji: ✅ UKOŃCZONE

**Data ukończenia:** 2025-12-07

### FAZA 1: Historia Magazynu ✅

| Plik | Status | Opis |
|------|--------|------|
| `apps/web/src/lib/api.ts` | ✅ | Dodano `getHistory` do `warehouseApi`, zmieniono typ zwrotny na `RemanentHistoryEntry[]` |
| `apps/web/src/types/warehouse.ts` | ✅ | Typ `RemanentHistoryEntry` już istniał |
| `apps/web/src/features/warehouse/components/WarehouseHistory.tsx` | ✅ NOWY | Komponent z tabelą historii pogrupowaną po dacie |
| `apps/web/src/app/magazyn/akrobud/MagazynAkrobudPageContent.tsx` | ✅ | Dodano trzecią zakładkę "Historia" |

**Funkcje:**
- Wyświetlanie historii magazynu pogrupowanej po dacie
- Kolorowanie różnic (zielony +, czerwony -)
- Ikony trendów (TrendingUp, TrendingDown, Minus)
- Podsumowanie różnic dla każdego dnia
- Optymalizacja: `useMemo` dla grupowania, helper functions poza komponentem

### FAZA 2: Protokół Odbioru Dostaw ✅

| Plik | Status | Opis |
|------|--------|------|
| `apps/api/src/services/DeliveryProtocolService.ts` | ✅ NOWY | Serwis generujący PDF protokołu z pdfkit |
| `apps/api/src/routes/deliveries.ts` | ✅ | Dodano endpoint `GET /:id/protocol/pdf` |
| `apps/web/src/lib/api.ts` | ✅ | Dodano `getProtocolPdf` do `deliveriesApi` |
| `apps/web/src/features/deliveries/hooks/useDeliveries.ts` | ✅ | Dodano hook `useDownloadDeliveryProtocol()` |
| `apps/web/src/app/dostawy/DostawyPageContent.tsx` | ✅ | Dodano przycisk "Protokół odbioru" w dialogu szczegółów dostawy |

**Funkcje PDF protokołu:**
- Nagłówek z numerem dostawy i datą
- Podsumowanie: liczba zleceń, okien, palet, wartość
- Tabela zleceń z kolumnami: Lp, Numer zlecenia, Okna, Wartość, Reklamacja
- Sekcja podpisów (wydał/odebrał)
- Automatyczne stronicowanie dla długich list
- Stopka z numerem strony i datą generowania

### Naprawione dodatkowe błędy:

| Plik | Błąd | Rozwiązanie |
|------|------|-------------|
| `apps/web/src/components/ui/alert.tsx` | Brakował komponent | Dodano komponent Alert z shadcn/ui |

### Optymalizacje wprowadzone podczas code review:

1. **WarehouseHistory.tsx:**
   - Helper functions (`getDifferenceIcon`, `getDifferenceColor`) przeniesione poza komponent
   - `useMemo` dla grupowania danych po dacie
   - Prawidłowy typ dla `EmptyState.icon` (JSX element zamiast komponentu)

---

## Szacowany vs Rzeczywisty Czas

| Faza | Szacowany | Rzeczywisty |
|------|-----------|-------------|
| Historia Magazynu | ~1h | ~45min |
| Protokół Odbioru | ~2-3h | ~1.5h |
| Code Review + Poprawki | - | ~30min |
| **Razem** | **~3-4h** | **~2.75h** |
