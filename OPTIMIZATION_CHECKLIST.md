# ✅ AKROBUD Optimization Quick Checklist

**Use this for coding guidelines going forward**

---

## 🗄️ Database - Always Do This

- [ ] Use `@@index([field])` for fields you filter/sort by
- [ ] Index foreign keys and status fields
- [ ] Index date fields (createdAt, deliveryDate, etc.)
- [ ] Use `select` instead of `include`
- [ ] Only fetch fields you actually use
- [ ] Use `groupBy` with `_sum`/`_count` instead of fetching all and calculating

### Example - ❌ WRONG
```typescript
const orders = await prisma.order.findMany({
  include: { windows: true, requirements: true }  // Gets EVERYTHING
});
```

### Example - ✅ RIGHT
```typescript
const orders = await prisma.order.findMany({
  select: {
    id: true,
    orderNumber: true,
    windows: { select: { id: true, quantity: true } },  // Only needed fields
    requirements: { select: { id: true, profileId: true } }
  }
});
```

---

## 🌐 API Routes - Always Do This

- [ ] Only return `select`ed fields (not whole entities)
- [ ] Add gzip compression (already configured globally)
- [ ] Set proper Cache-Control headers (no-store for dynamic, max-age for static)
- [ ] Validate input data
- [ ] Return appropriate HTTP status codes

### Compression
**Already configured** in `apps/api/src/index.ts` - no action needed

### Cache Headers Pattern
```typescript
// Don't cache API responses
reply.header('Cache-Control', 'no-store');
```

---

## ⚛️ React Components - Always Do This

- [ ] Use `useMemo` for expensive calculations
- [ ] Use `useCallback` for event handlers
- [ ] Use `React.memo()` for components that re-render with same props
- [ ] Use React Query with proper `staleTime`
- [ ] Never pass inline objects/arrays as props

### Example - ❌ WRONG
```typescript
export function MyComponent() {
  // ❌ Recalculates on EVERY render
  const filtered = data.filter(x => x.status === 'active');

  // ❌ Callback recreated on every render
  const handleClick = () => doSomething();

  return <ChildComponent data={filtered} onClick={handleClick} />;
}
```

### Example - ✅ RIGHT
```typescript
export function MyComponent() {
  // ✅ Only recalculates when data changes
  const filtered = useMemo(
    () => data.filter(x => x.status === 'active'),
    [data]
  );

  // ✅ Callback only recreated when dependencies change
  const handleClick = useCallback(() => doSomething(), []);

  return <ChildComponent data={filtered} onClick={handleClick} />;
}
```

---

## 🎯 React Query - Configuration Already Set

✅ **Already configured** in `apps/web/src/app/providers.tsx`

**Current settings:**
- `staleTime: 2 minutes` - Cache data for 2 minutes
- `gcTime: 10 minutes` - Keep unused data in memory for 10 minutes
- `refetchOnWindowFocus: false` - Don't refetch when tab regains focus
- `retry: 2` - Retry failed requests up to 2 times
- `retryDelay: exponential backoff` - Exponential backoff for retries

**Use cases:**
- Dashboard data: 5-10 minute staleTime
- List data: 2-3 minute staleTime
- Settings: 30 minute staleTime

---

## 🚀 Build Optimization - Already Done

✅ **Next.js compression** - `apps/web/next.config.js`
- Gzip enabled
- Image optimization (AVIF/WebP)
- Smart cache headers
- Package import optimization

✅ **API compression** - `apps/api/src/index.ts`
- All responses > 1KB are gzip compressed
- Automatic, no code changes needed

---

## 📋 New Feature Checklist

When adding a new feature, follow this order:

1. **Database**
   - [ ] Add `@@index` to frequently queried fields
   - [ ] Run `npx prisma migrate dev`

2. **API Route**
   - [ ] Use `select` instead of `include`
   - [ ] Only return needed fields
   - [ ] Test response size in Network tab

3. **React Component**
   - [ ] Use `useMemo` for calculations
   - [ ] Use `useCallback` for handlers
   - [ ] Use React Query with appropriate `staleTime`
   - [ ] Check React DevTools Profiler for slow renders

4. **Test**
   - [ ] Verify API response is reasonably sized
   - [ ] Check component doesn't re-render unnecessarily
   - [ ] Test on slow network (DevTools Network tab)

---

## 🐛 Performance Debugging

### Slow API Responses?
1. Check if using `select` in Prisma query
2. Check if query has indexes on filtered/sorted fields
3. Check response size in Network tab (should be < 100KB for lists)

### Slow Component Renders?
1. Open React DevTools Profiler
2. Look for components that render without prop changes
3. Wrap in `React.memo()` or move state
4. Check for `useMemo`/`useCallback` missing on expensive calculations

### Large Bundle Size?
1. Run `npm run build` and check size output
2. Check for unused imports
3. Check Next.js is compressing (should see gzip sizes)

### Too Many API Calls?
1. Check React Query `staleTime` settings
2. Look for duplicate queries
3. Use React Query DevTools to see query cache

---

## 🔗 Quick Links

- **Full Guide:** [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)
- **Database Schema:** `apps/api/prisma/schema.prisma`
- **API Config:** `apps/api/src/index.ts`
- **React Config:** `apps/web/src/app/providers.tsx`
- **Next.js Config:** `apps/web/next.config.js`

---

## 📞 Common Commands

```bash
# Apply new database migrations
npx prisma migrate dev

# Check build size
npm run build

# Generate Prisma Client after schema changes
npx prisma generate

# Run React Query DevTools (in development)
# Already installed, visible in browser DevTools

# Profile component renders
# Use React DevTools → Profiler tab
```

---

## ⏱️ Expected Performance Metrics

After all optimizations:

| Metric | Target |
|--------|--------|
| API Response | < 200ms (50-100ms avg) |
| Network Payload | < 50KB (compressed) |
| TTI (Time to Interactive) | < 2s |
| LCP (Largest Paint) | < 2.5s |
| FID (First Input Delay) | < 100ms |

---

## 🚀 Remember

**The golden rules of optimization:**

1. **Measure first** - Use DevTools before optimizing
2. **Optimize hotpaths** - Focus on what users see most
3. **Don't over-engineer** - Simple is better than clever
4. **Keep it maintainable** - Performance code is useless if it breaks
5. **Test after changes** - Always verify improvements

---

**Last updated: 2024-11-27**
