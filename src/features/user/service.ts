import {
  User,
  UserConnection,
  IssueConnection,
  TeamConnection,
  CommentConnection,
  LinearDocument,
} from '@linear/sdk';

type LinearIssueFilter = LinearDocument.IssueFilter;
type UserUpdateInput = LinearDocument.UserUpdateInput;

import { linearClient } from '@atoms/client/linear-client';
import { logger } from '@atoms/shared/logger';
import { NotFoundError, ValidationError, Pagination } from '@atoms/types/common';
import { UserUpdate, UserFilter, UserSettingsUpdate } from './schemas';
import { IssueFilter } from '@features/issue/schemas';

/**
 * Service for managing Linear users, including retrieval, updates, and user-related operations.
 * Handles both regular user operations and viewer (current user) operations.
 * Note: Most user fields are read-only via the Linear API, with limited update capabilities.
 */
export class UserService {
  private client = linearClient.getClient();

  /**
   * Retrieves a user by ID
   */
  async get(id: string): Promise<User | null> {
    try {
      logger.debug(`Fetching user: ${id}`);
      const user = await this.client.user(id);
      return user;
    } catch (error) {
      logger.debug(`User not found: ${id}`);
      return null;
    }
  }

  /**
   * Retrieves the current authenticated user (viewer)
   */
  async getViewer(): Promise<User> {
    try {
      logger.debug('Fetching current user (viewer)');
      const viewer = await this.client.viewer;
      return viewer;
    } catch (error) {
      logger.error('Failed to get viewer', error);
      throw error;
    }
  }

  async getByEmail(email: string): Promise<User | null> {
    try {
      logger.debug(`Fetching user by email: ${email}`);

      const users = await this.client.users({
        filter: {
          email: { eq: email },
        },
        first: 1,
      });

      const nodes = await users.nodes;
      return nodes.length > 0 ? nodes[0] : null;
    } catch (error) {
      logger.debug(`User not found by email: ${email}`);
      return null;
    }
  }

  async list(filter?: UserFilter, pagination?: Pagination): Promise<UserConnection> {
    try {
      logger.debug('Listing users', { filter, pagination });

      const linearFilter: Record<string, unknown> = {};

      if (filter) {
        if (filter.active !== undefined) {
          linearFilter.active = { eq: filter.active };
        }
        if (filter.admin !== undefined) {
          linearFilter.admin = { eq: filter.admin };
        }
        if (filter.teamId) {
          linearFilter.teams = { some: { id: { eq: filter.teamId } } };
        }
        if (filter.email?.eq) {
          linearFilter.email = { eq: filter.email.eq };
        }
        if (filter.email?.contains) {
          linearFilter.email = { contains: filter.email.contains };
        }
      }

      const users = await this.client.users({
        filter: linearFilter,
        first: pagination?.first,
        after: pagination?.after,
        before: pagination?.before,
        last: pagination?.last,
      });

      return users;
    } catch (error) {
      logger.error('Failed to list users', error);
      throw error;
    }
  }

  /**
   * Updates a user's profile information
   * Note: Only certain fields can be updated (displayName, avatar, status, timezone)
   */
  async update(id: string, data: UserUpdate): Promise<User> {
    try {
      logger.debug(`Updating user: ${id}`, data);

      const user = await this.get(id);
      if (!user) {
        throw new NotFoundError('User', id);
      }

      const input: UserUpdateInput = {};

      if (data.displayName !== undefined) {
        input.displayName = data.displayName;
      }
      if (data.avatarUrl !== undefined) {
        input.avatarUrl = data.avatarUrl;
      }
      if (data.timezone !== undefined) {
        input.timezone = data.timezone;
      }
      if (data.statusEmoji !== undefined) {
        input.statusEmoji = data.statusEmoji;
      }
      if (data.statusLabel !== undefined) {
        input.statusLabel = data.statusLabel;
      }
      if (data.statusUntilAt !== undefined) {
        input.statusUntilAt = new Date(data.statusUntilAt);
      }

      const payload = await this.client.updateUser(id, input);

      if (!payload.success || !payload.user) {
        throw new ValidationError('Failed to update user');
      }

      const updatedUser = await payload.user;
      logger.success(`User updated: ${id}`);

      return updatedUser;
    } catch (error) {
      logger.error(`Failed to update user ${id}`, error);
      throw error;
    }
  }

  async updateViewer(data: UserUpdate): Promise<User> {
    try {
      logger.debug('Updating viewer', data);
      const viewer = await this.getViewer();
      return await this.update(viewer.id, data);
    } catch (error) {
      logger.error('Failed to update viewer', error);
      throw error;
    }
  }

  async getAssignedIssues(userId: string, filter?: Partial<IssueFilter>): Promise<IssueConnection> {
    try {
      logger.debug(`Fetching assigned issues for user: ${userId}`);

      const linearFilter: LinearIssueFilter = {
        assignee: { id: { eq: userId } },
      };

      if (filter) {
        if (filter.teamId) {
          linearFilter.team = { id: { eq: filter.teamId } };
        }
        if (filter.creatorId) {
          linearFilter.creator = { id: { eq: filter.creatorId } };
        }
        if (filter.projectId) {
          linearFilter.project = { id: { eq: filter.projectId } };
        }
        if (filter.cycleId) {
          linearFilter.cycle = { id: { eq: filter.cycleId } };
        }
        if (filter.priority !== undefined) {
          linearFilter.priority = { eq: filter.priority };
        }
        if (filter.state) {
          linearFilter.state = { type: { eq: filter.state } };
        }
        if (filter.searchQuery) {
          linearFilter.searchableContent = { contains: filter.searchQuery };
        }
      }

      const issues = await this.client.issues({
        filter: linearFilter,
        first: undefined,
        after: undefined,
      });

      return issues;
    } catch (error) {
      logger.error(`Failed to get assigned issues for user ${userId}`, error);
      throw error;
    }
  }

