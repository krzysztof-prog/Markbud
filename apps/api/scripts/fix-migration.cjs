const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '../prisma/migrations/20260121100000_add_okuc_initial_stock_and_seed/migration.sql');
let sql = fs.readFileSync(migrationPath, 'utf8');

// Znajdź i zamień problematyczny INSERT z VALUES na pojedyncze INSERTy
const stocksInsertRegex = /INSERT INTO "okuc_stocks"[\s\S]*?FROM \(VALUES([\s\S]*?)\) AS qty\(article_id, quantity, is_uncertain\)\s*JOIN "okuc_articles" a ON a\."article_id" = qty\.article_id;/;

const match = sql.match(stocksInsertRegex);
if (match) {
    const valuesStr = match[1];
    // Parsuj wartości - format: ('article_id', quantity, true/false)
    const valueRegex = /\('([^']+)',\s*(\d+),\s*(true|false)\)/g;
    let valueMatch;
    const inserts = [];

    while ((valueMatch = valueRegex.exec(valuesStr)) !== null) {
        const articleId = valueMatch[1];
        const qty = valueMatch[2];
        const uncertain = valueMatch[3] === 'true' ? 1 : 0;
        inserts.push(`INSERT INTO "okuc_stocks" ("article_id", "warehouse_type", "sub_warehouse", "current_quantity", "initial_quantity", "is_quantity_uncertain", "reserved_qty", "version", "updated_at")
SELECT a.id, 'pvc', 'production', ${qty}, ${qty}, ${uncertain}, 0, 0, CURRENT_TIMESTAMP FROM "okuc_articles" a WHERE a."article_id" = '${articleId}';`);
    }

    const newInserts = inserts.join('\n');
    sql = sql.replace(match[0], newInserts);

    fs.writeFileSync(migrationPath, sql);
    console.log(`Fixed migration - replaced VALUES clause with ${inserts.length} individual INSERTs`);
} else {
    console.log('Pattern not found - migration may already be fixed');
}
