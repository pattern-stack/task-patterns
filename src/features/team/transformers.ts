import type { Team, TeamCreateInput, TeamUpdateInput } from '@linear/sdk';

/**
 * Team transformer functions
 * Pure functions for transforming team data between layers
 */
export const TeamTransformers = {
  /**
   * Transform Linear SDK Team to API response
   */
  toResponse: (team: Team) => ({
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
    issueCount: team.issues?.nodes?.length || 0,
    memberCount: team.members?.nodes?.length || 0,
  }),

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
  toListItem: (team: Team) => ({
    id: team.id,
    key: team.key,
    name: team.name,
    private: team.private ? 'Private' : 'Public',
    memberCount: team.members?.nodes?.length || 0,
    activeIssues: team.issues?.nodes?.filter(i => 
      i.state?.type !== 'completed' && i.state?.type !== 'canceled'
    ).length || 0,
  }),

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