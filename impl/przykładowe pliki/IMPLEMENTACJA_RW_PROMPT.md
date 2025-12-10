# Prompt: Implementacja Systemu RW (Rozchód Wewnętrzny)

## Kontekst Projektu

Projekt Markbud to system zarządzania produkcją okien i drzwi PVC. Stack technologiczny:
- **Backend**: Fastify + Prisma ORM + SQLite
- **Frontend**: Next.js 15 + React Query + Tailwind CSS
- **Monorepo**: pnpm workspace (`apps/api`, `apps/web`)

## Cel Implementacji

Wdrożenie systemu RW (Rozchód Wewnętrzny) do śledzenia zużycia profili aluminiowych w produkcji. System ma automatycznie rejestrować zużycie przy oznaczaniu dostaw szkła jako "dostarczonych" oraz wyświetlać dane RW w tabeli magazynowej.

## Architektura Rozwiązania

### Modele Bazy Danych (Prisma Schema)

```prisma
model MonthlyConsumption {
  id            Int                 @id @default(autoincrement())
  year          Int
  month         Int
  profileId     Int
  colorId       Int
  consumedBeams Int                 @default(0)
  isArchived    Boolean             @default(false)
  archivedAt    DateTime?

  profile       Profile             @relation(fields: [profileId], references: [id])
  color         Color               @relation(fields: [colorId], references: [id])
  entries       ConsumptionEntry[]

  @@unique([year, month, profileId, colorId])
  @@index([year, month])
  @@index([profileId])
  @@index([colorId])
  @@map("monthly_consumption")
}

model ConsumptionEntry {
  id                   Int                 @id @default(autoincrement())
  monthlyConsumptionId Int
  deliveryId           Int
  orderId              Int
  profileId            Int
  colorId              Int
  beamsCount           Int
  recordedAt           DateTime            @default(now())

  monthlyConsumption   MonthlyConsumption  @relation(fields: [monthlyConsumptionId], references: [id], onDelete: Cascade)
  delivery             GlassDelivery       @relation(fields: [deliveryId], references: [id])
  order                Order               @relation(fields: [orderId], references: [id])
  profile              Profile             @relation(fields: [profileId], references: [id])
  color                Color               @relation(fields: [colorId], references: [id])

  @@index([monthlyConsumptionId])
  @@index([deliveryId])
  @@index([orderId])
  @@index([profileId])
  @@index([colorId])
  @@map("consumption_entries")
}
```

**WAŻNE**: Dodaj też relacje w istniejących modelach:
```prisma
model Profile {
  // ... existing fields
  monthlyConsumption MonthlyConsumption[]
  consumptionEntries ConsumptionEntry[]
}

model Color {
  // ... existing fields
  monthlyConsumption MonthlyConsumption[]
  consumptionEntries ConsumptionEntry[]
}

model GlassDelivery {
  // ... existing fields
  consumptionEntries ConsumptionEntry[]
}

model Order {
  // ... existing fields
  consumptionEntries ConsumptionEntry[]
}
```

### Backend Implementation

#### 1. Consumption Service (`apps/api/src/services/consumption-service.ts`)

