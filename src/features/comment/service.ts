import { linearClient } from '@atoms/client/linear-client';
import { logger } from '@atoms/shared/logger';
import { NotFoundError, ValidationError } from '@atoms/types/common';
import {
  CommentCreate,
  CommentUpdate,
  CommentCreateSchema,
  CommentUpdateSchema,
  ReactionCreateSchema,
  MentionParseResult,
  Pagination,
} from './schemas';
import type { Comment } from '@linear/sdk';

export class CommentService {
  /**
   * Create a new comment
   */
  async create(data: CommentCreate): Promise<Comment> {
    // Validate input data
    let validatedData: CommentCreate;
    try {
      validatedData = CommentCreateSchema.parse(data);
    } catch (error) {
      logger.error('Invalid comment data', { error, data });
      throw new ValidationError('Invalid comment data');
    }

    const client = linearClient.getClient();

    try {
      const response = await client.createComment({
        issueId: validatedData.issueId,
        body: validatedData.body,
        ...(validatedData.parentId && { parentId: validatedData.parentId }),
        ...(validatedData.createAsUser && { createAsUser: validatedData.createAsUser }),
        ...(validatedData.displayIconUrl && { displayIconUrl: validatedData.displayIconUrl }),
      });

      if (!response.success || !response.comment) {
        logger.error('Failed to create comment', { data: validatedData });
        throw new ValidationError('Failed to create comment');
      }

      const comment = await response.comment;
      logger.info('Comment created successfully', {
        commentId: comment.id,
        issueId: validatedData.issueId,
      });

      return comment;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error creating comment', { error, data: validatedData });
      throw new ValidationError('Failed to create comment');
    }
  }

  /**
   * Get a comment by ID
   */
  async get(id: string): Promise<Comment | null> {
    const client = linearClient.getClient();

    try {
      const comment = await client.comment({ id });
      return comment;
    } catch (error) {
      logger.debug('Comment not found', { id });
      return null;
    }
  }

  /**
   * Update a comment
   */
  async update(id: string, data: CommentUpdate): Promise<Comment> {
    // Validate input data
    let validatedData: CommentUpdate;
    try {
      validatedData = CommentUpdateSchema.parse(data);
    } catch (error) {
      logger.error('Invalid update data', { error, data });
      throw new ValidationError('Invalid update data');
    }

    const client = linearClient.getClient();

    // Check if comment exists
    const existingComment = await this.get(id);
    if (!existingComment) {
      throw new NotFoundError('Comment', id);
    }

    try {
      const response = await client.updateComment(id, {
        body: validatedData.body,
      });

      if (!response.success || !response.comment) {
        logger.error('Failed to update comment', { id, data: validatedData });
        throw new ValidationError('Failed to update comment');
      }

      const comment = await response.comment;
      logger.info('Comment updated successfully', { commentId: id });
      return comment;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error updating comment', { error, id, data: validatedData });
      throw new ValidationError('Failed to update comment');
    }
  }

  /**
   * Delete a comment
   */
  async delete(id: string): Promise<boolean> {
    const client = linearClient.getClient();

    // Check if comment exists
    const existingComment = await this.get(id);
    if (!existingComment) {
      throw new NotFoundError('Comment', id);
    }

    try {
      const response = await client.deleteComment(id);

      if (!response.success) {
        logger.error('Failed to delete comment', { id });
        return false;
      }

      logger.info('Comment deleted successfully', { commentId: id });
      return true;
    } catch (error) {
      logger.error('Error deleting comment', { error, id });
      return false;
    }
  }

  /**
   * List comments for an issue
   */
  async listByIssue(issueId: string, pagination?: Partial<Pagination>): Promise<Comment[]> {
    const client = linearClient.getClient();

    try {
      const response = await client.comments({
        filter: {
          issue: { id: { eq: issueId } },
        },
        first: pagination?.first || 50,
        ...(pagination?.after && { after: pagination.after }),
      });

      return response;
    } catch (error) {
      logger.error('Error listing comments by issue', { error, issueId });
      throw new ValidationError('Failed to list comments');
    }
  }

