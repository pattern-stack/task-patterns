import type { Comment } from '@linear/sdk';
import type { CommentCreateInput, CommentUpdateInput } from '@linear/sdk/dist/_generated_documents';

/**
 * Comment transformer functions
 * Pure functions for transforming comment data between layers
 */
export const CommentTransformers = {
  /**
   * Transform Linear SDK Comment to API response
   * NOTE: Needs update for Linear SDK v28 - relations are now async
   */
  toResponse: async (comment: Comment) => {
    const [user, issue] = await Promise.all([
      comment.user,
      comment.issue,
    ]);

    return {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      editedAt: comment.editedAt,
      url: comment.url,
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      } : null,
      issue: issue ? {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
      } : null,
    };
  },

  /**
   * Transform create input to Linear SDK format
   */
  fromCreateInput: (input: {
    body: string;
    issueId: string;
  }): CommentCreateInput => ({
    body: input.body,
    issueId: input.issueId,
  }),

  /**
   * Transform update input to Linear SDK format
   */
  fromUpdateInput: (input: {
    body: string;
  }): CommentUpdateInput => ({
    body: input.body,
  }),

  /**
   * Transform to comment reference (minimal data for relationships)
   */
  toReference: async (comment: Comment) => {
    const user = await comment.user;
    return {
      id: comment.id,
      createdAt: comment.createdAt,
      userId: user?.id,
    };
  },

  /**
   * Transform for thread display
   */
  toThreadItem: async (comment: Comment) => {
    const user = await comment.user;
    return {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      edited: comment.editedAt !== null,
      user: {
        name: user?.name || 'Unknown',
        avatarUrl: user?.avatarUrl,
      },
    };
  },

  /**
   * Transform for activity feed
   */
  toActivityItem: async (comment: Comment) => {
    const [user, issue] = await Promise.all([
      comment.user,
      comment.issue,
    ]);
    return {
      type: 'comment' as const,
      id: comment.id,
      timestamp: comment.createdAt,
      user: user?.name || 'Unknown',
      action: 'commented',
      target: issue?.identifier,
      preview: comment.body.substring(0, 150),
    };
  },

  /**
   * Transform for notification
   */
  toNotification: async (comment: Comment, recipientId: string) => {
    const [user, issue] = await Promise.all([
      comment.user,
      comment.issue,
    ]);
    const assignee = issue ? await issue.assignee : undefined;
    return {
      type: 'comment' as const,
      commentId: comment.id,
      issueId: issue?.id,
      issueIdentifier: issue?.identifier,
      issueTitle: issue?.title,
      authorName: user?.name || 'Someone',
      preview: comment.body.substring(0, 100),
      createdAt: comment.createdAt,
      url: comment.url,
      isForUser: assignee?.id === recipientId,
    };
  },
} as const;