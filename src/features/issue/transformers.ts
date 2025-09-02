import type { Issue, LinearDocument } from '@linear/sdk';

type IssueCreateInput = LinearDocument.IssueCreateInput;
type IssueUpdateInput = LinearDocument.IssueUpdateInput;

/**
 * Issue transformer functions
 * Pure functions for transforming issue data between layers
 */
export const IssueTransformers = {
  /**
   * Transform create input to Linear SDK format
   */
  fromCreateInput: (input: {
    title: string;
    description?: string;
    teamId: string;
    priority?: number;
    estimate?: number;
    assigneeId?: string;
    stateId?: string;
    projectId?: string;
    cycleId?: string;
    labelIds?: string[];
    parentId?: string;
    dueDate?: Date;
  }): IssueCreateInput => ({
    title: input.title,
    description: input.description,
    teamId: input.teamId,
    priority: input.priority,
    estimate: input.estimate,
    assigneeId: input.assigneeId,
    stateId: input.stateId,
    projectId: input.projectId,
    cycleId: input.cycleId,
    labelIds: input.labelIds,
    parentId: input.parentId,
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
    assigneeId?: string;
    stateId?: string;
    projectId?: string;
    cycleId?: string;
    labelIds?: string[];
    parentId?: string;
    dueDate?: Date;
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
    parentId: input.parentId,
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

  // TODO: Fix these transformers to handle LinearFetch properties correctly
  /*
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
    labels: issue.labels()?.nodes?.map(label => ({
      id: label.id,
      name: label.name,
      color: label.color,
    })) || [],
    comments: issue.comments()?.nodes?.map(comment => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
    })) || [],
    children: issue.children()?.nodes?.map(child => ({
      id: child.id,
      identifier: child.identifier,
      title: child.title,
    })) || [],
  }),

  toListItem: (issue: Issue) => ({
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    priority: issue.priority,
    estimate: issue.estimate,
    state: {
      name: issue.state?.name || 'Unknown',
    },
    assignee: {
      name: issue.assignee?.name || 'Unassigned',
    },
    labels: issue.labels()?.nodes?.map(l => l.name) || [],
    url: issue.url,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  }),

  toBoardCard: (issue: Issue) => ({
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    priority: issue.priority,
    estimate: issue.estimate,
    assignee: issue.assignee ? {
      id: issue.assignee.id,
      name: issue.assignee.name,
    } : null,
    labels: issue.labels()?.nodes?.map(label => ({
      name: label.name,
      color: label.color,
    })) || [],
    url: issue.url,
  }),

  toNotification: (issue: Issue, action: string) => ({
    type: 'issue' as const,
    issueId: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    action,
    assigneeName: issue.assignee?.name,
    teamName: issue.team?.name,
    url: issue.url,
    createdAt: issue.createdAt,
  }),

  toSelectorOption: (issue: Issue) => ({
    value: issue.id,
    label: `${issue.identifier}: ${issue.title}`,
    identifier: issue.identifier,
    title: issue.title,
    state: issue.state?.name,
  }),
  */
} as const;
