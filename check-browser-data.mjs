/**
 * Diagnostic script to check what the frontend is actually receiving
 * Run this in the browser console on http://localhost:3000/dostawy
 */

console.log('=== DELIVERY DATA DIAGNOSTIC ===\n');

// Check if we're on the right page
if (window.location.pathname !== '/dostawy') {
  console.error('Please navigate to http://localhost:3000/dostawy first!');
} else {
  console.log('✓ On /dostawy page\n');

  // Try to access React Query cache
  const rootElement = document.getElementById('__next');
  if (rootElement && rootElement._reactRootContainer) {
    console.log('Found React root, trying to access query cache...');
  }

  // Check Network requests
  console.log('\n=== INSTRUCTIONS ===');
  console.log('1. Open DevTools Network tab (F12)');
  console.log('2. Filter by "deliveries"');
  console.log('3. Refresh the page (Ctrl+R)');
  console.log('4. Look for requests to: /api/deliveries/calendar?month=12&year=2025');
  console.log('5. Click on the request and check the "Response" tab');
  console.log('6. Find the "deliveries" array and check the "deliveryNumber" field for each delivery');
  console.log('\n=== EXPECTED VALUES ===');
  console.log('deliveryNumber: "04.12.2025_I"  (for delivery on 2025-12-04)');
  console.log('deliveryNumber: "05.12.2025_I"  (for delivery on 2025-12-05)');
  console.log('deliveryNumber: "08.12.2025_I"  (for delivery on 2025-12-08)');
  console.log('deliveryNumber: "09.12.2025_II" (for delivery on 2025-12-09)');

  console.log('\n=== WHAT TO CHECK ===');
  console.log('A) Are the deliveryNumber values CORRECT in the Network response?');
  console.log('B) Are the displayed values on the page DIFFERENT from the API response?');
  console.log('C) Check for any service worker that might cache responses');
  console.log('D) Check Application > Storage > Cache Storage for cached responses');

  // Check for service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length > 0) {
        console.log('\n⚠ SERVICE WORKERS FOUND:');
        registrations.forEach((reg, i) => {
          console.log(`  ${i + 1}. ${reg.scope} - ${reg.active?.state}`);
        });
        console.log('\nService workers might be caching API responses!');
        console.log('To clear: Application > Service Workers > Unregister');
      } else {
        console.log('\n✓ No service workers registered');
      }
    });
  }

  // Check localStorage and sessionStorage
  console.log('\n=== CHECKING STORAGE ===');
  const localKeys = Object.keys(localStorage);
  const sessionKeys = Object.keys(sessionStorage);

  if (localKeys.length > 0) {
    console.log('localStorage keys:', localKeys);
  }
  if (sessionKeys.length > 0) {
    console.log('sessionStorage keys:', sessionKeys);
  }

  // Check for React Query DevTools
  console.log('\n=== REACT QUERY CACHE ===');
  console.log('To inspect React Query cache:');
  console.log('1. Look for the React Query DevTools panel (should be bottom-left)');
  console.log('2. Find the "deliveries-calendar-continuous" query');
  console.log('3. Check the Data tab to see the actual cached data');
  console.log('4. Compare the deliveryNumber values there with what\'s displayed');
}

console.log('\n=== END DIAGNOSTIC ===');
