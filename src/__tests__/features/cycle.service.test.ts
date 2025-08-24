import { CycleService } from '@features/cycle/service';
import { linearClient } from '@atoms/client/linear-client';
import { NotFoundError, ValidationError } from '@atoms/types/common';
import { TestFactory } from '../fixtures/factories';
import {
  createMockCycle,
  createMockPayload,
  createMockCycleConnection,
  createMockLinearClient,
  createMockIssueConnection,
  createMockIssue,
} from '../utils/mocks';

jest.mock('@atoms/client/linear-client');

describe('CycleService', () => {
  let service: CycleService;
  let mockClient: ReturnType<typeof createMockLinearClient>;

  beforeEach(() => {
    TestFactory.reset();
    mockClient = createMockLinearClient();
    (linearClient.getClient as jest.Mock).mockReturnValue(mockClient);
    service = new CycleService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new cycle with valid data', async () => {
      const cycleData = TestFactory.cycleCreate({
        name: 'Sprint 1',
        teamId: 'team-123',
        startsAt: '2024-01-01T00:00:00Z',
        endsAt: '2024-01-14T00:00:00Z',
      });

      const mockCycle = createMockCycle({
        id: 'cycle-123',
        ...cycleData,
        __typename: 'Cycle',
      });

      // Mock cycles call to check for overlapping cycles (should return empty for new cycle creation)
      mockClient.cycles.mockResolvedValue(createMockCycleConnection([]));

      mockClient.createCycle.mockResolvedValue(createMockPayload(true, mockCycle));

      const result = await service.create(cycleData);

      expect(mockClient.createCycle).toHaveBeenCalledWith({
        name: cycleData.name,
        teamId: cycleData.teamId,
        startsAt: new Date(cycleData.startsAt),
        endsAt: new Date(cycleData.endsAt),
        description: cycleData.description,
      });
      expect(result.id).toBe('cycle-123');
      expect(result.name).toBe('Sprint 1');
    });

    it('should throw ValidationError when creation fails', async () => {
      const cycleData = TestFactory.cycleCreate();

      mockClient.createCycle.mockResolvedValue(createMockPayload(false));

      await expect(service.create(cycleData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for overlapping cycles within same team', async () => {
      const existingCycle = createMockCycle({
        startsAt: '2024-01-10T00:00:00Z',
        endsAt: '2024-01-24T00:00:00Z',
        teamId: 'team-123',
      });

      mockClient.cycles.mockResolvedValue(createMockCycleConnection([existingCycle]));

      const cycleData = TestFactory.cycleCreate({
        name: 'Sprint 2',
        teamId: 'team-123',
        startsAt: '2024-01-12T00:00:00Z', // Overlaps with existing cycle
        endsAt: '2024-01-26T00:00:00Z',
      });

      await expect(service.create(cycleData)).rejects.toThrow(ValidationError);
    });

    it('should allow non-overlapping cycles within same team', async () => {
      const existingCycle = createMockCycle({
        startsAt: '2024-01-01T00:00:00Z',
        endsAt: '2024-01-14T00:00:00Z',
        teamId: 'team-123',
      });

      mockClient.cycles.mockResolvedValue(createMockCycleConnection([existingCycle]));

      const cycleData = TestFactory.cycleCreate({
        name: 'Sprint 2',
        teamId: 'team-123',
        startsAt: '2024-01-15T00:00:00Z', // No overlap
        endsAt: '2024-01-29T00:00:00Z',
      });

      const mockCycle = createMockCycle({
        id: 'cycle-123',
        ...cycleData,
        __typename: 'Cycle',
      });

      mockClient.createCycle.mockResolvedValue(createMockPayload(true, mockCycle));

      const result = await service.create(cycleData);
      expect(result.id).toBe('cycle-123');
    });

    it('should allow overlapping cycles in different teams', async () => {
      const existingCycle = createMockCycle({
        startsAt: '2024-01-01T00:00:00Z',
        endsAt: '2024-01-14T00:00:00Z',
        teamId: 'team-456', // Different team
      });

      // Mock cycles call will filter by team, so should return empty since we're creating for team-123
      mockClient.cycles.mockResolvedValue(createMockCycleConnection([]));

      const cycleData = TestFactory.cycleCreate({
        name: 'Sprint 1',
        teamId: 'team-123', // Different team
        startsAt: '2024-01-01T00:00:00Z', // Same dates but different team
        endsAt: '2024-01-14T00:00:00Z',
      });

      const mockCycle = createMockCycle({
        id: 'cycle-123',
        ...cycleData,
        __typename: 'Cycle',
      });

      mockClient.createCycle.mockResolvedValue(createMockPayload(true, mockCycle));

      const result = await service.create(cycleData);
      expect(result.id).toBe('cycle-123');
    });
  });

  describe('get', () => {
    it('should return a cycle when found', async () => {
      const mockCycle = createMockCycle();
      mockClient.cycle.mockResolvedValue(mockCycle);

      const result = await service.get('cycle-123');

      expect(mockClient.cycle).toHaveBeenCalledWith('cycle-123');
      expect(result).toEqual(mockCycle);
    });

    it('should return null when cycle not found', async () => {
      mockClient.cycle.mockRejectedValue(new Error('Not found'));

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a cycle successfully', async () => {
      const mockCycle = createMockCycle();
      const updateData = TestFactory.cycleUpdate();

      mockClient.cycle.mockResolvedValue(mockCycle);
      mockClient.updateCycle.mockResolvedValue(
        createMockPayload(true, { ...mockCycle, ...updateData }),
      );

      const result = await service.update('cycle-123', updateData);

      expect(mockClient.updateCycle).toHaveBeenCalledWith(
        'cycle-123',
        expect.objectContaining({
          name: updateData.name,
          description: updateData.description,
        }),
      );
      expect(result.name).toBe(updateData.name);
    });

    it('should throw NotFoundError when cycle does not exist', async () => {
      mockClient.cycle.mockRejectedValue(new Error('Not found'));

      await expect(service.update('nonexistent', TestFactory.cycleUpdate())).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ValidationError when update fails', async () => {
      const mockCycle = createMockCycle();
      mockClient.cycle.mockResolvedValue(mockCycle);
      mockClient.updateCycle.mockResolvedValue(createMockPayload(false));

      await expect(service.update('cycle-123', TestFactory.cycleUpdate())).rejects.toThrow(
        ValidationError,
      );
    });

    it('should prevent creating overlapping cycles when updating dates', async () => {
      const existingCycle = createMockCycle({
        startsAt: '2024-01-15T00:00:00Z',
        endsAt: '2024-01-29T00:00:00Z',
        teamId: 'team-123',
      });

      const cycleToUpdate = createMockCycle({
        id: 'cycle-update',
        teamId: 'team-123',
      });

      mockClient.cycle.mockResolvedValue(cycleToUpdate);
      mockClient.cycles.mockResolvedValue(createMockCycleConnection([existingCycle]));

      const updateData = TestFactory.cycleUpdate({
        startsAt: '2024-01-20T00:00:00Z', // Would overlap
        endsAt: '2024-02-03T00:00:00Z',
      });

      await expect(service.update('cycle-update', updateData)).rejects.toThrow(ValidationError);
    });
  });

  describe('archive', () => {
    it('should archive a cycle successfully', async () => {
      const mockCycle = createMockCycle();
      mockClient.cycle.mockResolvedValue(mockCycle);
      mockClient.archiveCycle.mockResolvedValue(createMockPayload(true));

      const result = await service.archive('cycle-123');

      expect(mockClient.archiveCycle).toHaveBeenCalledWith('cycle-123');
      expect(result).toBe(true);
    });

    it('should throw NotFoundError when cycle does not exist', async () => {
      mockClient.cycle.mockRejectedValue(new Error('Not found'));

      await expect(service.archive('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should list cycles with filters', async () => {
      const mockCycles = [createMockCycle({ id: '1' }), createMockCycle({ id: '2' })];
      mockClient.cycles.mockResolvedValue(createMockCycleConnection(mockCycles));

      const filter = TestFactory.cycleFilter({
        teamId: 'team-123',
        isActive: true,
      });

      const result = await service.list(filter);

      expect(mockClient.cycles).toHaveBeenCalledWith({
        filter: expect.objectContaining({
          team: { id: { eq: 'team-123' } },
        }),
        includeArchived: false,
        first: undefined,
      });
      expect(result.nodes).toEqual(mockCycles);
    });

    it('should handle pagination parameters', async () => {
      mockClient.cycles.mockResolvedValue(createMockCycleConnection([]));

      await service.list(undefined, { first: 50, after: 'cursor-123' });

      expect(mockClient.cycles).toHaveBeenCalledWith({
        filter: {},
        includeArchived: undefined,
        first: 50,
        after: 'cursor-123',
      });
    });
  });

  describe('getActive', () => {
    it('should return the currently active cycle', async () => {
      const now = new Date();
      const activeCycle = createMockCycle({
        id: 'cycle-active',
        startsAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        teamId: 'team-123',
      });

      mockClient.cycles.mockResolvedValue(createMockCycleConnection([activeCycle]));

      const result = await service.getActive('team-123');

      expect(mockClient.cycles).toHaveBeenCalledWith({
        filter: {
          team: { id: { eq: 'team-123' } },
        },
        includeArchived: false,
      });
      expect(result?.id).toBe('cycle-active');
    });

    it('should return null when no active cycle exists', async () => {
      mockClient.cycles.mockResolvedValue(createMockCycleConnection([]));

      const result = await service.getActive('team-123');

      expect(result).toBeNull();
    });

    it('should return null when only past cycles exist', async () => {
      const now = new Date();
      const pastCycle = createMockCycle({
        startsAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        teamId: 'team-123',
      });

      mockClient.cycles.mockResolvedValue(createMockCycleConnection([pastCycle]));

      const result = await service.getActive('team-123');

      expect(result).toBeNull();
    });

    it('should return null when only future cycles exist', async () => {
      const now = new Date();
      const futureCycle = createMockCycle({
        startsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        teamId: 'team-123',
      });

      mockClient.cycles.mockResolvedValue(createMockCycleConnection([futureCycle]));

      const result = await service.getActive('team-123');

      expect(result).toBeNull();
    });
  });

  describe('getUpcoming', () => {
    it('should return upcoming cycles for a team', async () => {
      const now = new Date();
      const upcomingCycle = createMockCycle({
        startsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      });

      mockClient.cycles.mockResolvedValue(createMockCycleConnection([upcomingCycle]));

      const result = await service.getUpcoming('team-123');

      expect(mockClient.cycles).toHaveBeenCalledWith({
        filter: {
          team: { id: { eq: 'team-123' } },
        },
        includeArchived: false,
      });
      expect(result.nodes).toHaveLength(1);
    });

    it('should return empty list when no upcoming cycles exist', async () => {
      mockClient.cycles.mockResolvedValue(createMockCycleConnection([]));

      const result = await service.getUpcoming('team-123');

      expect(result.nodes).toHaveLength(0);
    });
  });

  describe('getCompleted', () => {
    it('should return completed cycles for a team', async () => {
      const completedCycle = createMockCycle({
        completedAt: '2024-01-14T00:00:00Z',
      });

      mockClient.cycles.mockResolvedValue(createMockCycleConnection([completedCycle]));

      const result = await service.getCompleted('team-123');

      expect(mockClient.cycles).toHaveBeenCalledWith({
        filter: {
          team: { id: { eq: 'team-123' } },
        },
        includeArchived: false,
      });
      expect(result.nodes).toHaveLength(1);
    });
  });

  describe('getIssues', () => {
    it('should return issues in a cycle', async () => {
      const mockIssues = [
        createMockIssue({ id: '1', cycleId: 'cycle-123' }),
        createMockIssue({ id: '2', cycleId: 'cycle-123' }),
      ];

      mockClient.issues.mockResolvedValue(createMockIssueConnection(mockIssues));

      const result = await service.getIssues('cycle-123');

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          cycle: { id: { eq: 'cycle-123' } },
        },
        includeArchived: false,
      });
      expect(result.nodes).toEqual(mockIssues);
    });

    it('should apply additional filters when getting cycle issues', async () => {
      mockClient.issues.mockResolvedValue(createMockIssueConnection([]));

      await service.getIssues('cycle-123', {
        state: 'completed',
        assigneeId: 'user-123',
        includeArchived: false,
      });

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          cycle: { id: { eq: 'cycle-123' } },
          state: { type: { eq: 'completed' } },
          assignee: { id: { eq: 'user-123' } },
        },
        includeArchived: false,
      });
    });
  });

  describe('addIssue', () => {
    it('should add an issue to a cycle', async () => {
      const mockIssue = createMockIssue({ id: 'issue-123' });
      const mockCycle = createMockCycle({ id: 'cycle-123' });
      const updatedIssue = createMockIssue({
        id: 'issue-123',
        cycleId: 'cycle-123',
        cycle: mockCycle,
      });

      mockClient.issue.mockResolvedValue(mockIssue);
      mockClient.updateIssue.mockResolvedValue(createMockPayload(true, updatedIssue));

      const result = await service.addIssue('cycle-123', 'issue-123');

      expect(mockClient.updateIssue).toHaveBeenCalledWith('issue-123', { cycleId: 'cycle-123' });

      expect(result.cycle).toBe(mockCycle);
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      mockClient.issue.mockRejectedValue(new Error('Not found'));

      await expect(service.addIssue('cycle-123', 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('removeIssue', () => {
    it('should remove an issue from a cycle', async () => {
      const mockCycle = createMockCycle({ id: 'cycle-123' });
      const mockIssue = createMockIssue({
        id: 'issue-123',
        cycleId: 'cycle-123',
      });
      const updatedIssue = createMockIssue({
        id: 'issue-123',
        cycleId: null,
        cycle: null,
      });

      mockClient.issue.mockResolvedValue(mockIssue);
      mockClient.updateIssue.mockResolvedValue(createMockPayload(true, updatedIssue));

      const result = await service.removeIssue('cycle-123', 'issue-123');

      expect(mockClient.updateIssue).toHaveBeenCalledWith('issue-123', { cycleId: null });

      expect(result.cycle).toBeNull();
    });
  });

  describe('getProgress', () => {
    it('should calculate cycle progress correctly', async () => {
      const mockCycle = createMockCycle({
        id: 'cycle-123',
      });

      const mockIssues = [
        createMockIssue({ completedAt: '2024-01-05T00:00:00Z', estimate: 3 }),
        createMockIssue({ completedAt: null, estimate: 5 }),
        createMockIssue({ completedAt: '2024-01-06T00:00:00Z', estimate: 2 }),
        createMockIssue({ completedAt: null, estimate: null }), // No estimate
      ];

      mockClient.cycle.mockResolvedValue(mockCycle);
      mockClient.issues.mockResolvedValue(createMockIssueConnection(mockIssues));

      const progress = await service.getProgress('cycle-123');

      expect(progress.completedPoints).toBe(5);
      expect(progress.totalPoints).toBe(10);
      expect(progress.percentComplete).toBe(50);
      expect(progress.completedIssues).toBe(2);
      expect(progress.totalIssues).toBe(4);
    });

    it('should handle cycle with no issues', async () => {
      const mockCycle = createMockCycle();

      mockClient.cycle.mockResolvedValue(mockCycle);
      mockClient.issues.mockResolvedValue(createMockIssueConnection([]));

      const progress = await service.getProgress('cycle-123');

      expect(progress.completedPoints).toBe(0);
      expect(progress.totalPoints).toBe(0);
      expect(progress.percentComplete).toBe(0);
      expect(progress.completedIssues).toBe(0);
      expect(progress.totalIssues).toBe(0);
    });

    it('should throw NotFoundError when cycle does not exist', async () => {
      mockClient.cycle.mockRejectedValue(new Error('Not found'));

      await expect(service.getProgress('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getVelocity', () => {
    it('should calculate cycle velocity correctly', async () => {
      const mockCycle = createMockCycle({
        id: 'cycle-123',
        startsAt: '2024-01-01T00:00:00Z',
        endsAt: '2024-01-15T00:00:00Z', // Exactly 2 weeks (14 days)
      });

      const mockIssues = [
        createMockIssue({ completedAt: '2024-01-05T00:00:00Z', estimate: 3 }),
        createMockIssue({ completedAt: '2024-01-06T00:00:00Z', estimate: 2 }),
        createMockIssue({ completedAt: null, estimate: 5 }), // Not completed
      ];

      mockClient.cycle.mockResolvedValue(mockCycle);
      mockClient.issues.mockResolvedValue(createMockIssueConnection(mockIssues));

      const velocity = await service.getVelocity('cycle-123');

      // 5 points completed / ~2 weeks = ~2.5 points per week (accounting for precise calculation)
      expect(velocity).toBeCloseTo(2.5, 1);
    });

    it('should return 0 velocity when no points completed', async () => {
      const mockCycle = createMockCycle();

      mockClient.cycle.mockResolvedValue(mockCycle);
      mockClient.issues.mockResolvedValue(
        createMockIssueConnection([createMockIssue({ completedAt: null, estimate: 5 })]),
      );

      const velocity = await service.getVelocity('cycle-123');

      expect(velocity).toBe(0);
    });

    it('should return 0 velocity when cycle duration is 0', async () => {
      const mockCycle = createMockCycle({
        startsAt: '2024-01-01T00:00:00Z',
        endsAt: '2024-01-01T00:00:00Z', // Same date
      });

      mockClient.cycle.mockResolvedValue(mockCycle);
      mockClient.issues.mockResolvedValue(
        createMockIssueConnection([
          createMockIssue({ completedAt: '2024-01-01T00:00:00Z', estimate: 5 }),
        ]),
      );

      const velocity = await service.getVelocity('cycle-123');

      expect(velocity).toBe(0);
    });
  });
});
