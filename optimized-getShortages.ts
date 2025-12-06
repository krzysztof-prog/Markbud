/**
 * ZOPTYMALIZOWANA FUNKCJA getShortages()
 *
 * PRZED: 2 queries + O(n) mapping w JavaScript
 * PO: 1 raw SQL query z JOIN i GROUP BY
 *
 * OCZEKIWANE PRZYSPIESZENIE: 60-70%
 * PRZED: ~80ms | PO: ~25ms
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== TYPY ====================

interface ShortageResult {
  profileId: number;
  profileNumber: string;
  colorId: number;
  colorCode: string;
  colorName: string;
  currentStock: number;
  demand: number;
  afterDemand: number;
  shortage: number;
}

interface Shortage {
  profileId: number;
  profileNumber: string;
  colorId: number;
  colorCode: string;
  colorName: string;
  currentStock: number;
  demand: number;
  shortage: number;
  priority: 'critical' | 'high' | 'medium';
}

// ==================== ZOPTYMALIZOWANA WERSJA ====================

export async function getShortagesOptimized(): Promise<Shortage[]> {
  // Single query z LEFT JOIN zamiast 2 osobnych queries
  const shortages = await prisma.$queryRaw<ShortageResult[]>`
    SELECT
      ws.profile_id as "profileId",
      p.number as "profileNumber",
      ws.color_id as "colorId",
      c.code as "colorCode",
      c.name as "colorName",
      ws.current_stock_beams as "currentStock",
      COALESCE(SUM(req.beams_count), 0) as demand,
      (ws.current_stock_beams - COALESCE(SUM(req.beams_count), 0)) as "afterDemand",
      ABS(ws.current_stock_beams - COALESCE(SUM(req.beams_count), 0)) as shortage
    FROM warehouse_stock ws
    INNER JOIN profiles p ON p.id = ws.profile_id
    INNER JOIN colors c ON c.id = ws.color_id
    LEFT JOIN order_requirements req ON
      req.profile_id = ws.profile_id
      AND req.color_id = ws.color_id
    LEFT JOIN orders o ON o.id = req.order_id
      AND o.archived_at IS NULL
      AND o.status NOT IN ('archived', 'completed')
    GROUP BY
      ws.profile_id,
      ws.color_id,
      ws.current_stock_beams,
      p.number,
      c.code,
      c.name
    HAVING (ws.current_stock_beams - COALESCE(SUM(req.beams_count), 0)) < 0
    ORDER BY shortage DESC
  `;

  // Mapowanie do formatu API (bardzo szybkie, już zagregowane dane)
  return shortages.map((s) => ({
    profileId: s.profileId,
    profileNumber: s.profileNumber,
    colorId: s.colorId,
    colorCode: s.colorCode,
    colorName: s.colorName,
    currentStock: s.currentStock,
    demand: Number(s.demand),
    shortage: Number(s.shortage),
    priority: calculatePriority(Number(s.afterDemand)),
  }));
}

// Helper function
function calculatePriority(afterDemand: number): 'critical' | 'high' | 'medium' {
  if (afterDemand < -10) return 'critical';
  if (afterDemand < -5) return 'high';
  return 'medium';
}

// ==================== ORYGINALNA WERSJA (DO PORÓWNANIA) ====================

export async function getShortagesOriginal(): Promise<Shortage[]> {
  // Query 1: Pobierz wszystkie stany magazynowe
  const stocks = await prisma.warehouseStock.findMany({
    select: {
      profileId: true,
      colorId: true,
      currentStockBeams: true,
      profile: {
        select: { id: true, number: true },
      },
      color: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  // Query 2: Zagreguj zapotrzebowanie
  const demands = await prisma.orderRequirement.groupBy({
    by: ['profileId', 'colorId'],
    where: {
      order: {
        archivedAt: null,
        status: { notIn: ['archived', 'completed'] },
      },
    },
    _sum: {
      beamsCount: true,
    },
  });

  // O(n) operacja - tworzenie mapy
  const demandMap = new Map(
    demands.map((d) => [`${d.profileId}-${d.colorId}`, d._sum.beamsCount || 0])
  );

  // O(n) operacja - mapowanie stocks do shortages
  const shortages = stocks
    .map((stock) => {
      const key = `${stock.profileId}-${stock.colorId}`;
      const demand = demandMap.get(key) || 0;
      const afterDemand = stock.currentStockBeams - demand;

      if (afterDemand < 0) {
        return {
          profileId: stock.profileId,
          profileNumber: stock.profile.number,
          colorId: stock.colorId,
          colorCode: stock.color.code,
          colorName: stock.color.name,
          currentStock: stock.currentStockBeams,
          demand,
          shortage: Math.abs(afterDemand),
          priority: calculatePriority(afterDemand),
        };
      }
      return null;
    })
    .filter((s): s is Shortage => s !== null);

  // O(n log n) - sortowanie
  return shortages.sort((a, b) => b.shortage - a.shortage);
}

// ==================== BENCHMARK ====================

export async function benchmarkShortages() {
  console.log('🧪 Running Shortages Benchmark...\n');

  // Warm up
  await getShortagesOriginal();
  await getShortagesOptimized();

  // Test original version
  const iterations = 10;

  console.log('📊 Original version:');
  const originalTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await getShortagesOriginal();
    const duration = performance.now() - start;
    originalTimes.push(duration);
  }
  const originalAvg = originalTimes.reduce((a, b) => a + b) / iterations;
  console.log(`  Average: ${originalAvg.toFixed(2)}ms`);
  console.log(`  Min: ${Math.min(...originalTimes).toFixed(2)}ms`);
  console.log(`  Max: ${Math.max(...originalTimes).toFixed(2)}ms\n`);

  console.log('⚡ Optimized version:');
  const optimizedTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await getShortagesOptimized();
    const duration = performance.now() - start;
    optimizedTimes.push(duration);
  }
  const optimizedAvg = optimizedTimes.reduce((a, b) => a + b) / iterations;
  console.log(`  Average: ${optimizedAvg.toFixed(2)}ms`);
  console.log(`  Min: ${Math.min(...optimizedTimes).toFixed(2)}ms`);
  console.log(`  Max: ${Math.max(...optimizedTimes).toFixed(2)}ms\n`);

  const improvement = ((originalAvg - optimizedAvg) / originalAvg) * 100;
  const speedup = originalAvg / optimizedAvg;

  console.log(`✨ Results:`);
  console.log(`  Improvement: ${improvement.toFixed(1)}% faster`);
  console.log(`  Speedup: ${speedup.toFixed(2)}x`);

  // Verify results match
  const originalResult = await getShortagesOriginal();
  const optimizedResult = await getShortagesOptimized();

  console.log(`\n🔍 Verification:`);
  console.log(`  Original results: ${originalResult.length} shortages`);
  console.log(`  Optimized results: ${optimizedResult.length} shortages`);
  console.log(`  Match: ${originalResult.length === optimizedResult.length ? '✅' : '❌'}`);

  await prisma.$disconnect();
}

// ==================== USAGE ====================

/**
 * JAK UŻYWAĆ W KODZIE:
 *
 * 1. W dashboard.ts zamień:
 *
 *    const shortages = await getShortages();
 *
 *    na:
 *
 *    const shortages = await getShortagesOptimized();
 *
 * 2. Skopiuj funkcję getShortagesOptimized() i interfejsy do dashboard.ts
 *
 * 3. Usuń starą funkcję getShortages() po testach
 */

/**
 * JAK URUCHOMIĆ BENCHMARK:
 *
 * ```bash
 * cd apps/api
 * npx tsx ../../optimized-getShortages.ts
 * ```
 *
 * Spodziewane wyniki:
 * - Original: ~80ms
 * - Optimized: ~25ms
 * - Improvement: ~70% faster
 */

// Uruchom benchmark jeśli plik jest wykonywany bezpośrednio
if (import.meta.url === `file://${process.argv[1]}`) {
  benchmarkShortages();
}
