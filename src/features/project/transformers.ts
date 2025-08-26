import type { Project, ProjectCreateInput, ProjectUpdateInput } from '@linear/sdk';

/**
 * Project transformer functions
 * Pure functions for transforming project data between layers
 */
export const ProjectTransformers = {
  /**
   * Transform Linear SDK Project to API response
   */
  toResponse: (project: Project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    url: project.url,
    state: project.state,
    startDate: project.startDate,
    targetDate: project.targetDate,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    completedAt: project.completedAt,
    canceledAt: project.canceledAt,
    sortOrder: project.sortOrder,
    progress: project.progress,
    icon: project.icon,
    color: project.color,
    lead: project.lead ? {
      id: project.lead.id,
      name: project.lead.name,
      email: project.lead.email,
    } : null,
    team: project.teams?.nodes?.[0] ? {
      id: project.teams.nodes[0].id,
      key: project.teams.nodes[0].key,
      name: project.teams.nodes[0].name,
    } : null,
    issueCount: project.issues?.nodes?.length || 0,
  }),

  /**
   * Transform create input to Linear SDK format
   */
  fromCreateInput: (input: {
    name: string;
    description?: string;
    teamIds: string[];
    leadId?: string;
    state?: 'planned' | 'started' | 'paused' | 'completed' | 'canceled';
    startDate?: Date;
    targetDate?: Date;
    icon?: string;
    color?: string;
  }): ProjectCreateInput => ({
    name: input.name,
    description: input.description,
    teamIds: input.teamIds,
    leadId: input.leadId,
    state: input.state,
    startDate: input.startDate,
    targetDate: input.targetDate,
    icon: input.icon,
    color: input.color,
  }),

  /**
   * Transform update input to Linear SDK format
   */
  fromUpdateInput: (input: {
    name?: string;
    description?: string;
    leadId?: string | null;
    state?: 'planned' | 'started' | 'paused' | 'completed' | 'canceled';
    startDate?: Date | null;
    targetDate?: Date | null;
    icon?: string;
    color?: string;
  }): ProjectUpdateInput => ({
    name: input.name,
    description: input.description,
    leadId: input.leadId,
    state: input.state,
    startDate: input.startDate,
    targetDate: input.targetDate,
    icon: input.icon,
    color: input.color,
  }),

  /**
   * Transform to project reference (minimal data for relationships)
   */
  toReference: (project: Project) => ({
    id: project.id,
    name: project.name,
    state: project.state,
    url: project.url,
  }),

  /**
   * Transform for list display
   */
  toListItem: (project: Project) => ({
    id: project.id,
    name: project.name,
    state: project.state,
    progress: `${Math.round(project.progress * 100)}%`,
    lead: project.lead?.name || 'No lead',
    targetDate: project.targetDate,
    issueCount: project.issues?.nodes?.length || 0,
  }),

  /**
   * Transform for project selector
   */
  toSelectorOption: (project: Project) => ({
    value: project.id,
    label: project.name,
    state: project.state,
    icon: project.icon,
    color: project.color,
  }),

  /**
   * Transform for timeline display
   */
  toTimelineItem: (project: Project) => ({
    id: project.id,
    name: project.name,
    startDate: project.startDate,
    targetDate: project.targetDate,
    completedAt: project.completedAt,
    state: project.state,
    progress: project.progress,
    color: project.color,
  }),
} as const;