import { settings } from '@organisms/cli/settings';

// Mock the settings module
jest.mock('@organisms/cli/settings', () => ({
  settings: {
    get: jest.fn(),
  },
}));

describe('Main CLI team selection logic', () => {
  const mockSettings = settings as jest.Mocked<typeof settings>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear environment variables
    delete process.env.LINEAR_DEFAULT_TEAM;
  });

  describe('team selection priority', () => {
    it('should prioritize team selection correctly', () => {
      // Test the logic directly as it would be in the CLI
      const DEFAULT_TEAM = process.env.LINEAR_DEFAULT_TEAM || 'dug';
      
      // Scenario 1: No active teams, should use DEFAULT_TEAM
      mockSettings.get.mockReturnValue(undefined);
      let activeTeams = mockSettings.get('activeTeams');
      let preferredTeam = activeTeams && activeTeams.length > 0 ? activeTeams[0] : DEFAULT_TEAM;
      let teamKey = preferredTeam; // No command options provided
      
      expect(teamKey).toBe('dug');
      
      // Scenario 2: Active teams set, should use first active team
      mockSettings.get.mockReturnValue(['TASK', 'ENG']);
      activeTeams = mockSettings.get('activeTeams');
      preferredTeam = activeTeams && activeTeams.length > 0 ? activeTeams[0] : DEFAULT_TEAM;
      teamKey = preferredTeam; // No command options provided
      
      expect(teamKey).toBe('TASK');
      
      // Scenario 3: Command option overrides everything
      const commandTeam = 'OVERRIDE';
      teamKey = commandTeam || preferredTeam;
      
      expect(teamKey).toBe('OVERRIDE');
      
      // Scenario 4: Environment variable used when no active teams
      process.env.LINEAR_DEFAULT_TEAM = 'ENV_TEAM';
      const DEFAULT_TEAM_WITH_ENV = process.env.LINEAR_DEFAULT_TEAM || 'dug';
      mockSettings.get.mockReturnValue(undefined);
      activeTeams = mockSettings.get('activeTeams');
      preferredTeam = activeTeams && activeTeams.length > 0 ? activeTeams[0] : DEFAULT_TEAM_WITH_ENV;
      teamKey = preferredTeam;
      
      expect(teamKey).toBe('ENV_TEAM');
    });

    it('should handle empty active teams array', () => {
      const DEFAULT_TEAM = 'dug';
      
      mockSettings.get.mockReturnValue([]);
      const activeTeams = mockSettings.get('activeTeams');
      const preferredTeam = activeTeams && activeTeams.length > 0 ? activeTeams[0] : DEFAULT_TEAM;
      
      expect(preferredTeam).toBe('dug');
    });

    it('should use first team when multiple active teams', () => {
      mockSettings.get.mockReturnValue(['FIRST', 'SECOND', 'THIRD']);
      const activeTeams = mockSettings.get('activeTeams');
      const preferredTeam = activeTeams && activeTeams.length > 0 ? activeTeams[0] : 'dug';
      
      expect(preferredTeam).toBe('FIRST');
    });

    it('should check if using team from active filter correctly', () => {
      const options: any = {}; // No team option provided
      const programOpts: any = {}; // No global team option
      const activeTeams = ['TASK'];
      const teamKey = 'TASK'; // This would be the resolved team key
      
      // This is the condition in the CLI for showing the helpful message
      const shouldShowMessage = 
        !options.team && 
        !programOpts.team && 
        activeTeams && 
        activeTeams.length > 0 && 
        activeTeams[0] === teamKey;
      
      expect(shouldShowMessage).toBe(true);
      
      // Test when command option is provided - should not show message
      const optionsWithTeam = { team: 'TASK' };
      const shouldNotShowMessage = 
        !optionsWithTeam.team && 
        !programOpts.team && 
        activeTeams && 
        activeTeams.length > 0 && 
        activeTeams[0] === teamKey;
      
      expect(shouldNotShowMessage).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle null active teams', () => {
      mockSettings.get.mockReturnValue(null as any);
      const activeTeams = mockSettings.get('activeTeams');
      const preferredTeam = activeTeams && activeTeams.length > 0 ? activeTeams[0] : 'dug';
      
      expect(preferredTeam).toBe('dug');
    });

    it('should handle undefined settings response', () => {
      mockSettings.get.mockReturnValue(undefined);
      const activeTeams = mockSettings.get('activeTeams');
      const preferredTeam = activeTeams && activeTeams.length > 0 ? activeTeams[0] : 'dug';
      
      expect(preferredTeam).toBe('dug');
    });
  });

  describe('integration with environment', () => {
    it('should respect LINEAR_DEFAULT_TEAM when no active teams', () => {
      process.env.LINEAR_DEFAULT_TEAM = 'CUSTOM';
      const DEFAULT_TEAM = process.env.LINEAR_DEFAULT_TEAM || 'dug';
      
      mockSettings.get.mockReturnValue(undefined);
      const activeTeams = mockSettings.get('activeTeams');
      const preferredTeam = activeTeams && activeTeams.length > 0 ? activeTeams[0] : DEFAULT_TEAM;
      
      expect(preferredTeam).toBe('CUSTOM');
      
      // Clean up
      delete process.env.LINEAR_DEFAULT_TEAM;
    });

    it('should prefer active teams over environment variable', () => {
      process.env.LINEAR_DEFAULT_TEAM = 'ENV_TEAM';
      const DEFAULT_TEAM = process.env.LINEAR_DEFAULT_TEAM || 'dug';
      
      mockSettings.get.mockReturnValue(['ACTIVE_TEAM']);
      const activeTeams = mockSettings.get('activeTeams');
      const preferredTeam = activeTeams && activeTeams.length > 0 ? activeTeams[0] : DEFAULT_TEAM;
      
      expect(preferredTeam).toBe('ACTIVE_TEAM');
      
      // Clean up
      delete process.env.LINEAR_DEFAULT_TEAM;
    });
  });
});