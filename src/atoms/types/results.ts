/**
 * Result types for better error handling
 * Using discriminated unions for type safety
 */

/**
 * Generic operation result with discriminated union
 */
export type OperationResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E; code: string };

/**
 * Async operation result with loading state
 */
export type AsyncResult<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E; code: string };

/**
 * Validation result
 */
export type ValidationResult = { valid: true } | { valid: false; errors: string[] };

/**
 * Bulk operation result
 */
export interface BulkResult<T> {
  successful: T[];
  failed: Array<{
    id: string;
    error: string;
    item?: T;
  }>;
  summary: string;
  totalCount: number;
  successCount: number;
  failureCount: number;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  items: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
    totalCount?: number;
  };
}

/**
 * Search result with metadata
 */
export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  query: string;
  filters: Record<string, unknown>;
  suggestions?: string[];
}

/**
 * Type guards for result types
 */
export const ResultGuards = {
  /**
   * Check if operation was successful
   */
  isSuccess: <T>(result: OperationResult<T>): result is { success: true; data: T } => {
    return result.success === true;
  },

  /**
   * Check if operation failed
   */
  isError: <T, E>(
    result: OperationResult<T, E>,
  ): result is { success: false; error: E; code: string } => {
    return result.success === false;
  },

  /**
   * Check if async result is loading
   */
  isLoading: <T>(result: AsyncResult<T>): result is { status: 'loading' } => {
    return result.status === 'loading';
  },

  /**
   * Check if validation passed
   */
  isValid: (result: ValidationResult): result is { valid: true } => {
    return result.valid === true;
  },
} as const;

/**
 * Result helpers
 */
export const ResultHelpers = {
  /**
   * Create success result
   */
  success: <T>(data: T): OperationResult<T> => ({
    success: true,
    data,
  }),

  /**
   * Create error result
   */
  error: <E = Error>(error: E, code: string): OperationResult<never, E> => ({
    success: false,
    error,
    code,
  }),

  /**
   * Map success value
   */
  map: <T, U>(result: OperationResult<T>, fn: (data: T) => U): OperationResult<U> => {
    if (result.success) {
      return { success: true, data: fn(result.data) };
    }
    return result;
  },

  /**
   * Chain operations
   */
  chain: async <T, U>(
    result: OperationResult<T>,
    fn: (data: T) => Promise<OperationResult<U>>,
  ): Promise<OperationResult<U>> => {
    if (result.success) {
      return fn(result.data);
    }
    return result;
  },

  /**
   * Convert to promise
   */
  toPromise: <T>(result: OperationResult<T>): Promise<T> => {
    if (result.success) {
      return Promise.resolve(result.data);
    }
    return Promise.reject(new Error(result.code));
  },
} as const;

/**
 * Error codes enum
 */
export enum ErrorCode {
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Not found errors
  NOT_FOUND = 'NOT_FOUND',
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',

  // Permission errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Operation errors
  OPERATION_FAILED = 'OPERATION_FAILED',
  CREATION_FAILED = 'CREATION_FAILED',
  UPDATE_FAILED = 'UPDATE_FAILED',
  DELETION_FAILED = 'DELETION_FAILED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
