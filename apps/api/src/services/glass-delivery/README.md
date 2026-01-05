# Glass Delivery Service Module

Refaktoryzacja z jednego pliku glassDeliveryService.ts (770 linii) na moduły.

## Struktura

```
glass-delivery/
├── types.ts                          # Typy i interfejsy
├── GlassDeliveryImportService.ts     # Import z CSV
├── GlassDeliveryMatchingService.ts   # Dopasowywanie do zamówień
├── GlassDeliveryQueryService.ts      # Zapytania i usuwanie
└── index.ts                          # Fasada GlassDeliveryService
```

## Użycie

```typescript
import { GlassDeliveryService } from './services/glass-delivery/index.js';

const repository = new GlassDeliveryRepository(prisma);
const service = new GlassDeliveryService(repository);

// Wszystkie metody działają jak wcześniej
await service.importFromCsv(filePath, userId);
await service.matchWithOrders(deliveryId);
```

## Podział odpowiedzialności

- **GlassDeliveryImportService** - parsowanie CSV, tworzenie dostaw
- **GlassDeliveryMatchingService** - dopasowywanie do zamówień, aktualizacja dat
- **GlassDeliveryQueryService** - zapytania, usuwanie, statystyki

## Kompatybilność

100% kompatybilne wstecz - API nie uległo zmianie.
