import type { User } from '@linear/sdk';

/**
 * User transformer functions
 * Pure functions for transforming user data between layers
 */
export const UserTransformers = {
  /**
   * Transform Linear SDK User to API response
   */
  toResponse: (user: User) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    active: user.active,
    admin: user.admin,
    createdAt: user.createdAt,
    isMe: user.isMe,
    url: user.url,
  }),

  /**
   * Transform to user reference (minimal data for relationships)
   */
  toReference: (user: User) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  }),

  /**
   * Transform for list display
   */
  toListItem: (user: User) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.admin ? 'Admin' : 'Member',
    status: user.active ? 'Active' : 'Inactive',
  }),

  /**
   * Transform for team member display
   */
  toTeamMember: (user: User, teamRole?: string) => ({
    ...UserTransformers.toReference(user),
    role: teamRole || (user.admin ? 'Admin' : 'Member'),
    active: user.active,
  }),

  /**
   * Transform for assignee dropdown
   */
  toAssigneeOption: (user: User) => ({
    value: user.id,
    label: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    active: user.active,
  }),
} as const;
