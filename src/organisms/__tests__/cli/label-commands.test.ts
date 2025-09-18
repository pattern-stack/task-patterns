import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Command } from 'commander';
import { createLabelCommand } from '@organisms/cli/commands/label';
import { linearClient } from '@atoms/client/linear-client';
import { LabelAPI } from '@molecules/apis/label.api';

// Mock dependencies
jest.mock('@atoms/client/linear-client');
jest.mock('@molecules/apis/label.api');
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  }));
});

describe('Label CLI Commands', () => {
  let mockClient: any;
  let mockLabelAPI: jest.Mocked<LabelAPI>;
  let labelCommand: Command;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock client
    mockClient = {};
    (linearClient.getClient as jest.Mock).mockReturnValue(mockClient);

    // Setup mock LabelAPI
    mockLabelAPI = {
      list: jest.fn(),
      listByTeam: jest.fn(),
      create: jest.fn(),
      getByName: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      applyTemplate: jest.fn(),
      bulkCreate: jest.fn(),
    } as any;

    (LabelAPI as jest.MockedClass<typeof LabelAPI>).mockImplementation(() => mockLabelAPI);

    // Mock static methods
    (LabelAPI.getAvailableTemplates as jest.Mock) = jest.fn().mockReturnValue([
      {
        name: 'task-patterns',
        template: {
          name: 'Task Patterns',
          description: 'Standard labels',
          labels: [
            {
              category: 'type',
              values: [{ name: 'bug' }, { name: 'feature' }],
            },
          ],
        },
      },
    ]);

    // Create command instance
    labelCommand = createLabelCommand();
  });

  describe('labels list', () => {
    it('should list all labels', async () => {
      const mockLabels = [
        { id: '1', name: 'bug', color: '#ff0000' },
        { id: '2', name: 'feature', color: '#00ff00' },
      ];

      mockLabelAPI.list.mockResolvedValue(mockLabels as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await labelCommand.parseAsync(['node', 'test', 'list']);

      expect(mockLabelAPI.list).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should list labels by team', async () => {
      const mockLabels = [{ id: '1', name: 'type:bug', color: '#ff0000' }];

      mockLabelAPI.listByTeam.mockResolvedValue(mockLabels as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await labelCommand.parseAsync(['node', 'test', 'list', '--team', 'ENG']);

      expect(mockLabelAPI.listByTeam).toHaveBeenCalledWith('ENG');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should show labels in hierarchy view', async () => {
      const mockLabels = [
        { id: '1', name: 'type:bug', color: '#ff0000' },
        { id: '2', name: 'type:feature', color: '#00ff00' },
        { id: '3', name: 'priority:high', color: '#ff9900' },
      ];

      mockLabelAPI.list.mockResolvedValue(mockLabels as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await labelCommand.parseAsync(['node', 'test', 'list', '--hierarchy']);

      expect(mockLabelAPI.list).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('labels create', () => {
    it('should create a new label', async () => {
      const newLabel = {
        id: '123',
        name: 'type:test',
        color: '#0000ff',
      };

      mockLabelAPI.getByName.mockResolvedValue(null);
      mockLabelAPI.create.mockResolvedValue(newLabel as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await labelCommand.parseAsync(['node', 'test', 'create', 'type:test']);

      expect(mockLabelAPI.getByName).toHaveBeenCalledWith('type:test');
      expect(mockLabelAPI.create).toHaveBeenCalledWith({
        name: 'type:test',
        color: undefined,
        description: undefined,
        team: undefined,
      });

      consoleSpy.mockRestore();
    });

    it('should not create duplicate labels', async () => {
      const existingLabel = {
        id: '123',
        name: 'type:test',
      };

      mockLabelAPI.getByName.mockResolvedValue(existingLabel as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await labelCommand.parseAsync(['node', 'test', 'create', 'type:test']);

      expect(mockLabelAPI.getByName).toHaveBeenCalledWith('type:test');
      expect(mockLabelAPI.create).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('labels apply-template', () => {
    it('should apply a label template', async () => {
      const result = {
        created: [
          { id: '1', name: 'type:bug' },
          { id: '2', name: 'type:feature' },
        ],
        skipped: [],
        errors: [],
      };

      mockLabelAPI.applyTemplate.mockResolvedValue(result as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await labelCommand.parseAsync(['node', 'test', 'apply-template', 'task-patterns']);

      expect(mockLabelAPI.applyTemplate).toHaveBeenCalledWith(
        'task-patterns',
        undefined,
        undefined,
      );

      consoleSpy.mockRestore();
    });

    it('should apply template to specific team', async () => {
      const result = {
        created: [{ id: '1', name: 'type:bug' }],
        skipped: [],
        errors: [],
      };

      mockLabelAPI.applyTemplate.mockResolvedValue(result as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await labelCommand.parseAsync([
        'node',
        'test',
        'apply-template',
        'task-patterns',
        '--team',
        'ENG',
      ]);

      expect(mockLabelAPI.applyTemplate).toHaveBeenCalledWith('task-patterns', 'ENG', undefined);

      consoleSpy.mockRestore();
    });
  });

  describe('labels templates', () => {
    it('should list available templates', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await labelCommand.parseAsync(['node', 'test', 'templates']);

      // Should show templates without API calls
      expect(mockLabelAPI.list).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('labels update', () => {
    it('should update a label', async () => {
      const existingLabel = {
        id: '123',
        name: 'old-name',
      };

      const updatedLabel = {
        id: '123',
        name: 'new-name',
        color: '#ff0000',
      };

      mockLabelAPI.getByName.mockResolvedValue(existingLabel as any);
      mockLabelAPI.update.mockResolvedValue(updatedLabel as any);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await labelCommand.parseAsync([
        'node',
        'test',
        'update',
        'old-name',
        '--new-name',
        'new-name',
        '--color',
        '#ff0000',
      ]);

      expect(mockLabelAPI.getByName).toHaveBeenCalledWith('old-name');
      expect(mockLabelAPI.update).toHaveBeenCalledWith('123', {
        name: 'new-name',
        color: '#ff0000',
      });

      consoleSpy.mockRestore();
    });
  });

  describe('labels delete', () => {
    it('should delete a label with confirmation', async () => {
      const label = {
        id: '123',
        name: 'to-delete',
      };

      mockLabelAPI.getByName.mockResolvedValue(label as any);
      mockLabelAPI.delete.mockResolvedValue(true);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await labelCommand.parseAsync(['node', 'test', 'delete', 'to-delete', '--confirm']);

      expect(mockLabelAPI.getByName).toHaveBeenCalledWith('to-delete');
      expect(mockLabelAPI.delete).toHaveBeenCalledWith('123');

      consoleSpy.mockRestore();
    });
  });
});
