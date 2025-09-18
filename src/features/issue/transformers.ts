import type { Issue } from '@linear/sdk';
import type { IssueCreateInput, IssueUpdateInput } from '@linear/sdk/dist/_generated_documents';

/**
 * Issue transformer functions
 * Pure functions for transforming issue data between layers
 */
export const IssueTransformers = {
  /**
   * Transform Linear SDK Issue to API response
   */
  toResponse: async (issue: Issue) => {
    const [assignee, state, team, project, cycle] = await Promise.all([
      issue.assignee,
      issue.state,
      issue.team,
      issue.project,
      issue.cycle,
    ]);

    return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      estimate: issue.estimate,
      url: issue.url,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      completedAt: issue.completedAt,
      canceledAt: issue.canceledAt,
      startedAt: issue.startedAt,
      dueDate: issue.dueDate,
      sortOrder: issue.sortOrder,
      assignee: assignee
        ? {
            id: assignee.id,
            name: assignee.name,
            email: assignee.email,
          }
        : null,
      state: state
        ? {
            id: state.id,
            name: state.name,
            type: state.type,
          }
        : null,
      team: team
        ? {
            id: team.id,
            name: team.name,
            key: team.key,
          }
        : null,
      project: project
        ? {
            id: project.id,
            name: project.name,
          }
        : null,
      cycle: cycle
        ? {
            id: cycle.id,
            name: cycle.name,
            number: cycle.number,
          }
        : null,
      labels: [],
      comments: [],
    };
  },

  /**
   * Transform create input to Linear SDK format
   */
  fromCreateInput: (input: {
    title: string;
    description?: string;
    priority?: number;
    estimate?: number;
    assigneeId?: string;
    stateId?: string;
    teamId: string;
    projectId?: string;
    cycleId?: string;
    labelIds?: string[];
    dueDate?: Date;
  }): IssueCreateInput => ({
    title: input.title,
    description: input.description,
    priority: input.priority,
    estimate: input.estimate,
    assigneeId: input.assigneeId,
    stateId: input.stateId,
    teamId: input.teamId,
    projectId: input.projectId,
    cycleId: input.cycleId,
    labelIds: input.labelIds,
    dueDate: input.dueDate,
  }),

  /**
   * Transform update input to Linear SDK format
   */
  fromUpdateInput: (input: {
    title?: string;
    description?: string;
    priority?: number;
    estimate?: number;
    assigneeId?: string | null;
    stateId?: string;
    projectId?: string | null;
    cycleId?: string | null;
    labelIds?: string[];
    dueDate?: Date | null;
  }): IssueUpdateInput => ({
    title: input.title,
    description: input.description,
    priority: input.priority,
    estimate: input.estimate,
    assigneeId: input.assigneeId,
    stateId: input.stateId,
    projectId: input.projectId,
    cycleId: input.cycleId,
    labelIds: input.labelIds,
    dueDate: input.dueDate,
  }),

  /**
   * Transform to issue reference (minimal data for relationships)
   */
  toReference: (issue: Issue) => ({
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    url: issue.url,
  }),

  /**
   * Transform for list display
   */
  toListItem: async (issue: Issue) => {
    const [state, assignee, labels] = await Promise.all([
      issue.state,
      issue.assignee,
      issue.labels(),
    ]);

    return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      priority: issue.priority,
      state: state?.name || 'Unknown',
      assignee: assignee?.name || 'Unassigned',
      labels: labels?.nodes?.map((l) => l.name).join(', ') || '',
      estimate: issue.estimate,
      dueDate: issue.dueDate,
    };
  },

  /**
   * Transform for search results
   */
  toSearchResult: async (issue: Issue, searchQuery: string) => {
    const state = await issue.state;
    return {
      ...IssueTransformers.toReference(issue),
      description: issue.description?.substring(0, 200),
      priority: issue.priority,
      state: state?.name,
      matchContext: issue.description?.includes(searchQuery) ? 'description' : 'title',
    };
  },
} as const;
