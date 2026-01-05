# Plan Optymalizacji Wydajności Aplikacji Markbud

## 📋 Executive Summary

Aplikacja Markbud to nowoczesny full-stack system z Next.js 14, React Query, Fastify i Prisma. Już zawiera wiele optimizacji (caching, virtual scrolling, WebSocket, indeksy), ale są obszary do polepszenia dla osiągnięcia szybkości produkcyjnej.

---

## 🔍 Analiza Obecnego Stanu

### ✅ Obecne Optymalizacje

**Frontend:**
- Next.js caching headers (AVIF, WebP)
- React Query client-side caching
- Virtual scrolling (@tanstack/react-virtual)
- Tailwind CSS z optimizacją bundle imports
- TypeScript strict mode

**Backend:**
- Fastify framework (szybki, high-performance)
- Request timeout: 120 sekund (dla long-running operations)
- WebSocket real-time sync z heartbeat mechanizmem
- Prisma ORM z indeksami na kluczowych polach

**Database:**
- Indeksy na: status, createdAt, invoiceNumber, profileId, colorId

### 🚀 Zidentyfikowane Obszary do Optymalizacji

#### Frontend (Priorytet: **WYSOKI**)

1. **Brak Service Worker**
   - Problem: Brak offline support i caching zasobów
   - Impact: Slow page loads dla returnujących users, no offline capability
   - Solution: Implementować Service Worker z Workbox

2. **Brak Code Splitting**
   - Problem: Duży bundle w poczęciu
   - Impact: Slow TTI (Time To Interactive)
   - Solution: Lazy load routes i heavy libraries (Recharts)

3. **Brak React Query Persistence**
   - Problem: Cache znika przy refresh
   - Impact: Każdy refresh = fresh API calls
   - Solution: Persist cache do localStorage/IndexedDB

4. **Brak Debouncing na Search/Filter**
   - Problem: Każde znakniętę = API call
   - Impact: Duże load na backend, zatrzymane UI
   - Solution: Add debounce (300-500ms) na search queries

5. **Brak Web Vitals Monitoring**
   - Problem: Nie wiemy, jak app performuje u users
   - Impact: Blind optimization
   - Solution: Setup Web Vitals tracking (LCP, FID, CLS)

6. **Image Optimization**
   - Problem: Duże images nie są konwertowane na AVIF/WebP
   - Impact: Large payloads, slow loading
   - Solution: Optimize i konwertuj images

#### Backend (Priorytet: **WYSOKI**)

1. **Brak Server-Side Query Caching**
   - Problem: Każde żądanie idzie do bazy
   - Impact: High database load, slow API response
   - Solution: In-memory cache (NodeCache/Redis) dla static/rarely-changing data

2. **Brak Compression Middleware**
   - Problem: JSON responses nie są gzipowane
   - Impact: 70-80% larger payloads
   - Solution: Add @fastify/compress plugin

3. **Rate Limiting Not Configured**
   - Problem: Brak ochrony przed abuse
   - Impact: Možliwy DoS, unstable service
   - Solution: Configure @fastify/rate-limit (already installed!)

4. **WebSocket Broadcast nie Filtruje Eventy**
   - Problem: Wszyscy klienci otrzymują wszystkie eventy
   - Impact: Duży overhead, redundant invalidations
   - Solution: Filter events na topic/channel basis

5. **Brak Pagination**
   - Problem: Mogą być duże payloady (wszystkie orders/deliveries)
   - Impact: Slow load time, high memory
   - Solution: Cursor-based pagination (50-100 items per page)

6. **Event Emitter Memory Leak Risk**
   - Problem: Listeners mogą się akumulować
   - Impact: Memory leak w long-running server
   - Solution: Add listener cleanup, monitoring

#### Database (Priorytet: **ŚREDNI**)

1. **Brak Composite Indexes**
   - Problem: Some queries nie są fully indexed
   - Impact: Slow queries dla complex filters
   - Solution: Add composite indexes na frequent query patterns

2. **Brak Query Analysis**
   - Problem: Unknown slow queries
   - Impact: Can't optimize effectively
   - Solution: Enable slow query log, monitoring

