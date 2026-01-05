# Panel Kierownika - Analiza Edge Cases

> **Cel dokumentu:** Identyfikacja potencjalnych błędów, przypadków brzegowych i luk w implementacji panelu kierownika

**Data analizy:** 2025-12-31
**Analizowane komponenty:**
- `/app/kierownik/page.tsx`
- `features/manager/components/AddToProductionTab.tsx`
- `features/manager/components/CompleteOrdersTab.tsx`
- `features/manager/components/OrderCheckbox.tsx`
- `features/manager/components/DeliveryCheckbox.tsx`

---

## 🔴 CRITICAL - Przypadki krytyczne

### 1. Race Conditions przy równoczesnych zmianach

**Problem:**
```typescript
// AddToProductionTab.tsx:92
const handleAddToProduction = () => {
  bulkUpdateMutation.mutate({
    orderIds: Array.from(selectedOrderIds),
    status: 'in_progress',
    productionDate: today,
  });
};
```

**Edge cases:**
- ❌ Użytkownik zaznacza zlecenia → inny użytkownik zmienia ich status → pierwszy klika "Dodaj do produkcji"
- ❌ Zlecenie jest już w produkcji/zakończone, ale wciąż widoczne w liście (cache nie odświeżony)
- ❌ Dostawa została usunięta, ale wciąż widoczna w cache

**Skutki:**
- Nadpisanie nowszych zmian
- Błędne statusy w bazie
- Konflikty przy równoczesnej pracy kilku kierowników

**Rekomendacja:**
```typescript
// Backend powinien sprawdzać current state przed update:
const bulkUpdateStatus = async (orderIds, newStatus, productionDate) => {
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, status: true, updatedAt: true }
  });

  // Walidacja: czy wszystkie zlecenia są w expected state?
  const invalidOrders = orders.filter(order =>
    order.status !== 'new' && newStatus === 'in_progress'
  );

  if (invalidOrders.length > 0) {
    throw new ConflictError(
      `Zlecenia ${invalidOrders.map(o => o.id).join(', ')} mają nieprawidłowy status`
    );
  }

  // Update z versioning (optimistic locking)
  return prisma.order.updateMany({
    where: {
      id: { in: orderIds },
      status: 'new' // Expected current state
    },
    data: { status: newStatus, productionDate }
  });
};
```

---

### 2. Duplikacja zleceń w różnych sekcjach

**Problem:**
```typescript
// AddToProductionTab.tsx - 4 sekcje:
// 1. upcomingDeliveries (dostawy z zleceniami)
// 2. overdueOrders (przeterminowane)
// 3. upcomingOrders (2 tygodnie)
// 4. privateOrders (bez dostawy)
```

**Edge cases:**
- ❌ Zlecenie jest w dostawie (sekcja 1) I jest przeterminowane (sekcja 2) - pojawi się 2x!
- ❌ Zlecenie jest w dostawie (sekcja 1) I ma deadline w 2 tygodnie (sekcja 3) - pojawi się 2x!
- ❌ Użytkownik może zaznaczyć to samo zlecenie wielokrotnie

**Skutki:**
- Wielokrotne dodanie do produkcji tego samego zlecenia
- Zaznaczenie checkbox w jednej sekcji nie zaznacza w drugiej
- Licznik pokazuje 2 zaznaczenia dla 1 zlecenia

**Rekomendacja:**
```typescript
// Frontend: deduplikacja przy renderowaniu
const allOrderIds = new Set<number>();

// Sekcja 1: Dostawy
const deliveryOrderIds = new Set<number>();
data.upcomingDeliveries.forEach(delivery => {
  delivery.deliveryOrders?.forEach(dOrder => {
    deliveryOrderIds.add(dOrder.order.id);
    allOrderIds.add(dOrder.order.id);
  });
});

// Sekcja 2: Przeterminowane (exclude jeśli już w dostawie)
const overdueOrders = data.overdueOrders.filter(
  order => !allOrderIds.has(order.id)
);

// Sekcja 3: Najbliższe 2 tygodnie (exclude jeśli już w dostawie lub przeterminowane)
const upcomingOrders = data.upcomingOrders.filter(
  order => !allOrderIds.has(order.id)
);

// Sekcja 4: Prywatne (exclude jeśli już wyświetlone)
const privateOrders = data.privateOrders.filter(
  order => !allOrderIds.has(order.id)
);
```

