# 🚀 PROMPT DO ROZPOCZĘCIA IMPLEMENTACJI UX IMPROVEMENTS

> **Kopiuj i wklej do nowego okna Claude Code**

---

## 📋 PROMPT STARTOWY

```
Rozpocznij implementację 5 kluczowych usprawnień UX dla AKROBUD zgodnie z dokumentacją:

📖 PRZECZYTAJ NAJPIERW:
- docs/UX_IMPROVEMENTS_5_KEY_ENHANCEMENTS.md
- docs/UX_IMPROVEMENTS_IMPLEMENTATION_EXAMPLES.md
- CLAUDE.md (konwencje projektu)
- docs/guides/anti-patterns.md (czego unikać)

🎯 CEL SESJI:
Implementacja FAZY 1 (Tydzień 1, Dni 1-2): Destructive Action Dialog + Contextual Alerts

📝 ZADANIA DO WYKONANIA:

1. DESTRUCTIVE ACTION DIALOG (Priorytet KRYTYCZNY)
   ✅ Stwórz apps/web/src/components/ui/destructive-action-dialog.tsx
   ✅ Stwórz apps/web/src/hooks/useDestructiveAction.ts
   ✅ Zintegruj z apps/web/src/features/warehouse/remanent/components/FinalizeMonthModal.tsx
   ✅ Zintegruj z apps/web/src/app/dostawy/components/DeliveryDialogs.tsx (DeleteConfirmDialog)
   ✅ Testy manualne - uruchom dev server i przetestuj

2. CONTEXTUAL ALERTS (Priorytet WYSOKI)
   ✅ Stwórz apps/web/src/components/ui/contextual-alert.tsx
   ✅ Stwórz apps/web/src/hooks/useContextualToast.ts
   ✅ Zamień toasty w magazynie (niedobory profili)
   ✅ Zamień toasty w importach (konflikty)
   ✅ Zamień toasty w dostawach (deadlines)

🔧 TECHNOLOGIE:
- React 19 + Next.js 15 + TypeScript
- Shadcn/ui (Radix UI) + TailwindCSS
- React Query dla data fetching
- Lucide React dla ikon

⚡ WAŻNE ZASADY:
1. Używaj TYLKO istniejących komponentów Shadcn/ui z apps/web/src/components/ui/
2. Zachowaj TailwindCSS color palette (green-*, yellow-*, red-*, blue-*)
3. ARIA accessibility - wszystkie komponenty muszą mieć proper aria-* attributes
4. TypeScript strict mode - zero any types
5. Responsive design - mobile-first (sm:, md:, lg:)
6. Wszystkie komunikaty PO POLSKU
7. Używaj frontend-dev-guidelines dla wzorców React/Next.js

📂 STRUKTURA PLIKÓW:
apps/web/src/
  components/ui/
    destructive-action-dialog.tsx  ← NOWY
    contextual-alert.tsx           ← NOWY
  hooks/
    useDestructiveAction.ts        ← NOWY
    useContextualToast.ts          ← NOWY
  features/
    warehouse/remanent/components/
      FinalizeMonthModal.tsx       ← MODYFIKACJA
  app/
    dostawy/components/
      DeliveryDialogs.tsx          ← MODYFIKACJA

🧪 TESTOWANIE:
Po każdym komponencie:
1. Uruchom pnpm dev
2. Otwórz http://localhost:3000
3. Przetestuj funkcjonalność manualnie
4. Sprawdź responsywność (mobile/desktop)
5. Sprawdź accessibility (keyboard navigation, screen reader)

📊 PROGRESS TRACKING:
Używaj TodoWrite do śledzenia postępu każdego zadania.

🎨 PRZYKŁAD KODU:
Zobacz pełne przykłady w docs/UX_IMPROVEMENTS_IMPLEMENTATION_EXAMPLES.md
Sekcje 1-2 zawierają kompletne implementacje.

❓ JEŚLI COKOLWIEK NIEJASNE:
1. Przeczytaj najpierw pełną dokumentację
2. Sprawdź istniejące komponenty w apps/web/src/components/ui/
3. Zobacz przykłady użycia w features/
4. Zachowaj konsystencję z obecnym kodem

🚨 RED FLAGS (ZATRZYMAJ SIĘ I ZAPYTAJ):
- Tworzysz nowy komponent Shadcn/ui (powinien już istnieć)
- Używasz console.log zamiast proper error handling
- Brakuje aria-* attributes
- Komunikaty po angielsku
- Używasz inline styles zamiast TailwindCSS
- Kod nie przechodzi TypeScript strict checks

✅ DEFINITION OF DONE:
- [ ] Wszystkie komponenty stworzone
- [ ] Integracja z istniejącym kodem zakończona
- [ ] Zero błędów TypeScript
- [ ] Testy manualne przeszły pozytywnie
- [ ] Kod zgodny z frontend-dev-guidelines
- [ ] Accessibility sprawdzona (keyboard + aria)
- [ ] Responsive design działa (mobile/tablet/desktop)
- [ ] Commit z opisem zmian

🎯 ROZPOCZNIJ OD:
1. Aktywuj skill: frontend-dev-guidelines
2. Przeczytaj docs/UX_IMPROVEMENTS_5_KEY_ENHANCEMENTS.md (sekcja Usprawnienie 4)
3. Stwórz destructive-action-dialog.tsx używając przykładu z dokumentacji
4. Przetestuj komponent
5. Przejdź do integracji z FinalizeMonthModal

POWODZENIA! 🚀
```

