# 📋 Optimization Code Snippets - Copy & Paste

**Quick reference for common optimization patterns**

---

## 🗄️ Prisma Database Patterns

### Pattern 1: Add Index to Model
```prisma
model Order {
  id        Int      @id @default(autoincrement())
  status    String
  createdAt DateTime @default(now())

  // Add these lines:
  @@index([status])
  @@index([createdAt])
}
```

### Pattern 2: Selective Field Fetching
```typescript
// ❌ DON'T - Gets all fields
const orders = await prisma.order.findMany({
  include: { windows: true, requirements: true }
});

// ✅ DO - Get only needed fields
const orders = await prisma.order.findMany({
  select: {
    id: true,
    orderNumber: true,
    status: true,
    createdAt: true,
    windows: {
      select: {
        id: true,
        widthMm: true,
        heightMm: true,
        quantity: true,
      }
    },
    requirements: {
      select: {
        id: true,
        profileId: true,
        colorId: true,
        beamsCount: true,
        profile: {
          select: { id: true, number: true, name: true }
        },
        color: {
          select: { id: true, code: true, name: true }
        },
      }
    },
  },
  orderBy: { createdAt: 'desc' },
});
```

### Pattern 3: Aggregation Instead of Filtering
```typescript
// ❌ DON'T - Fetch all then filter
const allReqs = await prisma.orderRequirement.findMany({
  include: { profile: true, color: true, order: true }
});
const totals = {}; // Then calculate manually

// ✅ DO - Let database aggregate
const totals = await prisma.orderRequirement.groupBy({
  by: ['profileId', 'colorId'],
  where: {
    order: {
      archivedAt: null,
      status: { notIn: ['archived', 'completed'] }
    }
  },
  _sum: {
    beamsCount: true,
    meters: true,
  },
});
```

### Pattern 4: Transaction for Multiple Updates
```typescript
// ✅ DO - Use transaction for atomicity
const updates = orderIds.map((orderId, index) =>
  prisma.deliveryOrder.update({
    where: { id: orderId },
    data: { position: index + 1 },
  })
);

await prisma.$transaction(updates);
```

---

## 🌐 API Route Patterns (Fastify)

### Pattern 1: Optimized GET Endpoint
```typescript
export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      const { id } = request.params;

      // Set cache headers
      reply.header('Cache-Control', 'no-store');

      // Use select for efficiency
      const order = await prisma.order.findUnique({
        where: { id: parseInt(id) },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          requirements: {
            select: {
              id: true,
              profileId: true,
              profile: { select: { id: true, number: true } },
            }
          },
        },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Not found' });
      }

      return order;
    }
  );
};
```

### Pattern 2: Compressed API (Already Configured)
```typescript
// Already in apps/api/src/index.ts
import compress from '@fastify/compress';

await fastify.register(compress, {
  threshold: 1024, // Compress responses > 1KB
  encodings: ['gzip', 'deflate'],
});
```

### Pattern 3: Error Response with Status
```typescript
fastify.get('/:id', async (request, reply) => {
  try {
    const data = await prisma.model.findUnique({
      where: { id: parseInt(request.params.id) },
    });

    if (!data) {
      return reply.status(404).send({
        error: 'Not found',
        statusCode: 404
      });
    }

    return data;
  } catch (error) {
    return reply.status(500).send({
      error: 'Server error',
      statusCode: 500
    });
  }
});
```

---

## ⚛️ React Component Patterns

### Pattern 1: Memoize Expensive Calculation
```typescript
import { useMemo } from 'react';

export function MyComponent({ data }) {
  // ✅ Expensive calculation memoized
  const sorted = useMemo(() => {
    return data
      .filter(item => item.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  return (
    <div>
      {sorted.map(item => <Item key={item.id} {...item} />)}
    </div>
  );
}
```

### Pattern 2: Memoize Callback
```typescript
import { useCallback } from 'react';

export function MyComponent() {
  // ✅ Callback stable reference
  const handleClick = useCallback((id) => {
    console.log('Clicked:', id);
    // Do something
  }, []); // Dependencies empty if no external values used

  return (
    <ChildComponent onClick={handleClick} />
  );
}
```

### Pattern 3: Memoize Component
```typescript
import { memo } from 'react';

// ✅ Component won't re-render if props don't change
export const OrderRow = memo(({ order, onUpdate }) => {
  return (
    <tr>
      <td>{order.orderNumber}</td>
      <td>{order.status}</td>
      <td>
        <button onClick={() => onUpdate(order.id)}>
          Update
        </button>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Return true if props are equal (don't re-render)
  return prevProps.order.id === nextProps.order.id;
});
```

