# Nowy Komponent

Kreator komponentu React zgodnie ze standardami projektu.

## Jak używać

Podaj:
1. **Nazwa komponentu** (PascalCase, np. "OrderCard", "DeliveryList")
2. **Typ**: ui | feature | layout | form
3. **Lokalizacja** (opcjonalne - domyślnie zgaduję z kontekstu)

## Przykłady

```
/new-component OrderStatusBadge ui - badge statusu zlecenia
/new-component DeliveryForm form - formularz dostawy
/new-component PalletCard feature - karta palety w liście
```

## Co wygeneruję

### Dla typu `ui` (components/ui/)
```typescript
// components/ui/order-status-badge.tsx
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const orderStatusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        pending: 'bg-yellow-100 text-yellow-800',
        inProgress: 'bg-blue-100 text-blue-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
      },
    },
    defaultVariants: {
      status: 'pending',
    },
  }
);

interface OrderStatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof orderStatusBadgeVariants> {
  children: React.ReactNode;
}

export function OrderStatusBadge({
  className,
  status,
  children,
  ...props
}: OrderStatusBadgeProps) {
  return (
    <span
      className={cn(orderStatusBadgeVariants({ status }), className)}
      {...props}
    >
      {children}
    </span>
  );
}
```

### Dla typu `feature` (features/{feature}/components/)
```typescript
// features/orders/components/OrderCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Order } from '../types';
import { formatDate } from '@/lib/utils';
import { groszeToPln } from '@/lib/money';

interface OrderCardProps {
  order: Order;
  onSelect?: (order: Order) => void;
}

export function OrderCard({ order, onSelect }: OrderCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wartość:</span>
            <span className="font-medium">
              {groszeToPln(order.valuePln)} PLN
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data:</span>
            <span>{formatDate(order.createdAt)}</span>
          </div>
        </div>
        {onSelect && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={() => onSelect(order)}
          >
            Wybierz
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

### Dla typu `form` (z react-hook-form + Zod)
```typescript
// features/deliveries/components/DeliveryForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCreateDelivery } from '../api/mutations';

const deliveryFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana'),
  date: z.string().min(1, 'Data jest wymagana'),
  // ... inne pola
});

type DeliveryFormValues = z.infer<typeof deliveryFormSchema>;

interface DeliveryFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<DeliveryFormValues>;
}

export function DeliveryForm({ onSuccess, defaultValues }: DeliveryFormProps) {
  const { mutate: createDelivery, isPending } = useCreateDelivery();

  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      name: '',
      date: '',
      ...defaultValues,
    },
  });

  function onSubmit(data: DeliveryFormValues) {
    createDelivery(data, {
      onSuccess: () => {
        form.reset();
        onSuccess?.();
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa</FormLabel>
              <FormControl>
                <Input placeholder="Nazwa dostawy" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Więcej pól... */}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Zapisywanie...' : 'Zapisz'}
        </Button>
      </form>
    </Form>
  );
}
```

### Dla typu `layout`
```typescript
// components/layout/PageContainer.tsx
interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageContainer({
  children,
  title,
  description,
  actions,
}: PageContainerProps) {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {(title || actions) && (
        <div className="flex items-center justify-between">
          <div>
            {title && <h1 className="text-2xl font-bold">{title}</h1>}
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
```

## Checklist

- [ ] Używam istniejących komponentów Shadcn/ui
- [ ] TypeScript strict - brak `any`
- [ ] Props interface zdefiniowany
- [ ] Tailwind dla stylów (nie inline styles)
- [ ] money.ts dla kwot
- [ ] disabled={isPending} na buttonach
- [ ] Komponent jest eksportowany w index.ts

## Teraz

Podaj nazwę i typ komponentu:

```
Przykład: "OrderStatusBadge ui - badge pokazujący status zlecenia"
```
