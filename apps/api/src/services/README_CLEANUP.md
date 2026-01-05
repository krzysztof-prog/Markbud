# PendingOrderPrice Cleanup System - Quick Reference

## Quick Start

The cleanup system runs automatically when the API server starts. No configuration required.

## Manual Operations

### Check Status
```bash
# Get cleanup statistics
curl http://localhost:3000/api/cleanup/pending-prices/statistics

# Check scheduler status
curl http://localhost:3000/api/cleanup/pending-prices/scheduler/status

# Get configuration
curl http://localhost:3000/api/cleanup/pending-prices/config
```

### Trigger Manual Cleanup
```bash
curl -X POST http://localhost:3000/api/cleanup/pending-prices/run
```

### View Pending Prices
```bash
# All pending prices
curl http://localhost:3000/api/cleanup/pending-prices/prices

# Filter by status
curl http://localhost:3000/api/cleanup/pending-prices/prices?status=pending
curl http://localhost:3000/api/cleanup/pending-prices/prices?status=applied
curl http://localhost:3000/api/cleanup/pending-prices/prices?status=expired
```

## Cleanup Rules

| Status | Age Threshold | Action |
|--------|--------------|--------|
| `pending` | 30 days | Mark as `expired` |
| `applied` | 7 days after application | Delete |
| `expired` | Any age | Delete immediately |

## Schedule

- **Runs:** Daily at 2:00 AM (Europe/Warsaw timezone)
- **Started:** Automatically when API server starts
- **Stopped:** Automatically on server shutdown

## Files

```
src/
├── repositories/
│   └── PendingOrderPriceRepository.ts      # Data access
├── services/
│   ├── pendingOrderPriceCleanupService.ts  # Business logic
│   └── pendingOrderPriceCleanupScheduler.ts # Scheduling
├── handlers/
│   └── pendingOrderPriceCleanupHandler.ts  # HTTP handlers
└── routes/
    └── pending-order-price-cleanup.ts      # API routes
```

## Logs

Look for entries with `[PendingOrderPriceCleanup]` or `[PendingPriceCleanupScheduler]` prefix.

## Database Migration

After updating the schema with `expiresAt` field, run:

```bash
cd apps/api
pnpm db:migrate
```

Migration name suggestion: `add_pending_order_price_expires_at`

## Customization

To change cleanup behavior, modify the service initialization in `index.ts`:

```typescript
import { PendingOrderPriceCleanupService } from './services/pendingOrderPriceCleanupService.js';

const service = new PendingOrderPriceCleanupService(prisma, {
  pendingMaxAgeDays: 45,     // Custom: expire after 45 days
  appliedMaxAgeDays: 14,     // Custom: delete after 14 days
  deleteExpired: false       // Custom: keep expired records
});
```

## Testing

### Create Test Data
```sql
-- Old pending record (should expire)
INSERT INTO pending_order_prices (
  order_number, currency, value_netto, filename, filepath,
  status, created_at, updated_at
) VALUES (
  'TEST-001', 'PLN', 100000, 'test.pdf', '/path/test.pdf',
  'pending', datetime('now', '-35 days'), datetime('now')
);

-- Old applied record (should be deleted)
INSERT INTO pending_order_prices (
  order_number, currency, value_netto, filename, filepath,
  status, applied_at, applied_to_order_id, created_at, updated_at
) VALUES (
  'TEST-002', 'PLN', 150000, 'test2.pdf', '/path/test2.pdf',
  'applied', datetime('now', '-10 days'), 1, datetime('now', '-10 days'), datetime('now')
);
```

### Run Manual Cleanup
```bash
curl -X POST http://localhost:3000/api/cleanup/pending-prices/run
```

### Verify Results
```bash
curl http://localhost:3000/api/cleanup/pending-prices/statistics
```

## Troubleshooting

### Scheduler Not Running
```bash
# Check status
curl http://localhost:3000/api/cleanup/pending-prices/scheduler/status

# Check server logs for:
# [PendingPriceCleanupScheduler] Starting scheduler...
# [PendingPriceCleanupScheduler] Scheduler started...
```

### Manual Override
If automatic cleanup isn't working, you can trigger it manually:
```bash
curl -X POST http://localhost:3000/api/cleanup/pending-prices/run
```

## See Also

- Full documentation: `/docs/PENDING_ORDER_PRICE_CLEANUP.md`
- Prisma schema: `/apps/api/prisma/schema.prisma`
- Server entry point: `/apps/api/src/index.ts`
