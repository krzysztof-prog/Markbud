# Plan Implementacji: Optymalizacja Pakowania Palet

## 📋 Przegląd

System automatycznej optymalizacji pakowania okien na palety dla dostaw. Algorytm minimalizuje liczbę palet uwzględniając wymiary okien, typ profilu i ograniczenia fizyczne palet.

## 🎯 Wymagania Funkcjonalne

### Algorytm Pakowania

**Dane wejściowe:**
- Typ profilu: `VLAK` / `BLOK` / `szyba`
- Szerokość okien (mm)
- Wysokość okien (mm) - do protokołów
- Ilość okien

**Typy palet i parametry:**
| Typ palety | Szerokość (mm) | Max załadunek głębokości (mm) | Max wystawanie (mm) |
|------------|----------------|-------------------------------|---------------------|
| Paleta 4000 | 4000 | 960 | 700 |
| Paleta 3500 | 3500 | 960 | 700 |
| Paleta 3000 | 3000 | 960 | 700 |
| Mała paleta | 2400 | 700 | 700 |

**Zajmowanie głębokości palety:**
- VLAK → 95 mm
- BLOK → 137 mm
- szyba → 70 mm

**Zasady algorytmu:**
1. Weryfikacja danych (szerokość > 0, typ profilu poprawny)
2. Przypisanie głębokości według typu profilu
3. Sortowanie okien od najszerszego do najwęższego
4. Dla każdego okna:
   - Wybór najmniejszej możliwej palety gdzie okno się zmieści (z uwzględnieniem max wystawania 700mm)
   - Sprawdzenie czy pozostały załadunek wystarcza
   - Jeśli nie - utworzenie nowej palety
5. Najmniejsze okna układane na ostatniej palecie (ograniczenie rozrzutu)
6. Nazewnictwo: `Paleta_(nr)_(szerokość)` lub `Paleta_(nr)_mała`

**Output:**
- Lista palet z przypisanymi oknami
- Wykorzystanie głębokości na każdej palecie
- Sumaryczna liczba palet
- Dane do eksportu Excel

---

## 🗄️ Struktura Bazy Danych

### Istniejące modele (do wykorzystania):

**`PalletType`** (już istnieje w schema.prisma, linie 283-294)
```prisma
model PalletType {
  id          Int      @id @default(autoincrement())
  name        String   // "Paleta 4000", "Paleta 3500", "Mała paleta"
  lengthMm    Int      @map("length_mm")
  widthMm     Int      @map("width_mm")      // Szerokość palety
  heightMm    Int      @map("height_mm")
  loadWidthMm Int      @default(0) @map("load_width_mm") // Max załadunek głębokości
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
}
```

**`PackingRule`** (już istnieje w schema.prisma, linie 298-308)
```prisma
model PackingRule {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  isActive    Boolean  @default(true) @map("is_active")
  ruleConfig  String   @map("rule_config") // JSON z parametrami
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
}
```

**`OrderWindow`** (już istnieje w schema.prisma, linie 151-164)
```prisma
model OrderWindow {
  id          Int      @id @default(autoincrement())
  orderId     Int      @map("order_id")
  widthMm     Int      @map("width_mm")
  heightMm    Int      @map("height_mm")
  profileType String   @map("profile_type") // "VLAK", "BLOK", "szyba"
  quantity    Int
  reference   String?
  createdAt   DateTime @default(now()) @map("created_at")

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
}
```

### Nowe modele do dodania:

**`PalletOptimization`** - Zapisane optymalizacje dla dostaw
```prisma
model PalletOptimization {
  id                Int       @id @default(autoincrement())
  deliveryId        Int       @unique @map("delivery_id")
  totalPallets      Int       @map("total_pallets")
  optimizationData  String    @map("optimization_data") // JSON z pełnym wynikiem
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  delivery Delivery @relation(fields: [deliveryId], references: [id], onDelete: Cascade)
  pallets  OptimizedPallet[]

  @@map("pallet_optimizations")
}
```