**Backend fix:**
```typescript
// OrderRepository - dodaj DISTINCT i excludes
async getForProduction() {
  const deliveries = await this.getUpcomingDeliveries();
  const deliveryOrderIds = deliveries.flatMap(d =>
    d.deliveryOrders.map(dOrder => dOrder.orderId)
  );

  const overdueOrders = await prisma.order.findMany({
    where: {
      status: 'new',
      deadline: { lt: new Date() },
      id: { notIn: deliveryOrderIds } // EXCLUDE z dostaw
    }
  });

  const upcomingOrders = await prisma.order.findMany({
    where: {
      status: 'new',
      deadline: { gte: new Date(), lte: addDays(new Date(), 14) },
      id: { notIn: [...deliveryOrderIds, ...overdueOrders.map(o => o.id)] }
    }
  });

  // itd...
}
```

---

### 3. Brak walidacji daty produkcji

**Problem:**
```typescript
// CompleteOrdersTab.tsx:38
const [productionDate, setProductionDate] = useState<string>(
  new Date().toISOString().split('T')[0]
);

// handleCompleteOrders:103 - brak walidacji
bulkUpdateMutation.mutateAsync({
  orderIds: Array.from(selectedOrderIds),
  status: 'completed',
  productionDate, // ❌ Może być dowolna data!
});
```

**Edge cases:**
- ❌ Data produkcji w przyszłości (np. 2026-01-01)
- ❌ Data produkcji z przeszłości (np. 1970-01-01)
- ❌ Data produkcji przed datą rozpoczęcia produkcji
- ❌ Puste pole daty (null/undefined)
- ❌ Nieprawidłowy format daty

**Skutki:**
- Nieprawidłowe dane w raportach
- Błędne obliczenia czasu produkcji
- Niemożność późniejszej korekty

**Rekomendacja:**
```typescript
// Frontend validation
const handleCompleteOrders = async () => {
  // Walidacja daty
  const today = new Date().toISOString().split('T')[0];
  const productionDateObj = new Date(productionDate);
  const todayObj = new Date(today);

  if (productionDateObj > todayObj) {
    toast({
      title: 'Błąd',
      description: 'Data produkcji nie może być w przyszłości',
      variant: 'destructive'
    });
    return;
  }

  // Opcjonalnie: sprawdź czy nie za dawno (np. max 30 dni wstecz)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  if (productionDateObj < thirtyDaysAgo) {
    const confirmed = await confirm(
      'Data produkcji jest sprzed ponad 30 dni. Czy na pewno chcesz kontynuować?'
    );
    if (!confirmed) return;
  }

  // Proceed...
};
```

**Backend validation:**
```typescript
// validators/order.ts
export const bulkUpdateStatusSchema = z.object({
  orderIds: z.array(z.number().int().positive()).min(1),
  status: z.enum(['new', 'in_progress', 'completed', 'archived']),
  productionDate: z.string().datetime().optional().refine(
    (date) => {
      if (!date) return true;
      const dateObj = new Date(date);
      const today = new Date();
      return dateObj <= today; // Nie może być w przyszłości
    },
    { message: 'Data produkcji nie może być w przyszłości' }
  )
});
```

---

### 4. Brak obsługi błędów częściowych (partial failures)

**Problem:**
```typescript
// CompleteOrdersTab.tsx:103
const handleCompleteOrders = async () => {
  // Zakończ pojedyncze zlecenia
  if (selectedOrderIds.size > 0) {
    await bulkUpdateMutation.mutateAsync({...}); // ❌ Co jeśli tylko CZĘŚĆ się uda?
  }

  // Zakończ dostawy
  if (selectedDeliveryIds.size > 0) {
    await Promise.all(
      Array.from(selectedDeliveryIds).map((deliveryId) =>
        completeDeliveryMutation.mutateAsync({...}) // ❌ Co jeśli 2/5 dostaw failuje?
      )
    );
  }
};
```

**Edge cases:**
- ❌ 10 zleceń zaznaczonych → 7 się udało, 3 failują → użytkownik nie wie które
- ❌ 5 dostaw zaznaczonych → 2 się udały, 3 failują → partial state
- ❌ Błąd bazy danych w trakcie transakcji
- ❌ Network timeout po 50% operacji

**Skutki:**
- Część zleceń zmieniona, część nie
- Brak informacji dla użytkownika
- Konieczność ręcznego sprawdzania
- Trudność w powtórzeniu operacji

