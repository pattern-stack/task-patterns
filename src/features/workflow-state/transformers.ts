import type { WorkflowState, LinearDocument } from '@linear/sdk';

type WorkflowStateCreateInput = LinearDocument.WorkflowStateCreateInput;
type WorkflowStateUpdateInput = LinearDocument.WorkflowStateUpdateInput;

/**
 * WorkflowState transformer functions
 * Pure functions for transforming workflow state data between layers
 */
export const WorkflowStateTransformers = {
  /**
   * Transform create input to Linear SDK format
   */
  fromCreateInput: (input: {
    name: string;
    type: string;
    teamId: string;
    color?: string;
    description?: string;
  }): WorkflowStateCreateInput => ({
    name: input.name,
    type: input.type as any, // Type assertion needed for enum
    teamId: input.teamId,
    color: input.color || '#000000', // Default color if not provided
    description: input.description,
  }),

  /**
   * Transform update input to Linear SDK format
   */
  fromUpdateInput: (input: {
    name?: string;
    color?: string;
    description?: string;
  }): WorkflowStateUpdateInput => ({
    name: input.name,
    color: input.color,
    description: input.description,
  }),

  /**
   * Transform to workflow state reference (minimal data for relationships)
   */
  toReference: (state: WorkflowState) => ({
    id: state.id,
    name: state.name,
    type: state.type,
  }),

  /**
   * Transform for state selector
   */
  toSelectorOption: (state: WorkflowState) => ({
    value: state.id,
    label: state.name,
    type: state.type,
    color: state.color,
  }),

  // TODO: Fix these transformers to handle LinearFetch properties correctly
  /*
  toResponse: (state: WorkflowState) => ({
    id: state.id,
    name: state.name,
    color: state.color,
    type: state.type,
    description: state.description,
    position: state.position,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    team: state.team ? {
      id: state.team.id,
      key: state.team.key,
      name: state.team.name,
    } : null,
    issueCount: state.issues?.nodes?.length || 0,
  }),

  toListItem: (state: WorkflowState) => ({
    id: state.id,
    name: state.name,
    type: state.type,
    color: state.color,
    position: state.position,
    issueCount: state.issues?.nodes?.length || 0,
  }),

  toWorkflowColumn: (state: WorkflowState) => ({
    id: state.id,
    name: state.name,
    type: state.type,
    color: state.color,
    issues: state.issues?.nodes || [],
  }),

  toTransitionOption: (state: WorkflowState) => ({
    id: state.id,
    name: state.name,
    type: state.type,
    color: state.color,
    canTransitionTo: true, // This would need proper validation
  }),
  */
} as const;