3. **SQLite na Produkcji**
   - Problem: Poor concurrency, no proper locking
   - Impact: Issues przy multiple concurrent users
   - Solution: Migrate do PostgreSQL dla production

#### Build & Deployment (Priorytet: **ŚREDNI**)

1. **Brak Bundle Analysis**
   - Problem: Unknown which modules are largest
   - Impact: Can't optimize effectively
   - Solution: Setup next/bundle-analyzer

2. **CSS Not Optimized**
   - Problem: Możliwe unused CSS w production
   - Impact: Larger CSS bundle
   - Solution: Purge unused CSS, optimize Tailwind

---

## 🎯 Plan Optymalizacji - Usystematyzowany

### FAZA 1: Frontend Performance (Priorytet: WYSOKI)

#### 1.1 Implementacja Service Worker z Workbox
```
Cel: Offline support i cache-first strategia dla assets
Instalacja:
  npm install --save-dev workbox-webpack-plugin workbox-precaching

Konfiguracja w next.config.js:
  - Precache static assets
  - Implement stale-while-revalidate dla API calls
  - Service Worker registration w app layout

Oczekiwany rezultat:
  ✓ 30-40% reduction w network requests dla returning users
  ✓ Offline capability
  ✓ Faster load times
```

#### 1.2 React Query Cache Persistence
```
Cel: Cache survives refresh, faster initial load
Instalacja:
  npm install @tanstack/react-query-persist-client

Implementacja:
  - Setup persist adapter w _app.tsx
  - Configure TTL (default: 24h)
  - Persist key queries: orders, warehouse, deliveries

Oczekiwany rezultat:
  ✓ 50% faster page load dla cached data
  ✓ Offline data availability
  ✓ Better UX dla slow networks
```

#### 1.3 Bundle Size Optimization & Code Splitting
```
Cel: Reduce initial JS payload
Analiza:
  npm install --save-dev @next/bundle-analyzer

Optymalizacje:
  - Lazy load Recharts (używany tylko na dashboard)
  - Dynamic import dla heavy modals (Pallet Optimizer)
  - Split routes na osobne chunks
  - Remove unused dependencies

Oczekiwany rezultat:
  ✓ 40-50% reduction w initial JS bundle
  ✓ Faster TTI (Time To Interactive)
  ✓ Better lighthouse scores
```

#### 1.4 Image Optimization
```
Cel: Reduce image payload
Kroki:
  1. Audit current images (size, format)
  2. Convert to AVIF/WebP
  3. Implement Next.js Image component everywhere
  4. Setup srcset dla responsive loading

Oczekiwany rezultat:
  ✓ 60-70% reduction w image bytes
  ✓ Faster image loading
  ✓ Better mobile experience
```

#### 1.5 Search/Filter Debouncing
```
Cel: Reduce API calls during search
Implementacja:
  - Add debounce (300-500ms) na warehouse search
  - Add debounce na order filtering
  - Use React Query staleTime strategically

Kod przykład:
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  const { data } = useQuery(['search', debouncedSearch], () => {
    return api.search(debouncedSearch);
  });

Oczekiwany rezultat:
  ✓ 70% reduction w API calls during search
  ✓ Better server stability
  ✓ Smoother UI
```

#### 1.6 Performance Monitoring (Web Vitals)
```
Cel: Visibility do real-world performance
Implementacja:
  npm install web-vitals

Setup w app/layout.tsx:
  - Import reportWebVitals from next/analytics
  - Send metrics to analytics/logging service
  - Create dashboard dla tracking

Metryki do śledzenia:
  ✓ LCP (Largest Contentful Paint) - target < 2.5s
  ✓ FID (First Input Delay) - target < 100ms
  ✓ CLS (Cumulative Layout Shift) - target < 0.1
  ✓ FCP (First Contentful Paint)
  ✓ TTFB (Time to First Byte)
```

---

### FAZA 2: Backend Performance (Priorytet: WYSOKI)

