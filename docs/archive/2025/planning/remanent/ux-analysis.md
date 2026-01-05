# Analiza UX - Funkcja Remanent (Inwentaryzacja Magazynu)

## 📋 Wybrane Opcje przez Użytkownika

1. **Umiejscowienie:** Opcja C - Osobna strona `/magazyn/akrobud/remanent`
2. **Workflow:** Kolorami (wszystkie profile dla koloru jednocześnie)
3. **Historia:** Opcja C - Osobna podstrona `/magazyn/akrobud/remanent/historia`
4. **Rollback:** Opcja A - Przycisk "Cofnij ostatni remanent" w historii
5. **Wybór koloru:** Opcja A - Sidebar z kolorami (jak na obecnej stronie magazynu)

---

## 🎨 Szczegółowa Analiza UX

### 1. Architektura Informacji

```
/magazyn
  └── /akrobud
      ├── [Obecna strona z 2 zakładkami]
      └── /remanent ⭐ NOWA STRONA
          ├── index (Formularz remanent)
          └── /historia (Historia + Rollback)
```

**Zalety tego podejścia:**
- ✅ **Separacja kontekstu:** Remanent to oddzielny proces biznesowy (inwentaryzacja), nie codzienne przeglądanie
- ✅ **Pełna przestrzeń ekranu:** Możliwość wyświetlenia szerokiej tabeli z wieloma kolumnami
- ✅ **Naturalna rozszerzalność:** Historia jako podstrona, potencjalnie raporty remanentów w przyszłości
- ✅ **Zgodność z Next.js routing:** Folder-based routing = `/magazyn/akrobud/remanent/page.tsx`

**Wyzwania UX:**
- ⚠️ **Discovery problem:** Użytkownik musi wiedzieć że funkcja istnieje
  - **Rozwiązanie:** Widoczny przycisk "Remanent" w głównej stronie magazynu
- ⚠️ **Dodatkowy poziom nawigacji:** Wymaga kliknięcia w link
  - **Rozwiązanie:** Breadcrumb: `Magazyn > Akrobud > Remanent`

---

### 2. User Flow - Proces Inwentaryzacji

#### Scenariusz: Użytkownik wykonuje miesięczną inwentaryzację magazynu

```
KROK 1: Nawigacja
/magazyn/akrobud
└─→ Przycisk "Wykonaj remanent" (prominent button, np. niebieski)
    └─→ Przekierowanie: /magazyn/akrobud/remanent

KROK 2: Wybór koloru
/magazyn/akrobud/remanent
├── Sidebar: Lista kolorów (Typowe | Nietypowe)
│   └─→ Kliknięcie: Ładuje profile dla koloru
│
└── Główny obszar: Tabela remanent

KROK 3: Wprowadzenie danych
Tabela (dla wybranego koloru):
┌─────────────────┬────────────────┬─────────────────┬──────────────┐
│ Profil          │ Stan obliczony │ Stan rzeczywisty│ Różnica      │
├─────────────────┼────────────────┼─────────────────┼──────────────┤
│ 58120           │ 45 bel         │ [INPUT: 43]     │ -2 bel ⚠️    │
│ 60245           │ 12 bel         │ [INPUT: 12]     │ 0 bel ✅     │
│ 78156           │ 8 bel          │ [INPUT: 10]     │ +2 bel ⚠️    │
└─────────────────┴────────────────┴─────────────────┴──────────────┘

- INPUT fields: Typ number, autofocus na pierwszym polu
- Różnica: Auto-obliczana na onChange
- Kolorowanie:
  - Zielone: Różnica = 0
  - Żółte: Różnica ±1-2
  - Czerwone: Różnica ≥ ±3

KROK 4: Walidacja i potwierdzenie
[Przycisk: "Zapisz remanent"] ← Disabled jeśli jakieś pole puste
└─→ Modal potwierdzający:
    "Czy na pewno chcesz zapisać remanent dla koloru C31?"

    Podsumowanie:
    • 15 profili
    • 3 różnice wykryte
    • 2 niedobory, 1 nadmiar

    [Anuluj] [Potwierdź i zapisz]

KROK 5: Zapisanie
POST /api/warehouse/monthly-update
└─→ Sukces:
    Toast: "✅ Remanent zapisany pomyślnie"
    + Redirect: /magazyn/akrobud/remanent/historia
    (pokazuje właśnie dodany wpis na górze listy)
```