**Rekomendacja:**
```typescript
const handleCompleteOrders = async () => {
  const results = {
    succeeded: [] as number[],
    failed: [] as { id: number; error: string }[]
  };

  // Process orders one by one z error handling
  for (const orderId of selectedOrderIds) {
    try {
      await ordersApi.updateStatus(orderId, {
        status: 'completed',
        productionDate
      });
      results.succeeded.push(orderId);
    } catch (error) {
      results.failed.push({
        id: orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Process deliveries one by one
  for (const deliveryId of selectedDeliveryIds) {
    try {
      await deliveriesApi.completeAllOrders(deliveryId, { productionDate });
      results.succeeded.push(deliveryId);
    } catch (error) {
      results.failed.push({
        id: deliveryId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Show detailed results
  if (results.failed.length > 0) {
    toast({
      title: 'Częściowy błąd',
      description: `Zakończono: ${results.succeeded.length}, Błędy: ${results.failed.length}`,
      variant: 'warning'
    });

    // Show detailed error list
    setErrorDetails(results.failed);
  } else {
    toast({
      title: 'Sukces',
      description: `Zakończono ${results.succeeded.length} pozycji`,
      variant: 'success'
    });
  }

  // Odznacz tylko te które się udały
  setSelectedOrderIds(prev => {
    const newSet = new Set(prev);
    results.succeeded.forEach(id => newSet.delete(id));
    return newSet;
  });
};
```

---

## 🟠 HIGH - Przypadki wysokiego ryzyka

### 5. Nieaktualne dane cache po operacji

**Problem:**
```typescript
// AddToProductionTab.tsx:42
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['orders'] });
  queryClient.invalidateQueries({ queryKey: ['deliveries'] });
  setSelectedOrderIds(new Set());
  setSelectedDeliveryIds(new Set());
},
```

**Edge cases:**
- ❌ Invalidacja jest async → UI pokazuje stare dane przez chwilę
- ❌ Inne taby mają cached dane → nieaktualne po przełączeniu
- ❌ MonthlyReport (tab 3) ma własny cache → nie odświeża się
- ❌ CompleteOrdersTab może pokazywać już zakończone zlecenia

**Skutki:**
- User widzi zlecenie jako "new" mimo że jest "in_progress"
- Możliwość ponownego zaznaczenia i dodania do produkcji
- Mylące dane w raportach

**Rekomendacja:**
```typescript
// Strict invalidation z await
const bulkUpdateMutation = useMutation({
  mutationFn: (data: BulkUpdateStatusData) => ordersApi.bulkUpdateStatus(data),
  onSuccess: async () => {
    // Await invalidation przed reset
    await queryClient.invalidateQueries({
      queryKey: ['orders'],
      refetchType: 'active' // Force refetch active queries
    });
    await queryClient.invalidateQueries({
      queryKey: ['deliveries'],
      refetchType: 'active'
    });

    // Reset selection tylko po refetch
    setSelectedOrderIds(new Set());
    setSelectedDeliveryIds(new Set());

    toast({
      title: 'Sukces',
      description: 'Dodano do produkcji'
    });
  }
});

// Opcjonalnie: optimistic update
const bulkUpdateMutation = useMutation({
  mutationFn: ordersApi.bulkUpdateStatus,
  onMutate: async (variables) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['orders'] });

    // Snapshot previous value
    const previousOrders = queryClient.getQueryData(['orders', 'for-production']);

    // Optimistically update
    queryClient.setQueryData(['orders', 'for-production'], (old: any) => {
      return {
        ...old,
        overdueOrders: old.overdueOrders.filter(o => !variables.orderIds.includes(o.id)),
        upcomingOrders: old.upcomingOrders.filter(o => !variables.orderIds.includes(o.id)),
        privateOrders: old.privateOrders.filter(o => !variables.orderIds.includes(o.id))
      };
    });

    return { previousOrders };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['orders', 'for-production'], context?.previousOrders);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }
});
```

---

### 6. Checkbox state synchronizacja

**Problem:**
```typescript
// AddToProductionTab.tsx:64
const handleDeliveryToggle = (deliveryId: number, checked: boolean) => {
  setSelectedDeliveryIds(/* ... */);

  // Zaznacz/odznacz wszystkie zlecenia w dostawie
  const delivery = data?.upcomingDeliveries.find(d => d.id === deliveryId);
  if (delivery?.deliveryOrders) {
    const orderIds = delivery.deliveryOrders.map(dOrder => dOrder.order.id);
    setSelectedOrderIds(/* ... */);
  }
};
```

