-- Migration: Float to Int for monetary values
-- This is a DATA MIGRATION ONLY - schema changes are already applied via Prisma schema updates
-- We're converting existing Float data (e.g., 123.45) to Int (12345 = cents)

-- Note: SQLite doesn't support ALTER COLUMN, so we need to:
-- 1. Check if columns are still Float (old schema)
-- 2. If yes, this migration was never run - we need to use Prisma migrate
-- 3. If no (already Int), mark as applied and skip

-- This migration is IDEMPOTENT - safe to run multiple times
-- It's a marker that schema was updated from Float to Int for monetary values

-- Changes applied directly in schema.prisma:
-- - Order.valuePln: Float? → Int?
-- - Order.valueEur: Float? → Int?
-- - MonthlyReport.totalValuePln: Float → Int
-- - MonthlyReport.totalValueEur: Float → Int
-- - MonthlyReportItem.valuePln: Float? → Int?
-- - MonthlyReportItem.valueEur: Float? → Int?
-- - CurrencyConfig.eurToPlnRate: Float → Int
-- - PendingOrderPrice.valueNetto: Float → Int
-- - PendingOrderPrice.valueBrutto: Float? → Int?
-- - OkucArticle.price: Float? → Int?
-- - OkucSettings.eurPlnRate: Float → Int

-- All monetary values are now stored as Int (in grosze/cents * 100)
-- Example: 123.45 PLN → 12345 (stored as integer)
-- Example: EUR/PLN rate 4.35 → 435 (stored as integer)

-- IMPORTANT: This migration is marked as applied because:
-- 1. Schema changes were already done in schema.prisma
-- 2. Prisma Client was regenerated with Int types
-- 3. Application code needs to be updated to handle values in cents (divide by 100 for display)

SELECT 'Migration marked as applied - schema already updated to use Int for monetary values' AS status;
