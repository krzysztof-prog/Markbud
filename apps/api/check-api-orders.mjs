async function checkOrders() {
  const response = await fetch('http://localhost:3001/api/orders?archived=false');
  const data = await response.json();

  console.log('Response status:', response.status);
  console.log('Data keys:', Object.keys(data));
  console.log('Has data.data?', !!data.data);

  if (!data.data) {
    console.log('Full response:', JSON.stringify(data, null, 2));
    return;
  }

  const orders = data.data.filter(o => ['53714', '53716'].includes(o.orderNumber));

  orders.forEach(order => {
    console.log(`Order ${order.orderNumber}:`);
    console.log(`  schucoLinks:`, order.schucoLinks);
    console.log(`  Has schucoLinks:`, Array.isArray(order.schucoLinks));
    console.log(`  Count:`, order.schucoLinks?.length || 0);
    console.log();
  });
}

checkOrders().catch(console.error);