**Edge cases:**
- ❌ User zaznacza dostawę → auto-zaznaczają się zlecenia → user ręcznie odznacza 1 zlecenie → checkbox dostawy wciąż zaznaczony (inconsistent state)
- ❌ User zaznacza wszystkie zlecenia w dostawie ręcznie → checkbox dostawy NIE zaznacza się automatycznie
- ❌ Dostawa ma 10 zleceń → user zaznacza 9 → checkbox dostawy zaznaczony czy nie?

**Skutki:**
- Mylący UI
- Użytkownik nie wie co jest zaznaczone
- Możliwość pominięcia zleceń

**Rekomendacja:**
```typescript
// Derived state dla delivery checkbox (indeterminate + auto-sync)
const isDeliveryChecked = (deliveryId: number): boolean | 'indeterminate' => {
  const delivery = data?.upcomingDeliveries.find(d => d.id === deliveryId);
  if (!delivery?.deliveryOrders) return false;

  const orderIds = delivery.deliveryOrders.map(dOrder => dOrder.order.id);
  const checkedCount = orderIds.filter(id => selectedOrderIds.has(id)).length;

  if (checkedCount === 0) return false;
  if (checkedCount === orderIds.length) return true;
  return 'indeterminate'; // Częściowo zaznaczone
};

// DeliveryCheckbox z indeterminate state
<input
  type="checkbox"
  checked={checked === true}
  ref={(el) => {
    if (el) el.indeterminate = checked === 'indeterminate';
  }}
  onChange={(e) => onChange(delivery.id, e.target.checked)}
/>
```

---

### 7. Brak debounce przy szybkim klikaniu

**Problem:**
```typescript
// Użytkownik może kliknąć "Dodaj do produkcji" wielokrotnie szybko
<Button
  onClick={handleAddToProduction}
  disabled={!hasSelection || bulkUpdateMutation.isPending}
>
```

**Edge cases:**
- ❌ User klika 3x szybko → 3 requesty do API
- ❌ Pierwszy request jeszcze pending → disabled=true → ale 2 requesty już poszły
- ❌ Network lag → user myśli że nie zadziałało → klika ponownie

**Skutki:**
- Duplicate requests
- Niepotrzebne obciążenie serwera
- Możliwe błędy z uniqueness constraints

**Rekomendacja:**
```typescript
// Debounced action
import { useCallback } from 'react';
import debounce from 'lodash/debounce';

const debouncedAddToProduction = useCallback(
  debounce(() => {
    const today = new Date().toISOString().split('T')[0];
    bulkUpdateMutation.mutate({
      orderIds: Array.from(selectedOrderIds),
      status: 'in_progress',
      productionDate: today,
    });
  }, 300, { leading: true, trailing: false }), // First click immediately, ignore subsequent
  [selectedOrderIds, bulkUpdateMutation]
);

<Button
  onClick={debouncedAddToProduction}
  disabled={!hasSelection || bulkUpdateMutation.isPending}
>
```

---

## 🟡 MEDIUM - Przypadki średniego ryzyka

### 8. Memory leaks przy unmount podczas pending mutation

**Problem:**
```typescript
// CompleteOrdersTab unmounts gdy user przełącza tab → mutation wciąż pending
const bulkUpdateMutation = useMutation({
  mutationFn: ordersApi.bulkUpdateStatus,
  onSuccess: () => {
    queryClient.invalidateQueries({...}); // ❌ Component already unmounted
    setSelectedOrderIds(new Set()); // ❌ setState on unmounted component
  }
});
```

**Edge cases:**
- ❌ User klika "Dodaj do produkcji" → przełącza tab → mutation kończy → setState warning
- ❌ Długi request (5s) → user zamyka modal/tab
- ❌ Network timeout → retry po unmount

**Skutki:**
- React warnings w console
- Potencjalne memory leaks
- Nieprzewidywalne zachowanie

