/**
 * Issue calculation functions
 * Pure functions for calculating issue metrics
 * Note: These functions expect pre-fetched data, not Linear SDK Issue objects
 */

export interface IssueData {
  id: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  startedAt?: string;
  canceledAt?: string;
  dueDate?: string;
  estimate?: number;
  priority?: number;
  stateType?: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
  labels?: Array<{ name: string }>;
  children?: Array<{ id: string }>;
  comments?: Array<{ createdAt: string }>;
  assigneeId?: string;
}

export const IssueCalculations = {
  /**
   * Calculate cycle time (from started to completed) in hours
   */
  cycleTime: (issue: IssueData): number | null => {
    if (!issue.startedAt || !issue.completedAt) {
      return null;
    }

    const started = new Date(issue.startedAt);
    const completed = new Date(issue.completedAt);
    return (completed.getTime() - started.getTime()) / (1000 * 60 * 60); // Hours
  },

  /**
   * Calculate lead time (from created to completed) in hours
   */
  leadTime: (issue: IssueData): number | null => {
    if (!issue.createdAt || !issue.completedAt) {
      return null;
    }

    const created = new Date(issue.createdAt);
    const completed = new Date(issue.completedAt);
    return (completed.getTime() - created.getTime()) / (1000 * 60 * 60); // Hours
  },

  /**
   * Calculate time in current state in hours
   * Note: Using updatedAt as proxy for state change time
   */
  timeInState: (issue: IssueData): number => {
    if (!issue.updatedAt) {
      return 0;
    }

    const updated = new Date(issue.updatedAt);
    const now = new Date();
    return (now.getTime() - updated.getTime()) / (1000 * 60 * 60); // Hours
  },

  /**
   * Calculate days until due date
   */
  daysUntilDue: (issue: IssueData): number | null => {
    if (!issue.dueDate) {
      return null;
    }

    const due = new Date(issue.dueDate);
    const now = new Date();
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)); // Days
  },

  /**
   * Check if issue is overdue
   */
  isOverdue: (issue: IssueData): boolean => {
    if (!issue.dueDate) {
      return false;
    }

    const due = new Date(issue.dueDate);
    return due < new Date() && issue.stateType !== 'completed';
  },

  /**
   * Calculate issue age in days
   */
  age: (issue: IssueData): number => {
    const created = new Date(issue.createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)); // Days
  },

  /**
   * Calculate blocked time (based on blocked label)
   * Note: This is simplified - full implementation would need label history
   */
  blockedTime: (issue: IssueData): number => {
    const hasBlockedLabel = issue.labels?.some((label) =>
      label.name.toLowerCase().includes('blocked'),
    );

    // If currently blocked, estimate based on last update
    if (hasBlockedLabel && issue.updatedAt) {
      const updated = new Date(issue.updatedAt);
      const now = new Date();
      return (now.getTime() - updated.getTime()) / (1000 * 60 * 60); // Hours
    }

    return 0;
  },

  /**
   * Calculate issue complexity score based on various factors
   */
  complexityScore: (issue: IssueData): number => {
    let score = 0;

    // Base score from estimate
    score += (issue.estimate || 0) * 10;

    // Add for high priority
    if (issue.priority && issue.priority <= 2) {
      score += 20;
    }

    // Add for dependencies
    if (issue.children?.length) {
      score += issue.children.length * 5;
    }

    // Add for blocked status
    if (issue.labels?.some((l) => l.name.toLowerCase().includes('blocked'))) {
      score += 15;
    }

    // Add for number of comments (indicates discussion/complexity)
    if (issue.comments?.length) {
      score += Math.min(issue.comments.length * 2, 20);
    }

    return score;
  },

  /**
   * Calculate SLA status
   */
  slaStatus: (
    issue: IssueData,
    slaHours: number,
  ): { status: 'on-time' | 'at-risk' | 'breached'; remainingHours: number } => {
    const age = IssueCalculations.age(issue) * 24; // Convert to hours
    const remainingHours = slaHours - age;

    let status: 'on-time' | 'at-risk' | 'breached';
    if (issue.stateType === 'completed') {
      status = age <= slaHours ? 'on-time' : 'breached';
    } else if (remainingHours < 0) {
      status = 'breached';
    } else if (remainingHours < slaHours * 0.2) {
      // Less than 20% time remaining
      status = 'at-risk';
    } else {
      status = 'on-time';
    }

    return { status, remainingHours: Math.max(0, remainingHours) };
  },

  /**
   * Calculate response time (time to first comment) in hours
   */
  responseTime: (issue: IssueData): number | null => {
    if (!issue.comments?.length) {
      return null;
    }

    // Assume comments are sorted by creation time
    const firstComment = issue.comments[0];
    if (!firstComment.createdAt) {
      return null;
    }

    const created = new Date(issue.createdAt);
    const firstResponse = new Date(firstComment.createdAt);
    return (firstResponse.getTime() - created.getTime()) / (1000 * 60 * 60); // Hours
  },

  /**
   * Calculate resolution rate for a set of issues
   */
  resolutionRate: (issues: IssueData[]): number => {
    if (issues.length === 0) {
      return 0;
    }

    const resolved = issues.filter(
      (issue) => issue.stateType === 'completed' || issue.stateType === 'canceled',
    ).length;

    return (resolved / issues.length) * 100;
  },

  /**
   * Estimate completion date based on velocity
   */
  estimatedCompletion: (issue: IssueData, teamVelocityPerDay: number): Date | null => {
    if (!issue.estimate || issue.stateType === 'completed') {
      return null;
    }

    const daysNeeded = Math.ceil(issue.estimate / teamVelocityPerDay);
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysNeeded);

    return estimatedDate;
  },
} as const;
