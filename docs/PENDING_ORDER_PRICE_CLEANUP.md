# PendingOrderPrice Cleanup Policy

## Overview

The `PendingOrderPrice` cleanup system automatically manages the lifecycle of pending order prices in the database. This prevents the table from growing indefinitely and ensures old, obsolete records are removed.

## Purpose

When PDF price files are imported but the corresponding order doesn't exist yet, the price data is stored in the `PendingOrderPrice` table. Once the order is created, the price is automatically applied and the record's status changes to `applied`. However, some records may never be applied (e.g., if the order is never created), or they may remain in the database long after being applied. The cleanup system handles these scenarios.

## Cleanup Rules

The cleanup process follows these rules:

### 1. Pending Records (status='pending')
- **Age threshold:** 60 days
- **Action:** Mark as `expired` (status changed to 'expired')
- **Reason:** If an order hasn't appeared in 60 days, the price is likely obsolete and won't be used
- **Note:** Pliki PDF pozostają nienaruszone w folderze `ceny/` - zawsze możesz je zaimportować ponownie

### 2. Applied Records (status='applied')
- **Age threshold:** 7 days after `appliedAt` timestamp
- **Action:** Delete from database
- **Reason:** Once applied, the price is stored in the Order record and the pending price record is no longer needed

### 3. Expired Records (status='expired')
- **Action:** Delete immediately during cleanup
- **Reason:** These records have been marked as obsolete and can be safely removed

## Automatic Cleanup Schedule

The cleanup runs automatically:
- **Frequency:** Daily
- **Time:** 2:00 AM (Europe/Warsaw timezone)
- **Why this time?** Minimal impact on business operations during off-hours

The scheduler starts automatically when the API server starts.

## Configuration

Current configuration (configured in `pendingOrderPriceCleanupScheduler.ts`):

```typescript
{
  pendingMaxAgeDays: 60,    // Age at which pending records expire (pliki PDF pozostają!)
  appliedMaxAgeDays: 7,     // Age at which applied records are deleted
  deleteExpired: true       // Whether to delete expired records immediately
}
```

To customize, modify the service initialization in your code:

```typescript
const service = new PendingOrderPriceCleanupService(prisma, {
  pendingMaxAgeDays: 45,     // Custom: expire after 45 days
  appliedMaxAgeDays: 14,     // Custom: delete after 14 days
  deleteExpired: false       // Custom: keep expired records
});
```

## API Endpoints

All endpoints are prefixed with `/api/cleanup/pending-prices`

### 1. Get Cleanup Statistics

```http
GET /api/cleanup/pending-prices/statistics
```

Returns:
- Total number of records
- Count by status (pending, applied, expired)
- Oldest record dates per status

Example response:
```json
{
  "success": true,
  "data": {
    "total": 45,
    "byStatus": {
      "pending": 12,
      "applied": 30,
      "expired": 3
    },
    "oldest": {
      "pending": "2024-11-15T10:30:00.000Z",
      "applied": "2024-12-20T14:22:00.000Z",
      "expired": "2024-10-01T08:15:00.000Z"
    }
  }
}
```

### 2. Get Cleanup Configuration

```http
GET /api/cleanup/pending-prices/config
```

Returns current cleanup configuration settings.

Example response:
```json
{
  "success": true,
  "data": {
    "pendingMaxAgeDays": 30,
    "appliedMaxAgeDays": 7,
    "deleteExpired": true
  }
}
```

### 3. Get Scheduler Status

```http
GET /api/cleanup/pending-prices/scheduler/status
```

Check if automatic cleanup is running.

