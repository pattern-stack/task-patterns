import type { Team, LinearDocument } from '@linear/sdk';

type TeamCreateInput = LinearDocument.TeamCreateInput;
type TeamUpdateInput = LinearDocument.TeamUpdateInput;

/**
 * Team transformer functions
 * Pure functions for transforming team data between layers
 */
export const TeamTransformers = {
  /**
   * Transform create input to Linear SDK format
   */
  fromCreateInput: (input: {
    name: string;
    key: string;
    description?: string;
    icon?: string;
    color?: string;
  }): TeamCreateInput => ({
    name: input.name,
    key: input.key,
    description: input.description,
    icon: input.icon,
    color: input.color,
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
  }): TeamUpdateInput => ({
    name: input.name,
    key: input.key,
    description: input.description,
    icon: input.icon,
    color: input.color,
  }),

  /**
   * Transform to team reference (minimal data for relationships)
   */
  toReference: (team: Team) => ({
    id: team.id,
    key: team.key,
    name: team.name,
  }),

  /**
   * Transform for team selector
   */
  toSelectorOption: (team: Team) => ({
    value: team.id,
    label: `${team.key} - ${team.name}`,
    key: team.key,
    name: team.name,
    icon: team.icon,
    color: team.color,
  }),

  // TODO: Fix these transformers to handle LinearFetch properties correctly
  /*
  toResponse: (team: Team) => ({
    id: team.id,
    name: team.name,
    key: team.key,
    description: team.description,
    icon: team.icon,
    color: team.color,
    private: team.private,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    issueCount: team.issues?.nodes?.length || 0,
    memberCount: team.members?.nodes?.length || 0,
    issueEstimationType: team.issueEstimationType,
    issueEstimationAllowZero: team.issueEstimationAllowZero,
    issueOrderingNoPriorityFirst: team.issueOrderingNoPriorityFirst,
    timezone: team.timezone,
    activeCycle: team.activeCycle ? {
      id: team.activeCycle.id,
      name: team.activeCycle.name,
      number: team.activeCycle.number,
    } : null,
  }),

  toListItem: (team: Team) => ({
    id: team.id,
    name: team.name,
    key: team.key,
    description: team.description?.substring(0, 100),
    icon: team.icon,
    color: team.color,
    private: team.private,
    memberCount: team.members?.nodes?.length || 0,
    issueCount: team.issues?.nodes?.filter(i => !i.completedAt)?.length || 0,
  }),

  toMembersList: (team: Team) => ({
    id: team.id,
    name: team.name,
    key: team.key,
    members: team.members?.nodes?.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      avatarUrl: member.avatarUrl,
    })) || [],
  }),

  toWorkflowInfo: (team: Team) => ({
    id: team.id,
    name: team.name,
    key: team.key,
    states: team.states?.nodes?.map(state => ({
      id: state.id,
      name: state.name,
      type: state.type,
      color: state.color,
    })) || [],
  }),
  */
} as const;