#### 2.1 Server-Side Query Caching
```
Cel: Reduce DB load, faster API responses
Biblioteka: NodeCache lub Redis

Implementacja:
  npm install node-cache
  # lub
  npm install redis

Strategia caching:
  - Profiles (TTL: 1 godzina) - rarely change
  - Colors (TTL: 1 godzina)
  - Warehouse stats (TTL: 5 minut, invalidate on stock change)
  - Order stats (TTL: 5 minut)

Przykład:
  const cache = new NodeCache({ stdTTL: 300 });

  fastify.get('/api/profiles', async (request, reply) => {
    const cached = cache.get('profiles');
    if (cached) return cached;

    const profiles = await prisma.profile.findMany();
    cache.set('profiles', profiles);
    return profiles;
  });

Oczekiwany rezultat:
  ✓ 50% reduction w database queries
  ✓ 30% faster API response time
  ✓ Better server stability
```

#### 2.2 Compression Middleware
```
Cel: 60-80% reduction w payload size
Biblioteka: @fastify/compress (already available)

Implementacja w index.ts:
  import compress from '@fastify/compress';

  await fastify.register(compress, {
    threshold: 1024, // > 1KB gets compressed
    encodings: ['gzip', 'deflate']
  });

Oczekiwany rezultat:
  ✓ JSON responses ~70% smaller
  ✓ Faster network transfer
  ✓ Better mobile experience
```

#### 2.3 Rate Limiting
```
Cel: Protect from abuse
Biblioteka: @fastify/rate-limit (already installed!)

Implementacja w index.ts:
  import rateLimit from '@fastify/rate-limit';

  await fastify.register(rateLimit, {
    max: 100, // max requests per timeWindow
    timeWindow: '15 minutes'
  });

  // Per-route limits:
  fastify.get('/api/schuco/sync',
    { rateLimit: { max: 5, timeWindow: '1 hour' } },
    handler
  );

Oczekiwany rezultat:
  ✓ Protection from abuse
  ✓ Better server stability
  ✓ Fair resource allocation
```

#### 2.4 Improved WebSocket Event Broadcasting
```
Cel: Filter events, reduce message overhead
Obecny problem:
  - Wszyscy klienci otrzymują wszyscy events
  - Duzo redundant invalidations
  - Inefficient message passing

Rozwiązanie - Event Subscription:
  interface WSClient {
    socket: WebSocket;
    subscriptions: Set<string>; // 'warehouse', 'orders', etc.
  }

  // Klient subskrybuje:
  socket.send({ type: 'subscribe', topic: 'warehouse' });

  // Server filtruje:
  function broadcastEvent(event: DataChangeEvent, topic: string) {
    clients.forEach(client => {
      if (client.subscriptions.has(topic) && socket.readyState === 1) {
        socket.send(JSON.stringify(event));
      }
    });
  }

Oczekiwany rezultat:
  ✓ 50% reduction w WebSocket messages
  ✓ Better client performance
  ✓ Lower bandwidth usage
```

#### 2.5 Database Connection Pooling
```
Cel: Better concurrency, prevent connection exhaustion
Obecna config: Default Prisma pool (10 connections)

Optimization dla production:
  // .env
  DATABASE_URL="postgresql://...?schema=public&connection_limit=20&pool_timeout=30"

Monitoring:
  - Track active connections
  - Alert on > 80% pool usage
  - Consider read replicas dla heavy load

Oczekiwany rezultat:
  ✓ Better concurrency handling
  ✓ No connection timeouts
  ✓ Support dla 100+ concurrent users
```

#### 2.6 Query Optimization & Indexing
```
Cel: Identify i optimize slow queries
Kroki:

1. Enable Prisma query logging:
   // prisma/.env
   DEBUG=prisma:*

   // lub w code:
   const prisma = new PrismaClient({
     log: ['query', 'info', 'warn', 'error'],
   });

2. Analyze logs, find top 10 slowest queries

3. Add indexes dla problematic queries:
   model Order {
     @@index([status])
     @@index([createdAt])
     @@index([deliveryDate, status])
     @@index([archivedAt])
   }

4. Use Prisma explain() na suspicious queries:
   const explain = await prisma.$queryRaw`EXPLAIN ...query...`;

Oczekiwany rezultat:
  ✓ 30-50% faster DB queries
  ✓ Lower DB load
  ✓ Better response times
```

