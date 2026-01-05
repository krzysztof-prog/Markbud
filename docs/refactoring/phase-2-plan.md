# Phase 2 - Implementation Plan
**Start:** Po zakończeniu Fazy 1
**Duration:** 2-3 dni
**Priority:** HIGH

---

## 🎯 Cel Fazy 2: Medium Risk Refactoring

Implementacja średnio-ryzykownych refaktoryzacji zgodnie z utworzonymi planami.

---

## 📋 Zadania Fazy 2

### Backend (apps/api/)

#### 1. importService.ts - Phase 2 & 3 (Medium/High Risk)
**Czas:** 1-2 dni
**Agent:** code-refactor-master

**Moduły do wyodrębnienia (Phase 2 - Medium Risk):**
1. `import/importValidationService.ts`
   - Walidacja plików
   - Sprawdzanie konfliktów
   - Biznesowe reguły walidacji

2. `import/importTransactionService.ts`
   - Transakcje Prisma
   - Rollback logic
   - Error handling dla DB operations

3. `import/importConflictService.ts`
   - Detekcja konfliktów wariantów
   - Rozwiązywanie konfliktów
   - User decision handling

**Moduły do wyodrębnienia (Phase 3 - High Risk):**
4. `import/csvImportService.ts`
   - CSV parsing
   - Data transformation
   - Batch processing

5. `import/pdfImportService.ts`
   - PDF parsing
   - OCR processing
   - Data extraction

6. `import/excelImportService.ts`
   - Excel parsing
   - Worksheet handling
   - Data validation

**Kryteria sukcesu:**
- [ ] importService.ts < 300 linii (orchestrator)
- [ ] Wszystkie testy przechodzą
- [ ] Brak regresji w importach
- [ ] Dokumentacja zaktualizowana

---

#### 2. deliveryService.ts - Phase 2 & 3 (Medium/High Risk)
**Czas:** 1 dzień
**Agent:** code-refactor-master

**Moduły do wyodrębnienia (Phase 2 - Medium Risk):**
1. `delivery/deliveryOptimizationService.ts`
   - Algorytmy pakowania palet
   - Optymalizacja przestrzeni
   - Kalkulacje wymiarów

2. `delivery/deliveryNotificationService.ts`
   - Email notifications
   - WebSocket events
   - Status updates

**Moduły do wyodrębnienia (Phase 3 - Integration):**
3. Integracja wszystkich modułów
4. Aktualizacja handlerów
5. Testy integracyjne

**Kryteria sukcesu:**
- [ ] deliveryService.ts < 200 linii
- [ ] Wszystkie testy przechodzą
- [ ] Event emitter działa poprawnie
- [ ] WebSocket sync bez regresji

---

### Frontend (apps/web/)

#### 3. DostawyPageContent.tsx - Phase 2 (Component Splitting)
**Czas:** 2 dni
**Agent:** code-refactor-master

**Komponenty do wyodrębnienia:**
1. `components/DeliveriesListView.tsx`
   - Tabela TanStack Table
   - Kolumny i formatowanie
   - Sortowanie i filtrowanie
   - ~400 linii

2. `components/DeliveryFilters.tsx`
   - Filtry dat, statusów, klientów
   - Search input
   - Reset filters
   - ~300 linii

3. `components/DeliveryActions.tsx`
   - Bulk actions
   - Delete, Archive
   - Export to Excel/PDF
   - ~200 linii

4. `components/DeliveryStats.tsx`
   - Statystyki dostaw
   - Wykresy (Recharts)
   - KPI cards
   - ~200 linii

5. `components/DeliveryCalendar.tsx`
   - Kalendarz dostaw
   - Drag & drop
   - Date range picker
   - ~300 linii

6. `components/DeliveryDialogs.tsx`
   - Modals (create, edit, delete)
   - Form handling
   - Validation
   - ~200 linii

**Kryteria sukcesu:**
- [ ] DostawyPageContent.tsx < 200 linii (container)
- [ ] Wszystkie komponenty w `components/`
- [ ] Wszystkie hooki w `hooks/`
- [ ] UI bez regresji
- [ ] Performance nie pogorszona

---

#### 4. Inne duże komponenty
**Czas:** 1 dzień
**Agent:** Explore + code-refactor-master

**Do zidentyfikowania:**
1. Znajdź komponenty > 500 linii
2. Oceń które wymagają refaktoryzacji
3. Stwórz plany dla top 3
4. Rozpocznij implementację

---

### Testing

#### 5. Repository Tests (Priority)
**Czas:** 1 dzień
**Agent:** TDD agent (jeśli dostępny) lub code-refactor-master

**Repositories do pokrycia:**
1. `OrderRepository.ts`
   - CRUD operations
   - Complex queries
   - Edge cases

2. `DeliveryRepository.ts`
   - Calendar queries
   - Statistics
   - Batch operations

3. `WarehouseRepository.ts`
   - Stock updates
   - History tracking
   - Optimistic locking

**Target coverage:** 80%+

**Kryteria sukcesu:**
- [ ] Każdy repository ma test file
- [ ] Edge cases pokryte
- [ ] Mocking Prisma poprawny
- [ ] Wszystkie testy zielone

---

#### 6. Service Tests (Critical Services)
**Czas:** 1 dzień
**Agent:** TDD agent lub code-refactor-master