**Rekomendacja:**
```typescript
// Cleanup on unmount
import { useRef, useEffect } from 'react';

export const AddToProductionTab: React.FC = () => {
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const bulkUpdateMutation = useMutation({
    mutationFn: ordersApi.bulkUpdateStatus,
    onSuccess: () => {
      if (!isMounted.current) return; // Guard

      queryClient.invalidateQueries({...});
      setSelectedOrderIds(new Set());
    }
  });

  // Lub użyj React Query persist options
  const bulkUpdateMutation = useMutation({
    mutationFn: ordersApi.bulkUpdateStatus,
    gcTime: 0, // Don't cache result
    retry: false, // Don't retry on unmount
  });
};
```

---

### 9. Brak validacji orderIds przed wysłaniem

**Problem:**
```typescript
// AddToProductionTab.tsx:92
bulkUpdateMutation.mutate({
  orderIds: Array.from(selectedOrderIds), // ❌ Może być pusta tablica
  status: 'in_progress',
  productionDate: today,
});
```

**Edge cases:**
- ❌ `selectedOrderIds` jest puste (user odznaczył wszystko przed kliknięciem)
- ❌ `selectedOrderIds` zawiera nieistniejące IDs (stale data)
- ❌ `selectedOrderIds` zawiera duplicates (teoretycznie niemożliwe z Set, ale...)

**Skutki:**
- Niepotrzebny request do API
- 400 Bad Request
- Mylący error message

**Rekomendacja:**
```typescript
const handleAddToProduction = () => {
  const orderIds = Array.from(selectedOrderIds);

  // Validation
  if (orderIds.length === 0) {
    toast({
      title: 'Błąd',
      description: 'Nie zaznaczono żadnych zleceń',
      variant: 'destructive'
    });
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  bulkUpdateMutation.mutate({
    orderIds,
    status: 'in_progress',
    productionDate: today,
  });
};
```

---

### 10. Timeout przy dużej liczbie zleceń

**Problem:**
```typescript
// User zaznacza 100 zleceń → bulk update → długi request
await bulkUpdateMutation.mutateAsync({
  orderIds: Array.from(selectedOrderIds), // 100 IDs
  status: 'completed',
  productionDate
});
```

**Edge cases:**
- ❌ Request timeout (default 30s)
- ❌ Database lock timeout
- ❌ Backend przekracza memory limit
- ❌ Frontend freeze podczas operacji

**Skutki:**
- Timeout error
- Partial update (część się udała)
- User frustration

**Rekomendacja:**
```typescript
// Chunking dla dużych batch operations
const CHUNK_SIZE = 20;

const handleAddToProduction = async () => {
  const orderIds = Array.from(selectedOrderIds);
  const chunks = [];

  for (let i = 0; i < orderIds.length; i += CHUNK_SIZE) {
    chunks.push(orderIds.slice(i, i + CHUNK_SIZE));
  }

  // Process chunks sequentially z progress
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    toast({
      title: 'Przetwarzanie...',
      description: `${i * CHUNK_SIZE + chunk.length} / ${orderIds.length} zleceń`,
    });

    await bulkUpdateMutation.mutateAsync({
      orderIds: chunk,
      status: 'in_progress',
      productionDate: today,
    });
  }

  toast({
    title: 'Zakończono',
    description: `Dodano ${orderIds.length} zleceń do produkcji`,
  });
};

// Backend pagination limit
if (orderIds.length > 100) {
  throw new BadRequestError('Maksymalnie 100 zleceń na raz');
}
```

---

### 11. Nieprawidłowe sortowanie w sekcjach

**Problem:**
```typescript
// Backend zwraca dane bez określonego sortowania
export interface ForProductionData {
  overdueOrders: Order[];      // ❌ Sortowanie?
  upcomingOrders: Order[];     // ❌ Sortowanie?
  privateOrders: Order[];      // ❌ Sortowanie?
  upcomingDeliveries: Delivery[]; // ❌ Sortowanie?
}
```

**Edge cases:**
- ❌ Zlecenia przeterminowane NIE są posortowane po deadline → user nie widzi najbardziej pilnych
- ❌ Dostawy NIE są posortowane po dacie → mylące
- ❌ Kolejność zmienia się przy refresh → inconsistent UX

**Skutki:**
- Trudność w znalezieniu pilnych zleceń
- Mylący UI
- Nieefektywna praca

