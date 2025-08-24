# LIN-002: Implement CommentService

**Status**: `done` ✅  
**Priority**: `high`  
**Estimate**: S (2 points)  
**Labels**: `feature`, `service`, `collaboration`  
**Team**: Engineering  

## Description

Implement CommentService for managing issue discussions and team collaboration through comments.

**TDD Approach**: Write comprehensive tests first, then implement the service to satisfy test requirements.

## Test-First Development

### Step 1: Write Tests First

**File: `src/__tests__/features/comment.service.test.ts`**

```typescript
import { CommentService } from '@features/comment/service';
import { createMockLinearClient } from '../utils/mocks';
import { ValidationError } from '@atoms/types/common';

describe('CommentService', () => {
  let service: CommentService;
  let mockClient: any;
  
  beforeEach(() => {
    mockClient = createMockLinearClient();
    service = new CommentService();
  });
  
  describe('create', () => {
    it('should create a comment on an issue', async () => {
      const commentData = {
        issueId: 'issue-123',
        body: 'This is a test comment',
      };
      
      mockClient.createComment.mockResolvedValue({
        success: true,
        comment: { id: 'comment-123', ...commentData },
      });
      
      const comment = await service.create(commentData);
      
      expect(comment.id).toBe('comment-123');
      expect(comment.body).toBe('This is a test comment');
    });
    
    it('should support markdown formatting', async () => {
      const commentData = {
        issueId: 'issue-123',
        body: '**Bold** and *italic* with [link](http://example.com)',
      };
      
      mockClient.createComment.mockResolvedValue({
        success: true,
        comment: { id: 'comment-123', ...commentData },
      });
      
      const comment = await service.create(commentData);
      
      expect(comment.body).toContain('**Bold**');
      expect(comment.body).toContain('[link]');
    });
    
    it('should create threaded reply when parentId provided', async () => {
      const replyData = {
        issueId: 'issue-123',
        body: 'This is a reply',
        parentId: 'comment-parent',
      };
      
      mockClient.createComment.mockResolvedValue({
        success: true,
        comment: { id: 'comment-reply', ...replyData },
      });
      
      const reply = await service.create(replyData);
      
      expect(reply.parentId).toBe('comment-parent');
    });
  });
  
  describe('createReaction', () => {
    it('should add emoji reaction to comment', async () => {
      mockClient.createReaction.mockResolvedValue({
        success: true,
        reaction: { id: 'reaction-123', emoji: '👍' },
      });
      
      const reaction = await service.createReaction('comment-123', '👍');
      
      expect(reaction.emoji).toBe('👍');
    });
    
    it('should only allow valid emoji reactions', async () => {
      await expect(service.createReaction('comment-123', 'invalid'))
        .rejects.toThrow(ValidationError);
    });
  });
  
  describe('update', () => {
    it('should update comment body', async () => {
      mockClient.updateComment.mockResolvedValue({
        success: true,
        comment: { id: 'comment-123', body: 'Updated text', edited: true },
      });
      
      const updated = await service.update('comment-123', { body: 'Updated text' });
      
      expect(updated.body).toBe('Updated text');
      expect(updated.edited).toBe(true);
    });
  });
});
```

### Step 2: Implementation Details

### File: `src/features/comment/service.ts`

```typescript
export class CommentService {
  // Core operations
  async create(data: CommentCreate): Promise<Comment>
  async update(id: string, data: CommentUpdate): Promise<Comment>
  async delete(id: string): Promise<boolean>
  async get(id: string): Promise<Comment | null>
  
  // Listing and filtering
  async listByIssue(issueId: string, pagination?: Pagination): Promise<CommentConnection>
  async listByUser(userId: string, pagination?: Pagination): Promise<CommentConnection>
  
  // Reactions
  async createReaction(commentId: string, emoji: string): Promise<Reaction>
  async deleteReaction(reactionId: string): Promise<boolean>
  
  // Threading
  async getReplies(commentId: string): Promise<CommentConnection>
  async getParent(commentId: string): Promise<Comment | null>
}
```

### Schemas

```typescript
export const CommentCreateSchema = z.object({
  issueId: z.string(),
  body: z.string().min(1),
  parentId: z.string().optional(), // For threaded comments
  createAsUser: z.string().optional(), // For OAuth apps
  displayIconUrl: z.string().url().optional(),
});

export const CommentUpdateSchema = z.object({
  body: z.string().min(1),
});
```

## Acceptance Criteria

- [ ] **Write all tests first** following TDD principles
- [ ] Tests cover happy path and edge cases
- [ ] Tests initially fail (Red phase)
- [ ] Implement minimum code to pass tests (Green phase)
- [ ] Refactor for clarity and performance (Refactor phase)
- [ ] Create, update, delete comments on issues
- [ ] Support markdown formatting in comments
- [ ] Comment threading with parent/child relationships
- [ ] Emoji reactions (👍, 👎, ❤️, 🎉, 👀)
- [ ] List comments by issue or user
- [ ] Unit tests with mocked Linear SDK
- [ ] Proper mention parsing (@user, #issue)
- [ ] Test coverage >80%

## Dependencies

- Linear SDK Comment model
- IssueService (for validation)
- UserService (for mention validation)

## Notes

- Comments support rich markdown including collapsible sections
- Mentions are created by including Linear URLs in markdown
- Comments can be edited but edit history is tracked
- Deleted comments show as [deleted] to maintain thread context