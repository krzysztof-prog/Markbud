# PendingOrderPrice Automatic Cleanup - Implementation Summary

## Overview

Implemented a comprehensive automatic cleanup policy for the `PendingOrderPrice` table to prevent indefinite growth and maintain database health.

## What Was Implemented

### 1. Database Schema Enhancement
**File:** `apps/api/prisma/schema.prisma`

Added optional TTL field for flexible cleanup policies:
- `expiresAt` - Optional timestamp for when a record should expire
- Added indexes for efficient cleanup queries: `[expiresAt]` and `[status, expiresAt]`

**Next Step:** Run migration to apply schema changes:
```bash
cd apps/api
pnpm db:migrate
```

### 2. Data Access Layer
**File:** `apps/api/src/repositories/PendingOrderPriceRepository.ts`

Repository providing database operations:
- `findOldPending(days)` - Find pending records older than X days
- `findOldApplied(days)` - Find applied records older than X days
- `findExpired()` - Find all expired records
- `deleteManyByIds(ids)` - Delete records by ID list
- `markAsExpired(ids)` - Mark records as expired
- `getStatistics()` - Get cleanup statistics
- `findAll(status?)` - Get all records with optional status filter

### 3. Business Logic Layer
**File:** `apps/api/src/services/pendingOrderPriceCleanupService.ts`

Service implementing cleanup rules:
- **Pending records** (older than 30 days) → mark as `expired`
- **Applied records** (older than 7 days) → delete
- **Expired records** → delete immediately

Configurable parameters:
```typescript
{
  pendingMaxAgeDays: 30,    // Default: 30 days
  appliedMaxAgeDays: 7,     // Default: 7 days
  deleteExpired: true       // Default: true
}
```

Methods:
- `runCleanup()` - Execute complete cleanup process
- `getStatistics()` - Get cleanup statistics
- `getAllPendingPrices(status?)` - Get all records for review
- `getConfig()` - Get current configuration

### 4. Scheduling Layer
**File:** `apps/api/src/services/pendingOrderPriceCleanupScheduler.ts`

Automatic scheduler using node-cron:
- **Schedule:** Daily at 2:00 AM (Europe/Warsaw timezone)
- **Start:** Automatically when API server starts
- **Stop:** Automatically on server shutdown

Singleton pattern for global access:
- `getPendingPriceCleanupScheduler(prisma)`
- `startPendingPriceCleanupScheduler(prisma)`
- `stopPendingPriceCleanupScheduler()`

### 5. HTTP Layer
**File:** `apps/api/src/handlers/pendingOrderPriceCleanupHandler.ts`

Request handlers for API endpoints:
- `getCleanupStatistics` - Get statistics
- `getCleanupConfig` - Get configuration
- `getSchedulerStatus` - Check scheduler status
- `triggerManualCleanup` - Manually run cleanup
- `getAllPendingPrices` - Get all records

### 6. API Routes
**File:** `apps/api/src/routes/pending-order-price-cleanup.ts`

RESTful API endpoints (prefix: `/api/cleanup/pending-prices`):
- `GET /statistics` - Get cleanup statistics
- `GET /config` - Get cleanup configuration
- `GET /scheduler/status` - Get scheduler status
- `POST /run` - Manually trigger cleanup
- `GET /prices?status=<status>` - Get all pending prices

### 7. Server Integration
**File:** `apps/api/src/index.ts`

Integrated cleanup scheduler with main server:
- Import cleanup scheduler functions
- Register cleanup routes
- Start scheduler on server startup
- Stop scheduler on graceful shutdown

Changes made:
```typescript
// Added imports
import { startPendingPriceCleanupScheduler, stopPendingPriceCleanupScheduler }
  from './services/pendingOrderPriceCleanupScheduler.js';
import { pendingOrderPriceCleanupRoutes }
  from './routes/pending-order-price-cleanup.js';

// Registered routes
await fastify.register(pendingOrderPriceCleanupRoutes, {
  prefix: '/api/cleanup/pending-prices'
});

// Start scheduler
startPendingPriceCleanupScheduler(prisma);

// Stop on shutdown
stopPendingPriceCleanupScheduler();
```

### 8. Documentation

**Main Documentation:** `docs/PENDING_ORDER_PRICE_CLEANUP.md`
- Comprehensive guide covering all aspects
- API endpoint documentation with examples
- Configuration and customization
- Monitoring and troubleshooting
- Architecture overview
- Testing instructions

