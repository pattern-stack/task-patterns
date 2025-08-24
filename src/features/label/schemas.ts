import { z } from 'zod';

export const LabelCreateSchema = z.object({
  name: z.string().min(1).max(30),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  description: z.string().optional(),
  teamId: z.string().optional(), // null for workspace-wide
  parentId: z.string().optional(), // For label hierarchy
});

export type LabelCreate = z.infer<typeof LabelCreateSchema>;

export const LabelUpdateSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  description: z.string().optional(),
});

export type LabelUpdate = z.infer<typeof LabelUpdateSchema>;

export const LabelFilterSchema = z.object({
  teamId: z.string().nullable().optional(), // null for workspace-only
  includeArchived: z.boolean().default(false),
  searchQuery: z.string().optional(),
});

export type LabelFilter = z.infer<typeof LabelFilterSchema>;

export const BulkLabelOperationSchema = z.object({
  issueIds: z.array(z.string()).min(1),
  labelId: z.string().min(1),
});

export type BulkLabelOperation = z.infer<typeof BulkLabelOperationSchema>;