**`OptimizedPallet`** - Pojedyncza paleta w optymalizacji
```prisma
model OptimizedPallet {
  id                  Int      @id @default(autoincrement())
  optimizationId      Int      @map("optimization_id")
  palletNumber        Int      @map("pallet_number") // 1, 2, 3...
  palletTypeName      String   @map("pallet_type_name") // "Paleta 4000", "Mała paleta"
  palletWidth         Int      @map("pallet_width")
  usedDepthMm         Int      @map("used_depth_mm")
  maxDepthMm          Int      @map("max_depth_mm")
  utilizationPercent  Float    @map("utilization_percent")
  windowsData         String   @map("windows_data") // JSON z listą okien

  optimization PalletOptimization @relation(fields: [optimizationId], references: [id], onDelete: Cascade)

  @@index([optimizationId])
  @@map("optimized_pallets")
}
```

### Migracja do dodania:

Aktualizacja modelu `Delivery`:
```prisma
model Delivery {
  // ... istniejące pola ...
  optimization PalletOptimization?
}
```

---

## 🏗️ Architektura Backend

### 1. Service Layer

**`apps/api/src/services/pallet-optimizer/PalletOptimizerService.ts`**

```typescript
export interface WindowInput {
  id: number;
  orderId: number;
  orderNumber: string;
  widthMm: number;
  heightMm: number;
  profileType: 'VLAK' | 'BLOK' | 'szyba';
  quantity: number;
  reference?: string;
}

export interface PalletDefinition {
  name: string;
  widthMm: number;
  maxLoadDepthMm: number;
  maxOverhangMm: number;
}

export interface OptimizedWindow extends WindowInput {
  depthMm: number; // Zajmowana głębokość
}

export interface OptimizedPallet {
  palletNumber: number;
  palletType: string; // "Paleta 4000", "Mała paleta"
  palletWidthMm: number;
  maxDepthMm: number;
  usedDepthMm: number;
  utilizationPercent: number;
  windows: OptimizedWindow[];
}

export interface OptimizationResult {
  deliveryId: number;
  totalPallets: number;
  pallets: OptimizedPallet[];
  summary: {
    totalWindows: number;
    averageUtilization: number;
  };
}

export class PalletOptimizerService {
  // Mapowanie typu profilu na głębokość
  private readonly PROFILE_DEPTHS: Record<string, number> = {
    'VLAK': 95,
    'BLOK': 137,
    'szyba': 70,
  };

  constructor(private prisma: PrismaClient) {}

  /**
   * Główna metoda optymalizacji
   */
  async optimizeDelivery(deliveryId: number): Promise<OptimizationResult> {
    // 1. Pobierz zlecenia z dostawy
    // 2. Pobierz okna dla tych zleceń
    // 3. Pobierz definicje palet z bazy
    // 4. Uruchom algorytm
    // 5. Zapisz wynik do bazy
    // 6. Zwróć rezultat
  }

  /**
   * Algorytm pakowania
   */
  private packWindows(
    windows: WindowInput[],
    pallets: PalletDefinition[]
  ): OptimizedPallet[] {
    // Implementacja algorytmu opisanego wyżej
  }

  /**
   * Walidacja danych
   */
  private validateWindows(windows: WindowInput[]): void {
    // Sprawdzenie szerokości > 0, typu profilu
  }

  /**
   * Przypisanie głębokości
   */
  private assignDepth(window: WindowInput): OptimizedWindow {
    // Przypisz depthMm według profileType
  }

  /**
   * Sortowanie okien
   */
  private sortWindows(windows: OptimizedWindow[]): OptimizedWindow[] {
    // Od najszerszego do najwęższego
  }

  /**
   * Znajdź najmniejszą możliwą paletę dla okna
   */
  private findSuitablePallet(
    window: OptimizedWindow,
    pallets: PalletDefinition[],
    maxOverhangMm: number
  ): PalletDefinition | null {
    // Okno mieści się jeśli: szerokość <= paletaWidth + maxOverhang
  }

  /**
   * Pobierz optymalizację dla dostawy
   */
  async getOptimization(deliveryId: number): Promise<OptimizationResult | null> {
    // Pobierz z bazy lub zwróć null
  }

  /**
   * Usuń optymalizację
   */
  async deleteOptimization(deliveryId: number): Promise<void> {
    // Usuń z bazy
  }
}
```

**`apps/api/src/services/pallet-optimizer/ExcelExportService.ts`**

