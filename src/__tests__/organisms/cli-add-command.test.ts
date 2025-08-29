import { jest } from '@jest/globals';

// Mock spinner to keep output clean
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    info: jest.fn().mockReturnThis(),
  }));
});

// Mocks we control per test
const mockTeams: any[] = [
  { id: 't1', key: 'TASK', name: 'Task Patterns' },
  { id: 't2', key: 'DEV', name: 'Development' },
  { id: 't3', key: 'QA', name: 'Quality' },
  { id: 't4', key: 'MOBILE', name: 'Mobile' },
  { id: 't5', key: 'API', name: 'API' },
  { id: 't6', key: 'BACKEND', name: 'Backend' },
];

// Module mocks
jest.mock('@atoms/client/linear-client', () => ({
  linearClient: {
    getClient: jest.fn(() => ({
      client: { request: jest.fn() },
      teams: jest.fn(async () => ({ nodes: mockTeams })),
      issue: jest.fn(),
    })),
  },
}));

const mockCreate = jest.fn(async (input: any) => ({
  id: 'i1',
  identifier: `${(mockTeams.find(t => t.id === input.teamId)?.key || 'XX')}-101`,
  title: input.title,
  url: 'https://linear.app/x/y/z',
}));

jest.mock('@molecules/issue.api', () => ({
  IssueAPI: jest.fn().mockImplementation(() => ({
    create: mockCreate,
  })),
}));

// Default enhanced config mock (overridden per test)
let mergedConfig: any = { defaultTeam: undefined, teamFilter: undefined };
jest.mock('@atoms/config', () => ({
  enhancedConfig: {
    getMergedConfig: jest.fn(() => mergedConfig),
  },
}));

describe('tp add team selection behavior', () => {
  const originalArgv = process.argv.slice();
  const originalEnv = { ...process.env };
  let logSpy: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mergedConfig = { defaultTeam: undefined, teamFilter: undefined };
    process.env = { ...originalEnv };
    delete process.env.LINEAR_DEFAULT_TEAM;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = originalArgv.slice();
    process.env = { ...originalEnv };
    logSpy.mockRestore();
  });

  async function runCliWithArgs(args: string[]) {
    // Run CLI in isolated module context with controlled argv
    jest.isolateModules(() => {
      process.argv = ['node', 'tp', ...args];
      // Import side-effect CLI which parses argv at import
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../organisms/cli/index');
    });
    // Let async command handlers run
    await new Promise((r) => setImmediate(r));
  }

  it('uses command flag over config (DEV)', async () => {
    mergedConfig.teamFilter = ['TASK'];
    await runCliWithArgs(['add', 'Test issue', '--team', 'DEV']);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 't2' })
    );
    // Should not print filter message when explicit team provided
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Using team from filter'));
  });

  it('uses local/global teamFilter when no flag and prints helpful message', async () => {
    mergedConfig.teamFilter = ['MOBILE'];
    await runCliWithArgs(['add', 'Local config issue']);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 't4' })
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Using team from filter'));
  });

  it('falls back to env LINEAR_DEFAULT_TEAM when no teamFilter present', async () => {
    mergedConfig.teamFilter = undefined;
    mergedConfig.defaultTeam = undefined;
    process.env.LINEAR_DEFAULT_TEAM = 'API';
    await runCliWithArgs(['add', 'Env fallback issue']);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 't5' })
    );
  });

  it('uses first team from multiple teamFilter entries and shows message', async () => {
    mergedConfig.teamFilter = ['TASK', 'DEV', 'QA'];
    await runCliWithArgs(['add', 'Multiple filter issue']);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 't1' })
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Using team from filter:'));
  });

  it('handles invalid team by falling back to first available team with warning', async () => {
    mergedConfig.teamFilter = ['NONEXIST'];
    await runCliWithArgs(['add', 'Invalid team fallback']);
    // Fallback uses first node (t1)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 't1' })
    );
  });

  it('throws when no teams exist in workspace', async () => {
    // Remock linear client teams() to return empty list just for this test
    const { linearClient } = require('@atoms/client/linear-client');
    (linearClient.getClient as jest.Mock).mockReturnValueOnce({
      client: { request: jest.fn() },
      teams: jest.fn(async () => ({ nodes: [] })),
    });

    const errorSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runCliWithArgs(['add', 'No teams available']);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error:')
    );
    errorSpy.mockRestore();
  });
});
