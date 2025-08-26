import { LabelService } from '@features/label/service';
import { linearClient } from '@atoms/client/linear-client';
import { NotFoundError, ValidationError } from '@atoms/types/common';
import { TestFactory } from '../fixtures/factories';
import {
  createMockLabel,
  createMockPayload,
  createMockConnection,
  createMockLinearClient,
  createMockIssue,
  createMockIssueConnection,
  createMockLabelConnection,
} from '../utils/mocks';

jest.mock('@atoms/client/linear-client');

describe('LabelService', () => {
  let service: LabelService;
  let mockClient: ReturnType<typeof createMockLinearClient>;

  beforeEach(() => {
    TestFactory.reset();
    mockClient = createMockLinearClient();
    (linearClient.getClient as jest.Mock).mockReturnValue(mockClient);
    service = new LabelService(mockClient as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a label successfully', async () => {
      const labelData = TestFactory.labelCreate();
      const mockLabel = createMockLabel(labelData);

      mockClient.createIssueLabel.mockResolvedValue(createMockPayload(true, mockLabel));

      const result = await service.create(labelData);

      expect(mockClient.createIssueLabel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: labelData.name,
          color: labelData.color,
          description: labelData.description,
          teamId: labelData.teamId,
          parentId: labelData.parentId,
        }),
      );
      expect(result).toEqual(mockLabel);
    });

    it('should create a workspace-wide label when teamId is not specified', async () => {
      const labelData = TestFactory.labelCreate({ teamId: undefined });
      const mockLabel = createMockLabel(labelData);

      mockClient.createIssueLabel.mockResolvedValue(createMockPayload(true, mockLabel));

      await service.create(labelData);

      expect(mockClient.createIssueLabel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: labelData.name,
          teamId: undefined,
        }),
      );
    });

    it('should throw ValidationError when creation fails', async () => {
      const labelData = TestFactory.labelCreate();

      mockClient.createIssueLabel.mockResolvedValue(createMockPayload(false));

      await expect(service.create(labelData)).rejects.toThrow(ValidationError);
    });

    it('should handle optional fields correctly', async () => {
      const labelData = TestFactory.labelCreate({
        color: '#FF5733',
        description: 'Test label description',
        parentId: 'parent-123',
      });

      const mockLabel = createMockLabel(labelData);
      mockClient.createIssueLabel.mockResolvedValue(createMockPayload(true, mockLabel));

      await service.create(labelData);

      expect(mockClient.createIssueLabel).toHaveBeenCalledWith(
        expect.objectContaining({
          color: '#FF5733',
          description: 'Test label description',
          parentId: 'parent-123',
        }),
      );
    });

    it('should validate color format', async () => {
      const labelData = TestFactory.labelCreate({ color: 'invalid-color' });

      await expect(service.create(labelData)).rejects.toThrow(ValidationError);
    });
  });

  describe('get', () => {
    it('should return a label when found', async () => {
      const mockLabel = createMockLabel();
      mockClient.issueLabel.mockResolvedValue(mockLabel);

      const result = await service.get('label-123');

      expect(mockClient.issueLabel).toHaveBeenCalledWith('label-123');
      expect(result).toEqual(mockLabel);
    });

    it('should return null when label not found', async () => {
      mockClient.issueLabel.mockRejectedValue(new Error('Not found'));

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByName', () => {
    it('should return a label by name', async () => {
      const mockLabel = createMockLabel({ name: 'Bug' });
      mockClient.issueLabels.mockResolvedValue(createMockConnection([mockLabel]));

      const result = await service.getByName('Bug');

      expect(mockClient.issueLabels).toHaveBeenCalledWith({
        filter: {
          name: { eq: 'Bug' },
          team: null,
        },
        first: 1,
      });
      expect(result).toEqual(mockLabel);
    });

    it('should return a team-specific label by name', async () => {
      const mockLabel = createMockLabel({ name: 'Bug', teamId: 'team-123' });
      mockClient.issueLabels.mockResolvedValue(createMockConnection([mockLabel]));

      const result = await service.getByName('Bug', 'team-123');

      expect(mockClient.issueLabels).toHaveBeenCalledWith({
        filter: {
          name: { eq: 'Bug' },
          team: { id: { eq: 'team-123' } },
        },
        first: 1,
      });
      expect(result).toEqual(mockLabel);
    });

    it('should return null when no label matches name', async () => {
      mockClient.issueLabels.mockResolvedValue(createMockConnection([]));

      const result = await service.getByName('NonExistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a label successfully', async () => {
      const mockLabel = createMockLabel();
      const updateData = TestFactory.labelUpdate();

      mockClient.issueLabel.mockResolvedValue(mockLabel);
      mockClient.updateIssueLabel.mockResolvedValue(
        createMockPayload(true, { ...mockLabel, ...updateData }),
      );

      const result = await service.update('label-123', updateData);

      expect(mockClient.updateIssueLabel).toHaveBeenCalledWith(
        'label-123',
        expect.objectContaining({
          name: updateData.name,
          color: updateData.color,
          description: updateData.description,
        }),
      );
      expect(result.name).toBe(updateData.name);
    });

    it('should throw NotFoundError when label does not exist', async () => {
      mockClient.issueLabel.mockRejectedValue(new Error('Not found'));

      await expect(service.update('nonexistent', TestFactory.labelUpdate())).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ValidationError when update fails', async () => {
      const mockLabel = createMockLabel();
      mockClient.issueLabel.mockResolvedValue(mockLabel);
      mockClient.updateIssueLabel.mockResolvedValue(createMockPayload(false));

      await expect(service.update('label-123', TestFactory.labelUpdate())).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('delete', () => {
    it('should delete a label successfully', async () => {
      const mockLabel = createMockLabel();
      mockClient.issueLabel.mockResolvedValue(mockLabel);
      mockClient.deleteIssueLabel.mockResolvedValue(createMockPayload(true));

      const result = await service.delete('label-123');

      expect(mockClient.deleteIssueLabel).toHaveBeenCalledWith('label-123');
      expect(result).toBe(true);
    });

    it('should throw NotFoundError when label does not exist', async () => {
      mockClient.issueLabel.mockRejectedValue(new Error('Not found'));

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should list labels with filters', async () => {
      const mockLabels = [createMockLabel({ id: '1' }), createMockLabel({ id: '2' })];
      mockClient.issueLabels.mockResolvedValue(createMockConnection(mockLabels));

      const filter = TestFactory.labelFilter({
        teamId: 'team-123',
        includeArchived: true,
      });

      const result = await service.list(filter);

      expect(mockClient.issueLabels).toHaveBeenCalledWith({
        filter: expect.objectContaining({
          team: { id: { eq: 'team-123' } },
        }),
        includeArchived: true,
        first: undefined,
      });
      expect(result.nodes).toEqual(mockLabels);
    });

    it('should handle pagination parameters', async () => {
      mockClient.issueLabels.mockResolvedValue(createMockConnection([]));

      await service.list(undefined, { first: 50, after: 'cursor-123' });

      expect(mockClient.issueLabels).toHaveBeenCalledWith({
        filter: {},
        includeArchived: undefined,
        first: 50,
        after: 'cursor-123',
      });
    });

    it('should list workspace labels only when teamId is null', async () => {
      mockClient.issueLabels.mockResolvedValue(createMockConnection([]));

      const filter = TestFactory.labelFilter({ teamId: null });
      await service.list(filter);

      expect(mockClient.issueLabels).toHaveBeenCalledWith({
        filter: expect.objectContaining({
          team: null,
        }),
        includeArchived: false,
        first: undefined,
      });
    });
  });

  describe('listByTeam', () => {
    it('should list labels for a specific team', async () => {
      const mockLabels = [createMockLabel({ teamId: 'team-123' })];
      mockClient.issueLabels.mockResolvedValue(createMockConnection(mockLabels));

      const result = await service.listByTeam('team-123');

      expect(mockClient.issueLabels).toHaveBeenCalledWith({
        filter: {
          team: { id: { eq: 'team-123' } },
        },
        includeArchived: false,
      });
      expect(result.nodes).toEqual(mockLabels);
    });
  });

  describe('addToIssue', () => {
    it('should add a label to an issue successfully', async () => {
      const mockIssue = createMockIssue();
      const existingLabels = [{ id: 'label-1', name: 'Bug' }];

      mockIssue.labels.mockResolvedValue({ nodes: existingLabels });
      mockClient.issue.mockResolvedValue(mockIssue);
      mockClient.updateIssue.mockResolvedValue(createMockPayload(true, mockIssue));

      const result = await service.addToIssue('issue-123', 'label-2');

      expect(mockClient.updateIssue).toHaveBeenCalledWith(
        'issue-123',
        expect.objectContaining({
          labelIds: ['label-1', 'label-2'],
        }),
      );
      expect(result).toEqual(mockIssue);
    });

    it('should not duplicate existing labels', async () => {
      const mockIssue = createMockIssue();
      const existingLabels = [{ id: 'label-1', name: 'Bug' }];

      mockIssue.labels.mockResolvedValue({ nodes: existingLabels });
      mockClient.issue.mockResolvedValue(mockIssue);
      mockClient.updateIssue.mockResolvedValue(createMockPayload(true, mockIssue));

      await service.addToIssue('issue-123', 'label-1');

      expect(mockClient.updateIssue).toHaveBeenCalledWith(
        'issue-123',
        expect.objectContaining({
          labelIds: ['label-1'],
        }),
      );
    });

    it('should throw NotFoundError when issue does not exist', async () => {
      mockClient.issue.mockRejectedValue(new Error('Not found'));

      await expect(service.addToIssue('nonexistent', 'label-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('removeFromIssue', () => {
    it('should remove a label from an issue', async () => {
      const mockIssue = createMockIssue();
      const existingLabels = [
        { id: 'label-1', name: 'Bug' },
        { id: 'label-2', name: 'Feature' },
      ];

      mockIssue.labels.mockResolvedValue({ nodes: existingLabels });
      mockClient.issue.mockResolvedValue(mockIssue);
      mockClient.updateIssue.mockResolvedValue(createMockPayload(true, mockIssue));

      const result = await service.removeFromIssue('issue-123', 'label-1');

      expect(mockClient.updateIssue).toHaveBeenCalledWith(
        'issue-123',
        expect.objectContaining({
          labelIds: ['label-2'],
        }),
      );
      expect(result).toEqual(mockIssue);
    });

    it('should handle removing non-existent label gracefully', async () => {
      const mockIssue = createMockIssue();
      const existingLabels = [{ id: 'label-1', name: 'Bug' }];

      mockIssue.labels.mockResolvedValue({ nodes: existingLabels });
      mockClient.issue.mockResolvedValue(mockIssue);
      mockClient.updateIssue.mockResolvedValue(createMockPayload(true, mockIssue));

      await service.removeFromIssue('issue-123', 'label-nonexistent');

      expect(mockClient.updateIssue).toHaveBeenCalledWith(
        'issue-123',
        expect.objectContaining({
          labelIds: ['label-1'],
        }),
      );
    });
  });

  describe('getIssues', () => {
    it('should get issues for a label', async () => {
      const mockIssues = [createMockIssue({ id: '1' })];
      mockClient.issues.mockResolvedValue(createMockIssueConnection(mockIssues));

      const result = await service.getIssues('label-123');

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          labels: {
            some: {
              id: { eq: 'label-123' },
            },
          },
        },
        first: undefined,
        after: undefined,
      });
      expect(result.nodes).toEqual(mockIssues);
    });

    it('should handle pagination for label issues', async () => {
      mockClient.issues.mockResolvedValue(createMockIssueConnection([]));

      await service.getIssues('label-123', { first: 25, after: 'cursor-456' });

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          labels: {
            some: {
              id: { eq: 'label-123' },
            },
          },
        },
        first: 25,
        after: 'cursor-456',
      });
    });
  });

  describe('bulkAddToIssues', () => {
    it('should add label to multiple issues successfully', async () => {
      const issueIds = TestFactory.bulkIssueIds(3);

      issueIds.forEach((id) => {
        const mockIssue = createMockIssue({ id });
        mockIssue.labels.mockResolvedValue({ nodes: [] });
        mockClient.issue.mockResolvedValueOnce(mockIssue).mockResolvedValueOnce(mockIssue);
        mockClient.updateIssue.mockResolvedValueOnce(createMockPayload(true, mockIssue));
      });

      const result = await service.bulkAddToIssues(issueIds, 'label-123');

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.succeeded).toHaveLength(3);
    });

    it('should handle partial failures in bulk add', async () => {
      const issueIds = ['id-1', 'id-2', 'id-3'];

      // First issue succeeds
      const mockIssue1 = createMockIssue({ id: 'id-1' });
      mockIssue1.labels.mockResolvedValue({ nodes: [] });
      mockClient.issue.mockResolvedValueOnce(mockIssue1);
      mockClient.updateIssue.mockResolvedValueOnce(createMockPayload(true, mockIssue1));

      // Second issue not found
      mockClient.issue.mockRejectedValueOnce(new Error('Not found'));

      // Third issue succeeds
      const mockIssue3 = createMockIssue({ id: 'id-3' });
      mockIssue3.labels.mockResolvedValue({ nodes: [] });
      mockClient.issue.mockResolvedValueOnce(mockIssue3);
      mockClient.updateIssue.mockResolvedValueOnce(createMockPayload(true, mockIssue3));

      const result = await service.bulkAddToIssues(issueIds, 'label-123');

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].item).toBe('id-2');
    });

    it('should validate input parameters', async () => {
      await expect(service.bulkAddToIssues([], 'label-123')).rejects.toThrow(ValidationError);

      await expect(service.bulkAddToIssues(['issue-1'], '')).rejects.toThrow(ValidationError);
    });
  });

  describe('mergeLabels', () => {
    it('should merge labels successfully', async () => {
      const sourceLabel = createMockLabel({ id: 'source-123', name: 'OldLabel' });
      const targetLabel = createMockLabel({ id: 'target-123', name: 'NewLabel' });

      // Mock issues with source label
      const issuesWithSourceLabel = [
        createMockIssue({ id: 'issue-1' }),
        createMockIssue({ id: 'issue-2' }),
      ];

      mockClient.issueLabel.mockResolvedValueOnce(sourceLabel);
      mockClient.issueLabel.mockResolvedValueOnce(targetLabel);

      mockClient.issues.mockResolvedValue(createMockIssueConnection(issuesWithSourceLabel));

      // Mock updating issues
      issuesWithSourceLabel.forEach((issue) => {
        issue.labels.mockResolvedValue({
          nodes: [{ id: 'source-123', name: 'OldLabel' }],
        });
        mockClient.issue.mockResolvedValueOnce(issue);
        mockClient.updateIssue.mockResolvedValueOnce(createMockPayload(true, issue));
      });

      mockClient.deleteIssueLabel.mockResolvedValue(createMockPayload(true));

      const result = await service.mergeLabels('source-123', 'target-123');

      expect(mockClient.deleteIssueLabel).toHaveBeenCalledWith('source-123');
      expect(result).toEqual(targetLabel);
    });

    it('should throw NotFoundError when source label does not exist', async () => {
      mockClient.issueLabel.mockRejectedValueOnce(new Error('Not found'));

      await expect(service.mergeLabels('nonexistent', 'target-123')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when target label does not exist', async () => {
      const sourceLabel = createMockLabel({ id: 'source-123' });
      mockClient.issueLabel.mockResolvedValueOnce(sourceLabel);
      mockClient.issueLabel.mockRejectedValueOnce(new Error('Not found'));

      await expect(service.mergeLabels('source-123', 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
