import { TeamService } from '@features/team/service';
import {
  createMockLinearClient,
  createMockTeam,
  createMockUser,
  createMockConnection,
  createMockPayload,
  createMockWorkflowState,
  createMockCycle,
  createMockProject,
  createMockLabel,
} from '../utils/mocks';
import { TestFactory } from '../fixtures/factories';
import { linearClient } from '@atoms/client/linear-client';
import { NotFoundError, ValidationError, PermissionError } from '@atoms/types/common';

// Mock the linear client
jest.mock('@atoms/client/linear-client');

describe('TeamService', () => {
  let service: TeamService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    (linearClient.getClient as jest.Mock).mockReturnValue(mockClient);
    service = new TeamService(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('existing methods', () => {
    describe('get', () => {
      it('should return team when found', async () => {
        const teamId = 'team-123';
        const expectedTeam = createMockTeam({ id: teamId });
        mockClient.team.mockResolvedValue(expectedTeam);

        const result = await service.get(teamId);

        expect(result).toEqual(expectedTeam);
        expect(mockClient.team).toHaveBeenCalledWith(teamId);
      });

      it('should return null when team not found', async () => {
        const teamId = 'nonexistent';
        mockClient.team.mockRejectedValue(new Error('Not found'));

        const result = await service.get(teamId);

        expect(result).toBeNull();
      });
    });

    describe('getByKey', () => {
      it('should return team when found by key', async () => {
        const teamKey = 'ENG';
        const expectedTeam = createMockTeam({ key: teamKey });
        const connection = createMockConnection([expectedTeam]);
        mockClient.teams.mockResolvedValue(connection);

        const result = await service.getByKey(teamKey);

        expect(result).toEqual(expectedTeam);
        expect(mockClient.teams).toHaveBeenCalledWith({
          filter: { key: { eq: teamKey } },
          first: 1,
        });
      });

      it('should return null when team not found by key', async () => {
        const teamKey = 'NONEXISTENT';
        const connection = createMockConnection([]);
        mockClient.teams.mockResolvedValue(connection);

        const result = await service.getByKey(teamKey);

        expect(result).toBeNull();
      });
    });

    describe('list', () => {
      it('should list teams with pagination', async () => {
        const teams = [createMockTeam(), createMockTeam()];
        const connection = createMockConnection(teams);
        mockClient.teams.mockResolvedValue(connection);

        const pagination = { first: 10, after: 'cursor' };
        const result = await service.list(pagination);

        expect(result).toEqual(connection);
        expect(mockClient.teams).toHaveBeenCalledWith(pagination);
      });

      it('should handle errors during listing', async () => {
        mockClient.teams.mockRejectedValue(new Error('API Error'));

        await expect(service.list()).rejects.toThrow('API Error');
      });
    });
  });

  describe('NEW CRUD operations', () => {
    describe('create', () => {
      it('should create team with valid data', async () => {
        const teamData = {
          name: 'Engineering',
          key: 'ENGX',
          description: 'Engineering team',
          icon: '🔧',
          color: '#4287f5',
          cyclesEnabled: true,
          cycleStartDay: 1,
          cycleDuration: 14,
          triageEnabled: false,
        };
        const createdTeam = createMockTeam({ ...teamData, id: 'team-new' });
        const payload = createMockPayload(true, createdTeam);
        mockClient.createTeam.mockResolvedValue(payload);
        // Mock getByKey to return null (no existing team)
        mockClient.teams.mockResolvedValue(createMockConnection([]));

        const result = await service.create(teamData);

        expect(result).toEqual(createdTeam);
        expect(mockClient.createTeam).toHaveBeenCalledWith(teamData);
      });

      it('should throw validation error for invalid data', async () => {
        const invalidData = {
          name: '', // Invalid - empty name
          key: 'A', // Invalid - key too short
        };

        await expect(service.create(invalidData as any)).rejects.toThrow(ValidationError);
      });

      it('should throw error when team key already exists', async () => {
        const teamData = {
          name: 'Engineering',
          key: 'ENG',
        };
        // Mock getByKey to return an existing team
        const existingTeam = createMockTeam({ key: 'ENG' });
        mockClient.teams.mockResolvedValue(createMockConnection([existingTeam]));

        await expect(service.create(teamData)).rejects.toThrow("Team key 'ENG' already exists");
      });

      it('should handle API errors during creation', async () => {
        const teamData = {
          name: 'Engineering',
          key: 'ENGZ',
        };
        // Mock getByKey to return no existing team
        mockClient.teams.mockResolvedValue(createMockConnection([]));
        mockClient.createTeam.mockRejectedValue(new Error('API Error'));

        await expect(service.create(teamData)).rejects.toThrow('API Error');
      });
    });

    describe('update', () => {
      it('should update team with valid data', async () => {
        const teamId = 'team-123';
        const updateData = {
          name: 'Updated Engineering',
          description: 'Updated description',
          cyclesEnabled: false,
        };
        const updatedTeam = createMockTeam({ ...updateData, id: teamId });
        const payload = createMockPayload(true, updatedTeam);
        mockClient.updateTeam.mockResolvedValue(payload);

        const result = await service.update(teamId, updateData);

        expect(result).toEqual(updatedTeam);
        expect(mockClient.updateTeam).toHaveBeenCalledWith(teamId, updateData);
      });

      it('should throw validation error for invalid update data', async () => {
        const teamId = 'team-123';
        const invalidData = {
          name: '', // Invalid - empty name
        };

        await expect(service.update(teamId, invalidData as any)).rejects.toThrow(ValidationError);
      });

      it('should handle team not found during update', async () => {
        const teamId = 'nonexistent';
        const updateData = { name: 'New Name' };
        mockClient.updateTeam.mockRejectedValue(new Error('Team not found'));

        await expect(service.update(teamId, updateData)).rejects.toThrow('Team not found');
      });
    });

    describe('delete', () => {
      it('should delete team successfully', async () => {
        const teamId = 'team-123';
        const payload = createMockPayload(true);
        mockClient.deleteTeam.mockResolvedValue(payload);

        const result = await service.delete(teamId);

        expect(result).toBe(true);
        expect(mockClient.deleteTeam).toHaveBeenCalledWith(teamId);
      });

      it('should return false when deletion fails', async () => {
        const teamId = 'team-123';
        const payload = createMockPayload(false);
        mockClient.deleteTeam.mockResolvedValue(payload);

        const result = await service.delete(teamId);

        expect(result).toBe(false);
      });

      it('should throw permission error for insufficient permissions', async () => {
        const teamId = 'team-123';
        mockClient.deleteTeam.mockRejectedValue(new Error('Insufficient permissions'));

        await expect(service.delete(teamId)).rejects.toThrow('Insufficient permissions');
      });

      it('should handle team not found during deletion', async () => {
        const teamId = 'nonexistent';
        mockClient.deleteTeam.mockRejectedValue(new Error('Team not found'));

        await expect(service.delete(teamId)).rejects.toThrow('Team not found');
      });
    });

    describe('merge', () => {
      it('should throw error for team merge not implemented', async () => {
        const sourceId = 'team-source';
        const targetId = 'team-target';

        await expect(service.merge(sourceId, targetId)).rejects.toThrow(
          'Team merge not implemented',
        );
      });

      // Merge functionality tests removed since merge is not implemented in Linear SDK
    });
  });

  describe('NEW team resource methods', () => {
    describe('getWebhooks', () => {
      it('should get webhooks for team', async () => {
        const teamId = 'team-123';
        const team = createMockTeam({ id: teamId });
        const webhooks = createMockConnection([
          { id: 'webhook-1', url: 'https://example.com/webhook' },
          { id: 'webhook-2', url: 'https://api.example.com/linear' },
        ]);
        mockClient.team.mockResolvedValue(team);
        team.webhooks = jest.fn().mockResolvedValue(webhooks);

        const result = await service.getWebhooks(teamId);

        expect(result).toEqual(webhooks);
        expect(team.webhooks).toHaveBeenCalled();
      });

      it('should throw NotFoundError when team not found', async () => {
        const teamId = 'nonexistent';
        mockClient.team.mockRejectedValue(new Error('Not found'));

        await expect(service.getWebhooks(teamId)).rejects.toThrow(NotFoundError);
      });
    });

    describe('getSettings', () => {
      it('should get team settings', async () => {
        const teamId = 'team-123';
        const team = createMockTeam({ id: teamId });
        const expectedSettings = {
          id: `settings-${teamId}`,
          cyclesEnabled: undefined, // From team properties
          cycleStartDay: undefined,
          cycleDuration: undefined,
          triageEnabled: undefined,
        };
        mockClient.team.mockResolvedValue(team);

        const result = await service.getSettings(teamId);

        expect(result).toEqual(expectedSettings);
      });

      it('should throw NotFoundError when team not found', async () => {
        const teamId = 'nonexistent';
        mockClient.team.mockRejectedValue(new Error('Not found'));

        await expect(service.getSettings(teamId)).rejects.toThrow(NotFoundError);
      });
    });

    describe('updateSettings', () => {
      it('should update team settings', async () => {
        const teamId = 'team-123';
        const settingsUpdate = {
          cyclesEnabled: false,
          cycleDuration: 7,
          triageEnabled: false,
        };
        const updatedTeam = createMockTeam({ id: teamId, ...settingsUpdate });
        const payload = createMockPayload(true, updatedTeam);
        mockClient.updateTeam.mockResolvedValue(payload);

        const result = await service.updateSettings(teamId, settingsUpdate);

        expect(result).toEqual(updatedTeam);
        expect(mockClient.updateTeam).toHaveBeenCalledWith(teamId, settingsUpdate);
      });

      it('should throw validation error for invalid settings', async () => {
        const teamId = 'team-123';
        const invalidSettings = {
          cycleDuration: -1, // Invalid - negative duration
        };

        await expect(service.updateSettings(teamId, invalidSettings as any)).rejects.toThrow(
          ValidationError,
        );
      });
    });

    describe('getIssueTemplates', () => {
      it('should get issue templates for team', async () => {
        const teamId = 'team-123';
        const team = createMockTeam({ id: teamId });
        const templates = createMockConnection([
          {
            id: 'template-1',
            name: 'Bug Report',
            templateData: { title: 'Bug: ', description: 'Steps to reproduce:\n\n' },
          },
          {
            id: 'template-2',
            name: 'Feature Request',
            templateData: { title: 'Feature: ', description: 'User story:\n\n' },
          },
        ]);
        mockClient.team.mockResolvedValue(team);
        team.templates = jest.fn().mockResolvedValue(templates);

        const result = await service.getIssueTemplates(teamId);

        expect(result).toEqual(templates);
        expect(team.templates).toHaveBeenCalled();
      });

      it('should throw NotFoundError when team not found', async () => {
        const teamId = 'nonexistent';
        mockClient.team.mockRejectedValue(new Error('Not found'));

        await expect(service.getIssueTemplates(teamId)).rejects.toThrow(NotFoundError);
      });
    });

    describe('createIssueTemplate', () => {
      it('should create issue template for team', async () => {
        const teamId = 'team-123';
        const templateData = {
          name: 'Bug Report',
          description: 'Template for bug reports',
          templateData: {
            title: 'Bug: ',
            description: 'Steps to reproduce:\n\n',
          },
          type: 'issue' as const,
        };
        const createdTemplate = {
          id: 'template-new',
          __typename: 'Template',
          ...templateData,
        };
        const payload = createMockPayload(true, createdTemplate);
        mockClient.createTemplate.mockResolvedValue(payload);

        const result = await service.createIssueTemplate(teamId, templateData);

        expect(result).toEqual(createdTemplate);
        expect(mockClient.createTemplate).toHaveBeenCalledWith({ ...templateData, teamId });
      });

      it('should throw validation error for invalid template data', async () => {
        const teamId = 'team-123';
        const invalidTemplate = {
          name: '', // Invalid - empty name
          templateData: {},
        };

        await expect(service.createIssueTemplate(teamId, invalidTemplate as any)).rejects.toThrow(
          ValidationError,
        );
      });

      it('should handle API errors during template creation', async () => {
        const teamId = 'team-123';
        const templateData = {
          name: 'Bug Report',
          templateData: { title: 'Bug: ' },
          type: 'issue' as const,
        };
        mockClient.createTemplate.mockRejectedValue(new Error('API Error'));

        await expect(service.createIssueTemplate(teamId, templateData)).rejects.toThrow(
          'API Error',
        );
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle network errors gracefully', async () => {
      const teamId = 'team-123';
      mockClient.team.mockRejectedValue(new Error('Network error'));

      const result = await service.get(teamId);

      expect(result).toBeNull();
    });

    it('should validate team key format in create', async () => {
      const invalidKeyData = {
        name: 'Test Team',
        key: 'invalid-key-with-lowercase',
      };

      await expect(service.create(invalidKeyData as any)).rejects.toThrow(ValidationError);
    });

    it('should handle empty pagination results', async () => {
      const emptyConnection = createMockConnection([]);
      mockClient.teams.mockResolvedValue(emptyConnection);

      const result = await service.list();

      expect(result.nodes).toHaveLength(0);
    });

    it('should handle concurrent operations safely', async () => {
      const teamId = 'team-123';
      const team = createMockTeam({ id: teamId });
      mockClient.team.mockResolvedValue(team);

      // Simulate concurrent calls
      const promises = [service.get(teamId), service.get(teamId), service.get(teamId)];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toEqual(team);
      });
      expect(mockClient.team).toHaveBeenCalledTimes(3);
    });
  });

  describe('data consistency and validation', () => {
    it('should ensure team key uniqueness validation', async () => {
      const teamData = {
        name: 'Engineering',
        key: 'ENG',
      };

      // Mock existing team with same key
      const existingTeam = createMockTeam({ key: 'ENG' });
      const connection = createMockConnection([existingTeam]);
      mockClient.teams.mockResolvedValue(connection);

      // The service should check for existing keys before creation
      await expect(service.create(teamData)).rejects.toThrow("Team key 'ENG' already exists");
    });

    it('should handle special characters in team names', async () => {
      const teamData = {
        name: 'Engineering & Design 🎨',
        key: 'ED',
      };
      const createdTeam = createMockTeam({ ...teamData, id: 'team-special' });
      const payload = createMockPayload(true, createdTeam);
      mockClient.createTeam.mockResolvedValue(payload);
      // Mock getByKey to return no existing team
      mockClient.teams.mockResolvedValue(createMockConnection([]));

      const result = await service.create(teamData);

      expect(result.name).toBe('Engineering & Design 🎨');
    });

    it('should handle merge operation limitation', async () => {
      const sourceId = 'team-source';
      const targetId = 'team-target';

      await expect(service.merge(sourceId, targetId)).rejects.toThrow('Team merge not implemented');
    });
  });
});
