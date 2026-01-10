# PLAN: Architektura System Brain - Naprawy krytyczne AKROBUD

**Data utworzenia:** 2026-01-09
**Autor analizy:** Claude Opus 4.5
**Status:** AKTYWNY

---

## EXECUTIVE SUMMARY

Przeprowadzono brutalną analizę architektoniczną systemu AKROBUD pod kątem długoterminowych ryzyk operacyjnych. Zidentyfikowano:
- **10 krytycznych punktów** wymagających natychmiastowej interwencji
- **5 scenariuszy pre-mortem** pokazujących jak system się "wysypie" po 9 miesiącach
- **5 sprzeczności stanów** gdzie technicznie poprawny stan jest operacyjnie absurdalny
- Propozycję **ReadinessEvaluator** - centralnej warstwy decyzyjnej

---

## PRIORYTETY

| Priorytet | Zakres | Czas | Status |
|-----------|--------|------|--------|
| **P0** | NAPRAW TERAZ | < 1 dzień | 🔴 Nie rozpoczęto |
| **P1** | NAPRAW W TYM TYGODNIU | < 5 dni | 🔴 Nie rozpoczęto |
| **P2** | NAPRAW W TYM MIESIĄCU | < 30 dni | ⏳ Planowane |
| **P3** | TECH DEBT | ongoing | ⏳ Backlog |

---

## P0: NAPRAW TERAZ (< 1 dzień pracy)

### P0-1: Fix money calculation w dashboard
- **Severity:** KRYTYCZNY
- **Effort:** 1-2h
- **Pliki:** `apps/api/src/services/dashboard-service.ts`, `monthlyReportExportService.ts`, `monthlyReportService.ts`
- **Problem:** `parseFloat(order.valuePln)` na wartościach w groszach = x100 za dużo
- **Konsekwencja:** Decyzje biznesowe na fałszywych danych

### P0-2: Dodaj delivery-status-machine.ts
- **Severity:** WYSOKI
- **Effort:** 2-3h
- **Pliki:** Nowy plik `apps/api/src/utils/delivery-status-machine.ts`
- **Problem:** Brak walidacji przejść statusu dostawy (planned→shipped bez walidacji)
- **Konsekwencja:** Niespójne stany (shipped + orders new)

### P0-3: Import - force review dla partial success
- **Severity:** WYSOKI
- **Effort:** 3-4h
- **Pliki:** `apps/api/src/services/importService.ts`, `apps/web/src/app/importy/`
- **Problem:** Import "successful" gdy cicho gubi dane
- **Konsekwencja:** 150 zleceń "znika" bez śladu

---

## P1: NAPRAW W TYM TYGODNIU (< 5 dni)

### P1-1: Soft delete cascade dla Delivery
- **Severity:** WYSOKI
- **Effort:** 4h
- **Pliki:** `schema.prisma`, `DeliveryRepository.ts`
- **Problem:** DeliveryOrder orphans po soft-delete Delivery
- **Konsekwencja:** Zlecenia "utknięte" w nieistniejącej dostawie

### P1-2: checkVariantInDelivery() wymuszone wszędzie
- **Severity:** WYSOKI
- **Effort:** 3h
- **Pliki:** `DeliveryService.ts`, `deliveryHandler.ts`
- **Problem:** Warianty w różnych dostawach
- **Konsekwencja:** Podwójne zużycie materiałów

### P1-3: Confirmation dialogs z konsekwencjami
- **Severity:** ŚREDNI
- **Effort:** 4h
- **Pliki:** Frontend components (DeleteDeliveryDialog, FinalizeMonthModal)
- **Problem:** User klika bez zrozumienia konsekwencji
- **Konsekwencja:** Przypadkowe usunięcia, złe decyzje

### P1-4: Invalidate PalletOptimization po zmianie Delivery
- **Severity:** ŚREDNI
- **Effort:** 2h
- **Pliki:** `DeliveryService.ts`, `PalletOptimizerRepository.ts`
- **Problem:** Stale optimization data po dodaniu/usunięciu zlecenia
- **Konsekwencja:** Błędne rozmieszczenie na paletach

---

## P2: NAPRAW W TYM MIESIĄCU

### P2-1: ReadinessEvaluator MVP
- Centralna warstwa decyzyjna
- Blockers + Warnings + Resolutions

### P2-2: OrderGroup entity
- Grupowanie base + wariantów jako business unit

### P2-3: Atomic stock updates
- Fix race condition w optimistic locking

### P2-4: Mobile card view
- Tabele nieużywalne na mobile

### P2-5: Critical path tests
- importService, deliveryService, orderService

---

## P3: TECH DEBT (ongoing)

- Branded types dla pieniędzy (`Grosze`, `Centy`)
- Event sourcing dla audit trail
- Real-time updates (WebSocket) dla kalendarza
- Refactor monoliths (importService 1139 linii)

---

## SCENARIUSZE PRE-MORTEM

### A: "Pechowy październik" - Import katastrofa
Import 800 zleceń, 127 znikło cicho, wykryto po 3 tygodniach.

### B: "Wariant-widmo" - Zamówienie w dwóch dostawach
52335 w Dostawie #45, 52335-a w #48 → podwójne zużycie materiałów.

### C: "Remanent z kosmosu" - Magazyn pokazuje -23 sztuki
Race condition w optimistic locking + brak walidacji przy finalize.

### D: "Dostawa-widmo" - Usunięta ale wciąż żywa
Soft delete Delivery, DeliveryOrder pozostaje → zlecenia "utknęły".

### E: "Decyzje na fałszywych danych" - Money bug
Dashboard x100 za dużo od 30.12.2025.

---

## SPRZECZNOŚCI STANÓW

1. Order `completed` + Variant `new` → biznesowo to samo, systemowo dwa rekordy
2. Delivery `shipped` + Order `new` → fizycznie pojechało, systemowo "czeka"
3. WarehouseStock.deletedAt + WarehouseHistory aktywne → raporty "usuniętego"
4. DeliveryOrder.position gaps → [1, 2, _, 4, 5] po usunięciu
5. PalletOptimization + zmieniona Delivery → ghost windows

---

## PROPOZYCJA: ReadinessEvaluator

**Pytanie:** "Czy to jest GOTOWE i DLACZEGO nie?"

```typescript
interface ReadinessResult {
  isReady: boolean;
  blockers: Blocker[];     // Hard stop - nie można kontynuować
  warnings: Warning[];     // Soft - wymaga potwierdzenia
  confidence: number;      // 0-100%
}

interface Blocker {
  type: 'hard' | 'soft';
  code: string;            // VARIANT_IN_DELIVERY, INSUFFICIENT_STOCK, etc.
  message: string;
  resolution?: ResolutionAction;
}
```

**Komponenty:**
- `OrderReadiness` - "Czy zlecenie może przejść do produkcji?"
- `DeliveryReadiness` - "Czy dostawa może być wysłana?"
- `ImportReadiness` - "Czy import może być zatwierdzony?"
- `MonthCloseReadiness` - "Czy miesiąc może być zamknięty?"

---

## METRYKI SUKCESU (6 miesięcy)

| Metryka | Cel |
|---------|-----|
| Dashboard kwoty vs księgowość | ±0% rozbieżności |
| Partial imports bez review | 0 przypadków |
| Warianty w różnych dostawach | 0 przypadków |
| Accidental data loss | 0 incydentów |
| Backend test coverage | 80% critical paths |
| Frontend test coverage | 60% components |

---

## CHANGELOG

| Data | Zmiana | Autor |
|------|--------|-------|
| 2026-01-09 | Utworzenie planu | Claude Opus 4.5 |
