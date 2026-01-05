const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'apps', 'api', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Replace all nullable userId fields with NOT NULL
const replacements = [
  // WarehouseStock
  {
    old: `  updatedById         Int?     @map("updated_by_id")
  initialStockBeams   Int      @default(0) @map("initial_stock_beams")
  version             Int      @default(0)
  updatedBy           User?    @relation("UpdatedBy", fields: [updatedById], references: [id])`,
    new: `  updatedById         Int      @map("updated_by_id")
  initialStockBeams   Int      @default(0) @map("initial_stock_beams")
  version             Int      @default(0)
  updatedBy           User     @relation("UpdatedBy", fields: [updatedById], references: [id])`
  },
  // WarehouseOrder
  {
    old: `  createdById          Int?     @map("created_by_id")
  createdBy            User?    @relation("WarehouseOrderCreatedBy", fields: [createdById], references: [id])`,
    new: `  createdById          Int      @map("created_by_id")
  createdBy            User     @relation("WarehouseOrderCreatedBy", fields: [createdById], references: [id])`
  },
  // WarehouseHistory
  {
    old: `  recordedById    Int?     @map("recorded_by_id")
  recordedBy      User?    @relation("RecordedBy", fields: [recordedById], references: [id])`,
    new: `  recordedById    Int      @map("recorded_by_id")
  recordedBy      User     @relation("RecordedBy", fields: [recordedById], references: [id])`
  },
  // OkucStock
  {
    old: `  updatedById     Int?        @map("updated_by_id")
  updatedBy       User?       @relation("OkucUpdatedBy", fields: [updatedById], references: [id])`,
    new: `  updatedById     Int         @map("updated_by_id")
  updatedBy       User        @relation("OkucUpdatedBy", fields: [updatedById], references: [id])`
  },
  // OkucOrder
  {
    old: `  createdById          Int?        @map("created_by_id")
  createdBy            User?       @relation("OkucCreatedBy", fields: [createdById], references: [id])`,
    new: `  createdById          Int         @map("created_by_id")
  createdBy            User        @relation("OkucCreatedBy", fields: [createdById], references: [id])`
  },
  // OkucRequirement
  {
    old: `  recordedById   Int?        @map("recorded_by_id")
  recordedBy     User?       @relation("OkucRecordedBy", fields: [recordedById], references: [id])`,
    new: `  recordedById   Int         @map("recorded_by_id")
  recordedBy     User        @relation("OkucRecordedBy", fields: [recordedById], references: [id])`
  },
  // OkucHistory
  {
    old: `  recordedById    Int?        @map("recorded_by_id")
  recordedBy      User?       @relation("OkucRecordedBy", fields: [recordedById], references: [id])
  article         OkucArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)`,
    new: `  recordedById    Int         @map("recorded_by_id")
  recordedBy      User        @relation("OkucRecordedBy", fields: [recordedById], references: [id])
  article         OkucArticle @relation(fields: [articleId], references: [id], onDelete: Cascade)`
  },
  // OkucImport
  {
    old: `  createdById  Int?      @map("created_by_id")
  createdBy    User?     @relation("OkucImportedBy", fields: [createdById], references: [id])`,
    new: `  createdById  Int       @map("created_by_id")
  createdBy    User      @relation("OkucImportedBy", fields: [createdById], references: [id])`
  },
  // Note
  {
    old: `  createdById Int?     @map("created_by_id")
  updatedAt   DateTime @updatedAt @map("updated_at")
  createdBy   User?    @relation(fields: [createdById], references: [id])`,
    new: `  createdById Int      @map("created_by_id")
  updatedAt   DateTime @updatedAt @map("updated_at")
  createdBy   User     @relation(fields: [createdById], references: [id])`
  }
];

let changeCount = 0;
for (const replacement of replacements) {
  if (schema.includes(replacement.old)) {
    schema = schema.replace(replacement.old, replacement.new);
    changeCount++;
  }
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log(`Updated schema.prisma with ${changeCount} changes`);