**Rekomendacja:**
```typescript
// Backend - explicit sorting
async getForProduction() {
  const overdueOrders = await prisma.order.findMany({
    where: { status: 'new', deadline: { lt: new Date() } },
    orderBy: { deadline: 'asc' } // Najstarsze najpierw (najbardziej pilne)
  });

  const upcomingOrders = await prisma.order.findMany({
    where: {
      status: 'new',
      deadline: { gte: new Date(), lte: addDays(new Date(), 14) }
    },
    orderBy: { deadline: 'asc' } // Najbliższe najpierw
  });

  const upcomingDeliveries = await prisma.delivery.findMany({
    where: { status: 'planned', deliveryDate: { gte: new Date() } },
    orderBy: { deliveryDate: 'asc' } // Najbliższe najpierw
  });

  const privateOrders = await prisma.order.findMany({
    where: { status: 'new', deliveryOrders: { none: {} } },
    orderBy: [
      { deadline: 'asc' }, // Z deadline najpierw
      { createdAt: 'desc' } // Potem najnowsze
    ]
  });
}
```

---

### 12. Brak informacji o zależnościach między zleceniami

**Problem:**
```typescript
// User może zakończyć zlecenie, które jest dependency dla innego
// Przykład: Zlecenie A musi być przed B (ten sam klient, seria)
```

**Edge cases:**
- ❌ Zlecenie 53330-a jest wariantem 53330 → user kończy 53330-a ale nie 53330
- ❌ 2 zlecenia dla tego samego klienta → jedno zakończone, drugie nie → partial delivery
- ❌ Zlecenie wymaga custom profili z innego zlecenia

**Skutki:**
- Niekompletne dostawy
- Reklamacje klientów
- Chaos w produkcji

**Rekomendacja:**
```typescript
// Backend - add dependency check
interface OrderDependency {
  orderId: number;
  dependsOn: number[];
  requiredBefore: number[];
}

const bulkUpdateStatus = async (orderIds: number[], status: string) => {
  if (status === 'completed') {
    // Check dependencies
    const dependencies = await prisma.orderDependency.findMany({
      where: {
        OR: [
          { orderId: { in: orderIds } },
          { dependsOn: { hasSome: orderIds } }
        ]
      }
    });

    const warnings = [];
    for (const dep of dependencies) {
      // Check if dependencies are met
      if (orderIds.includes(dep.orderId)) {
        const missingDeps = dep.dependsOn.filter(id => {
          // Check if dependency is completed
          const depOrder = await prisma.order.findUnique({
            where: { id },
            select: { status: true }
          });
          return depOrder?.status !== 'completed';
        });

        if (missingDeps.length > 0) {
          warnings.push({
            orderId: dep.orderId,
            message: `Zlecenie wymaga ukończenia: ${missingDeps.join(', ')}`
          });
        }
      }
    }

    if (warnings.length > 0) {
      throw new ValidationError('Niezakończone zależności', warnings);
    }
  }
};

// Frontend - show warnings
{dependencyWarnings.length > 0 && (
  <Alert variant="warning">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      Niektóre zlecenia mają niezakończone zależności:
      <ul className="list-disc pl-5 mt-2">
        {dependencyWarnings.map(w => (
          <li key={w.orderId}>{w.message}</li>
        ))}
      </ul>
    </AlertDescription>
  </Alert>
)}
```

---

## 🔵 LOW - Przypadki niskiego ryzyka (UX)

### 13. Brak informacji o liczbie okien w dostawie przy zaznaczeniu

**Problem:**
```typescript
// User zaznacza dostawę → nie widzi ile okien zaznaczył
<Badge variant="secondary">
  Zaznaczono: {totalSelected} {totalSelected === 1 ? 'zlecenie' : 'zleceń'}
</Badge>
```

**Edge case:**
- User chce dodać do produkcji max 50 okien dziennie
- Nie wie ile okien ma w zaznaczonych zleceniach
- Musi liczyć ręcznie

**Rekomendacja:**
```typescript
const totalWindows = useMemo(() => {
  let count = 0;

  // Count from selected orders
  selectedOrderIds.forEach(orderId => {
    const order = [...data.overdueOrders, ...data.upcomingOrders, ...data.privateOrders]
      .find(o => o.id === orderId);
    if (order) count += order.totalWindows || 0;
  });

  // Count from selected deliveries
  selectedDeliveryIds.forEach(deliveryId => {
    const delivery = data.upcomingDeliveries.find(d => d.id === deliveryId);
    delivery?.deliveryOrders?.forEach(dOrder => {
      count += dOrder.order.totalWindows || 0;
    });
  });

  return count;
}, [selectedOrderIds, selectedDeliveryIds, data]);

<Badge variant="secondary" className="text-base px-4 py-2">
  Zaznaczono: {totalSelected} {totalSelected === 1 ? 'pozycja' : 'pozycji'}
  • {totalWindows} okien
</Badge>
```

