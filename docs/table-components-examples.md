# Szablony Tabel - Przykłady Użycia

## 1. SimpleTable - Dla małych tabel i modali

**Kiedy używać:** Modały, małe zestawienia, listy do 50 elementów

**Cechy:**
- Sticky header
- Zebra stripes
- Hover effect
- Max height: 400px (domyślnie)

### Przykład:

```tsx
import { SimpleTable } from '@/components/tables';

interface Window {
  id: number;
  width: number;
  height: number;
  profileType: string;
  quantity: number;
}

function WindowList({ windows }: { windows: Window[] }) {
  return (
    <SimpleTable
      columns={[
        { key: 'width', label: 'Szerokość', align: 'center' },
        { key: 'height', label: 'Wysokość', align: 'center' },
        { key: 'profileType', label: 'Typ profilu' },
        {
          key: 'quantity',
          label: 'Ilość',
          align: 'center',
          className: 'font-medium'
        },
      ]}
      data={windows}
      keyExtractor={(item) => item.id}
      emptyState={<div className="text-center py-8">Brak okien</div>}
    />
  );
}
```

## 2. DataTable - Dla standardowych tabel

**Kiedy używać:** Główne tabele danych, listy zleceń, produktów itp.

**Cechy:**
- Sticky header
- Zebra stripes
- Hover effect
- Max height: 600px (domyślnie)
- Custom rendering dla kolumn

### Przykład:

```tsx
import { DataTable } from '@/components/tables';
import { Badge } from '@/components/ui/badge';

interface Order {
  id: number;
  orderNumber: string;
  createdAt: string;
  status: 'active' | 'archived';
  valuePln: number;
}

function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <DataTable
      columns={[
        {
          key: 'orderNumber',
          label: 'Nr zlecenia',
          render: (order) => (
            <span className="font-mono font-medium">{order.orderNumber}</span>
          ),
        },
        {
          key: 'createdAt',
          label: 'Data utworzenia',
          render: (order) => formatDate(order.createdAt),
        },
        {
          key: 'status',
          label: 'Status',
          align: 'center',
          render: (order) => (
            <Badge variant={order.status === 'active' ? 'default' : 'secondary'}>
              {order.status === 'active' ? 'Aktywne' : 'Archiwum'}
            </Badge>
          ),
        },
        {
          key: 'valuePln',
          label: 'Wartość PLN',
          align: 'right',
          render: (order) => formatCurrency(order.valuePln, 'PLN'),
        },
      ]}
      data={orders}
      keyExtractor={(order) => order.id}
      maxHeight="600px"
      emptyState={
        <div className="text-center py-12">
          <p className="text-slate-500">Brak zleceń</p>
        </div>
      }
    />
  );
}
```

## 3. StickyTable - Dla tabel z sticky columns

**Kiedy używać:** Szerokie tabele z przewijaniem poziomym, gdzie pierwsza kolumna powinna być widoczna

**Cechy:**
- Sticky header (top)
- Sticky columns (left/right)
- Zebra stripes
- Hover effect
- Obsługa wielowierszowych nagłówków

### Przykład - Prosta sticky kolumna:

```tsx
import { StickyTable } from '@/components/tables';

interface OrderRequirement {
  orderId: number;
  orderNumber: string;
  profile1: number;
  profile2: number;
  profile3: number;
  // ... więcej profili
}

function OrderRequirementsTable({ data }: { data: OrderRequirement[] }) {
  return (
    <StickyTable
      columns={[
        {
          key: 'orderNumber',
          label: 'Zlecenie',
          sticky: 'left', // Kolumna zawsze widoczna po lewej
          className: 'font-mono font-medium',
        },
        {
          key: 'profile1',
          label: 'Profil 9016',
          align: 'center',
        },
        {
          key: 'profile2',
          label: 'Profil 9010',
          align: 'center',
        },
        {
          key: 'profile3',
          label: 'Profil 8077',
          align: 'center',
        },
        // ... więcej kolumn
      ]}
      data={data}
      keyExtractor={(item) => item.orderId}
      maxHeight="600px"
    />
  );
}
```