#### Analiza UX tego flow:

**✅ Mocne strony:**
1. **Batch processing:** Wszystkie profile naraz = szybsza inwentaryzacja
2. **Natychmiastowa walidacja:** Różnice widoczne od razu, użytkownik może sprawdzić błędy
3. **Modal confirmation:** Zapobiega przypadkowym zapisom
4. **Redirect do historii:** Użytkownik od razu widzi efekt swojej pracy

**⚠️ Potencjalne problemy:**
1. **Długa tabela:** Co jeśli jest 50+ profili dla koloru?
   - **Rozwiązanie:** Virtual scrolling (react-window) lub paginacja
2. **Przypadkowe wyjście:** Co jeśli użytkownik zamknie stronę po wypełnieniu połowy?
   - **Rozwiązanie:** `window.beforeunload` warning jeśli są niezapisane zmiany
3. **Brak autosave:** Strata danych przy awarii
   - **Rozwiązanie:** localStorage cache (draft saving)

---

### 3. Sidebar z Kolorami - Szczegółowy Design

```
┌─────────────────────────────────────────────────────────────┐
│ MAGAZYN > AKROBUD > REMANENT                    [← Powrót]  │
├────────────┬────────────────────────────────────────────────┤
│            │                                                 │
│  KOLORY    │  REMANENT DLA KOLORU C31 - BIAŁOŚNIEŻNY       │
│            │                                                 │
│ ┌────────┐ │  Stan na: 01.12.2025 14:35                    │
│ │Typowe  │ │                                                 │
│ └────────┘ │  ┌──────────────────────────────────────────┐ │
│            │  │ Profil │ Obliczony │ Rzeczywisty │ Różnica│ │
│ ▼ C31      │  ├────────┼───────────┼─────────────┼────────┤ │
│   Biały    │  │ 58120  │ 45        │ [43______]  │ -2 🔴  │ │
│            │  │ 60245  │ 12        │ [12______]  │  0 ✅  │ │
│ ○ C34      │  │ 78156  │  8        │ [10______]  │ +2 🔴  │ │
│   Brązowy  │  └────────┴───────────┴─────────────┴────────┘ │
│            │                                                 │
│ ○ Inne...  │  [Anuluj] [Zapisz remanent] ← Primary action  │
│            │                                                 │
│ ┌────────┐ │                                                 │
│ │Nietypowe│ │                                                 │
│ └────────┘ │                                                 │
│            │                                                 │
│ ○ RAL9006 │                                                 │
│   Srebrny  │                                                 │
│            │                                                 │
│ ○ Inne...  │                                                 │
└────────────┴────────────────────────────────────────────────┘
```

**Zalety:**
- ✅ **Znany pattern:** Identyczny jak na `/magazyn/akrobud` - zero learning curve
- ✅ **Wizualna konsystencja:** Sidebar wygląda dokładnie tak samo
- ✅ **Szybkie przełączanie:** Klik na kolor = reload tabeli bez pełnego page refresh
- ✅ **Kontekst widoczny:** Zawsze wiadomo jaki kolor jest wybrany

**Implementacja techniczna:**
```tsx
// URL param dla koloru (opcjonalnie)
/magazyn/akrobud/remanent?colorId=1

// State management
const [selectedColorId, setSelectedColorId] = useState<number | null>(null);

// Query dla danych
const { data: warehouseData } = useQuery({
  queryKey: ['warehouse', selectedColorId],
  queryFn: () => warehouseApi.getByColor(selectedColorId!),
  enabled: !!selectedColorId,
});
```

---

### 4. Historia Remanentów - Podstrona

