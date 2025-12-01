# Test API endpoints

Write-Host "Testing OKUC API Endpoints" -ForegroundColor Cyan

# Test 1: Get articles (should be empty)
Write-Host "`n1. GET /api/okuc/articles" -ForegroundColor Yellow
$articles = Invoke-WebRequest -Uri 'http://localhost:3001/api/okuc/articles' -UseBasicParsing | ConvertFrom-Json
Write-Host "Response: $($articles | ConvertTo-Json)" -ForegroundColor Green

# Test 2: Create article
Write-Host "`n2. POST /api/okuc/articles" -ForegroundColor Yellow
$json = @{
    articleNumber = "UCHW-001"
    name = "Uchwyty plastikowe 10mm"
    description = "Uchwyty do okien plastikowych"
    group = "UCHWYTY"
    warehouse = "A1"
    price = 2.50
    minStock = 50
    maxStock = 200
    orderType = "Po RW"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/okuc/articles' -Method POST -ContentType 'application/json' -Body $json -UseBasicParsing
$article = $response.Content | ConvertFrom-Json
Write-Host "Created article: $($article.id) - $($article.name)" -ForegroundColor Green

# Test 3: Get articles again
Write-Host "`n3. GET /api/okuc/articles (after create)" -ForegroundColor Yellow
$articles = Invoke-WebRequest -Uri 'http://localhost:3001/api/okuc/articles' -UseBasicParsing | ConvertFrom-Json
Write-Host "Total articles: $($articles.articles.Length)" -ForegroundColor Green

# Test 4: Get stock summary
Write-Host "`n4. GET /api/okuc/stock/summary" -ForegroundColor Yellow
$summary = Invoke-WebRequest -Uri 'http://localhost:3001/api/okuc/stock/summary' -UseBasicParsing | ConvertFrom-Json
Write-Host "Total Articles: $($summary.totalArticles)" -ForegroundColor Green
Write-Host "Total Quantity: $($summary.totalQuantity)" -ForegroundColor Green

# Test 5: Create order
Write-Host "`n5. POST /api/okuc/orders" -ForegroundColor Yellow
$orderJson = @{
    articleId = $article.id
    orderedQuantity = 100
    expectedDeliveryDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
    notes = "Test order"
} | ConvertTo-Json

$orderResponse = Invoke-WebRequest -Uri 'http://localhost:3001/api/okuc/orders' -Method POST -ContentType 'application/json' -Body $orderJson -UseBasicParsing
$order = $orderResponse.Content | ConvertFrom-Json
Write-Host "Created order: $($order.id)" -ForegroundColor Green

# Test 6: Get orders
Write-Host "`n6. GET /api/okuc/orders" -ForegroundColor Yellow
$orders = Invoke-WebRequest -Uri 'http://localhost:3001/api/okuc/orders' -UseBasicParsing | ConvertFrom-Json
Write-Host "Total orders: $($orders.orders.Length)" -ForegroundColor Green

Write-Host "`nAll tests completed successfully!" -ForegroundColor Cyan
