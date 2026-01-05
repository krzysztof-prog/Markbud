# Remanent - Rozszerzone Wymagania: Archiwizacja i Średnia Miesięczna

## 🎯 Nowe Wymagania

### 1. Automatyczna Archiwizacja Podczas Remanentu

**Co ma się dziać:**
Podczas zapisywania remanentu, zlecenia które zostały **wykonane w danym miesiącu** mają:
- ✅ Zniknąć z widoku "Magazyn Akrobud" (tabela zleceń)
- ✅ Zniknąć z widoku "Profile na dostawy"
- ✅ Trafić do Archiwum

**Pytania do wyjaśnienia:**
1. **"Wykonane w danym miesiącu"** - co to dokładnie znaczy?
   - Opcja A: Zlecenia ze statusem `completed` w bieżącym miesiącu?
   - Opcja B: Zlecenia z datą dostawy (`deliveryDate`) w bieżącym miesiącu?
   - Opcja C: Wszystkie zlecenia które NIE są `new` lub `in_progress`?

2. **Który miesiąc?**
   - Opcja A: Miesiąc w którym robimy remanent (np. robimy remanent 5 grudnia = archiwizuj listopad)
   - Opcja B: Poprzedni miesiąc kalendarzowy
   - Opcja C: Ostatnie 30 dni

### 2. Średnia Miesięczna w Tabeli

**Co ma być dodane:**
- ✅ Kolumna "Średnia" w tabeli magazynu
- ✅ Input nad tabelą: "Średnia z ostatnich X miesięcy"
- ✅ Auto-obliczanie średniego zużycia dla każdego profilu

**Przykład tabeli:**

```
┌──────────────────────────────────────────────────────────────┐
│ Średnia z ostatnich: [6▼] miesięcy                          │
├─────────┬────────┬──────────┬────────┬────────┬─────────────┤
│ Profil  │ Stan   │ Zapotrz. │ Po zap.│ Zamów. │ Średnia/mies│
├─────────┼────────┼──────────┼────────┼────────┼─────────────┤
│ 58120   │ 45 bel │ 12 bel   │ 33 bel │ 20 bel │ 8.5 bel     │
│ 60245   │ 12 bel │ 5 bel    │ 7 bel  │ 0 bel  │ 3.2 bel     │
└─────────┴────────┴──────────┴────────┴────────┴─────────────┘
```

---

## 📊 Analiza Obecnego Stanu - Co Już Istnieje?

### Częściowa Implementacja w Backend

**Plik:** `apps/api/src/routes/warehouse.ts:234-246`

```typescript
// Archiwizuj zrealizowane zlecenia dla tego koloru
const completedOrders = await prisma.order.updateMany({
  where: {
    status: 'completed',  // ⚠️ Tylko status 'completed'
    archivedAt: null,     // ⚠️ Jeszcze nie zarchiwizowane
    requirements: {
      some: { colorId },  // ⚠️ Tylko dla tego koloru
    },
  },
  data: {
    status: 'archived',
    archivedAt: new Date(),
  },
});
```

**Problem z obecną implementacją:**
- ❌ Archiwizuje TYLKO dla `colorId` który jest remanentowany
- ❌ Jeśli robimy remanent kolor po kolorze, nie archiwizuje wszystkich zleceń z miesiąca
- ❌ Brak filtrowania po dacie ("wykonane w danym miesiącu")

---

## 🔧 Wymagane Zmiany w Bazie Danych

### Analiza Tabel

#### Tabela `Order`
```prisma
model Order {
  id             Int       @id @default(autoincrement())
  orderNumber    String    @unique @map("order_number")
  status         String    @default("new") // ⚠️ Jakie statusy?
  deliveryDate   DateTime? @map("delivery_date") // ⚠️ Data dostawy
  archivedAt     DateTime? @map("archived_at") // ✅ Jest!
  createdAt      DateTime  @default(now())
  // ...
}
```

