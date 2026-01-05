# Routing Guide

Next.js App Router implementation with folder-based routing and lazy loading patterns.

---

## Next.js App Router Overview

**Next.js App Router** with file-based routing:
- Folder structure defines routes
- `page.tsx` files create route segments
- `layout.tsx` for shared layouts
- Server Components by default
- Client Components with `'use client'` directive

---

## Folder-Based Routing

### Directory Structure

```
app/
  page.tsx                      # Home route (/)
  layout.tsx                    # Root layout
  dostawy/
    page.tsx                    # /dostawy
    [id]/
      page.tsx                  # /dostawy/:id (dynamic)
      optymalizacja/
        page.tsx                # /dostawy/:id/optymalizacja
  zlecenia/
    page.tsx                    # /zlecenia
  magazyn/
    page.tsx                    # /magazyn
    akrobud/
      page.tsx                  # /magazyn/akrobud
```

**Pattern:**
- `page.tsx` = Route at that path
- `[param]/` = Dynamic parameter folder
- `layout.tsx` = Shared layout for children
- Nested folders = Nested routes

---

## Basic Route Pattern

### Example: dostawy/page.tsx

```typescript
'use client';

import { Suspense } from 'react';
import { DeliveriesList } from '@/features/deliveries/components/DeliveriesList';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

export default function DeliveriesPage() {
    return (
        <div className="container mx-auto py-6">
            <h1 className="text-2xl font-bold mb-6">Dostawy</h1>
            <Suspense fallback={<LoadingSkeleton />}>
                <DeliveriesList />
            </Suspense>
        </div>
    );
}
```

**Key Points:**
- `'use client'` for client-side interactivity
- Suspense boundary for data fetching
- Lazy loading with Suspense fallback
- Clean page structure

---

## Lazy Loading Components

### Using React.lazy with Suspense

```typescript
'use client';

import React, { Suspense, lazy } from 'react';

// Lazy load heavy components
const DeliveryOptimizer = lazy(() =>
    import('@/features/deliveries/components/DeliveryOptimizer')
);

export default function OptimizationPage() {
    return (
        <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded" />}>
            <DeliveryOptimizer />
        </Suspense>
    );
}
```

### Using next/dynamic

```typescript
'use client';

import dynamic from 'next/dynamic';

// Dynamic import with loading state
const DeliveryCalendar = dynamic(
    () => import('@/features/deliveries/components/DeliveryCalendar'),
    {
        loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded" />,
        ssr: false, // Disable SSR if component uses browser APIs
    }
);

export default function CalendarPage() {
    return <DeliveryCalendar />;
}
```

### Why Lazy Load?

- Code splitting - smaller initial bundle
- Faster initial page load
- Load component code only when needed
- Better Core Web Vitals

---

## Dynamic Routes

### Parameter Routes

```typescript
// app/dostawy/[id]/page.tsx

'use client';

import { useParams } from 'next/navigation';
import { DeliveryDetail } from '@/features/deliveries/components/DeliveryDetail';

export default function DeliveryPage() {
    const params = useParams();
    const deliveryId = params.id as string;

    return <DeliveryDetail id={deliveryId} />;
}
```

### Multiple Parameters

```typescript
// app/zlecenia/[orderId]/pozycje/[itemId]/page.tsx

'use client';

import { useParams } from 'next/navigation';

export default function OrderItemPage() {
    const params = useParams();
    const { orderId, itemId } = params as { orderId: string; itemId: string };

    return (
        <div>
            <h1>Order: {orderId}</h1>
            <h2>Item: {itemId}</h2>
        </div>
    );
}
```

### Catch-all Routes

```typescript
// app/docs/[...slug]/page.tsx
// Matches /docs/a, /docs/a/b, /docs/a/b/c, etc.

'use client';

import { useParams } from 'next/navigation';

export default function DocsPage() {
    const params = useParams();
    const slug = params.slug as string[];

    return <div>Path: {slug.join('/')}</div>;
}
```

---

## Navigation

### Programmatic Navigation

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export const NavigationExample: React.FC = () => {
    const router = useRouter();

    const handleNavigate = () => {
        router.push('/dostawy');
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <div className="space-x-2">
            <Button onClick={handleNavigate}>Go to Deliveries</Button>
            <Button variant="outline" onClick={handleBack}>Back</Button>
        </div>
    );
};
```

### Link Component

```typescript
import Link from 'next/link';

// Basic link
<Link href="/dostawy" className="text-blue-600 hover:underline">
    Dostawy
</Link>

// Link with dynamic parameter
<Link href={`/dostawy/${delivery.id}`}>
    View Details
</Link>

// Link with query params
<Link href={{ pathname: '/zlecenia', query: { status: 'active' } }}>
    Active Orders