```typescript
import { PrismaClient } from '@prisma/client';

interface RecordConsumptionData {
  deliveryId: number;
  orderId: number;
  profileId: number;
  colorId: number;
  beamsCount: number;
  year: number;
  month: number;
}

export class ConsumptionService {
  constructor(private prisma: PrismaClient) {}

  async recordConsumption(data: RecordConsumptionData) {
    // 1. Upsert MonthlyConsumption (znajdź lub utwórz)
    const monthlyConsumption = await this.prisma.monthlyConsumption.upsert({
      where: {
        year_month_profileId_colorId: {
          year: data.year,
          month: data.month,
          profileId: data.profileId,
          colorId: data.colorId,
        },
      },
      create: {
        year: data.year,
        month: data.month,
        profileId: data.profileId,
        colorId: data.colorId,
        consumedBeams: data.beamsCount,
      },
      update: {
        consumedBeams: { increment: data.beamsCount },
      },
    });

    // 2. Utwórz ConsumptionEntry
    const entry = await this.prisma.consumptionEntry.create({
      data: {
        monthlyConsumptionId: monthlyConsumption.id,
        deliveryId: data.deliveryId,
        orderId: data.orderId,
        profileId: data.profileId,
        colorId: data.colorId,
        beamsCount: data.beamsCount,
      },
    });

    return { monthlyConsumption, entry };
  }

  async getCurrentConsumption(colorId: number, year: number, month: number) {
    return this.prisma.monthlyConsumption.findMany({
      where: { colorId, year, month, isArchived: false },
      include: {
        profile: true,
      },
    });
  }

  async getAverageConsumption(colorId: number, months: number) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const consumptions = await this.prisma.monthlyConsumption.findMany({
      where: {
        colorId,
        isArchived: false,
        OR: [
          {
            year: { gt: startDate.getFullYear() },
          },
          {
            year: startDate.getFullYear(),
            month: { gte: startDate.getMonth() + 1 },
          },
        ],
        AND: [
          {
            year: { lt: endDate.getFullYear() },
          },
          {
            year: endDate.getFullYear(),
            month: { lte: endDate.getMonth() + 1 },
          },
        ],
      },
    });

    // Grupuj po profileId i oblicz średnią
    const averages = consumptions.reduce((acc, curr) => {
      if (!acc[curr.profileId]) {
        acc[curr.profileId] = { totalBeams: 0, count: 0 };
      }
      acc[curr.profileId].totalBeams += curr.consumedBeams;
      acc[curr.profileId].count += 1;
      return acc;
    }, {} as Record<number, { totalBeams: number; count: number }>);

    return Object.entries(averages).map(([profileId, data]) => ({
      profileId: Number(profileId),
      averageBeamsPerMonth: data.totalBeams / data.count,
      totalMonths: data.count,
    }));
  }
}
```

#### 2. Consumption Routes (`apps/api/src/routes/consumption-routes.ts`)

```typescript
import { FastifyPluginAsync } from 'fastify';
import { ConsumptionService } from '../services/consumption-service.js';

export const consumptionRoutes: FastifyPluginAsync = async (fastify) => {
  const consumptionService = new ConsumptionService(fastify.prisma);

  // GET /api/consumption/current/:colorId/:year/:month
  fastify.get<{
    Params: { colorId: string; year: string; month: string };
  }>('/current/:colorId/:year/:month', async (request, reply) => {
    const { colorId, year, month } = request.params;
    const data = await consumptionService.getCurrentConsumption(
      Number(colorId),
      Number(year),
      Number(month)
    );
    return reply.send(data);
  });

  // GET /api/consumption/average/:colorId
  fastify.get<{
    Params: { colorId: string };
    Querystring: { months?: string };
  }>('/average/:colorId', async (request, reply) => {
    const { colorId } = request.params;
    const { months = '6' } = request.query;
    const data = await consumptionService.getAverageConsumption(
      Number(colorId),
      Number(months)
    );
    return reply.send(data);
  });
};
```

#### 3. Rejestracja Routes w `apps/api/src/server.ts`

```typescript
import { consumptionRoutes } from './routes/consumption-routes.js';

// ... w funkcji createServer():
await server.register(consumptionRoutes, { prefix: '/api/consumption' });
```

#### 4. Modyfikacja Glass Delivery Service

W `apps/api/src/services/glass-delivery-service.ts`, dodaj logikę RW do metody `markAsDelivered`:

