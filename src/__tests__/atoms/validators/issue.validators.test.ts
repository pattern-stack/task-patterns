import { IssueValidators } from '@atoms/validators/issue.validators';
import {
  createMockIssue,
  createMockLabel,
  createMockConnection,
  createMockWorkflowState,
} from '../../utils/mocks';

describe('IssueValidators', () => {
  describe('isValidTitle', () => {
    it('should accept valid titles', () => {
      const validTitles = [
        'Fix bug in authentication',
        'A',
        'Add new feature to dashboard',
        '🚀 Improve performance',
        'This is a very long title that contains many words but is still within the 255 character limit that Linear enforces for issue titles',
        'Title with numbers 123 and special chars !@#',
      ];

      validTitles.forEach((title) => {
        expect(IssueValidators.isValidTitle(title)).toBe(true);
      });
    });

    it('should reject invalid titles', () => {
      const invalidTitles = [
        '', // empty
        'a'.repeat(256), // too long
      ];

      invalidTitles.forEach((title) => {
        expect(IssueValidators.isValidTitle(title)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(IssueValidators.isValidTitle('a'.repeat(255))).toBe(true); // exactly at limit
      expect(IssueValidators.isValidTitle(' ')).toBe(true); // single space is technically valid
    });
  });

  describe('isValidPriority', () => {
    it('should accept valid priorities (0-4)', () => {
      [0, 1, 2, 3, 4].forEach((priority) => {
        expect(IssueValidators.isValidPriority(priority)).toBe(true);
      });
    });

    it('should reject invalid priorities', () => {
      const invalidPriorities = [
        -1,
        5,
        100,
        1.5, // not integer
        NaN,
        Infinity,
        -Infinity,
      ];

      invalidPriorities.forEach((priority) => {
        expect(IssueValidators.isValidPriority(priority)).toBe(false);
      });
    });
  });

  describe('isValidEstimate', () => {
    it('should accept valid estimates', () => {
      const validEstimates = [1, 2, 3, 5, 8, 13, 21, 0.5, 100, 0.1];

      validEstimates.forEach((estimate) => {
        expect(IssueValidators.isValidEstimate(estimate)).toBe(true);
      });
    });

    it('should reject invalid estimates', () => {
      const invalidEstimates = [0, -1, -5, NaN, Infinity, -Infinity];

      invalidEstimates.forEach((estimate) => {
        expect(IssueValidators.isValidEstimate(estimate)).toBe(false);
      });
    });
  });

  describe('isValidDescription', () => {
    it('should accept descriptions within limit', () => {
      const validDescriptions = [
        '',
        'Short description',
        'A'.repeat(100000), // exactly at limit
        'A'.repeat(50000),
        'Description with\nmultiple\nlines',
        '# Markdown description\n\n- Item 1\n- Item 2',
      ];

      validDescriptions.forEach((description) => {
        expect(IssueValidators.isValidDescription(description)).toBe(true);
      });
    });

    it('should reject descriptions over limit', () => {
      const invalidDescriptions = [
        'A'.repeat(100001), // just over limit
        'A'.repeat(200000),
      ];

      invalidDescriptions.forEach((description) => {
        expect(IssueValidators.isValidDescription(description)).toBe(false);
      });
    });
  });

  describe('canEditIssue', () => {
    it('should allow creator to edit', async () => {
      const issue = createMockIssue({
        creatorId: 'user-123',
        assigneeId: 'user-456',
      });

      expect(await IssueValidators.canEditIssue(issue, 'user-123')).toBe(true);
    });

    it('should allow assignee to edit', async () => {
      const issue = createMockIssue({
        creatorId: 'user-456',
        assigneeId: 'user-123',
      });

      expect(await IssueValidators.canEditIssue(issue, 'user-123')).toBe(true);
    });

    it('should deny edit for other users', async () => {
      const issue = createMockIssue({
        creatorId: 'user-456',
        assigneeId: 'user-789',
      });

      expect(await IssueValidators.canEditIssue(issue, 'user-123')).toBe(false);
    });

    it('should handle undefined assignee', async () => {
      const issue = createMockIssue({
        creatorId: 'user-456',
        assigneeId: undefined,
      });

      expect(await IssueValidators.canEditIssue(issue, 'user-123')).toBe(false);
    });
  });

  describe('isActive', () => {
    it('should identify active issues', () => {
      const activeStates = ['unstarted', 'started', 'backlog', 'triage'];

      activeStates.forEach((type) => {
        const issue = createMockIssue({
          state: createMockWorkflowState({ type }),
        });
        expect(IssueValidators.isActive(issue)).toBe(true);
      });
    });

    it('should identify inactive issues', () => {
      const inactiveStates = ['completed', 'canceled'];

      inactiveStates.forEach((type) => {
        const issue = createMockIssue({
          state: createMockWorkflowState({ type }),
        });
        expect(IssueValidators.isActive(issue)).toBe(false);
      });
    });

    it('should handle missing state', () => {
      const issue = createMockIssue({
        state: undefined,
      });
      expect(IssueValidators.isActive(issue)).toBe(true); // assumes active if no state
    });
  });

  describe('isBlocked', () => {
    it('should identify blocked issues by label', () => {
      const blockedLabels = [
        createMockLabel({ name: 'blocked' }),
        createMockLabel({ name: 'BLOCKED' }),
        createMockLabel({ name: 'Blocked by dependency' }),
        createMockLabel({ name: 'is-blocked' }),
      ];

      blockedLabels.forEach((label) => {
        const issue = createMockIssue({
          labels: jest.fn().mockResolvedValue(createMockConnection([label])),
        });
        // Synchronously mock the labels property
        issue.labels = { nodes: [label] };

        expect(IssueValidators.isBlocked(issue)).toBe(true);
      });
    });

    it('should identify non-blocked issues', () => {
      const nonBlockedLabels = [
        createMockLabel({ name: 'bug' }),
        createMockLabel({ name: 'feature' }),
        createMockLabel({ name: 'blocker' }), // blocker not blocked
      ];

      nonBlockedLabels.forEach((label) => {
        const issue = createMockIssue({
          labels: jest.fn().mockResolvedValue(createMockConnection([label])),
        });
        // Synchronously mock the labels property
        issue.labels = { nodes: [label] };

        expect(IssueValidators.isBlocked(issue)).toBe(false);
      });
    });

    it('should handle issues with no labels', () => {
      const issue = createMockIssue({
        labels: jest.fn().mockResolvedValue(createMockConnection([])),
      });
      // Synchronously mock the labels property
      issue.labels = { nodes: [] };

      expect(IssueValidators.isBlocked(issue)).toBe(false);
    });

    it('should handle undefined labels', () => {
      const issue = createMockIssue({
        labels: undefined,
      });

      expect(IssueValidators.isBlocked(issue)).toBe(false);
    });
  });

  describe('canBeChild', () => {
    it('should allow valid parent-child relationships', async () => {
      const issue = createMockIssue({
        id: 'issue-123',
        parentId: null,
      });

      expect(await IssueValidators.canBeChild(issue, 'issue-456')).toBe(true);
    });

    it('should prevent self-referential relationships', async () => {
      const issue = createMockIssue({
        id: 'issue-123',
        parentId: null,
      });

      expect(await IssueValidators.canBeChild(issue, 'issue-123')).toBe(false);
    });

    it('should prevent redundant parent assignment', async () => {
      const issue = createMockIssue({
        id: 'issue-123',
        parentId: 'issue-456',
      });

      expect(await IssueValidators.canBeChild(issue, 'issue-456')).toBe(false);
    });

    it('should allow changing parent', async () => {
      const issue = createMockIssue({
        id: 'issue-123',
        parentId: 'issue-456',
      });

      expect(await IssueValidators.canBeChild(issue, 'issue-789')).toBe(true);
    });
  });

  describe('canArchive', () => {
    it('should allow archiving completed issues', () => {
      const issue = createMockIssue({
        state: createMockWorkflowState({ type: 'completed' }),
      });

      expect(IssueValidators.canArchive(issue)).toBe(true);
    });

    it('should allow archiving canceled issues', () => {
      const issue = createMockIssue({
        state: createMockWorkflowState({ type: 'canceled' }),
      });

      expect(IssueValidators.canArchive(issue)).toBe(true);
    });

    it('should prevent archiving active issues', () => {
      const activeStates = ['unstarted', 'started', 'backlog', 'triage'];

      activeStates.forEach((type) => {
        const issue = createMockIssue({
          state: createMockWorkflowState({ type }),
        });
        expect(IssueValidators.canArchive(issue)).toBe(false);
      });
    });

    it('should handle missing state', () => {
      const issue = createMockIssue({
        state: undefined,
      });

      expect(IssueValidators.canArchive(issue)).toBe(false);
    });
  });

  describe('isValidDueDate', () => {
    it('should accept future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      expect(IssueValidators.isValidDueDate(tomorrow)).toBe(true);
      expect(IssueValidators.isValidDueDate(nextWeek)).toBe(true);
      expect(IssueValidators.isValidDueDate('2099-12-31')).toBe(true);
    });

    it('should reject past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      expect(IssueValidators.isValidDueDate(yesterday)).toBe(false);
      expect(IssueValidators.isValidDueDate(lastWeek)).toBe(false);
      expect(IssueValidators.isValidDueDate('2020-01-01')).toBe(false);
    });

    it('should reject current date', () => {
      const now = new Date();
      expect(IssueValidators.isValidDueDate(now)).toBe(false);
    });

    it('should handle invalid dates', () => {
      expect(IssueValidators.isValidDueDate('invalid-date')).toBe(false);
      expect(IssueValidators.isValidDueDate('2024-13-01')).toBe(false);
      expect(IssueValidators.isValidDueDate('')).toBe(false);
    });

    it('should handle Date objects and strings', () => {
      const futureDate = new Date('2099-01-01');
      expect(IssueValidators.isValidDueDate(futureDate)).toBe(true);
      expect(IssueValidators.isValidDueDate('2099-01-01')).toBe(true);
    });
  });
});
