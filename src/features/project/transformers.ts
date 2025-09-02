import type { Project, LinearDocument } from '@linear/sdk';

type ProjectCreateInput = LinearDocument.ProjectCreateInput;
type ProjectUpdateInput = LinearDocument.ProjectUpdateInput;

/**
 * Project transformer functions
 * Pure functions for transforming project data between layers
 */
export const ProjectTransformers = {
  /**
   * Transform create input to Linear SDK format
   */
  fromCreateInput: (input: {
    name: string;
    description?: string;
    teamIds: string[];
    leadId?: string;
    state?: string;
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
    state?: string;
    leadId?: string;
    startDate?: Date;
    targetDate?: Date;
    completedAt?: Date;
    canceledAt?: Date;
    icon?: string;
    color?: string;
  }): ProjectUpdateInput => ({
    name: input.name,
    description: input.description,
    state: input.state,
    leadId: input.leadId,
    startDate: input.startDate,
    targetDate: input.targetDate,
    completedAt: input.completedAt,
    canceledAt: input.canceledAt,
    icon: input.icon,
    color: input.color,
  }),

  /**
   * Transform to project reference (minimal data for relationships)
   */
  toReference: (project: Project) => ({
    id: project.id,
    name: project.name,
    url: project.url,
  }),

  // TODO: Fix these transformers to handle LinearFetch properties correctly
  /*
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

  toListItem: (project: Project) => ({
    id: project.id,
    name: project.name,
    state: project.state,
    progress: project.progress,
    startDate: project.startDate,
    targetDate: project.targetDate,
    leadName: project.lead?.name,
    issueCount: project.issues?.nodes?.length || 0,
    url: project.url,
  }),

  toSelectorOption: (project: Project) => ({
    value: project.id,
    label: project.name,
    state: project.state,
    icon: project.icon,
    color: project.color,
  }),

  toMilestone: (project: Project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    targetDate: project.targetDate,
    completedAt: project.completedAt,
    progress: project.progress,
    issueCount: project.issues?.nodes?.length || 0,
  }),

  toRoadmapItem: (project: Project) => ({
    id: project.id,
    name: project.name,
    description: project.description?.substring(0, 200),
    state: project.state,
    progress: project.progress,
    startDate: project.startDate,
    targetDate: project.targetDate,
    lead: project.lead ? {
      name: project.lead.name,
    } : null,
    color: project.color,
    icon: project.icon,
    url: project.url,
  }),
  */
} as const;