```typescript
export class ExcelExportService {
  /**
   * Generuj Excel z optymalizacją
   */
  async generateExcel(optimization: OptimizationResult): Promise<Buffer> {
    // Użyj biblioteki exceljs
    // Utwórz arkusz z kolumnami dla każdej palety
    // W kolumnie: szerokość okna, typ profilu, zajęcie miejsca
    // Palety posortowane po numerze
    // Okna w palecie od najszerszego
  }
}
```

### 2. Repository Layer

**`apps/api/src/repositories/PalletOptimizerRepository.ts`**

```typescript
export class PalletOptimizerRepository {
  constructor(private prisma: PrismaClient) {}

  async getPalletTypes(): Promise<PalletType[]> {
    return this.prisma.palletType.findMany({
      orderBy: { widthMm: 'desc' },
    });
  }

  async getPackingRules(): Promise<PackingRule[]> {
    return this.prisma.packingRule.findMany({
      where: { isActive: true },
    });
  }

  async getDeliveryWindows(deliveryId: number): Promise<WindowData[]> {
    // Pobierz zlecenia z dostawy
    // Pobierz okna dla tych zleceń
    // Zwróć połączone dane
  }

  async saveOptimization(
    deliveryId: number,
    result: OptimizationResult
  ): Promise<void> {
    // Zapisz PalletOptimization + OptimizedPallet
  }

  async getOptimization(deliveryId: number): Promise<OptimizationResult | null> {
    // Pobierz z bazy
  }

  async deleteOptimization(deliveryId: number): Promise<void> {
    // Usuń kaskadowo
  }
}
```

### 3. Validators

**`apps/api/src/validators/pallet.ts`**

```typescript
import { z } from 'zod';

export const optimizeDeliverySchema = z.object({
  deliveryId: z.number().int().positive(),
});

export const palletTypeSchema = z.object({
  name: z.string().min(1).max(100),
  widthMm: z.number().int().positive(),
  heightMm: z.number().int().positive(),
  loadWidthMm: z.number().int().positive(),
});

export const packingRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  ruleConfig: z.string(), // JSON
});
```

### 4. Routes

**`apps/api/src/routes/pallets.ts`**

```typescript
import type { FastifyPluginAsync } from 'fastify';

export const palletRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/pallets/optimize/:deliveryId - Uruchom optymalizację
  fastify.post<{ Params: { deliveryId: string } }>(
    '/optimize/:deliveryId',
    async (request, reply) => {
      // Walidacja
      // Wywołaj service.optimizeDelivery()
      // Zwróć wynik
    }
  );

  // GET /api/pallets/optimization/:deliveryId - Pobierz optymalizację
  fastify.get<{ Params: { deliveryId: string } }>(
    '/optimization/:deliveryId',
    async (request, reply) => {
      // Pobierz zapisaną optymalizację
    }
  );

  // GET /api/pallets/optimization/:deliveryId/excel - Eksport do Excel
  fastify.get<{ Params: { deliveryId: string } }>(
    '/optimization/:deliveryId/excel',
    async (request, reply) => {
      // Wygeneruj i zwróć Excel
      reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="palety_${deliveryId}.xlsx"`);
    }
  );

  // DELETE /api/pallets/optimization/:deliveryId - Usuń optymalizację
  fastify.delete<{ Params: { deliveryId: string } }>(
    '/optimization/:deliveryId',
    async (request, reply) => {
      // Usuń optymalizację
    }
  );

  // GET /api/pallets/types - Lista typów palet
  fastify.get('/types', async (request, reply) => {
    // Zwróć typy palet
  });

  // POST /api/pallets/types - Dodaj typ palety
  fastify.post('/types', async (request, reply) => {
    // Walidacja + zapis
  });

  // PUT /api/pallets/types/:id - Edytuj typ palety
  fastify.put<{ Params: { id: string } }>('/types/:id', async (request, reply) => {
    // Walidacja + aktualizacja
  });

  // DELETE /api/pallets/types/:id - Usuń typ palety
  fastify.delete<{ Params: { id: string } }>('/types/:id', async (request, reply) => {
    // Usuń
  });

  // GET /api/pallets/rules - Lista reguł pakowania
  fastify.get('/rules', async (request, reply) => {
    // Zwróć reguły
  });

  // POST /api/pallets/rules - Dodaj regułę
  fastify.post('/rules', async (request, reply) => {
    // Walidacja + zapis
  });

  // PUT /api/pallets/rules/:id - Edytuj regułę
  fastify.put<{ Params: { id: string } }>('/rules/:id', async (request, reply) => {
    // Walidacja + aktualizacja
  });

  // DELETE /api/pallets/rules/:id - Usuń regułę
  fastify.delete<{ Params: { id: string } }>('/rules/:id', async (request, reply) => {
    // Usuń
  });
};
```

### 5. Handler (opcjonalnie)

**`apps/api/src/handlers/palletHandler.ts`**

```typescript
export class PalletHandler {
  constructor(
    private optimizer: PalletOptimizerService,
    private exporter: ExcelExportService
  ) {}

