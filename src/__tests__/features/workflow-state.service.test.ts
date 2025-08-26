import { WorkflowStateService } from '@features/workflow-state/service';
import { linearClient } from '@atoms/client/linear-client';
import { NotFoundError, ValidationError } from '@atoms/types/common';
import { TestFactory } from '../fixtures/factories';
import {
  createMockWorkflowState,
  createMockPayload,
  createMockConnection,
  createMockLinearClient,
  createMockIssue,
  createMockIssueConnection,
} from '../utils/mocks';

jest.mock('@atoms/client/linear-client');

describe('WorkflowStateService', () => {
  let service: WorkflowStateService;
  let mockClient: ReturnType<typeof createMockLinearClient>;

  beforeEach(() => {
    TestFactory.reset();
    mockClient = createMockLinearClient();
    (linearClient.getClient as jest.Mock).mockReturnValue(mockClient);
    service = new WorkflowStateService(mockClient as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return a workflow state when found', async () => {
      const mockState = createMockWorkflowState({
        id: 'state-123',
        name: 'In Progress',
        type: 'started',
      });
      mockClient.workflowState = jest.fn().mockResolvedValue(mockState);

      const result = await service.get('state-123');

      expect(mockClient.workflowState).toHaveBeenCalledWith('state-123');
      expect(result).toEqual(mockState);
    });

    it('should return null when workflow state not found', async () => {
      mockClient.workflowState = jest.fn().mockRejectedValue(new Error('Not found'));

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list workflow states with no filters', async () => {
      const mockStates = [
        createMockWorkflowState({ id: '1', name: 'Todo' }),
        createMockWorkflowState({ id: '2', name: 'In Progress' }),
      ];
      mockClient.workflowStates = jest.fn().mockResolvedValue(createMockConnection(mockStates));

      const result = await service.list();

      expect(mockClient.workflowStates).toHaveBeenCalledWith({
        filter: {},
        includeArchived: undefined,
        first: undefined,
      });
      expect(result.nodes).toEqual(mockStates);
    });

    it('should filter workflow states by team', async () => {
      const mockStates = [createMockWorkflowState({ teamId: 'team-123' })];
      mockClient.workflowStates = jest.fn().mockResolvedValue(createMockConnection(mockStates));

      const filter = { teamId: 'team-123' };
      const result = await service.list(filter);

      expect(mockClient.workflowStates).toHaveBeenCalledWith({
        filter: expect.objectContaining({
          team: { id: { eq: 'team-123' } },
        }),
        includeArchived: undefined,
        first: undefined,
      });
      expect(result.nodes).toEqual(mockStates);
    });

    it('should filter workflow states by type', async () => {
      const mockStates = [createMockWorkflowState({ type: 'started' })];
      mockClient.workflowStates = jest.fn().mockResolvedValue(createMockConnection(mockStates));

      const filter = { type: 'started' as const };
      const result = await service.list(filter);

      expect(mockClient.workflowStates).toHaveBeenCalledWith({
        filter: expect.objectContaining({
          type: { eq: 'started' },
        }),
        includeArchived: undefined,
        first: undefined,
      });
      expect(result.nodes).toEqual(mockStates);
    });

    it('should handle pagination parameters', async () => {
      mockClient.workflowStates = jest.fn().mockResolvedValue(createMockConnection([]));

      await service.list(undefined, { first: 20, after: 'cursor-123' });

      expect(mockClient.workflowStates).toHaveBeenCalledWith({
        filter: {},
        includeArchived: undefined,
        first: 20,
        after: 'cursor-123',
      });
    });
  });

  describe('listByTeam', () => {
    it('should list workflow states for a specific team', async () => {
      const mockStates = [
        createMockWorkflowState({ teamId: 'team-123', name: 'Backlog' }),
        createMockWorkflowState({ teamId: 'team-123', name: 'Done' }),
      ];
      mockClient.workflowStates = jest.fn().mockResolvedValue(createMockConnection(mockStates));

      const result = await service.listByTeam('team-123');

      expect(mockClient.workflowStates).toHaveBeenCalledWith({
        filter: {
          team: { id: { eq: 'team-123' } },
        },
        includeArchived: false,
      });
      expect(result.nodes).toEqual(mockStates);
    });

    it('should handle empty team results', async () => {
      mockClient.workflowStates = jest.fn().mockResolvedValue(createMockConnection([]));

      const result = await service.listByTeam('team-no-states');

      expect(result.nodes).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update workflow state properties', async () => {
      const existingState = createMockWorkflowState({
        id: 'state-123',
        name: 'Old Name',
      });
      const updateData = {
        name: 'New Name',
        color: '#FF5733',
        description: 'Updated description',
        position: 2,
      };
      const updatedState = createMockWorkflowState({
        ...existingState,
        ...updateData,
      });

      mockClient.workflowState = jest.fn().mockResolvedValue(existingState);
      mockClient.updateWorkflowState = jest
        .fn()
        .mockResolvedValue(createMockPayload(true, updatedState));

      const result = await service.update('state-123', updateData);

      expect(mockClient.updateWorkflowState).toHaveBeenCalledWith(
        'state-123',
        expect.objectContaining(updateData),
      );
      expect(result.name).toBe('New Name');
      expect(result.color).toBe('#FF5733');
    });

    it('should throw NotFoundError when state does not exist', async () => {
      mockClient.workflowState = jest.fn().mockRejectedValue(new Error('Not found'));

      await expect(service.update('nonexistent', { name: 'New Name' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ValidationError when update fails', async () => {
      const existingState = createMockWorkflowState({ id: 'state-123' });
      mockClient.workflowState = jest.fn().mockResolvedValue(existingState);
      mockClient.updateWorkflowState = jest.fn().mockResolvedValue(createMockPayload(false));

      await expect(service.update('state-123', { name: 'New Name' })).rejects.toThrow(
        ValidationError,
      );
    });

    it('should validate color format when provided', async () => {
      await expect(service.update('state-123', { color: 'invalid-color' })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('archive', () => {
    it('should archive a workflow state', async () => {
      const existingState = createMockWorkflowState({ id: 'state-123' });
      mockClient.workflowState = jest.fn().mockResolvedValue(existingState);
      mockClient.archiveWorkflowState = jest.fn().mockResolvedValue(createMockPayload(true));

      const result = await service.archive('state-123');

      expect(mockClient.archiveWorkflowState).toHaveBeenCalledWith('state-123');
      expect(result).toBe(true);
    });

    it('should throw NotFoundError when state does not exist', async () => {
      mockClient.workflowState = jest.fn().mockRejectedValue(new Error('Not found'));

      await expect(service.archive('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should return false when archiving fails', async () => {
      const existingState = createMockWorkflowState({ id: 'state-123' });
      mockClient.workflowState = jest.fn().mockResolvedValue(existingState);
      mockClient.archiveWorkflowState = jest.fn().mockResolvedValue(createMockPayload(false));

      const result = await service.archive('state-123');

      expect(result).toBe(false);
    });
  });

  describe('getByType', () => {
    it('should return workflow states of a specific type', async () => {
      const startedStates = [
        createMockWorkflowState({ type: 'started', name: 'In Progress' }),
        createMockWorkflowState({ type: 'started', name: 'In Review' }),
      ];
      mockClient.workflowStates = jest.fn().mockResolvedValue(createMockConnection(startedStates));

      const result = await service.getByType('team-123', 'started');

      expect(mockClient.workflowStates).toHaveBeenCalledWith({
        filter: {
          team: { id: { eq: 'team-123' } },
          type: { eq: 'started' },
        },
      });
      expect(result).toEqual(startedStates);
    });

    it('should return empty array when no states match type', async () => {
      mockClient.workflowStates = jest.fn().mockResolvedValue(createMockConnection([]));

      const result = await service.getByType('team-123', 'completed');

      expect(result).toEqual([]);
    });

    it('should validate workflow state type', async () => {
      await expect(
        // @ts-expect-error - Testing invalid type
        service.getByType('team-123', 'invalid-type'),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getDefault', () => {
    it('should return default triage state', async () => {
      const triageState = createMockWorkflowState({
        type: 'triage',
        name: 'Triage',
        isDefault: true,
      });
      const mockStates = [
        triageState,
        createMockWorkflowState({ type: 'triage', name: 'Other Triage' }),
      ];

      // Mock the team.triageState relationship
      const mockTeam = {
        id: 'team-123',
        triageState: triageState, // Property should be the value, not a function
      };
      mockClient.team = jest.fn().mockResolvedValue(mockTeam);

      const result = await service.getDefault('team-123', 'triage');

      expect(mockClient.team).toHaveBeenCalledWith('team-123');
      expect(result).toEqual(triageState);
    });

    it('should return default backlog state', async () => {
      const backlogState = createMockWorkflowState({
        type: 'backlog',
        name: 'Backlog',
        isDefault: true,
      });

      const mockTeam = {
        id: 'team-123',
        backlogState: backlogState, // Property should be the value, not a function
      };
      mockClient.team = jest.fn().mockResolvedValue(mockTeam);

      const result = await service.getDefault('team-123', 'backlog');

      expect(result).toEqual(backlogState);
    });

    it('should return default started state', async () => {
      const startedState = createMockWorkflowState({
        type: 'started',
        name: 'In Progress',
        isDefault: true,
      });

      const mockTeam = {
        id: 'team-123',
        startedState: startedState, // Property should be the value, not a function
      };
      mockClient.team = jest.fn().mockResolvedValue(mockTeam);

      const result = await service.getDefault('team-123', 'started');

      expect(result).toEqual(startedState);
    });

    it('should return null when no default state exists', async () => {
      const mockTeam = {
        id: 'team-123',
        triageState: null, // Property should be the value, not a function
      };
      mockClient.team = jest.fn().mockResolvedValue(mockTeam);

      const result = await service.getDefault('team-123', 'triage');

      expect(result).toBeNull();
    });

    it('should throw error for invalid category', async () => {
      await expect(
        // @ts-expect-error - Testing invalid category
        service.getDefault('team-123', 'invalid-category'),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getIssues', () => {
    it('should return issues in a workflow state', async () => {
      const mockIssues = [
        createMockIssue({ id: 'issue-1', stateId: 'state-123' }),
        createMockIssue({ id: 'issue-2', stateId: 'state-123' }),
      ];
      mockClient.issues = jest.fn().mockResolvedValue(createMockIssueConnection(mockIssues));

      const result = await service.getIssues('state-123');

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          state: { id: { eq: 'state-123' } },
        },
        first: undefined,
      });
      expect(result.nodes).toEqual(mockIssues);
    });

    it('should handle additional issue filters', async () => {
      mockClient.issues = jest.fn().mockResolvedValue(createMockIssueConnection([]));

      const issueFilter = {
        assignee: { id: { eq: 'user-123' } },
      };

      await service.getIssues('state-123', issueFilter);

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          state: { id: { eq: 'state-123' } },
          assignee: { id: { eq: 'user-123' } },
        },
        first: undefined,
      });
    });

    it('should handle pagination for issues', async () => {
      mockClient.issues = jest.fn().mockResolvedValue(createMockIssueConnection([]));

      await service.getIssues('state-123', undefined, { first: 25, after: 'cursor-456' });

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          state: { id: { eq: 'state-123' } },
        },
        first: 25,
        after: 'cursor-456',
      });
    });
  });

  describe('moveIssues', () => {
    it('should bulk move issues between states', async () => {
      const fromStateId = 'state-todo';
      const toStateId = 'state-in-progress';

      // Mock getting issues in the from state
      const issuesToMove = [
        createMockIssue({ id: 'issue-1', stateId: fromStateId }),
        createMockIssue({ id: 'issue-2', stateId: fromStateId }),
      ];
      mockClient.issues = jest.fn().mockResolvedValue(createMockIssueConnection(issuesToMove));

      // Mock updating each issue
      mockClient.updateIssue = jest
        .fn()
        .mockResolvedValueOnce(createMockPayload(true, issuesToMove[0]))
        .mockResolvedValueOnce(createMockPayload(true, issuesToMove[1]));

      const result = await service.moveIssues(fromStateId, toStateId);

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: { state: { id: { eq: fromStateId } } },
        first: 100,
      });

      expect(mockClient.updateIssue).toHaveBeenCalledTimes(2);
      expect(mockClient.updateIssue).toHaveBeenCalledWith('issue-1', { stateId: toStateId });
      expect(mockClient.updateIssue).toHaveBeenCalledWith('issue-2', { stateId: toStateId });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it('should handle partial failures in bulk move', async () => {
      const fromStateId = 'state-todo';
      const toStateId = 'state-in-progress';

      const issuesToMove = [createMockIssue({ id: 'issue-1' }), createMockIssue({ id: 'issue-2' })];
      mockClient.issues = jest.fn().mockResolvedValue(createMockIssueConnection(issuesToMove));

      // First succeeds, second fails
      mockClient.updateIssue = jest
        .fn()
        .mockResolvedValueOnce(createMockPayload(true, issuesToMove[0]))
        .mockResolvedValueOnce(createMockPayload(false));

      const result = await service.moveIssues(fromStateId, toStateId);

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.failed).toHaveLength(1);
    });

    it('should handle when no issues to move', async () => {
      mockClient.issues = jest.fn().mockResolvedValue(createMockIssueConnection([]));

      const result = await service.moveIssues('state-empty', 'state-target');

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('validateTransition', () => {
    it('should validate allowed state transition', async () => {
      const mockIssue = createMockIssue({
        id: 'issue-123',
        stateId: 'state-todo',
      });

      // Mock the issue with its current state
      mockClient.issue = jest.fn().mockResolvedValue(mockIssue);

      // Mock getting the target state
      const targetState = createMockWorkflowState({
        id: 'state-in-progress',
        type: 'started',
      });
      mockClient.workflowState = jest.fn().mockResolvedValue(targetState);

      const result = await service.validateTransition('issue-123', 'state-in-progress');

      expect(result).toBe(true);
    });

    it('should return false for invalid transition', async () => {
      // Create a completed state
      const completedState = {
        __typename: 'WorkflowState',
        id: 'state-done',
        type: 'completed',
        name: 'Done',
        color: '#00FF00',
        position: 4,
        description: '',
        teamId: 'team-123',
        isDefault: false,
      };

      // Create a triage state
      const triageState = {
        __typename: 'WorkflowState',
        id: 'state-triage',
        type: 'triage',
        name: 'Triage',
        color: '#FF0000',
        position: 0,
        description: '',
        teamId: 'team-123',
        isDefault: false,
      };

      // Create mock issue with completed state
      const mockIssue = {
        id: 'issue-123',
        state: completedState, // Direct value, not a function
        __typename: 'Issue',
      };

      // Mock the client methods
      mockClient.issue = jest.fn().mockResolvedValue(mockIssue);
      mockClient.workflowState = jest.fn().mockResolvedValue(triageState);

      const result = await service.validateTransition('issue-123', 'state-triage');

      expect(result).toBe(false);
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      mockClient.issue = jest.fn().mockRejectedValue(new Error('Not found'));

      await expect(service.validateTransition('nonexistent', 'state-123')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw NotFoundError when target state does not exist', async () => {
      const mockIssue = createMockIssue({ id: 'issue-123' });
      mockClient.issue = jest.fn().mockResolvedValue(mockIssue);
      mockClient.workflowState = jest.fn().mockRejectedValue(new Error('Not found'));

      await expect(service.validateTransition('issue-123', 'nonexistent-state')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
