# Warehouse Service Module

Refaktoryzacja z jednego pliku warehouse-service.ts (894 linii) na moduły.

## Struktura

```
warehouse/
├── types.ts                          # Typy i interfejsy
├── WarehouseStockService.ts          # Zarządzanie stanem magazynu
├── WarehouseInventoryService.ts      # Inwentaryzacje miesięczne
├── WarehouseShortageService.ts       # Obliczanie braków
├── WarehouseUsageService.ts          # Statystyki i historia
└── index.ts                          # Fasada WarehouseService
```

## Użycie

```typescript
import { WarehouseService } from './services/warehouse/index.js';

const repository = new WarehouseRepository(prisma);
const service = new WarehouseService(repository);

// Wszystkie metody działają jak wcześniej
await service.getColorWarehouseData(colorId);
await service.updateStock(colorId, profileId, stock);
```

## Podział odpowiedzialności

- **WarehouseStockService** - zapytania i aktualizacje stanu
- **WarehouseInventoryService** - inwentaryzacje, cofanie, archiwizacja
- **WarehouseShortageService** - kalkulacja braków materiałowych
- **WarehouseUsageService** - statystyki zużycia i historia

## Kompatybilność

100% kompatybilne wstecz - API nie uległo zmianie.
