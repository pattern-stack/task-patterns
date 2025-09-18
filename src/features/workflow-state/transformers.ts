import type { WorkflowState } from '@linear/sdk';
import type {
  WorkflowStateCreateInput,
  WorkflowStateUpdateInput,
} from '@linear/sdk/dist/_generated_documents';

/**
 * WorkflowState transformer functions
 * Pure functions for transforming workflow state data between layers
 */
export const WorkflowStateTransformers = {
  /**
   * Transform Linear SDK WorkflowState to API response
   */
  toResponse: async (state: WorkflowState) => {
    const [team, issues] = await Promise.all([state.team, state.issues()]);

    return {
      id: state.id,
      name: state.name,
      description: state.description,
      color: state.color,
      type: state.type,
      position: state.position,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      team: team
        ? {
            id: team.id,
            key: team.key,
            name: team.name,
          }
        : null,
      issueCount: issues?.nodes?.length || 0,
    };
  },

  /**
   * Transform create input to Linear SDK format
   */
  fromCreateInput: (input: {
    name: string;
    description?: string;
    color: string;
    type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
    teamId: string;
    position?: number;
  }): WorkflowStateCreateInput => ({
    name: input.name,
    description: input.description,
    color: input.color,
    type: input.type,
    teamId: input.teamId,
    position: input.position,
  }),

  /**
   * Transform update input to Linear SDK format
   */
  fromUpdateInput: (input: {
    name?: string;
    description?: string;
    color?: string;
    position?: number;
  }): WorkflowStateUpdateInput => ({
    name: input.name,
    description: input.description,
    color: input.color,
    position: input.position,
  }),

  /**
   * Transform to state reference (minimal data for relationships)
   */
  toReference: (state: WorkflowState) => ({
    id: state.id,
    name: state.name,
    type: state.type,
    color: state.color,
  }),

  /**
   * Transform for list display
   */
  toListItem: async (state: WorkflowState) => {
    const issues = await state.issues();
    return {
      id: state.id,
      name: state.name,
      type: state.type,
      color: state.color,
      position: state.position,
      issueCount: issues?.nodes?.length || 0,
    };
  },

  /**
   * Transform for workflow selector
   */
  toSelectorOption: (state: WorkflowState) => ({
    value: state.id,
    label: state.name,
    type: state.type,
    color: state.color,
  }),

  /**
   * Transform for kanban column
   */
  toKanbanColumn: async (state: WorkflowState) => {
    const issues = await state.issues();
    return {
      id: state.id,
      name: state.name,
      type: state.type,
      color: state.color,
      position: state.position,
      issues: issues?.nodes || [],
    };
  },

  /**
   * Group states by type
   */
  groupByType: (states: WorkflowState[]) => {
    const grouped: Record<string, WorkflowState[]> = {
      backlog: [],
      unstarted: [],
      started: [],
      completed: [],
      canceled: [],
    };

    states.forEach((state) => {
      if (state.type in grouped) {
        grouped[state.type].push(state);
      }
    });

    return grouped;
  },

  /**
   * Check if state is terminal (completed or canceled)
   */
  isTerminal: (state: WorkflowState): boolean => {
    return state.type === 'completed' || state.type === 'canceled';
  },

  /**
   * Check if state is active (started)
   */
  isActive: (state: WorkflowState): boolean => {
    return state.type === 'started';
  },
} as const;
