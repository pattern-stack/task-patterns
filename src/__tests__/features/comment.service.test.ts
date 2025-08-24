import { CommentService } from '@features/comment/service';
import { linearClient } from '@atoms/client/linear-client';
import { NotFoundError, ValidationError } from '@atoms/types/common';
import { TestFactory } from '../fixtures/factories';
import {
  createMockComment,
  createMockPayload,
  createMockConnection,
  createMockLinearClient,
  createMockUser,
} from '../utils/mocks';

jest.mock('@atoms/client/linear-client');

describe('CommentService', () => {
  let service: CommentService;
  let mockClient: ReturnType<typeof createMockLinearClient>;

  beforeEach(() => {
    TestFactory.reset();
    mockClient = createMockLinearClient();
    (linearClient.getClient as jest.Mock).mockReturnValue(mockClient);
    service = new CommentService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a comment on an issue successfully', async () => {
      const commentData = {
        issueId: 'issue-123',
        body: 'This is a test comment',
      };
      const mockComment = createMockComment({
        id: 'comment-123',
        ...commentData,
        __typename: 'Comment',
      });

      mockClient.createComment.mockResolvedValue(createMockPayload(true, mockComment));

      const result = await service.create(commentData);

      expect(mockClient.createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          issueId: 'issue-123',
          body: 'This is a test comment',
        }),
      );
      expect(result.id).toBe('comment-123');
      expect(result.body).toBe('This is a test comment');
    });

    it('should support markdown formatting in comments', async () => {
      const commentData = {
        issueId: 'issue-123',
        body: '**Bold** and *italic* with [link](http://example.com)',
      };
      const mockComment = createMockComment({
        id: 'comment-123',
        ...commentData,
        __typename: 'Comment',
      });

      mockClient.createComment.mockResolvedValue(createMockPayload(true, mockComment));

      const result = await service.create(commentData);

      expect(result.body).toContain('**Bold**');
      expect(result.body).toContain('[link]');
    });

    it('should create threaded reply when parentId provided', async () => {
      const replyData = {
        issueId: 'issue-123',
        body: 'This is a reply',
        parentId: 'comment-parent',
      };
      const mockReply = createMockComment({
        id: 'comment-reply',
        ...replyData,
        __typename: 'Comment',
      });

      mockClient.createComment.mockResolvedValue(createMockPayload(true, mockReply));

      const result = await service.create(replyData);

      expect(mockClient.createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          issueId: 'issue-123',
          body: 'This is a reply',
          parentId: 'comment-parent',
        }),
      );
      // Comment includes the parentId in the creation data
      expect(result.body).toBe('This is a reply');
    });

    it('should handle optional createAsUser field', async () => {
      const commentData = {
        issueId: 'issue-123',
        body: 'Comment created as another user',
        createAsUser: 'user-456',
      };
      const mockComment = createMockComment({
        id: 'comment-123',
        ...commentData,
        __typename: 'Comment',
      });

      mockClient.createComment.mockResolvedValue(createMockPayload(true, mockComment));

      await service.create(commentData);

      expect(mockClient.createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          createAsUser: 'user-456',
        }),
      );
    });

    it('should handle optional displayIconUrl field', async () => {
      const commentData = {
        issueId: 'issue-123',
        body: 'Comment with custom icon',
        displayIconUrl: 'https://example.com/icon.png',
      };
      const mockComment = createMockComment({
        id: 'comment-123',
        ...commentData,
        __typename: 'Comment',
      });

      mockClient.createComment.mockResolvedValue(createMockPayload(true, mockComment));

      await service.create(commentData);

      expect(mockClient.createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          displayIconUrl: 'https://example.com/icon.png',
        }),
      );
    });

    it('should throw ValidationError when creation fails', async () => {
      const commentData = {
        issueId: 'issue-123',
        body: 'Test comment',
      };

      mockClient.createComment.mockResolvedValue(createMockPayload(false));

      await expect(service.create(commentData)).rejects.toThrow(ValidationError);
    });

    it('should validate required fields', async () => {
      await expect(
        service.create({
          issueId: '',
          body: 'Test comment',
        }),
      ).rejects.toThrow(ValidationError);

      await expect(
        service.create({
          issueId: 'issue-123',
          body: '',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should validate displayIconUrl format when provided', async () => {
      await expect(
        service.create({
          issueId: 'issue-123',
          body: 'Test comment',
          displayIconUrl: 'invalid-url',
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('get', () => {
    it('should return a comment when found', async () => {
      const mockComment = createMockComment({ id: 'comment-123' });
      mockClient.comment = jest.fn().mockResolvedValue(mockComment);

      const result = await service.get('comment-123');

      expect(mockClient.comment).toHaveBeenCalledWith({ id: 'comment-123' });
      expect(result).toEqual(mockComment);
    });

    it('should return null when comment not found', async () => {
      mockClient.comment = jest.fn().mockRejectedValue(new Error('Not found'));

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update comment body successfully', async () => {
      const mockComment = createMockComment({ id: 'comment-123' });
      const updateData = { body: 'Updated comment text' };
      const updatedComment = createMockComment({
        id: 'comment-123',
        body: 'Updated comment text',
        edited: true,
        __typename: 'Comment',
      });

      mockClient.comment = jest.fn().mockResolvedValue(mockComment);
      mockClient.updateComment = jest
        .fn()
        .mockResolvedValue(createMockPayload(true, updatedComment));

      const result = await service.update('comment-123', updateData);

      expect(mockClient.updateComment).toHaveBeenCalledWith(
        'comment-123',
        expect.objectContaining({
          body: 'Updated comment text',
        }),
      );
      expect(result.body).toBe('Updated comment text');
      expect(result.editedAt).toBeDefined();
    });

    it('should throw NotFoundError when comment does not exist', async () => {
      mockClient.comment = jest.fn().mockRejectedValue(new Error('Not found'));

      await expect(service.update('nonexistent', { body: 'Updated text' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ValidationError when update fails', async () => {
      const mockComment = createMockComment({ id: 'comment-123' });
      mockClient.comment = jest.fn().mockResolvedValue(mockComment);
      mockClient.updateComment = jest.fn().mockResolvedValue(createMockPayload(false));

      await expect(service.update('comment-123', { body: 'Updated text' })).rejects.toThrow(
        ValidationError,
      );
    });

    it('should validate update data', async () => {
      await expect(service.update('comment-123', { body: '' })).rejects.toThrow(ValidationError);
    });
  });

  describe('delete', () => {
    it('should delete a comment successfully', async () => {
      const mockComment = createMockComment({ id: 'comment-123' });
      mockClient.comment = jest.fn().mockResolvedValue(mockComment);
      mockClient.deleteComment = jest.fn().mockResolvedValue(createMockPayload(true));

      const result = await service.delete('comment-123');

      expect(mockClient.deleteComment).toHaveBeenCalledWith('comment-123');
      expect(result).toBe(true);
    });

    it('should throw NotFoundError when comment does not exist', async () => {
      mockClient.comment = jest.fn().mockRejectedValue(new Error('Not found'));

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should return false when deletion fails', async () => {
      const mockComment = createMockComment({ id: 'comment-123' });
      mockClient.comment = jest.fn().mockResolvedValue(mockComment);
      mockClient.deleteComment = jest.fn().mockResolvedValue(createMockPayload(false));

      const result = await service.delete('comment-123');

      expect(result).toBe(false);
    });
  });

  describe('listByIssue', () => {
    it('should list comments for an issue', async () => {
      const mockComments = [
        createMockComment({ id: 'comment-1', body: 'First comment' }),
        createMockComment({ id: 'comment-2', body: 'Second comment' }),
      ];
      const mockConnection = createMockConnection(mockComments);

      mockClient.comments = jest.fn().mockResolvedValue(mockConnection);

      const result = await service.listByIssue('issue-123');

      expect(mockClient.comments).toHaveBeenCalledWith({
        filter: {
          issue: { id: { eq: 'issue-123' } },
        },
        first: 50,
      });
      expect(result.nodes).toEqual(mockComments);
    });

    it('should handle pagination parameters for issue comments', async () => {
      mockClient.comments = jest.fn().mockResolvedValue(createMockConnection([]));

      await service.listByIssue('issue-123', { first: 20, after: 'cursor-123' });

      expect(mockClient.comments).toHaveBeenCalledWith({
        filter: {
          issue: { id: { eq: 'issue-123' } },
        },
        first: 20,
        after: 'cursor-123',
      });
    });
  });

  describe('listByUser', () => {
    it('should list comments by a user', async () => {
      const mockComments = [
        createMockComment({ id: 'comment-1', body: 'User comment 1' }),
        createMockComment({ id: 'comment-2', body: 'User comment 2' }),
      ];
      const mockConnection = createMockConnection(mockComments);

      mockClient.comments = jest.fn().mockResolvedValue(mockConnection);

      const result = await service.listByUser('user-123');

      expect(mockClient.comments).toHaveBeenCalledWith({
        filter: {
          user: { id: { eq: 'user-123' } },
        },
        first: 50,
      });
      expect(result.nodes).toEqual(mockComments);
    });

    it('should handle pagination parameters for user comments', async () => {
      mockClient.comments = jest.fn().mockResolvedValue(createMockConnection([]));

      await service.listByUser('user-123', { first: 30, after: 'cursor-456' });

      expect(mockClient.comments).toHaveBeenCalledWith({
        filter: {
          user: { id: { eq: 'user-123' } },
        },
        first: 30,
        after: 'cursor-456',
      });
    });
  });

  describe('createReaction', () => {
    it('should add valid emoji reaction to comment', async () => {
      const mockReaction = {
        id: 'reaction-123',
        emoji: '👍',
        __typename: 'Reaction',
      };

      mockClient.createReaction = jest
        .fn()
        .mockResolvedValue(createMockPayload(true, mockReaction));

      const result = await service.createReaction('comment-123', '👍');

      expect(mockClient.createReaction).toHaveBeenCalledWith({
        commentId: 'comment-123',
        emoji: '👍',
      });
      expect(result.emoji).toBe('👍');
    });

    it('should support all valid emoji reactions', async () => {
      const validEmojis = ['👍', '👎', '❤️', '🎉', '👀'];

      for (const emoji of validEmojis) {
        const mockReaction = {
          id: `reaction-${emoji}`,
          emoji,
          __typename: 'Reaction',
        };

        mockClient.createReaction = jest
          .fn()
          .mockResolvedValue(createMockPayload(true, mockReaction));

        const result = await service.createReaction('comment-123', emoji);
        expect(result.emoji).toBe(emoji);
      }
    });

    it('should throw ValidationError for invalid emoji reactions', async () => {
      const invalidEmojis = ['🚀', '💀', '🤔', 'invalid', ''];

      for (const emoji of invalidEmojis) {
        await expect(service.createReaction('comment-123', emoji)).rejects.toThrow(ValidationError);
      }
    });

    it('should throw ValidationError when reaction creation fails', async () => {
      mockClient.createReaction = jest.fn().mockResolvedValue(createMockPayload(false));

      await expect(service.createReaction('comment-123', '👍')).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteReaction', () => {
    it('should delete a reaction successfully', async () => {
      mockClient.deleteReaction = jest.fn().mockResolvedValue(createMockPayload(true));

      const result = await service.deleteReaction('reaction-123');

      expect(mockClient.deleteReaction).toHaveBeenCalledWith('reaction-123');
      expect(result).toBe(true);
    });

    it('should return false when reaction deletion fails', async () => {
      mockClient.deleteReaction = jest.fn().mockResolvedValue(createMockPayload(false));

      const result = await service.deleteReaction('reaction-123');

      expect(result).toBe(false);
    });

    it('should handle non-existent reaction gracefully', async () => {
      mockClient.deleteReaction = jest.fn().mockRejectedValue(new Error('Reaction not found'));

      const result = await service.deleteReaction('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getReplies', () => {
    it('should get replies to a comment', async () => {
      const mockReplies = [
        createMockComment({ id: 'reply-1', parentId: 'comment-123' }),
        createMockComment({ id: 'reply-2', parentId: 'comment-123' }),
      ];
      const mockConnection = createMockConnection(mockReplies);

      mockClient.comments = jest.fn().mockResolvedValue(mockConnection);

      const result = await service.getReplies('comment-123');

      expect(mockClient.comments).toHaveBeenCalledWith({
        filter: {
          parent: { id: { eq: 'comment-123' } },
        },
        first: 50,
      });
      expect(result.nodes).toEqual(mockReplies);
    });

    it('should handle pagination for replies', async () => {
      mockClient.comments = jest.fn().mockResolvedValue(createMockConnection([]));

      await service.getReplies('comment-123', { first: 25, after: 'cursor-789' });

      expect(mockClient.comments).toHaveBeenCalledWith({
        filter: {
          parent: { id: { eq: 'comment-123' } },
        },
        first: 25,
        after: 'cursor-789',
      });
    });
  });

  describe('getParent', () => {
    it('should return parent comment when it exists', async () => {
      const parentComment = createMockComment({ id: 'comment-parent' });
      const childComment = createMockComment({
        id: 'comment-child',
        parentId: 'comment-parent',
      });
      // Override the parent getter to return the parent comment
      Object.defineProperty(childComment, 'parent', {
        get: jest.fn().mockResolvedValue(parentComment),
      });

      mockClient.comment = jest.fn().mockResolvedValue(childComment);

      const result = await service.getParent('comment-child');

      expect(mockClient.comment).toHaveBeenCalledWith({ id: 'comment-child' });
      expect(result).toEqual(parentComment);
    });

    it('should return null when comment has no parent', async () => {
      const topLevelComment = createMockComment({
        id: 'comment-123',
      });
      // Override the parent getter to return null (no parent)
      Object.defineProperty(topLevelComment, 'parent', {
        get: jest.fn().mockResolvedValue(null),
      });

      mockClient.comment = jest.fn().mockResolvedValue(topLevelComment);

      const result = await service.getParent('comment-123');

      expect(mockClient.comment).toHaveBeenCalledWith({ id: 'comment-123' });
      expect(result).toBeNull();
    });

    it('should return null when comment does not exist', async () => {
      mockClient.comment = jest.fn().mockRejectedValue(new Error('Not found'));

      const result = await service.getParent('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when parent comment does not exist', async () => {
      const childComment = createMockComment({
        id: 'comment-child',
        parentId: 'nonexistent-parent',
      });
      // Override the parent getter to throw an error
      Object.defineProperty(childComment, 'parent', {
        get: jest.fn().mockRejectedValue(new Error('Parent not found')),
      });

      mockClient.comment = jest.fn().mockResolvedValue(childComment);

      const result = await service.getParent('comment-child');

      expect(result).toBeNull();
    });
  });

  describe('parseMentions', () => {
    it('should extract user mentions from comment body', () => {
      const body = 'Hey @john, can you review this? Also @jane needs to see this.';
      const mentions = service.parseMentions(body);

      expect(mentions.users).toEqual(['john', 'jane']);
      expect(mentions.issues).toEqual([]);
    });

    it('should extract issue mentions from comment body', () => {
      const body = 'This relates to #ENG-123 and fixes #PROD-456.';
      const mentions = service.parseMentions(body);

      expect(mentions.users).toEqual([]);
      expect(mentions.issues).toEqual(['ENG-123', 'PROD-456']);
    });

    it('should extract both user and issue mentions', () => {
      const body = 'Hey @alice, this closes #ENG-789 as discussed with @bob.';
      const mentions = service.parseMentions(body);

      expect(mentions.users).toEqual(['alice', 'bob']);
      expect(mentions.issues).toEqual(['ENG-789']);
    });

    it('should handle empty or no mentions', () => {
      expect(service.parseMentions('Just a regular comment')).toEqual({
        users: [],
        issues: [],
      });

      expect(service.parseMentions('')).toEqual({
        users: [],
        issues: [],
      });
    });

    it('should deduplicate repeated mentions', () => {
      const body = 'Hey @john, @john can you help @john with #ENG-123 and #ENG-123?';
      const mentions = service.parseMentions(body);

      expect(mentions.users).toEqual(['john']);
      expect(mentions.issues).toEqual(['ENG-123']);
    });

    it('should handle mentions in markdown contexts', () => {
      const body = "See [@alice's comment](link) and issue [#ENG-456](link).";
      const mentions = service.parseMentions(body);

      expect(mentions.users).toEqual(['alice']);
      expect(mentions.issues).toEqual(['ENG-456']);
    });
  });

  describe('formatMarkdown', () => {
    it('should preserve markdown formatting', () => {
      const markdown = '**Bold** and *italic* with [link](http://example.com)';
      const formatted = service.formatMarkdown(markdown);

      expect(formatted).toBe(markdown);
    });

    it('should handle code blocks', () => {
      const markdown = 'Here is some code:\n```typescript\nconst x = 1;\n```';
      const formatted = service.formatMarkdown(markdown);

      expect(formatted).toContain('```typescript');
      expect(formatted).toContain('const x = 1;');
    });

    it('should handle inline code', () => {
      const markdown = 'Use `console.log()` to debug.';
      const formatted = service.formatMarkdown(markdown);

      expect(formatted).toBe(markdown);
    });

    it('should handle lists', () => {
      const markdown = '- Item 1\n- Item 2\n  - Nested item';
      const formatted = service.formatMarkdown(markdown);

      expect(formatted).toBe(markdown);
    });

    it('should handle empty or whitespace-only content', () => {
      expect(service.formatMarkdown('')).toBe('');
      expect(service.formatMarkdown('   ')).toBe('   ');
    });
  });
});
