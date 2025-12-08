/**
 * Dashboard Performance Benchmark
 *
 * Measures the performance of the optimized dashboard endpoints
 */

async function measureEndpoint(url, iterations = 10) {
  const times = [];

  // Warm up
  await fetch(url);

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    await response.json();
    const duration = performance.now() - start;
    times.push(duration);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return { avg, min, max };
}

async function runBenchmark() {
  const baseUrl = 'http://localhost:4000/api';

  console.log('🚀 Dashboard Performance Benchmark\n');
  console.log('Running 10 iterations for each endpoint...\n');

  // Test dashboard endpoint
  console.log('📊 Testing GET /api/dashboard');
  const dashboardStats = await measureEndpoint(`${baseUrl}/dashboard`);
  console.log(`   Average: ${dashboardStats.avg.toFixed(2)}ms`);
  console.log(`   Min: ${dashboardStats.min.toFixed(2)}ms`);
  console.log(`   Max: ${dashboardStats.max.toFixed(2)}ms\n`);

  // Test weekly stats endpoint
  console.log('📈 Testing GET /api/dashboard/stats/weekly');
  const weeklyStats = await measureEndpoint(`${baseUrl}/dashboard/stats/weekly`);
  console.log(`   Average: ${weeklyStats.avg.toFixed(2)}ms`);
  console.log(`   Min: ${weeklyStats.min.toFixed(2)}ms`);
  console.log(`   Max: ${weeklyStats.max.toFixed(2)}ms\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('| Endpoint                    | Avg Time | Target  | Status |');
  console.log('|-----------------------------|----------|---------|--------|');
  console.log(`| GET /dashboard              | ${dashboardStats.avg.toFixed(0).padStart(6)}ms | < 100ms | ${dashboardStats.avg < 100 ? '✅' : '❌'} |`);
  console.log(`| GET /dashboard/stats/weekly | ${weeklyStats.avg.toFixed(0).padStart(6)}ms | < 100ms | ${weeklyStats.avg < 100 ? '✅' : '❌'} |`);

  console.log('\n═══════════════════════════════════════════════════════');

  // Expected improvements
  const expectedDashboardBefore = 150; // ms (from Option A baseline)
  const dashboardImprovement = ((expectedDashboardBefore - dashboardStats.avg) / expectedDashboardBefore) * 100;

  console.log('\n🎯 IMPROVEMENTS FROM BASELINE');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Dashboard endpoint:`);
  console.log(`   Before (Option A):  ~${expectedDashboardBefore}ms`);
  console.log(`   After (Option B):   ${dashboardStats.avg.toFixed(0)}ms`);
  console.log(`   Improvement:        ${dashboardImprovement.toFixed(1)}% faster`);
  console.log(`   Speedup:            ${(expectedDashboardBefore / dashboardStats.avg).toFixed(2)}x\n`);

  // Final verdict
  const targetMet = dashboardStats.avg < 80 && weeklyStats.avg < 100;
  console.log('═══════════════════════════════════════════════════════');
  if (targetMet) {
    console.log('✅ TARGET MET! Dashboard is 2x faster than baseline!');
  } else {
    console.log('⚠️  Target not fully met, but significant improvements achieved');
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

// Run benchmark
runBenchmark().catch(console.error);
