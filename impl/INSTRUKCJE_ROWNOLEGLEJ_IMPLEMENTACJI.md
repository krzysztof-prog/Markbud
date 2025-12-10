# Instrukcje Równoległej Implementacji

## Przegląd

Ten dokument opisuje jak bezpiecznie przeprowadzić implementację wielu funkcjonalności w 4 równoległych oknach kontekstowych Claude Code.

---

## Funkcjonalności do implementacji

| # | Funkcjonalność | Plik instrukcji | Czas |
|---|----------------|-----------------|------|
| 1 | Migracja bazy danych | `OKNO_1_MIGRACJA_BAZY.md` | ~15 min |
| 2 | Remanent - Stan początkowy | `OKNO_2_REMANENT.md` | ~45 min |
| 3 | Glass Tracking - Backend | `OKNO_3_GLASS_BACKEND.md` | ~2-3h |
| 4 | Glass Tracking - Frontend | `OKNO_4_GLASS_FRONTEND.md` | ~2-3h |

---

## Diagram zależności

```
┌─────────────────────────────────────────────────┐
│           OKNO 1: MIGRACJA BAZY                 │
│         (MUSI BYĆ PIERWSZE!)                    │
│                                                 │
│  Modyfikuje: schema.prisma                      │
│  Uruchamia: prisma db push                      │
└──────────────────┬──────────────────────────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│  OKNO 2  │ │  OKNO 3  │ │  OKNO 4  │
│ Remanent │ │  Glass   │ │  Glass   │
│          │ │ Backend  │ │ Frontend │
│          │ │          │ │          │
│ RÓWNOLEGLE│ │ RÓWNOLEGLE│ │ PO #3   │
└──────────┘ └──────────┘ └──────────┘
```

---

## Kolejność wykonywania

### Krok 1: Przygotowanie (PRZED wszystkim)

```bash
# Backup bazy danych
cp apps/api/dev.db apps/api/dev.db.backup

# Commit obecnego stanu
git add .
git commit -m "chore: backup before parallel implementation"

# Zatrzymaj serwery deweloperskie
# (Ctrl+C w terminalach z pnpm dev)
```

### Krok 2: OKNO 1 - Migracja bazy (NAJPIERW!)

1. Otwórz nowe okno Claude Code
2. Wklej zawartość `OKNO_1_MIGRACJA_BAZY.md`
3. Poczekaj na zakończenie migracji
4. Potwierdź sukces przed kontynuowaniem

**KRYTYCZNE:** Nie rozpoczynaj okien 2-4 przed ukończeniem okna 1!

### Krok 3: OKNA 2 i 3 - Równolegle

Po zakończeniu okna 1, możesz uruchomić równolegle:

**Okno 2 - Remanent:**
- Otwórz nowe okno Claude Code
- Wklej zawartość `OKNO_2_REMANENT.md`

**Okno 3 - Glass Backend:**
- Otwórz nowe okno Claude Code
- Wklej zawartość `OKNO_3_GLASS_BACKEND.md`

Te okna mogą działać równolegle, ponieważ modyfikują różne pliki.

### Krok 4: OKNO 4 - Po zakończeniu okna 3

**Okno 4 - Glass Frontend:**
- Poczekaj aż Okno 3 (Glass Backend) będzie ukończone
- Otwórz nowe okno Claude Code
- Wklej zawartość `OKNO_4_GLASS_FRONTEND.md`

Frontend wymaga działającego API, więc backend musi być gotowy.

---

## Mapa plików i konfliktów

### Pliki modyfikowane w każdym oknie

| Okno | Pliki |
|------|-------|
| 1 | `apps/api/prisma/schema.prisma` |
| 2 | `apps/api/src/routes/warehouse.ts`, `apps/web/src/types/warehouse.ts`, `apps/web/src/features/warehouse/remanent/components/RemanentTable.tsx` |
| 3 | NOWE pliki w `apps/api/src/services/`, `apps/api/src/handlers/`, `apps/api/src/routes/`, `apps/api/src/index.ts` |
| 4 | NOWE pliki w `apps/web/src/features/glass/`, `apps/web/src/app/zamowienia-szyb/`, `apps/web/src/app/dostawy-szyb/` |

### Potencjalne konflikty

| Konflikt | Rozwiązanie |
|----------|-------------|
| `schema.prisma` | Wszystkie zmiany w Oknie 1 |
| `apps/api/src/index.ts` | Tylko Okno 3 modyfikuje (rejestracja routes) |

---

## Instrukcje dla każdego okna

### Okno 1: Migracja Bazy
```
Przeczytaj plik: impl/OKNO_1_MIGRACJA_BAZY.md

Wykonaj wszystkie kroki z pliku, szczególnie:
1. Dodaj pole initialStockBeams do WarehouseStock
2. Dodaj pola glass tracking do Order
3. Dodaj modele GlassOrder, GlassOrderItem, GlassDelivery, GlassDeliveryItem, GlassOrderValidation
4. Uruchom: npx prisma db push && npx prisma generate

Po zakończeniu napisz: "Okno 1 zakończone. Migracja gotowa."
```

