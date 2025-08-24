import { IssueService } from '@features/issue/service';
import { linearClient } from '@atoms/client/linear-client';
import { NotFoundError, ValidationError } from '@atoms/types/common';
import { TestFactory } from '../fixtures/factories';
import {
  createMockIssue,
  createMockPayload,
  createMockIssueConnection,
  createMockLinearClient,
} from '../utils/mocks';

jest.mock('@atoms/client/linear-client');

describe('IssueService', () => {
  let service: IssueService;
  let mockClient: ReturnType<typeof createMockLinearClient>;

  beforeEach(() => {
    TestFactory.reset();
    mockClient = createMockLinearClient();
    (linearClient.getClient as jest.Mock).mockReturnValue(mockClient);
    service = new IssueService();
  });

  describe('create', () => {
    it('should create an issue successfully', async () => {
      const issueData = TestFactory.issueCreate();
      const mockIssue = createMockIssue(issueData);

      mockClient.createIssue.mockResolvedValue(createMockPayload(true, mockIssue));

      const result = await service.create(issueData);

      expect(mockClient.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          title: issueData.title,
          teamId: issueData.teamId,
          description: issueData.description,
        }),
      );
      expect(result).toEqual(mockIssue);
    });

    it('should throw ValidationError when creation fails', async () => {
      const issueData = TestFactory.issueCreate();

      mockClient.createIssue.mockResolvedValue(createMockPayload(false));

      await expect(service.create(issueData)).rejects.toThrow(ValidationError);
    });

    it('should handle optional fields correctly', async () => {
      const issueData = TestFactory.issueCreate({
        labelIds: ['label-1', 'label-2'],
        projectId: 'project-123',
        cycleId: 'cycle-123',
        parentId: 'parent-123',
        dueDate: '2024-12-31',
      });

      const mockIssue = createMockIssue(issueData);
      mockClient.createIssue.mockResolvedValue(createMockPayload(true, mockIssue));

      await service.create(issueData);

      expect(mockClient.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          labelIds: ['label-1', 'label-2'],
          projectId: 'project-123',
          cycleId: 'cycle-123',
          parentId: 'parent-123',
          dueDate: '2024-12-31',
        }),
      );
    });
  });

  describe('get', () => {
    it('should return an issue when found', async () => {
      const mockIssue = createMockIssue();
      mockClient.issue.mockResolvedValue(mockIssue);

      const result = await service.get('issue-123');

      expect(mockClient.issue).toHaveBeenCalledWith('issue-123');
      expect(result).toEqual(mockIssue);
    });

    it('should return null when issue not found', async () => {
      mockClient.issue.mockRejectedValue(new Error('Not found'));

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByIdentifier', () => {
    it('should return an issue by identifier', async () => {
      const mockIssue = createMockIssue({ identifier: 'ENG-123' });
      mockClient.issues.mockResolvedValue(createMockIssueConnection([mockIssue]));

      const result = await service.getByIdentifier('ENG-123');

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          searchableContent: { contains: 'ENG-123' },
        },
        first: 1,
      });
      expect(result).toEqual(mockIssue);
    });

    it('should return null when no issue matches identifier', async () => {
      mockClient.issues.mockResolvedValue(createMockIssueConnection([]));

      const result = await service.getByIdentifier('ENG-999');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an issue successfully', async () => {
      const mockIssue = createMockIssue();
      const updateData = TestFactory.issueUpdate();

      mockClient.issue.mockResolvedValue(mockIssue);
      mockClient.updateIssue.mockResolvedValue(
        createMockPayload(true, { ...mockIssue, ...updateData }),
      );

      const result = await service.update('issue-123', updateData);

      expect(mockClient.updateIssue).toHaveBeenCalledWith(
        'issue-123',
        expect.objectContaining({
          title: updateData.title,
          priority: updateData.priority,
        }),
      );
      expect(result.title).toBe(updateData.title);
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      mockClient.issue.mockRejectedValue(new Error('Not found'));

      await expect(service.update('nonexistent', TestFactory.issueUpdate())).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ValidationError when update fails', async () => {
      const mockIssue = createMockIssue();
      mockClient.issue.mockResolvedValue(mockIssue);
      mockClient.updateIssue.mockResolvedValue(createMockPayload(false));

      await expect(service.update('issue-123', TestFactory.issueUpdate())).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('delete', () => {
    it('should delete an issue successfully', async () => {
      const mockIssue = createMockIssue();
      mockClient.issue.mockResolvedValue(mockIssue);
      mockClient.deleteIssue.mockResolvedValue(createMockPayload(true));

      const result = await service.delete('issue-123');

      expect(mockClient.deleteIssue).toHaveBeenCalledWith('issue-123');
      expect(result).toBe(true);
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      mockClient.issue.mockRejectedValue(new Error('Not found'));

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('archive', () => {
    it('should archive an issue successfully', async () => {
      const mockIssue = createMockIssue();
      mockClient.issue.mockResolvedValue(mockIssue);
      mockClient.archiveIssue.mockResolvedValue(createMockPayload(true));

      const result = await service.archive('issue-123');

      expect(mockClient.archiveIssue).toHaveBeenCalledWith('issue-123');
      expect(result).toBe(true);
    });
  });

  describe('list', () => {
    it('should list issues with filters', async () => {
      const mockIssues = [createMockIssue({ id: '1' }), createMockIssue({ id: '2' })];
      mockClient.issues.mockResolvedValue(createMockIssueConnection(mockIssues));

      const filter = TestFactory.issueFilter({
        teamId: 'team-123',
        priority: 2,
        state: 'started',
      });

      const result = await service.list(filter);

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: expect.objectContaining({
          team: { id: { eq: 'team-123' } },
          priority: { eq: 2 },
          state: { type: { eq: 'started' } },
        }),
        includeArchived: false,
        first: undefined,
      });
      expect(result.nodes).toEqual(mockIssues);
    });

    it('should handle pagination parameters', async () => {
      mockClient.issues.mockResolvedValue(createMockIssueConnection([]));

      await service.list(undefined, { first: 50, after: 'cursor-123' });

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {},
        includeArchived: undefined,
        first: 50,
        after: 'cursor-123',
      });
    });
  });

  describe('bulkUpdate', () => {
    it('should update multiple issues successfully', async () => {
      const issueIds = TestFactory.bulkIssueIds(3);
      const updateData = TestFactory.issueUpdate();

      issueIds.forEach((id) => {
        const mockIssue = createMockIssue({ id });
        mockClient.issue.mockResolvedValueOnce(mockIssue).mockResolvedValueOnce(mockIssue);
        mockClient.updateIssue.mockResolvedValueOnce(
          createMockPayload(true, { ...mockIssue, ...updateData }),
        );
      });

      const result = await service.bulkUpdate({
        issueIds,
        update: updateData,
      });

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.succeeded).toHaveLength(3);
    });

    it('should handle partial failures in bulk update', async () => {
      const issueIds = ['id-1', 'id-2', 'id-3'];
      const updateData = TestFactory.issueUpdate();

      // First issue succeeds
      mockClient.issue.mockResolvedValueOnce(createMockIssue({ id: 'id-1' }));
      mockClient.updateIssue.mockResolvedValueOnce(createMockPayload(true, createMockIssue()));

      // Second issue not found
      mockClient.issue.mockRejectedValueOnce(new Error('Not found'));

      // Third issue succeeds
      mockClient.issue.mockResolvedValueOnce(createMockIssue({ id: 'id-3' }));
      mockClient.updateIssue.mockResolvedValueOnce(createMockPayload(true, createMockIssue()));

      const result = await service.bulkUpdate({
        issueIds,
        update: updateData,
      });

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].item).toBe('id-2');
    });
  });

  describe('addComment', () => {
    it('should add a comment successfully', async () => {
      mockClient.createComment.mockResolvedValue(createMockPayload(true));

      const result = await service.addComment('issue-123', 'Test comment');

      expect(mockClient.createComment).toHaveBeenCalledWith({
        issueId: 'issue-123',
        body: 'Test comment',
      });
      expect(result).toBe(true);
    });

    it('should throw ValidationError when comment creation fails', async () => {
      mockClient.createComment.mockResolvedValue(createMockPayload(false));

      await expect(service.addComment('issue-123', 'Test comment')).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('addLabels', () => {
    it('should add labels to an issue', async () => {
      const mockIssue = createMockIssue();
      const existingLabels = [
        { id: 'label-1', name: 'Bug' },
        { id: 'label-2', name: 'High Priority' },
      ];

      mockIssue.labels.mockResolvedValue({ nodes: existingLabels });
      mockClient.issue.mockResolvedValue(mockIssue);
      mockClient.updateIssue.mockResolvedValue(createMockPayload(true, mockIssue));

      await service.addLabels('issue-123', ['label-3', 'label-4']);

      expect(mockClient.updateIssue).toHaveBeenCalledWith(
        'issue-123',
        expect.objectContaining({
          labelIds: ['label-1', 'label-2', 'label-3', 'label-4'],
        }),
      );
    });

    it('should not duplicate existing labels', async () => {
      const mockIssue = createMockIssue();
      const existingLabels = [{ id: 'label-1', name: 'Bug' }];

      mockIssue.labels.mockResolvedValue({ nodes: existingLabels });
      mockClient.issue.mockResolvedValue(mockIssue);
      mockClient.updateIssue.mockResolvedValue(createMockPayload(true, mockIssue));

      await service.addLabels('issue-123', ['label-1', 'label-2']);

      expect(mockClient.updateIssue).toHaveBeenCalledWith(
        'issue-123',
        expect.objectContaining({
          labelIds: ['label-1', 'label-2'],
        }),
      );
    });
  });

  describe('removeLabels', () => {
    it('should remove labels from an issue', async () => {
      const mockIssue = createMockIssue();
      const existingLabels = [
        { id: 'label-1', name: 'Bug' },
        { id: 'label-2', name: 'High Priority' },
        { id: 'label-3', name: 'Frontend' },
      ];

      mockIssue.labels.mockResolvedValue({ nodes: existingLabels });
      mockClient.issue.mockResolvedValue(mockIssue);
      mockClient.updateIssue.mockResolvedValue(createMockPayload(true, mockIssue));

      await service.removeLabels('issue-123', ['label-1', 'label-3']);

      expect(mockClient.updateIssue).toHaveBeenCalledWith(
        'issue-123',
        expect.objectContaining({
          labelIds: ['label-2'],
        }),
      );
    });
  });
});