**Pytania:**
1. Jakie są możliwe statusy zlecenia?
   - `new`, `in_progress`, `completed`, `archived`?
   - Czy są inne statusy?

2. Która data liczy się jako "wykonanie"?
   - `deliveryDate` - data dostawy?
   - `completedDate` - nie istnieje?
   - Status zmieniony na `completed` - kiedy?

---

## 💡 Propozycja Rozwiązania

### Opcja A: Archiwizacja na Koniec Remanentu dla WSZYSTKICH Kolorów

**Workflow:**
```
1. Użytkownik robi remanent dla każdego koloru
2. Po zakończeniu OSTATNIEGO koloru:
   └─→ Pytanie: "Czy chcesz zarchiwizować ukończone zlecenia?"
       └─→ TAK: Archiwizuj wszystkie completed z miesiąca
```

**Zalety:**
- ✅ Pewność że wszystkie kolory zinwentaryzowane
- ✅ Jedna operacja archiwizacji na koniec

**Wady:**
- ❌ Użytkownik musi pamiętać
- ❌ Co jeśli robi remanent przez kilka dni?

### Opcja B: Automatyczna Archiwizacja Podczas Pierwszego Remanentu w Miesiącu

**Workflow:**
```
1. System sprawdza: "Czy to pierwszy remanent w tym miesiącu?"
2. Jeśli TAK:
   └─→ Automatycznie archiwizuj zlecenia z POPRZEDNIEGO miesiąca
3. Kontynuuj normalny remanent
```

**Zalety:**
- ✅ Automatyczne, użytkownik nie musi pamiętać
- ✅ Logiczne: remanent grudnia = archiwizuj listopad

**Wady:**
- ❌ Wymaga śledzenia "pierwszego remanentu"

### Opcja C: Przycisk "Zakończ Remanent Miesiąca" ⭐ REKOMENDACJA

**Workflow:**
```
/magazyn/akrobud/remanent
└─→ Po zrobieniu remanentów dla wszystkich kolorów:
    └─→ Przycisk: [Zakończ remanent za miesiąc X]
        └─→ Modal: "Zarchiwizować 15 ukończonych zleceń z listopada?"
            └─→ [Tak, zakończ remanent]
                └─→ Archiwizacja wszystkich completed zleceń
```

**Zalety:**
- ✅ Kontrola użytkownika
- ✅ Wyraźna akcja "koniec miesiąca"
- ✅ Modal pokazuje co będzie zarchiwizowane

---

## 📈 Średnia Miesięczna - Szczegółowa Specyfikacja

### Skąd Brać Dane?

**Źródło danych:** Tabela dostaw + zapotrzebowania

#### Opcja 1: Z `Delivery` + profile użyte
```sql
-- Dla każdego profilu: ile bel użyto w danym miesiącu
SELECT
  profileId,
  MONTH(deliveryDate) as month,
  YEAR(deliveryDate) as year,
  SUM(beamsUsed) as totalBeams
FROM deliveries
WHERE deliveryDate >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
GROUP BY profileId, YEAR(deliveryDate), MONTH(deliveryDate)
```

**Problem:** Skąd wziąć `beamsUsed` dla profilu w dostawie?

#### Opcja 2: Z `OrderRequirement`
```sql
-- Dla każdego profilu: ile bel w zleceniach tego miesiąca
SELECT
  profileId,
  colorId,
  MONTH(o.deliveryDate) as month,
  YEAR(o.deliveryDate) as year,
  SUM(beamsCount) as totalBeams
FROM order_requirements or
JOIN orders o ON or.orderId = o.id
WHERE o.deliveryDate >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
  AND o.status IN ('completed', 'archived')
GROUP BY profileId, colorId, YEAR(o.deliveryDate), MONTH(o.deliveryDate)
```

**To ma sens!** Zlecenia które zostały zrealizowane pokazują zużycie.