  async optimize(request, reply) { /* ... */ }
  async getOptimization(request, reply) { /* ... */ }
  async exportExcel(request, reply) { /* ... */ }
  async deleteOptimization(request, reply) { /* ... */ }

  // CRUD dla PalletType
  async getPalletTypes(request, reply) { /* ... */ }
  async createPalletType(request, reply) { /* ... */ }
  async updatePalletType(request, reply) { /* ... */ }
  async deletePalletType(request, reply) { /* ... */ }

  // CRUD dla PackingRule
  async getPackingRules(request, reply) { /* ... */ }
  async createPackingRule(request, reply) { /* ... */ }
  async updatePackingRule(request, reply) { /* ... */ }
  async deletePackingRule(request, reply) { /* ... */ }
}
```

---

## 🎨 Architektura Frontend

### 1. Typy

**`apps/web/src/types/pallet.ts`**

```typescript
export interface OptimizedWindow {
  id: number;
  orderId: number;
  orderNumber: string;
  widthMm: number;
  heightMm: number;
  profileType: 'VLAK' | 'BLOK' | 'szyba';
  quantity: number;
  reference?: string;
  depthMm: number;
}

export interface OptimizedPallet {
  palletNumber: number;
  palletType: string;
  palletWidthMm: number;
  maxDepthMm: number;
  usedDepthMm: number;
  utilizationPercent: number;
  windows: OptimizedWindow[];
}

export interface OptimizationResult {
  deliveryId: number;
  totalPallets: number;
  pallets: OptimizedPallet[];
  summary: {
    totalWindows: number;
    averageUtilization: number;
  };
}

export interface PalletType {
  id: number;
  name: string;
  widthMm: number;
  heightMm: number;
  loadWidthMm: number;
}

export interface PackingRule {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  ruleConfig: string;
}
```

### 2. API Client

**`apps/web/src/features/pallets/api/palletsApi.ts`**

```typescript
import { apiClient } from '@/lib/api-client';
import type { OptimizationResult, PalletType, PackingRule } from '@/types/pallet';

export const palletsApi = {
  // Optymalizacja
  optimizeDelivery: (deliveryId: number) =>
    apiClient.post<OptimizationResult>(`/api/pallets/optimize/${deliveryId}`),

  getOptimization: (deliveryId: number) =>
    apiClient.get<OptimizationResult>(`/api/pallets/optimization/${deliveryId}`),

  deleteOptimization: (deliveryId: number) =>
    apiClient.delete(`/api/pallets/optimization/${deliveryId}`),

  downloadExcel: (deliveryId: number) =>
    `/api/pallets/optimization/${deliveryId}/excel`,

  // Typy palet
  getPalletTypes: () =>
    apiClient.get<PalletType[]>('/api/pallets/types'),

  createPalletType: (data: Omit<PalletType, 'id'>) =>
    apiClient.post<PalletType>('/api/pallets/types', data),

  updatePalletType: (id: number, data: Partial<PalletType>) =>
    apiClient.put<PalletType>(`/api/pallets/types/${id}`, data),

  deletePalletType: (id: number) =>
    apiClient.delete(`/api/pallets/types/${id}`),

  // Reguły pakowania
  getPackingRules: () =>
    apiClient.get<PackingRule[]>('/api/pallets/rules'),

  createPackingRule: (data: Omit<PackingRule, 'id'>) =>
    apiClient.post<PackingRule>('/api/pallets/rules', data),

  updatePackingRule: (id: number, data: Partial<PackingRule>) =>
    apiClient.put<PackingRule>(`/api/pallets/rules/${id}`, data),

  deletePackingRule: (id: number) =>
    apiClient.delete(`/api/pallets/rules/${id}`),
};
```

### 3. Hooks

**`apps/web/src/features/pallets/hooks/usePalletOptimization.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { palletsApi } from '../api/palletsApi';

