/**
 * Apply manual SQL migration to dev.db
 * Usage: node apply-migration.js
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function applyMigration() {
  // Check for command line argument for migration name
  const migrationName = process.argv[2] || '20251229110000_add_data_integrity_policies';
  const migrationPath = path.join(__dirname, `prisma/migrations/${migrationName}/migration.sql`);

  console.log('Reading migration file...');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration SQL:');
  console.log(sql);
  console.log('\n---\n');

  try {
    // Execute the entire migration as a single SQL batch
    console.log('Executing migration as single batch...');
    await prisma.$executeRawUnsafe(sql);

    console.log('\n✅ Migration applied successfully!');

    // Verify columns were added
    const result = await prisma.$queryRaw`PRAGMA table_info(warehouse_history)`;
    console.log('\nWarehouseHistory table columns:');
    console.log(result);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
