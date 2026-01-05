# React Component Template - Prawidłowa Struktura

## Szablon komponentu z prawidłową kolejnością Hooks

```typescript
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

interface ComponentProps {
  id: number;
  onSuccess?: () => void;
}

export function MyComponent({ id, onSuccess }: ComponentProps) {
  // ═══════════════════════════════════════════════════════════
  // 1️⃣ STAGE: DATA FETCHING (Hooks na początku!)
  // ═══════════════════════════════════════════════════════════
  const { data, isLoading, error } = useQuery({
    queryKey: ['myData', id],
    queryFn: () => fetchData(id),
    enabled: !!id,  // ← Warunek tutaj, nie wokół Hook'a!
    staleTime: 5 * 60 * 1000,
  });

  // ═══════════════════════════════════════════════════════════
  // 2️⃣ STATE MANAGEMENT (useState zawsze)
  // ═══════════════════════════════════════════════════════════
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // ═══════════════════════════════════════════════════════════
  // 3️⃣ MEMOIZATION (useMemo dla expensive calculations)
  // ═══════════════════════════════════════════════════════════
  const processedData = useMemo(() => {
    // Wszystkie warunkowe logiki mogą być tutaj!
    if (!data) return null;
    return expensiveTransformation(data);
  }, [data]);

  // ═══════════════════════════════════════════════════════════
  // 4️⃣ CALLBACKS (useCallback dla handlers)
  // ═══════════════════════════════════════════════════════════
  const handleItemSelect = useCallback((item: Item) => {
    setSelectedItem(item);
    // Opcjonalne: logika tutaj
  }, []);

  const handleSave = useCallback(async () => {
    // Logika tutaj
  }, [data]);

  // ═══════════════════════════════════════════════════════════
  // 5️⃣ SIDE EFFECTS (useEffect zawsze na końcu)
  // ═══════════════════════════════════════════════════════════
  // Gdy component się zamontuje
  React.useEffect(() => {
    // inicjalizacja
  }, []);

  // Gdy data się zmieni
  React.useEffect(() => {
    if (data) {
      console.log('Data zmienił się');
    }
  }, [data]);

  // ═══════════════════════════════════════════════════════════
  // 6️⃣ EARLY RETURNS (TERAZ warunki!)
  // ═══════════════════════════════════════════════════════════
  if (isLoading) {
    return <div className="animate-spin">Ładowanie...</div>;
  }

  if (error) {
    return (
      <div className="text-red-600">
        Błąd: {error instanceof Error ? error.message : 'Nieznany błąd'}
      </div>
    );
  }

  if (!data) {
    return <div>Brak danych</div>;
  }

  // ═══════════════════════════════════════════════════════════
  // 7️⃣ RENDER (i eventualnie mutation)
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      <h2>{data.title}</h2>

      {/* Lista z WYMAGANYM key */}
      {data.items?.map((item) => (
        <React.Fragment key={item.id}>
          <div>{item.name}</div>
          <button onClick={() => handleItemSelect(item)}>
            Zaznacz
          </button>
        </React.Fragment>
      ))}

      {/* Optional chaining dla properties */}
      {processedData?.value && <p>{processedData.value}</p>}

      {/* Warunki renderowania */}
      {selectedItem && (
        <div>
          Zaznaczony: {selectedItem.name}
        </div>
      )}
    </div>
  );
}
```

---

## Wzory do zapamiętania

### ✅ Dobry Pattern: useQuery z enabled

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['data', id],
  queryFn: () => api.get(id),
  enabled: !!id,  // ← Warunek tutaj!
  staleTime: 5 * 60 * 1000,
});

if (isLoading) return <Loader />;  // ← Early return potem
if (!data) return <Empty />;
return <div>{data.value}</div>;
```

### ✅ Dobry Pattern: useMemo z warunkami

```typescript
const grouped = useMemo(() => {
  if (!data) return {};
  if (data.length === 0) return {};

  // Warunki WEWNĄTRZ useMemo, nie wokół niego!
  return data.reduce((acc, item) => {
    // ...
  }, {});
}, [data]);

// Teraz grouped jest bezpieczny
return <div>{Object.keys(grouped).map(...)}</div>;
```

### ✅ Dobry Pattern: React.Fragment z key

```typescript
{items.map((item) => (
  <React.Fragment key={item.id}>
    <div>{item.name}</div>
    <div>{item.value}</div>
  </React.Fragment>
))}
```

### ✅ Dobry Pattern: Optional chaining dla safety

```typescript
// Zamiast tego:
{preview ? (
  <div>{preview.import.metadata.orderNumber}</div>
)}

// Użyj tego:
{preview?.import?.metadata?.orderNumber}

// Lub z fallback:
{preview?.import?.metadata?.orderNumber || 'Brak danych'}
```

### ❌ Błędne Pattery - NIGDY nie rób tak!

```typescript
// ❌ NIGDY: Hook w warunku
if (shouldFetch) {
  const { data } = useQuery(...);  // ← BŁĄD!
}

// ❌ NIGDY: Hook po return
if (loading) return <Loader />;
const data = useMemo(...);  // ← BŁĄD!

// ❌ NIGDY: Hook w map
{items.map(item => {
  const { color } = useQuery(...);  // ← BŁĄD!
})}

// ❌ NIGDY: Fragment bez key w map
{items.map(item => (
  <>
    <div>{item.name}</div>
  </>  // ← Brak key!
))}

// ❌ NIGDY: Zakładanie struktur bez sprawdzenia
{data.nested.value}  // ← crash jeśli nested nie istnieje

// ❌ NIGDY: Nie sprawdzanie undefined przed dostępem
<div>{list.length}</div>  // ← crash jeśli list jest undefined
```

---

## Checklist przed commitem

- [ ] Wszystkie Hooks na POCZĄTKU funkcji?
- [ ] Żaden Hook nie jest w if/for/switch/map?
- [ ] Żaden Hook nie jest PO return?
- [ ] Early returns SĄ PO Hookach?
- [ ] Każdy element w .map() ma unikalne `key`?
- [ ] `<>` został zastąpiony `<React.Fragment key={id}>`?
- [ ] Sprawdzam czy properties istnieją (?.)?
- [ ] Sprawdzam czy arrays istnieją przed .length?
- [ ] Sprawdzam czy arrays istnieją przed .map()?
