import type { Team } from '@linear/sdk';
import type { TeamCreateInput, TeamUpdateInput } from '@linear/sdk/dist/_generated_documents';

/**
 * Team transformer functions
 * Pure functions for transforming team data between layers
 */
export const TeamTransformers = {
  /**
   * Transform Linear SDK Team to API response
   */
  toResponse: async (team: Team) => {
    const [issues, members] = await Promise.all([
      team.issues(),
      team.members(),
    ]);

    return {
      id: team.id,
      key: team.key,
      name: team.name,
      description: team.description,
      icon: team.icon,
      color: team.color,
      private: team.private,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      cycleStartDay: team.cycleStartDay,
      cycleCalenderUrl: team.cycleCalenderUrl,
      timezone: team.timezone,
      issueCount: issues?.nodes?.length || 0,
      memberCount: members?.nodes?.length || 0,
    };
  },

  /**
   * Transform create input to Linear SDK format
   */
  fromCreateInput: (input: {
    name: string;
    key: string;
    description?: string;
    icon?: string;
    color?: string;
    private?: boolean;
    cycleStartDay?: number;
    timezone?: string;
  }): TeamCreateInput => ({
    name: input.name,
    key: input.key,
    description: input.description,
    icon: input.icon,
    color: input.color,
    private: input.private,
    cycleStartDay: input.cycleStartDay,
    timezone: input.timezone,
  }),

  /**
   * Transform update input to Linear SDK format
   */
  fromUpdateInput: (input: {
    name?: string;
    key?: string;
    description?: string;
    icon?: string;
    color?: string;
    private?: boolean;
    cycleStartDay?: number;
    timezone?: string;
  }): TeamUpdateInput => ({
    name: input.name,
    key: input.key,
    description: input.description,
    icon: input.icon,
    color: input.color,
    private: input.private,
    cycleStartDay: input.cycleStartDay,
    timezone: input.timezone,
  }),

  /**
   * Transform to team reference (minimal data for relationships)
   */
  toReference: (team: Team) => ({
    id: team.id,
    key: team.key,
    name: team.name,
    icon: team.icon,
  }),

  /**
   * Transform for list display
   */
  toListItem: async (team: Team) => {
    const [members, issues] = await Promise.all([
      team.members(),
      team.issues(),
    ]);

    const activeIssuesPromises = issues?.nodes?.map(async (i: any) => {
      const state = await i.state;
      return state?.type !== 'completed' && state?.type !== 'canceled';
    }) || [];

    const activeIssuesResults = await Promise.all(activeIssuesPromises);
    const activeIssuesCount = activeIssuesResults.filter(Boolean).length;

    return {
      id: team.id,
      key: team.key,
      name: team.name,
      private: team.private ? 'Private' : 'Public',
      memberCount: members?.nodes?.length || 0,
      activeIssues: activeIssuesCount,
    };
  },

  /**
   * Transform for team selector
   */
  toSelectorOption: (team: Team) => ({
    value: team.id,
    label: `${team.key} - ${team.name}`,
    icon: team.icon,
    private: team.private,
  }),
} as const;