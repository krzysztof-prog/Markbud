/**
 * Apply manual SQL migration to dev.db using sqlite3 directly
 * Usage: node apply-migration-sqlite.js [migration-name]
 */

import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationName = process.argv[2] || '20251229110000_add_data_integrity_policies';
const migrationPath = path.join(__dirname, `prisma/migrations/${migrationName}/migration.sql`);
const dbPath = path.join(__dirname, 'prisma/dev.db');

console.log('Reading migration file...');
console.log(`Migration: ${migrationName}`);
console.log(`Database: ${dbPath}`);

const sql = fs.readFileSync(migrationPath, 'utf8');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to open database:', err.message);
    process.exit(1);
  }
});

console.log('\nExecuting migration...\n');

db.exec(sql, (err) => {
  if (err) {
    console.error('❌ Migration failed:', err.message);
    db.close();
    process.exit(1);
  }

  console.log('✅ Migration applied successfully!\n');

  // Verify changes
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, rows) => {
    if (err) {
      console.error('Error querying tables:', err.message);
    } else {
      console.log('Database tables:');
      rows.forEach(row => console.log(`  - ${row.name}`));
    }

    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('\n✅ Database connection closed.');
      }
    });
  });
});
