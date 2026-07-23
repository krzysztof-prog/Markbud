$dbPath = "C:\MarkBud_new\apps\api\prisma\prod.db"

# Szukamy importow tych plikow
$query1 = @"
SELECT id, filename, status, errorMessage, createdAt, metadata
FROM FileImport
WHERE filename LIKE '%D1950%' OR filename LIKE '%D1951%' OR filename LIKE '%D2958%' OR filename LIKE '%D4168%' OR filename LIKE '%D5914%' OR filename LIKE '%D6188%'
ORDER BY createdAt DESC;
"@

Write-Host "=== FileImport dla tych plikow ==="
sqlite3 $dbPath $query1

Write-Host "`n=== PendingOrderPrice dla tych zlecen ==="
$query2 = @"
SELECT id, orderNumber, filename, status, createdAt
FROM PendingOrderPrice
WHERE orderNumber IN ('D1950', 'D1951', 'D2958', 'D4168', 'D5914', 'D6188')
ORDER BY createdAt DESC;
"@
sqlite3 $dbPath $query2

Write-Host "`n=== Ceny w zleceniach ==="
$query3 = @"
SELECT orderNumber, valuePln, valueEur, status
FROM 'Order'
WHERE orderNumber IN ('D1950', 'D1951', 'D2958', 'D4168', 'D5914', 'D6188');
"@
sqlite3 $dbPath $query3