### Obliczanie Średniej

```typescript
// Przykład dla profilu 58120, kolor C31, ostatnie 6 miesięcy
const monthlyUsage = [
  { month: '2025-11', beams: 12 },
  { month: '2025-10', beams: 8 },
  { month: '2025-09', beams: 10 },
  { month: '2025-08', beams: 9 },
  { month: '2025-07', beams: 7 },
  { month: '2025-06', beams: 5 },
];

const average = monthlyUsage.reduce((sum, m) => sum + m.beams, 0) / 6;
// = 51 / 6 = 8.5 bel/miesiąc
```

### Nowy Endpoint Backend

```typescript
// GET /api/warehouse/:colorId/average?months=6
fastify.get<{
  Params: { colorId: string };
  Querystring: { months?: string };
}>('/:colorId/average', async (request) => {
  const { colorId } = request.params;
  const months = parseInt(request.query.months || '6');

  // Pobierz datę sprzed X miesięcy
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Zapytanie do bazy: sumuj beamsCount per profil per miesiąc
  const usage = await prisma.$queryRaw`
    SELECT
      or.profile_id as profileId,
      strftime('%Y-%m', o.delivery_date) as month,
      SUM(or.beams_count) as totalBeams
    FROM order_requirements or
    JOIN orders o ON or.order_id = o.id
    WHERE or.color_id = ${parseInt(colorId)}
      AND o.delivery_date >= ${startDate}
      AND o.status IN ('completed', 'archived')
    GROUP BY or.profile_id, strftime('%Y-%m', o.delivery_date)
  `;

  // Oblicz średnią dla każdego profilu
  const averages = calculateAverages(usage, months);

  return averages;
});
```

---

## 🔄 Zaktualizowana Struktura Bazy - Czy Coś Trzeba Dodać?

### Analiza: Pole `completedDate` w `Order`?

**Obecny stan:**
```prisma
model Order {
  status         String    @default("new")
  deliveryDate   DateTime? @map("delivery_date")
  archivedAt     DateTime? @map("archived_at")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

**Problem:** Nie wiemy KIEDY zlecenie zostało completed.

**Propozycja:**
```prisma
model Order {
  // ... istniejące pola
  completedAt    DateTime? @map("completed_at") // ⭐ NOWE
  // ...
}
```

**Kiedy ustawić:**
```typescript
// Gdy zmieniamy status na 'completed'
await prisma.order.update({
  where: { id: orderId },
  data: {
    status: 'completed',
    completedAt: new Date(), // ⭐
  },
});
```

**Czy to potrzebne?**
- 🟡 Może być przydatne dla raportów
- ❌ `deliveryDate` może wystarczyć?
- ✅ Ale `deliveryDate` to planowana data, a `completedAt` to rzeczywista

**Decyzja:** 🟢 **DODAĆ** - to przydatne pole audytowe

---

## 📋 Zaktualizowany Plan Implementacji

### Zmiany w Bazie Danych

#### 1. Dodać pole `completedAt` do `Order`

**Migracja:**
```prisma
model Order {
  // ... istniejące pola
  completedAt    DateTime? @map("completed_at")
  // ...
}
```

```sql
-- Migration
ALTER TABLE "orders" ADD COLUMN "completed_at" TIMESTAMP;

-- Backfill dla istniejących 'completed' orders
UPDATE "orders"
SET "completed_at" = "updated_at"
WHERE "status" = 'completed' AND "completed_at" IS NULL;
```

### Zmiany w Backend API

#### 1. Endpoint: Obliczanie średniej miesięcznej

```typescript
GET /api/warehouse/:colorId/average?months=6

Response:
{
  "averages": [
    {
      "profileId": 1,
      "profileNumber": "58120",
      "averageBeamsPerMonth": 8.5,
      "monthlyData": [
        { "month": "2025-11", "beams": 12 },
        { "month": "2025-10", "beams": 8 },
        // ...
      ]
    }
  ]
}
```

#### 2. Endpoint: Finalizacja remanentu miesiąca

```typescript
POST /api/warehouse/finalize-month

