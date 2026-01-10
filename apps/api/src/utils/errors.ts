/**
 * Custom error classes for centralized error handling
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  public metadata?: Record<string, unknown>;
  public errors?: Record<string, string[]>;

  /**
   * P1-2: Extended with metadata for additional context (e.g., variant type selection)
   * Backward compatible - can accept either errors or metadata as second param
   */
  constructor(
    message: string,
    errorsOrMetadata?: Record<string, unknown> | Record<string, string[]>
  ) {
    // Determine if second arg is errors (Record<string, string[]>) or metadata
    // Check: non-empty object where ALL values are string arrays
    const isErrors =
      errorsOrMetadata &&
      Object.keys(errorsOrMetadata).length > 0 &&
      Object.values(errorsOrMetadata).every(
        v => Array.isArray(v) && v.every(item => typeof item === 'string')
      );

    const metadata = isErrors ? undefined : (errorsOrMetadata as Record<string, unknown>);
    const errors = isErrors ? (errorsOrMetadata as Record<string, string[]>) : undefined;

    super(message, 400, (metadata?.code as string) || 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.metadata = metadata;
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} nie znaleziono`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, public details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
    this.name = 'InternalServerError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, public originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

/**
 * Helper to parse and validate integer from string parameter
 * @throws ValidationError if value is not a valid integer
 */
export function parseIntParam(value: string, paramName: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ValidationError(`${paramName} musi być liczbą całkowitą`);
  }
  return parsed;
}
