import { TeamAPI } from '@molecules/apis/team.api';
import { TeamService } from '@features/team/service';
import { UserService } from '@features/user/service';
import { ProjectService } from '@features/project/service';
import { CycleService } from '@features/cycle/service';
import { WorkflowStateService } from '@features/workflow-state/service';
import { LabelService } from '@features/label/service';
import { IssueService } from '@features/issue/service';
import {
  createMockLinearClient,
  createMockTeam,
  createMockUser,
  createMockProject,
  createMockCycle,
  createMockIssue,
  createMockConnection,
} from '../../../__tests__/utils/mocks';

jest.mock('@features/team/service');
jest.mock('@features/user/service');
jest.mock('@features/project/service');
jest.mock('@features/cycle/service');
jest.mock('@features/workflow-state/service');
jest.mock('@features/label/service');
jest.mock('@features/issue/service');

describe('TeamAPI - Complete Test Suite', () => {
  let teamAPI: TeamAPI;
  let mockClient: any;
  let mockTeamService: jest.Mocked<TeamService>;
  let mockUserService: jest.Mocked<UserService>;
  let _mockProjectService: jest.Mocked<ProjectService>;
  let _mockCycleService: jest.Mocked<CycleService>;
  let _mockWorkflowStateService: jest.Mocked<WorkflowStateService>;
  let _mockLabelService: jest.Mocked<LabelService>;
  let mockIssueService: jest.Mocked<IssueService>;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    teamAPI = new TeamAPI(mockClient);

    // Get mocked service instances
    mockTeamService = (TeamService as jest.MockedClass<typeof TeamService>).mock
      .instances[0] as jest.Mocked<TeamService>;
    mockUserService = (UserService as jest.MockedClass<typeof UserService>).mock
      .instances[0] as jest.Mocked<UserService>;
    _mockProjectService = (ProjectService as jest.MockedClass<typeof ProjectService>).mock
      .instances[0] as jest.Mocked<ProjectService>;
    _mockCycleService = (CycleService as jest.MockedClass<typeof CycleService>).mock
      .instances[0] as jest.Mocked<CycleService>;
    _mockWorkflowStateService = (
      WorkflowStateService as jest.MockedClass<typeof WorkflowStateService>
    ).mock.instances[0] as jest.Mocked<WorkflowStateService>;
    _mockLabelService = (LabelService as jest.MockedClass<typeof LabelService>).mock
      .instances[0] as jest.Mocked<LabelService>;
    mockIssueService = (IssueService as jest.MockedClass<typeof IssueService>).mock
      .instances[0] as jest.Mocked<IssueService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('create', () => {
      it('should create a new team', async () => {
        const teamData = { key: 'ENG', name: 'Engineering' };
        const mockTeam = createMockTeam(teamData);

        mockTeamService.create.mockResolvedValue(mockTeam);

        const result = await teamAPI.create(teamData);

        expect(mockTeamService.create).toHaveBeenCalledWith(teamData);
        expect(result).toEqual(mockTeam);
      });

      it('should handle creation errors', async () => {
        const teamData = { key: 'ENG', name: 'Engineering' };
        mockTeamService.create.mockRejectedValue(new Error('Creation failed'));

        await expect(teamAPI.create(teamData)).rejects.toThrow('Creation failed');
      });
    });

    describe('update', () => {
      it('should update a team', async () => {
        const updateData = { name: 'Updated Engineering' };
        const mockTeam = createMockTeam(updateData);

        mockTeamService.update.mockResolvedValue(mockTeam);

        const result = await teamAPI.update('team-123', updateData);

        expect(mockTeamService.update).toHaveBeenCalledWith('team-123', updateData);
        expect(result).toEqual(mockTeam);
      });

      it('should handle update errors', async () => {
        mockTeamService.update.mockRejectedValue(new Error('Update failed'));

        await expect(teamAPI.update('team-123', {})).rejects.toThrow('Update failed');
      });
    });

    describe('delete', () => {
      it('should delete a team', async () => {
        mockTeamService.delete.mockResolvedValue(true);

        const result = await teamAPI.delete('team-123');

        expect(mockTeamService.delete).toHaveBeenCalledWith('team-123');
        expect(result).toBe(true);
      });

      it('should return false if delete fails', async () => {
        mockTeamService.delete.mockResolvedValue(false);

        const result = await teamAPI.delete('team-123');

        expect(result).toBe(false);
      });
    });

    describe('list', () => {
      it('should list teams with pagination', async () => {
        const mockTeams = [createMockTeam({ key: 'ENG' }), createMockTeam({ key: 'PROD' })];

        mockTeamService.list.mockResolvedValue(createMockConnection(mockTeams));

        const result = await teamAPI.list({ first: 10 });

        expect(mockTeamService.list).toHaveBeenCalledWith({ first: 10 });
        expect(result).toEqual(mockTeams);
      });

      it('should use default pagination when not specified', async () => {
        const mockTeams = [createMockTeam()];
        mockTeamService.list.mockResolvedValue(createMockConnection(mockTeams));

        await teamAPI.list();

        expect(mockTeamService.list).toHaveBeenCalledWith(undefined);
      });
    });

    describe('resolveTeamId', () => {
      it('should resolve team key to ID', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue('team-123');

        const result = await teamAPI.resolveTeamId('ENG');

        expect(mockTeamService.resolveTeamId).toHaveBeenCalledWith('ENG');
        expect(result).toBe('team-123');
      });

      it('should return null for non-existent team', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue(null);

        const result = await teamAPI.resolveTeamId('INVALID');

        expect(result).toBeNull();
      });
    });
  });

  describe('Member Operations', () => {
    describe('getMembers', () => {
      it('should get team members', async () => {
        const mockMembers = [
          createMockUser({ email: 'user1@test.com' }),
          createMockUser({ email: 'user2@test.com' }),
        ];

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getMembers.mockResolvedValue(createMockConnection(mockMembers));

        const result = await teamAPI.getMembers('ENG');

        expect(mockTeamService.resolveTeamId).toHaveBeenCalledWith('ENG');
        expect(mockTeamService.getMembers).toHaveBeenCalledWith('team-123');
        expect(result).toEqual(mockMembers);
      });

      it('should throw error if team not found', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue(null);

        await expect(teamAPI.getMembers('INVALID')).rejects.toThrow('Team not found: INVALID');
      });
    });

    describe('addMember', () => {
      it('should throw error indicating admin access required', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockUserService.getByEmail.mockResolvedValue(createMockUser());

        await expect(teamAPI.addMember('ENG', 'user@test.com')).rejects.toThrow(
          'Team member management requires organization admin API access',
        );
      });

      it('should throw error if team not found', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue(null);

        await expect(teamAPI.addMember('INVALID', 'user@test.com')).rejects.toThrow(
          'Team not found: INVALID',
        );
      });

      it('should throw error if user not found', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockUserService.getByEmail.mockResolvedValue(null);

        await expect(teamAPI.addMember('ENG', 'invalid@test.com')).rejects.toThrow(
          'User not found: invalid@test.com',
        );
      });
    });

    describe('removeMember', () => {
      it('should throw error indicating admin access required', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockUserService.getByEmail.mockResolvedValue(createMockUser());

        await expect(teamAPI.removeMember('ENG', 'user@test.com')).rejects.toThrow(
          'Team member management requires organization admin API access',
        );
      });
    });
  });

  describe('Resource Operations', () => {
    describe('getProjects', () => {
      it('should get team projects', async () => {
        const mockProjects = [
          createMockProject({ name: 'Project 1' }),
          createMockProject({ name: 'Project 2' }),
        ];

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getProjects.mockResolvedValue(createMockConnection(mockProjects));

        const result = await teamAPI.getProjects('ENG');

        expect(mockTeamService.getProjects).toHaveBeenCalledWith('team-123');
        expect(result).toEqual(mockProjects);
      });

      it('should throw error if team not found', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue(null);

        await expect(teamAPI.getProjects('INVALID')).rejects.toThrow('Team not found: INVALID');
      });
    });

    describe('getCycles', () => {
      it('should filter out past cycles by default', async () => {
        const now = new Date();
        const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const mockCycles = [
          createMockCycle({ startsAt: now.toISOString(), endsAt: futureDate.toISOString() }),
          createMockCycle({ startsAt: pastDate.toISOString(), endsAt: pastDate.toISOString() }),
        ];

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getCycles.mockResolvedValue(createMockConnection(mockCycles));

        const result = await teamAPI.getCycles('ENG');

        expect(result).toHaveLength(1);
        expect(result[0].endsAt).toBe(futureDate.toISOString());
      });

      it('should include past cycles when requested', async () => {
        const mockCycles = [createMockCycle(), createMockCycle()];

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getCycles.mockResolvedValue(createMockConnection(mockCycles));

        const result = await teamAPI.getCycles('ENG', { includePast: true });

        expect(result).toHaveLength(2);
      });

      it('should throw error if team not found', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue(null);

        await expect(teamAPI.getCycles('INVALID')).rejects.toThrow('Team not found: INVALID');
      });
    });

    describe('getCurrentCycle', () => {
      it('should return the current active cycle', async () => {
        const now = new Date();
        const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const currentCycle = createMockCycle({
          startsAt: startDate.toISOString(),
          endsAt: endDate.toISOString(),
        });
        const futureCycle = createMockCycle({
          startsAt: endDate.toISOString(),
          endsAt: new Date(endDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getCycles.mockResolvedValue(
          createMockConnection([currentCycle, futureCycle]),
        );

        const result = await teamAPI.getCurrentCycle('ENG');

        expect(result).toEqual(currentCycle);
      });

      it('should return null if no current cycle', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getCycles.mockResolvedValue(createMockConnection([]));

        const result = await teamAPI.getCurrentCycle('ENG');

        expect(result).toBeNull();
      });
    });

    describe('getIssues', () => {
      it('should get team issues excluding completed by default', async () => {
        const mockIssues = [
          createMockIssue({ title: 'Issue 1' }),
          createMockIssue({ title: 'Issue 2' }),
        ];

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockIssueService.list.mockResolvedValue(createMockConnection(mockIssues));

        const result = await teamAPI.getIssues('ENG');

        expect(mockIssueService.list).toHaveBeenCalledWith(
          { teamId: 'team-123', state: { type: { neq: 'completed' } } },
          { first: 100 },
        );
        expect(result).toEqual(mockIssues);
      });

      it('should include completed issues when requested', async () => {
        const mockIssues = [createMockIssue()];

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockIssueService.list.mockResolvedValue(createMockConnection(mockIssues));

        const result = await teamAPI.getIssues('ENG', { includeCompleted: true, first: 50 });

        expect(mockIssueService.list).toHaveBeenCalledWith({ teamId: 'team-123' }, { first: 50 });
        expect(result).toEqual(mockIssues);
      });
    });
  });

  describe('Analytics Operations', () => {
    describe('getAnalytics', () => {
      it('should calculate comprehensive team analytics', async () => {
        const mockTeam = createMockTeam({ id: 'team-123', key: 'ENG', name: 'Engineering' });
        const mockMembers = [
          createMockUser({ id: 'user-1', name: 'User 1' }),
          createMockUser({ id: 'user-2', name: 'User 2' }),
        ];
        const mockIssues = [
          createMockIssue({
            assignee: { id: 'user-1' } as any,
            state: { type: 'completed' } as any,
            priority: 1,
            labels: { nodes: [{ name: 'bug' }, { name: 'urgent' }] } as any,
          }),
          createMockIssue({
            assignee: { id: 'user-1' } as any,
            state: { type: 'started' } as any,
            priority: 2,
            labels: { nodes: [{ name: 'feature' }] } as any,
          }),
          createMockIssue({
            assignee: { id: 'user-2' } as any,
            state: { type: 'started' } as any,
            priority: 1,
            labels: { nodes: [{ name: 'bug' }] } as any,
          }),
          createMockIssue({
            assignee: { id: 'user-2' } as any,
            state: { type: 'unstarted' } as any,
            priority: 3,
          }),
        ];

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.get.mockResolvedValue(mockTeam);
        mockTeamService.getMembers.mockResolvedValue(createMockConnection(mockMembers));
        mockIssueService.list.mockResolvedValue(createMockConnection(mockIssues));

        const result = await teamAPI.getAnalytics('ENG');

        expect(result.teamId).toBe('team-123');
        expect(result.teamKey).toBe('ENG');
        expect(result.teamName).toBe('Engineering');

        // Metrics
        expect(result.metrics.totalIssues).toBe(4);
        expect(result.metrics.completedIssues).toBe(1);
        expect(result.metrics.inProgressIssues).toBe(2);
        expect(result.metrics.openIssues).toBe(3);

        // Member stats
        expect(result.memberStats).toHaveLength(2);
        expect(result.memberStats[0].assignedIssues).toBe(2);
        expect(result.memberStats[0].completedIssues).toBe(1);
        expect(result.memberStats[1].assignedIssues).toBe(2);
        expect(result.memberStats[1].completedIssues).toBe(0);

        // Label distribution
        expect(result.labelDistribution.get('bug')).toBe(2);
        expect(result.labelDistribution.get('feature')).toBe(1);
        expect(result.labelDistribution.get('urgent')).toBe(1);

        // Priority distribution
        expect(result.priorityDistribution.get(1)).toBe(2);
        expect(result.priorityDistribution.get(2)).toBe(1);
        expect(result.priorityDistribution.get(3)).toBe(1);
      });

      it('should handle empty team analytics', async () => {
        const mockTeam = createMockTeam({ id: 'team-123', key: 'EMPTY', name: 'Empty Team' });

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.get.mockResolvedValue(mockTeam);
        mockTeamService.getMembers.mockResolvedValue(createMockConnection([]));
        mockIssueService.list.mockResolvedValue(createMockConnection([]));

        const result = await teamAPI.getAnalytics('EMPTY');

        expect(result.metrics.totalIssues).toBe(0);
        expect(result.memberStats).toHaveLength(0);
        expect(result.labelDistribution.size).toBe(0);
        expect(result.priorityDistribution.size).toBe(0);
      });

      it('should throw error if team not found', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue(null);

        await expect(teamAPI.getAnalytics('INVALID')).rejects.toThrow('Team not found: INVALID');
      });
    });

    describe('getVelocity', () => {
      it('should calculate velocity across multiple cycles', async () => {
        const mockCycles = [
          createMockCycle({ id: 'cycle-1' }),
          createMockCycle({ id: 'cycle-2' }),
          createMockCycle({ id: 'cycle-3' }),
        ];

        // Mock different completed issue counts for each cycle
        mockCycles[0].issues = jest.fn().mockResolvedValue({
          nodes: [createMockIssue(), createMockIssue(), createMockIssue()],
        });
        mockCycles[1].issues = jest.fn().mockResolvedValue({
          nodes: [
            createMockIssue(),
            createMockIssue(),
            createMockIssue(),
            createMockIssue(),
            createMockIssue(),
          ],
        });
        mockCycles[2].issues = jest.fn().mockResolvedValue({
          nodes: [createMockIssue(), createMockIssue(), createMockIssue(), createMockIssue()],
        });

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getCycles.mockResolvedValue(createMockConnection(mockCycles));

        const result = await teamAPI.getVelocity('ENG', 3);

        expect(result).toEqual([3, 5, 4]);
        expect(mockCycles[0].issues).toHaveBeenCalledWith({
          filter: { state: { type: { eq: 'completed' } } },
        });
      });

      it('should handle empty cycles', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getCycles.mockResolvedValue(createMockConnection([]));

        const result = await teamAPI.getVelocity('ENG', 3);

        expect(result).toEqual([]);
      });

      it('should use default cycle count', async () => {
        const mockCycles = Array(5)
          .fill(null)
          .map(() => {
            const cycle = createMockCycle();
            cycle.issues = jest.fn().mockResolvedValue({ nodes: [] });
            return cycle;
          });

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getCycles.mockResolvedValue(createMockConnection(mockCycles));

        const result = await teamAPI.getVelocity('ENG');

        expect(result).toHaveLength(3); // Default is 3 cycles
      });
    });
  });

  describe('Template Operations', () => {
    describe('applyTemplate', () => {
      it('should apply engineering template', async () => {
        const mockTeam = createMockTeam({ key: 'ENG', name: 'Engineering' });
        mockTeamService.create.mockResolvedValue(mockTeam);

        const result = await teamAPI.applyTemplate('engineering');

        expect(mockTeamService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'ENG',
            name: 'Engineering',
            cyclesEnabled: true,
            cycleDuration: 14,
            cycleStartDay: 1,
            triageEnabled: true,
          }),
        );
        expect(result).toEqual(mockTeam);
      });

      it('should apply support template', async () => {
        const mockTeam = createMockTeam({ key: 'SUP', name: 'Support' });
        mockTeamService.create.mockResolvedValue(mockTeam);

        const result = await teamAPI.applyTemplate('support');

        expect(mockTeamService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'SUP',
            name: 'Support',
            cyclesEnabled: false,
            triageEnabled: true,
          }),
        );
        expect(result).toEqual(mockTeam);
      });

      it('should apply template with overrides', async () => {
        const mockTeam = createMockTeam({ key: 'CUSTOM', name: 'Custom Team' });
        mockTeamService.create.mockResolvedValue(mockTeam);

        const result = await teamAPI.applyTemplate('engineering', {
          key: 'CUSTOM',
          name: 'Custom Team',
          cycleDuration: 7,
        });

        expect(mockTeamService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'CUSTOM',
            name: 'Custom Team',
            cycleDuration: 7,
            cyclesEnabled: true,
          }),
        );
        expect(result).toEqual(mockTeam);
      });

      it('should throw error for invalid template', async () => {
        await expect(teamAPI.applyTemplate('invalid')).rejects.toThrow(
          "Template 'invalid' not found. Available: engineering, support",
        );
      });

      it('should handle template application errors', async () => {
        mockTeamService.create.mockRejectedValue(new Error('Failed to create team'));

        await expect(teamAPI.applyTemplate('engineering')).rejects.toThrow('Failed to create team');
      });
    });

    describe('getAvailableTemplates', () => {
      it('should return all available templates', () => {
        const templates = TeamAPI.getAvailableTemplates();

        expect(templates).toHaveLength(2);
        expect(templates.map((t) => t.name)).toEqual(['engineering', 'support']);
        templates.forEach((template) => {
          expect(template).toHaveProperty('name');
          expect(template).toHaveProperty('template');
          expect(template.template).toHaveProperty('name');
          expect(template.template).toHaveProperty('description');
          expect(template.template).toHaveProperty('config');
        });
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('bulkCreate', () => {
      it('should create multiple teams successfully', async () => {
        const teamInputs = [
          { key: 'ENG', name: 'Engineering' },
          { key: 'PROD', name: 'Product' },
          { key: 'QA', name: 'Quality Assurance' },
        ];
        const mockTeams = teamInputs.map((input) => createMockTeam(input));

        mockTeamService.create
          .mockResolvedValueOnce(mockTeams[0])
          .mockResolvedValueOnce(mockTeams[1])
          .mockResolvedValueOnce(mockTeams[2]);

        const result = await teamAPI.bulkCreate(teamInputs);

        expect(result.success).toBe(true);
        expect(result.successCount).toBe(3);
        expect(result.failureCount).toBe(0);
        expect(result.succeeded).toEqual(mockTeams);
        expect(result.failed).toHaveLength(0);
      });

      it('should handle partial failures in bulk create', async () => {
        const teamInputs = [
          { key: 'ENG', name: 'Engineering' },
          { key: 'PROD', name: 'Product' },
          { key: 'QA', name: 'Quality Assurance' },
        ];

        mockTeamService.create
          .mockResolvedValueOnce(createMockTeam(teamInputs[0]))
          .mockRejectedValueOnce(new Error('Duplicate key'))
          .mockResolvedValueOnce(createMockTeam(teamInputs[2]));

        const result = await teamAPI.bulkCreate(teamInputs);

        expect(result.successCount).toBe(2);
        expect(result.failureCount).toBe(1);
        expect(result.succeeded).toHaveLength(2);
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].error).toBe('Duplicate key');
        expect(result.failed[0].item).toEqual(teamInputs[1]);
      });

      it('should handle complete failure in bulk create', async () => {
        const teamInputs = [{ key: 'ENG', name: 'Engineering' }];
        mockTeamService.create.mockRejectedValue(new Error('Database error'));

        const result = await teamAPI.bulkCreate(teamInputs);

        expect(result.success).toBe(false);
        expect(result.successCount).toBe(0);
        expect(result.failureCount).toBe(1);
        expect(result.failed[0].error).toBe('Database error');
      });
    });

    describe('bulkUpdate', () => {
      it('should update multiple teams successfully', async () => {
        const updates = [
          { id: 'team-1', data: { name: 'Updated Team 1' } },
          { id: 'team-2', data: { name: 'Updated Team 2' } },
          { id: 'team-3', data: { cycleDuration: 7 } },
        ];
        const mockTeams = updates.map((u) => createMockTeam(u.data));

        mockTeamService.update
          .mockResolvedValueOnce(mockTeams[0])
          .mockResolvedValueOnce(mockTeams[1])
          .mockResolvedValueOnce(mockTeams[2]);

        const result = await teamAPI.bulkUpdate(updates);

        expect(result.success).toBe(true);
        expect(result.successCount).toBe(3);
        expect(result.failureCount).toBe(0);
        expect(result.succeeded).toEqual(mockTeams);
      });

      it('should handle partial failures in bulk update', async () => {
        const updates = [
          { id: 'team-1', data: { name: 'Updated Team 1' } },
          { id: 'team-2', data: { name: 'Updated Team 2' } },
        ];

        mockTeamService.update
          .mockResolvedValueOnce(createMockTeam(updates[0].data))
          .mockRejectedValueOnce(new Error('Team not found'));

        const result = await teamAPI.bulkUpdate(updates);

        expect(result.successCount).toBe(1);
        expect(result.failureCount).toBe(1);
        expect(result.failed[0].error).toBe('Team not found');
      });
    });
  });

  describe('Utility Operations', () => {
    describe('cloneTeam', () => {
      it('should clone a team configuration', async () => {
        const sourceTeam = createMockTeam({
          key: 'ENG',
          name: 'Engineering',
          cyclesEnabled: true,
          cycleDuration: 14,
          cycleStartDay: 1,
          triageEnabled: true,
        });
        const newTeam = createMockTeam({ key: 'ENG2', name: 'Engineering 2' });

        mockTeamService.getByKey.mockResolvedValue(sourceTeam);
        mockTeamService.create.mockResolvedValue(newTeam);

        const result = await teamAPI.cloneTeam('ENG', {
          key: 'ENG2',
          name: 'Engineering 2',
        });

        expect(mockTeamService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'ENG2',
            name: 'Engineering 2',
            cyclesEnabled: true,
            cycleDuration: 14,
            cycleStartDay: 1,
            triageEnabled: true,
          }),
        );
        expect(result).toEqual(newTeam);
      });

      it('should throw error if source team not found', async () => {
        mockTeamService.getByKey.mockResolvedValue(null);

        await expect(teamAPI.cloneTeam('INVALID', { key: 'NEW', name: 'New' })).rejects.toThrow(
          'Source team not found: INVALID',
        );
      });

      it('should handle clone errors', async () => {
        const sourceTeam = createMockTeam({ key: 'ENG' });
        mockTeamService.getByKey.mockResolvedValue(sourceTeam);
        mockTeamService.create.mockRejectedValue(new Error('Clone failed'));

        await expect(teamAPI.cloneTeam('ENG', { key: 'NEW', name: 'New' })).rejects.toThrow(
          'Clone failed',
        );
      });
    });

    describe('validateTeamKey', () => {
      it('should validate valid team keys', () => {
        const validKeys = ['ENG', 'PROD', 'QA', 'A1', 'ABC12'];

        validKeys.forEach((key) => {
          const result = TeamAPI.validateTeamKey(key);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should reject empty team key', () => {
        const result = TeamAPI.validateTeamKey('');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Team key cannot be empty');
      });

      it('should reject team key that is too long', () => {
        const result = TeamAPI.validateTeamKey('TOOLONG');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Team key cannot exceed 5 characters');
      });

      it('should reject team key with lowercase letters', () => {
        const result = TeamAPI.validateTeamKey('eng');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Team key must contain only uppercase letters and numbers');
      });

      it('should reject team key with special characters', () => {
        const result = TeamAPI.validateTeamKey('E-NG');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Team key must contain only uppercase letters and numbers');
      });

      it('should provide multiple error messages', () => {
        const result = TeamAPI.validateTeamKey('too-long');

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });

    describe('search', () => {
      it('should search teams by key', async () => {
        const mockTeams = [
          createMockTeam({ key: 'ENG', name: 'Engineering' }),
          createMockTeam({ key: 'PROD', name: 'Product' }),
          createMockTeam({ key: 'SUP', name: 'Support' }),
        ];

        mockTeamService.list.mockResolvedValue(createMockConnection(mockTeams));

        const result = await teamAPI.search('eng');

        expect(result).toHaveLength(1);
        expect(result[0].key).toBe('ENG');
      });

      it('should search teams by name', async () => {
        const mockTeams = [
          createMockTeam({ key: 'ENG', name: 'Engineering' }),
          createMockTeam({ key: 'PROD', name: 'Product' }),
          createMockTeam({ key: 'SUP', name: 'Support' }),
        ];

        mockTeamService.list.mockResolvedValue(createMockConnection(mockTeams));

        const result = await teamAPI.search('product');

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Product');
      });

      it('should search teams with partial matches', async () => {
        const mockTeams = [
          createMockTeam({ key: 'ENG', name: 'Engineering' }),
          createMockTeam({ key: 'SENG', name: 'Senior Engineering' }),
          createMockTeam({ key: 'PROD', name: 'Product Engineering' }),
        ];

        mockTeamService.list.mockResolvedValue(createMockConnection(mockTeams));

        const result = await teamAPI.search('engineering');

        expect(result).toHaveLength(3);
      });

      it('should return empty array for no matches', async () => {
        const mockTeams = [createMockTeam({ key: 'ENG', name: 'Engineering' })];

        mockTeamService.list.mockResolvedValue(createMockConnection(mockTeams));

        const result = await teamAPI.search('xyz');

        expect(result).toHaveLength(0);
      });

      it('should handle search errors', async () => {
        mockTeamService.list.mockRejectedValue(new Error('Search failed'));

        await expect(teamAPI.search('test')).rejects.toThrow('Search failed');
      });
    });
  });

  describe('Error Scenarios', () => {
    describe('Service failures', () => {
      it('should propagate service errors', async () => {
        mockTeamService.get.mockRejectedValue(new Error('Service unavailable'));

        await expect(teamAPI.get('team-123')).rejects.toThrow('Service unavailable');
      });

      it('should handle null team in analytics', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.get.mockResolvedValue(null);

        await expect(teamAPI.getAnalytics('ENG')).rejects.toThrow('Team not found: ENG');
      });
    });

    describe('Input validation', () => {
      it('should handle invalid team keys in resource operations', async () => {
        mockTeamService.resolveTeamId.mockResolvedValue(null);

        const operations = [
          () => teamAPI.getMembers('INVALID'),
          () => teamAPI.getProjects('INVALID'),
          () => teamAPI.getCycles('INVALID'),
          () => teamAPI.getWorkflowStates('INVALID'),
          () => teamAPI.getLabels('INVALID'),
          () => teamAPI.getIssues('INVALID'),
          () => teamAPI.getAnalytics('INVALID'),
          () => teamAPI.getVelocity('INVALID'),
        ];

        for (const operation of operations) {
          await expect(operation()).rejects.toThrow('Team not found: INVALID');
        }
      });
    });

    describe('Edge cases', () => {
      it('should handle empty bulk operations', async () => {
        const result = await teamAPI.bulkCreate([]);

        expect(result.success).toBe(false);
        expect(result.successCount).toBe(0);
        expect(result.failureCount).toBe(0);
        expect(result.succeeded).toHaveLength(0);
        expect(result.failed).toHaveLength(0);
      });

      it('should handle teams with no issues in analytics', async () => {
        const mockTeam = createMockTeam({ id: 'team-123', key: 'EMPTY', name: 'Empty' });

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.get.mockResolvedValue(mockTeam);
        mockTeamService.getMembers.mockResolvedValue(createMockConnection([createMockUser()]));
        mockIssueService.list.mockResolvedValue(createMockConnection([]));

        const result = await teamAPI.getAnalytics('EMPTY');

        expect(result.metrics.totalIssues).toBe(0);
        expect(result.memberStats[0].assignedIssues).toBe(0);
        expect(result.memberStats[0].completedIssues).toBe(0);
      });

      it('should handle cycles with no issues for velocity', async () => {
        const mockCycle = createMockCycle();
        mockCycle.issues = jest.fn().mockResolvedValue({ nodes: [] });

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getCycles.mockResolvedValue(createMockConnection([mockCycle]));

        const result = await teamAPI.getVelocity('ENG', 1);

        expect(result).toEqual([0]);
      });
    });
  });
});