```typescript
async markAsDelivered(id: number) {
  const delivery = await this.prisma.glassDelivery.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          windows: {
            include: {
              sashes: true,
            },
          },
        },
      },
    },
  });

  if (!delivery) throw new Error('Delivery not found');
  if (delivery.status === 'delivered') {
    throw new Error('Delivery already marked as delivered');
  }

  // 1. Oznacz jako dostarczone
  const updated = await this.prisma.glassDelivery.update({
    where: { id },
    data: {
      status: 'delivered',
      actualDeliveryDate: new Date(),
    },
  });

  // 2. Zbierz profile z okien i skrzydeł
  const profileUsage: Record<string, { profileId: number; colorId: number; beams: number }> = {};

  for (const window of delivery.order.windows) {
    const key = `${window.profileId}-${window.colorId}`;
    if (!profileUsage[key]) {
      profileUsage[key] = { profileId: window.profileId, colorId: window.colorId, beams: 0 };
    }
    profileUsage[key].beams += 1; // 1 bel na okno

    for (const sash of window.sashes) {
      const sashKey = `${sash.profileId}-${sash.colorId}`;
      if (!profileUsage[sashKey]) {
        profileUsage[sashKey] = { profileId: sash.profileId, colorId: sash.colorId, beams: 0 };
      }
      profileUsage[sashKey].beams += 1; // 1 bel na skrzydło
    }
  }

  // 3. Zapisz RW dla każdego profilu/koloru
  const consumptionService = new ConsumptionService(this.prisma);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  for (const usage of Object.values(profileUsage)) {
    await consumptionService.recordConsumption({
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      profileId: usage.profileId,
      colorId: usage.colorId,
      beamsCount: usage.beams,
      year,
      month,
    });
  }

  return updated;
}
```

### Frontend Implementation

#### 1. API Client (`apps/web/src/lib/api.ts`)

Dodaj nowy endpoint:

```typescript
export const consumptionApi = {
  getCurrentConsumption: async (colorId: number, year: number, month: number) => {
    const response = await fetch(
      `${API_BASE_URL}/consumption/current/${colorId}/${year}/${month}`
    );
    if (!response.ok) throw new Error('Failed to fetch current consumption');
    return response.json();
  },

  getAverageConsumption: async (colorId: number, months: number = 6) => {
    const response = await fetch(
      `${API_BASE_URL}/consumption/average/${colorId}?months=${months}`
    );
    if (!response.ok) throw new Error('Failed to fetch average consumption');
    return response.json();
  },
};
```

#### 2. Modyfikacja UI Magazynu (`apps/web/src/app/magazyn/akrobud/szczegoly/MagazynAkrobudPageContent.tsx`)

**Zmiany:**

1. **Import nowego API:**
```typescript
import { consumptionApi } from '@/lib/api';
```

2. **Dodaj state dla RW months:**
```typescript
const [rwMonths, setRwMonths] = useState(6);
const debouncedRwMonths = useDebounce(rwMonths, 500);
```

3. **Query dla bieżącego RW:**
```typescript
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

const { data: currentConsumption } = useQuery({
  queryKey: ['consumption-current', colorId, currentYear, currentMonth],
  queryFn: () => consumptionApi.getCurrentConsumption(colorId, currentYear, currentMonth),
  enabled: !!colorId,
});
```

4. **Helper functions:**
```typescript
const getCurrentRW = useCallback(
  (profileId: number) => {
    const consumption = currentConsumption?.find((c) => c.profileId === profileId);
    return consumption?.consumedBeams || 0;
  },
  [currentConsumption]
);

const getAverageRW = useCallback(
  (profileId: number) => {
    // TODO: Implement when average endpoint is ready
    return 0;
  },
  []
);
```

5. **Dodaj selektor miesięcy RW (obok istniejącego selektora):**
```typescript
<div className="flex items-center gap-3">
  <label htmlFor="rw-months-input" className="text-sm font-medium text-slate-700">
    Średnia RW z ostatnich:
  </label>
  <Input
    id="rw-months-input"
    type="number"
    min="1"
    max="24"
    value={rwMonths}
    onChange={(e) => setRwMonths(Number(e.target.value) || 6)}
    className="w-20"
  />
  <span className="text-sm text-slate-600">miesięcy</span>
</div>
```