```
URL: /magazyn/akrobud/remanent/historia

┌─────────────────────────────────────────────────────────────┐
│ MAGAZYN > AKROBUD > REMANENT > HISTORIA                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  HISTORIA REMANENTÓW                                        │
│                                                              │
│  Filtr: [Wszystkie kolory ▼] [Ostatnie 6 miesięcy ▼]       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📅 01.12.2025 14:35 - C31 Białośnieżny             │   │
│  │                                                      │   │
│  │ • 15 profili                                        │   │
│  │ • 3 różnice wykryte (-2, +2, -1)                   │   │
│  │ • Zarchiwizowano: 5 zleceń                         │   │
│  │                                                      │   │
│  │ [Zobacz szczegóły ▼] [🔄 Cofnij ten remanent] ⚠️  │ ← Tylko dla ostatniego!
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📅 01.11.2025 09:15 - C31 Białośnieżny             │   │
│  │                                                      │   │
│  │ • 14 profili                                        │   │
│  │ • 1 różnica wykryta (+1)                           │   │
│  │ • Zarchiwizowano: 3 zlecenia                       │   │
│  │                                                      │   │
│  │ [Zobacz szczegóły ▼]                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Funkcjonalność "Zobacz szczegóły":**
```
Rozwijana sekcja pokazująca:
┌─────────────────────────────────────────────────────┐
│ SZCZEGÓŁY REMANENTU                                 │
├──────────┬──────────────┬──────────────┬───────────┤
│ Profil   │ Obliczony    │ Rzeczywisty  │ Różnica   │
├──────────┼──────────────┼──────────────┼───────────┤
│ 58120    │ 45           │ 43           │ -2 🔴     │
│ 60245    │ 12           │ 12           │  0 ✅     │
│ 78156    │  8           │ 10           │ +2 🔴     │
└──────────┴──────────────┴──────────────┴───────────┘
```

---

### 5. Rollback - Flow UX

#### Scenariusz: Użytkownik pomylił się przy wprowadzaniu i chce cofnąć

```
KROK 1: Identyfikacja błędu
Użytkownik: "O nie! Pomyliłem cyfry dla profilu 58120"
           "Wpisałem 34 zamiast 43!"

KROK 2: Nawigacja do historii
/magazyn/akrobud/remanent/historia
└─→ Widzi najnowszy wpis (01.12.2025 14:35)

KROK 3: Kliknięcie "Cofnij ten remanent"
[🔄 Cofnij ten remanent] ⚠️
└─→ Modal ostrzegawczy:

    ┌─────────────────────────────────────────────┐
    │ ⚠️ COFNIĘCIE REMANENTU                      │
    ├─────────────────────────────────────────────┤
    │                                             │
    │ Czy na pewno chcesz cofnąć remanent z:     │
    │ 01.12.2025 14:35 dla koloru C31?           │
    │                                             │
    │ To spowoduje:                               │
    │ • Przywrócenie stanów sprzed inwentaryzacji│
    │ • Usunięcie wpisów z historii              │
    │ • Przywrócenie 5 zarchiwizowanych zleceń   │
    │                                             │
    │ ⚠️ UWAGA: Tej operacji nie można cofnąć!   │
    │                                             │
    │ [Anuluj] [Tak, cofnij remanent] ⚠️         │
    └─────────────────────────────────────────────┘

KROK 4: Potwierdzenie
POST /api/warehouse/rollback-inventory
└─→ Sukces:
    Toast: "✅ Remanent cofnięty pomyślnie"
    + Odświeżenie strony historii (wpis zniknął)

KROK 5: Ponowne wykonanie (poprawnie)
Użytkownik wraca do /magazyn/akrobud/remanent
i wykonuje remanent ponownie z poprawnymi danymi
```

**Analiza UX:**
- ✅ **Ograniczona dostępność:** Tylko ostatni remanent można cofnąć = bezpieczeństwo
- ✅ **Wyraźne ostrzeżenie:** Modal z czerwonym akcentem + ikona ⚠️
- ✅ **Informacja o skutkach:** Użytkownik wie co się stanie
- ✅ **Confirmation required:** Double-check before destructive action

**Pytanie bezpieczeństwa:**
> Czy rollback powinien być dostępny tylko w X minut/godzin po remanent?

**Rekomendacja:**
- Rollback dostępny przez **24 godziny** po remanent
- Po 24h: przycisk zablokowany z tooltipem:
  "Remanent starszy niż 24h nie może być cofnięty"

---

### 6. Responsywność Mobile

**Problem:** Tabela z 4 kolumnami + sidebar = trudne na telefonie

**Rozwiązanie:**

```
DESKTOP (≥768px):
┌──────────┬────────────────────────────┐
│ Sidebar  │ Tabela (4 kolumny)        │
│ (kolory) │                            │
└──────────┴────────────────────────────┘

