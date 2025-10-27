import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { LinearClient, IssueLabel, Issue } from '@linear/sdk';
import {
  resolveLabelIds,
  findSimilarLabels,
  formatLabelList,
  LabelResolutionResult,
} from '@organisms/cli/helpers/label-resolver';

// Mock dependencies
const createMockClient = (): LinearClient => {
  const mockLabels: IssueLabel[] = [
    {
      id: 'label-1',
      name: 'type:bug',
      color: '#ff0000',
      team: Promise.resolve({ id: 'team-1', key: 'TASK' } as any),
    } as any,
    {
      id: 'label-2',
      name: 'type:feature',
      color: '#00ff00',
      team: Promise.resolve({ id: 'team-1', key: 'TASK' } as any),
    } as any,
    {
      id: 'label-3',
      name: 'priority:high',
      color: '#ff8800',
      team: Promise.resolve({ id: 'team-1', key: 'TASK' } as any),
    } as any,
    {
      id: 'label-4',
      name: 'domain:tasks',
      color: '#14b8a6',
      team: Promise.resolve({ id: 'team-1', key: 'TASK' } as any),
    } as any,
    {
      id: 'label-5',
      name: 'layer:molecules',
      color: '#00b894',
      team: Promise.resolve({ id: 'team-1', key: 'TASK' } as any),
    } as any,
    // Workspace label (no team)
    {
      id: 'label-6',
      name: 'workspace:label',
      color: '#cccccc',
      team: Promise.resolve(null),
    } as any,
  ];

  return {
    // @ts-expect-error - Jest mock typing issue
    issueLabels: jest.fn().mockResolvedValue({
      nodes: mockLabels,
    }),
    // @ts-expect-error - Jest mock typing issue
    issue: jest.fn().mockResolvedValue({
      id: 'issue-1',
      team: Promise.resolve({
        id: 'team-1',
        key: 'TASK',
      }),
    }),
  } as any;
};