6. **Dodaj 3 nowe kolumny w nagłówku tabeli (po kolumnie "Po zapotrzeb."):**
```typescript
<th className="px-4 py-3 text-center font-semibold text-purple-700">RW (miesiąc)</th>
<th className="px-4 py-3 text-center font-semibold text-blue-700">Stan po RW</th>
<th className="px-4 py-3 text-center font-semibold text-indigo-700">Średnia RW</th>
```

7. **Dodaj komórki w wierszu danych:**
```typescript
const currentRW = getCurrentRW(row.profileId);
const averageRW = getAverageRW(row.profileId);

// Po komórce "Po zapotrzeb.":
<td className="px-4 py-3 text-center">
  <span className="text-sm font-medium text-purple-700">
    {currentRW}
  </span>
</td>
<td className="px-4 py-3 text-center">
  <span className="text-sm font-medium text-blue-700">
    {row.currentStock - currentRW}
  </span>
</td>
<td className="px-4 py-3 text-center">
  <span className="text-sm font-medium text-indigo-700">
    -
  </span>
</td>
```

8. **Zwiększ colspan w rozwiniętym wierszu z 9 na 12:**
```typescript
<td colSpan={12} className="bg-slate-50/50 px-8 py-4">
```

9. **Zwiększ min-width tabeli z 1000px na 1200px:**
```typescript
<table className="w-full text-sm min-w-[1200px]">
```

## Plan Implementacji Krok po Kroku

### FAZA 1: Przygotowanie Bazy Danych

```bash
# 1. Otwórz schema.prisma i dodaj modele MonthlyConsumption i ConsumptionEntry
# 2. Dodaj relacje w istniejących modelach (Profile, Color, GlassDelivery, Order)
# 3. Utwórz migrację:
npx prisma migrate dev --name add_rw_consumption_tables

# 4. Zweryfikuj, że tabele zostały utworzone:
npx prisma studio
```

**KRYTYCZNE**: Użyj `migrate dev`, NIE `db push --accept-data-loss` - ta druga komenda usuwa dane!

### FAZA 2: Backend - Consumption Service

```bash
# Utwórz plik:
touch apps/api/src/services/consumption-service.ts

# Skopiuj kod ConsumptionService z sekcji "Backend Implementation" powyżej
```

### FAZA 3: Backend - Routes

```bash
# Utwórz plik:
touch apps/api/src/routes/consumption-routes.ts

# Skopiuj kod consumptionRoutes z sekcji "Backend Implementation" powyżej
```

### FAZA 4: Backend - Integracja w Server

```typescript
// W apps/api/src/server.ts, dodaj import i rejestrację:
import { consumptionRoutes } from './routes/consumption-routes.js';

// W createServer(), po innych routes:
await server.register(consumptionRoutes, { prefix: '/api/consumption' });
```

### FAZA 5: Backend - Modyfikacja Glass Delivery

Edytuj `apps/api/src/services/glass-delivery-service.ts`:
- Zaimportuj `ConsumptionService`
- Zmodyfikuj metodę `markAsDelivered` zgodnie z kodem w sekcji "Backend Implementation"

**WAŻNE**: Ta logika zakłada, że:
- 1 okno = 1 bel profilu
- 1 skrzydło = 1 bel profilu
- Dane o `profileId` i `colorId` są dostępne w `Window` i `Sash`

### FAZA 6: Frontend - API Client

Edytuj `apps/web/src/lib/api.ts`:
- Dodaj `consumptionApi` z metodami `getCurrentConsumption` i `getAverageConsumption`

### FAZA 7: Frontend - UI Magazynu

Edytuj `apps/web/src/app/magazyn/akrobud/szczegoly/MagazynAkrobudPageContent.tsx`:
- Wykonaj wszystkie 9 zmian opisanych w sekcji "Modyfikacja UI Magazynu"

**Użyj Task tool z subagent_type='general-purpose'** - nie edytuj ręcznie, ten plik ma 800+ linii!

### FAZA 8: Testowanie

