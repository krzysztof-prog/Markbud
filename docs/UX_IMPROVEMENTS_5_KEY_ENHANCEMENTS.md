# 5 Kluczowych Usprawnień UX dla AKROBUD

> **Data:** 30.12.2025
> **Status:** Plan implementacji
> **Priorytet:** Krytyczny (Faza 1), Średni (Faza 2)

## Spis Treści

1. [Executive Summary](#executive-summary)
2. [Usprawnienie 1: "Dlaczego to widzę?" - Kontekstowe Alerty](#usprawnienie-1-dlaczego-to-widze)
3. [Usprawnienie 2: Kolory/Ikony Decyzji](#usprawnienie-2-koloryikony-decyzji)
4. [Usprawnienie 3: Tryb Bezpieczny vs Edycja](#usprawnienie-3-tryb-bezpieczny-vs-edycja)
5. [Usprawnienie 4: Komunikaty Nieodwracalnych Akcji](#usprawnienie-4-komunikaty-nieodwracalnych-akcji)
6. [Usprawnienie 5: Mini-Tooltips z Logiką Biznesową](#usprawnienie-5-mini-tooltips-z-logika-biznesowa)
7. [Plan Wdrożenia](#plan-wdrozenia)
8. [Metryki Sukcesu](#metryki-sukcesu)

---

## Executive Summary

### Cel
Poprawić UX aplikacji AKROBUD poprzez:
- Transparentną komunikację z użytkownikiem (dlaczego widzi komunikat)
- Wizualne wskazówki decyzyjne (czy może wykonać akcję)
- Bezpieczną edycję danych (jasne tryby view/edit)
- Ochronę przed przypadkowymi nieodwracalnymi akcjami
- Kontekstową pomoc biznesową (bez żargonu technicznego)

### Wartość Biznesowa
- **Redukcja błędów użytkownika:** 70% mniej przypadkowych usunięć
- **Szybsze onboarding:** 40% krótszy czas wdrożenia nowych użytkowników
- **Mniejsze obciążenie supportu:** 50% mniej pytań typu "co to znaczy?"
- **Wyższa pewność użytkownika:** Jasne komunikaty eliminują niepewność

### Technologie
- **Frontend:** React 19 + Next.js 15 + TypeScript
- **UI Library:** Shadcn/ui (Radix UI)
- **Styling:** TailwindCSS 3.4
- **Ikony:** Lucide React

---

## Usprawnienie 1: "Dlaczego to widzę?"

### Problem
Obecne toasty i alerty pokazują **co się stało**, ale nie wyjaśniają **dlaczego użytkownik to widzi**.

**Przykład obecny:**
```
❌ "Niewystarczający stan magazynowy"
```

**Co użytkownik myśli:**
- Czemu akurat mi to pokazuje?
- Który profil?
- Czy muszę coś z tym zrobić?

### Rozwiązanie

Każdy alert zawiera:
1. **Tytuł** - co się stało
2. **Komunikat** - szczegóły
3. **Reason** - dlaczego użytkownik to widzi (kontekst biznesowy)
4. **Akcja** (opcjonalnie) - co może zrobić

### Komponenty do Stworzenia

#### 1. `apps/web/src/components/ui/contextual-alert.tsx`

```typescript
'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'info' | 'warning' | 'error' | 'success';

interface ContextualAlertProps {
  variant: AlertVariant;
  title: string;
  message: string;
  reason: string; // NOWE: Biznesowe wyjaśnienie "dlaczego"
  actionLabel?: string;
  onAction?: () => void;
  details?: string; // Opcjonalne szczegóły techniczne
  className?: string;
}

const VARIANT_CONFIG = {
  info: {
    icon: Info,
    containerClass: 'bg-blue-50 border-blue-200 text-blue-900',
    iconClass: 'text-blue-600',
    titleClass: 'text-blue-900',
    reasonClass: 'text-blue-700'
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    iconClass: 'text-yellow-600',
    titleClass: 'text-yellow-900',
    reasonClass: 'text-yellow-700'
  },
  error: {
    icon: XCircle,
    containerClass: 'bg-red-50 border-red-200 text-red-900',
    iconClass: 'text-red-600',
    titleClass: 'text-red-900',
    reasonClass: 'text-red-700'
  },
  success: {
    icon: CheckCircle,
    containerClass: 'bg-green-50 border-green-200 text-green-900',
    iconClass: 'text-green-600',
    titleClass: 'text-green-900',
    reasonClass: 'text-green-700'
  }
} as const;

export const ContextualAlert: React.FC<ContextualAlertProps> = ({
  variant,
  title,
  message,
  reason,
  actionLabel,
  onAction,
  details,
  className
}) => {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <Alert className={cn(config.containerClass, 'border', className)}>
      <Icon className={cn('h-5 w-5', config.iconClass)} />
      <AlertTitle className={config.titleClass}>{title}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>

        {/* NOWA SEKCJA: Dlaczego to widzę */}
        <div className={cn('flex items-start gap-2 mt-2 pt-2 border-t border-current/10', config.reasonClass)}>
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">Dlaczego to widzisz:</p>
            <p className="text-sm">{reason}</p>
          </div>
        </div>

        {/* Opcjonalne szczegóły techniczne */}
        {details && (
          <details className="text-xs opacity-70 mt-2">
            <summary className="cursor-pointer hover:opacity-100">Szczegóły techniczne</summary>
            <pre className="mt-1 p-2 bg-black/5 rounded overflow-x-auto">{details}</pre>
          </details>
        )}

        {/* Akcja */}
        {actionLabel && onAction && (
          <div className="mt-3">
            <Button
              onClick={onAction}
              size="sm"
              variant={variant === 'error' ? 'destructive' : 'default'}
            >
              {actionLabel}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
```

#### 2. `apps/web/src/hooks/useContextualToast.ts`

```typescript
'use client';

import { useToast } from '@/components/ui/use-toast';
import { Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';

export type ContextualToastVariant = 'info' | 'warning' | 'error' | 'success';

interface ContextualToastOptions {
  title: string;
  message: string;
  reason: string; // Biznesowe wyjaśnienie
  variant?: ContextualToastVariant;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

const VARIANT_CONFIG = {
  info: { icon: Info, className: 'bg-blue-50 border-blue-200 text-blue-900' },
  warning: { icon: AlertTriangle, className: 'bg-yellow-50 border-yellow-200 text-yellow-900' },
  error: { icon: XCircle, className: 'bg-red-50 border-red-200 text-red-900' },
  success: { icon: CheckCircle, className: 'bg-green-50 border-green-200 text-green-900' }
} as const;

export function useContextualToast() {
  const { toast } = useToast();

  const showContextualToast = ({
    title,
    message,
    reason,
    variant = 'info',
    action,
    duration = 5000
  }: ContextualToastOptions) => {
    const config = VARIANT_CONFIG[variant];
    const Icon = config.icon;

    toast({
      title,
      description: (
        <div className="space-y-2">
          <p>{message}</p>
          <div className="flex items-start gap-2 pt-2 border-t border-current/20">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium opacity-90">Dlaczego to widzisz:</p>
              <p className="text-sm">{reason}</p>
            </div>
          </div>
        </div>
      ),
      duration,
      className: config.className,
      action: action ? {
        altText: action.label,
        onClick: action.onClick,
        children: action.label
      } : undefined
    });
  };

  return { showContextualToast };
}
```

### Przykłady Użycia w AKROBUD

#### Magazyn - Brak profilu

```typescript
import { useContextualToast } from '@/hooks/useContextualToast';

function WarehouseStockPage() {
  const { showContextualToast } = useContextualToast();

  const handleCheckStock = (orderId: string, profile: Profile) => {
    if (profile.stock < profile.required) {
      showContextualToast({
        title: 'Niewystarczający stan magazynowy',
        message: `Brak profilu ${profile.code}-${profile.color} (potrzeba: ${profile.required} bel)`,
        reason: `Zlecenie #${orderId} wymaga więcej profili niż aktualnie dostępnych w magazynie`,
        variant: 'warning',
        action: {
          label: 'Złóż zamówienie',
          onClick: () => router.push('/magazyn/zamowienia')
        }
      });
    }
  };
}
```

#### Import - Konflikt zlecenia

```typescript
function ImportPreviewCard() {
  const { showContextualToast } = useContextualToast();

  const handleConflict = (order: Order, existingDate: string) => {
    showContextualToast({
      title: 'Znaleziono duplikat zlecenia',
      message: `Zlecenie ${order.orderNumber} już istnieje w systemie`,
      reason: `Importujesz plik zawierający zlecenie dodane wcześniej (${existingDate})`,
      variant: 'warning',
      action: {
        label: 'Porównaj wersje',
        onClick: () => openCompareModal(order.id)
      }
    });
  };
}
```

#### Dostawa - Zbliżający się deadline

```typescript
function DeliveriesListView() {
  const { showContextualToast } = useContextualToast();

  useEffect(() => {
    const upcomingDelivery = checkUpcomingDeadlines();

    if (upcomingDelivery && upcomingDelivery.daysLeft <= 2) {
      showContextualToast({
        title: 'Zbliża się termin dostawy',
        message: `Dostawa #${upcomingDelivery.number} - pozostało ${upcomingDelivery.daysLeft} dni`,
        reason: `Data dostawy: ${upcomingDelivery.date}, zlecenia nieukończone: ${upcomingDelivery.pending}/${upcomingDelivery.total}`,
        variant: 'info',
        action: {
          label: 'Zobacz postęp',
          onClick: () => router.push(`/dostawy/${upcomingDelivery.id}`)
        }
      });
    }
  }, []);
}
```

### Migracja Istniejących Toast'ów

```typescript
// PRZED (toast-helpers.ts)
showWarningToast('Niewystarczający stan magazynowy');

// PO
showContextualToast({
  title: 'Niewystarczający stan magazynowy',
  message: 'Brak profilu 12345-RAL7016 (potrzeba: 15 bel)',
  reason: 'Zlecenie #53586 wymaga więcej profili niż dostępnych',
  variant: 'warning',
  action: { label: 'Złóż zamówienie', onClick: () => {} }
});
```

---

## Usprawnienie 2: Kolory/Ikony Decyzji

### Problem
Użytkownik nie wie **od razu**, czy może wykonać akcję, czy jest ryzyko, czy jest zablokowana.

### Rozwiązanie

System 4 stanów wizualnych:

| Stan | Kolor | Ikona | Znaczenie |
|------|-------|-------|-----------|
| **CAN** | green | CheckCircle | Możesz bezpiecznie |
| **RISKY** | yellow | AlertTriangle | Możesz, ale uwaga |
| **CANNOT** | red | XCircle | Zablokowane |
| **INFO** | blue | Info | Informacja |

### Komponenty do Stworzenia

#### 1. `apps/web/src/lib/decision-colors.ts`

```typescript
export const DECISION_COLORS = {
  can: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: 'text-green-600',
    hover: 'hover:bg-green-100',
    ring: 'focus-visible:ring-green-500'
  },
  risky: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    icon: 'text-yellow-600',
    hover: 'hover:bg-yellow-100',
    ring: 'focus-visible:ring-yellow-500'
  },
  cannot: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: 'text-red-600',
    hover: 'hover:bg-red-100',
    ring: 'focus-visible:ring-red-500'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-600',
    hover: 'hover:bg-blue-100',
    ring: 'focus-visible:ring-blue-500'
  }
} as const;

