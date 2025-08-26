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
  canEditIssue: (issue: Issue, userId: string): boolean => {
    // Check if user is creator or assignee
    return issue.creatorId === userId || issue.assigneeId === userId;
  },

  /**
   * Check if issue is in active state
   */
  isActive: (issue: Issue): boolean => {
    const completedTypes = ['completed', 'canceled'];
    return !completedTypes.includes(issue.state?.type || '');
  },

  /**
   * Check if issue is blocked
   */
  isBlocked: (issue: Issue): boolean => {
    // Check for blocking issues or blocked label
    return issue.labels?.nodes?.some(label => 
      label.name.toLowerCase().includes('blocked')
    ) || false;
  },

  /**
   * Validate parent-child relationship
   */
  canBeChild: (issue: Issue, parentId: string): boolean => {
    // Prevent circular dependencies
    return issue.id !== parentId && issue.parentId !== parentId;
  },

  /**
   * Check if issue can be archived
   */
  canArchive: (issue: Issue): boolean => {
    // Only completed or canceled issues can be archived
    const archivableStates = ['completed', 'canceled'];
    return archivableStates.includes(issue.state?.type || '');
  },

  /**
   * Validate due date
   */
  isValidDueDate: (dueDate: string | Date): boolean => {
    const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return date instanceof Date && !isNaN(date.getTime()) && date > new Date();
  },
} as const;