import type { Issue, User } from '@linear/sdk';

/**
 * Issue validation functions
 * Pure functions for validating issue data
 */
export const IssueValidators = {
  /**
   * Validate issue title
   */
  isValidTitle: (title: string): boolean => {
    return title.length > 0 && title.length <= 255;
  },

  /**
   * Validate issue priority (0-4 scale in Linear)
   */
  isValidPriority: (priority: number): boolean => {
    return Number.isInteger(priority) && priority >= 0 && priority <= 4;
  },

  /**
   * Validate issue estimate
   */
  isValidEstimate: (estimate: number): boolean => {
    return estimate > 0 && Number.isFinite(estimate);
  },

  /**
   * Validate issue description length
   */
  isValidDescription: (description: string): boolean => {
    return description.length <= 100000; // Linear's limit
  },

  /**
   * Check if user can edit issue
   */
  canEditIssue: async (issue: Issue, userId: string): Promise<boolean> => {
    // Check if user is creator or assignee
    const creator = await issue.creator;
    const assignee = await issue.assignee;
    return creator?.id === userId || assignee?.id === userId;
  },

  /**
   * Check if issue is in active state
   */
  isActive: (issue: Issue): boolean => {
    const completedTypes = ['completed', 'canceled'];
    // Access state properties correctly
    const stateType = (issue.state as any)?.type || '';
    return !completedTypes.includes(stateType);
  },

  /**
   * Check if issue is blocked
   */
  isBlocked: (issue: Issue): boolean => {
    // Check for blocking issues or blocked label
    const labels = (issue.labels as any)?.nodes || [];
    return labels.some((label: any) => 
      label.name?.toLowerCase().includes('blocked')
    ) || false;
  },

  /**
   * Validate parent-child relationship
   */
  canBeChild: async (issue: Issue, parentId: string): Promise<boolean> => {
    // Prevent circular dependencies
    const parent = await issue.parent;
    return issue.id !== parentId && parent?.id !== parentId;
  },

  /**
   * Check if issue can be archived
   */
  canArchive: (issue: Issue): boolean => {
    // Only completed or canceled issues can be archived
    const archivableStates = ['completed', 'canceled'];
    const stateType = (issue.state as any)?.type || '';
    return archivableStates.includes(stateType);
  },

  /**
   * Validate due date
   */
  isValidDueDate: (dueDate: string | Date): boolean => {
    const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return date instanceof Date && !isNaN(date.getTime()) && date > new Date();
  },
} as const;