Example response:
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "scheduledTime": "2:00 AM (Europe/Warsaw)"
  }
}
```

### 4. Manual Cleanup Trigger

```http
POST /api/cleanup/pending-prices/run
```

Manually trigger a cleanup process (doesn't wait for scheduled time).

Example response:
```json
{
  "success": true,
  "message": "Cleanup completed successfully",
  "data": {
    "success": true,
    "timestamp": "2025-12-30T15:45:30.000Z",
    "pendingExpired": 5,
    "appliedDeleted": 12,
    "expiredDeleted": 3,
    "totalAffected": 20
  }
}
```

### 5. Get All Pending Prices

```http
GET /api/cleanup/pending-prices/prices?status=pending
```

Query parameters:
- `status` (optional): Filter by status ('pending', 'applied', 'expired')

Returns all pending price records with full details.

## Database Schema

The cleanup system works with the `PendingOrderPrice` model:

```prisma
model PendingOrderPrice {
  id               Int          @id @default(autoincrement())
  orderNumber      String
  reference        String?
  currency         String       // EUR or PLN
  valueNetto       Int
  valueBrutto      Int?
  filename         String
  filepath         String
  importId         Int?
  status           String       @default("pending") // pending, applied, expired
  appliedAt        DateTime?
  appliedToOrderId Int?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  fileImport       FileImport?  @relation(fields: [importId], references: [id])

  @@index([orderNumber])
  @@index([status])
  @@index([orderNumber, status])
}
```

## Monitoring and Logs

All cleanup operations are logged with the `[PendingOrderPriceCleanup]` prefix. Check your logs for:

- Scheduled cleanup execution
- Number of records affected
- Errors or failures

Example log entries:
```
[PendingOrderPriceCleanup] Starting cleanup process...
[PendingOrderPriceCleanup] Found 5 old pending records to expire
[PendingOrderPriceCleanup] Marked 5 pending records as expired
[PendingOrderPriceCleanup] Deleted 12 applied records
[PendingOrderPriceCleanup] Cleanup completed successfully. Total affected: 17
```

## Manual Intervention

If you need to manually review or manage pending prices:

1. **View all pending prices:**
   ```http
   GET /api/cleanup/pending-prices/prices?status=pending
   ```

2. **Check statistics before cleanup:**
   ```http
   GET /api/cleanup/pending-prices/statistics
   ```

3. **Manually trigger cleanup:**
   ```http
   POST /api/cleanup/pending-prices/run
   ```

## Troubleshooting

### Cleanup not running automatically

1. Check scheduler status:
   ```http
   GET /api/cleanup/pending-prices/scheduler/status
   ```

2. Check server logs for startup messages:
   ```
   [PendingPriceCleanupScheduler] Starting scheduler...
   [PendingPriceCleanupScheduler] Scheduler started. Cleanup scheduled for 2:00 AM daily
   ```

3. Verify the API server is running continuously (not restarted frequently)

### Too many old pending records

This could indicate:
- Orders are not being created as expected
- PDF imports are failing or being delayed
- Business process changed (orders no longer created for some price imports)

**Solution:** Review the pending records to understand why orders aren't being created:
```http
GET /api/cleanup/pending-prices/prices?status=pending
```

### Need to preserve records longer

Modify the configuration in the service initialization:

```typescript
// In pendingOrderPriceCleanupService.ts or custom initialization
const service = new PendingOrderPriceCleanupService(prisma, {
  pendingMaxAgeDays: 60,  // Keep pending records for 60 days
  appliedMaxAgeDays: 30,  // Keep applied records for 30 days
});
```

## Architecture

The cleanup system follows the layered architecture pattern:

```
Routes (HTTP)
  ↓
Handlers (Request/Response)
  ↓
Service (Business Logic)
  ↓
Repository (Data Access)
  ↓
Prisma (ORM)
  ↓
Database
```

### Files

- **Repository:** `src/repositories/PendingOrderPriceRepository.ts`
  - Data access layer for pending prices
  - Database queries and operations

- **Service:** `src/services/pendingOrderPriceCleanupService.ts`
  - Business logic for cleanup process
  - Implements cleanup rules

- **Scheduler:** `src/services/pendingOrderPriceCleanupScheduler.ts`
  - Automatic scheduling using node-cron
  - Runs cleanup daily at 2:00 AM

- **Handler:** `src/handlers/pendingOrderPriceCleanupHandler.ts`
  - HTTP request/response handling
  - Request validation and formatting

- **Routes:** `src/routes/pending-order-price-cleanup.ts`
  - API endpoint definitions
  - Route registration

## Testing

### Manual Test Cleanup

```bash
# Test the cleanup endpoint
curl -X POST http://localhost:3000/api/cleanup/pending-prices/run

# Check statistics
curl http://localhost:3000/api/cleanup/pending-prices/statistics

# Check scheduler status
curl http://localhost:3000/api/cleanup/pending-prices/scheduler/status
```

### Creating Test Data

To test the cleanup process, you can manually create test records in the database:

```sql
-- Create a pending record older than 30 days
INSERT INTO pending_order_prices (
  order_number, currency, value_netto, filename, filepath,
  status, created_at, updated_at
) VALUES (
  'TEST-001', 'PLN', 100000, 'test.pdf', '/path/test.pdf',
  'pending', datetime('now', '-35 days'), datetime('now')
);

-- Create an applied record older than 7 days
INSERT INTO pending_order_prices (
  order_number, currency, value_netto, filename, filepath,
  status, applied_at, applied_to_order_id, created_at, updated_at
) VALUES (
  'TEST-002', 'PLN', 150000, 'test2.pdf', '/path/test2.pdf',
  'applied', datetime('now', '-10 days'), 1, datetime('now', '-10 days'), datetime('now')
);
```

Then run the cleanup and verify the records are processed correctly.

## Future Enhancements

Potential improvements for the cleanup system:

1. **Configurable via API/UI:** Allow admins to change cleanup settings without code changes
2. **Notification system:** Send alerts when cleanup runs or encounters issues
3. **Audit log:** Keep detailed history of what was cleaned up and when
4. **Soft delete:** Archive records instead of hard delete for compliance
5. **Cleanup dry-run mode:** Preview what would be deleted without actually deleting
6. **Metrics dashboard:** Visualize cleanup statistics over time

## Support

For issues or questions about the cleanup system:
1. Check server logs for error messages
2. Review API endpoint responses for detailed information
3. Use statistics endpoint to understand current state
4. Contact the development team if issues persist