</Link>
```

### Navigation with Search Params

```typescript
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export const FilterExample: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleFilter = (status: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('status', status);
        router.push(`/zlecenia?${params.toString()}`);
    };

    return (
        <button onClick={() => handleFilter('active')}>
            Filter Active
        </button>
    );
};
```

---

## Layouts

### Root Layout (app/layout.tsx)

```typescript
import { Inter } from 'next/font/google';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'AKROBUD',
    description: 'Production management system',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pl">
            <body className={inter.className}>
                <div className="flex min-h-screen">
                    <Sidebar />
                    <div className="flex-1">
                        <Header />
                        <main className="p-6">{children}</main>
                    </div>
                </div>
            </body>
        </html>
    );
}
```

### Nested Layouts

```typescript
// app/magazyn/layout.tsx

export default function WarehouseLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="grid grid-cols-[200px_1fr] gap-4">
            <nav className="bg-gray-100 p-4 rounded">
                <h2 className="font-bold mb-4">Magazyn</h2>
                <ul className="space-y-2">
                    <li><Link href="/magazyn">Overview</Link></li>
                    <li><Link href="/magazyn/akrobud">Akrobud</Link></li>
                    <li><Link href="/magazyn/dostawy-schuco">Schuco</Link></li>
                </ul>
            </nav>
            <div>{children}</div>
        </div>
    );
}
```

---

## Loading States

### Loading UI (loading.tsx)

```typescript
// app/dostawy/loading.tsx
// Automatically shown while page loads

export default function Loading() {
    return (
        <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
    );
}
```

### Streaming with Suspense

```typescript
// app/dashboard/page.tsx

import { Suspense } from 'react';

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>

            <div className="grid grid-cols-3 gap-4">
                <Suspense fallback={<StatCardSkeleton />}>
                    <OrdersStats />
                </Suspense>

                <Suspense fallback={<StatCardSkeleton />}>
                    <DeliveriesStats />
                </Suspense>

                <Suspense fallback={<StatCardSkeleton />}>
                    <WarehouseStats />
                </Suspense>
            </div>
        </div>
    );
}
```

---

## Error Handling

### Error Boundary (error.tsx)

```typescript
// app/dostawy/error.tsx
'use client';

import { Button } from '@/components/ui/button';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <h2 className="text-xl font-semibold mb-4">Coś poszło nie tak!</h2>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <Button onClick={reset}>Spróbuj ponownie</Button>
        </div>
    );
}
```

### Not Found (not-found.tsx)

```typescript
// app/not-found.tsx

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <h2 className="text-2xl font-bold mb-4">404 - Nie znaleziono</h2>
            <p className="text-gray-600 mb-4">
                Strona, której szukasz nie istnieje.
            </p>
            <Link href="/">
                <Button>Wróć do strony głównej</Button>
            </Link>
        </div>
    );
}
```

---

## Route Groups

Group routes without affecting URL:

```
app/
  (marketing)/
    about/page.tsx          # /about
    contact/page.tsx        # /contact
  (dashboard)/
    dashboard/page.tsx      # /dashboard
    settings/page.tsx       # /settings
```

---

## Metadata

### Static Metadata

```typescript
// app/dostawy/page.tsx

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Dostawy | AKROBUD',
    description: 'Zarządzanie dostawami',
};

export default function DeliveriesPage() {
    return <div>...</div>;
}
```

### Dynamic Metadata

```typescript
// app/dostawy/[id]/page.tsx

import type { Metadata } from 'next';

type Props = {
    params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    return {
        title: `Dostawa ${params.id} | AKROBUD`,
    };
}

export default function DeliveryPage({ params }: Props) {
    return <div>Delivery: {params.id}</div>;
}
```

---

## Complete Route Example

```typescript
// app/dostawy/[id]/page.tsx

'use client';

import { Suspense, lazy } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const DeliveryDetail = lazy(() =>
    import('@/features/deliveries/components/DeliveryDetail')
);

export default function DeliveryPage() {
    const params = useParams();
    const router = useRouter();
    const deliveryId = params.id as string;

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center gap-4 mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Wróć
                </Button>
                <h1 className="text-2xl font-bold">
                    Dostawa #{deliveryId}
                </h1>
            </div>

            <Suspense
                fallback={
                    <div className="space-y-4">
                        <div className="h-8 bg-gray-200 rounded animate-pulse" />
                        <div className="h-64 bg-gray-200 rounded animate-pulse" />
                    </div>
                }
            >
                <DeliveryDetail id={deliveryId} />
            </Suspense>
        </div>
    );
}
```

---

## Summary

**Routing Checklist:**
- ✅ Folder-based: `app/my-route/page.tsx`
- ✅ Use `'use client'` for interactive pages
- ✅ Lazy load components with `React.lazy` or `next/dynamic`
- ✅ Wrap in `<Suspense>` for loading states
- ✅ Use `useParams()` for dynamic params
- ✅ Use `useRouter()` for programmatic navigation
- ✅ Use `<Link>` for declarative navigation
- ✅ Add `loading.tsx` for automatic loading states
- ✅ Add `error.tsx` for error boundaries
- ❌ Don't use TanStack Router (this project uses Next.js)

**See Also:**
- [component-patterns.md](component-patterns.md) - Lazy loading patterns
- [loading-and-error-states.md](loading-and-error-states.md) - Suspense usage
- [complete-examples.md](complete-examples.md) - Full route examples