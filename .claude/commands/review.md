# Code Review

Przegląd ostatnio napisanego kodu.

## Checklist

### TypeScript
- [ ] Brak `any` - wszystkie typy zdefiniowane
- [ ] Brak błędów kompilacji (`pnpm typecheck`)
- [ ] Interfejsy/typy dla props i response

### Backend (jeśli dotyczy)
- [ ] Walidacja Zod dla inputów
- [ ] Obsługa błędów (try/catch, error responses)
- [ ] Transakcje Prisma dla operacji DB
- [ ] Logowanie ważnych akcji

### Frontend (jeśli dotyczy)
- [ ] React Query dla data fetching
- [ ] Loading states
- [ ] Error handling
- [ ] Brak memory leaks (cleanup w useEffect)

### Bezpieczeństwo
- [ ] Brak SQL injection (Prisma parametryzuje)
- [ ] Brak XSS (sanityzacja inputów)
- [ ] Brak secrets w kodzie
- [ ] Walidacja uprawnień

### Performance
- [ ] Brak N+1 queries (include w Prisma)
- [ ] Memoizacja gdzie potrzebna
- [ ] Lazy loading komponentów
- [ ] Optymalne re-rendery

## Teraz

Wskaż plik/funkcję do review:
```
/review [ścieżka do pliku]
```

Lub jeśli właśnie skończyłeś pisać kod, powiedz co zrobiłeś.
