import { SprintPlanningWorkflow } from '@molecules/workflows/sprint-planning.workflow';
import { IssueEntity } from '@molecules/entities/issue.entity';
import { TeamService } from '@features/team/service';
import { ProjectService } from '@features/project/service';
import { NotFoundError } from '@atoms/types/common';
import { TestFactory } from '../fixtures/factories';
import {
  createMockIssue,
  createMockTeam,
  createMockProject,
  createMockCycle,
  createMockUser,
  createMockCycleConnection,
  createMockUserConnection,
} from '../utils/mocks';

jest.mock('@molecules/entities/issue.entity');
jest.mock('@features/team/service');
jest.mock('@features/project/service');

describe('SprintPlanningWorkflow', () => {
  let workflow: SprintPlanningWorkflow;
  let mockIssueEntity: jest.Mocked<IssueEntity>;
  let mockTeamService: jest.Mocked<TeamService>;
  let mockProjectService: jest.Mocked<ProjectService>;

  beforeEach(() => {
    TestFactory.reset();

    // Create mocked dependencies
    mockIssueEntity = new IssueEntity() as jest.Mocked<IssueEntity>;
    mockTeamService = new TeamService({} as any) as jest.Mocked<TeamService>;
    mockProjectService = new ProjectService({} as any) as jest.Mocked<ProjectService>;

    // Create workflow
    workflow = new SprintPlanningWorkflow();

    // Replace dependencies with mocks
    (workflow as any).issueEntity = mockIssueEntity;
    (workflow as any).teamService = mockTeamService;
    (workflow as any).projectService = mockProjectService;
  });

  describe('planSprint', () => {
    it('should successfully plan sprint with all issues', async () => {
      const options = TestFactory.sprintPlanningOptions();
      const mockTeam = createMockTeam();
      const mockCycle = createMockCycle({ id: options.cycleId });

      mockTeamService.get.mockResolvedValue(mockTeam);
      mockTeamService.getCycles.mockResolvedValue(createMockCycleConnection([mockCycle]));

      // Mock issue operations
      options.issueIds.forEach((id: string, index: number) => {
        const mockIssue = createMockIssue({
          id,
          identifier: `ENG-${index + 1}`,
          estimate: 3,
        });
        mockIssueEntity.get.mockResolvedValueOnce(mockIssue);
        mockIssueEntity.update.mockResolvedValueOnce(mockIssue);
      });

      const result = await workflow.planSprint(options);

      expect(result.success).toBe(true);
      expect(result.summary.successCount).toBe(3);
      expect(result.summary.failureCount).toBe(0);
      expect(result.movedIssues).toHaveLength(3);
      expect(result.summary.totalEstimate).toBe(9); // 3 issues * 3 estimate
    });

    it('should handle team not found', async () => {
      const options = TestFactory.sprintPlanningOptions();

      mockTeamService.get.mockResolvedValue(null);

      await expect(workflow.planSprint(options)).rejects.toThrow(NotFoundError);
    });

    it('should handle cycle not found', async () => {
      const options = TestFactory.sprintPlanningOptions();
      const mockTeam = createMockTeam();

      mockTeamService.get.mockResolvedValue(mockTeam);
      mockTeamService.getCycles.mockResolvedValue(
        createMockCycleConnection([]), // No cycles
      );

      await expect(workflow.planSprint(options)).rejects.toThrow(NotFoundError);
    });

    it('should validate project when projectId is provided', async () => {
      const options = TestFactory.sprintPlanningOptions({
        projectId: 'project-123',
      });
      const mockTeam = createMockTeam();
      const mockCycle = createMockCycle({ id: options.cycleId });
      const mockProject = createMockProject();

      mockTeamService.get.mockResolvedValue(mockTeam);
      mockTeamService.getCycles.mockResolvedValue(createMockCycleConnection([mockCycle]));
      mockProjectService.get.mockResolvedValue(mockProject);

      options.issueIds.forEach((id: string) => {
        const mockIssue = createMockIssue({ id });
        mockIssueEntity.get.mockResolvedValueOnce(mockIssue);
        mockIssueEntity.update.mockResolvedValueOnce(mockIssue);
      });

      const result = await workflow.planSprint(options);

      expect(mockProjectService.get).toHaveBeenCalledWith('project-123');
      expect(result.success).toBe(true);

      // Verify update was called with projectId
      expect(mockIssueEntity.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cycleId: options.cycleId,
          projectId: 'project-123',
        }),
      );
    });

    it('should handle partial failures', async () => {
      const options = TestFactory.sprintPlanningOptions({
        issueIds: ['id-1', 'id-2', 'id-3'],
      });
      const mockTeam = createMockTeam();
      const mockCycle = createMockCycle({ id: options.cycleId });

      mockTeamService.get.mockResolvedValue(mockTeam);
      mockTeamService.getCycles.mockResolvedValue(createMockCycleConnection([mockCycle]));

      // First issue succeeds
      mockIssueEntity.get.mockResolvedValueOnce(createMockIssue({ id: 'id-1', estimate: 5 }));
      mockIssueEntity.update.mockResolvedValueOnce(createMockIssue());

      // Second issue not found
      mockIssueEntity.get.mockResolvedValueOnce(null);

      // Third issue update fails
      mockIssueEntity.get.mockResolvedValueOnce(createMockIssue({ id: 'id-3', estimate: 3 }));
      mockIssueEntity.update.mockRejectedValueOnce(new Error('Update failed'));

      const result = await workflow.planSprint(options);

      expect(result.success).toBe(false);
      expect(result.summary.successCount).toBe(1);
      expect(result.summary.failureCount).toBe(2);
      expect(result.movedIssues).toEqual(['id-1']);
      expect(result.failedIssues).toHaveLength(2);
      expect(result.summary.totalEstimate).toBe(5);
    });
  });

  describe('calculateSprintCapacity', () => {
    it('should calculate sprint capacity correctly', async () => {
      const mockTeam = createMockTeam();
      const mockIssues = [
        createMockIssue({ priority: 4, estimate: 5, assignee: { id: 'user-1' } }),
        createMockIssue({ priority: 3, estimate: 3, assignee: { id: 'user-1' } }),
        createMockIssue({ priority: 2, estimate: 2, assignee: { id: 'user-2' } }),
        createMockIssue({ priority: 1, estimate: 1, assignee: null }),
        createMockIssue({ priority: 0, estimate: null, assignee: null }),
      ];

      mockTeamService.get.mockResolvedValue(mockTeam);
      mockIssueEntity.list.mockResolvedValue({
        issues: mockIssues,
        pageInfo: {} as any,
        totalCount: mockIssues.length,
      });

      const capacity = await workflow.calculateSprintCapacity('team-123', 'cycle-123');

      expect(capacity.totalIssues).toBe(5);
      expect(capacity.totalEstimate).toBe(11); // 5 + 3 + 2 + 1 + 0
      expect(capacity.byPriority.urgent).toBe(1);
      expect(capacity.byPriority.high).toBe(1);
      expect(capacity.byPriority.medium).toBe(1);
      expect(capacity.byPriority.low).toBe(1);
      expect(capacity.byPriority.none).toBe(1);
      expect(capacity.byAssignee.get('user-1')).toBe(8); // 5 + 3
      expect(capacity.byAssignee.get('user-2')).toBe(2);
    });

    it('should handle team not found', async () => {
      mockTeamService.get.mockResolvedValue(null);

      await expect(workflow.calculateSprintCapacity('nonexistent', 'cycle-123')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('autoAssignIssues', () => {
    it('should auto-assign issues based on workload', async () => {
      const issueIds = ['issue-1', 'issue-2', 'issue-3'];
      const mockTeam = createMockTeam();
      const mockMembers = [createMockUser({ id: 'user-1' }), createMockUser({ id: 'user-2' })];

      mockTeamService.get.mockResolvedValue(mockTeam);
      mockTeamService.getMembers.mockResolvedValue(createMockUserConnection(mockMembers));

      // Existing workload: user-1 has more work
      const existingIssues = [
        createMockIssue({ assignee: { id: 'user-1' }, estimate: 5 }),
        createMockIssue({ assignee: { id: 'user-1' }, estimate: 3 }),
        createMockIssue({ assignee: { id: 'user-2' }, estimate: 2 }),
      ];

      mockIssueEntity.list.mockResolvedValue({
        issues: existingIssues,
        pageInfo: {} as any,
        totalCount: existingIssues.length,
      });

      // Mock issues to assign
      issueIds.forEach((id, index) => {
        const mockIssue = createMockIssue({
          id,
          identifier: `ENG-${index + 1}`,
          estimate: 2,
        });
        mockIssueEntity.get.mockResolvedValueOnce(mockIssue);
        mockIssueEntity.assignToUser.mockResolvedValueOnce(mockIssue);
      });

      const results = await workflow.autoAssignIssues('team-123', issueIds);

      expect(results).toHaveLength(3);

      // First issue should go to user-2 (less workload)
      expect(results[0]).toEqual({
        issueId: 'issue-1',
        success: true,
        assigneeId: 'user-2',
      });

      // Verify assignment calls
      expect(mockIssueEntity.assignToUser).toHaveBeenCalledTimes(3);
    });

    it('should handle team with no members', async () => {
      const mockTeam = createMockTeam();

      mockTeamService.get.mockResolvedValue(mockTeam);
      mockTeamService.getMembers.mockResolvedValue(
        createMockUserConnection([]), // No members
      );

      await expect(workflow.autoAssignIssues('team-123', ['issue-1'])).rejects.toThrow(
        'Team has no members',
      );
    });

    it('should handle issue not found during assignment', async () => {
      const mockTeam = createMockTeam();
      const mockMembers = [createMockUser({ id: 'user-1' })];

      mockTeamService.get.mockResolvedValue(mockTeam);
      mockTeamService.getMembers.mockResolvedValue(createMockUserConnection(mockMembers));
      mockIssueEntity.list.mockResolvedValue({
        issues: [],
        pageInfo: {} as any,
        totalCount: 0,
      });

      mockIssueEntity.get.mockResolvedValue(null);

      const results = await workflow.autoAssignIssues('team-123', ['nonexistent']);

      expect(results).toEqual([
        {
          issueId: 'nonexistent',
          success: false,
          error: 'Issue not found',
        },
      ]);
    });

    it('should handle assignment failures', async () => {
      const mockTeam = createMockTeam();
      const mockMembers = [createMockUser({ id: 'user-1' })];

      mockTeamService.get.mockResolvedValue(mockTeam);
      mockTeamService.getMembers.mockResolvedValue(createMockUserConnection(mockMembers));
      mockIssueEntity.list.mockResolvedValue({
        issues: [],
        pageInfo: {} as any,
        totalCount: 0,
      });

      mockIssueEntity.get.mockResolvedValue(createMockIssue());
      mockIssueEntity.assignToUser.mockRejectedValue(new Error('Assignment failed'));

      const results = await workflow.autoAssignIssues('team-123', ['issue-1']);

      expect(results).toEqual([
        {
          issueId: 'issue-1',
          success: false,
          error: 'Assignment failed',
        },
      ]);
    });
  });
});
