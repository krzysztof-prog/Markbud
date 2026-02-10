const http = require('http');

http.get('http://localhost:3001/api/orders?archived=false', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      const orders = j.data || j;
      console.log('Total orders:', orders.length);

      // Sprawdz czy pole glassOrderNote jest w odpowiedzi
      if (orders.length > 0) {
        console.log('\nPrzykladowe pola pierwszego zlecenia:', Object.keys(orders[0]).filter(k => k.includes('glass')));
      }

      const withNote = orders.filter(o => o.glassOrderNote);
      console.log('\nOrders with glassOrderNote:', withNote.length);
      withNote.slice(0, 5).forEach(o => console.log(' ', o.orderNumber, o.glassOrderNote));

      const zamowione = orders.filter(o => (o.orderedGlassCount || 0) > 0 && !o.glassDeliveryDate && (o.deliveredGlassCount || 0) === 0);
      console.log('\nZamowione bez daty (delivered=0):', zamowione.length);
      zamowione.slice(0, 5).forEach(o => console.log(' ', o.orderNumber, 'ordered:', o.orderedGlassCount, 'note:', o.glassOrderNote));
    } catch(e) {
      console.log('Error parsing:', e.message);
      console.log('Response start:', data.substring(0, 300));
    }
  });
}).on('error', (e) => {
  console.log('Connection error:', e.message);
  console.log('Upewnij sie ze API dziala na porcie 3001');
});
