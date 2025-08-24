import { Command } from 'commander';
import { issueCommands } from '@organisms/cli/commands/issue.commands';
import { teamCommands } from '@organisms/cli/commands/team.commands';
import { projectCommands } from '@organisms/cli/commands/project.commands';
import { IssueEntity } from '@molecules/entities/issue.entity';
import { TeamService } from '@features/team/service';
import { ProjectService } from '@features/project/service';
import { linearClient } from '@atoms/client/linear-client';
import { TestFactory } from '../fixtures/factories';
import { createMockIssue, createMockTeam, createMockProject } from '../utils/mocks';

jest.mock('@molecules/entities/issue.entity');
jest.mock('@features/team/service');
jest.mock('@features/project/service');
jest.mock('@atoms/client/linear-client');
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
  }));
});

describe('CLI Commands', () => {
  let program: Command;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let mockProcessExit: jest.SpyInstance;

  beforeEach(() => {
    TestFactory.reset();
    program = new Command();
    program.exitOverride(); // Prevent actual process exit

    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockProcessExit.mockRestore();
  });

  describe('Issue Commands', () => {
    let mockIssueEntity: jest.Mocked<IssueEntity>;

    beforeEach(() => {
      mockIssueEntity = new IssueEntity() as jest.Mocked<IssueEntity>;
      (IssueEntity as jest.Mock).mockImplementation(() => mockIssueEntity);
      issueCommands(program);
    });

    describe('issue create', () => {
      it('should create an issue with required fields', async () => {
        const mockIssue = createMockIssue({
          identifier: 'ENG-123',
          title: 'New Feature',
          url: 'https://linear.app/team/issue/ENG-123',
        });

        mockIssueEntity.create.mockResolvedValue(mockIssue);

        await program.parseAsync([
          'node',
          'test',
          'issue',
          'create',
          '-t',
          'New Feature',
          '--team',
          'team-123',
        ]);

        expect(mockIssueEntity.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Feature',
            teamId: 'team-123',
          }),
        );
      });

      it('should create an issue with all optional fields', async () => {
        const mockIssue = createMockIssue();
        mockIssueEntity.create.mockResolvedValue(mockIssue);

        await program.parseAsync([
          'node',
          'test',
          'issue',
          'create',
          '-t',
          'Bug Fix',
          '--team',
          'team-123',
          '-d',
          'Description text',
          '-a',
          'user-123',
          '-p',
          '3',
          '--project',
          'project-123',
          '--cycle',
          'cycle-123',
          '--estimate',
          '5',
          '--labels',
          'label-1,label-2',
        ]);

        expect(mockIssueEntity.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Bug Fix',
            teamId: 'team-123',
            description: 'Description text',
            assigneeId: 'user-123',
            priority: 3,
            projectId: 'project-123',
            cycleId: 'cycle-123',
            estimate: 5,
            labelIds: ['label-1', 'label-2'],
          }),
        );
      });
    });

    describe('issue get', () => {
      it('should get issue by ID', async () => {
        const mockIssue = createMockIssue();
        mockIssueEntity.getByIdentifier.mockResolvedValue(mockIssue);

        await program.parseAsync(['node', 'test', 'issue', 'get', 'issue-123']);

        expect(mockIssueEntity.getByIdentifier).toHaveBeenCalledWith('issue-123');
      });

      it('should get issue by identifier', async () => {
        const mockIssue = createMockIssue({ identifier: 'ENG-123' });
        mockIssueEntity.getByIdentifier.mockResolvedValue(mockIssue);

        await program.parseAsync(['node', 'test', 'issue', 'get', 'ENG-123']);

        expect(mockIssueEntity.getByIdentifier).toHaveBeenCalledWith('ENG-123');
      });

      it('should get issue with relations', async () => {
        const mockIssueWithRelations = {
          issue: createMockIssue(),
          team: createMockTeam(),
          project: createMockProject(),
          assignee: undefined,
          comments: [],
          attachments: [],
          labels: [],
        };

        mockIssueEntity.getWithRelations.mockResolvedValue(mockIssueWithRelations);

        await program.parseAsync([
          'node',
          'test',
          'issue',
          'get',
          'abc123def456', // Use ID without hyphen to trigger getWithRelations
          '--with-relations',
        ]);

        expect(mockIssueEntity.getWithRelations).toHaveBeenCalledWith('abc123def456');
      });
    });

    describe('issue update', () => {
      it('should update an issue', async () => {
        const updatedIssue = createMockIssue({ identifier: 'ENG-123' });
        mockIssueEntity.update.mockResolvedValue(updatedIssue);

        await program.parseAsync([
          'node',
          'test',
          'issue',
          'update',
          'issue-123',
          '-t',
          'Updated Title',
          '-p',
          '4',
          '--estimate',
          '8',
        ]);

        expect(mockIssueEntity.update).toHaveBeenCalledWith(
          'issue-123',
          expect.objectContaining({
            title: 'Updated Title',
            priority: 4,
            estimate: 8,
          }),
        );
      });
    });

    describe('issue list', () => {
      it('should list issues with filters', async () => {
        const mockIssues = [
          createMockIssue({ identifier: 'ENG-1' }),
          createMockIssue({ identifier: 'ENG-2' }),
        ];

        mockIssueEntity.list.mockResolvedValue({
          issues: mockIssues,
          pageInfo: {} as any,
          totalCount: 2,
        });

        await program.parseAsync([
          'node',
          'test',
          'issue',
          'list',
          '--team',
          'team-123',
          '--state',
          'started',
          '--limit',
          '10',
        ]);

        expect(mockIssueEntity.list).toHaveBeenCalledWith(
          expect.objectContaining({
            teamId: 'team-123',
            state: 'started',
          }),
          expect.objectContaining({
            first: 10,
          }),
        );
      });
    });

    describe('issue assign', () => {
      it('should assign issue to user', async () => {
        const mockIssue = createMockIssue({ identifier: 'ENG-123' });
        mockIssueEntity.assignToUser.mockResolvedValue(mockIssue);

        await program.parseAsync(['node', 'test', 'issue', 'assign', 'issue-123', 'user-456']);

        expect(mockIssueEntity.assignToUser).toHaveBeenCalledWith('issue-123', 'user-456');
      });
    });

    describe('issue comment', () => {
      it('should add comment to issue', async () => {
        mockIssueEntity.addComment.mockResolvedValue(true);

        await program.parseAsync([
          'node',
          'test',
          'issue',
          'comment',
          'issue-123',
          'This is a test comment',
        ]);

        expect(mockIssueEntity.addComment).toHaveBeenCalledWith(
          'issue-123',
          'This is a test comment',
        );
      });
    });
  });

  describe('Team Commands', () => {
    let mockTeamService: jest.Mocked<TeamService>;

    beforeEach(() => {
      mockTeamService = new TeamService() as jest.Mocked<TeamService>;
      (TeamService as jest.Mock).mockImplementation(() => mockTeamService);
      teamCommands(program);
    });

    describe('team list', () => {
      it('should list all teams', async () => {
        const mockTeams = [
          createMockTeam({ key: 'ENG', name: 'Engineering' }),
          createMockTeam({ key: 'PROD', name: 'Product' }),
        ];

        mockTeamService.list.mockResolvedValue({
          nodes: mockTeams,
          pageInfo: {} as any,
          totalCount: 2,
        } as any);

        await program.parseAsync(['node', 'test', 'team', 'list', '--limit', '20']);

        expect(mockTeamService.list).toHaveBeenCalledWith({ first: 20 });
      });
    });

    describe('team get', () => {
      it('should get team by key', async () => {
        const mockTeam = createMockTeam({ key: 'ENG' });
        mockTeamService.getByKey.mockResolvedValue(mockTeam);

        await program.parseAsync(['node', 'test', 'team', 'get', 'ENG']);

        expect(mockTeamService.getByKey).toHaveBeenCalledWith('ENG');
      });

      it('should get team by ID', async () => {
        const mockTeam = createMockTeam();
        mockTeamService.get.mockResolvedValue(mockTeam);

        await program.parseAsync(['node', 'test', 'team', 'get', 'team-uuid-123456789']);

        expect(mockTeamService.get).toHaveBeenCalledWith('team-uuid-123456789');
      });
    });
  });

  describe('Project Commands', () => {
    let mockProjectService: jest.Mocked<ProjectService>;

    beforeEach(() => {
      mockProjectService = new ProjectService() as jest.Mocked<ProjectService>;
      (ProjectService as jest.Mock).mockImplementation(() => mockProjectService);
      projectCommands(program);
    });

    describe('project create', () => {
      it('should create a project', async () => {
        const mockProject = createMockProject({
          name: 'New Project',
          url: 'https://linear.app/project',
        });

        mockProjectService.create.mockResolvedValue(mockProject);

        await program.parseAsync([
          'node',
          'test',
          'project',
          'create',
          '-n',
          'New Project',
          '--teams',
          'team-1,team-2',
          '-d',
          'Project description',
          '--priority',
          '2',
        ]);

        expect(mockProjectService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Project',
            teamIds: ['team-1', 'team-2'],
            description: 'Project description',
            priority: 2,
          }),
        );
      });
    });

    describe('project list', () => {
      it('should list projects', async () => {
        const mockProjects = [
          createMockProject({ name: 'Project 1' }),
          createMockProject({ name: 'Project 2' }),
        ];

        mockProjectService.list.mockResolvedValue({
          nodes: mockProjects,
          pageInfo: {} as any,
          totalCount: 2,
        } as any);

        await program.parseAsync(['node', 'test', 'project', 'list']);

        expect(mockProjectService.list).toHaveBeenCalled();
      });
    });
  });

  describe('Connection Test', () => {
    it('should test Linear API connection', async () => {
      const mockTestConnection = jest.fn().mockResolvedValue(true);
      (linearClient.testConnection as jest.Mock) = mockTestConnection;

      const testProgram = new Command();
      testProgram.exitOverride();
      testProgram.command('test-connection').action(async () => {
        await linearClient.testConnection();
      });

      await testProgram.parseAsync(['node', 'test', 'test-connection']);

      expect(mockTestConnection).toHaveBeenCalled();
    });
  });
});
