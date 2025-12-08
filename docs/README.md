# Dokumentacja Techniczna - AKROBUD

## Spis treści

### Architektura
- [**database.md**](./architecture/database.md) - Struktura bazy danych, modele Prisma
- [**api-endpoints.md**](./architecture/api-endpoints.md) - Dokumentacja API REST

### Przewodniki deweloperskie
- [**transactions.md**](./guides/transactions.md) - Transakcje Prisma, kiedy używać
- [**reverse-operations.md**](./guides/reverse-operations.md) - Operacje odwrotne w systemie
- [**anti-patterns.md**](./guides/anti-patterns.md) - Czego unikać, typowe błędy

### Dokumentacja funkcjonalności
- [**deliveries.md**](./features/deliveries.md) - Moduł dostaw, optymalizacja palet
- [**reports.md**](./features/reports.md) - Raporty, eksporty PDF
- [**schuco.md**](./features/schuco.md) - Integracja Schuco Connect

### Instrukcje użytkownika
- [**schuco.md**](./user-guides/schuco.md) - Jak korzystać z modułu Schuco

### Bezpieczeństwo
- [**analysis.md**](./security/analysis.md) - Analiza bezpieczeństwa i błędów

### Archiwum
- [**archive/**](./archive/) - Historyczne dokumenty, zakończone przeglądy

---

## Dla nowych deweloperów

### Przed rozpoczęciem pracy

1. Przeczytaj [CLAUDE.md](../CLAUDE.md) - konwencje projektu
2. Zapoznaj się z [architekturą bazy](./architecture/database.md)
3. Sprawdź [przewodnik transakcji](./guides/transactions.md)
4. Przejrzyj [antypatterns](./guides/anti-patterns.md)

### Kluczowe zasady

| Zasada | Dlaczego |
|--------|----------|
| Używaj transakcji Prisma | Atomowość operacji |
| Implementuj operacje odwrotne | Możliwość rollback |
| Waliduj na warstwie handler | Zod schemas |
| Dynamic imports z `.then(mod => mod.default)` | Next.js 15 wymaga |

### Quick Reference - Transakcje

```typescript
await prisma.$transaction(async (tx) => {
  await tx.table1.update({ ... });
  await tx.table2.update({ ... });
});
```

### Quick Reference - Operacje odwrotne

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

## Struktura katalogów

```
docs/
├── architecture/     # Architektura systemu
├── guides/           # Przewodniki deweloperskie
├── features/         # Dokumentacja funkcjonalności
├── user-guides/      # Instrukcje dla użytkowników
├── security/         # Bezpieczeństwo
└── archive/          # Historyczne dokumenty
    ├── reviews/      # Zakończone code reviews
    └── sprints/      # Podsumowania sprintów
```

---

**Wersja dokumentacji:** 2.0
**Data ostatniej aktualizacji:** 2025-12-08