### Przykład - Wielowierszowy nagłówek:

```tsx
import { StickyTable } from '@/components/tables';

function ComplexTable() {
  const headerRows = [
    <tr key="main">
      <th rowSpan={2} className="sticky left-0 bg-slate-50 z-30">Zlecenie</th>
      <th colSpan={2} className="border-l">Profil 9016</th>
      <th colSpan={2} className="border-l">Profil 9010</th>
    </tr>,
    <tr key="sub" className="bg-slate-100">
      <th className="border-l text-xs">bele</th>
      <th className="text-xs">m</th>
      <th className="border-l text-xs">bele</th>
      <th className="text-xs">m</th>
    </tr>
  ];

  return (
    <StickyTable
      columns={[
        { key: 'orderNumber', label: '', sticky: 'left' },
        { key: 'profile1Beams', label: '', align: 'center' },
        { key: 'profile1Meters', label: '', align: 'center' },
        { key: 'profile2Beams', label: '', align: 'center' },
        { key: 'profile2Meters', label: '', align: 'center' },
      ]}
      headerRows={headerRows}
      data={data}
      keyExtractor={(item) => item.orderId}
    />
  );
}
```

## 4. Porównanie komponentów

| Feature | SimpleTable | DataTable | StickyTable |
|---------|-------------|-----------|-------------|
| Sticky header | ✅ | ✅ | ✅ |
| Sticky columns | ❌ | ❌ | ✅ |
| Zebra stripes | ✅ | ✅ | ✅ |
| Hover effect | ✅ | ✅ | ✅ |
| Custom rendering | ✅ | ✅ | ✅ |
| Multi-row header | ❌ | ❌ | ✅ |
| Max height | 400px | 600px | 600px |
| Best for | Modals | Standard lists | Wide tables |

## 5. Wspólne właściwości

### Props dostępne we wszystkich komponentach:

```tsx
interface CommonProps<T> {
  columns: Column<T>[];           // Definicje kolumn
  data: T[];                      // Dane do wyświetlenia
  keyExtractor: (item: T, index: number) => string | number;
  maxHeight?: string;             // Maksymalna wysokość (z overflow)
  className?: string;             // Dodatkowe klasy CSS
  emptyState?: ReactNode;         // Komponent gdy brak danych
}
```

### Column definition:

```tsx
interface Column<T> {
  key: string;                    // Klucz w obiekcie danych
  label: string;                  // Nagłówek kolumny
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => ReactNode;
  className?: string;             // Klasy CSS dla komórek
  headerClassName?: string;       // Klasy CSS dla nagłówka (tylko StickyTable)
  sticky?: 'left' | 'right';     // Tylko StickyTable
}
```

## 6. Kolorystyka (zgodna z projektem)

- **Nagłówek:** `bg-slate-50`
- **Wiersz parzysty:** `bg-white`
- **Wiersz nieparzysty:** `bg-slate-100`
- **Hover:** `hover:bg-slate-200`
- **Border:** `border-t` (między wierszami)

## 7. Migracja istniejących tabel

### Przed:
```tsx
<div className="rounded border overflow-hidden max-h-[600px] overflow-y-auto">
  <table className="w-full text-sm">
    <thead className="bg-slate-50 sticky top-0 z-10">
      <tr>
        <th className="px-4 py-3 text-left">Nazwa</th>
        <th className="px-4 py-3 text-center">Wartość</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item, index) => (
        <tr key={item.id} className={`border-t hover:bg-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}>
          <td className="px-4 py-3">{item.name}</td>
          <td className="px-4 py-3 text-center">{item.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Po:
```tsx
<DataTable
  columns={[
    { key: 'name', label: 'Nazwa' },
    { key: 'value', label: 'Wartość', align: 'center' },
  ]}
  data={items}
  keyExtractor={(item) => item.id}
/>
```

Znacznie mniej kodu i spójna kolorystyka! 🎉
