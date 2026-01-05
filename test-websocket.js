// Simple WebSocket connection test using fetch to check endpoint
const WS_URL = 'ws://localhost:4000/ws';
const HTTP_URL = 'http://localhost:4000/ws';

console.log(`\nTesting WebSocket endpoint availability...\n`);
console.log(`WebSocket URL: ${WS_URL}`);
console.log(`HTTP check URL: ${HTTP_URL}\n`);

// Try to hit the endpoint with HTTP to see what happens
try {
  const response = await fetch(HTTP_URL, {
    method: 'GET',
    headers: {
      'Connection': 'Upgrade',
      'Upgrade': 'websocket',
      'Sec-WebSocket-Version': '13',
      'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
    }
  });

  console.log('✅ HTTP Response Status:', response.status);
  console.log('✅ HTTP Response Headers:', Object.fromEntries(response.headers.entries()));

  if (response.status === 101) {
    console.log('\n✅ Server supports WebSocket upgrade!');
  } else {
    console.log('\n⚠️  Server did not upgrade to WebSocket. Status:', response.status);
  }
} catch (error) {
  console.error('❌ Error testing WebSocket endpoint:', error.message);
}

console.log('\n\nNow testing with browser WebSocket API simulation...\n');

// For Node.js, we need to check if WebSocket is available
if (typeof WebSocket === 'undefined') {
  console.log('⚠️  WebSocket not available in Node.js context');
  console.log('Please test this in the browser console instead.');
  console.log('\nBrowser test code:');
  console.log(`
const ws = new WebSocket('${WS_URL}');
ws.onopen = () => console.log('✅ Connected');
ws.onmessage = (e) => console.log('📨 Message:', e.data);
ws.onerror = (e) => console.error('❌ Error:', e);
ws.onclose = () => console.log('🔌 Closed');
  `);
}