1. **Restart serwerów:**
```bash
# Zabij procesy Node:
taskkill //F //IM node.exe

# Backend (port 4000):
cd c:/Markbud/Markbud/apps/api && PORT=4000 pnpm dev

# Frontend (port 3000):
cd c:/Markbud/Markbud/apps/web && PORT=3000 pnpm dev
```

2. **Test przepływu:**
   - Wejdź w Magazyn → Dostawy Szkła
   - Oznacz dostawę jako "Dostarczone"
   - Sprawdź w Magazyn → Akrobud → szczegóły koloru
   - Kolumna "RW (miesiąc)" powinna pokazać zużyte bele
   - "Stan po RW" = Stan magazynu - RW

3. **Test API:**
```bash
# Sprawdź bieżący RW:
curl http://localhost:4000/api/consumption/current/1/2025/12

# Sprawdź średnią:
curl http://localhost:4000/api/consumption/average/1?months=6
```

## KRYTYCZNE BŁĘDY DO UNIKNIĘCIA

### ❌ BŁĄD #1: Użycie `prisma db push --accept-data-loss`

**Problem**: Ta komenda usuwa wszystkie dane z bazy!

**Rozwiązanie**: ZAWSZE używaj migracji:
```bash
npx prisma migrate dev --name migration_name
```

### ❌ BŁĄD #2: Nieprawidłowe importy w projekcie ES Module

**Problem**: Projekt używa `"type": "module"` w package.json

**Źle:**
```typescript
import { decode } from 'iconv-lite';  // Named import nie działa
const prisma = require('@prisma/client');  // require nie działa
```

**Dobrze:**
```typescript
import iconv from 'iconv-lite';  // Default import
import { PrismaClient } from '@prisma/client';  // Named import z Prisma OK
```

### ❌ BŁĄD #3: Modyfikacja dużych plików bez użycia Task tool

**Problem**: Ręczne edycje plików 800+ linii są podatne na błędy (pomijanie linii, złe wcięcia)

**Rozwiązanie**:
```
Użyj Task tool z subagent_type='general-purpose' dla dużych edycji
```

### ❌ BŁĄD #4: Brak dodania relacji w istniejących modelach

**Problem**: Dodanie MonthlyConsumption i ConsumptionEntry bez dodania relacji w Profile, Color, etc. powoduje błędy walidacji Prisma

**Rozwiązanie**: Zawsze dodawaj relacje w OBIE strony (np. `Profile.consumptionEntries` + `ConsumptionEntry.profile`)

### ❌ BŁĄD #5: Niepoprawna lokalizacja bazy danych

**Problem**: `.env` wskazuje na `DATABASE_URL="file:./dev.db"`, ale prawdziwa baza jest w `prisma/dev.db`

**Rozwiązanie**:
1. Sprawdź rozmiar plików: `ls -lh dev.db prisma/dev.db`
2. Jeśli `prisma/dev.db` jest większy, skopiuj go do właściwej lokalizacji
3. Nie uruchamiaj migracji dopóki nie masz pewności, która baza jest aktualna!

### ❌ BŁĄD #6: Zapomnienie o zwiększeniu colspan

**Problem**: Dodanie 3 kolumn bez zwiększenia `colspan` w rozwiniętych wierszach powoduje rozjechanie się tabeli

**Rozwiązanie**: Znajdź wszystkie `colSpan={9}` i zmień na `colSpan={12}`

### ❌ BŁĄD #7: Nie dodanie `.js` w importach backendu

**Problem**: W projektach ES Module, backend wymaga `.js` w importach:

**Źle:**
```typescript
import { ConsumptionService } from '../services/consumption-service';
```

**Dobrze:**
```typescript
import { ConsumptionService } from '../services/consumption-service.js';
```

## Weryfikacja Poprawności Implementacji

