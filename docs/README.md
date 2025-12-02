# Dokumentacja systemu Markbud

## Spis treści

### 🔄 Operacje odwrotne i transakcje
- **[REVERSE_OPERATIONS.md](./REVERSE_OPERATIONS.md)** - Pełna dokumentacja wszystkich operacji odwrotnych w systemie
  - Operacje na zamówieniach magazynowych (dodawanie/odejmowanie bel)
  - Rollback inwentaryzacji
  - Przenoszenie zleceń między dostawami
  - Scenariusze testowe i troubleshooting

- **[DEVELOPER_GUIDE_TRANSACTIONS.md](./DEVELOPER_GUIDE_TRANSACTIONS.md)** - Przewodnik dla deweloperów
  - Kiedy używać transakcji
  - Wzorce operacji odwrotnych
  - Najlepsze praktyki
  - Częste błędy i jak ich unikać
  - Template dla nowych funkcji

## Najważniejsze informacje

### Bezpieczeństwo danych

System Markbud używa **transakcji Prisma** i **operacji odwrotnych** aby zagwarantować spójność danych:

✅ Wszystkie operacje modyfikujące magazyn są atomowe
✅ Zmiana statusu zamówienia automatycznie aktualizuje stan magazynowy
✅ Możliwość cofnięcia inwentaryzacji
✅ Bezpieczne przenoszenie zleceń między dostawami

### Kluczowe pliki w kodzie

| Plik | Odpowiedzialność |
|------|------------------|
| `apps/api/src/routes/warehouse-orders.ts` | Zamówienia materiałów (odwrotne operacje na magazynie) |
| `apps/api/src/routes/warehouse.ts` | Zarządzanie magazynem (rollback inwentaryzacji) |
| `apps/api/src/routes/deliveries.ts` | Dostawy (transakcyjne przenoszenie zleceń) |

### Dla nowych deweloperów

1. Przeczytaj **[DEVELOPER_GUIDE_TRANSACTIONS.md](./DEVELOPER_GUIDE_TRANSACTIONS.md)** przed dodaniem nowych funkcji
2. Sprawdź **[REVERSE_OPERATIONS.md](./REVERSE_OPERATIONS.md)** aby zrozumieć istniejące mechanizmy
3. Zawsze pytaj: "Czy moja operacja wymaga transakcji i operacji odwrotnej?"

### Quick Reference

#### Użycie transakcji:
```typescript
await prisma.$transaction(async (tx) => {
  await tx.table1.update({ ... });
  await tx.table2.update({ ... });
});
```

#### Operacja odwrotna:
```typescript
let stockDelta = 0;
if (statusChangedTo_Received) stockDelta += beams;
if (statusChangedFrom_Received) stockDelta -= beams;

if (stockDelta !== 0) {
  await tx.warehouseStock.update({
    data: { currentStockBeams: { increment: stockDelta } }
  });
}
```

---

**Wersja dokumentacji:** 1.0
**Data ostatniej aktualizacji:** 2025-12-01