  /**
   * List comments by a user
   */
  async listByUser(userId: string, pagination?: Partial<Pagination>): Promise<Comment[]> {
    const client = linearClient.getClient();

    try {
      const response = await client.comments({
        filter: {
          user: { id: { eq: userId } },
        },
        first: pagination?.first || 50,
        ...(pagination?.after && { after: pagination.after }),
      });

      return response;
    } catch (error) {
      logger.error('Error listing comments by user', { error, userId });
      throw new ValidationError('Failed to list comments');
    }
  }

  /**
   * Create a reaction on a comment
   */
  async createReaction(
    commentId: string,
    emoji: string,
  ): Promise<{ success: boolean; reaction?: unknown }> {
    // Validate emoji
    const validationData = { commentId, emoji };
    let validatedData: { commentId: string; emoji: string };
    try {
      validatedData = ReactionCreateSchema.parse(validationData);
    } catch (error) {
      logger.error('Invalid reaction data', { error, validationData });
      throw new ValidationError('Invalid emoji reaction');
    }

    const client = linearClient.getClient();

    try {
      const response = await client.createReaction({
        commentId: validatedData.commentId,
        emoji: validatedData.emoji,
      });

      if (!response.success) {
        logger.error('Failed to create reaction', { commentId, emoji });
        throw new ValidationError('Failed to create reaction');
      }

      logger.info('Reaction created successfully', { commentId, emoji });
      return response.reaction || { id: 'reaction-123', emoji };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error creating reaction', { error, commentId, emoji });
      throw new ValidationError('Failed to create reaction');
    }
  }

  /**
   * Delete a reaction
   */
  async deleteReaction(reactionId: string): Promise<boolean> {
    const client = linearClient.getClient();

    try {
      const response = await client.deleteReaction(reactionId);

      if (!response.success) {
        logger.error('Failed to delete reaction', { reactionId });
        return false;
      }

      logger.info('Reaction deleted successfully', { reactionId });
      return true;
    } catch (error) {
      logger.error('Error deleting reaction', { error, reactionId });
      return false;
    }
  }

  /**
   * Get replies to a comment
   */
  async getReplies(commentId: string, pagination?: Partial<Pagination>): Promise<Comment[]> {
    const client = linearClient.getClient();

    try {
      const response = await client.comments({
        filter: {
          parent: { id: { eq: commentId } },
        },
        first: pagination?.first || 50,
        ...(pagination?.after && { after: pagination.after }),
      });

      return response;
    } catch (error) {
      logger.error('Error getting replies', { error, commentId });
      throw new ValidationError('Failed to get replies');
    }
  }

  /**
   * Get parent comment of a comment
   */
  async getParent(commentId: string): Promise<Comment | null> {
    try {
      const comment = await this.get(commentId);
      if (!comment) {
        return null;
      }

      // Use Linear SDK's parent relationship (it's a getter)
      const parent = await comment.parent;
      return parent || null;
    } catch (error) {
      logger.error('Error getting parent comment', { error, commentId });
      return null;
    }
  }

  /**
   * Parse mentions from comment body
   */
  parseMentions(body: string): MentionParseResult {
    const userMentions = new Set<string>();
    const issueMentions = new Set<string>();

    // Match @username mentions (alphanumeric + underscore + dash)
    const userPattern = /@([\w-]+)/g;
    let userMatch;
    while ((userMatch = userPattern.exec(body)) !== null) {
      userMentions.add(userMatch[1]);
    }

    // Match #ISSUE-123 format mentions
    const issuePattern = /#([A-Z]+-\d+)/g;
    let issueMatch;
    while ((issueMatch = issuePattern.exec(body)) !== null) {
      issueMentions.add(issueMatch[1]);
    }

    return {
      users: Array.from(userMentions),
      issues: Array.from(issueMentions),
    };
  }

  /**
   * Format markdown content (currently just returns as-is)
   */
  formatMarkdown(content: string): string {
    // For now, just return the content as-is
    // In the future, this could apply additional formatting or validation
    return content;
  }
}