#### 2.7 Pagination Implementation
```
Cel: Reduce payload size, improve performance
Strategia: Cursor-based pagination

Implementacja:
  // Zapytanie:
  GET /api/orders?limit=50&cursor=<last_order_id>

  // Response:
  {
    items: [...],
    nextCursor: "order_123",
    hasMore: true
  }

  // Code:
  fastify.get('/api/orders', async (request, reply) => {
    const { limit = 50, cursor } = request.query;

    const orders = await prisma.order.findMany({
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = orders.length > limit;
    return {
      items: orders.slice(0, limit),
      nextCursor: orders[limit]?.id,
      hasMore,
    };
  });

Gdzie implementować:
  - Orders list
  - Deliveries list
  - Warehouse stock
  - Search results

Oczekiwany rezultat:
  ✓ Smaller payloads (50-100 items instead of thousands)
  ✓ Faster initial load
  ✓ Better memory usage
```

#### 2.8 Event Emitter Cleanup & Memory Leak Prevention
```
Cel: Stable memory usage over time
Obecny kod eventEmitter może mieć memory leaks

Optymalizacje:
  1. Limit listeners na event:
     const MAX_LISTENERS = 100;
     if (eventEmitter.listenerCount('change') > MAX_LISTENERS) {
       logger.warn('Too many listeners on change event');
     }

  2. Add cleanup w WebSocket disconnect:
     socket.on('close', () => {
       eventEmitter.removeAllListeners();
     });

  3. Monitor memory usage:
     setInterval(() => {
       const used = process.memoryUsage();
       console.log('Memory:', {
         heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
         external: Math.round(used.external / 1024 / 1024) + 'MB',
       });
     }, 60000);

Oczekiwany rezultat:
  ✓ Stable memory usage
  ✓ No memory leaks
  ✓ Long-running server stability
```

---

### FAZA 3: Database Optimization (Priorytet: ŚREDNI)

#### 3.1 Composite Indexes
```
Gdzie dodać indexes:
  model Order {
    @@index([status, createdAt]) // frequent filter combo
    @@index([deliveryDate, status])
    @@index([invoiceNumber, archivedAt])
  }

  model WarehouseStock {
    @@index([profileId, colorId])
  }

  model Delivery {
    @@index([status, createdAt])
  }

Oczekiwany rezultat:
  ✓ 20-40% faster filtered queries
  ✓ Lower DB load
```

#### 3.2 Query Analysis & Monitoring
```
Setup slow query monitoring:
  1. Enable Prisma logging
  2. Parse logs, identify queries > 500ms
  3. Create dashboard dla query performance
  4. Set alerts dla regression

Tools:
  - pgBadger (PostgreSQL log analyzer)
  - Database dashboard (built-in tools)
  - Custom logging layer

Oczekiwany rezultat:
  ✓ Visibility do query performance
  ✓ Proactive optimization
  ✓ Prevent regressions
```

#### 3.3 Production Database Migration (SQLite → PostgreSQL)
```
Cel: Better concurrency, reliability
Timeline: After other optimizations are done

Kroki:
  1. Setup PostgreSQL instance
  2. Export data from SQLite
  3. Import do PostgreSQL
  4. Verify data integrity
  5. Test with production-like load
  6. Backup plan ready before cutover
  7. Gradual migration (if possible)

Oczekiwany rezultat:
  ✓ Better concurrency (100+ users)
  ✓ Better reliability
  ✓ ACID guarantees
  ✓ Point-in-time recovery
```

---

### FAZA 4: Build & Deployment (Priorytet: ŚREDNI)

