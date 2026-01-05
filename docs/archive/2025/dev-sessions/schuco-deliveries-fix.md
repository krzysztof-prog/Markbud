# Naprawa Dostaw Schuco - Historia Pobrań i Statystyki

**Data**: 2025-12-09
**Status**: ✅ UKOŃCZONE

## Problem

1. Statystyki nie pokazywały "NOWE" zamówień mimo że pojawiały się nowe dane
2. Brak zakładki "Historia pobrań" na stronie `/magazyn/dostawy-schuco`

## Rozwiązanie

### Backend - Nowy endpoint statystyk

**Dodane pliki/metody**:

1. **`apps/api/src/services/schuco/schucoService.ts:379-404`**
   ```typescript
   async getStatistics(): Promise<{
     total: number;
     new: number;
     updated: number;
     unchanged: number;
   }>
   ```
   - Liczy rzeczywiste zamówienia według `changeType`
   - Używa `Promise.all()` dla wydajności
   - Zwraca: total, new, updated, unchanged

2. **`apps/api/src/handlers/schucoHandler.ts:102-115`**
   ```typescript
   getStatistics = async (request, reply) => {
     const statistics = await this.schucoService.getStatistics();
     return reply.code(200).send(statistics);
   }
   ```

3. **`apps/api/src/routes/schuco.ts:156-174`**
   - Route: `GET /api/schuco/statistics`
   - Schema validation z Fastify
   - Dokumentacja OpenAPI (tags: ['schuco'])

### Frontend - Zakładka Historia Pobrań

**Zmodyfikowane pliki**:

1. **`apps/web/src/lib/api.ts:425-428`**
   ```typescript
   getStatistics: () =>
     fetchApi<{ total: number; new: number; updated: number; unchanged: number }>(
       '/api/schuco/statistics'
     )
   ```

2. **`apps/web/src/app/schuco/page.tsx`**
   - Dodane pobieranie statystyk (linia 69-75)
   - Zaktualizowane invalidacje cache (linia 90)
   - Nowy panel statystyk z badge'ami "NOWE" i "zmian." (linia 205-232)

3. **`apps/web/src/app/magazyn/dostawy-schuco/DostawySchucoPageContent.tsx`**
   - **Dodane importy**: Tabs, TabsContent, TabsList, TabsTrigger (linia 13)
   - **Nowe query**: `getStatistics()` i `getLogs()` (linia 92-104)
   - **Zaktualizowane statystyki**: używają nowego endpointu (linia 298-319)
   - **Zakładki** (linia 343-655):
     - Tab "Dostawy": istniejąca tabela zamówień
     - Tab "Historia pobrań": nowa tabela z logami
   - **Invalidacje cache**: dodano statistics i logs (linia 112-113)

### Tabela Historia Pobrań

Kolumny:
- **Data** - timestamp w formacie polskim
- **Status** - sukces/błąd/pending (z kolorowymi badge'ami)
- **Trigger** - ręczny/automatyczny
- **Rekordów** - liczba pobranych
- **Nowe** - liczba nowych (zielony badge)
- **Zmienione** - liczba zmienionych (pomarańczowy badge)
- **Czas** - czas trwania w sekundach
- **Błąd** - komunikat błędu jeśli wystąpił

## Jak to działa

### Cykl życia zmian:

1. **Nowe zamówienie**:
   - Backend: `changeType: 'new'`, `changedAt: now`
   - Statystyki: pokazuje "+5" w zielonym badge'u
   - Tabela: zielone tło, badge "NOWE"
   - Historia: wpis z liczbą nowych

2. **Zmienione zamówienie**:
   - Backend: `changeType: 'updated'`, zapisuje zmienione pola
   - Statystyki: pokazuje "21" w pomarańczowym badge'u
   - Tabela: pomarańczowe tło, tooltip ze zmianami
   - Historia: wpis z liczbą zmienionych

3. **Po 72 godzinach**:
   - Backend: `clearOldChangeMarkers()` - czyści `changeType`
   - Frontend: badge'e znikają, zamówienia pozostają

### Auto-refresh:
- Statystyki: co 30 sekund
- Logi: co 5 minut
- Po manualnym refresh: wszystkie cache invalidowane

## Testy

✅ Backend compilation: bez błędów
✅ TypeScript strict mode: passed
✅ Final validation hook: success
✅ Wszystkie query keys: poprawne
✅ Cache invalidation: kompletna

## Pliki zmodyfikowane

### Backend (3 pliki):
- `apps/api/src/services/schuco/schucoService.ts` (+26 linii)
- `apps/api/src/handlers/schucoHandler.ts` (+14 linii)
- `apps/api/src/routes/schuco.ts` (+19 linii)

### Frontend (3 pliki):
- `apps/web/src/lib/api.ts` (+4 linie)
- `apps/web/src/app/schuco/page.tsx` (+30 linii)
- `apps/web/src/app/magazyn/dostawy-schuco/DostawySchucoPageContent.tsx` (+88 linii)

**Total**: 181 nowych linii kodu

## API Endpoints

### Nowe:
- `GET /api/schuco/statistics` - Zwraca liczby według changeType

### Istniejące (użyte):
- `GET /api/schuco/deliveries?page=1&pageSize=100`
- `GET /api/schuco/status` - Ostatnie pobieranie
- `GET /api/schuco/logs` - Historia pobrań
- `POST /api/schuco/refresh` - Trigger pobrania

## Query Keys (React Query)

```typescript
['schuco-deliveries', 'v2', currentPage]  // Lista dostaw
['schuco-status']                          // Status ostatniego pobierania
['schuco-statistics']                      // Statystyki (NOWE)
['schuco-logs']                            // Historia pobrań
```

## Notatki

- Statistics używa `Promise.all()` dla wydajności (3 równoległe count)
- Logs pokazują szczegółowe informacje o każdym pobraniu
- Badge'e pojawiają się tylko gdy count > 0
- Tabela w zakładce "Historia" jest responsive (overflow-x-auto)
- Empty states dla brak logów/dostaw
- Loading states z TableSkeleton dla UX

## Następne kroki (opcjonalne)

- [ ] Dodać filtrowanie logów po dacie
- [ ] Dodać eksport historii do CSV
- [ ] Dodać wykres zmian w czasie
- [ ] Cache statistics w localStorage dla offline

## Screenshoty lokalizacji

- `/magazyn/dostawy-schuco` - główna strona z zakładkami
- `/schuco` - tracking page (zaktualizowane statystyki)