---

## 🎯 ALTERNATYWNY PROMPT (BARDZIEJ SZCZEGÓŁOWY)

Jeśli potrzebujesz bardziej krok-po-kroku:

```
Implementuj DESTRUCTIVE ACTION DIALOG dla AKROBUD w następujących krokach:

KROK 1: SETUP
1. Aktywuj skill frontend-dev-guidelines
2. Przeczytaj pełną specyfikację w docs/UX_IMPROVEMENTS_5_KEY_ENHANCEMENTS.md (Usprawnienie 4)
3. Przejrzyj przykład implementacji w docs/UX_IMPROVEMENTS_IMPLEMENTATION_EXAMPLES.md (Sekcja 2)

KROK 2: STWÓRZ KOMPONENT
Stwórz apps/web/src/components/ui/destructive-action-dialog.tsx

Wymagania:
- TypeScript + React.FC pattern
- Props interface z pełną dokumentacją JSDoc
- 4 typy akcji: 'delete' | 'archive' | 'override' | 'finalize'
- Różne kolory dla każdego typu (red, orange, yellow, blue)
- Input validation - confirmText must match
- Lista konsekwencji z ikonami XCircle
- Optional affectedItems (scrollable list)
- Optional previewData (custom React.ReactNode)
- Proper ARIA attributes (role="alertdialog", aria-labelledby, aria-describedby)
- Responsive (fullscreen na mobile: max-sm:min-h-screen)

Użyj istniejących komponentów:
- Dialog z @/components/ui/dialog
- Button z @/components/ui/button
- Input z @/components/ui/input
- Alert z @/components/ui/alert
- Ikony z lucide-react (AlertTriangle, XCircle)

KROK 3: STWÓRZ HOOK
Stwórz apps/web/src/hooks/useDestructiveAction.ts

Wymagania:
- State management (isOpen, isExecuting)
- trigger() - otwiera dialog
- execute() - wykonuje akcję
- Proper error handling
- TypeScript types

KROK 4: INTEGRACJA - FinalizeMonthModal
Zmodyfikuj apps/web/src/features/warehouse/remanent/components/FinalizeMonthModal.tsx

Zadania:
1. Import DestructiveActionDialog
2. Dodaj state dla showDialog
3. Stwórz query dla preview data (useQuery)
4. Stwórz mutation dla finalize (useMutation)
5. Zastąp obecny modal DestructiveActionDialog
6. Dodaj consequencies list (minimum 4 punkty)
7. Dodaj affectedItems (lista zleceń)
8. Dodaj previewData (podsumowanie: liczba zleceń, wartość magazynu)
9. confirmText = "FINALIZUJ"
10. Integracja z useContextualToast (success/error)

KROK 5: TESTOWANIE
1. Uruchom pnpm dev
2. Przejdź do /magazyn
3. Kliknij "Finalizuj miesiąc"
4. Sprawdź:
   - Dialog się otwiera
   - Lista konsekwencji wyświetla się
   - Preview data pokazuje wartości
   - Input validation działa (nie można potwierdzić bez wpisania "FINALIZUJ")
   - Loading state podczas wykonywania
   - Success toast po finalizacji
   - Error toast przy błędzie
5. Sprawdź keyboard navigation (Tab, Enter, Escape)
6. Sprawdź mobile view (< 640px width)

KROK 6: INTEGRACJA - DeliveryDialogs
Zmodyfikuj apps/web/src/app/dostawy/components/DeliveryDialogs.tsx

Zadania:
1. Zastąp DeleteConfirmDialog DestructiveActionDialog
2. confirmText = delivery.deliveryNumber
3. Consequences dla dostaw z/bez zleceń
4. affectedItems = lista zleceń w dostawie
5. actionType = 'delete'

KROK 7: COMMIT
Stwórz commit z opisem:
"feat: Add destructive action dialog for critical operations

- Add DestructiveActionDialog component with 4 action types
- Add useDestructiveAction hook for state management
- Integrate with FinalizeMonthModal (warehouse)
- Integrate with DeliveryDialogs (delete confirmation)
- Add proper ARIA attributes for accessibility
- Add responsive design (mobile fullscreen)
- Add input validation (confirmText match)
- Add preview data support

Prevents accidental deletions with two-step confirmation.
Reduces user errors by 70% (target metric)."

NASTĘPNE ZADANIE:
Po zakończeniu tego, przejdź do Contextual Alerts (Usprawnienie 1).

Pytania? Sprawdź dokumentację lub zapytaj.
```

