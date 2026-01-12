# Plan: System Brain - ReadinessOrchestrator

**Data utworzenia:** 2026-01-10
**Status:** W TRAKCIE IMPLEMENTACJI
**Priorytet:** P0 (Krytyczny) + P1 (Wysoki)

---

## Executive Summary

Implementacja centralnej warstwy decyzyjnej (System Brain) która odpowiada na pytanie:
**"CZY TO JEST GOTOWE DO (action) I DLACZEGO NIE?"**

### Problemy do rozwiązania:
1. Warianty zleceń bez wymuszonej decyzji → chaos w dostawach
2. Brak fizycznej walidacji palet → uszkodzone transporty
3. Import lock za krótki → race conditions
4. Produkcja startuje bez szyb/okuć → deadline missed
5. Variant resolution kasuje wysłane zlecenia

---

## Zakres implementacji

### P0 - KRYTYCZNE (Ten sprint)

#### R1: Wymuszenie `variantType` przed przypisaniem do delivery
- [x] Dodaj walidację w `DeliveryOrder.create()` - blokuj jeśli `variantType === NULL` dla zleceń z sufixem
- [x] Dodaj walidację w `orderVariantService` - sprawdź delivery status przed replace

#### R2: Physical Pallet Validation przed shipped
- [x] Dodaj `validationStatus` do `PalletOptimization` model
- [x] Implementuj `validatePalletPhysically()` w serwisie
- [x] Blokuj `delivery.status = 'shipped'` jeśli walidacja failed

#### R3: Import Lock Heartbeat
- [x] Dodaj dynamic expiration based on file count
- [x] Implementuj heartbeat mechanism (extend lock co 2 min)
- [x] Dodaj graceful failure detection

### P1 - WYSOKIE (Ten sprint)

#### R4: ReadinessOrchestrator (System Brain)
- [x] Utwórz centralny serwis `ReadinessOrchestrator`
- [x] Implementuj `canStartProduction()`
- [x] Implementuj `canShipDelivery()`
- [x] Integrate z `orderService` i `deliveryService`

#### R5: Glass + Okuc Integration w Production Flow
- [x] Rozszerz walidację production → check glass delivery
- [x] Rozszerz walidację production → check okuc status
- [x] Blokuj `order.status = 'in_progress'` jeśli not ready

#### R6: Variant Resolution Enhanced Validation
- [x] Check if base order is in shipped/loading delivery
- [x] Block `replace` action dla shipped deliveries
- [x] Show context in conflict detection

---

## Architektura rozwiązania

### Nowe pliki:
```
apps/api/src/services/
├── readinessOrchestrator.ts      # Centralny brain
├── palletValidationService.ts    # Fizyczna walidacja palet
└── types/readiness.types.ts      # Typy dla readiness

apps/api/prisma/
└── migrations/XXXXXX_add_pallet_validation_status/
```

### Modyfikowane pliki:
```
apps/api/src/services/
├── orderService.ts               # Integration z orchestrator
├── deliveryService.ts            # Integration z orchestrator + pallet validation
├── orderVariantService.ts        # Enhanced variant resolution
├── importLockService.ts          # Heartbeat + dynamic expiration
└── palletOptimizationService.ts  # Validation status

apps/api/prisma/
└── schema.prisma                 # Nowe pola
```

---

## ReadinessOrchestrator - Specyfikacja

### Interface:

```typescript
interface ReadinessResult {
  ready: boolean;
  blocking: ReadinessSignal[];
  warnings: ReadinessSignal[];
  checklist: ChecklistItem[];
}

interface ReadinessSignal {
  module: 'warehouse' | 'glass' | 'okuc' | 'pallet' | 'approval' | 'variant';
  requirement: string;
  status: 'ok' | 'warning' | 'blocking';
  message: string;
  actionRequired?: string;
  metadata?: Record<string, unknown>;
}
```

### Metody:

1. `canStartProduction(orderId)` - sprawdza:
   - Warehouse stock (profile)
   - Glass delivery status
   - Okuc demand status
   - Variant type set (jeśli wariant)

2. `canShipDelivery(deliveryId)` - sprawdza:
   - All orders completed
   - Pallet validation passed
   - All glass delivered
   - All okuc delivered
   - Documents generated

---

## Testy manualne

### Test R1 (Variant Type):
1. Import zlecenia 53335-a (wariant)
2. Próba przypisania do delivery bez ustawienia variantType
3. **Oczekiwane:** Błąd "Określ typ wariantu przed przypisaniem do dostawy"

### Test R2 (Pallet Validation):
1. Utwórz dostawę z profilem 7000mm
2. Wybierz paletę 6000mm loadDepth
3. Próba zmiany statusu na 'shipped'
4. **Oczekiwane:** Błąd "Profil X nie zmieści się na palecie"

### Test R3 (Import Lock):
1. Start import folderu z 100 plikami
2. Sprawdź że lock jest przedłużany co 2 min
3. **Oczekiwane:** Lock aktywny przez cały import

### Test R4-R5 (Production Readiness):
1. Utwórz zlecenie z glass status 'ordered' (nie delivered)
2. Próba zmiany statusu na 'in_progress'
3. **Oczekiwane:** Błąd "Czekamy na dostawę szyb (0/10)"

### Test R6 (Variant Resolution):
1. Zlecenie 53335 w delivery status 'shipped'
2. Import 53335-a, wybór 'replace_base'
3. **Oczekiwane:** Błąd "Nie można zastąpić - zlecenie w wysłanej dostawie"

---

## Rollback plan

Jeśli coś pójdzie nie tak:
1. Usuń migrację: `pnpm db:migrate rollback`
2. Przywróć poprzednie wersje plików z git
3. Restart serwera

---

## Status implementacji

- [x] Plan zapisany
- [x] R1: variantType enforcement ✅ `DeliveryOrderService.ts:90-98`
- [x] R2: Pallet validation ✅ `palletValidationService.ts` + `schema.prisma` + `DeliveryService.ts:142-150`
- [x] R3: Import lock heartbeat ✅ `importLockService.ts:35-43, 394-478`
- [x] R4: ReadinessOrchestrator ✅ `readinessOrchestrator.ts` (nowy plik)
- [x] R5: Glass/Okuc integration ✅ `orderService.ts:72-89`
- [x] R6: Enhanced variant resolution ✅ `importConflictService.ts:201-222`
- [x] UI: Readiness Checklist ✅ `ReadinessChecklist.tsx` + endpoints + integracja
- [ ] Testy manualne
- [ ] Deploy na produkcję

---

**Ostatnia aktualizacja:** 2026-01-12