### Checklist Backend:
- [ ] Modele `MonthlyConsumption` i `ConsumptionEntry` w schema.prisma
- [ ] Relacje dodane w `Profile`, `Color`, `GlassDelivery`, `Order`
- [ ] Migracja utworzona i zastosowana (`prisma migrate dev`)
- [ ] `ConsumptionService` utworzony z metodami `recordConsumption`, `getCurrentConsumption`, `getAverageConsumption`
- [ ] Routes `/api/consumption/current/:colorId/:year/:month` i `/api/consumption/average/:colorId`
- [ ] Routes zarejestrowane w `server.ts`
- [ ] `markAsDelivered` w `GlassDeliveryService` wywołuje `recordConsumption`
- [ ] Backend startuje bez błędów na porcie 4000

### Checklist Frontend:
- [ ] `consumptionApi` dodany w `apps/web/src/lib/api.ts`
- [ ] Import `consumptionApi` w `MagazynAkrobudPageContent.tsx`
- [ ] State `rwMonths` i `debouncedRwMonths` dodane
- [ ] Query `currentConsumption` dodane z useQuery
- [ ] Helper functions `getCurrentRW` i `getAverageRW` dodane
- [ ] Selektor "Średnia RW z ostatnich: [6] miesięcy" dodany
- [ ] 3 nowe kolumny w nagłówku tabeli (RW, Stan po RW, Średnia RW)
- [ ] 3 nowe komórki w wierszu danych
- [ ] `colSpan` zwiększony z 9 na 12
- [ ] `min-w-[1200px]` w tabeli
- [ ] Frontend startuje bez błędów na porcie 3000

### Checklist Funkcjonalny:
- [ ] Oznaczenie dostawy szkła jako "dostarczone" NIE powoduje błędów
- [ ] Po oznaczeniu dostawy, kolumna "RW (miesiąc)" pokazuje liczbę > 0
- [ ] "Stan po RW" = "Stan magazynu" - "RW (miesiąc)"
- [ ] Zmiana selektora miesięcy RW powoduje przeliczenie średniej (gdy endpoint gotowy)
- [ ] API endpoint `/api/consumption/current/:colorId/:year/:month` zwraca dane JSON
- [ ] API endpoint `/api/consumption/average/:colorId?months=6` zwraca dane JSON

## Dalsze Usprawnienia (Opcjonalne)

1. **Implementacja średniej RW**: Dodaj query dla `getAverageConsumption` w frontend i podmień placeholder w `getAverageRW`

2. **Panel RW z historią**: Osobna strona z tabelą wszystkich wpisów ConsumptionEntry, filtry po dacie/profilu/kolorze

3. **Eksport do Excel**: Raport miesięczny zużycia profili

4. **Archiwizacja**: Automatyczne archiwizowanie starych danych RW (>12 miesięcy)

5. **Dashboard RW**: Wykresy zużycia w czasie, porównanie rok-do-roku

## Przydatne Komendy

```bash
# Restart cache + serwery:
taskkill //F //IM node.exe
pnpm store prune
cd c:/Markbud/Markbud/apps/api && npx prisma generate
cd c:/Markbud/Markbud/apps/api && PORT=4000 pnpm dev
cd c:/Markbud/Markbud/apps/web && PORT=3000 pnpm dev

# Sprawdź status migracji:
npx prisma migrate status

# Otwórz Prisma Studio (GUI do bazy):
npx prisma studio

# Sprawdź rozmiar bazy:
ls -lh c:/Markbud/Markbud/apps/api/dev.db

# Test API:
curl http://localhost:4000/api/consumption/current/1/2025/12
curl http://localhost:4000/api/colors | head -c 500
```

## Kontakt / Pomoc

W razie problemów:
1. Sprawdź logi backendu (output `pnpm dev` w terminalu)
2. Sprawdź logi frontendu (output `pnpm dev` w terminalu)
3. Sprawdź Network tab w DevTools przeglądarki (F12)
4. Zweryfikuj schema.prisma - uruchom `npx prisma validate`
5. Sprawdź czy baza danych istnieje i ma dane: `npx prisma studio`

---

**Autor**: Claude Sonnet 4.5
**Data**: 2025-12-10
**Wersja**: 1.0