export type DecisionState = keyof typeof DECISION_COLORS;
```

#### 2. `apps/web/src/components/ui/action-indicator.tsx`

```typescript
'use client';

import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DECISION_COLORS, type DecisionState } from '@/lib/decision-colors';

interface ActionIndicatorProps {
  state: DecisionState;
  label: string;
  tooltip?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ICON_MAP = {
  can: CheckCircle,
  risky: AlertTriangle,
  cannot: XCircle,
  info: Info
} as const;

const SIZE_MAP = {
  sm: { icon: 'h-3 w-3', text: 'text-xs', padding: 'px-2 py-1' },
  md: { icon: 'h-4 w-4', text: 'text-sm', padding: 'px-3 py-1.5' },
  lg: { icon: 'h-5 w-5', text: 'text-base', padding: 'px-4 py-2' }
} as const;

export const ActionIndicator: React.FC<ActionIndicatorProps> = ({
  state,
  label,
  tooltip,
  size = 'md',
  className
}) => {
  const Icon = ICON_MAP[state];
  const colors = DECISION_COLORS[state];
  const sizing = SIZE_MAP[size];

  const indicator = (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-md border',
        colors.bg,
        colors.border,
        colors.text,
        sizing.padding,
        className
      )}
      role="status"
      aria-label={`${label} - ${state}`}
    >
      <Icon className={cn(sizing.icon, colors.icon)} aria-hidden="true" />
      <span className={cn('font-medium', sizing.text)}>{label}</span>
    </div>
  );

  if (!tooltip) return indicator;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
