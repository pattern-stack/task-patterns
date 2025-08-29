import fs from 'fs';
import path from 'path';
import os from 'os';

// Keep output tidy
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    info: jest.fn().mockReturnThis(),
  }));
});

// Linear + IssueAPI mocks
const mockTeams: any[] = [
  { id: 't1', key: 'TASK', name: 'Task Patterns' },
  { id: 't2', key: 'DEV', name: 'Development' },
  { id: 't3', key: 'QA', name: 'Quality' },
  { id: 't4', key: 'MOBILE', name: 'Mobile' },
  { id: 't5', key: 'API', name: 'API' },
  { id: 't6', key: 'BACKEND', name: 'Backend' },
];

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
  identifier: `${(mockTeams.find(t => t.id === input.teamId)?.key || 'XX')}-301`,
  title: input.title,
  url: 'https://linear.app/x/y/z',
}));

jest.mock('@molecules/issue.api', () => ({
  IssueAPI: jest.fn().mockImplementation(() => ({
    create: mockCreate,
  })),
}));

// Ensure global settings do not interfere with tests
jest.mock('@organisms/cli/settings', () => ({
  settings: {
    get: jest.fn(() => undefined),
    set: jest.fn(),
    addActiveTeams: jest.fn(),
    removeActiveTeams: jest.fn(),
    clearTeamFilters: jest.fn(),
    show: jest.fn(),
  },
}));

// Use real hierarchical/enhanced config (no mocks) to read file-based config
import { enhancedConfig } from '@atoms/config';

describe('Integration: team filter via real local config', () => {
  const originalCwd = process.cwd();
  const originalEnv = { ...process.env };
  let tmpDir: string;
  let logSpy: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.LINEAR_DEFAULT_TEAM;
    // Create temp dir inside repo to avoid sandbox restrictions
    const base = path.join(process.cwd(), 'src', '__tests__', 'tmp-int');
    fs.mkdirSync(base, { recursive: true });
    tmpDir = fs.mkdtempSync(path.join(base, 'team-filter-'));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore cwd
    process.chdir(originalCwd);
    // Cleanup temp dir
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    logSpy.mockRestore();
    process.env = { ...originalEnv };
  });

  async function runCLI(args: string[]) {
    // Ensure caches are clear and cwd is set before importing CLI
    enhancedConfig.clearCache();
    process.chdir(tmpDir);
    jest.isolateModules(() => {
      process.argv = ['node', 'tp', ...args];
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../organisms/cli/index');
    });
    await new Promise((r) => setImmediate(r));
  }

  function writeLocalConfig(json: any) {
    const configPath = path.join(tmpDir, '.tp-config.json');
    fs.writeFileSync(configPath, JSON.stringify(json, null, 2), 'utf-8');
  }

  it('uses team from .tp-config.json and prints helpful message', async () => {
    writeLocalConfig({ teamFilter: ['MOBILE'] });
    await runCLI(['add', 'Integration local filter']);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 't4' })
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Using team from filter'));
  });

  it('falls back gracefully when .tp-config.json has invalid team', async () => {
    writeLocalConfig({ teamFilter: ['NOPE'] });
    await runCLI(['add', 'Integration invalid team fallback']);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 't1' }) // first available team
    );
    // Warning message about not found
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  it('uses env LINEAR_DEFAULT_TEAM when no local config exists', async () => {
    process.env.LINEAR_DEFAULT_TEAM = 'API';
    await runCLI(['add', 'Integration env fallback']);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 't5' })
    );
  });
});