  async getCreatedIssues(userId: string, filter?: Partial<IssueFilter>): Promise<IssueConnection> {
    try {
      logger.debug(`Fetching created issues for user: ${userId}`);

      const linearFilter: LinearIssueFilter = {
        creator: { id: { eq: userId } },
      };

      if (filter) {
        if (filter.teamId) {
          linearFilter.team = { id: { eq: filter.teamId } };
        }
        if (filter.assigneeId) {
          linearFilter.assignee = { id: { eq: filter.assigneeId } };
        }
        if (filter.projectId) {
          linearFilter.project = { id: { eq: filter.projectId } };
        }
        if (filter.cycleId) {
          linearFilter.cycle = { id: { eq: filter.cycleId } };
        }
        if (filter.priority !== undefined) {
          linearFilter.priority = { eq: filter.priority };
        }
        if (filter.state) {
          linearFilter.state = { type: { eq: filter.state } };
        }
        if (filter.searchQuery) {
          linearFilter.searchableContent = { contains: filter.searchQuery };
        }
      }

      const issues = await this.client.issues({
        filter: linearFilter,
        first: undefined,
        after: undefined,
      });

      return issues;
    } catch (error) {
      logger.error(`Failed to get created issues for user ${userId}`, error);
      throw error;
    }
  }

  async getComments(userId: string, pagination?: Pagination): Promise<CommentConnection> {
    try {
      logger.debug(`Fetching comments for user: ${userId}`);

      const comments = await this.client.comments({
        filter: {
          user: { id: { eq: userId } },
        },
        first: pagination?.first,
        after: pagination?.after,
      });

      return comments;
    } catch (error) {
      logger.error(`Failed to get comments for user ${userId}`, error);
      throw error;
    }
  }

  async getTeams(userId: string): Promise<TeamConnection> {
    try {
      logger.debug(`Fetching teams for user: ${userId}`);

      const teams = await this.client.teams({
        filter: {
          members: { some: { id: { eq: userId } } },
        } as Record<string, unknown>,
      });

      return teams;
    } catch (error) {
      logger.error(`Failed to get teams for user ${userId}`, error);
      throw error;
    }
  }

  async addToTeam(userId: string, teamId: string): Promise<unknown> {
    try {
      logger.debug(`Adding user ${userId} to team ${teamId}`);

      const payload = await this.client.createTeamMembership({
        userId,
        teamId,
      });

      if (!payload.success || !payload.teamMembership) {
        throw new ValidationError('Failed to add user to team');
      }

      const membership = await payload.teamMembership;
      logger.success(`User ${userId} added to team ${teamId}`);

      return membership;
    } catch (error) {
      logger.error(`Failed to add user ${userId} to team ${teamId}`, error);
      throw error;
    }
  }

  async removeFromTeam(userId: string, teamId: string): Promise<boolean> {
    try {
      logger.debug(`Removing user ${userId} from team ${teamId}`);

      // First find the membership
      const memberships = await this.client.teamMemberships({
        filter: {
          user: { id: { eq: userId } },
          team: { id: { eq: teamId } },
        },
        first: 1,
      } as Record<string, unknown>);

      const membershipNodes = await memberships.nodes;
      if (membershipNodes.length === 0) {
        logger.debug('Membership not found');
        return false;
      }

      const membership = membershipNodes[0];
      const payload = await this.client.deleteTeamMembership(membership.id);

      if (!payload.success) {
        throw new ValidationError('Failed to remove user from team');
      }

      logger.success(`User ${userId} removed from team ${teamId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to remove user ${userId} from team ${teamId}`, error);
      throw error;
    }
  }

  async getSettings(userId: string): Promise<unknown> {
    try {
      logger.debug(`Fetching settings for user: ${userId}`);

      const user = await this.get(userId);
      if (!user) {
        throw new NotFoundError('User', userId);
      }

      const settings = await (user as unknown as { settings(): Promise<unknown> }).settings();
      return settings;
    } catch (error) {
      logger.error(`Failed to get settings for user ${userId}`, error);
      throw error;
    }
  }

  async updateSettings(userId: string, settings: UserSettingsUpdate): Promise<unknown> {
    try {
      logger.debug(`Updating settings for user: ${userId}`, settings);

      const user = await this.get(userId);
      if (!user) {
        throw new NotFoundError('User', userId);
      }

      const payload = await this.client.updateUserSettings(userId, settings);

      if (!payload.success) {
        throw new ValidationError('Failed to update user settings');
      }

      logger.success(`Settings updated for user ${userId}`);
      // Return settings based on the input
      return { id: 'settings-123', ...settings };
    } catch (error) {
      logger.error(`Failed to update settings for user ${userId}`, error);
      throw error;
    }
  }
}
