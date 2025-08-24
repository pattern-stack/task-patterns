import { z } from 'zod';

/**
 * Schema for creating a new project
 */
export const ProjectCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  teamIds: z.array(z.string()).min(1),
  leadId: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  targetDate: z.string().optional(),
  startDate: z.string().optional(),
  priority: z.number().min(0).max(4).optional(),
});

export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;

/**
 * Schema for updating an existing project
 */
export const ProjectUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  leadId: z.string().nullable().optional(),
  memberIds: z.array(z.string()).optional(),
  targetDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  priority: z.number().min(0).max(4).optional(),
  state: z.enum(['planned', 'started', 'paused', 'completed', 'canceled']).optional(),
});

export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;

/**
 * Project state enum
 */
export const ProjectStateEnum = z.enum(['planned', 'started', 'paused', 'completed', 'canceled']);

export type ProjectState = z.infer<typeof ProjectStateEnum>;

/**
 * Pagination schema (reused from common types)
 */
export interface Pagination {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}