**Quick Reference:** `apps/api/src/services/README_CLEANUP.md`
- Quick start guide
- Common commands
- Cleanup rules table
- File structure
- Testing snippets

## Cleanup Policy

| Record Type | Age Threshold | Action | Reason |
|------------|--------------|---------|--------|
| **Pending** | 30 days | Mark as `expired` | Order likely won't be created |
| **Applied** | 7 days after application | Delete | Already processed into Order |
| **Expired** | Any age | Delete immediately | Marked as obsolete |

## Architecture

```
Client Request
     ↓
API Routes (/api/cleanup/pending-prices/*)
     ↓
Handlers (HTTP layer)
     ↓
Service (Business logic)
     ↓
Repository (Data access)
     ↓
Prisma Client
     ↓
SQLite Database
```

Separate scheduler runs independently:
```
Cron Scheduler (2:00 AM daily)
     ↓
Cleanup Service
     ↓
Repository
     ↓
Database
```

## API Endpoints Summary

### GET /api/cleanup/pending-prices/statistics
Returns count and age statistics for all pending prices.

### GET /api/cleanup/pending-prices/config
Returns current cleanup configuration (age thresholds).

### GET /api/cleanup/pending-prices/scheduler/status
Returns scheduler running status and schedule time.

### POST /api/cleanup/pending-prices/run
Manually triggers cleanup process, returns affected record counts.

### GET /api/cleanup/pending-prices/prices?status={status}
Lists all pending price records, optionally filtered by status.

## Testing Instructions

### 1. Check Current State
```bash
# Get statistics
curl http://localhost:3000/api/cleanup/pending-prices/statistics

# Check scheduler
curl http://localhost:3000/api/cleanup/pending-prices/scheduler/status
```

### 2. Create Test Data
```sql
-- Old pending record (should expire)
INSERT INTO pending_order_prices (
  order_number, currency, value_netto, filename, filepath,
  status, created_at, updated_at
) VALUES (
  'TEST-CLEANUP-001', 'PLN', 100000, 'test.pdf', '/test.pdf',
  'pending', datetime('now', '-35 days'), datetime('now')
);

-- Old applied record (should be deleted)
INSERT INTO pending_order_prices (
  order_number, currency, value_netto, filename, filepath,
  status, applied_at, applied_to_order_id, created_at, updated_at
) VALUES (
  'TEST-CLEANUP-002', 'PLN', 150000, 'test2.pdf', '/test2.pdf',
  'applied', datetime('now', '-10 days'), 1, datetime('now', '-10 days'), datetime('now')
);

-- Expired record (should be deleted)
INSERT INTO pending_order_prices (
  order_number, currency, value_netto, filename, filepath,
  status, created_at, updated_at
) VALUES (
  'TEST-CLEANUP-003', 'PLN', 200000, 'test3.pdf', '/test3.pdf',
  'expired', datetime('now', '-5 days'), datetime('now')
);
```

### 3. Run Manual Cleanup
```bash
curl -X POST http://localhost:3000/api/cleanup/pending-prices/run
```

Expected response:
```json
{
  "success": true,
  "message": "Cleanup completed successfully",
  "data": {
    "success": true,
    "timestamp": "2025-12-30T...",
    "pendingExpired": 1,     // TEST-CLEANUP-001
    "appliedDeleted": 1,     // TEST-CLEANUP-002
    "expiredDeleted": 1,     // TEST-CLEANUP-003
    "totalAffected": 3
  }
}
```

### 4. Verify Results
```bash
# Check statistics after cleanup
curl http://localhost:3000/api/cleanup/pending-prices/statistics
```

### 5. Check Logs
Look for log entries:
```
[PendingOrderPriceCleanup] Starting cleanup process...
[PendingOrderPriceCleanup] Found 1 old pending records to expire
[PendingOrderPriceCleanup] Marked 1 pending records as expired
[PendingOrderPriceCleanup] Found 1 old applied records to delete
[PendingOrderPriceCleanup] Deleted 1 applied records
[PendingOrderPriceCleanup] Found 1 expired records to delete
[PendingOrderPriceCleanup] Deleted 1 expired records
[PendingOrderPriceCleanup] Cleanup completed successfully
```

## Migration Required

Before using the cleanup system, apply the database migration:

```bash
cd apps/api
pnpm db:migrate
```

