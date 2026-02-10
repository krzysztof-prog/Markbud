const http = require('http');

http.get('http://localhost:3001/api/orders?archived=false', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('HTTP Status:', res.statusCode);
        const response = JSON.parse(data);

        // Jeśli błąd - pokaż pełny response
        if (response.error || response.statusCode >= 400) {
            console.log('API Error:', JSON.stringify(response, null, 2));
            return;
        }

        // Response might be { data: orders } or just orders
        const orders = Array.isArray(response) ? response : (response.data || response.orders || []);
        console.log('Response type:', typeof response);
        console.log('Is array:', Array.isArray(response));
        console.log('Keys:', Object.keys(response).slice(0, 5));

        const order = orders.find(o => o.orderNumber === '53956');
        if (order) {
            console.log('\nOrder 53956 from API:');
            console.log('  orderNumber:', order.orderNumber);
            console.log('  glassDeliveryDate:', order.glassDeliveryDate);
            console.log('  glassOrderNote:', order.glassOrderNote);
            console.log('  orderedGlassCount:', order.orderedGlassCount);
            console.log('  deliveredGlassCount:', order.deliveredGlassCount);
            console.log('  totalGlasses:', order.totalGlasses);
        } else {
            console.log('Order 53956 not found in API response');
            console.log('Total orders:', orders.length);
        }
    });
}).on('error', (e) => {
    console.error('Error:', e.message);
});