#### 4.1 Bundle Analysis
```
Setup next/bundle-analyzer:
  npm install --save-dev @next/bundle-analyzer

W next.config.js:
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  })

  module.exports = withBundleAnalyzer(nextConfig)

Uruchomienie:
  ANALYZE=true npm run build

Szukaj:
  - Duże dependencies (recharts, puppeteer, etc.)
  - Unused libraries
  - Opportunity dla tree-shaking
  - Duplicate code

Oczekiwany rezultat:
  ✓ Identify large modules
  ✓ Target optimization opportunities
  ✓ 30-50% bundle reduction possible
```

#### 4.2 Compression in Build Pipeline
```
Cel: Smaller deployment packages
Implementacja:
  - Gzip compression podczas build
  - Brotli dla modern browsers
  - CDN-level compression (if using CDN)

next.config.js:
  compress: true (already enabled!)

Oczekiwany rezultat:
  ✓ 70% smaller JavaScript payloads
  ✓ 50% smaller CSS payloads
```

#### 4.3 Static Site Generation (ISR/SSG)
```
Evaluate candidates dla ISR:
  - Help/Documentation pages
  - Static content
  - Marketing pages (if any)

Implementacja:
  export const revalidate = 3600; // Revalidate every hour

  export default function Page() { ... }

Oczekiwany rezultat:
  ✓ Pages serve from CDN in <100ms
  ✓ Reduced server load
  ✓ Better performance dla static content
```

#### 4.4 CSS Optimization
```
Cel: Smaller CSS bundle
Verify Tailwind purge config:
  // tailwind.config.js
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@radix-ui/**/*.js', // Important!
  ]

Analiza unused CSS:
  1. Chrome DevTools → Coverage tab
  2. Build app
  3. Open page
  4. See which CSS is unused
  5. Remove unused classes/configurations

Oczekiwany rezultat:
  ✓ 30-50% smaller CSS
  ✓ Faster style loading
```

---

## 📊 Implementation Roadmap

### Sprint 1 (Week 1-2): Quick Wins & High Impact
Priority: Implement immediately

- [ ] 2.1: Server-side query caching (NodeCache)
- [ ] 2.2: Compression middleware (@fastify/compress)
- [ ] 2.3: Rate limiting configuration (@fastify/rate-limit)
- [ ] 1.2: React Query persistence
- [ ] 1.5: Search/filter debouncing

**Expected Impact:**
- 30-40% performance improvement
- 60-70% reduction w network payloads
- Better server stability

### Sprint 2 (Week 3-4): Medium Complexity
Priority: Next wave of improvements

- [ ] 1.1: Service Worker implementation (Workbox)
- [ ] 1.3: Bundle size optimization & code splitting
- [ ] 2.4: Improved WebSocket event broadcasting
- [ ] 2.6: Query optimization & slow query analysis
- [ ] 2.7: Pagination implementation
- [ ] 1.4: Image optimization

**Expected Impact:**
- Additional 20-30% improvement
- Better UX dla slow networks
- Faster TTI (Time To Interactive)

### Sprint 3 (Week 5-6): Complex & Long-term
Priority: Sustained performance

- [ ] 1.6: Performance monitoring (Web Vitals)
- [ ] 2.5: Database connection pooling optimization
- [ ] 2.8: Event emitter cleanup & memory leak prevention
- [ ] 3.1: Add composite indexes
- [ ] 3.2: Query analysis & monitoring dashboard
- [ ] 4.1: Bundle analysis setup

**Expected Impact:**
- Additional 15-20% improvement
- Sustained performance visibility
- Better memory stability

### Sprint 4+ (Optional/Ongoing): Long-term
Priority: When needed

- [ ] 3.3: Production database migration (SQLite → PostgreSQL)
- [ ] 4.2: CSS optimization & purging
- [ ] 4.3: Evaluate ISR/SSG candidates
- [ ] 4.4: Build pipeline optimizations
- [ ] Continuous monitoring & optimization

---

## 📈 Success Metrics

### Frontend Metrics (Target Values)
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | ? | |
| FID (First Input Delay) | < 100ms | ? | |
| CLS (Cumulative Layout Shift) | < 0.1 | ? | |
| Initial JS Bundle (gzipped) | < 150KB | ? | |
| Cache hit rate (returning users) | > 60% | 0% | |
| Page load time | < 3s | ? | |

