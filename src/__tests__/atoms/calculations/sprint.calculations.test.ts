import { SprintCalculations, IssueData } from '@atoms/calculations/sprint.calculations';
import { CalculationTestUtils } from '../../utils/atoms-test-helpers';

describe('SprintCalculations', () => {
  // Test data generators
  const createIssue = (overrides: Partial<IssueData> = {}): IssueData => ({
    id: 'issue-1',
    createdAt: new Date('2024-01-01').toISOString(),
    estimate: 5,
    stateType: 'started',
    labels: [],
    assigneeId: 'user-1',
    ...overrides,
  });

  const createCompletedIssue = (id: string, estimate = 5): IssueData => ({
    id,
    createdAt: new Date('2024-01-01').toISOString(),
    estimate,
    stateType: 'completed',
    completedAt: new Date('2024-01-15').toISOString(),
    startedAt: new Date('2024-01-10').toISOString(),
  });

  describe('velocity', () => {
    it('should calculate velocity for completed issues', () => {
      const issues: IssueData[] = [
        createIssue({ stateType: 'completed', estimate: 5 }),
        createIssue({ stateType: 'completed', estimate: 3 }),
        createIssue({ stateType: 'started', estimate: 8 }), // not completed
        createIssue({ stateType: 'completed', estimate: 2 }),
      ];

      expect(SprintCalculations.velocity(issues)).toBe(10); // 5 + 3 + 2
    });

    it('should handle issues without estimates', () => {
      const issues: IssueData[] = [
        createIssue({ stateType: 'completed', estimate: undefined }),
        createIssue({ stateType: 'completed', estimate: 5 }),
        createIssue({ stateType: 'completed', estimate: undefined }),
      ];

      expect(SprintCalculations.velocity(issues)).toBe(5);
    });

    it('should return 0 for empty array', () => {
      expect(SprintCalculations.velocity([])).toBe(0);
    });

    it('should return 0 when no issues are completed', () => {
      const issues: IssueData[] = [
        createIssue({ stateType: 'started', estimate: 5 }),
        createIssue({ stateType: 'backlog', estimate: 3 }),
      ];

      expect(SprintCalculations.velocity(issues)).toBe(0);
    });
  });

  describe('progress', () => {
    it('should calculate progress percentage', () => {
      const issues: IssueData[] = [
        createIssue({ stateType: 'completed' }),
        createIssue({ stateType: 'completed' }),
        createIssue({ stateType: 'started' }),
        createIssue({ stateType: 'backlog' }),
      ];

      expect(SprintCalculations.progress(issues)).toBe(50); // 2/4 * 100
    });

    it('should count canceled issues as completed', () => {
      const issues: IssueData[] = [
        createIssue({ stateType: 'completed' }),
        createIssue({ stateType: 'canceled' }),
        createIssue({ stateType: 'started' }),
        createIssue({ stateType: 'started' }),
      ];

      expect(SprintCalculations.progress(issues)).toBe(50); // 2/4 * 100
    });

    it('should return 0 for empty array', () => {
      expect(SprintCalculations.progress([])).toBe(0);
    });

    it('should return 100 when all issues are completed', () => {
      const issues: IssueData[] = [
        createIssue({ stateType: 'completed' }),
        createIssue({ stateType: 'completed' }),
        createIssue({ stateType: 'canceled' }),
      ];

      expect(SprintCalculations.progress(issues)).toBe(100);
    });
  });

  describe('pointsProgress', () => {
    it('should calculate points progress', () => {
      const issues: IssueData[] = [
        createIssue({ stateType: 'completed', estimate: 5 }),
        createIssue({ stateType: 'completed', estimate: 3 }),
        createIssue({ stateType: 'started', estimate: 8 }),
        createIssue({ stateType: 'backlog', estimate: 2 }),
      ];

      const result = SprintCalculations.pointsProgress(issues);
      expect(result.completed).toBe(8); // 5 + 3
      expect(result.total).toBe(18); // 5 + 3 + 8 + 2
      CalculationTestUtils.assertWithinTolerance(result.percentage, 44.44, 0.01);
    });

    it('should handle issues without estimates', () => {
      const issues: IssueData[] = [
        createIssue({ stateType: 'completed', estimate: undefined }),
        createIssue({ stateType: 'completed', estimate: 5 }),
        createIssue({ stateType: 'started', estimate: undefined }),
      ];

      const result = SprintCalculations.pointsProgress(issues);
      expect(result.completed).toBe(5);
      expect(result.total).toBe(5);
      expect(result.percentage).toBe(100);
    });

    it('should return 0 percentage when no points exist', () => {
      const issues: IssueData[] = [
        createIssue({ estimate: undefined }),
        createIssue({ estimate: undefined }),
      ];

      const result = SprintCalculations.pointsProgress(issues);
      expect(result.completed).toBe(0);
      expect(result.total).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should only count completed issues, not canceled', () => {
      const issues: IssueData[] = [
        createIssue({ stateType: 'completed', estimate: 5 }),
        createIssue({ stateType: 'canceled', estimate: 3 }), // not counted
        createIssue({ stateType: 'started', estimate: 2 }),
      ];

      const result = SprintCalculations.pointsProgress(issues);
      expect(result.completed).toBe(5);
      expect(result.total).toBe(10);
      expect(result.percentage).toBe(50);
    });
  });

  describe('burndown', () => {
    it('should generate burndown data', () => {
      const issues: IssueData[] = [
        createIssue({ estimate: 10 }),
        createIssue({ estimate: 10 }),
        createIssue({ estimate: 10 }),
      ];

      const burndown = SprintCalculations.burndown(issues, 10);

      expect(burndown).toHaveLength(11); // 10 days + day 0
      expect(burndown[0]).toEqual({ day: 0, remaining: 30 });
      expect(burndown[5]).toEqual({ day: 5, remaining: 15 });
      expect(burndown[10]).toEqual({ day: 10, remaining: 0 });
    });

    it('should handle issues without estimates', () => {
      const issues: IssueData[] = [
        createIssue({ estimate: 10 }),
        createIssue({ estimate: undefined }),
        createIssue({ estimate: 5 }),
      ];

      const burndown = SprintCalculations.burndown(issues, 5);

      expect(burndown[0].remaining).toBe(15);
      expect(burndown[5].remaining).toBe(0);
    });

    it('should handle empty issues array', () => {
      const burndown = SprintCalculations.burndown([], 10);

      expect(burndown).toHaveLength(11);
      burndown.forEach((point) => {
        expect(point.remaining).toBe(0);
      });
    });

    it('should never go negative', () => {
      const issues: IssueData[] = [createIssue({ estimate: 5 })];

      const burndown = SprintCalculations.burndown(issues, 3);

      burndown.forEach((point) => {
        expect(point.remaining).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('estimateCompletion', () => {
    it('should estimate completion date', () => {
      const sprintEndDate = new Date('2024-01-31');
      const result = SprintCalculations.estimateCompletion(20, 5, sprintEndDate);

      // Should take 4 days to complete 20 points at 5 points/day
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 4);

      expect(result.estimatedDate.getDate()).toBe(expectedDate.getDate());
    });

    it('should determine if on track', () => {
      const today = new Date();
      const sprintEndDate = new Date();
      sprintEndDate.setDate(today.getDate() + 10);

      // On track scenario
      const onTrack = SprintCalculations.estimateCompletion(20, 5, sprintEndDate);
      expect(onTrack.onTrack).toBe(true);

      // Off track scenario
      const offTrack = SprintCalculations.estimateCompletion(100, 5, sprintEndDate);
      expect(offTrack.onTrack).toBe(false);
    });

    it('should round up days needed', () => {
      const sprintEndDate = new Date('2024-01-31');
      const result = SprintCalculations.estimateCompletion(22, 5, sprintEndDate);

      // Should take 5 days (22/5 = 4.4, rounded up to 5)
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 5);

      expect(result.estimatedDate.getDate()).toBe(expectedDate.getDate());
    });

    it('should handle zero velocity', () => {
      const sprintEndDate = new Date('2024-01-31');
      const result = SprintCalculations.estimateCompletion(20, 0, sprintEndDate);

      // With zero velocity, should estimate Infinity days
      expect(result.estimatedDate.getTime()).toBe(Infinity);
      expect(result.onTrack).toBe(false);
    });
  });

  describe('teamCapacity', () => {
    it('should calculate team capacity with default values', () => {
      const capacity = SprintCalculations.teamCapacity(5, 10);
      // 5 people * 10 days * 6 points/day * 0.8 efficiency = 240
      expect(capacity).toBe(240);
    });

    it('should calculate team capacity with custom values', () => {
      const capacity = SprintCalculations.teamCapacity(3, 14, 8);
      // 3 people * 14 days * 8 points/day * 0.8 efficiency = 268.8
      expect(capacity).toBeCloseTo(268.8);
    });

    it('should handle zero team size', () => {
      const capacity = SprintCalculations.teamCapacity(0, 10);
      expect(capacity).toBe(0);
    });

    it('should handle zero sprint days', () => {
      const capacity = SprintCalculations.teamCapacity(5, 0);
      expect(capacity).toBe(0);
    });
  });

  describe('healthScore', () => {
    it('should calculate healthy sprint', () => {
      const issues: IssueData[] = [
        createIssue({ stateType: 'completed' }),
        createIssue({ stateType: 'completed' }),
        createIssue({ stateType: 'completed' }),
        createIssue({ stateType: 'started' }),
      ];

      const result = SprintCalculations.healthScore(issues);
      expect(result.score).toBe(75); // 75% progress
      expect(result.status).toBe('healthy');
    });

    it('should penalize blocked issues', () => {
      const issues: IssueData[] = [
        createIssue({ stateType: 'completed' }),
        createIssue({ stateType: 'completed' }),
        createIssue({ stateType: 'started', labels: [{ name: 'blocked' }] }),
        createIssue({ stateType: 'started' }),
      ];

      const result = SprintCalculations.healthScore(issues);
      // 50% progress - (25% blocked * 2) = 0
      expect(result.score).toBe(0);
      expect(result.status).toBe('critical');
    });

    it('should identify at-risk sprint', () => {
      const issues: IssueData[] = [
        createIssue({ stateType: 'completed' }),
        createIssue({ stateType: 'started' }),
        createIssue({ stateType: 'started' }),
        createIssue({ stateType: 'backlog' }),
      ];

      const result = SprintCalculations.healthScore(issues);
      expect(result.score).toBe(25); // 25% progress
      expect(result.status).toBe('critical');
    });

    it('should cap score at 100', () => {
      const issues: IssueData[] = [
        createIssue({ stateType: 'completed' }),
        createIssue({ stateType: 'completed' }),
      ];

      const result = SprintCalculations.healthScore(issues);
      expect(result.score).toBe(100);
      expect(result.status).toBe('healthy');
    });

    it('should handle various blocked label formats', () => {
      const issues: IssueData[] = [
        createIssue({ labels: [{ name: 'BLOCKED' }] }),
        createIssue({ labels: [{ name: 'Blocked by dependency' }] }),
        createIssue({ labels: [{ name: 'is-blocked' }] }),
        createIssue({}),
      ];

      const result = SprintCalculations.healthScore(issues);
      // 0% progress - (75% blocked * 2) = -150, clamped to 0
      expect(result.score).toBe(0);
      expect(result.status).toBe('critical');
    });
  });

  describe('workloadDistribution', () => {
    it('should distribute work by assignee', () => {
      const issues: IssueData[] = [
        createIssue({ assigneeId: 'user-1', estimate: 5 }),
        createIssue({ assigneeId: 'user-1', estimate: 3 }),
        createIssue({ assigneeId: 'user-2', estimate: 8 }),
        createIssue({ assigneeId: 'user-2', estimate: 2 }),
        createIssue({ assigneeId: 'user-3', estimate: 5 }),
      ];

      const distribution = SprintCalculations.workloadDistribution(issues);

      expect(distribution.get('user-1')).toEqual({ count: 2, points: 8 });
      expect(distribution.get('user-2')).toEqual({ count: 2, points: 10 });
      expect(distribution.get('user-3')).toEqual({ count: 1, points: 5 });
    });

    it('should handle unassigned issues', () => {
      const issues: IssueData[] = [
        createIssue({ assigneeId: undefined, estimate: 5 }),
        createIssue({ assigneeId: undefined, estimate: 3 }),
        createIssue({ assigneeId: 'user-1', estimate: 2 }),
      ];

      const distribution = SprintCalculations.workloadDistribution(issues);

      expect(distribution.get('unassigned')).toEqual({ count: 2, points: 8 });
      expect(distribution.get('user-1')).toEqual({ count: 1, points: 2 });
    });

    it('should handle issues without estimates', () => {
      const issues: IssueData[] = [
        createIssue({ assigneeId: 'user-1', estimate: undefined }),
        createIssue({ assigneeId: 'user-1', estimate: 5 }),
      ];

      const distribution = SprintCalculations.workloadDistribution(issues);

      expect(distribution.get('user-1')).toEqual({ count: 2, points: 5 });
    });

    it('should handle empty issues array', () => {
      const distribution = SprintCalculations.workloadDistribution([]);
      expect(distribution.size).toBe(0);
    });
  });

  describe('averageCycleTime', () => {
    it('should calculate average cycle time', () => {
      const issues: IssueData[] = [
        {
          id: 'issue-1',
          createdAt: '2024-01-05T00:00:00Z',
          startedAt: '2024-01-10T00:00:00Z',
          completedAt: '2024-01-15T00:00:00Z', // 5 days
        },
        {
          id: 'issue-2',
          createdAt: '2024-01-05T00:00:00Z',
          startedAt: '2024-01-12T00:00:00Z',
          completedAt: '2024-01-15T00:00:00Z', // 3 days
        },
        {
          id: 'issue-3',
          createdAt: '2024-01-05T00:00:00Z',
          startedAt: '2024-01-08T00:00:00Z',
          completedAt: '2024-01-15T00:00:00Z', // 7 days
        },
      ];

      const avgCycleTime = SprintCalculations.averageCycleTime(issues);
      expect(avgCycleTime).toBe(5); // (5 + 3 + 7) / 3
    });

    it('should ignore issues without dates', () => {
      const issues: IssueData[] = [
        {
          id: 'issue-1',
          createdAt: '2024-01-05T00:00:00Z',
          startedAt: '2024-01-10T00:00:00Z',
          completedAt: '2024-01-15T00:00:00Z', // 5 days
        },
        {
          id: 'issue-2',
          createdAt: '2024-01-05T00:00:00Z',
          startedAt: undefined,
          completedAt: '2024-01-15T00:00:00Z',
        },
        {
          id: 'issue-3',
          createdAt: '2024-01-05T00:00:00Z',
          startedAt: '2024-01-08T00:00:00Z',
          completedAt: undefined,
        },
      ];

      const avgCycleTime = SprintCalculations.averageCycleTime(issues);
      expect(avgCycleTime).toBe(5); // Only first issue counts
    });

    it('should return 0 for empty array', () => {
      expect(SprintCalculations.averageCycleTime([])).toBe(0);
    });

    it('should return 0 when no issues have both dates', () => {
      const issues: IssueData[] = [
        { id: 'issue-1', createdAt: '2024-01-05T00:00:00Z', startedAt: '2024-01-10T00:00:00Z' },
        { id: 'issue-2', createdAt: '2024-01-05T00:00:00Z', completedAt: '2024-01-15T00:00:00Z' },
        { id: 'issue-3', createdAt: '2024-01-05T00:00:00Z' },
      ];

      expect(SprintCalculations.averageCycleTime(issues)).toBe(0);
    });

    it('should handle fractional days', () => {
      const issues: IssueData[] = [
        {
          id: 'issue-1',
          createdAt: '2024-01-05T00:00:00Z',
          startedAt: '2024-01-10T00:00:00Z',
          completedAt: '2024-01-10T12:00:00Z', // 0.5 days
        },
        {
          id: 'issue-2',
          createdAt: '2024-01-05T00:00:00Z',
          startedAt: '2024-01-10T00:00:00Z',
          completedAt: '2024-01-11T06:00:00Z', // 1.25 days
        },
      ];

      const avgCycleTime = SprintCalculations.averageCycleTime(issues);
      expect(avgCycleTime).toBeCloseTo(0.875); // (0.5 + 1.25) / 2
    });
  });
});
