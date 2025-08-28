import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Command } from 'commander';
import { createTeamCommand } from '@organisms/cli/commands/team';
import { linearClient } from '@atoms/client/linear-client';
import { TeamAPI } from '@molecules/apis/team.api';

// Mock dependencies
jest.mock('@atoms/client/linear-client');
jest.mock('@molecules/apis/team.api');
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  }));
});

describe('Team CLI Commands', () => {
  let mockClient: any;
  let mockTeamAPI: jest.Mocked<TeamAPI>;
  let teamCommand: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock client
    mockClient = {
      teams: jest.fn(),
    };
    (linearClient.getClient as jest.Mock).mockReturnValue(mockClient);

    // Setup mock TeamAPI
    mockTeamAPI = {
      list: jest.fn(),
      create: jest.fn(),
      getByKey: jest.fn(),
      getAnalytics: jest.fn(),
      getMembers: jest.fn(),
      getCycles: jest.fn(),
      getCurrentCycle: jest.fn(),
      getWorkflowStates: jest.fn(),
      getVelocity: jest.fn(),
      applyTemplate: jest.fn(),
      search: jest.fn(),
    } as any;
    
    (TeamAPI as jest.MockedClass<typeof TeamAPI>).mockImplementation(() => mockTeamAPI);

    // Mock static methods
    (TeamAPI.getAvailableTemplates as jest.Mock) = jest.fn().mockReturnValue([
      {
        name: 'engineering',
        template: {
          name: 'Engineering Team',
          description: 'Standard engineering team setup',
          config: {
            key: 'ENG',
            cyclesEnabled: true,
            triageEnabled: true,
          },
        },
      },
    ]);
    
    (TeamAPI.validateTeamKey as jest.Mock) = jest.fn().mockReturnValue({
      valid: true,
      errors: [],
    });

    // Create command instance
    teamCommand = createTeamCommand();
  });

  describe('team list', () => {
    it('should list all teams', async () => {
      const mockTeams = [
        { id: '1', key: 'ENG', name: 'Engineering' },
        { id: '2', key: 'SUP', name: 'Support' },
      ];

      mockTeamAPI.list.mockResolvedValue(mockTeams as any);

      // Capture console output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Parse and execute command
      await teamCommand.parseAsync(['node', 'test', 'list']);

      expect(mockTeamAPI.list).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle errors when listing teams', async () => {
      mockTeamAPI.list.mockRejectedValue(new Error('API Error'));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await teamCommand.parseAsync(['node', 'test', 'list']);

      expect(mockTeamAPI.list).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('team create', () => {
    it('should create a new team', async () => {
      const newTeam = {
        id: '123',
        key: 'NEW',
        name: 'New Team',
      };

      mockTeamAPI.create.mockResolvedValue(newTeam as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await teamCommand.parseAsync(['node', 'test', 'create', 'NEW', 'New Team']);

      expect(mockTeamAPI.create).toHaveBeenCalledWith({
        key: 'NEW',
        name: 'New Team',
        description: undefined,
        cyclesEnabled: false,
        cycleDuration: 14,
        triageEnabled: false,
      });

      consoleSpy.mockRestore();
    });

    it('should apply template when creating team', async () => {
      const newTeam = {
        id: '123',
        key: 'ENG',
        name: 'Engineering Team',
      };

      mockTeamAPI.applyTemplate.mockResolvedValue(newTeam as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await teamCommand.parseAsync([
        'node',
        'test',
        'create',
        'ENG',
        'Engineering Team',
        '--template',
        'engineering',
      ]);

      expect(mockTeamAPI.applyTemplate).toHaveBeenCalledWith('engineering', {
        key: 'ENG',
        name: 'Engineering Team',
        description: undefined,
      });

      consoleSpy.mockRestore();
    });
  });

  describe('team show', () => {
    it('should show team details', async () => {
      const team = {
        id: '123',
        key: 'ENG',
        name: 'Engineering',
        cyclesEnabled: true,
      };

      const members = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
      ];

      const cycles = [
        { id: 'c1', name: 'Sprint 1', startsAt: '2025-01-01', endsAt: '2025-01-14' },
      ];

      const states = [
        { id: 's1', name: 'Todo', type: 'unstarted' },
        { id: 's2', name: 'Done', type: 'completed' },
      ];

      mockTeamAPI.getByKey.mockResolvedValue(team as any);
      mockTeamAPI.getMembers.mockResolvedValue(members as any);
      mockTeamAPI.getCycles.mockResolvedValue(cycles as any);
      mockTeamAPI.getCurrentCycle.mockResolvedValue(cycles[0] as any);
      mockTeamAPI.getWorkflowStates.mockResolvedValue(states as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await teamCommand.parseAsync(['node', 'test', 'show', 'ENG']);

      expect(mockTeamAPI.getByKey).toHaveBeenCalledWith('ENG');
      expect(mockTeamAPI.getMembers).toHaveBeenCalledWith('ENG');
      expect(mockTeamAPI.getCycles).toHaveBeenCalledWith('ENG');

      consoleSpy.mockRestore();
    });
  });

  describe('team stats', () => {
    it('should show team analytics', async () => {
      const analytics = {
        teamId: '123',
        teamKey: 'ENG',
        teamName: 'Engineering',
        metrics: {
          totalIssues: 100,
          openIssues: 30,
          completedIssues: 60,
          inProgressIssues: 10,
        },
        memberStats: [
          { userId: '1', name: 'John', assignedIssues: 20, completedIssues: 15 },
        ],
        labelDistribution: new Map([['bug', 10], ['feature', 20]]),
        priorityDistribution: new Map([[1, 5], [2, 10]]),
      };

      const team = { id: '123', key: 'ENG', name: 'Engineering', cyclesEnabled: true };
      const velocities = [10, 12, 15];

      mockTeamAPI.getAnalytics.mockResolvedValue(analytics as any);
      mockTeamAPI.getByKey.mockResolvedValue(team as any);
      mockTeamAPI.getVelocity.mockResolvedValue(velocities);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await teamCommand.parseAsync(['node', 'test', 'stats', 'ENG']);

      expect(mockTeamAPI.getAnalytics).toHaveBeenCalledWith('ENG');
      expect(mockTeamAPI.getVelocity).toHaveBeenCalledWith('ENG');

      consoleSpy.mockRestore();
    });
  });

  describe('team templates', () => {
    it('should list available templates', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await teamCommand.parseAsync(['node', 'test', 'templates']);

      // Should show templates without API calls
      expect(mockTeamAPI.list).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});