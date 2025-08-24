import { z } from 'zod';

/**
 * Workflow state types as defined by Linear
 */
export const WorkflowStateTypeEnum = z.enum([
  'triage',
  'backlog',
  'unstarted',
  'started',
  'completed',
  'canceled',
]);

export type WorkflowStateType = z.infer<typeof WorkflowStateTypeEnum>;

/**
 * Default state categories
 */
export const DefaultStateCategoryEnum = z.enum(['triage', 'backlog', 'started']);

export type DefaultStateCategory = z.infer<typeof DefaultStateCategoryEnum>;

/**
 * Schema for updating workflow state properties
 */
export const WorkflowStateUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format')
    .optional(),
  description: z.string().max(255).optional(),
  position: z.number().positive().optional(),
});

export type WorkflowStateUpdate = z.infer<typeof WorkflowStateUpdateSchema>;

/**
 * Schema for filtering workflow states
 */
export const WorkflowStateFilterSchema = z.object({
  teamId: z.string().optional(),
  type: WorkflowStateTypeEnum.optional(),
  name: z
    .object({
      eq: z.string().optional(),
      contains: z.string().optional(),
    })
    .optional(),
  includeArchived: z.boolean().optional(),
});

export type WorkflowStateFilter = z.infer<typeof WorkflowStateFilterSchema>;

/**
 * Pagination schema (reused from common types)
 */
export interface Pagination {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

/**
 * Batch operation result for bulk moves
 */
export interface BatchResult<T = unknown> {
  success: boolean;
  succeeded: T[];
  failed: Array<{
    item: string;
    error: string;
  }>;
  totalCount: number;
  successCount: number;
  failureCount: number;
}

/**
 * Issue filter type for getIssues method
 */
export interface IssueFilter {
  assignee?: {
    id?: {
      eq?: string;
    };
  };
  labels?: {
    some?: {
      id?: {
        eq?: string;
      };
    };
  };
  priority?: {
    eq?: number;
  };
}
