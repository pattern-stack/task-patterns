/**
 * Sprint/Cycle calculation functions
 * Pure functions for calculating sprint metrics
 * Note: These functions expect pre-fetched data, not Linear SDK objects
 */

import type { IssueData } from './issue.calculations';

// Re-export for convenience
export type { IssueData };

export const SprintCalculations = {
  /**
   * Calculate team velocity (sum of completed estimates)
   */
  velocity: (issues: IssueData[]): number => {
    return issues
      .filter((issue) => issue.stateType === 'completed')
      .reduce((sum, issue) => sum + (issue.estimate || 0), 0);
  },

  /**
   * Calculate sprint progress percentage
   */
  progress: (issues: IssueData[]): number => {
    if (issues.length === 0) {
      return 0;
    }

    const completed = issues.filter(
      (issue) => issue.stateType === 'completed' || issue.stateType === 'canceled',
    ).length;

    return (completed / issues.length) * 100;
  },

  /**
   * Calculate points completed vs total points
   */
  pointsProgress: (
    issues: IssueData[],
  ): { completed: number; total: number; percentage: number } => {
    const total = issues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
    const completed = issues
      .filter((issue) => issue.stateType === 'completed')
      .reduce((sum, issue) => sum + (issue.estimate || 0), 0);

    return {
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    };
  },

  /**
   * Calculate burndown data for sprint
   */
  burndown: (
    issues: IssueData[],
    sprintDays: number,
  ): Array<{ day: number; remaining: number }> => {
    const totalPoints = issues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
    const idealBurnRate = totalPoints / sprintDays;

    // Simple linear burndown for now
    // In reality, you'd calculate based on actual completion dates
    return Array.from({ length: sprintDays + 1 }, (_, day) => ({
      day,
      remaining: Math.max(0, totalPoints - idealBurnRate * day),
    }));
  },

  /**
   * Estimate sprint completion based on current velocity
   */
  estimateCompletion: (
    remainingPoints: number,
    dailyVelocity: number,
    sprintEndDate: Date,
  ): { estimatedDate: Date; onTrack: boolean } => {
    const daysNeeded = Math.ceil(remainingPoints / dailyVelocity);
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysNeeded);

    return {
      estimatedDate,
      onTrack: estimatedDate <= sprintEndDate,
    };
  },

  /**
   * Calculate team capacity (available points)
   */
  teamCapacity: (
    teamSize: number,
    sprintDays: number,
    averageCapacityPerPersonPerDay: number = 6,
  ): number => {
    // Account for meetings, reviews, etc. (usually 80% efficiency)
    const efficiencyFactor = 0.8;
    return teamSize * sprintDays * averageCapacityPerPersonPerDay * efficiencyFactor;
  },

  /**
   * Calculate sprint health score
   */
  healthScore: (
    issues: IssueData[],
  ): { score: number; status: 'healthy' | 'at-risk' | 'critical' } => {
    const progress = SprintCalculations.progress(issues);
    const blockedCount = issues.filter((issue) =>
      issue.labels?.some((label) => label.name.toLowerCase().includes('blocked')),
    ).length;
    const blockedPercentage = (blockedCount / issues.length) * 100;

    // Calculate health score (0-100)
    let score = progress;
    score -= blockedPercentage * 2; // Heavily penalize blocked issues
    score = Math.max(0, Math.min(100, score));

    // Determine status
    let status: 'healthy' | 'at-risk' | 'critical';
    if (score >= 70) {
      status = 'healthy';
    } else if (score >= 40) {
      status = 'at-risk';
    } else {
      status = 'critical';
    }

    return { score, status };
  },

  /**
   * Group issues by assignee with counts
   */
  workloadDistribution: (issues: IssueData[]): Map<string, { count: number; points: number }> => {
    const distribution = new Map<string, { count: number; points: number }>();

    issues.forEach((issue) => {
      const assigneeId = issue.assigneeId || 'unassigned';
      const current = distribution.get(assigneeId) || { count: 0, points: 0 };

      distribution.set(assigneeId, {
        count: current.count + 1,
        points: current.points + (issue.estimate || 0),
      });
    });

    return distribution;
  },

  /**
   * Calculate average cycle time in days
   */
  averageCycleTime: (completedIssues: IssueData[]): number => {
    if (completedIssues.length === 0) {
      return 0;
    }

    const cycleTimes = completedIssues
      .filter((issue) => issue.completedAt && issue.startedAt)
      .map((issue) => {
        const started = new Date(issue.startedAt!);
        const completed = new Date(issue.completedAt!);
        return (completed.getTime() - started.getTime()) / (1000 * 60 * 60 * 24); // Convert to days
      });

    if (cycleTimes.length === 0) {
      return 0;
    }
    return cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length;
  },
} as const;
