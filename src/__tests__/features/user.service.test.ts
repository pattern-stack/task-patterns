import { UserService } from '@features/user/service';
import { linearClient } from '@atoms/client/linear-client';
import { NotFoundError, ValidationError } from '@atoms/types/common';
import { TestFactory } from '../fixtures/factories';
import {
  createMockUser,
  createMockUserConnection,
  createMockIssueConnection,
  createMockTeamConnection,
  createMockPayload,
  createMockLinearClient,
  createMockConnection,
  createMockIssue,
  createMockTeam,
  createMockComment,
} from '../utils/mocks';

jest.mock('@atoms/client/linear-client');

describe('UserService', () => {
  let service: UserService;
  let mockClient: ReturnType<typeof createMockLinearClient>;

  beforeEach(() => {
    TestFactory.reset();
    mockClient = createMockLinearClient();
    (linearClient.getClient as jest.Mock).mockReturnValue(mockClient);
    service = new UserService(mockClient as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return a user when found', async () => {
      const mockUser = createMockUser({ id: 'user-123' });
      mockClient.user = jest.fn().mockResolvedValue(mockUser);

      const result = await service.get('user-123');

      expect(mockClient.user).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockClient.user = jest.fn().mockRejectedValue(new Error('Not found'));

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getViewer', () => {
    it('should return the current authenticated user', async () => {
      const mockViewer = createMockUser({
        id: 'viewer-123',
        name: 'Current User',
        email: 'viewer@example.com',
      });
      mockClient.viewer = Promise.resolve(mockViewer);

      const result = await service.getViewer();

      expect(result).toEqual(mockViewer);
    });

    it('should handle viewer request errors', async () => {
      mockClient.viewer = Promise.reject(new Error('Authentication failed'));

      await expect(service.getViewer()).rejects.toThrow('Authentication failed');
    });
  });

  describe('getByEmail', () => {
    it('should return user when found by email', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      mockClient.users = jest.fn().mockResolvedValue(createMockUserConnection([mockUser]));

      const result = await service.getByEmail('test@example.com');

      expect(mockClient.users).toHaveBeenCalledWith({
        filter: {
          email: { eq: 'test@example.com' },
        },
        first: 1,
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when no user matches email', async () => {
      mockClient.users = jest.fn().mockResolvedValue(createMockUserConnection([]));

      const result = await service.getByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list users with no filters', async () => {
      const mockUsers = [createMockUser({ id: 'user-1' }), createMockUser({ id: 'user-2' })];
      mockClient.users = jest.fn().mockResolvedValue(createMockUserConnection(mockUsers));

      const result = await service.list();

      expect(mockClient.users).toHaveBeenCalledWith({
        filter: {},
        first: undefined,
        after: undefined,
        before: undefined,
        last: undefined,
      });
      expect(result.nodes).toEqual(mockUsers);
    });

    it('should list users with filters', async () => {
      const mockUsers = [createMockUser({ active: true, admin: false })];
      mockClient.users = jest.fn().mockResolvedValue(createMockUserConnection(mockUsers));

      const filter = {
        active: true,
        admin: false,
        teamId: 'team-123',
        email: { eq: 'admin@example.com' },
      };

      const result = await service.list(filter);

      expect(mockClient.users).toHaveBeenCalledWith({
        filter: {
          active: { eq: true },
          admin: { eq: false },
          teams: { some: { id: { eq: 'team-123' } } },
          email: { eq: 'admin@example.com' },
        },
        first: undefined,
        after: undefined,
        before: undefined,
        last: undefined,
      });
      expect(result.nodes).toEqual(mockUsers);
    });

    it('should handle pagination parameters', async () => {
      mockClient.users = jest.fn().mockResolvedValue(createMockUserConnection([]));

      await service.list(undefined, { first: 50, after: 'cursor-123' });

      expect(mockClient.users).toHaveBeenCalledWith({
        filter: {},
        first: 50,
        after: 'cursor-123',
        before: undefined,
        last: undefined,
      });
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const mockUser = createMockUser({ id: 'user-123' });
      const updateData = {
        displayName: 'Updated Name',
        statusEmoji: '🚀',
        statusLabel: 'Busy',
      };

      mockClient.user = jest.fn().mockResolvedValue(mockUser);
      mockClient.updateUser = jest
        .fn()
        .mockResolvedValue(
          createMockPayload(true, { ...mockUser, ...updateData, __typename: 'User' }),
        );

      const result = await service.update('user-123', updateData);

      expect(mockClient.user).toHaveBeenCalledWith('user-123');
      expect(mockClient.updateUser).toHaveBeenCalledWith('user-123', {
        displayName: updateData.displayName,
        statusEmoji: updateData.statusEmoji,
        statusLabel: updateData.statusLabel,
      });
      expect(result.displayName).toBe(updateData.displayName);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockClient.user = jest.fn().mockRejectedValue(new Error('Not found'));

      await expect(service.update('nonexistent', { displayName: 'New Name' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ValidationError when update fails', async () => {
      const mockUser = createMockUser();
      mockClient.user = jest.fn().mockResolvedValue(mockUser);
      mockClient.updateUser = jest.fn().mockResolvedValue(createMockPayload(false));

      await expect(service.update('user-123', { displayName: 'New Name' })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('updateViewer', () => {
    it('should update the current user successfully', async () => {
      const mockViewer = createMockUser({ id: 'viewer-123' });
      const updateData = {
        displayName: 'Updated Viewer',
        timezone: 'America/New_York',
      };

      mockClient.viewer = Promise.resolve(mockViewer);
      mockClient.updateUser = jest
        .fn()
        .mockResolvedValue(
          createMockPayload(true, { ...mockViewer, ...updateData, __typename: 'User' }),
        );

      const result = await service.updateViewer(updateData);

      expect(mockClient.updateUser).toHaveBeenCalledWith('viewer-123', {
        displayName: updateData.displayName,
        timezone: updateData.timezone,
      });
      expect(result.displayName).toBe(updateData.displayName);
    });

    it('should throw ValidationError when viewer update fails', async () => {
      const mockViewer = createMockUser({ id: 'viewer-123' });
      mockClient.viewer = Promise.resolve(mockViewer);
      mockClient.updateUser = jest.fn().mockResolvedValue(createMockPayload(false));

      await expect(service.updateViewer({ displayName: 'New Name' })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('getAssignedIssues', () => {
    it('should return issues assigned to user', async () => {
      const mockIssues = [
        createMockIssue({ assigneeId: 'user-123' }),
        createMockIssue({ assigneeId: 'user-123' }),
      ];
      mockClient.issues = jest.fn().mockResolvedValue(createMockIssueConnection(mockIssues));

      const result = await service.getAssignedIssues('user-123');

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          assignee: { id: { eq: 'user-123' } },
        },
        first: undefined,
        after: undefined,
      });
      expect(result.nodes).toEqual(mockIssues);
    });

    it('should apply additional filters', async () => {
      mockClient.issues = jest.fn().mockResolvedValue(createMockIssueConnection([]));

      const filter = {
        state: 'started' as const,
        priority: 3,
        includeArchived: false,
      };

      await service.getAssignedIssues('user-123', filter);

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          assignee: { id: { eq: 'user-123' } },
          state: { type: { eq: 'started' } },
          priority: { eq: 3 },
        },
        first: undefined,
        after: undefined,
      });
    });
  });

  describe('getCreatedIssues', () => {
    it('should return issues created by user', async () => {
      const mockIssues = [createMockIssue({ creatorId: 'user-123' })];
      mockClient.issues = jest.fn().mockResolvedValue(createMockIssueConnection(mockIssues));

      const result = await service.getCreatedIssues('user-123');

      expect(mockClient.issues).toHaveBeenCalledWith({
        filter: {
          creator: { id: { eq: 'user-123' } },
        },
        first: undefined,
        after: undefined,
      });
      expect(result.nodes).toEqual(mockIssues);
    });
  });

  describe('getComments', () => {
    it('should return comments by user', async () => {
      const mockComments = [
        createMockComment({ userId: 'user-123' }),
        createMockComment({ userId: 'user-123' }),
      ];
      mockClient.comments = jest.fn().mockResolvedValue(createMockConnection(mockComments));

      const result = await service.getComments('user-123');

      expect(mockClient.comments).toHaveBeenCalledWith({
        filter: {
          user: { id: { eq: 'user-123' } },
        },
        first: undefined,
        after: undefined,
      });
      expect(result.nodes).toEqual(mockComments);
    });

    it('should handle pagination', async () => {
      mockClient.comments = jest.fn().mockResolvedValue(createMockConnection([]));

      await service.getComments('user-123', { first: 25, after: 'cursor-123' });

      expect(mockClient.comments).toHaveBeenCalledWith({
        filter: {
          user: { id: { eq: 'user-123' } },
        },
        first: 25,
        after: 'cursor-123',
      });
    });
  });

  describe('getTeams', () => {
    it('should return teams for user', async () => {
      const mockTeams = [createMockTeam({ id: 'team-1' }), createMockTeam({ id: 'team-2' })];
      mockClient.teams = jest.fn().mockResolvedValue(createMockTeamConnection(mockTeams));

      const result = await service.getTeams('user-123');

      expect(mockClient.teams).toHaveBeenCalledWith({
        filter: {
          members: { some: { id: { eq: 'user-123' } } },
        },
      });
      expect(result.nodes).toEqual(mockTeams);
    });
  });

  describe('addToTeam', () => {
    it('should add user to team successfully', async () => {
      const mockMembership = {
        id: 'membership-123',
        user: createMockUser({ id: 'user-123' }),
        team: createMockTeam({ id: 'team-123' }),
        __typename: 'TeamMembership',
      };

      mockClient.createTeamMembership = jest
        .fn()
        .mockResolvedValue(createMockPayload(true, mockMembership));

      const result = await service.addToTeam('user-123', 'team-123');

      expect(mockClient.createTeamMembership).toHaveBeenCalledWith({
        userId: 'user-123',
        teamId: 'team-123',
      });
      expect(result).toEqual(mockMembership);
    });

    it('should throw ValidationError when adding to team fails', async () => {
      mockClient.createTeamMembership = jest.fn().mockResolvedValue(createMockPayload(false));

      await expect(service.addToTeam('user-123', 'team-123')).rejects.toThrow(ValidationError);
    });
  });

  describe('removeFromTeam', () => {
    it('should remove user from team successfully', async () => {
      // First find the membership
      const mockMembership = {
        id: 'membership-123',
        user: jest.fn().mockResolvedValue(createMockUser({ id: 'user-123' })),
        team: jest.fn().mockResolvedValue(createMockTeam({ id: 'team-123' })),
      };

      mockClient.teamMemberships = jest
        .fn()
        .mockResolvedValue(createMockConnection([mockMembership]));
      mockClient.deleteTeamMembership = jest.fn().mockResolvedValue(createMockPayload(true));

      const result = await service.removeFromTeam('user-123', 'team-123');

      expect(mockClient.teamMemberships).toHaveBeenCalledWith({
        filter: {
          user: { id: { eq: 'user-123' } },
          team: { id: { eq: 'team-123' } },
        },
        first: 1,
      });
      expect(mockClient.deleteTeamMembership).toHaveBeenCalledWith('membership-123');
      expect(result).toBe(true);
    });

    it('should return false when membership not found', async () => {
      mockClient.teamMemberships = jest.fn().mockResolvedValue(createMockConnection([]));

      const result = await service.removeFromTeam('user-123', 'team-123');

      expect(result).toBe(false);
    });

    it('should throw ValidationError when removal fails', async () => {
      const mockMembership = {
        id: 'membership-123',
        user: jest.fn().mockResolvedValue(createMockUser({ id: 'user-123' })),
        team: jest.fn().mockResolvedValue(createMockTeam({ id: 'team-123' })),
      };

      mockClient.teamMemberships = jest
        .fn()
        .mockResolvedValue(createMockConnection([mockMembership]));
      mockClient.deleteTeamMembership = jest.fn().mockResolvedValue(createMockPayload(false));

      await expect(service.removeFromTeam('user-123', 'team-123')).rejects.toThrow(ValidationError);
    });
  });

  describe('getSettings', () => {
    it('should return user settings', async () => {
      const mockSettings = {
        id: 'settings-123',
        notificationPreferences: { email: true, slack: false },
        timezone: 'America/New_York',
        theme: 'dark',
      };

      const mockUser = createMockUser({ id: 'user-123' });
      mockUser.settings = jest.fn().mockResolvedValue(mockSettings);
      mockClient.user = jest.fn().mockResolvedValue(mockUser);

      const result = await service.getSettings('user-123');

      expect(mockClient.user).toHaveBeenCalledWith('user-123');
      expect(mockUser.settings).toHaveBeenCalled();
      expect(result).toEqual(mockSettings);
    });

    it('should throw NotFoundError when user not found', async () => {
      mockClient.user = jest.fn().mockRejectedValue(new Error('Not found'));

      await expect(service.getSettings('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateSettings', () => {
    it('should update user settings successfully', async () => {
      const mockUser = createMockUser({ id: 'user-123' });
      const settingsUpdate = {
        timezone: 'Europe/London',
        theme: 'light' as const,
      };
      const updatedSettings = {
        id: 'settings-123',
        ...settingsUpdate,
      };

      mockClient.user = jest.fn().mockResolvedValue(mockUser);
      mockClient.updateUserSettings = jest
        .fn()
        .mockResolvedValue(createMockPayload(true, updatedSettings));

      const result = await service.updateSettings('user-123', settingsUpdate);

      expect(mockClient.user).toHaveBeenCalledWith('user-123');
      expect(mockClient.updateUserSettings).toHaveBeenCalledWith('user-123', settingsUpdate);
      expect(result).toEqual(updatedSettings);
    });

    it('should throw NotFoundError when user not found', async () => {
      mockClient.user = jest.fn().mockRejectedValue(new Error('Not found'));

      await expect(service.updateSettings('nonexistent', { timezone: 'UTC' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ValidationError when settings update fails', async () => {
      const mockUser = createMockUser({ id: 'user-123' });
      mockClient.user = jest.fn().mockResolvedValue(mockUser);
      mockClient.updateUserSettings = jest.fn().mockResolvedValue(createMockPayload(false));

      await expect(service.updateSettings('user-123', { timezone: 'UTC' })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('edge cases and validations', () => {
    it('should handle empty email filter', async () => {
      mockClient.users = jest.fn().mockResolvedValue(createMockUserConnection([]));

      await service.list({ email: {} });

      expect(mockClient.users).toHaveBeenCalledWith({
        filter: {},
        first: undefined,
        after: undefined,
        before: undefined,
        last: undefined,
      });
    });

    it('should handle email contains filter', async () => {
      mockClient.users = jest.fn().mockResolvedValue(createMockUserConnection([]));

      await service.list({ email: { contains: '@company.com' } });

      expect(mockClient.users).toHaveBeenCalledWith({
        filter: {
          email: { contains: '@company.com' },
        },
        first: undefined,
        after: undefined,
        before: undefined,
        last: undefined,
      });
    });

    it('should handle optional update fields', async () => {
      const mockUser = createMockUser({ id: 'user-123' });
      const updateData = {
        avatarUrl: 'https://example.com/avatar.png',
        statusUntilAt: '2024-12-31T23:59:59Z',
      };

      mockClient.user = jest.fn().mockResolvedValue(mockUser);
      mockClient.updateUser = jest
        .fn()
        .mockResolvedValue(
          createMockPayload(true, { ...mockUser, ...updateData, __typename: 'User' }),
        );

      await service.update('user-123', updateData);

      expect(mockClient.updateUser).toHaveBeenCalledWith('user-123', {
        avatarUrl: updateData.avatarUrl,
        statusUntilAt: new Date(updateData.statusUntilAt),
      });
    });
  });
});
