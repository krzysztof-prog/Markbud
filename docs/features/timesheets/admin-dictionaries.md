# Timesheets - Słowniki (Admin)

## Nawigacja

```
Godzinówki
├── Kalendarz
└── Słowniki ← dostępne tylko dla admina/kierownika
    ├── Pracownicy
    ├── Stanowiska
    ├── Zadania nieprodukcyjne
    └── Typy nietypówek
```

---

## Struktura widoku słownika

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Pracownicy                                         [+ Dodaj nowego]   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  TABELA                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Imię i nazwisko    │ Stanowisko domyślne │ Aktywny  │ Akcje           │  │
│  ├─────────────────────┼────────────────────┼──────────┼─────────────────┤  │
│  │  Jan Kowalski       │ Produkcja           │    ✓     │ [Edytuj] [↓]   │  │
│  │  Anna Nowak         │ Produkcja           │    ✓     │ [Edytuj] [↓]   │  │
│  │  Piotr Wiśniewski   │ Montaż              │    ✓     │ [Edytuj] [↓]   │  │
│  │  ─ Maria Zielińska  │ Produkcja           │    ✗     │ [Edytuj] [↑]   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  Legenda:  [↓] = Dezaktywuj   [↑] = Aktywuj   ─ = Nieaktywny (przyszarzony) │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Zasady CRUD

| Operacja | Dozwolona | Uwagi |
|----------|-----------|-------|
| **Create** | ✓ | Normalne dodawanie |
| **Read** | ✓ | Lista z filtrem aktywny/nieaktywny |
| **Update** | ✓ | Edycja danych |
| **Delete** | ✗ | **NIE KASUJ** - tylko dezaktywuj |

**Dlaczego brak delete?**
Historyczne dane godzinówek muszą zachować odniesienie do pracownika/stanowiska.
Zamiast delete → `isActive: false` + element przyszarzony na liście.

---

## Słownik: Pracownicy

### Pola

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| firstName | string | ✓ | Imię |
| lastName | string | ✓ | Nazwisko |
| defaultPosition | string | ✓ | ID domyślnego stanowiska |
| isActive | boolean | ✓ | Czy aktywny |

### Formularz

```
┌────────────────────────────────────────────────┐
│  Dodaj pracownika                               │
│                                                 │
│  Imię:        [                    ]           │
│  Nazwisko:    [                    ]           │
│  Stanowisko:  [ Produkcja ▼       ]            │
│                                                 │
│              [Anuluj]  [Zapisz]                │
└────────────────────────────────────────────────┘
```

---

## Słownik: Stanowiska

### Pola

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| name | string | ✓ | Nazwa stanowiska (unique) |
| isActive | boolean | ✓ | Czy aktywne |

### Przykładowe stanowiska

- Produkcja
- Montaż
- Szklarnia
- Pakowanie
- Magazyn

---

## Słownik: Zadania nieprodukcyjne

### Pola

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| name | string | ✓ | Nazwa zadania (unique) |
| isActive | boolean | ✓ | Czy aktywne |

### Przykładowe zadania

- Pakowanie
- Przygotowanie profili
- Serwis
- Palety
- Inne

---

## Słownik: Typy nietypówek

### Pola

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| name | string | ✓ | Nazwa typu (unique) |
| isActive | boolean | ✓ | Czy aktywny |

### Przykładowe typy

- Drzwi
- HS (Hebeschiebetür)
- PSK (Parallel-Schiebe-Kipptür)
- Szprosy
- Trapez

---

## Zobacz też

- [Filozofia projektowa](design-philosophy.md)
- [Model danych](data-model.md)
- [Panel edycji pracownika](screens-worker-panel.md)