Migration will add the `expires_at` field to the `pending_order_prices` table.

**Suggested migration name:** `add_pending_order_price_expires_at`

## Configuration Options

The cleanup service accepts optional configuration:

```typescript
const service = new PendingOrderPriceCleanupService(prisma, {
  pendingMaxAgeDays: 30,    // Days before pending records expire
  appliedMaxAgeDays: 7,     // Days before applied records are deleted
  deleteExpired: true       // Whether to delete expired records
});
```

To customize globally, modify the service initialization in:
- `apps/api/src/services/pendingOrderPriceCleanupScheduler.ts` (line 16)

## Monitoring

### Server Startup
Look for:
```
[PendingPriceCleanupScheduler] Starting scheduler...
[PendingPriceCleanupScheduler] Scheduler started. Cleanup scheduled for 2:00 AM daily
```

### Scheduled Runs
Look for:
```
[PendingPriceCleanupScheduler] Running scheduled cleanup...
[PendingOrderPriceCleanup] Starting cleanup process...
[PendingOrderPriceCleanup] Cleanup completed successfully. Total affected: X
```

### Manual Triggers
Look for:
```
[CleanupHandler] Manual cleanup triggered by user
```

## Security Considerations

1. **No Authentication Required** - Consider adding authentication to cleanup endpoints in production
2. **Manual Trigger** - Anyone with API access can trigger cleanup
3. **Data Deletion** - Cleanup permanently deletes records (no soft delete)
4. **Rate Limiting** - Global rate limiting applies (100 req/15min)

## Performance

- **Indexes Added:** `[expiresAt]`, `[status, expiresAt]` for efficient queries
- **Batch Operations:** Uses `deleteMany` for efficient bulk deletion
- **Transaction Safety:** Each cleanup operation is atomic
- **Scheduled Time:** 2:00 AM chosen to minimize impact

## Future Enhancements

Potential improvements:
1. **Web UI Dashboard** - Visual interface for cleanup management
2. **Configurable via API** - Change settings without code changes
3. **Soft Delete** - Archive instead of hard delete for compliance
4. **Dry Run Mode** - Preview what would be deleted
5. **Email Notifications** - Alert on cleanup failures
6. **Metrics Collection** - Track cleanup history over time
7. **Per-Record TTL** - Use `expiresAt` field for custom expiration

## Files Created

```
apps/api/src/
├── repositories/
│   └── PendingOrderPriceRepository.ts           (NEW)
├── services/
│   ├── pendingOrderPriceCleanupService.ts       (NEW)
│   ├── pendingOrderPriceCleanupScheduler.ts     (NEW)
│   └── README_CLEANUP.md                        (NEW)
├── handlers/
│   └── pendingOrderPriceCleanupHandler.ts       (NEW)
└── routes/
    └── pending-order-price-cleanup.ts           (NEW)

apps/api/prisma/
└── schema.prisma                                (MODIFIED)

apps/api/src/
└── index.ts                                     (MODIFIED)

docs/
└── PENDING_ORDER_PRICE_CLEANUP.md               (NEW)

PENDING_PRICE_CLEANUP_IMPLEMENTATION.md          (THIS FILE)
```

## Deployment Checklist

Before deploying to production:

- [ ] Apply database migration (`pnpm db:migrate`)
- [ ] Test manual cleanup endpoint
- [ ] Verify scheduler starts with API server
- [ ] Check server logs for cleanup messages
- [ ] Monitor first scheduled cleanup at 2:00 AM
- [ ] Review cleanup statistics after first run
- [ ] Update production documentation
- [ ] Train support staff on cleanup endpoints
- [ ] Set up monitoring alerts (optional)

## Support

For issues or questions:
1. Check server logs for error messages
2. Use `/api/cleanup/pending-prices/statistics` to check current state
3. Try manual cleanup: `POST /api/cleanup/pending-prices/run`
4. Review full documentation in `docs/PENDING_ORDER_PRICE_CLEANUP.md`
5. Contact development team if issues persist

## Conclusion

The automatic cleanup system is now fully integrated and will:
- ✅ Run automatically every day at 2:00 AM
- ✅ Clean up old pending, applied, and expired records
- ✅ Provide API endpoints for manual control
- ✅ Log all operations for monitoring
- ✅ Follow configurable cleanup policies

**Next Action Required:** Run database migration to enable the system.