### Okno 2: Remanent
```
ZALEŻNOŚĆ: Okno 1 musi być ukończone!

Przeczytaj plik: impl/OKNO_2_REMANENT.md

Wykonaj wszystkie kroki z pliku:
1. Zaktualizuj warehouse.ts (backend)
2. Zaktualizuj warehouse.ts types (frontend)
3. Zaktualizuj RemanentTable.tsx

Po zakończeniu napisz: "Okno 2 zakończone. Remanent gotowy."
```

### Okno 3: Glass Backend
```
ZALEŻNOŚĆ: Okno 1 musi być ukończone!

Przeczytaj plik: impl/OKNO_3_GLASS_BACKEND.md

Wykonaj wszystkie kroki z pliku:
1. Utwórz parsery (glass-order-txt-parser.ts, glass-delivery-csv-parser.ts)
2. Utwórz serwisy (glassOrderService.ts, glassDeliveryService.ts, glassValidationService.ts)
3. Utwórz handlery i routes
4. Zarejestruj routes w index.ts

Po zakończeniu napisz: "Okno 3 zakończone. Backend Glass gotowy."
```

### Okno 4: Glass Frontend
```
ZALEŻNOŚĆ: Okno 1 i Okno 3 muszą być ukończone!

Przeczytaj plik: impl/OKNO_4_GLASS_FRONTEND.md

Wykonaj wszystkie kroki z pliku:
1. Utwórz typy TypeScript
2. Utwórz API wrappers i hooks
3. Utwórz komponenty
4. Utwórz strony /zamowienia-szyb i /dostawy-szyb

Po zakończeniu napisz: "Okno 4 zakończone. Frontend Glass gotowy."
```

---

## Troubleshooting

### Błąd: "Relation does not exist"
**Przyczyna:** Okno 1 nie zostało ukończone
**Rozwiązanie:** Upewnij się że `npx prisma db push` i `npx prisma generate` zostały wykonane

### Błąd: "API endpoint not found"
**Przyczyna:** Okno 3 nie zostało ukończone
**Rozwiązanie:** Poczekaj aż backend będzie gotowy przed uruchomieniem frontendu

### Błąd: "File already modified"
**Przyczyna:** Konflikt między oknami
**Rozwiązanie:** Sprawdź mapę plików - każde okno powinno modyfikować tylko swoje pliki

### Jak przywrócić stan początkowy
```bash
# Przywróć bazę danych
cp apps/api/dev.db.backup apps/api/dev.db

# Przywróć kod
git checkout .

# Lub hard reset
git reset --hard HEAD
```

---

## Timeline (szacunkowy)

```
Czas    | Okno 1    | Okno 2    | Okno 3    | Okno 4
--------|-----------|-----------|-----------|----------
0:00    | START     |           |           |
0:15    | KONIEC    | START     | START     |
0:30    |           | ...       | ...       |
1:00    |           | KONIEC    | ...       |
1:30    |           |           | ...       |
2:00    |           |           | KONIEC    | START
2:30    |           |           |           | ...
3:00    |           |           |           | KONIEC
```

---

## Po zakończeniu wszystkich okien

### 1. Uruchom serwery i przetestuj

```bash
# Terminal 1
pnpm dev:api

# Terminal 2
pnpm dev:web
```

### 2. Sprawdź funkcjonalności

- [ ] Remanent: http://localhost:3000/magazyn/akrobud/remanent
  - [ ] Kolumna "Stan początkowy" widoczna
  - [ ] Zapis remanentu aktualizuje stan początkowy

- [ ] Zamówienia szyb: http://localhost:3000/zamowienia-szyb
  - [ ] Import TXT działa
  - [ ] Tabela wyświetla zamówienia
  - [ ] Modal szczegółów działa

- [ ] Dostawy szyb: http://localhost:3000/dostawy-szyb
  - [ ] Import CSV działa
  - [ ] Tabela wyświetla dostawy
  - [ ] Panel walidacji pokazuje statystyki

### 3. Commit zmian

```bash
git add .
git commit -m "feat: implement remanent initial stock and glass tracking

- Add initialStockBeams to WarehouseStock model
- Add glass order and delivery tracking models
- Implement glass order TXT parser (Pilkington format)
- Implement glass delivery CSV parser
- Add /zamowienia-szyb and /dostawy-szyb pages
- Add validation dashboard and order matching logic"
```

---

## Podsumowanie

1. **Okno 1** - ZAWSZE NAJPIERW (migracja bazy)
2. **Okno 2** i **Okno 3** - RÓWNOLEGLE (różne pliki)
3. **Okno 4** - PO OKNIE 3 (wymaga API)

Przestrzeganie tej kolejności eliminuje konflikty i zapewnia bezpieczną implementację.
