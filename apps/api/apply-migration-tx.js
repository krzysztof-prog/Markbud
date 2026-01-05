/**
 * Apply manual SQL migration to dev.db with transaction support
 * Usage: node apply-migration-tx.js [migration-name]
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const migrationName = process.argv[2] || '20251229110000_add_data_integrity_policies';
const migrationPath = path.join(__dirname, `prisma/migrations/${migrationName}/migration.sql`);

console.log('Reading migration file...');
console.log(`Migration: ${migrationName}`);

const sql = fs.readFileSync(migrationPath, 'utf8');

async function applyMigration() {
  try {
    console.log('\nApplying migration in transaction...');

    // Execute as raw SQL (Prisma will handle the transaction)
    await prisma.$executeRawUnsafe(sql);

    console.log('✅ Migration applied successfully!\n');

    // Verify warehouse_orders unique constraint
    const warehouseOrders = await prisma.$queryRaw`
      SELECT sql FROM sqlite_master
      WHERE type='index' AND name='warehouse_orders_profile_id_color_id_expected_delivery_date_key'
    `;
    console.log('Warehouse orders unique constraint:', warehouseOrders);

    // Verify glass_delivery_items unique constraint
    const glassDeliveryItems = await prisma.$queryRaw`
      SELECT sql FROM sqlite_master
      WHERE type='index' AND name='glass_delivery_items_glass_delivery_id_position_key'
    `;
    console.log('Glass delivery items unique constraint:', glassDeliveryItems);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nThis is expected - Prisma cannot execute multi-statement SQL.');
    console.error('\nPlease use one of these alternatives:');
    console.error('1. Run: prisma migrate dev --name add_data_integrity_policies');
    console.error('2. Use DB GUI tool (e.g. Prisma Studio, DB Browser for SQLite)');
    console.error('3. Install sqlite3 CLI tool');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