Body:
{
  "month": "2025-11", // Który miesiąc finalizujemy
  "archive": true     // Czy zarchiwizować zlecenia
}

Response:
{
  "archivedOrders": 15,
  "archivedOrderNumbers": ["Z123", "Z124", ...],
  "message": "Zarchiwizowano 15 zleceń z listopada 2025"
}
```

### Zmiany w Frontend

#### 1. Kolumna "Średnia" w tabeli magazynu

**Plik:** `apps/web/src/app/magazyn/akrobud/page.tsx`

```tsx
// Dodać state dla liczby miesięcy
const [averageMonths, setAverageMonths] = useState(6);

// Query dla średnich
const { data: averages } = useQuery({
  queryKey: ['warehouse-average', selectedColorId, averageMonths],
  queryFn: () => warehouseApi.getAverage(selectedColorId!, averageMonths),
  enabled: !!selectedColorId,
});

// W tabeli:
<th>Średnia ({averageMonths}m)</th>
// ...
<td>{getAverage(row.profileId)} bel/mies</td>
```

#### 2. Input nad tabelą

```tsx
<div className="flex items-center gap-2 mb-4">
  <label>Średnia z ostatnich:</label>
  <Input
    type="number"
    min="1"
    max="24"
    value={averageMonths}
    onChange={(e) => setAverageMonths(Number(e.target.value))}
    className="w-20"
  />
  <span>miesięcy</span>
</div>
```

#### 3. Przycisk "Zakończ remanent miesiąca"

**Plik:** `apps/web/src/app/magazyn/akrobud/remanent/page.tsx`

```tsx
<Button
  variant="outline"
  onClick={() => setFinalizeModalOpen(true)}
>
  <Archive className="h-4 w-4 mr-2" />
  Zakończ remanent za {currentMonth}
</Button>
```

---

## ❓ Pytania do Użytkownika - Wymagające Odpowiedzi

### 1. Archiwizacja - Kiedy i Jak?

**Opcja A:** Automatycznie po każdym remanent (dla tego koloru)
**Opcja B:** Tylko po pierwszym remanent w miesiącu (dla wszystkich)
**Opcja C:** Ręcznie - przycisk "Zakończ remanent miesiąca" ⭐

**Twój wybór:** ?

### 2. Które zlecenia archiwizować?

**Kryteria:**
- Status = `completed` ?
- Data dostawy w poprzednim miesiącu?
- Czy tylko dla kolorów które były remanentowane?

**Twoja definicja "wykonane w danym miesiącu":** ?

### 3. Średnia - Źródło danych

**Opcja A:** Z `OrderRequirement` (zlecenia completed/archived)
**Opcja B:** Z jakiejś innej tabeli?

**Twój wybór:** ?

### 4. Średnia - Domyślna liczba miesięcy

**Opcje:** 3, 6, 12 miesięcy?

**Twój wybór:** ?

---

## 📊 Oszacowanie Czasu (po wyjaśnieniu wymagań)

### Backend
- Dodać pole `completedAt` + migracja: **15 min**
- Endpoint średniej miesięcznej: **1-2h**
- Endpoint finalizacji miesiąca: **45 min**
- Modyfikacja logiki archiwizacji: **30 min**

**Razem backend:** ~3h

### Frontend
- Kolumna średniej w tabeli: **30 min**
- Input liczby miesięcy: **15 min**
- Przycisk finalizacji + modal: **45 min**
- Integracja z API: **30 min**

**Razem frontend:** ~2h

### **Całość:** 5-6h (zamiast 4-6h)

---

**Status:** 🟡 Czeka na odpowiedzi użytkownika
**Dokument:** `.plan/remanent-archiving-requirements.md`