**Services do pokrycia:**
1. Nowo wyodrębnione moduły importService
2. Nowo wyodrębnione moduły deliveryService
3. Critical business logic services

**Target coverage:** 60%+

---

## 🔄 Kolejność wykonania (Faza 2)

### Dzień 1 (Medium Risk - Backend)
**Równolegle:**
1. Agent 1: importService.ts Phase 2 (validation, transactions, conflicts)
2. Agent 2: deliveryService.ts Phase 2 (optimization, notifications)
3. Agent 3: Repository tests (OrderRepository, DeliveryRepository)

### Dzień 2 (High Risk - Backend + Frontend Start)
**Równolegle:**
1. Agent 1: importService.ts Phase 3 (CSV, PDF, Excel parsers)
2. Agent 2: deliveryService.ts Phase 3 (integration, handlers update)
3. Agent 3: DostawyPageContent.tsx component splitting (start)
4. Agent 4: Service tests (nowe moduły)

### Dzień 3 (Frontend + Testing)
**Równolegle:**
1. Agent 1: DostawyPageContent.tsx component splitting (finish)
2. Agent 2: Inne duże komponenty (identyfikacja + plany)
3. Agent 3: Integration testing (wszystkie zmiany)
4. Agent 4: WarehouseRepository tests
5. Agent 5: Documentation updates

---

## 🎯 Success Metrics - Faza 2

### Code Quality
- [ ] importService.ts < 300 linii (z 1350)
- [ ] deliveryService.ts < 200 linii (z 682)
- [ ] DostawyPageContent.tsx < 200 linii (z 1937)
- [ ] Wszystkie wyodrębnione moduły < 300 linii

### Test Coverage
- [ ] Repository coverage: 0% → 80%
- [ ] Service coverage: 24% → 60%
- [ ] Overall backend coverage: +35%

### Performance
- [ ] Brak regresji w czasie odpowiedzi API
- [ ] Frontend render time bez zmian
- [ ] Bundle size nie zwiększony > 5%

### Stability
- [ ] Wszystkie testy przechodzą
- [ ] Zero critical bugs
- [ ] Zero breaking changes w API

---

## ⚠️ Risk Mitigation - Faza 2

### High Risk Tasks
1. **Parser refactoring (CSV, PDF, Excel)**
   - **Risk:** Import functionality może się zepsuć
   - **Mitigation:**
     - Extensive testing z real data
     - Feature flag dla nowej implementacji
     - Rollback plan ready
     - Manual QA testing

2. **Delivery optimization logic**
   - **Risk:** Błędy w algorytmach pakowania
   - **Mitigation:**
     - Unit tests dla edge cases
     - Regression tests z historical data
     - Visual testing pakowania palet
     - A/B comparison old vs new

3. **Component splitting (DostawyPageContent)**
   - **Risk:** UI bugs, broken interactions
   - **Mitigation:**
     - Visual regression testing
     - E2E tests kluczowych flow
     - Parallel implementation (feature branch)
     - Gradual rollout

### Medium Risk Tasks
1. **Validation logic extraction**
   - **Risk:** Validation może się zmienić
   - **Mitigation:** Comprehensive test cases

2. **Transaction handling**
   - **Risk:** Data consistency issues
   - **Mitigation:** Database transaction tests

---

## 🚀 Agenci do uruchomienia (Faza 2, Dzień 1)

```bash
# 5 agentów równolegle:

1. code-refactor-master: importService.ts Phase 2
   - Validation service
   - Transaction service
   - Conflict service

2. code-refactor-master: deliveryService.ts Phase 2
   - Optimization service
   - Notification service

3. code-refactor-master: Repository tests
   - OrderRepository.test.ts
   - DeliveryRepository.test.ts

4. Explore: Identify large components
   - Find components > 500 lines
   - Create refactoring candidates list

5. code-refactor-master: Service tests
   - Test nowo wyodrębnione moduły Phase 1
```

---

## 📊 Expected Results - End of Phase 2

### Code Metrics
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| importService.ts | 1350 lines | ~250 lines | -81% |
| deliveryService.ts | 682 lines | ~200 lines | -71% |
| DostawyPageContent.tsx | 1937 lines | ~200 lines | -90% |
| Total modules | 3 | 31+ | +933% |
| Avg module size | 1323 lines | 150 lines | -89% |

### Test Coverage
| Area | Before | After | Change |
|------|--------|-------|--------|
| Repositories | 0% | 80% | +80% |
| Services | 24% | 60% | +36% |
| Overall Backend | ~15% | ~50% | +35% |

### Maintainability
- ✅ Single Responsibility Principle
- ✅ Testable modules
- ✅ Clear dependencies
- ✅ Documented interfaces
- ✅ Reusable components

---

## 📝 Deliverables - Faza 2

### Code
1. Refactored services (16+ nowych modułów)
2. Refactored components (10+ nowych komponentów)
3. Test files (10+ nowych plików testowych)

### Documentation
1. Updated API documentation
2. Component documentation (Storybook stories optional)
3. Test coverage report
4. Migration guide (breaking changes if any)

### Reports
1. Phase 2 completion report
2. Test coverage report
3. Performance comparison report
4. Risk assessment update

---

**Plan created:** 2025-12-30 17:30
**Ready to execute:** Po zakończeniu Fazy 1
**Estimated completion:** 3 dni robocze
