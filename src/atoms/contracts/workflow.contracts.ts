/**
 * Base contract for all workflows
 * Workflows orchestrate operations across multiple entities
 */
export interface Workflow<TInput, TOutput> {
  /**
   * Execute the workflow
   */
  execute(input: TInput): Promise<TOutput>;

  /**
   * Validate input before execution (optional)
   */
  validate?(input: TInput): Promise<boolean>;

  /**
   * Rollback on failure (optional)
   */
  rollback?(input: TInput, error: Error): Promise<void>;
}

/**
 * Contract for bulk operations
 */
export interface BulkOperation<TParams> {
  /**
   * Execute bulk operation on multiple items
   */
  execute(ids: string[], params: TParams): Promise<BulkResult>;
}

/**
 * Contract for async workflows with status tracking
 */
export interface AsyncWorkflow<TInput, TOutput> extends Workflow<TInput, TOutput> {
  /**
   * Get workflow status
   */
  getStatus(workflowId: string): Promise<WorkflowStatus>;

  /**
   * Cancel running workflow
   */
  cancel(workflowId: string): Promise<boolean>;
}

/**
 * Standard bulk operation result
 */
export interface BulkResult {
  successful: string[];
  failed: Array<{
    id: string;
    error: string;
    details?: any;
  }>;
  summary: string;
  totalCount: number;
  successCount: number;
  failureCount: number;
}

/**
 * Workflow execution status
 */
export interface WorkflowStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  message?: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  maxRetries?: number;
  timeout?: number;
  parallel?: boolean;
  continueOnError?: boolean;
}

/**
 * Type helper for workflow results
 */
export type WorkflowResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: Error;
      code: string;
    };
