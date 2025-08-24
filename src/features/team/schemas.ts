import { z } from 'zod';

// Team creation schema
export const TeamCreateSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  key: z.string()
    .min(2, 'Team key must be at least 2 characters')
    .max(5, 'Team key must be at most 5 characters')
    .regex(/^[A-Z]+$/, 'Team key must contain only uppercase letters')
    .transform(str => str.toUpperCase()),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  cyclesEnabled: z.boolean().optional(),
  cycleStartDay: z.number().min(0).max(6).optional(), // 0 = Sunday, 6 = Saturday
  cycleDuration: z.number().min(1).optional(), // Duration in days
  triageEnabled: z.boolean().optional(),
  private: z.boolean().optional(),
});

export type TeamCreate = z.infer<typeof TeamCreateSchema>;

// Team update schema - all fields optional except validation rules still apply
export const TeamUpdateSchema = z.object({
  name: z.string().min(1, 'Team name cannot be empty').optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  cyclesEnabled: z.boolean().optional(),
  cycleStartDay: z.number().min(0).max(6).optional(),
  cycleDuration: z.number().min(1).optional(),
  triageEnabled: z.boolean().optional(),
  private: z.boolean().optional(),
});

export type TeamUpdate = z.infer<typeof TeamUpdateSchema>;

// Team settings schemas
export const TeamSettingsUpdateSchema = z.object({
  cyclesEnabled: z.boolean().optional(),
  cycleStartDay: z.number().min(0).max(6).optional(),
  cycleDuration: z.number().min(1).optional(),
  cycleCalenderUrl: z.string().url().optional(),
  cycleLockToActive: z.boolean().optional(),
  triageEnabled: z.boolean().optional(),
  issueEstimationType: z.enum(['notUsed', 'exponential', 'fibonacci', 'linear', 'tShirt']).optional(),
  issueOrderingNeedsToBeRescoped: z.boolean().optional(),
  defaultIssueEstimate: z.number().min(0).optional(),
  defaultTemplateForMembersId: z.string().optional(),
  defaultTemplateForNonMembersId: z.string().optional(),
  gitBranchFormat: z.string().optional(),
  groupIssueHistory: z.boolean().optional(),
  requirePriorityToLeaveTriage: z.boolean().optional(),
  slackNewIssue: z.boolean().optional(),
  slackIssueComments: z.boolean().optional(),
  slackIssueStatuses: z.boolean().optional(),
});

export type TeamSettingsUpdate = z.infer<typeof TeamSettingsUpdateSchema>;

// Template schemas
export const TemplateCreateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  templateData: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.number().min(0).max(4).optional(),
    estimate: z.number().min(0).optional(),
    labelIds: z.array(z.string()).optional(),
  }),
  type: z.enum(['issue']).optional().default('issue'),
});

export type TemplateCreate = z.infer<typeof TemplateCreateSchema>;

// Filter schemas
export const TeamFilterSchema = z.object({
  key: z.object({
    eq: z.string().optional(),
    in: z.array(z.string()).optional(),
    contains: z.string().optional(),
  }).optional(),
  name: z.object({
    contains: z.string().optional(),
    containsIgnoreCase: z.string().optional(),
  }).optional(),
  private: z.boolean().optional(),
  includeArchived: z.boolean().default(false),
});

export type TeamFilter = z.infer<typeof TeamFilterSchema>;

// Sort schemas
export const TeamSortSchema = z.object({
  name: z.enum(['ASC', 'DESC']).optional(),
  key: z.enum(['ASC', 'DESC']).optional(),
  createdAt: z.enum(['ASC', 'DESC']).optional(),
  updatedAt: z.enum(['ASC', 'DESC']).optional(),
});

export type TeamSort = z.infer<typeof TeamSortSchema>;

// Validation functions
export function validateTeamCreate(data: any): TeamCreate {
  return TeamCreateSchema.parse(data);
}

export function validateTeamUpdate(data: any): TeamUpdate {
  return TeamUpdateSchema.parse(data);
}

export function validateTeamSettingsUpdate(data: any): TeamSettingsUpdate {
  return TeamSettingsUpdateSchema.parse(data);
}

export function validateTemplateCreate(data: any): TemplateCreate {
  return TemplateCreateSchema.parse(data);
}

export function validateTeamFilter(data: any): TeamFilter {
  return TeamFilterSchema.parse(data);
}