### Backend Metrics (Target Values)
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| API response time (p95) | < 200ms | ? | |
| Database query time (p95) | < 50ms | ? | |
| WebSocket latency | < 100ms | ? | |
| Memory usage stability | Stable 24h+ | ? | |
| Max concurrent users | 100+ | ? | |
| Error rate | < 0.1% | ? | |

### Business Metrics
| Metric | Target | Status |
|--------|--------|--------|
| Overall performance improvement | > 40% | |
| Network payload reduction | > 60% | |
| User satisfaction (speed) | High | |
| Offline functionality | Enabled | |

---

## ⚠️ Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Breaking existing features | Medium | High | Thorough testing, staging environment |
| Database migration issues | Low | Critical | Backup before migration, rollback plan |
| Cache invalidation bugs | Medium | Medium | Careful TTL setting, monitoring |
| Memory leaks w server | Low | Medium | Memory monitoring tools, tests |
| User experience regression | Low | High | A/B testing, slow rollout |
| Increased complexity | Medium | Low | Good documentation, code reviews |

### Backup & Rollback Strategy
- Maintain current branch as fallback
- Database backups before major changes
- Staged rollout (10% → 50% → 100%)
- Monitor metrics dla each release

---

## 🛠️ Tools & Resources

### Frontend
- `@next/bundle-analyzer` - Bundle analysis
- `web-vitals` - Performance metrics
- `workbox-cli` - Service Worker generation
- `@tanstack/react-query-persist-client` - Query persistence

### Backend
- `node-cache` - In-memory caching
- `@fastify/compress` - Response compression
- `@fastify/rate-limit` - Rate limiting
- `redis` - Alternative caching (optional)

### Database
- `pgBadger` - PostgreSQL log analysis
- `explain()` - Query analysis
- Prisma Studio - Database visualization

### Monitoring
- New Relic / DataDog (optional)
- Custom logging setup
- Chrome DevTools
- Lighthouse CI

---

## 📝 Implementation Notes

### Important Decisions
1. **Cache TTL Strategy:** Vary by data freshness requirement
   - Static data (profiles, colors): 1 hour
   - Dynamic data (warehouse): 5 minutes
   - Real-time (orders): WebSocket only, no cache

2. **Compression Level:** Balance between compression ratio and CPU
   - Recommended: gzip (better browser support) + brotli (modern)

3. **Pagination Size:** 50-100 items per page
   - Smaller dla mobile, larger dla desktop
   - User preference option later

4. **Database Priority:** Start with SQLite optimization
   - Only migrate if needed (100+ concurrent users)

5. **Monitoring:** Setup early
   - Build observability from day 1
   - Use logs + metrics + traces

### Dependencies Already Available
- ✓ `@fastify/rate-limit` - Ready to configure
- ✓ `@fastify/compress` - Ready to register
- ✓ Next.js 14 - Built-in optimizations
- ✓ React Query 5.17 - Persistence available

### Stack Quality Assessment
Current stack is **solid** with good architectural decisions:
- Modern frameworks (Next.js 14, Fastify 4.25)
- Type-safe (TypeScript, Zod validation)
- Scalable patterns (service layer, repositories)
- Real-time capability (WebSocket)
- Production-ready (error handling, health checks)

**Optimizations are incremental, not fundamental changes needed.**

---

## 🚀 Getting Started

### Immediate Next Steps
1. **Review & Approve** - Confirm priorities align with business goals
2. **Setup Monitoring** - Start tracking baseline metrics
3. **Start Sprint 1** - Begin z quick wins
4. **Document Progress** - Update this file with results
5. **Gather Data** - Collect metrics to validate improvements

### Questions to Answer
- What's the target for concurrent users?
- Are there specific slow pages/features?
- Budget dla infrastructure changes (Redis, PostgreSQL)?
- Timeline dla improvements?

---

**Last Updated:** December 2, 2025
**Status:** Ready for Implementation
**Owner:** Development Team
**Visibility:** Internal Documentation