### Pattern 4: React Query Hook
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function OrdersPage() {
  const queryClient = useQueryClient();

  // ✅ Fetch with smart caching (staleTime from config)
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getAll(),
    staleTime: 2 * 60 * 1000, // 2 minutes (or use default)
  });

  // ✅ Mutation with cache invalidation
  const updateMutation = useMutation({
    mutationFn: (id) => ordersApi.update(id, {}),
    onSuccess: () => {
      // Invalidate cache to refetch
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return (
    // Component JSX
  );
}
```

### Pattern 5: Component with Multiple Optimizations
```typescript
import { useCallback, useMemo, memo } from 'react';

// ✅ Memoized row component
const WarehouseRow = memo(({ stock, onUpdate, onDelete }) => {
  return (
    <tr>
      <td>{stock.profileId}</td>
      <td>{stock.currentStockBeams}</td>
      <td>
        <button onClick={() => onUpdate(stock.id)}>Edit</button>
        <button onClick={() => onDelete(stock.id)}>Delete</button>
      </td>
    </tr>
  );
});

export function WarehouseTable({ stocks }) {
  // ✅ Memoize callbacks
  const handleUpdate = useCallback((id) => {
    console.log('Update:', id);
  }, []);

  const handleDelete = useCallback((id) => {
    console.log('Delete:', id);
  }, []);

  // ✅ Memoize filtered/sorted data
  const sortedStocks = useMemo(() => {
    return stocks
      .filter(s => s.currentStockBeams < 10)
      .sort((a, b) => a.profileId - b.profileId);
  }, [stocks]);

  return (
    <table>
      <tbody>
        {sortedStocks.map(stock => (
          <WarehouseRow
            key={stock.id}
            stock={stock}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </tbody>
    </table>
  );
}
```

---

## 🎯 Configuration Snippets

### React Query Provider (Already Configured)
```typescript
// apps/web/src/app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (error?.status === 404 || error?.status === 403) return false;
              return failureCount < 2;
            },
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Next.js Config (Already Optimized)
```javascript
// apps/web/next.config.js
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  images: {
    optimized: true,
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  experimental: {
    optimizePackageImports: ['@radix-ui/*', 'lucide-react'],
  },
};

module.exports = nextConfig;
```

### API Compression (Already Configured)
```typescript
// apps/api/src/index.ts
import compress from '@fastify/compress';

await fastify.register(compress, {
  threshold: 1024,
  encodings: ['gzip', 'deflate'],
});
```

---

## 🐛 Debugging Code

### React DevTools Profiler
```typescript
// Just use React DevTools → Profiler tab
// 1. Open React DevTools
// 2. Go to Profiler tab
// 3. Click record
// 4. Interact with component
// 5. Look for slow renders (yellow/red) and missing memoization
```

### React Query DevTools
```typescript
// Already installed, just use it
// 1. Look at bottom-right corner in development
// 2. Check cache status
// 3. Monitor refetch behavior
```

### Network Tab for API Responses
```
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Check response size (should be < 100KB for lists)
4. Check compression (should see gzip)
5. Check Cache-Control headers
```

### Prisma Query Logging
```typescript
// apps/api/prisma/schema.prisma
// Uncomment in development to see queries
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
  // Uncomment to log queries:
  // log      = ["query", "error", "warn"]
}
```

---

## ✅ Before/After Checklist

### Before Optimization
```
❌ Using include without select
❌ Fetching all fields
❌ No component memoization
❌ Large API payloads
❌ Missing database indexes
```

### After Optimization
```
✅ Using select with specific fields
✅ Only fetching needed data
✅ useMemo/useCallback for expensive operations
✅ Gzipped API responses < 100KB
✅ Database indexes on search fields
```

---

## 🚀 Quick Implementation Guide

### For Existing Endpoint

1. **Replace include with select:**
   ```typescript
   // Find all await prisma calls
   // Change include: { field: true } to select: { field: true }
   // Specify exact fields needed
   ```

2. **Add to component if slow:**
   ```typescript
   // Wrap expensive calculations in useMemo
   // Wrap callbacks in useCallback
   // Consider React.memo for the whole component
   ```

3. **Test:**
   ```bash
   npm run build
   # Check Network tab for payload size
   # Check React DevTools Profiler
   ```

---

**For complete documentation, see:**
- `OPTIMIZATION_GUIDE.md` - Full detailed guide
- `OPTIMIZATION_CHECKLIST.md` - Quick checklist
- `OPTIMIZATION_SNIPPETS.md` - This file (copy-paste patterns)
