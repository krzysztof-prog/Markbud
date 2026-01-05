/**
 * Money Conversion Utilities
 *
 * All monetary values in the database are stored as integers (smallest currency unit):
 * - PLN: stored in grosze (1 PLN = 100 grosze)
 * - EUR: stored in cents (1 EUR = 100 cents)
 *
 * This approach:
 * - Avoids floating-point precision issues
 * - Ensures accurate calculations
 * - Follows industry best practices for financial data
 */

/**
 * Brand types for type safety
 */
export type Grosze = number & { readonly __brand: 'grosze' };
export type Centy = number & { readonly __brand: 'centy' };
export type PLN = number & { readonly __brand: 'pln' };
export type EUR = number & { readonly __brand: 'eur' };

/**
 * Convert PLN to grosze (smallest unit)
 * @param pln - Amount in PLN (e.g., 123.45)
 * @returns Amount in grosze (e.g., 12345)
 * @throws Error if precision exceeds 2 decimal places
 */
export function plnToGrosze(pln: number | PLN): Grosze {
  if (!Number.isFinite(pln)) {
    throw new Error('PLN value must be a finite number');
  }

  // Check precision (max 2 decimal places)
  const rounded = Math.round(pln * 100) / 100;
  if (Math.abs(pln - rounded) > 0.0001) {
    throw new Error(`PLN value has too much precision: ${pln}. Max 2 decimal places allowed.`);
  }

  return Math.round(pln * 100) as Grosze;
}

/**
 * Convert grosze to PLN
 * @param grosze - Amount in grosze (e.g., 12345)
 * @returns Amount in PLN (e.g., 123.45)
 */
export function groszeToPln(grosze: number | Grosze): PLN {
  if (!Number.isFinite(grosze)) {
    throw new Error('Grosze value must be a finite number');
  }

  if (!Number.isInteger(grosze)) {
    throw new Error('Grosze value must be an integer');
  }

  return (grosze / 100) as PLN;
}

/**
 * Convert EUR to cents (smallest unit)
 * @param eur - Amount in EUR (e.g., 123.45)
 * @returns Amount in cents (e.g., 12345)
 * @throws Error if precision exceeds 2 decimal places
 */
export function eurToCenty(eur: number | EUR): Centy {
  if (!Number.isFinite(eur)) {
    throw new Error('EUR value must be a finite number');
  }

  // Check precision (max 2 decimal places)
  const rounded = Math.round(eur * 100) / 100;
  if (Math.abs(eur - rounded) > 0.0001) {
    throw new Error(`EUR value has too much precision: ${eur}. Max 2 decimal places allowed.`);
  }

  return Math.round(eur * 100) as Centy;
}

/**
 * Convert cents to EUR
 * @param centy - Amount in cents (e.g., 12345)
 * @returns Amount in EUR (e.g., 123.45)
 */
export function centyToEur(centy: number | Centy): EUR {
  if (!Number.isFinite(centy)) {
    throw new Error('Centy value must be a finite number');
  }

  if (!Number.isInteger(centy)) {
    throw new Error('Centy value must be an integer');
  }

  return (centy / 100) as EUR;
}

/**
 * Convert EUR to PLN using exchange rate
 * @param eurCenty - Amount in EUR cents
 * @param rateInGrosze - Exchange rate (e.g., 450 for 4.50 PLN/EUR)
 * @returns Amount in PLN grosze
 * @throws Error if result exceeds safe integer range
 */
export function convertEurToPlnGrosze(eurCenty: Centy, rateInGrosze: number): Grosze {
  if (!Number.isInteger(eurCenty) || !Number.isInteger(rateInGrosze)) {
    throw new Error('Both eurCenty and rateInGrosze must be integers');
  }

  // Calculate: (eurCenty * rateInGrosze) / 100
  const plnGrosze = Math.round((eurCenty * rateInGrosze) / 100);

  // Check for overflow
  if (plnGrosze > Number.MAX_SAFE_INTEGER) {
    throw new Error(
      `Conversion result ${plnGrosze} exceeds maximum safe integer. ` +
      `Consider splitting the operation or using a different approach.`
    );
  }

  return plnGrosze as Grosze;
}

/**
 * Convert PLN to EUR using exchange rate
 * @param plnGrosze - Amount in PLN grosze
 * @param rateInGrosze - Exchange rate (e.g., 450 for 4.50 PLN/EUR)
 * @returns Amount in EUR cents
 */
export function convertPlnToEurCenty(plnGrosze: Grosze, rateInGrosze: number): Centy {
  if (!Number.isInteger(plnGrosze) || !Number.isInteger(rateInGrosze)) {
    throw new Error('Both plnGrosze and rateInGrosze must be integers');
  }

  if (rateInGrosze === 0) {
    throw new Error('Exchange rate cannot be zero');
  }

  // Calculate: (plnGrosze * 100) / rateInGrosze
  const eurCenty = Math.round((plnGrosze * 100) / rateInGrosze);

  return eurCenty as Centy;
}

/**
 * Format grosze as PLN string for display
 * @param grosze - Amount in grosze
 * @param locale - Locale for formatting (default: 'pl-PL')
 * @returns Formatted string (e.g., "123,45 zł")
 */
export function formatGrosze(grosze: Grosze, locale = 'pl-PL'): string {
  const pln = groszeToPln(grosze);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'PLN',
  }).format(pln);
}

/**
 * Format cents as EUR string for display
 * @param centy - Amount in cents
 * @param locale - Locale for formatting (default: 'pl-PL')
 * @returns Formatted string (e.g., "123,45 €")
 */
export function formatCenty(centy: Centy, locale = 'pl-PL'): string {
  const eur = centyToEur(centy);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(eur);
}

/**
 * Validate monetary value
 * @param value - Value to validate
 * @param max - Maximum allowed value (in smallest unit)
 * @returns true if valid
 * @throws Error if invalid
 */
export function validateMonetaryValue(value: number, max = Number.MAX_SAFE_INTEGER): boolean {
  if (!Number.isFinite(value)) {
    throw new Error('Monetary value must be a finite number');
  }

  if (!Number.isInteger(value)) {
    throw new Error('Monetary value must be an integer (grosze/cents)');
  }

  if (value < 0) {
    throw new Error('Monetary value cannot be negative');
  }

  if (value > max) {
    throw new Error(`Monetary value ${value} exceeds maximum allowed ${max}`);
  }

  return true;
}

/**
 * Safe addition of monetary values
 * @param values - Array of monetary values to sum
 * @returns Sum of all values
 * @throws Error if sum exceeds safe integer range
 */
export function sumMonetary(...values: number[]): number {
  const sum = values.reduce((acc, val) => {
    if (!Number.isInteger(val)) {
      throw new Error(`Value ${val} is not an integer`);
    }
    return acc + val;
  }, 0);

  if (sum > Number.MAX_SAFE_INTEGER) {
    throw new Error(`Sum ${sum} exceeds maximum safe integer`);
  }

  return sum;
}