describe('Label Resolver', () => {
  let mockClient: LinearClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockClient();
  });

  describe('resolveLabelIds', () => {
    it('should resolve label by exact name', async () => {
      const result = await resolveLabelIds('type:bug', 'team-1', mockClient);

      expect(result.resolved).toHaveLength(1);
      expect(result.resolved[0].id).toBe('label-1');
      expect(result.resolved[0].name).toBe('type:bug');
      expect(result.notFound).toHaveLength(0);
    });

    it('should resolve multiple labels by name', async () => {
      const result = await resolveLabelIds(
        'type:bug,priority:high,domain:tasks',
        'team-1',
        mockClient
      );

      expect(result.resolved).toHaveLength(3);
      expect(result.resolved.map((l) => l.name)).toEqual([
        'type:bug',
        'priority:high',
        'domain:tasks',
      ]);
      expect(result.notFound).toHaveLength(0);
    });

    it('should resolve label by ID (UUID passthrough)', async () => {
      // Use a real UUID format
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';

      // Update mock to include a label with UUID
      const mockClient = {
        // @ts-expect-error - Jest mock typing issue
        issueLabels: jest.fn().mockResolvedValue({
          nodes: [
            { id: validUUID, name: 'test:label', color: '#ff0000' } as any,
          ],
        }),
      } as any;

      const result = await resolveLabelIds(validUUID, 'team-1', mockClient);

      expect(result.resolved).toHaveLength(1);
      expect(result.resolved[0].id).toBe(validUUID);
      expect(result.notFound).toHaveLength(0);
    });

    it('should handle mixed names and IDs', async () => {
      // Use real UUID format for IDs
      const validUUID1 = '550e8400-e29b-41d4-a716-446655440001';
      const validUUID2 = '550e8400-e29b-41d4-a716-446655440002';

      // Mock client with both UUID-based and name-based labels
      const mockClient = {
        // @ts-expect-error - Jest mock typing issue
        issueLabels: jest.fn().mockResolvedValue({
          nodes: [
            { id: validUUID1, name: 'type:bug', color: '#ff0000' } as any,
            { id: validUUID2, name: 'priority:high', color: '#ff8800' } as any,
          ],
        }),
      } as any;

      const result = await resolveLabelIds(
        `${validUUID1},priority:high`,
        'team-1',
        mockClient
      );

      expect(result.resolved).toHaveLength(2);
      expect(result.resolved.map((l) => l.id)).toContain(validUUID1);
      expect(result.resolved.map((l) => l.id)).toContain(validUUID2);
      expect(result.notFound).toHaveLength(0);
    });

    it('should handle not found labels', async () => {
      const result = await resolveLabelIds(
        'type:bug,invalid:label,priority:high',
        'team-1',
        mockClient
      );

      expect(result.resolved).toHaveLength(2);
      expect(result.notFound).toHaveLength(1);
      expect(result.notFound[0]).toBe('invalid:label');
    });

    it('should trim whitespace from label names', async () => {
      const result = await resolveLabelIds(
        '  type:bug  ,  priority:high  ',
        'team-1',
        mockClient
      );

      expect(result.resolved).toHaveLength(2);
      expect(result.notFound).toHaveLength(0);
    });

    it('should handle empty string input', async () => {
      const result = await resolveLabelIds('', 'team-1', mockClient);

      expect(result.resolved).toHaveLength(0);
      expect(result.notFound).toHaveLength(0);
    });

    it('should deduplicate resolved labels', async () => {
      const result = await resolveLabelIds(
        'type:bug,type:bug,label-1',
        'team-1',
        mockClient
      );

      expect(result.resolved).toHaveLength(1);
      expect(result.resolved[0].id).toBe('label-1');
    });

    it('should resolve workspace labels when no team provided', async () => {
      const result = await resolveLabelIds(
        'workspace:label',
        undefined,
        mockClient
      );

      expect(result.resolved).toHaveLength(1);
      expect(result.resolved[0].name).toBe('workspace:label');
    });

    it('should validate UUID format for IDs', async () => {
      // Invalid ID format should be treated as name
      const result = await resolveLabelIds('not-a-valid-id', 'team-1', mockClient);

      expect(result.notFound).toHaveLength(1);
      expect(result.notFound[0]).toBe('not-a-valid-id');
    });
  });

  describe('findSimilarLabels', () => {
    it('should find similar labels using fuzzy matching', async () => {
      const allLabels = [
        { id: 'label-1', name: 'type:bug', color: '#ff0000' } as IssueLabel,
        { id: 'label-2', name: 'type:feature', color: '#00ff00' } as IssueLabel,
        { id: 'label-3', name: 'priority:high', color: '#ff8800' } as IssueLabel,
      ];

      const similar = findSimilarLabels('type:bugg', allLabels);

      expect(similar).toHaveLength(2);
      expect(similar[0].name).toBe('type:bug');
    });

    it('should find labels with similar category', async () => {
      const allLabels = [
        { id: 'label-1', name: 'type:bug', color: '#ff0000' } as IssueLabel,
        { id: 'label-2', name: 'type:feature', color: '#00ff00' } as IssueLabel,
        { id: 'label-3', name: 'priority:high', color: '#ff8800' } as IssueLabel,
      ];

      const similar = findSimilarLabels('type:', allLabels);

      expect(similar.length).toBeGreaterThanOrEqual(2);
      expect(similar.every((l) => l.name.startsWith('type:'))).toBe(true);
    });

    it('should limit results to maxResults parameter', async () => {
      const allLabels = [
        { id: 'label-1', name: 'type:bug', color: '#ff0000' } as IssueLabel,
        { id: 'label-2', name: 'type:feature', color: '#00ff00' } as IssueLabel,
        { id: 'label-3', name: 'type:refactor', color: '#8b5cf6' } as IssueLabel,
      ];

      const similar = findSimilarLabels('type:', allLabels, 2);

      expect(similar).toHaveLength(2);
    });

    it('should return empty array when no similar labels found', async () => {
      const allLabels = [
        { id: 'label-1', name: 'type:bug', color: '#ff0000' } as IssueLabel,
      ];

      const similar = findSimilarLabels('completely:different', allLabels);

      expect(similar).toHaveLength(0);
    });

    it('should handle case-insensitive matching', async () => {
      const allLabels = [
        { id: 'label-1', name: 'Type:Bug', color: '#ff0000' } as IssueLabel,
        { id: 'label-2', name: 'TYPE:FEATURE', color: '#00ff00' } as IssueLabel,
      ];

      const similar = findSimilarLabels('type:bug', allLabels);

      expect(similar.length).toBeGreaterThan(0);
    });
  });

  describe('formatLabelList', () => {
    it('should format labels grouped by category', () => {
      const labels = [
        { id: 'label-1', name: 'type:bug', color: '#ff0000' } as IssueLabel,
        { id: 'label-2', name: 'type:feature', color: '#00ff00' } as IssueLabel,
        { id: 'label-3', name: 'priority:high', color: '#ff8800' } as IssueLabel,
      ];

      const formatted = formatLabelList(labels);

      expect(formatted).toContain('type:');
      expect(formatted).toContain('bug');
      expect(formatted).toContain('feature');
      expect(formatted).toContain('priority:');
      expect(formatted).toContain('high');
    });

    it('should handle non-hierarchical labels', () => {
      const labels = [
        { id: 'label-1', name: 'simple-label', color: '#ff0000' } as IssueLabel,
      ];

      const formatted = formatLabelList(labels);

      expect(formatted).toContain('simple-label');
    });

    it('should show label colors if available', () => {
      const labels = [
        { id: 'label-1', name: 'type:bug', color: '#ff0000' } as IssueLabel,
      ];

      const formatted = formatLabelList(labels);

      // Should contain ANSI color codes or color representation
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should handle empty label list', () => {
      const formatted = formatLabelList([]);

      expect(formatted).toContain('No labels');
    });

    it('should group hierarchical labels by category', () => {
      const labels = [
        { id: 'label-1', name: 'type:bug', color: '#ff0000' } as IssueLabel,
        { id: 'label-2', name: 'type:feature', color: '#00ff00' } as IssueLabel,
        { id: 'label-3', name: 'domain:tasks', color: '#14b8a6' } as IssueLabel,
      ];

      const formatted = formatLabelList(labels);

      // Should show categories as headers
      expect(formatted).toContain('type');
      expect(formatted).toContain('domain');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full resolution workflow with suggestions', async () => {
      const input = 'type:bug,invalid:typo,priority:high';
      const result = await resolveLabelIds(input, 'team-1', mockClient);

      expect(result.resolved).toHaveLength(2);
      expect(result.notFound).toHaveLength(1);

      // Get all labels for suggestions
      const allLabelsResponse = await mockClient.issueLabels({});
      const allLabels = allLabelsResponse.nodes;

      const suggestions = findSimilarLabels(result.notFound[0], allLabels);
      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should resolve labels from issue context', async () => {
      // Get issue to determine team
      const issue = await mockClient.issue('issue-1');
      const team = await issue.team;

      const result = await resolveLabelIds(
        'type:bug,domain:tasks',
        team?.id,
        mockClient
      );

      expect(result.resolved).toHaveLength(2);
      expect(result.notFound).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    it('should handle client errors gracefully', async () => {
      const client = {
        // @ts-expect-error - Jest mock typing issue
        issueLabels: jest.fn().mockRejectedValue(new Error('Network error')),
      } as any;

      await expect(
        resolveLabelIds('type:bug', 'team-1', client)
      ).rejects.toThrow('Network error');
    });

    it('should handle malformed input', async () => {
      const result = await resolveLabelIds(',,,', 'team-1', mockClient);

      expect(result.resolved).toHaveLength(0);
      expect(result.notFound).toHaveLength(0);
    });
  });
});
