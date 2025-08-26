import type { Issue, IssueCreateInput, IssueUpdateInput } from '@linear/sdk';

/**
 * Issue transformer functions
 * Pure functions for transforming issue data between layers
 */
export const IssueTransformers = {
  /**
   * Transform Linear SDK Issue to API response
   */
  toResponse: (issue: Issue) => ({
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
    assignee: issue.assignee ? {
      id: issue.assignee.id,
      name: issue.assignee.name,
      email: issue.assignee.email,
    } : null,
    state: issue.state ? {
      id: issue.state.id,
      name: issue.state.name,
      type: issue.state.type,
    } : null,
    team: issue.team ? {
      id: issue.team.id,
      name: issue.team.name,
      key: issue.team.key,
    } : null,
    project: issue.project ? {
      id: issue.project.id,
      name: issue.project.name,
    } : null,
    cycle: issue.cycle ? {
      id: issue.cycle.id,
      name: issue.cycle.name,
      number: issue.cycle.number,
    } : null,
    labels: issue.labels?.nodes?.map(label => ({
      id: label.id,
      name: label.name,
      color: label.color,
    })) || [],
    comments: issue.comments?.nodes?.map(comment => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      user: {
        id: comment.user.id,
        name: comment.user.name,
      },
    })) || [],
  }),

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
  toListItem: (issue: Issue) => ({
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    priority: issue.priority,
    state: issue.state?.name || 'Unknown',
    assignee: issue.assignee?.name || 'Unassigned',
    labels: issue.labels?.nodes?.map(l => l.name).join(', ') || '',
    estimate: issue.estimate,
    dueDate: issue.dueDate,
  }),

  /**
   * Transform for search results
   */
  toSearchResult: (issue: Issue, searchQuery: string) => ({
    ...IssueTransformers.toReference(issue),
    description: issue.description?.substring(0, 200),
    priority: issue.priority,
    state: issue.state?.name,
    matchContext: issue.description?.includes(searchQuery) 
      ? 'description' 
      : 'title',
  }),
} as const;