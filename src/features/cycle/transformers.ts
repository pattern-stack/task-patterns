import type { Cycle, LinearDocument } from '@linear/sdk';

type CycleCreateInput = LinearDocument.CycleCreateInput;
type CycleUpdateInput = LinearDocument.CycleUpdateInput;

/**
 * Cycle transformer functions
 * Pure functions for transforming cycle data between layers
 */
export const CycleTransformers = {
  /**
   * Transform Linear SDK Cycle to API response
   */
  toResponse: async (cycle: Cycle) => {
    const team = cycle.team ? await cycle.team : null;
    const issues = await cycle.issues();
    // Filter completed issues from all issues since completedIssues() may not exist
    // Note: We can only check completedAt since state is a LinearFetch that requires await
    const completedIssueCount = issues.nodes.filter((issue) => issue.completedAt !== null).length;

    return {
      id: cycle.id,
      number: cycle.number,
      name: cycle.name,
      description: cycle.description,
      startsAt: cycle.startsAt,
      endsAt: cycle.endsAt,
      completedAt: cycle.completedAt,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
      issueCount: issues.nodes.length || 0,
      completedIssueCount: completedIssueCount,
      scopeHistory: cycle.scopeHistory,
      completedScopeHistory: cycle.completedScopeHistory,
      team: team
        ? {
            id: team.id,
            key: team.key,
            name: team.name,
          }
        : null,
    };
  },

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
   * Transform for cycle selector
   */
  toSelectorOption: (cycle: Cycle) => ({
    value: cycle.id,
    label: cycle.name || `Cycle ${cycle.number}`,
    dates: `${new Date(cycle.startsAt).toLocaleDateString()} - ${new Date(cycle.endsAt).toLocaleDateString()}`,
    status: CycleTransformers.getStatus(cycle),
  }),

  /**
   * Get cycle status
   */
  getStatus: (cycle: Cycle): 'upcoming' | 'active' | 'completed' => {
    const now = new Date();
    const start = new Date(cycle.startsAt);
    const end = new Date(cycle.endsAt);

    if (cycle.completedAt) {
      return 'completed';
    }
    if (now < start) {
      return 'upcoming';
    }
    if (now > end) {
      return 'completed';
    }
    return 'active';
  },

  // TODO: Fix these transformers to handle LinearFetch properties correctly
  /*
  toListItem: async (cycle: Cycle) => {
    const issues = await cycle.issues();
    const completedIssues = await cycle.completedIssues();
    
    return {
      id: cycle.id,
      number: cycle.number,
      name: cycle.name || `Cycle ${cycle.number}`,
      startsAt: cycle.startsAt,
      endsAt: cycle.endsAt,
      status: CycleTransformers.getStatus(cycle),
      progress: await CycleTransformers.getProgress(cycle),
      issueCount: issues.nodes.length || 0,
      completedCount: completedIssues.nodes.length || 0,
    };
  },

  toSprintBoard: async (cycle: Cycle) => {
    const issues = await cycle.issues();
    const completedIssues = await cycle.completedIssues();
    
    return {
      id: cycle.id,
      number: cycle.number,
      name: cycle.name || `Cycle ${cycle.number}`,
      startsAt: cycle.startsAt,
      endsAt: cycle.endsAt,
      issues: issues.nodes || [],
      completedIssues: completedIssues.nodes || [],
      scopeHistory: cycle.scopeHistory,
      completedScopeHistory: cycle.completedScopeHistory,
    };
  },

  getProgress: async (cycle: Cycle): Promise<number> => {
    const issues = await cycle.issues();
    const completedIssues = await cycle.completedIssues();
    const total = issues.nodes.length || 0;
    
    if (total === 0) return 0;
    
    const completed = completedIssues.nodes.length || 0;
    return Math.round((completed / total) * 100);
  },
  */
} as const;
