/**
 * Warehouse utility functions
 * Helper functions for warehouse operations, demand calculations, and data transformations
 */

/**
 * Groups an array of items by a specified key
 *
 * @template T - The type of items in the array
 * @template K - The type of the key (string or number)
 * @param items - Array of items to group
 * @param keySelector - Function to extract the grouping key from each item
 * @returns Map where keys are the grouping values and values are arrays of items
 *
 * @example
 * const orders = [
 *   { id: 1, status: 'pending' },
 *   { id: 2, status: 'completed' },
 *   { id: 3, status: 'pending' }
 * ];
 * const grouped = groupBy(orders, (order) => order.status);
 * // Map { 'pending' => [{id: 1, ...}, {id: 3, ...}], 'completed' => [{id: 2, ...}] }
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keySelector: (item: T) => K
): Map<K, T[]> {
  const map = new Map<K, T[]>();

  for (const item of items) {
    const key = keySelector(item);
    const group = map.get(key);

    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  return map;
}

/**
 * Thresholds for shortage priority calculation
 */
const CRITICAL_THRESHOLD = -10;
const HIGH_THRESHOLD = -5;

/**
 * Calculates shortage priority based on afterDemand value
 *
 * Priority levels:
 * - critical: afterDemand <= -10 (severe shortage)
 * - high: -10 < afterDemand <= -5 (significant shortage)
 * - medium: afterDemand > -5 (minor shortage)
 *
 * @param afterDemand - The remaining stock after demand (negative values indicate shortage)
 * @returns Priority level as 'critical', 'high', or 'medium'
 *
 * @example
 * calculateShortagePriority(-15); // 'critical'
 * calculateShortagePriority(-7);  // 'high'
 * calculateShortagePriority(-3);  // 'medium'
 * calculateShortagePriority(5);   // 'medium' (positive values treated as medium)
 */
export function calculateShortagePriority(
  afterDemand: number
): 'critical' | 'high' | 'medium' {
  if (afterDemand <= CRITICAL_THRESHOLD) {
    return 'critical';
  }

  if (afterDemand <= HIGH_THRESHOLD) {
    return 'high';
  }

  return 'medium';
}

/**
 * Summary of demand for a profile
 */
export interface DemandSummary {
  /** Total number of beams (beli) required */
  beams: number;
  /** Total length in meters required */
  meters: number;
}

/**
 * Creates a Map of profile demands from Prisma groupBy results
 *
 * @param demands - Array of demand aggregations from Prisma groupBy query
 * @returns Map where keys are profileIds and values are DemandSummary objects
 *
 * @example
 * const demands = [
 *   { profileId: 1, _sum: { requiredBeams: 10, requiredMeters: 50.5 } },
 *   { profileId: 2, _sum: { requiredBeams: 5, requiredMeters: 25.0 } }
 * ];
 * const demandMap = createDemandMap(demands);
 * // Map { 1 => { beams: 10, meters: 50.5 }, 2 => { beams: 5, meters: 25.0 } }
 */
export function createDemandMap(
  demands: Array<{
    profileId: number;
    _sum: {
      requiredBeams: number | null;
      requiredMeters: number | null;
    };
  }>
): Map<number, DemandSummary> {
  const demandMap = new Map<number, DemandSummary>();

  for (const demand of demands) {
    demandMap.set(demand.profileId, {
      beams: demand._sum.requiredBeams ?? 0,
      meters: demand._sum.requiredMeters ?? 0,
    });
  }

  return demandMap;
}

/**
 * Checks if a date is within 24 hours from now
 *
 * @param date - The date to check
 * @returns true if the date is within 24 hours (past or future), false otherwise
 *
 * @example
 * const tomorrow = new Date(Date.now() + 23 * 60 * 60 * 1000);
 * isWithin24Hours(tomorrow); // true
 *
 * const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
 * isWithin24Hours(nextWeek); // false
 *
 * const yesterday = new Date(Date.now() - 23 * 60 * 60 * 1000);
 * isWithin24Hours(yesterday); // true
 */
export function isWithin24Hours(date: Date): boolean {
  const now = new Date();
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
  const timeDifference = Math.abs(date.getTime() - now.getTime());

  return timeDifference <= twentyFourHoursInMs;
}
