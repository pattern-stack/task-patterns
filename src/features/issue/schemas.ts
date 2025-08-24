import { z } from 'zod';

export const IssueCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  teamId: z.string(),
  assigneeId: z.string().optional(),
  priority: z.number().min(0).max(4).optional(),
  estimate: z.number().optional(),
  labelIds: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  cycleId: z.string().optional(),
  parentId: z.string().optional(),
  dueDate: z.string().optional(),
});

export type IssueCreate = z.infer<typeof IssueCreateSchema>;

export const IssueUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  priority: z.number().min(0).max(4).optional(),
  estimate: z.number().nullable().optional(),
  labelIds: z.array(z.string()).optional(),
  projectId: z.string().nullable().optional(),
  cycleId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  stateId: z.string().optional(),
});

export type IssueUpdate = z.infer<typeof IssueUpdateSchema>;

export const IssueFilterSchema = z.object({
  teamId: z.string().optional(),
  assigneeId: z.string().optional(),
  creatorId: z.string().optional(),
  projectId: z.string().optional(),
  cycleId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  priority: z.number().optional(),
  state: z.enum(['backlog', 'unstarted', 'started', 'completed', 'canceled']).optional(),
  includeArchived: z.boolean().default(false),
  searchQuery: z.string().optional(),
});

export type IssueFilter = z.infer<typeof IssueFilterSchema>;

export const IssueBulkUpdateSchema = z.object({
  issueIds: z.array(z.string()).min(1),
  update: IssueUpdateSchema,
});

export type IssueBulkUpdate = z.infer<typeof IssueBulkUpdateSchema>;