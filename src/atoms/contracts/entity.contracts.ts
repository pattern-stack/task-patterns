/**
 * Base contract for all domain entities
 * Ensures consistent CRUD operations across all entities
 */
export interface EntityBase<TModel, TCreate, TUpdate> {
  /**
   * Get entity by ID
   */
  get(id: string): Promise<TModel | null>;

  /**
   * Create new entity
   */
  create(data: TCreate): Promise<TModel>;

  /**
   * Update existing entity
   */
  update(id: string, data: TUpdate): Promise<TModel>;

  /**
   * Delete entity
   */
  delete(id: string): Promise<boolean>;
}

/**
 * Extended entity contract for entities with list operations
 */
export interface EntityWithList<TModel, TCreate, TUpdate, TFilter>
  extends EntityBase<TModel, TCreate, TUpdate> {
  /**
   * List entities with optional filtering
   */
  list(filter?: TFilter, pagination?: PaginationOptions): Promise<PaginatedResult<TModel>>;
}

/**
 * Contract for entities that support archiving
 */
export interface ArchivableEntity {
  /**
   * Archive entity (soft delete)
   */
  archive(id: string): Promise<boolean>;

  /**
   * Restore archived entity
   */
  restore?(id: string): Promise<boolean>;
}

/**
 * Contract for entities with relationships
 */
export interface EntityWithRelations<TModel, TRelations> {
  /**
   * Get entity with all relationships loaded
   */
  getWithRelations(id: string): Promise<(TModel & TRelations) | null>;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  nodes: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
  totalCount?: number;
}

/**
 * Type helper for entity method results
 */
export type EntityResult<T> = T | null;
export type EntityListResult<T> = PaginatedResult<T>;