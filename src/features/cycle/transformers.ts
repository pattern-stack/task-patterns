import type { Cycle, CycleCreateInput, CycleUpdateInput } from '@linear/sdk';

/**
 * Cycle transformer functions
 * Pure functions for transforming cycle data between layers
 */
export const CycleTransformers = {
  /**
   * Transform Linear SDK Cycle to API response
   */
  toResponse: (cycle: Cycle) => ({
    id: cycle.id,
    number: cycle.number,
    name: cycle.name,
    description: cycle.description,
    startsAt: cycle.startsAt,
    endsAt: cycle.endsAt,
    completedAt: cycle.completedAt,
    createdAt: cycle.createdAt,
    updatedAt: cycle.updatedAt,
    issueCount: cycle.issues?.nodes?.length || 0,
    completedIssueCount: cycle.completedIssues?.nodes?.length || 0,
    scopeHistory: cycle.scopeHistory,
    completedScopeHistory: cycle.completedScopeHistory,
    team: cycle.team ? {
      id: cycle.team.id,
      key: cycle.team.key,
      name: cycle.team.name,
    } : null,
  }),

  /**
   * Transform create input to Linear SDK format
   */
  fromCreateInput: (input: {
    name?: string;
    description?: string;
    teamId: string;
    startsAt: Date;
    endsAt: Date;
  }): CycleCreateInput => ({
    name: input.name,
    description: input.description,
    teamId: input.teamId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  }),

  /**
   * Transform update input to Linear SDK format
   */
  fromUpdateInput: (input: {
    name?: string;
    description?: string;
    startsAt?: Date;
    endsAt?: Date;
    completedAt?: Date;
  }): CycleUpdateInput => ({
    name: input.name,
    description: input.description,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    completedAt: input.completedAt,
  }),

  /**
   * Transform to cycle reference (minimal data for relationships)
   */
  toReference: (cycle: Cycle) => ({
    id: cycle.id,
    number: cycle.number,
    name: cycle.name || `Cycle ${cycle.number}`,
  }),

  /**
   * Transform for list display
   */
  toListItem: (cycle: Cycle) => ({
    id: cycle.id,
    number: cycle.number,
    name: cycle.name || `Cycle ${cycle.number}`,
    startsAt: cycle.startsAt,
    endsAt: cycle.endsAt,
    status: CycleTransformers.getStatus(cycle),
    progress: CycleTransformers.getProgress(cycle),
    issueCount: cycle.issues?.nodes?.length || 0,
    completedCount: cycle.completedIssues?.nodes?.length || 0,
  }),

  /**
   * Transform for cycle selector
   */
  toSelectorOption: (cycle: Cycle) => ({
    value: cycle.id,
    label: cycle.name || `Cycle ${cycle.number}`,
    dates: `${new Date(cycle.startsAt).toLocaleDateString()} - ${new Date(cycle.endsAt).toLocaleDateString()}`,
    status: CycleTransformers.getStatus(cycle),
  }),

  /**
   * Transform for sprint board display
   */
  toSprintBoard: (cycle: Cycle) => ({
    id: cycle.id,
    number: cycle.number,
    name: cycle.name || `Cycle ${cycle.number}`,
    startsAt: cycle.startsAt,
    endsAt: cycle.endsAt,
    issues: cycle.issues?.nodes || [],
    completedIssues: cycle.completedIssues?.nodes || [],
    scopeHistory: cycle.scopeHistory,
    completedScopeHistory: cycle.completedScopeHistory,
  }),

  /**
   * Get cycle status
   */
  getStatus: (cycle: Cycle): 'upcoming' | 'active' | 'completed' => {
    const now = new Date();
    const start = new Date(cycle.startsAt);
    const end = new Date(cycle.endsAt);
    
    if (cycle.completedAt) return 'completed';
    if (now < start) return 'upcoming';
    if (now > end) return 'completed';
    return 'active';
  },

  /**
   * Get cycle progress percentage
   */
  getProgress: (cycle: Cycle): number => {
    const total = cycle.issues?.nodes?.length || 0;
    if (total === 0) return 0;
    
    const completed = cycle.completedIssues?.nodes?.length || 0;
    return Math.round((completed / total) * 100);
  },
} as const;