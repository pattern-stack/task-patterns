import type { Comment, CommentCreateInput, CommentUpdateInput } from '@linear/sdk';

/**
 * Comment transformer functions
 * Pure functions for transforming comment data between layers
 */
export const CommentTransformers = {
  /**
   * Transform Linear SDK Comment to API response
   */
  toResponse: (comment: Comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    editedAt: comment.editedAt,
    url: comment.url,
    user: comment.user ? {
      id: comment.user.id,
      name: comment.user.name,
      email: comment.user.email,
      avatarUrl: comment.user.avatarUrl,
    } : null,
    issue: comment.issue ? {
      id: comment.issue.id,
      identifier: comment.issue.identifier,
      title: comment.issue.title,
    } : null,
  }),

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
  toReference: (comment: Comment) => ({
    id: comment.id,
    createdAt: comment.createdAt,
    userId: comment.user?.id,
  }),

  /**
   * Transform for thread display
   */
  toThreadItem: (comment: Comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    edited: comment.editedAt !== null,
    user: {
      name: comment.user?.name || 'Unknown',
      avatarUrl: comment.user?.avatarUrl,
    },
  }),

  /**
   * Transform for activity feed
   */
  toActivityItem: (comment: Comment) => ({
    type: 'comment' as const,
    id: comment.id,
    timestamp: comment.createdAt,
    user: comment.user?.name || 'Unknown',
    action: 'commented',
    target: comment.issue?.identifier,
    preview: comment.body.substring(0, 150),
  }),

  /**
   * Transform for notification
   */
  toNotification: (comment: Comment, recipientId: string) => ({
    type: 'comment' as const,
    commentId: comment.id,
    issueId: comment.issue?.id,
    issueIdentifier: comment.issue?.identifier,
    issueTitle: comment.issue?.title,
    authorName: comment.user?.name || 'Someone',
    preview: comment.body.substring(0, 100),
    createdAt: comment.createdAt,
    url: comment.url,
    isForUser: comment.issue?.assignee?.id === recipientId,
  }),
} as const;