MOBILE (<768px):
┌─────────────────────────────────────┐
│ Dropdown: [Wybierz kolor ▼]        │ ← Zamiast sidebar
├─────────────────────────────────────┤
│ PROFIL 58120                        │ ← Card-based layout
│ Stan obliczony: 45 bel              │
│ Stan rzeczywisty: [43____]          │
│ Różnica: -2 bel 🔴                  │
├─────────────────────────────────────┤
│ PROFIL 60245                        │
│ Stan obliczony: 12 bel              │
│ ...                                 │
└─────────────────────────────────────┘
```

---

### 7. Accessibility (A11y)

**Kluczowe wymagania:**

1. **Keyboard navigation:**
   - Tab: Przechodzenie między INPUT fields
   - Enter: Zapisz remanent (gdy focus na przycisku)
   - Escape: Zamknij modal

2. **Screen readers:**
   - `aria-label` dla INPUT: "Stan rzeczywisty dla profilu 58120"
   - `role="alert"` dla różnic w tabeli
   - `aria-live="polite"` dla auto-obliczanej różnicy

3. **Focus management:**
   - Po wyborze koloru: autofocus na pierwszy INPUT
   - Po zamknięciu modalu: focus wraca do trigger button

4. **Color contrast:**
   - Różnice: Nie tylko kolor, ale też ikony (✅ ⚠️ 🔴)
   - WCAG AA compliance

---

## 🎯 Podsumowanie Decyzji UX

### Architektura
| Decyzja | Uzasadnienie UX |
|---------|-----------------|
| **Osobna strona `/magazyn/akrobud/remanent`** | Pełna przestrzeń ekranu, separacja kontekstu, rozszerzalność |
| **Sidebar z kolorami** | Znany pattern (konsystencja), szybkie przełączanie |
| **Batch processing (wszystkie profile naraz)** | Szybsza inwentaryzacja, natychmiastowa walidacja różnic |
| **Historia jako podstrona** | Czytelność, dedykowane miejsce na przeglądanie |
| **Rollback tylko ostatni + 24h limit** | Bezpieczeństwo, zapobieganie przypadkowym cofnięciom |

### Flow Użytkownika
1. **Entry point:** Widoczny przycisk "Wykonaj remanent" w `/magazyn/akrobud`
2. **Wybór koloru:** Sidebar (desktop) / Dropdown (mobile)
3. **Wprowadzenie danych:** Tabela z auto-obliczaniem różnic
4. **Walidacja:** Modal confirmation z podsumowaniem
5. **Zapis:** Toast + redirect do historii
6. **Rollback (jeśli potrzeba):** Historia → Cofnij → Modal → Zapis

### Metryki UX Success
- ⏱️ **Czas inwentaryzacji:** <5 minut dla 15 profili
- ❌ **Error rate:** <2% błędnie wprowadzonych danych (dzięki natychmiastowej walidacji)
- 🔄 **Rollback usage:** <5% przypadków (większość remanentów od razu poprawna)
- 📱 **Mobile usage:** Funkcjonalność dostępna, choć zalecany desktop

---

## 📋 Następne Kroki

Po zatwierdzeniu tej analizy UX, przejdę do:

1. **Szczegółowy plan techniczny** (komponenty, API calls, state management)
2. **Wireframes w Markdown** (ASCII art layout)
3. **Implementacja krok po kroku** z priorytetami

---

**Status:** ✅ Analiza UX ukończona - gotowa do implementacji
**Data:** 2025-12-01
