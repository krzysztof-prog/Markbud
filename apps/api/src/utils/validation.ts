/**
 * Validation Utilities
 *
 * Safe parsing and validation helpers for request parameters and user input.
 * Prevents NaN, negative IDs, and other common validation issues.
 */

import { ValidationError } from './errors.js';

/**
 * Safely parse ID from request params or query
 *
 * @param value - Value to parse (usually from request.params.id)
 * @param fieldName - Name of field for error messages
 * @returns Parsed positive integer
 * @throws ValidationError if value is not a valid positive integer
 *
 * @example
 * ```typescript
 * // In handler:
 * const orderId = parseId(request.params.id, 'Order ID');
 * // Throws ValidationError if id is "abc" or "-5"
 * ```
 */
export function parseId(value: string | unknown, fieldName = 'ID'): number {
  const parsed = parseInt(String(value), 10);

  if (isNaN(parsed)) {
    throw new ValidationError(`${fieldName} must be a number, received: "${value}"`);
  }

  if (parsed <= 0) {
    throw new ValidationError(`${fieldName} must be positive, received: ${parsed}`);
  }

  if (!Number.isInteger(parsed)) {
    throw new ValidationError(`${fieldName} must be an integer, received: ${parsed}`);
  }

  return parsed;
}

/**
 * Parse optional ID (allows null/undefined/empty string)
 *
 * @param value - Value to parse
 * @param fieldName - Name of field for error messages
 * @returns Parsed ID or null
 *
 * @example
 * ```typescript
 * const colorId = parseOptionalId(request.query.colorId, 'Color ID');
 * // Returns null if undefined/null/empty, throws if invalid number
 * ```
 */
export function parseOptionalId(
  value: string | unknown | null | undefined,
  fieldName = 'ID'
): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return parseId(value, fieldName);
}

/**
 * Parse array of IDs
 *
 * @param values - Array of values to parse
 * @param fieldName - Name of field for error messages
 * @returns Array of parsed IDs
 *
 * @example
 * ```typescript
 * const orderIds = parseIds(request.body.orderIds, 'Order IDs');
 * // Throws ValidationError with index if any value is invalid
 * ```
 */
export function parseIds(values: (string | unknown)[], fieldName = 'IDs'): number[] {
  if (!Array.isArray(values)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }

  return values.map((value, index) => {
    try {
      return parseId(value, `${fieldName}[${index}]`);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`${error.message} at index ${index}`);
      }
      throw error;
    }
  });
}

/**
 * Parse integer with custom min/max bounds
 *
 * @param value - Value to parse
 * @param options - Validation options
 * @returns Parsed integer
 *
 * @example
 * ```typescript
 * const page = parseInteger(request.query.page, {
 *   fieldName: 'Page',
 *   min: 1,
 *   max: 1000,
 *   defaultValue: 1
 * });
 * ```
 */
export function parseInteger(
  value: string | unknown,
  options: {
    fieldName?: string;
    min?: number;
    max?: number;
    defaultValue?: number;
  } = {}
): number {
  const { fieldName = 'Value', min, max, defaultValue } = options;

  // Return default if value is empty/undefined
  if ((value === null || value === undefined || value === '') && defaultValue !== undefined) {
    return defaultValue;
  }

  const parsed = parseInt(String(value), 10);

  if (isNaN(parsed)) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new ValidationError(`${fieldName} must be a number, received: "${value}"`);
  }

  if (!Number.isInteger(parsed)) {
    throw new ValidationError(`${fieldName} must be an integer, received: ${parsed}`);
  }

  if (min !== undefined && parsed < min) {
    throw new ValidationError(`${fieldName} must be >= ${min}, received: ${parsed}`);
  }

  if (max !== undefined && parsed > max) {
    throw new ValidationError(`${fieldName} must be <= ${max}, received: ${parsed}`);
  }

  return parsed;
}

/**
 * Parse boolean from string
 *
 * @param value - Value to parse ('true', 'false', '1', '0')
 * @param fieldName - Name of field for error messages
 * @returns Parsed boolean
 *
 * @example
 * ```typescript
 * const isActive = parseBoolean(request.query.active, 'Active');
 * // true for: 'true', '1', 'yes'
 * // false for: 'false', '0', 'no'
 * ```
 */
export function parseBoolean(
  value: string | unknown | null | undefined,
  fieldName = 'Value'
): boolean {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }

  const str = String(value).toLowerCase().trim();

  if (['true', '1', 'yes'].includes(str)) {
    return true;
  }

  if (['false', '0', 'no'].includes(str)) {
    return false;
  }

  throw new ValidationError(
    `${fieldName} must be a boolean (true/false), received: "${value}"`
  );
}

/**
 * Parse optional boolean
 *
 * @param value - Value to parse
 * @param fieldName - Name of field for error messages
 * @returns Parsed boolean or null
 */
export function parseOptionalBoolean(
  value: string | unknown | null | undefined,
  fieldName = 'Value'
): boolean | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return parseBoolean(value, fieldName);
}
