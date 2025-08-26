import { IssueEntity } from '@molecules/entities/issue.entity';
import { IssueService } from '@features/issue/service';
import { TeamService } from '@features/team/service';
import { ProjectService } from '@features/project/service';
import { NotFoundError } from '@atoms/types/common';
import { TestFactory } from '../fixtures/factories';
import {
  createMockIssue,
  createMockTeam,
  createMockProject,
  createMockUser,
  createMockComment,
  createMockConnection,
} from '../utils/mocks';

jest.mock('@features/issue/service');
jest.mock('@features/team/service');
jest.mock('@features/project/service');

describe('IssueEntity', () => {
  let entity: IssueEntity;
  let mockIssueService: jest.Mocked<IssueService>;
  let mockTeamService: jest.Mocked<TeamService>;
  let mockProjectService: jest.Mocked<ProjectService>;

  beforeEach(() => {
    TestFactory.reset();

    // Create mocked services
    mockIssueService = new IssueService({} as any) as jest.Mocked<IssueService>;
    mockTeamService = new TeamService({} as any) as jest.Mocked<TeamService>;
    mockProjectService = new ProjectService({} as any) as jest.Mocked<ProjectService>;

    // Create entity
    entity = new IssueEntity();

    // Replace services with mocks
    (entity as any).issueService = mockIssueService;
    (entity as any).teamService = mockTeamService;
    (entity as any).projectService = mockProjectService;
  });

  describe('create', () => {
    it('should validate team exists before creating issue', async () => {
      const issueData = TestFactory.issueCreate();
      const mockTeam = createMockTeam();
      const mockIssue = createMockIssue();

      mockTeamService.get.mockResolvedValue(mockTeam);
      mockIssueService.create.mockResolvedValue(mockIssue);

      const result = await entity.create(issueData);

      expect(mockTeamService.get).toHaveBeenCalledWith(issueData.teamId);
      expect(mockIssueService.create).toHaveBeenCalledWith(issueData);
      expect(result).toEqual(mockIssue);
    });

    it('should throw NotFoundError when team does not exist', async () => {
      const issueData = TestFactory.issueCreate();

      mockTeamService.get.mockResolvedValue(null);

      await expect(entity.create(issueData)).rejects.toThrow(NotFoundError);
      expect(mockIssueService.create).not.toHaveBeenCalled();
    });

    it('should validate project exists when projectId is provided', async () => {
      const issueData = TestFactory.issueCreate({ projectId: 'project-123' });
      const mockTeam = createMockTeam();
      const mockProject = createMockProject();
      const mockIssue = createMockIssue();

      mockTeamService.get.mockResolvedValue(mockTeam);
      mockProjectService.get.mockResolvedValue(mockProject);
      mockIssueService.create.mockResolvedValue(mockIssue);

      const result = await entity.create(issueData);

      expect(mockProjectService.get).toHaveBeenCalledWith('project-123');
      expect(result).toEqual(mockIssue);
    });

    it('should throw NotFoundError when project does not exist', async () => {
      const issueData = TestFactory.issueCreate({ projectId: 'project-123' });
      const mockTeam = createMockTeam();

      mockTeamService.get.mockResolvedValue(mockTeam);
      mockProjectService.get.mockResolvedValue(null);

      await expect(entity.create(issueData)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getWithRelations', () => {
    it('should fetch issue with all relations', async () => {
      const mockIssue = createMockIssue();
      const mockTeam = createMockTeam();
      const mockProject = createMockProject();
      const mockUser = createMockUser();
      const mockComments = [createMockComment()];
      const mockLabels = [{ id: 'label-1', name: 'Bug' }];

      mockIssue.team = Promise.resolve(mockTeam);
      mockIssue.project = Promise.resolve(mockProject);
      mockIssue.assignee = Promise.resolve(mockUser);
      mockIssue.comments = jest.fn().mockResolvedValue({ nodes: mockComments });
      mockIssue.attachments = jest.fn().mockResolvedValue({ nodes: [] });
      mockIssue.labels = jest.fn().mockResolvedValue({ nodes: mockLabels });

      mockIssueService.get.mockResolvedValue(mockIssue);

      const result = await entity.getWithRelations('issue-123');

      expect(result).toEqual({
        issue: mockIssue,
        team: mockTeam,
        project: mockProject,
        assignee: mockUser,
        comments: mockComments,
        attachments: [],
        labels: mockLabels,
      });
    });

    it('should return null when issue not found', async () => {
      mockIssueService.get.mockResolvedValue(null);

      const result = await entity.getWithRelations('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle issues without project', async () => {
      const mockIssue = createMockIssue();
      mockIssue.project = undefined;
      mockIssue.team = Promise.resolve(createMockTeam());
      mockIssue.assignee = Promise.resolve(null);
      mockIssue.comments = jest.fn().mockResolvedValue({ nodes: [] });
      mockIssue.attachments = jest.fn().mockResolvedValue({ nodes: [] });
      mockIssue.labels = jest.fn().mockResolvedValue({ nodes: [] });

      mockIssueService.get.mockResolvedValue(mockIssue);

      const result = await entity.getWithRelations('issue-123');

      expect(result?.project).toBeUndefined();
    });
  });

  describe('moveToProject', () => {
    it('should move issue to a different project', async () => {
      const mockIssue = createMockIssue();
      const mockProject = createMockProject();
      const updatedIssue = { ...mockIssue, projectId: 'project-123' };

      mockIssueService.get.mockResolvedValue(mockIssue);
      mockProjectService.get.mockResolvedValue(mockProject);
      mockIssueService.update.mockResolvedValue(updatedIssue);

      const result = await entity.moveToProject('issue-123', 'project-123');

      expect(mockIssueService.update).toHaveBeenCalledWith('issue-123', {
        projectId: 'project-123',
      });
      expect(result).toEqual(updatedIssue);
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      mockIssueService.get.mockResolvedValue(null);
      mockProjectService.get.mockResolvedValue(createMockProject());

      await expect(entity.moveToProject('nonexistent', 'project-123')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw NotFoundError when project does not exist', async () => {
      mockIssueService.get.mockResolvedValue(createMockIssue());
      mockProjectService.get.mockResolvedValue(null);

      await expect(entity.moveToProject('issue-123', 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('assignToUser', () => {
    it('should assign issue to a user', async () => {
      const mockIssue = createMockIssue();
      const updatedIssue = { ...mockIssue, assigneeId: 'user-123' };

      mockIssueService.get.mockResolvedValue(mockIssue);
      mockIssueService.update.mockResolvedValue(updatedIssue);

      const result = await entity.assignToUser('issue-123', 'user-123');

      expect(mockIssueService.update).toHaveBeenCalledWith('issue-123', {
        assigneeId: 'user-123',
      });
      expect(result).toEqual(updatedIssue);
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      mockIssueService.get.mockResolvedValue(null);

      await expect(entity.assignToUser('nonexistent', 'user-123')).rejects.toThrow(NotFoundError);
    });
  });

  describe('unassign', () => {
    it('should unassign issue', async () => {
      const mockIssue = createMockIssue();
      const updatedIssue = { ...mockIssue, assigneeId: null };

      mockIssueService.get.mockResolvedValue(mockIssue);
      mockIssueService.update.mockResolvedValue(updatedIssue);

      const result = await entity.unassign('issue-123');

      expect(mockIssueService.update).toHaveBeenCalledWith('issue-123', {
        assigneeId: null,
      });
      expect(result).toEqual(updatedIssue);
    });
  });

  describe('changePriority', () => {
    it('should change issue priority', async () => {
      const mockIssue = createMockIssue();
      const updatedIssue = { ...mockIssue, priority: 4 };

      mockIssueService.get.mockResolvedValue(mockIssue);
      mockIssueService.update.mockResolvedValue(updatedIssue);

      const result = await entity.changePriority('issue-123', 4);

      expect(mockIssueService.update).toHaveBeenCalledWith('issue-123', {
        priority: 4,
      });
      expect(result).toEqual(updatedIssue);
    });

    it('should throw error for invalid priority', async () => {
      await expect(entity.changePriority('issue-123', 5)).rejects.toThrow(
        'Priority must be between 0 and 4',
      );

      await expect(entity.changePriority('issue-123', -1)).rejects.toThrow(
        'Priority must be between 0 and 4',
      );
    });
  });

  describe('createSubIssue', () => {
    it('should create a sub-issue', async () => {
      const parentIssue = createMockIssue();
      const mockTeam = createMockTeam({ id: 'team-123' });
      parentIssue.team = Promise.resolve(mockTeam);
      const subIssueData = TestFactory.issueCreate({ teamId: undefined });
      const mockSubIssue = createMockIssue({ parentId: 'parent-123' });

      mockIssueService.get.mockResolvedValue(parentIssue);
      mockIssueService.create.mockResolvedValue(mockSubIssue);

      const result = await entity.createSubIssue('parent-123', subIssueData);

      expect(mockIssueService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'parent-123',
          teamId: 'team-123', // Inherited from parent
        }),
      );
      expect(result).toEqual(mockSubIssue);
    });

    it('should use provided teamId over parent teamId', async () => {
      const parentIssue = createMockIssue({ teamId: 'team-123' });
      const subIssueData = TestFactory.issueCreate({ teamId: 'team-456' });
      const mockSubIssue = createMockIssue();

      mockIssueService.get.mockResolvedValue(parentIssue);
      mockIssueService.create.mockResolvedValue(mockSubIssue);

      await entity.createSubIssue('parent-123', subIssueData);

      expect(mockIssueService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 'team-456', // Uses provided teamId
        }),
      );
    });

    it('should throw NotFoundError when parent issue does not exist', async () => {
      mockIssueService.get.mockResolvedValue(null);

      await expect(entity.createSubIssue('nonexistent', TestFactory.issueCreate())).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('getSubIssues', () => {
    it('should fetch sub-issues', async () => {
      const mockIssue = createMockIssue();
      const mockChildren = [createMockIssue({ id: 'child-1' }), createMockIssue({ id: 'child-2' })];

      mockIssue.children = jest.fn().mockResolvedValue({ nodes: mockChildren });
      mockIssueService.get.mockResolvedValue(mockIssue);

      const result = await entity.getSubIssues('issue-123');

      expect(result).toEqual(mockChildren);
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      mockIssueService.get.mockResolvedValue(null);

      await expect(entity.getSubIssues('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should return formatted list response', async () => {
      const mockIssues = [createMockIssue({ id: '1' }), createMockIssue({ id: '2' })];
      const mockConnection = createMockConnection(mockIssues);

      mockIssueService.list.mockResolvedValue(mockConnection);

      const filter = TestFactory.issueFilter();
      const pagination = { first: 10 };

      const result = await entity.list(filter, pagination);

      expect(mockIssueService.list).toHaveBeenCalledWith(filter, pagination);
      expect(result).toEqual({
        issues: mockIssues,
        pageInfo: mockConnection.pageInfo,
        totalCount: 2,
      });
    });
  });
});