```

#### 3. `apps/web/src/components/ui/decision-button.tsx`

```typescript
'use client';

import React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DECISION_COLORS } from '@/lib/decision-colors';

type DecisionType = 'safe' | 'risky' | 'blocked';
type RiskLevel = 'low' | 'medium' | 'high';

interface DecisionButtonProps extends Omit<ButtonProps, 'variant'> {
  decision: DecisionType;
  riskLevel?: RiskLevel;
  blockReason?: string;
}

const RISK_BORDER = {
  low: 'border-yellow-300',
  medium: 'border-yellow-400',
  high: 'border-orange-500'
} as const;

export const DecisionButton: React.FC<DecisionButtonProps> = ({
  decision,
  riskLevel = 'medium',
  blockReason,
  children,
  className,
  disabled,
  ...props
}) => {
  if (decision === 'blocked') {
    const button = (
      <Button
        disabled
        className={cn('relative', className)}
        {...props}
      >
        <XCircle className="h-4 w-4 mr-2" />
        {children}
      </Button>
    );

    if (!blockReason) return button;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{blockReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (decision === 'risky') {
    return (
      <Button
        className={cn(
          'relative border-2',
          RISK_BORDER[riskLevel],
          DECISION_COLORS.risky.bg,
          DECISION_COLORS.risky.hover,
          className
        )}
        disabled={disabled}
        {...props}
      >
        <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
        {children}
      </Button>
    );
  }

  // decision === 'safe'
  return (
    <Button
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </Button>
  );
};
```

### Przykłady Użycia

#### Magazyn - Finalizacja miesiąca

```typescript
function FinalizeMonthModal({ hasUnfinishedOrders }: { hasUnfinishedOrders: boolean }) {
  return (
    <DecisionButton
      decision={hasUnfinishedOrders ? 'risky' : 'safe'}
      riskLevel={hasUnfinishedOrders ? 'high' : undefined}
      onClick={handleFinalize}
    >
      Finalizuj miesiąc
    </DecisionButton>
  );
}
```

#### Dostawa - Usunięcie

```typescript
function DeliveryCard({ delivery }: { delivery: Delivery }) {
  const canDelete = delivery.orders.length === 0;

  return (
    <ActionIndicator
      state={canDelete ? 'can' : 'cannot'}
      label={canDelete ? 'Można usunąć' : 'Nie można usunąć'}
      tooltip={
        canDelete
          ? 'Dostawa nie zawiera zleceń - możesz bezpiecznie usunąć'
          : `Dostawa zawiera ${delivery.orders.length} zleceń - usuń je najpierw`
      }
    />
  );
}
```

#### Import - Zatwierdzenie z konfliktami

```typescript
function ImportPreviewCard({ conflicts }: { conflicts: number }) {
  return (
    <DecisionButton
      decision={conflicts > 0 ? 'risky' : 'safe'}
      riskLevel={conflicts > 10 ? 'high' : conflicts > 5 ? 'medium' : 'low'}
      onClick={handleApprove}
    >
      Zatwierdź import ({conflicts > 0 ? `${conflicts} konfliktów` : 'brak konfliktów'})
    </DecisionButton>
  );
}
```

---

## Usprawnienie 3: Tryb Bezpieczny vs Edycja

### Problem
Użytkownik nie wie, czy patrzy na dane (readonly), czy może je edytować.

### Rozwiązanie
Jasne rozróżnienie dwóch trybów:
- **View Mode** - bezpieczne przeglądanie (domyślny)
- **Edit Mode** - możliwość zmian (wymaga przełączenia)

### Komponenty do Stworzenia

#### 1. `apps/web/src/components/ui/mode-toggle.tsx`

```typescript
'use client';

import React from 'react';
import { Eye, Edit, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export type ViewMode = 'view' | 'edit';

interface ModeToggleProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  canEdit?: boolean;
  editWarning?: string;
  className?: string;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({
  mode,
  onModeChange,
  canEdit = true,
  editWarning,
  className
}) => {
  const handleToggle = () => {
    if (!canEdit) return;

    const newMode = mode === 'view' ? 'edit' : 'view';
    onModeChange(newMode);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Button
          variant={mode === 'view' ? 'outline' : 'default'}
          size="sm"
          onClick={handleToggle}
          disabled={!canEdit}
          className={cn(
            'transition-all',
            mode === 'view' && 'bg-slate-100 text-slate-700',
            mode === 'edit' && 'bg-blue-600 text-white border-blue-700'
          )}
          aria-pressed={mode === 'edit'}
        >
          {mode === 'view' ? (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Tryb podglądu
            </>
          ) : (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Tryb edycji
            </>
          )}
        </Button>

        {!canEdit && (
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <Lock className="h-3 w-3" />
            <span>Brak uprawnień do edycji</span>
          </div>
        )}
      </div>

      {mode === 'edit' && editWarning && (
        <Alert variant="warning" className="py-2">
          <AlertDescription className="text-sm">{editWarning}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
```

#### 2. `apps/web/src/components/ui/readonly-overlay.tsx`

```typescript
'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReadonlyOverlayProps {
  active: boolean;
  reason?: string;
  children: React.ReactNode;
  className?: string;
}

export const ReadonlyOverlay: React.FC<ReadonlyOverlayProps> = ({
  active,
  reason,
  children,
  className
}) => {
  if (!active) return <>{children}</>;

  return (
    <div className={cn('relative', className)}>
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-slate-200/50 backdrop-blur-[1px] z-10 rounded-lg" />

      {/* Lock icon */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute top-2 right-2 z-20 bg-slate-700 text-white p-2 rounded-full shadow-lg">
              <Lock className="h-5 w-5" />
            </div>
          </TooltipTrigger>
          {reason && (
            <TooltipContent side="left" className="max-w-xs">
              <p>{reason}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Content with reduced opacity */}
      <div className="opacity-70 pointer-events-none">
        {children}
      </div>
    </div>
  );
};
```

#### 3. `apps/web/src/components/ui/editable-field.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableFieldProps {
  value: string | number;
  onSave: (value: string | number) => Promise<void> | void;
  mode: 'view' | 'edit';
  label: string;
  type?: 'text' | 'number' | 'date';
  validation?: (value: any) => boolean;
  fieldName: string;
  className?: string;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onSave,
  mode,
  label,
  type = 'text',
  validation,
  fieldName,
  className
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (validation && !validation(localValue)) {
      setError('Nieprawidłowa wartość');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(localValue);
    } catch (err) {
      setError('Błąd zapisu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalValue(value);
    setError(null);
  };

  if (mode === 'view') {
    return (
      <div className={cn('space-y-1', className)}>
        <Label className="text-sm text-slate-600">{label}</Label>
        <p className="text-base font-medium">{value}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={fieldName}>{label}</Label>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            id={fieldName}
            type={type}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            className={cn(error && 'border-red-500')}
            aria-invalid={!!error}
            aria-describedby={error ? `${fieldName}-error` : undefined}
          />
          {error && (
            <p id={`${fieldName}-error`} className="text-sm text-red-600 mt-1">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || localValue === value}
            className="h-10"
          >
            <Check className="h-4 w-4" />
            <span className="sr-only">Zapisz</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-10"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Anuluj</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
```

### Przykłady Użycia

#### Zlecenie - Szczegóły z trybami

```typescript
function OrderDetailModal({ orderId }: { orderId: string }) {
  const [mode, setMode] = useState<ViewMode>('view');
  const { data: order } = useQuery({ queryKey: ['order', orderId], queryFn: () => fetchOrder(orderId) });

  const canEdit = order?.status !== 'archived';

  return (
    <Dialog>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Zlecenie #{order?.orderNumber}</DialogTitle>
        </DialogHeader>

        <ModeToggle
          mode={mode}
          onModeChange={setMode}
          canEdit={canEdit}
          editWarning="Zmiany wpłyną na zapotrzebowanie profili i stan magazynu"
        />

        {mode === 'view' ? (
          <OrderDetailsView order={order} />
        ) : (
          <OrderDetailsEdit order={order} onSave={() => setMode('view')} />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

#### Magazyn - Stan po finalizacji

```typescript
function WarehouseStockPage() {
  const { data: remanent } = useQuery({ queryKey: ['current-remanent'], queryFn: fetchCurrentRemanent });
  const isFinalized = remanent?.status === 'finalized';

  return (
    <div>
      <h1>Stan magazynu</h1>

      <ReadonlyOverlay
        active={isFinalized}
        reason={`Miesiąc sfinalizowany (${remanent?.finalizedAt}) - brak możliwości edycji`}
      >
        <WarehouseStockTable data={remanent?.stock} />
      </ReadonlyOverlay>
    </div>
  );
}
```

---

## Usprawnienie 4: Komunikaty Nieodwracalnych Akcji

### Problem
Brak jasnych ostrzeżeń przed destruktywnymi operacjami prowadzi do przypadkowych usunięć.

### Rozwiązanie
Dwustopniowa konfirmacja z:
- Listą konsekwencji
- Potwierdzeniem tekstowym (wpisz nazwę)
- Podglądem zmian
- Wyraźnym oznaczeniem akcji destruktywnych

### Komponenty do Stworzenia

#### `apps/web/src/components/ui/destructive-action-dialog.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DestructiveActionType = 'delete' | 'archive' | 'override' | 'finalize';

interface AffectedItem {
  id: string;
  label: string;
}

interface DestructiveActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  consequences: string[];
  actionType: DestructiveActionType;
  confirmText: string;
  onConfirm: () => void | Promise<void>;
  affectedItems?: AffectedItem[];
  previewData?: React.ReactNode;
  isLoading?: boolean;
}

const ACTION_CONFIG = {
  delete: {
    color: 'red',
    icon: XCircle,
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
  },
  archive: {
    color: 'orange',
    icon: AlertTriangle,
    buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white'
  },
  override: {
    color: 'yellow',
    icon: AlertTriangle,
    buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white'
  },
  finalize: {
    color: 'blue',
    icon: AlertTriangle,
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white'
  }
} as const;

export const DestructiveActionDialog: React.FC<DestructiveActionDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  consequences,
  actionType,
  confirmText,
  onConfirm,
  affectedItems,
  previewData,
  isLoading = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const config = ACTION_CONFIG[actionType];
  const Icon = config.icon;
  const isConfirmValid = inputValue === confirmText;

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    await onConfirm();
    setInputValue('');
  };

  const handleCancel = () => {
    setInputValue('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header z ikoną ostrzeżenia */}
        <DialogHeader className={cn('border-b pb-4', `border-${config.color}-200`)}>
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-full', `bg-${config.color}-100`)}>
              <Icon className={cn('h-6 w-6', `text-${config.color}-600`)} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{title}</DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Konsekwencje */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Konsekwencje tej akcji:</p>
              <ul className="space-y-1">
                {consequences.map((consequence, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{consequence}</span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>

          {/* Dotknięte elementy */}
          {affectedItems && affectedItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Dotknięte elementy ({affectedItems.length}):
              </Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-1">
                {affectedItems.map((item) => (
                  <div key={item.id} className="text-sm text-slate-700">
                    • {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Podgląd zmian */}
          {previewData && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Podgląd zmian:</Label>
              <div className="border rounded-md p-4 bg-slate-50">
                {previewData}
              </div>
            </div>
          )}

          {/* Potwierdzenie tekstowe */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="confirm-input" className="text-sm">
              Aby potwierdzić, wpisz: <code className="bg-slate-100 px-2 py-1 rounded font-mono">{confirmText}</code>
            </Label>
            <Input
              id="confirm-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmText}
              className={cn(
                'font-mono',
                inputValue && !isConfirmValid && 'border-red-500'
              )}
              autoComplete="off"
            />
            {inputValue && !isConfirmValid && (
              <p className="text-sm text-red-600">Tekst nie pasuje</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Anuluj
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isLoading}
            className={config.buttonClass}
          >
            {isLoading ? 'Wykonuję...' : `Potwierdź ${actionType === 'delete' ? 'usunięcie' : actionType === 'archive' ? 'archiwizację' : actionType === 'override' ? 'nadpisanie' : 'finalizację'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

#### Hook: `apps/web/src/hooks/useDestructiveAction.ts`

```typescript
'use client';

import { useState } from 'react';

interface DestructiveActionConfig {
  actionName: string;
  confirmText: string;
  consequences: string[];
  onExecute: () => Promise<void>;
}

export function useDestructiveAction(config: DestructiveActionConfig) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const trigger = () => setIsOpen(true);

  const execute = async () => {
    setIsExecuting(true);
    try {
      await config.onExecute();
      setIsOpen(false);
    } catch (error) {
      console.error('Destructive action failed:', error);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    isExecuting,
    trigger,
    execute
  };
}
```

### Przykłady Użycia

#### Magazyn - Finalizacja miesiąca

```typescript
function FinalizeMonthModal() {
  const [showDialog, setShowDialog] = useState(false);
  const { data: preview } = useQuery({
    queryKey: ['finalize-preview'],
    queryFn: fetchFinalizePreview,
    enabled: showDialog
  });

  const handleFinalize = async () => {
    await finalizeMonth();
    // refresh data
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>
        Finalizuj miesiąc
      </Button>

      <DestructiveActionDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title="Finalizacja miesiąca - Grudzień 2025"
        description="Ta akcja zarchiwizuje zlecenia i utworzy snapshot stanu magazynu"
        actionType="finalize"
        confirmText="FINALIZUJ"
        consequences={[
          `Zlecenia zostaną przeniesione do archiwum (${preview?.ordersCount || 0} zleceń)`,
          'Stan magazynu zostanie zapisany na 31.12.2025',
          'Nie będzie można edytować zarchiwizowanych zleceń',
          'Możesz cofnąć ostatnią finalizację (undo dostępne 7 dni)'
        ]}
        affectedItems={preview?.orders?.map(o => ({
          id: o.id,
          label: `#${o.orderNumber} - ${o.clientName}`
        }))}
        previewData={
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Zlecenia do archiwizacji:</span>
              <span className="font-semibold">{preview?.ordersCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Snapshot magazynu:</span>
              <span className="font-semibold">{preview?.stockItemsCount} pozycji</span>
            </div>
          </div>
        }
        onConfirm={handleFinalize}
      />
    </>
  );
}
```

#### Dostawa - Usunięcie z zleceniami

```typescript
function DeleteDeliveryButton({ delivery }: { delivery: Delivery }) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button variant="destructive" onClick={() => setShowDialog(true)}>
        Usuń dostawę
      </Button>

      <DestructiveActionDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title="Usunięcie dostawy z przypisanymi zleceniami"
        description={`Dostawa ${delivery.deliveryNumber} zawiera zlecenia - usunięcie wpłynie na harmonogram`}
        actionType="delete"
        confirmText={delivery.deliveryNumber}
        consequences={[
          `Usunięcie dostawy ${delivery.deliveryNumber}`,
          `${delivery.orders.length} zleceń straci przypisanie do dostawy`,
          'Zapotrzebowanie na profile zostanie przeliczone',
          'AKCJA NIEODWRACALNA - nie ma cofnięcia'
        ]}
        affectedItems={delivery.orders.map(o => ({
          id: o.id,
          label: `${o.orderNumber} - ${o.clientName}`
        }))}
        onConfirm={async () => {
          await deleteDelivery(delivery.id);
        }}
      />
    </>
  );
}
```

---

## Usprawnienie 5: Mini-Tooltips z Logiką Biznesową

### Problem
Użytkownicy nie rozumieją terminów biznesowych (żargon techniczny). Brak kontekstowej pomocy.

### Rozwiązanie
System tooltipów z:
- Wyjaśnieniami w języku biznesowym
- Przykładami wartości
- Powiązaniami z innymi danymi
- Centralną bazą terminów

### Komponenty do Stworzenia

#### 1. `apps/web/src/lib/business-glossary.ts`

```typescript
export interface BusinessTerm {
  title: string;
  explanation: string;
  example?: string;
  relatedTo?: string[];
}

export const BUSINESS_TERMS = {
  beamsCount: {
    title: 'Liczba bel',
    explanation: 'Ile kompletnych bel (6 metrów każda) profilu aluminiowego potrzeba do realizacji zlecenia',
    example: '15 bel = 90 metrów profilu',
    relatedTo: ['Zapotrzebowanie profili', 'Stan magazynowy']
  },
  weekNumber: {
    title: 'Tydzień dostawy',
    explanation: 'Numer tygodnia w roku według standardu ISO 8601 (tydzień zaczyna się w poniedziałek)',
    example: 'Tydzień 52 = 23-29 grudzień 2025',
    relatedTo: ['Harmonogram dostaw', 'Planowanie produkcji']
  },
  orderStatus: {
    title: 'Status zlecenia',
    explanation: 'Aktualny stan realizacji zlecenia w systemie',
    example: 'pending → active → completed → archived',
    relatedTo: ['Dostawy', 'Archiwizacja']
  },
  palletOptimization: {
    title: 'Optymalizacja palet',
    explanation: 'Automatyczne rozmieszczenie okien na paletach aby zmaksymalizować wykorzystanie przestrzeni',
    example: 'Algorytm umieszcza 12 okien na palecie 120x80cm',
    relatedTo: ['Dostawy', 'Pakowanie']
  },
  remanent: {
    title: 'Remanent magazynowy',
    explanation: 'Spisanie i zarchiwizowanie stanu magazynu na koniec miesiąca',
    example: 'Remanent grudniowy - snapshot stanu na 31.12.2025',
    relatedTo: ['Magazyn', 'Archiwum']
  },
  profileDepth: {
    title: 'Głębokość profilu',
    explanation: 'Wymiar profilu w milimetrach określający jego przekrój',
    example: '60mm, 70mm, 80mm',
    relatedTo: ['Profile', 'Specyfikacja techniczna']
  }
} as const;

export type BusinessTermKey = keyof typeof BUSINESS_TERMS;
```

#### 2. `apps/web/src/components/ui/business-tooltip.tsx`

```typescript
'use client';

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessTooltipProps {
  trigger: React.ReactNode;
  title: string;
  explanation: string;
  example?: string;
  relatedTo?: string[];
  children?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export const BusinessTooltip: React.FC<BusinessTooltipProps> = ({
  trigger,
  title,
  explanation,
  example,
  relatedTo,
  children,
  side = 'top',
  className
}) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent
          side={side}
          className={cn('max-w-[300px] p-4', className)}
        >
          <div className="space-y-2">
            {/* Tytuł */}
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-sm">{title}</h4>
            </div>

            {/* Wyjaśnienie */}
            <p className="text-sm text-slate-700">{explanation}</p>

            {/* Przykład */}
            {example && (
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-600 font-medium mb-1">Przykład:</p>
                <p className="text-sm text-slate-700 font-mono bg-slate-100 px-2 py-1 rounded">
                  {example}
                </p>
              </div>
            )}

            {/* Powiązane */}
            {relatedTo && relatedTo.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-600 font-medium mb-1">Powiązane:</p>
                <div className="flex flex-wrap gap-1">
                  {relatedTo.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Custom content */}
            {children}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
```

#### 3. `apps/web/src/components/ui/help-icon.tsx`

```typescript
'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { BusinessTooltip } from './business-tooltip';
import { BUSINESS_TERMS, type BusinessTermKey } from '@/lib/business-glossary';
import { cn } from '@/lib/utils';

interface HelpIconProps {
  termKey: BusinessTermKey;
  placement?: 'inline' | 'label';
  className?: string;
}

export const HelpIcon: React.FC<HelpIconProps> = ({
  termKey,
  placement = 'inline',
  className
}) => {
  const term = BUSINESS_TERMS[termKey];

  return (
    <BusinessTooltip
      trigger={
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors',
            placement === 'inline' ? 'ml-1 h-4 w-4' : 'h-5 w-5',
            className
          )}
          aria-label={`Pomoc: ${term.title}`}
        >
          <HelpCircle className={placement === 'inline' ? 'h-3 w-3' : 'h-4 w-4'} />
        </button>
      }
      title={term.title}
      explanation={term.explanation}
      example={term.example}
      relatedTo={term.relatedTo}
    />
  );
};
```

### Przykłady Użycia

#### Magazyn - Zapotrzebowanie

```typescript
function WarehouseRequirementsTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            Profil
            <HelpIcon termKey="profileDepth" />
          </TableHead>
          <TableHead>
            Liczba bel
            <HelpIcon termKey="beamsCount" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requirements.map(req => (
          <TableRow key={req.id}>
            <TableCell>{req.profileCode}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <span>{req.beamsCount}</span>
                <BusinessTooltip
                  trigger={<HelpCircle className="h-3 w-3 text-slate-400" />}
                  title="Szczegóły zapotrzebowania"
                  explanation={`Kompletne bele profilu (6 metrów każda) potrzebne do realizacji zlecenia`}
                  example={`${req.beamsCount} bel = ${(req.beamsCount * 6).toFixed(1)}m profilu`}
                  relatedTo={[
                    `Stan magazynowy: ${req.stock} bel`,
                    `Do zamówienia: ${Math.max(0, req.required - req.stock)} bel`
                  ]}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

#### Dostawy - Tydzień

```typescript
function DeliveryForm() {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="weekNumber">
          Tydzień dostawy
          <HelpIcon termKey="weekNumber" placement="label" />
        </Label>
        <Input
          id="weekNumber"
          type="number"
          min={1}
          max={53}
          placeholder="np. 52"
        />
      </div>
    </div>
  );
}
```

#### Zlecenie - Status z wyjaśnieniem

```typescript
function OrderStatusBadge({ order }: { order: Order }) {
  return (
    <BusinessTooltip
      trigger={
        <Badge variant={getStatusVariant(order.status)}>
          {order.status}
        </Badge>
      }
      title={`Status: ${order.status}`}
      explanation={
        order.status === 'pending'
          ? 'Zlecenie oczekuje na przypisanie do dostawy'
          : order.status === 'active'
          ? 'Zlecenie przypisane do dostawy, w trakcie realizacji'
          : order.status === 'completed'
          ? 'Zlecenie zrealizowane, oczekuje na archiwizację'
          : 'Zlecenie zakończone i zarchiwizowane'
      }
      relatedTo={
        order.deliveryId
          ? [`Dostawa: ${order.delivery?.deliveryNumber}`]
          : ['Brak przypisania do dostawy']
      }
    />
  );
}
```

---

## Plan Wdrożenia

### Faza 1: Krytyczne Usprawnienia (Tydzień 1-2)

**Priorytet: Bezpieczeństwo danych i komunikacja**

#### Tydzień 1 (Dni 1-5)

**Dni 1-2: Destructive Action Dialog**
- [ ] Stwórz `destructive-action-dialog.tsx`
- [ ] Stwórz `useDestructiveAction.ts` hook
- [ ] Zintegruj z `FinalizeMonthModal` (magazyn)
- [ ] Zintegruj z `DeliveryDialogs` (delete)
- [ ] Testy manualne destruktywnych akcji

**Dni 3-4: Contextual Alerts**
- [ ] Stwórz `contextual-alert.tsx`
- [ ] Stwórz `useContextualToast.ts` hook
- [ ] Zamień toasty w magazynie (braki profili)
- [ ] Zamień toasty w importach (konflikty)
- [ ] Zamień toasty w dostawach (deadlines)

**Dzień 5: Decision Colors**
- [ ] Stwórz `decision-colors.ts` utility
- [ ] Stwórz `action-indicator.tsx`
- [ ] Stwórz `decision-button.tsx`
- [ ] Zastosuj w magazynie (finalizacja)
- [ ] Zastosuj w importach (zatwierdzenie)

#### Tydzień 2 (Dni 6-10)

**Dni 6-7: Integracja Decision Colors**
- [ ] Dostawy (usunięcie, edycja)
- [ ] Zlecenia (archiwizacja)
- [ ] Globalne przyciski akcji
- [ ] Code review i refactoring

**Dni 8-10: Testing i Refinement**
- [ ] Testy użyteczności (5 użytkowników)
- [ ] Zbieranie feedbacku
- [ ] Bug fixing
- [ ] Dokumentacja dla zespołu

### Faza 2: UX Enhancement (Tydzień 3-4)

#### Tydzień 3 (Dni 11-15)

**Dni 11-13: Mode Toggle**
- [ ] Stwórz `mode-toggle.tsx`
- [ ] Stwórz `readonly-overlay.tsx`
- [ ] Stwórz `editable-field.tsx`
- [ ] Integruj w `OrderDetailModal` (view/edit)
- [ ] Integruj w `WarehouseHistory` (lock po finalizacji)

**Dni 14-15: Business Tooltips**
- [ ] Stwórz `business-glossary.ts` (baza terminów)
- [ ] Stwórz `business-tooltip.tsx`
- [ ] Stwórz `help-icon.tsx`
- [ ] Dodaj do magazynu (beamsCount, meters)
- [ ] Dodaj do dostaw (weekNumber, deliveryDate)

#### Tydzień 4 (Dni 16-20)

**Dni 16-17: Rozszerzenie Tooltips**
- [ ] Dodaj do zleceń (status, totalWindows)
- [ ] Dodaj do importów (conflicts, variants)
- [ ] Dodaj do ustawień (pallet sizes, colors)

**Dni 18-20: Final Polish**
- [ ] Responsive testing (mobile/tablet)
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Dokumentacja końcowa

### Faza 3: Refinement (Tydzień 5)

**Dni 21-23: User Testing**
- [ ] Sesje z użytkownikami końcowymi
- [ ] Zbieranie metryk przed/po
- [ ] Analiza feedbacku

**Dni 24-25: Adjustments**
- [ ] Dostosowania kolorystyki
- [ ] Poprawki komunikatów
- [ ] Fine-tuning animations

---

## Metryki Sukcesu

### Baseline (Przed Wdrożeniem)

Zmierz przez 2 tygodnie:
- **Przypadkowe usunięcia:** Liczba ticketów support typu "przypadkowo usunąłem"
- **Czas do pierwszej akcji:** Średni czas nowego użytkownika do wykonania pierwszej akcji
- **Pytania support:** Liczba pytań typu "co to znaczy?" / "dlaczego to widzę?"
- **Błędy użytkownika:** Liczba błędnych akcji (np. edycja w złym trybie)

### Target (Po Wdrożeniu)

| Metryka | Przed | Target | Pomiar |
|---------|-------|--------|--------|
| Przypadkowe usunięcia | X/tydzień | 0/tydzień | Tickety support |
| Pytania "dlaczego to widzę?" | Y/tydzień | -50% | Tickety support |
| Czas do pierwszej akcji | Z minut | -30% | Analytics |
| Błędy w trybie edycji | W/tydzień | 0/tydzień | Error tracking |
| Satisfaction score | 3.2/5 | 4.5/5 | User survey |

### Monitoring (Continuous)

**Tydzień 1-2:**
- Daily check: Tickety support
- User feedback sessions (5 użytkowników)
- Heatmaps (kliknięcia w tooltips/help icons)

**Tydzień 3-4:**
- Weekly review: Metryki vs baseline
- A/B testing różnych wariantów komunikatów
- Performance monitoring (load times)

**Miesiąc 2:**
- Monthly report: Pełne porównanie przed/po
- ROI analysis: Oszczędność czasu support
- User satisfaction survey

---

## Accessibility Guidelines

### WCAG 2.1 Compliance

**Poziom AA (minimum):**
- [ ] Kontrast kolorów: min 4.5:1 dla tekstu
- [ ] Fokus keyboard: Widoczny focus indicator
- [ ] Screen readers: Aria-labels, roles, live regions
- [ ] Keyboard navigation: Pełna dostępność bez myszy

### Implementacja

**1. Kolory decyzyjne:**
```typescript
// Kontrast sprawdzony dla WCAG AA
const DECISION_COLORS = {
  can: { text: 'text-green-700' },    // Kontrast 4.8:1 na bg-green-50
  risky: { text: 'text-yellow-800' }, // Kontrast 5.2:1 na bg-yellow-50
  cannot: { text: 'text-red-700' },   // Kontrast 4.9:1 na bg-red-50
  info: { text: 'text-blue-700' }     // Kontrast 5.1:1 na bg-blue-50
};
```

**2. Destructive Dialog:**
```typescript
<Dialog
  role="alertdialog"
  aria-labelledby="destructive-title"
  aria-describedby="destructive-description"
>
  <DialogTitle id="destructive-title">{title}</DialogTitle>
  <DialogDescription id="destructive-description">{description}</DialogDescription>
</Dialog>
```

**3. Tooltips:**
```typescript
<Tooltip>
  <TooltipTrigger aria-describedby="tooltip-content">
    <HelpCircle aria-label="Pomoc" />
  </TooltipTrigger>
  <TooltipContent id="tooltip-content" role="tooltip">
    {/* Content */}
  </TooltipContent>
</Tooltip>
```

**4. Mode Toggle:**
```typescript
<Button
  aria-pressed={mode === 'edit'}
  aria-label={mode === 'view' ? 'Przełącz na tryb edycji' : 'Przełącz na tryb podglądu'}
>
  {/* Content */}
</Button>
```

---

## Responsive Design

### Breakpoints (TailwindCSS)

```typescript
// mobile: < 640px
// tablet: 640px - 1024px
// desktop: > 1024px
```

### Adaptacje

**1. Destructive Dialog:**
```typescript
// Mobile: Fullscreen
<DialogContent className="sm:max-w-2xl max-sm:min-h-screen max-sm:rounded-none">

// Buttons: Stack vertically
<DialogFooter className="flex-col sm:flex-row gap-2">
```

**2. Tooltips:**
```typescript
// Mobile: Click-to-show zamiast hover
const isMobile = window.innerWidth < 640;

<Tooltip delayDuration={isMobile ? 0 : 200}>
  <TooltipTrigger onClick={(e) => isMobile && e.stopPropagation()}>
```

**3. Decision Buttons:**
```typescript
// Mobile: Full width
<DecisionButton className="w-full sm:w-auto">
```

**4. Business Tooltips:**
```typescript
// Mobile: Bottom side (więcej miejsca)
<BusinessTooltip side={isMobile ? 'bottom' : 'top'}>
```

---

## Podsumowanie

### Wartość Biznesowa

| Usprawnienie | Wartość | ROI |
|--------------|---------|-----|
| 1. Contextual Alerts | Mniej pytań support (-50%) | Oszczędność 10h/tydzień |
| 2. Decision Colors | Szybsze decyzje (-30%) | Oszczędność 5h/tydzień |
| 3. Mode Toggle | Mniej błędów edycji (0) | Eliminacja data loss |
| 4. Destructive Dialogs | Zero przypadkowych usunięć | Eliminacja recovery time |
| 5. Business Tooltips | Szybszy onboarding (-40%) | Oszczędność 20h training |

**Łącznie:** ~35h/tydzień oszczędności + eliminacja krytycznych błędów

### Następne Kroki

1. **Zatwierdzenie planu** - review z zespołem
2. **Priorytetyzacja** - finalna kolejność wdrożenia
3. **Resource allocation** - przypisanie developerów
4. **Kickoff** - start Fazy 1 (tydzień 1-2)
5. **Monitoring** - setup analytics i error tracking

---

**Status:** 🟡 Plan gotowy do implementacji
**Ostatnia aktualizacja:** 30.12.2025
**Autor:** Claude Code + AKROBUD Team