---

### 14. Brak informacji o statusie Schuco

**Problem:**
```typescript
// Zlecenie może mieć status Schuco (delivered, ordered, etc.)
// User nie widzi tego w panelu kierownika
```

**Edge case:**
- Zlecenie w produkcji ale profile jeszcze nie dotarły
- User oznacza jako wyprodukowane → brak profili w magazynie
- Produkcja staje bo nie ma materiału

**Rekomendacja:**
```typescript
// OrderCheckbox - add Schuco status badge
<div className="flex items-center gap-2">
  <span className="font-medium">{order.orderNumber}</span>
  {order.schucoStatus && (
    <Badge
      variant={order.schucoStatus === 'delivered' ? 'success' : 'warning'}
      className="text-xs"
    >
      Schuco: {order.schucoStatus}
    </Badge>
  )}
  {order.glassStatus && (
    <Badge
      variant={order.glassStatus === 'delivered' ? 'success' : 'warning'}
      className="text-xs"
    >
      Szyby: {order.glassStatus}
    </Badge>
  )}
</div>
```

---

### 15. Brak możliwości sortowania/filtrowania

**Problem:**
```typescript
// 50 zleceń przeterminowanych → brak możliwości sortowania
// User chce znaleźć zlecenie konkretnego klienta → musi scrollować
```

**Rekomendacja:**
```typescript
// Add search/filter bar
const [searchTerm, setSearchTerm] = useState('');
const [sortBy, setSortBy] = useState<'deadline' | 'client' | 'windows'>('deadline');

const filteredOrders = useMemo(() => {
  return data.overdueOrders
    .filter(order =>
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'client':
          return (a.client || '').localeCompare(b.client || '');
        case 'windows':
          return (b.totalWindows || 0) - (a.totalWindows || 0);
        default:
          return 0;
      }
    });
}, [data.overdueOrders, searchTerm, sortBy]);
```

---

## 📋 Podsumowanie - Priority Matrix

| Priorytet | Edge Case | Severity | Impact | Effort |
|-----------|-----------|----------|--------|--------|
| 🔴 P0 | Race conditions | Critical | High | Medium |
| 🔴 P0 | Duplikacja zleceń w sekcjach | Critical | High | Medium |
| 🔴 P0 | Brak walidacji daty produkcji | Critical | Medium | Low |
| 🔴 P0 | Partial failures handling | Critical | High | High |
| 🟠 P1 | Cache invalidation | High | High | Medium |
| 🟠 P1 | Checkbox state sync | High | Medium | Medium |
| 🟠 P1 | Debounce missing | High | Low | Low |
| 🟡 P2 | Memory leaks | Medium | Low | Low |
| 🟡 P2 | Validation orderIds | Medium | Low | Low |
| 🟡 P2 | Timeout dla bulk | Medium | Medium | Medium |
| 🟡 P2 | Sortowanie | Medium | Medium | Low |
| 🟡 P2 | Dependencies check | Medium | High | High |
| 🔵 P3 | Liczba okien info | Low | Low | Low |
| 🔵 P3 | Schuco status | Low | Medium | Low |
| 🔵 P3 | Filtering | Low | Low | Medium |

---

## 🛠️ Zalecenia implementacyjne

### Quick Wins (zrób najpierw):
1. ✅ Walidacja daty produkcji (frontend + backend)
2. ✅ Debounce na przyciskach akcji
3. ✅ Walidacja orderIds przed wysłaniem
4. ✅ Explicit sorting w backend queries
5. ✅ Memory leak guards (isMounted pattern)

### Must Have (przed production):
1. ⚠️ Deduplikacja zleceń między sekcjami
2. ⚠️ Optimistic locking / versioning
3. ⚠️ Partial failure handling z detailed errors
4. ⚠️ Strict cache invalidation z refetch
5. ⚠️ Checkbox indeterminate state

### Nice to Have (future iterations):
1. 💡 Order dependencies checking
2. 💡 Chunking dla bulk operations
3. 💡 Search/filter/sort UI
4. 💡 Schuco/Glass status badges
5. 💡 Windows count in selection badge

---

**Autor:** Claude Sonnet 4.5
**Data:** 2025-12-31
**Status:** Draft for review
