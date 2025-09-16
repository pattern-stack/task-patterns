import type { IssueLabel } from '@linear/sdk';
import type { IssueLabelCreateInput, IssueLabelUpdateInput } from '@linear/sdk/dist/_generated_documents';

/**
 * Label transformer functions
 * Pure functions for transforming label data between layers
 */
export const LabelTransformers = {
  /**
   * Transform Linear SDK Label to API response
   */
  toResponse: async (label: IssueLabel) => {
    const issues = await label.issues();
    return {
      id: label.id,
      name: label.name,
      description: label.description,
      color: label.color,
      createdAt: label.createdAt,
      updatedAt: label.updatedAt,
      issueCount: issues?.nodes?.length || 0,
    };
  },

  /**
   * Transform create input to Linear SDK format
   */
  fromCreateInput: (input: {
    name: string;
    description?: string;
    color?: string;
    teamId?: string;
  }): IssueLabelCreateInput => ({
    name: input.name,
    description: input.description,
    color: input.color,
    teamId: input.teamId,
  }),

  /**
   * Transform update input to Linear SDK format
   */
  fromUpdateInput: (input: {
    name?: string;
    description?: string;
    color?: string;
  }): IssueLabelUpdateInput => ({
    name: input.name,
    description: input.description,
    color: input.color,
  }),

  /**
   * Transform to label reference (minimal data for relationships)
   */
  toReference: (label: IssueLabel) => ({
    id: label.id,
    name: label.name,
    color: label.color,
  }),

  /**
   * Transform for list display
   */
  toListItem: async (label: IssueLabel) => {
    const issues = await label.issues();
    return {
      id: label.id,
      name: label.name,
      color: label.color,
      issueCount: issues?.nodes?.length || 0,
      description: label.description?.substring(0, 100),
    };
  },

  /**
   * Transform for label selector
   */
  toSelectorOption: (label: IssueLabel) => ({
    value: label.id,
    label: label.name,
    color: label.color,
    description: label.description,
  }),

  /**
   * Transform for label badge display
   */
  toBadge: (label: IssueLabel) => ({
    name: label.name,
    color: label.color,
  }),
} as const;