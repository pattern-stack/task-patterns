import type { LinearClient } from '@linear/sdk';

/**
 * Base contract for all data services
 * Services handle CRUD operations for a single model/table
 */
export interface DataService<TModel, TCreate, TUpdate> {
  /**
   * Get record by ID
   */
  get(id: string): Promise<TModel | null>;

  /**
   * Create new record
   */
  create(data: TCreate): Promise<TModel>;

  /**
   * Update existing record
   */
  update(id: string, data: TUpdate): Promise<TModel>;

  /**
   * Delete record
   */
  delete(id: string): Promise<boolean>;
}

/**
 * Extended service contract with list operations
 */
export interface ServiceWithList<TModel, TCreate, TUpdate, TFilter>
  extends DataService<TModel, TCreate, TUpdate> {
  /**
   * List records with optional filtering
   */
  list(filter?: TFilter, pagination?: any): Promise<any>;
}

/**
 * Service contract for archivable models
 */
export interface ArchivableService {
  /**
   * Archive record
   */
  archive(id: string): Promise<boolean>;

  /**
   * Restore archived record
   */
  restore?(id: string): Promise<boolean>;
}

/**
 * Service contract for models with unique identifiers
 */
export interface IdentifiableService<TModel> {
  /**
   * Get by unique identifier (not ID)
   */
  getByIdentifier(identifier: string): Promise<TModel | null>;
}

/**
 * Service contract for models with search
 */
export interface SearchableService<TModel> {
  /**
   * Search records
   */
  search(query: string, limit?: number): Promise<TModel[]>;
}

/**
 * Service initialization options
 */
export interface ServiceOptions {
  client: LinearClient;
  cache?: boolean;
  retries?: number;
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  successful: T[];
  failed: Array<{
    id: string;
    error: string;
    data?: any;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}