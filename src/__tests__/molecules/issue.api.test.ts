import { IssueAPI } from '@molecules/issue.api';
import { IssueEntity } from '@molecules/entities/issue.entity';
import {
  BulkOperationsWorkflow,
  BulkUpdateResult,
} from '@molecules/workflows/bulk-operations.workflow';
import { SmartSearchWorkflow, SmartSearchResult } from '@molecules/workflows/smart-search.workflow';
import { IssueRelationsWorkflow } from '@molecules/workflows/issue-relations.workflow';
import { IssueService } from '@features/issue/service';
import { TeamService } from '@features/team/service';
import { CommentService } from '@features/comment/service';
import { TestFactory } from '../fixtures/factories';
import {
  createMockIssue,
  createMockTeam,
  createMockWorkflowState,
  createMockConnection,
} from '../utils/mocks';

// Mock all dependencies
jest.mock('@molecules/entities/issue.entity');
jest.mock('@molecules/workflows/bulk-operations.workflow');
jest.mock('@molecules/workflows/smart-search.workflow');
jest.mock('@molecules/workflows/issue-relations.workflow');
jest.mock('@features/issue/service');
jest.mock('@features/team/service');
jest.mock('@features/comment/service');
jest.mock('@atoms/shared/logger');

describe('IssueAPI', () => {
  let api: IssueAPI;
  let mockIssueEntity: jest.Mocked<IssueEntity>;
  let mockBulkWorkflow: jest.Mocked<BulkOperationsWorkflow>;
  let mockSearchWorkflow: jest.Mocked<SmartSearchWorkflow>;
  let mockRelationsWorkflow: jest.Mocked<IssueRelationsWorkflow>;
  let mockIssueService: jest.Mocked<IssueService>;
  let mockTeamService: jest.Mocked<TeamService>;
  let mockCommentService: jest.Mocked<CommentService>;
  let mockClient: any;

  beforeEach(() => {
    TestFactory.reset();

    // Create mock client
    mockClient = {};

    // Create mocked services
    mockIssueEntity = new IssueEntity(mockClient) as jest.Mocked<IssueEntity>;
    mockBulkWorkflow = new BulkOperationsWorkflow(
      mockClient,
    ) as jest.Mocked<BulkOperationsWorkflow>;
    mockSearchWorkflow = new SmartSearchWorkflow(mockClient) as jest.Mocked<SmartSearchWorkflow>;
    mockRelationsWorkflow = new IssueRelationsWorkflow(
      mockClient,
    ) as jest.Mocked<IssueRelationsWorkflow>;
    mockIssueService = new IssueService(mockClient) as jest.Mocked<IssueService>;
    mockTeamService = new TeamService(mockClient) as jest.Mocked<TeamService>;
    mockCommentService = new CommentService(mockClient) as jest.Mocked<CommentService>;

    // Create API instance
    api = new IssueAPI(mockClient);

    // Replace internal services with mocks
    (api as any).issueEntity = mockIssueEntity;
    (api as any).bulkWorkflow = mockBulkWorkflow;
    (api as any).searchWorkflow = mockSearchWorkflow;
    (api as any).relationsWorkflow = mockRelationsWorkflow;
    (api as any).issueService = mockIssueService;
    (api as any).teamService = mockTeamService;
    (api as any).commentService = mockCommentService;
  });

  describe('update methods', () => {
    describe('updatePriority', () => {
      it('should update issue priority', async () => {
        const issueId = 'issue-123';
        const priority = 2;
        const mockIssue = createMockIssue();

        mockIssueEntity.changePriority.mockResolvedValue(mockIssue);

        const result = await api.updatePriority(issueId, priority);

        expect(mockIssueEntity.changePriority).toHaveBeenCalledWith(issueId, priority);
        expect(result).toEqual(mockIssue);
      });
    });

    describe('updateStatus', () => {
      it('should update issue status by name', async () => {
        const issueId = 'issue-123';
        const statusName = 'In Progress';
        const mockIssue = createMockIssue();
        const mockTeam = createMockTeam();
        const mockStates = [
          createMockWorkflowState({ name: 'Backlog' }),
          createMockWorkflowState({ id: 'state-456', name: 'In Progress' }),
          createMockWorkflowState({ name: 'Done' }),
        ];

        // Mock team with states method
        mockTeam.states = jest.fn().mockResolvedValue({ nodes: mockStates });
        mockIssue.team = Promise.resolve(mockTeam);

        mockIssueEntity.get.mockResolvedValue(mockIssue);
        mockIssueEntity.getByIdentifier.mockResolvedValue(null);
        mockIssueEntity.update.mockResolvedValue(mockIssue);

        const result = await api.updateStatus(issueId, statusName);

        expect(mockIssueEntity.get).toHaveBeenCalledWith(issueId);
        expect(mockIssueEntity.update).toHaveBeenCalledWith(issueId, { stateId: 'state-456' });
        expect(result).toEqual(mockIssue);
      });

      it('should resolve identifier if ID not found', async () => {
        const identifier = 'TASK-123';
        const statusName = 'Done';
        const mockIssue = createMockIssue();
        const mockTeam = createMockTeam();
        const mockStates = [createMockWorkflowState({ id: 'state-789', name: 'Done' })];

        mockTeam.states = jest.fn().mockResolvedValue({ nodes: mockStates });
        mockIssue.team = Promise.resolve(mockTeam);

        mockIssueEntity.get.mockResolvedValue(null);
        mockIssueEntity.getByIdentifier.mockResolvedValue(mockIssue);
        mockIssueEntity.update.mockResolvedValue(mockIssue);

        const result = await api.updateStatus(identifier, statusName);

        expect(mockIssueEntity.get).toHaveBeenCalledWith(identifier);
        expect(mockIssueEntity.getByIdentifier).toHaveBeenCalledWith(identifier);
        expect(mockIssueEntity.update).toHaveBeenCalledWith(mockIssue.id, { stateId: 'state-789' });
        expect(result).toEqual(mockIssue);
      });

      it('should throw error if issue not found', async () => {
        const issueId = 'invalid-id';

        mockIssueEntity.get.mockResolvedValue(null);
        mockIssueEntity.getByIdentifier.mockResolvedValue(null);

        await expect(api.updateStatus(issueId, 'Done')).rejects.toThrow(
          'Issue not found: invalid-id',
        );
      });

      it('should throw error if status not found', async () => {
        const issueId = 'issue-123';
        const statusName = 'Invalid Status';
        const mockIssue = createMockIssue();
        const mockTeam = createMockTeam();
        const mockStates = [
          createMockWorkflowState({ name: 'Backlog' }),
          createMockWorkflowState({ name: 'Done' }),
        ];

        mockTeam.states = jest.fn().mockResolvedValue({ nodes: mockStates });
        mockIssue.team = Promise.resolve(mockTeam);

        mockIssueEntity.get.mockResolvedValue(mockIssue);

        await expect(api.updateStatus(issueId, statusName)).rejects.toThrow(
          `Status 'Invalid Status' not found for team ${mockTeam.key}`,
        );
      });
    });

    describe('updateDescription', () => {
      it('should update issue description', async () => {
        const issueId = 'issue-123';
        const description = 'Updated description';
        const mockIssue = createMockIssue();

        mockIssueEntity.get.mockResolvedValue(mockIssue);
        mockIssueEntity.getByIdentifier.mockResolvedValue(null);
        mockIssueEntity.update.mockResolvedValue(mockIssue);

        const result = await api.updateDescription(issueId, description);

        expect(mockIssueEntity.get).toHaveBeenCalledWith(issueId);
        expect(mockIssueEntity.update).toHaveBeenCalledWith(issueId, { description });
        expect(result).toEqual(mockIssue);
      });

      it('should throw error if issue not found', async () => {
        const issueId = 'invalid-id';

        mockIssueEntity.get.mockResolvedValue(null);
        mockIssueEntity.getByIdentifier.mockResolvedValue(null);

        await expect(api.updateDescription(issueId, 'New description')).rejects.toThrow(
          'Issue not found: invalid-id',
        );
      });
    });

    describe('updateIssue', () => {
      it('should update issue with full data object', async () => {
        const issueId = 'issue-123';
        const updateData = {
          title: 'Updated title',
          description: 'Updated description',
          priority: 3 as const,
        };
        const mockIssue = createMockIssue();

        mockIssueEntity.get.mockResolvedValue(mockIssue);
        mockIssueEntity.getByIdentifier.mockResolvedValue(null);
        mockIssueEntity.update.mockResolvedValue(mockIssue);

        const result = await api.updateIssue(issueId, updateData);

        expect(mockIssueEntity.get).toHaveBeenCalledWith(issueId);
        expect(mockIssueEntity.update).toHaveBeenCalledWith(issueId, updateData);
        expect(result).toEqual(mockIssue);
      });
    });
  });

  describe('template methods', () => {
    describe('createWithTemplate', () => {
      it('should create issue from bug template', async () => {
        const teamKey = 'TASK';
        const data = { title: 'Login bug' };
        const mockIssue = createMockIssue();
        const teamId = 'team-123';

        mockTeamService.resolveTeamId.mockResolvedValue(teamId);
        mockIssueEntity.create.mockResolvedValue(mockIssue);

        const result = await api.createWithTemplate('bug', teamKey, data);

        expect(mockTeamService.resolveTeamId).toHaveBeenCalledWith(teamKey);
        expect(mockIssueEntity.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Login bug',
            teamId: 'team-123',
            priority: 2,
            description: expect.stringContaining('Bug Description'),
          }),
        );
        expect(result).toEqual(mockIssue);
      });

      it('should create issue from feature template', async () => {
        const teamKey = 'TASK';
        const data = {
          title: 'Add dark mode',
          description: 'Custom description',
        };
        const mockIssue = createMockIssue();
        const teamId = 'team-123';

        mockTeamService.resolveTeamId.mockResolvedValue(teamId);
        mockIssueEntity.create.mockResolvedValue(mockIssue);

        const result = await api.createWithTemplate('feature', teamKey, data);

        expect(mockIssueEntity.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Add dark mode',
            description: 'Custom description', // Should use provided description
            priority: 1,
            teamId: 'team-123',
          }),
        );
        expect(result).toEqual(mockIssue);
      });

      it('should throw error for invalid template', async () => {
        await expect(
          api.createWithTemplate('invalid-template', 'TASK', { title: 'Test' }),
        ).rejects.toThrow(
          "Template 'invalid-template' not found. Available templates: bug, feature, task, refactor",
        );
      });
    });

    describe('getAvailableTemplates', () => {
      it('should return list of available templates', () => {
        const templates = IssueAPI.getAvailableTemplates();

        expect(templates).toHaveLength(4);
        expect(templates.map((t) => t.name)).toEqual(['bug', 'feature', 'task', 'refactor']);
        expect(templates[0].template).toHaveProperty('description');
        expect(templates[0].template).toHaveProperty('priority');
      });
    });
  });

  describe('existing methods', () => {
    it('should delegate quickCreate to relationsWorkflow via entity', async () => {
      const title = 'Test issue';
      const teamKey = 'TASK';
      const options = { priority: 2 as const };
      const mockIssue = createMockIssue();

      // Mock the relationsWorkflow.quickCreate method instead
      mockRelationsWorkflow.quickCreate.mockResolvedValue(mockIssue);

      const result = await api.quickCreate(title, teamKey, options);

      expect(mockRelationsWorkflow.quickCreate).toHaveBeenCalledWith(title, teamKey, options);
      expect(result).toEqual(mockIssue);
    });

    it('should delegate bulkAssign to bulkWorkflow', async () => {
      const identifiers = ['TASK-1', 'TASK-2'];
      const userEmail = 'user@example.com';
      const mockResult: BulkUpdateResult = {
        updated: [],
        failed: [],
        summary: 'Bulk assign completed',
        totalCount: 2,
        successCount: 2,
        failureCount: 0,
      };

      mockBulkWorkflow.bulkAssign.mockResolvedValue(mockResult);

      const result = await api.bulkAssign(identifiers, userEmail);

      expect(mockBulkWorkflow.bulkAssign).toHaveBeenCalledWith(identifiers, userEmail);
      expect(result).toEqual(mockResult);
    });

    it('should delegate search to searchWorkflow', async () => {
      const query = 'bug in login';
      const options = { team: 'TASK', limit: 10 };
      const mockResult: SmartSearchResult = {
        issues: [],
        totalCount: 0,
        parsedQuery: 'bug in login',
        appliedFilters: {},
        confidence: 0.9,
      };

      mockSearchWorkflow.search.mockResolvedValue(mockResult);

      const result = await api.search(query, options);

      expect(mockSearchWorkflow.search).toHaveBeenCalledWith(query, options);
      expect(result).toEqual(mockResult);
    });
  });
});