---

## 🔄 PROMPT DO KONTYNUACJI (PO PRZERWIE)

Jeśli wracasz do pracy po przerwie:

```
Kontynuuj implementację UX Improvements dla AKROBUD.

STATUS CHECK:
1. Przeczytaj ostatnie zmiany w git log
2. Sprawdź TODO list (TodoWrite)
3. Zidentyfikuj co zostało zrobione, co pozostało

GDZIE JESTEM:
- Faza 1, Tydzień 1
- Zadanie: [sprawdź TodoWrite]

CO DALEJ:
- Zobacz docs/UX_IMPROVEMENTS_5_KEY_ENHANCEMENTS.md sekcja "Plan Wdrożenia"
- Kontynuuj od miejsca gdzie skończyłeś
- Zachowaj kolejność: Destructive Dialog → Contextual Alerts → Decision Colors

DOKUMENTACJA:
- docs/UX_IMPROVEMENTS_5_KEY_ENHANCEMENTS.md
- docs/UX_IMPROVEMENTS_IMPLEMENTATION_EXAMPLES.md

Używaj TodoWrite do tracking postępu.
Używaj frontend-dev-guidelines dla wzorców.

Kontynuuj! 🚀
```

---

## 📚 QUICK REFERENCE

### Istniejące Komponenty Shadcn/ui

```typescript
// Dostępne w apps/web/src/components/ui/
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
```

### TailwindCSS Colors

```typescript
// Decision colors
'bg-green-50 border-green-200 text-green-700' // CAN (success)
'bg-yellow-50 border-yellow-200 text-yellow-700' // RISKY (warning)
'bg-red-50 border-red-200 text-red-700' // CANNOT (error)
'bg-blue-50 border-blue-200 text-blue-700' // INFO
```

### React Query Patterns

```typescript
// Data fetching
const { data, isLoading } = useQuery({
  queryKey: ['key'],
  queryFn: fetchFunction
});

// Mutations
const mutation = useMutation({
  mutationFn: saveFunction,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['key'] })
});
```

### ARIA Attributes

```typescript
// Dialog
role="alertdialog"
aria-labelledby="dialog-title"
aria-describedby="dialog-description"

// Input validation
aria-invalid={hasError}
aria-describedby="field-error"

// Button states
aria-pressed={isActive}
aria-disabled={isDisabled}
```

---

## ✅ CHECKLIST PRZED STARTEM

- [ ] Przeczytałem docs/UX_IMPROVEMENTS_5_KEY_ENHANCEMENTS.md
- [ ] Przeczytałem docs/UX_IMPROVEMENTS_IMPLEMENTATION_EXAMPLES.md
- [ ] Przeczytałem CLAUDE.md (konwencje projektu)
- [ ] Mam uruchomiony dev server (pnpm dev)
- [ ] Mam otwartą dokumentację Shadcn/ui
- [ ] Wiem jakie komponenty już istnieją w projekcie
- [ ] Rozumiem strukturę katalogów
- [ ] Aktywowałem skill frontend-dev-guidelines

---

## 🆘 TROUBLESHOOTING

**Problem:** TypeScript błędy w komponencie
**Rozwiązanie:** Sprawdź imports, użyj type z @/types/, dodaj proper interface

**Problem:** Komponenty Shadcn/ui nie działają
**Rozwiązanie:** Sprawdź czy import path to @/components/ui/, nie twórz nowych - używaj istniejących

**Problem:** Stylowanie nie działa
**Rozwiązanie:** Używaj TYLKO TailwindCSS classes, nie inline styles

**Problem:** Accessibility warnings
**Rozwiązanie:** Dodaj aria-* attributes, role, proper labels

**Problem:** Not sure what to do next
**Rozwiązanie:** Sprawdź TodoWrite, przeczytaj Plan Wdrożenia w dokumentacji

---

**GOTOWY? SKOPIUJ PROMPT I WKLEJ DO NOWEGO OKNA! 🚀**
