// Test glass delivery status logic
const testOrders = [
  { orderNumber: '53348', orderedGlassCount: 5, deliveredGlassCount: 10, glassDeliveryDate: null },
  { orderNumber: '53526', orderedGlassCount: 15, deliveredGlassCount: 8, glassDeliveryDate: null },
  { orderNumber: '53387', orderedGlassCount: 6, deliveredGlassCount: 0, glassDeliveryDate: null },
  { orderNumber: '53426', orderedGlassCount: 6, deliveredGlassCount: 0, glassDeliveryDate: '2025-01-15' },
  { orderNumber: '53314', orderedGlassCount: 0, deliveredGlassCount: 0, glassDeliveryDate: null },
];

function getGlassStatus(order) {
  const ordered = order.orderedGlassCount ?? 0;
  const delivered = order.deliveredGlassCount ?? 0;

  if (ordered === 0) {
    return { content: '-', color: 'gray' };
  } else if (delivered >= ordered) {
    return { content: 'Dostarczono', color: 'green' };
  } else if (delivered > 0) {
    return { content: `Częściowo: ${delivered}/${ordered}`, color: 'yellow' };
  } else if (order.glassDeliveryDate) {
    return { content: `Data: ${order.glassDeliveryDate}`, color: 'orange' };
  } else {
    return { content: 'Brak daty', color: 'gray' };
  }
}

console.log('Testing glass delivery status logic:\n');
testOrders.forEach(order => {
  const status = getGlassStatus(order);
  console.log(`${order.orderNumber}: ${status.content} (${status.color})`);
  console.log(`  ordered=${order.orderedGlassCount}, delivered=${order.deliveredGlassCount}, date=${order.glassDeliveryDate}`);
});
