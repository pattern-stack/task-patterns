import { TeamAPI, TEAM_TEMPLATES } from '@molecules/apis/team.api';
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
  createMockWorkflowState,
  createMockLabel,
  createMockIssue,
  createMockConnection 
} from '../../../__tests__/utils/mocks';

jest.mock('@features/team/service');
jest.mock('@features/user/service');
jest.mock('@features/project/service');
jest.mock('@features/cycle/service');
jest.mock('@features/workflow-state/service');
jest.mock('@features/label/service');
jest.mock('@features/issue/service');

describe('TeamAPI', () => {
  let teamAPI: TeamAPI;
  let mockClient: any;
  let mockTeamService: jest.Mocked<TeamService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockProjectService: jest.Mocked<ProjectService>;
  let mockCycleService: jest.Mocked<CycleService>;
  let mockWorkflowStateService: jest.Mocked<WorkflowStateService>;
  let mockLabelService: jest.Mocked<LabelService>;
  let mockIssueService: jest.Mocked<IssueService>;

  beforeEach(() => {
    mockClient = createMockLinearClient();
    teamAPI = new TeamAPI(mockClient);

    // Get mocked service instances
    mockTeamService = (TeamService as jest.MockedClass<typeof TeamService>).mock.instances[0] as jest.Mocked<TeamService>;
    mockUserService = (UserService as jest.MockedClass<typeof UserService>).mock.instances[0] as jest.Mocked<UserService>;
    mockProjectService = (ProjectService as jest.MockedClass<typeof ProjectService>).mock.instances[0] as jest.Mocked<ProjectService>;
    mockCycleService = (CycleService as jest.MockedClass<typeof CycleService>).mock.instances[0] as jest.Mocked<CycleService>;
    mockWorkflowStateService = (WorkflowStateService as jest.MockedClass<typeof WorkflowStateService>).mock.instances[0] as jest.Mocked<WorkflowStateService>;
    mockLabelService = (LabelService as jest.MockedClass<typeof LabelService>).mock.instances[0] as jest.Mocked<LabelService>;
    mockIssueService = (IssueService as jest.MockedClass<typeof IssueService>).mock.instances[0] as jest.Mocked<IssueService>;
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
    });

    describe('get', () => {
      it('should get a team by ID', async () => {
        const mockTeam = createMockTeam();
        mockTeamService.get.mockResolvedValue(mockTeam);

        const result = await teamAPI.get('team-123');

        expect(mockTeamService.get).toHaveBeenCalledWith('team-123');
        expect(result).toEqual(mockTeam);
      });

      it('should return null if team not found', async () => {
        mockTeamService.get.mockResolvedValue(null);

        const result = await teamAPI.get('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('getByKey', () => {
      it('should get a team by key', async () => {
        const mockTeam = createMockTeam({ key: 'ENG' });
        mockTeamService.getByKey.mockResolvedValue(mockTeam);

        const result = await teamAPI.getByKey('ENG');

        expect(mockTeamService.getByKey).toHaveBeenCalledWith('ENG');
        expect(result).toEqual(mockTeam);
      });
    });

    describe('list', () => {
      it('should list teams', async () => {
        const mockTeams = [
          createMockTeam({ key: 'ENG' }),
          createMockTeam({ key: 'PROD' })
        ];
        
        mockTeamService.list.mockResolvedValue(createMockConnection(mockTeams));

        const result = await teamAPI.list();

        expect(mockTeamService.list).toHaveBeenCalled();
        expect(result).toEqual(mockTeams);
      });
    });
  });

  describe('Member Operations', () => {
    describe('getMembers', () => {
      it('should get team members', async () => {
        const mockMembers = [
          createMockUser({ email: 'user1@test.com' }),
          createMockUser({ email: 'user2@test.com' })
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
  });

  describe('Resource Operations', () => {
    describe('getProjects', () => {
      it('should get team projects', async () => {
        const mockProjects = [
          createMockProject({ name: 'Project 1' }),
          createMockProject({ name: 'Project 2' })
        ];

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getProjects.mockResolvedValue(createMockConnection(mockProjects));

        const result = await teamAPI.getProjects('ENG');

        expect(mockTeamService.getProjects).toHaveBeenCalledWith('team-123');
        expect(result).toEqual(mockProjects);
      });
    });

    describe('getCycles', () => {
      it('should get team cycles', async () => {
        const now = new Date();
        const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const mockCycles = [
          createMockCycle({ startsAt: now.toISOString(), endsAt: futureDate.toISOString() }),
          createMockCycle({ startsAt: pastDate.toISOString(), endsAt: pastDate.toISOString() })
        ];

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getCycles.mockResolvedValue(createMockConnection(mockCycles));

        const result = await teamAPI.getCycles('ENG');

        expect(result).toHaveLength(1); // Only future cycles by default
        expect(result[0].endsAt).toBe(futureDate.toISOString());
      });
    });

    describe('getWorkflowStates', () => {
      it('should get team workflow states', async () => {
        const mockStates = [
          createMockWorkflowState({ name: 'Backlog' }),
          createMockWorkflowState({ name: 'In Progress' })
        ];

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getWorkflowStates.mockResolvedValue(createMockConnection(mockStates));

        const result = await teamAPI.getWorkflowStates('ENG');

        expect(mockTeamService.getWorkflowStates).toHaveBeenCalledWith('team-123');
        expect(result).toEqual(mockStates);
      });
    });

    describe('getLabels', () => {
      it('should get team labels', async () => {
        const mockLabels = [
          createMockLabel({ name: 'bug' }),
          createMockLabel({ name: 'feature' })
        ];

        mockTeamService.resolveTeamId.mockResolvedValue('team-123');
        mockTeamService.getLabels.mockResolvedValue(createMockConnection(mockLabels));

        const result = await teamAPI.getLabels('ENG');

        expect(mockTeamService.getLabels).toHaveBeenCalledWith('team-123');
        expect(result).toEqual(mockLabels);
      });
    });
  });

  describe('Template Operations', () => {
    describe('applyTemplate', () => {
      it('should apply a team template', async () => {
        const mockTeam = createMockTeam({ key: 'ENG', name: 'Engineering' });
        mockTeamService.create.mockResolvedValue(mockTeam);

        const result = await teamAPI.applyTemplate('engineering');

        expect(mockTeamService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'ENG',
            name: 'Engineering',
            cyclesEnabled: true
          })
        );
        expect(result).toEqual(mockTeam);
      });

      it('should throw error for invalid template', async () => {
        await expect(teamAPI.applyTemplate('invalid'))
          .rejects.toThrow("Template 'invalid' not found");
      });
    });

    describe('getAvailableTemplates', () => {
      it('should return available templates', () => {
        const templates = TeamAPI.getAvailableTemplates();

        expect(templates).toHaveLength(Object.keys(TEAM_TEMPLATES).length);
        expect(templates[0]).toHaveProperty('name');
        expect(templates[0]).toHaveProperty('template');
      });
    });
  });

  describe('Utility Operations', () => {
    describe('validateTeamKey', () => {
      it('should validate valid team keys', () => {
        expect(TeamAPI.validateTeamKey('ENG').valid).toBe(true);
        expect(TeamAPI.validateTeamKey('PROD').valid).toBe(true);
        expect(TeamAPI.validateTeamKey('A1').valid).toBe(true);
      });

      it('should reject invalid team keys', () => {
        expect(TeamAPI.validateTeamKey('').valid).toBe(false);
        expect(TeamAPI.validateTeamKey('TOOLONG').valid).toBe(false);
        expect(TeamAPI.validateTeamKey('eng').valid).toBe(false);
        expect(TeamAPI.validateTeamKey('E-NG').valid).toBe(false);
      });
    });

    describe('search', () => {
      it('should search teams by name or key', async () => {
        const mockTeams = [
          createMockTeam({ key: 'ENG', name: 'Engineering' }),
          createMockTeam({ key: 'PROD', name: 'Product' }),
          createMockTeam({ key: 'SUP', name: 'Support' })
        ];

        mockTeamService.list.mockResolvedValue(createMockConnection(mockTeams));

        const result = await teamAPI.search('eng');

        expect(result).toHaveLength(1);
        expect(result[0].key).toBe('ENG');
      });
    });
  });
});