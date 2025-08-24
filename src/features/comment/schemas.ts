import { z } from 'zod';
import { PaginationSchema } from '@atoms/types/common';

// Valid emoji reactions for comments
export const VALID_EMOJI_REACTIONS = ['👍', '👎', '❤️', '🎉', '👀'] as const;

export const CommentCreateSchema = z.object({
  issueId: z.string().min(1, 'Issue ID is required'),
  body: z.string().min(1, 'Comment body is required'),
  parentId: z.string().optional(), // For threaded comments
  createAsUser: z.string().optional(), // For OAuth apps
  displayIconUrl: z.string().url('Invalid URL format').optional(),
});

export const CommentUpdateSchema = z.object({
  body: z.string().min(1, 'Comment body is required'),
});

export const CommentFilterSchema = z.object({
  issueId: z.string().optional(),
  userId: z.string().optional(),
  parentId: z.string().optional(),
});

export const ReactionCreateSchema = z.object({
  commentId: z.string().min(1, 'Comment ID is required'),
  emoji: z.enum(VALID_EMOJI_REACTIONS, {
    message: `Invalid emoji. Must be one of: ${VALID_EMOJI_REACTIONS.join(', ')}`,
  }),
});

// Type definitions
export type CommentCreate = z.infer<typeof CommentCreateSchema>;
export type CommentUpdate = z.infer<typeof CommentUpdateSchema>;
export type CommentFilter = z.infer<typeof CommentFilterSchema>;
export type ReactionCreate = z.infer<typeof ReactionCreateSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;

// Mention parsing result
export interface MentionParseResult {
  users: string[];
  issues: string[];
}
