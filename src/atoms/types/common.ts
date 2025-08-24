import { z } from 'zod';

export const PaginationSchema = z.object({
  first: z.number().min(1).max(250).default(50),
  after: z.string().optional(),
  before: z.string().optional(),
  last: z.number().min(1).max(250).optional(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const DateRangeSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
});

export type DateRange = z.infer<typeof DateRangeSchema>;

export const SortOrderSchema = z.enum(['ASC', 'DESC']);
export type SortOrder = z.infer<typeof SortOrderSchema>;

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BatchOperationResult<T> {
  success: boolean;
  succeeded: T[];
  failed: Array<{ item: any; error: string }>;
  totalCount: number;
  successCount: number;
  failureCount: number;
}

export class LinearError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'LinearError';
  }
}

export class NotFoundError extends LinearError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      'NOT_FOUND'
    );
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends LinearError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class PermissionError extends LinearError {
  constructor(action: string, resource?: string) {
    super(
      `Permission denied: Cannot ${action}${resource ? ` ${resource}` : ''}`,
      'PERMISSION_DENIED'
    );
    this.name = 'PermissionError';
  }
}