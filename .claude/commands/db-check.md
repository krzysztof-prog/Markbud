# Database Health Check

Sprawdza spójność i integralność bazy danych.

## Kiedy używać

- Po migracji
- Gdy coś "dziwnie działa"
- Przed deploy
- Okresowo (raz na tydzień)

## Co sprawdzam

### 1. Orphaned Records (osierocone rekordy)

```sql
-- Zlecenia bez klienta
SELECT o.id, o.orderNumber
FROM orders o
LEFT JOIN clients c ON o.clientId = c.id
WHERE c.id IS NULL;

-- Pozycje bez zlecenia
SELECT r.id
FROM order_requirements r
LEFT JOIN orders o ON r.orderId = o.id
WHERE o.id IS NULL;

-- Dostawy bez zleceń (puste)
SELECT d.id, d.name
FROM deliveries d
LEFT JOIN orders o ON o.deliveryId = d.id
GROUP BY d.id
HAVING COUNT(o.id) = 0;
```

### 2. Missing Required Relations

```sql
-- Zlecenia bez wymagań (powinny mieć min. 1)
SELECT o.id, o.orderNumber
FROM orders o
LEFT JOIN order_requirements r ON r.orderId = o.id
GROUP BY o.id
HAVING COUNT(r.id) = 0;

-- Profile bez kolorów (powinny mieć min. 1)
SELECT p.id, p.code
FROM profiles p
LEFT JOIN profile_colors pc ON pc.profileId = p.id
GROUP BY p.id
HAVING COUNT(pc.id) = 0;
```

### 3. Data Integrity

```sql
-- Wartości ujemne gdzie nie powinny być
SELECT id, orderNumber, valuePln
FROM orders
WHERE valuePln < 0;

-- Daty w przyszłości (gdzie nie powinny)
SELECT id, orderNumber, completedAt
FROM orders
WHERE completedAt > datetime('now');

-- Statusy w nieprawidłowym stanie
SELECT id, orderNumber, status
FROM orders
WHERE status NOT IN ('pending', 'inProgress', 'completed', 'cancelled');

-- NULL gdzie nie powinno być
SELECT id FROM orders WHERE orderNumber IS NULL;
```

### 4. Duplicate Detection

```sql
-- Zduplikowane numery zleceń
SELECT orderNumber, COUNT(*) as cnt
FROM orders
GROUP BY orderNumber
HAVING cnt > 1;

-- Zduplikowane kody profili
SELECT code, COUNT(*) as cnt
FROM profiles
GROUP BY code
HAVING cnt > 1;
```

### 5. Soft Delete Consistency

```sql
-- Zlecenia oznaczone jako usunięte ale nadal w aktywnych dostawach
SELECT o.id, o.orderNumber, d.name
FROM orders o
JOIN deliveries d ON o.deliveryId = d.id
WHERE o.deletedAt IS NOT NULL
AND d.deletedAt IS NULL;
```

### 6. Index Health

```sql
-- Sprawdź czy indeksy istnieją (SQLite)
SELECT name, sql FROM sqlite_master WHERE type='index';

-- Analiza query planu dla wolnych zapytań
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE status = 'pending';
```

### 7. Storage Stats

```sql
-- Rozmiar tabel
SELECT
  name,
  (SELECT COUNT(*) FROM orders) as orders_count,
  (SELECT COUNT(*) FROM order_requirements) as requirements_count,
  (SELECT COUNT(*) FROM deliveries) as deliveries_count;

-- Soft deleted records (do cleanup?)
SELECT
  'orders' as table_name,
  COUNT(*) as deleted_count
FROM orders WHERE deletedAt IS NOT NULL
UNION ALL
SELECT
  'deliveries',
  COUNT(*)
FROM deliveries WHERE deletedAt IS NOT NULL;
```

## Raport

```markdown
## Database Health Report

### Date: [data]
### Database: apps/api/prisma/dev.db
### Size: 45.2 MB

---

### Summary

| Check | Status | Issues |
|-------|--------|--------|
| Orphaned Records | ✅ OK | 0 |
| Missing Relations | ⚠️ WARN | 3 |
| Data Integrity | ✅ OK | 0 |
| Duplicates | ❌ FAIL | 2 |
| Soft Delete | ✅ OK | 0 |
| Indexes | ✅ OK | All present |

---

### Issues Found

#### CRITICAL: Duplicate Order Numbers
| orderNumber | Count | IDs |
|-------------|-------|-----|
| ZAM-2024-001 | 2 | 123, 456 |
| ZAM-2024-015 | 2 | 789, 012 |

**Action Required**: Sprawdź i usuń duplikaty ręcznie

#### WARNING: Orders Without Requirements
| Order ID | Order Number |
|----------|--------------|
| 234 | ZAM-2024-100 |
| 567 | ZAM-2024-105 |
| 890 | ZAM-2024-110 |

**Action**: Dodaj wymagania lub usuń puste zlecenia

---

### Statistics

| Table | Total | Active | Deleted |
|-------|-------|--------|---------|
| orders | 2,500 | 2,450 | 50 |
| deliveries | 150 | 148 | 2 |
| profiles | 89 | 89 | 0 |
| clients | 45 | 45 | 0 |

---

### Recommendations

1. **URGENT**: Rozwiąż zduplikowane numery zleceń
2. **REVIEW**: Sprawdź 3 zlecenia bez wymagań
3. **OPTIONAL**: Rozważ czyszczenie 50 soft-deleted zleceń (starszych niż 6 miesięcy)

---

### Next Check

Zalecane uruchomienie: za 7 dni
```

## Komendy

```bash
# Uruchom wszystkie sprawdzenia
/db-check

# Tylko orphaned records
/db-check orphans

# Tylko duplicates
/db-check duplicates

# Z auto-fix (dla bezpiecznych operacji)
/db-check --fix
```

## Auto-fix (bezpieczne operacje)

Mogę automatycznie naprawić:
- ✅ Usunięcie orphaned records (po potwierdzeniu)
- ✅ Cleanup soft-deleted starszych niż X dni
- ❌ NIE: Duplikaty (wymagają ręcznej decyzji)
- ❌ NIE: Missing relations (wymagają analizy)

## Teraz

Powiedz "sprawdź" a wykonam pełny health check bazy danych.