export function usePalletOptimization(deliveryId: number) {
  const queryClient = useQueryClient();

  const { data: optimization, isLoading, error } = useQuery({
    queryKey: ['pallet-optimization', deliveryId],
    queryFn: () => palletsApi.getOptimization(deliveryId),
    enabled: !!deliveryId,
  });

  const optimizeMutation = useMutation({
    mutationFn: () => palletsApi.optimizeDelivery(deliveryId),
    onSuccess: () => {
      queryClient.invalidateQueries(['pallet-optimization', deliveryId]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => palletsApi.deleteOptimization(deliveryId),
    onSuccess: () => {
      queryClient.invalidateQueries(['pallet-optimization', deliveryId]);
    },
  });

  return {
    optimization,
    isLoading,
    error,
    optimize: optimizeMutation.mutate,
    isOptimizing: optimizeMutation.isPending,
    deleteOptimization: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
```

**`apps/web/src/features/pallets/hooks/usePalletTypes.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { palletsApi } from '../api/palletsApi';

export function usePalletTypes() {
  const queryClient = useQueryClient();

  const { data: palletTypes, isLoading } = useQuery({
    queryKey: ['pallet-types'],
    queryFn: palletsApi.getPalletTypes,
  });

  const createMutation = useMutation({
    mutationFn: palletsApi.createPalletType,
    onSuccess: () => {
      queryClient.invalidateQueries(['pallet-types']);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      palletsApi.updatePalletType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['pallet-types']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: palletsApi.deletePalletType,
    onSuccess: () => {
      queryClient.invalidateQueries(['pallet-types']);
    },
  });

  return {
    palletTypes,
    isLoading,
    createPalletType: createMutation.mutate,
    updatePalletType: updateMutation.mutate,
    deletePalletType: deleteMutation.mutate,
  };
}
```

### 4. Komponenty

**`apps/web/src/app/dostawy/[id]/optymalizacja/page.tsx`** (nowa strona)

```typescript
'use client';

import { usePalletOptimization } from '@/features/pallets/hooks/usePalletOptimization';
import { PalletVisualization } from '@/features/pallets/components/PalletVisualization';
import { OptimizationSummary } from '@/features/pallets/components/OptimizationSummary';
import { Button } from '@/components/ui/button';

export default function OptymalizacjaPaletPage({ params }: { params: { id: string } }) {
  const deliveryId = parseInt(params.id);
  const {
    optimization,
    isLoading,
    optimize,
    isOptimizing,
    deleteOptimization,
  } = usePalletOptimization(deliveryId);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Optymalizacja palet - Dostawa #{deliveryId}</h1>
        <div className="flex gap-2">
          <Button onClick={() => optimize()} disabled={isOptimizing}>
            {isOptimizing ? 'Optymalizacja...' : 'Uruchom optymalizację'}
          </Button>
          {optimization && (
            <>
              <Button variant="outline" asChild>
                <a href={`/api/pallets/optimization/${deliveryId}/excel`} download>
                  Eksport Excel
                </a>
              </Button>
              <Button variant="destructive" onClick={() => deleteOptimization()}>
                Usuń optymalizację
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading && <div>Ładowanie...</div>}

      {optimization && (
        <>
          <OptimizationSummary optimization={optimization} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {optimization.pallets.map((pallet) => (
              <PalletVisualization key={pallet.palletNumber} pallet={pallet} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

**`apps/web/src/features/pallets/components/PalletVisualization.tsx`**

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { OptimizedPallet } from '@/types/pallet';

interface Props {
  pallet: OptimizedPallet;
}

export function PalletVisualization({ pallet }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Paleta {pallet.palletNumber}</span>
          <Badge>{pallet.palletType}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Wykorzystanie głębokości</span>
            <span>{pallet.utilizationPercent.toFixed(1)}%</span>
          </div>
          <Progress value={pallet.utilizationPercent} />
          <div className="text-xs text-muted-foreground mt-1">
            {pallet.usedDepthMm}mm / {pallet.maxDepthMm}mm
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Okna ({pallet.windows.length}):</div>
          {pallet.windows.map((window) => (
            <div key={window.id} className="text-xs p-2 bg-muted rounded">
              <div className="flex justify-between">
                <span>{window.orderNumber}</span>
                <Badge variant="outline" className="text-xs">
                  {window.profileType}
                </Badge>
              </div>
              <div className="text-muted-foreground mt-1">
                {window.widthMm}mm × {window.heightMm}mm | {window.depthMm}mm głębokości
              </div>
              {window.quantity > 1 && (
                <div className="text-muted-foreground">Ilość: {window.quantity}</div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**`apps/web/src/features/pallets/components/OptimizationSummary.tsx`**

```typescript
import { Card, CardContent } from '@/components/ui/card';
import { Package, BarChart3 } from 'lucide-react';
import type { OptimizationResult } from '@/types/pallet';

interface Props {
  optimization: OptimizationResult;
}

export function OptimizationSummary({ optimization }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{optimization.totalPallets}</div>
              <div className="text-sm text-muted-foreground">Liczba palet</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{optimization.summary.totalWindows}</div>
              <div className="text-sm text-muted-foreground">Liczba okien</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {optimization.summary.averageUtilization.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Średnie wykorzystanie</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5. Integracja w istniejącej stronie Dostaw

**Modyfikacja `apps/web/src/app/dostawy/page.tsx`:**

Dodać przycisk "Optymalizuj palety" w szczegółach dostawy, który przekierowuje do `/dostawy/[id]/optymalizacja`

---

## 📦 Zależności do Dodania

### Backend

```bash
pnpm add exceljs --filter @akrobud/api
pnpm add -D @types/exceljs --filter @akrobud/api
```

### Frontend

Brak nowych zależności (wszystkie już są w projekcie).

---

## 🗺️ Roadmap Implementacji

### Faza 1: Backend - Fundament (4-6h)

1. **Migracja bazy danych**
   - Dodaj modele `PalletOptimization` i `OptimizedPallet`
   - Zaktualizuj model `Delivery` (relacja)
   - Uruchom `npx prisma migrate dev`

2. **Seed danych testowych**
   - Dodaj domyślne typy palet do `PalletType`
   - Dodaj przykładowe `PackingRule`

3. **Walidatory**
   - Utwórz `apps/api/src/validators/pallet.ts`

### Faza 2: Backend - Algorytm (6-8h)

4. **PalletOptimizerService**
   - Implementacja algorytmu pakowania
   - Walidacja danych
   - Sortowanie okien
   - Przypisywanie do palet

5. **PalletOptimizerRepository**
   - Metody CRUD dla optymalizacji
   - Pobieranie okien z dostaw
   - Zapisywanie wyników

6. **Testy jednostkowe**
   - Testy dla algorytmu pakowania
   - Przypadki brzegowe

### Faza 3: Backend - API (3-4h)

7. **Routes**
   - Implementacja endpointów w `apps/api/src/routes/pallets.ts`
   - Integracja z serwisami

8. **Handler** (opcjonalnie)
   - Jeśli chcemy użyć wzorca handler

### Faza 4: Backend - Excel (2-3h)

9. **ExcelExportService**
   - Generowanie arkusza Excel z wynikami
   - Formatowanie kolumn i danych

### Faza 5: Frontend - API & Typy (2-3h)

10. **Typy TypeScript**
    - Utwórz `apps/web/src/types/pallet.ts`

11. **API Client**
    - Implementacja `apps/web/src/features/pallets/api/palletsApi.ts`

12. **Hooks**
    - `usePalletOptimization`
    - `usePalletTypes`
    - `usePackingRules`

### Faza 6: Frontend - Komponenty (6-8h)

13. **Strona optymalizacji**
    - `apps/web/src/app/dostawy/[id]/optymalizacja/page.tsx`

14. **Komponenty wizualizacji**
    - `PalletVisualization`
    - `OptimizationSummary`
    - `WindowCard`

15. **Integracja w Dostawy**
    - Dodaj przycisk "Optymalizuj palety" w szczegółach dostawy

### Faza 7: Frontend - Zarządzanie (4-5h)

16. **Strona ustawień palet**
    - CRUD typów palet
    - CRUD reguł pakowania
    - W `apps/web/src/app/ustawienia/page.tsx` (nowa zakładka)

### Faza 8: Testy & Refinement (3-4h)

17. **Testy integracyjne**
    - Test pełnego flow: optymalizacja → zapis → odczyt → Excel

18. **Poprawki i optymalizacje**
    - Obsługa błędów
    - Loading states
    - Responsywność

---

## ⚠️ Potencjalne Wyzwania

1. **Wydajność algorytmu**
   - Dla dużych dostaw (>100 okien) może być wolny
   - Rozwiązanie: Optymalizacja algorytmu, cache wyników

2. **Brak biblioteki Excel**
   - Trzeba dodać `exceljs`
   - Alternatywa: generować CSV zamiast Excel

3. **Walidacja danych wejściowych**
   - Niektóre zlecenia mogą nie mieć wymiarów okien
   - Rozwiązanie: Wyraźne komunikaty błędów

4. **Synchronizacja z zmianami w dostawie**
   - Po dodaniu/usunięciu zlecenia optymalizacja jest nieaktualna
   - Rozwiązanie: Pokazać warning + przycisk "Przelicz ponownie"

---

## 🎯 Kryteria Akceptacji

- [ ] Algorytm pakuje okna według zasad użytkownika
- [ ] Najmniejsze okna trafiają na ostatnią paletę
- [ ] Wynik zapisywany w bazie danych
- [ ] Możliwość eksportu do Excel
- [ ] UI pokazuje wizualizację palet
- [ ] Możliwość zarządzania typami palet (CRUD)
- [ ] Możliwość zarządzania regułami pakowania (CRUD)
- [ ] Obsługa błędów i walidacja danych
- [ ] Testy jednostkowe dla algorytmu
- [ ] Responsive design

---

## 📝 Notatki

- Algorytm jest **deterministyczny** - dla tych samych danych zwraca ten sam wynik
- Optymalizacja jest **zapisywana** w bazie, więc można ją przeglądać później
- Użytkownik może **ręcznie** zmienić przypisanie okien do palet (przyszła funkcja)
- System **nie** generuje automatycznie etykiet na palety (może być dodane później)

---

## 🔗 Powiązane Pliki do Modyfikacji

### Backend
- `apps/api/prisma/schema.prisma` - dodaj modele
- `apps/api/src/routes/pallets.ts` - nowy plik
- `apps/api/src/services/pallet-optimizer/PalletOptimizerService.ts` - nowy plik
- `apps/api/src/services/pallet-optimizer/ExcelExportService.ts` - nowy plik
- `apps/api/src/repositories/PalletOptimizerRepository.ts` - nowy plik
- `apps/api/src/validators/pallet.ts` - nowy plik
- `apps/api/src/handlers/palletHandler.ts` - nowy plik (opcjonalny)
- `apps/api/src/index.ts` - zarejestruj route

### Frontend
- `apps/web/src/types/pallet.ts` - nowy plik
- `apps/web/src/features/pallets/api/palletsApi.ts` - nowy plik
- `apps/web/src/features/pallets/hooks/usePalletOptimization.ts` - nowy plik
- `apps/web/src/features/pallets/hooks/usePalletTypes.ts` - nowy plik
- `apps/web/src/features/pallets/components/PalletVisualization.tsx` - nowy plik
- `apps/web/src/features/pallets/components/OptimizationSummary.tsx` - nowy plik
- `apps/web/src/app/dostawy/[id]/optymalizacja/page.tsx` - nowy plik
- `apps/web/src/app/dostawy/page.tsx` - modyfikacja (dodaj przycisk)
- `apps/web/src/app/ustawienia/page.tsx` - modyfikacja (nowa zakładka)

---

## ✅ Zakończenie Planowania

Plan jest **kompletny i gotowy do implementacji**. Zawiera:

✅ Szczegółowy algorytm optymalizacji
✅ Strukturę bazy danych (z wykorzystaniem istniejących modeli)
✅ Architekturę backend (Service → Repository → Routes)
✅ Architekturę frontend (API → Hooks → Components)
✅ Roadmap implementacji (8 faz)
✅ Kryteria akceptacji
✅ Lista plików do utworzenia/modyfikacji

**Czas estymowany:** 30-40 godzin pracy

**Kolejny krok:** Zatwierdzenie planu przez użytkownika i rozpoczęcie implementacji od Fazy 1.