import { z } from 'zod';

export const CycleCreateSchema = z.object({
  name: z.string().min(1),
  teamId: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  description: z.string().optional(),
});

export type CycleCreate = z.infer<typeof CycleCreateSchema>;

export const CycleUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export type CycleUpdate = z.infer<typeof CycleUpdateSchema>;

export const CycleFilterSchema = z.object({
  teamId: z.string().optional(),
  isActive: z.boolean().optional(),
  includeArchived: z.boolean().default(false),
});

export type CycleFilter = z.infer<typeof CycleFilterSchema>;

export interface CycleProgress {
  completedPoints: number;
  totalPoints: number;
  percentComplete: number;
  completedIssues: number;
  totalIssues: number;
}