import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { hierarchicalConfig } from '@atoms/config/hierarchical-config';
import { localConfigManager } from '@atoms/config/local-config';
import { projectDiscovery } from '@atoms/config/project-discovery';

// Mock the settings module to avoid file system dependencies in tests
jest.mock('@organisms/cli/settings', () => ({
  settings: {
    get: jest.fn(),
    getGlobal: jest.fn(),
  },
}));

// Mock the env config
jest.mock('@atoms/shared/config', () => ({
  config: {
    get: jest.fn(() => ({
      LINEAR_API_KEY: 'test-api-key',
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
    })),
  },
}));

describe('HierarchicalConfigManager', () => {
  let tempDir: string;
  let nestedDir: string;
  let mockSettings: any;

  beforeEach(() => {
    // Create temporary directory structure
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-hierarchical-test-'));
    nestedDir = path.join(tempDir, 'nested');
    fs.mkdirSync(nestedDir, { recursive: true });

    // Clear caches
    hierarchicalConfig.clearCache();
    localConfigManager.clearCache();
    projectDiscovery.clearCache();

    // Setup mock settings
    mockSettings = require('@organisms/cli/settings').settings;
    mockSettings.get.mockReset();
    mockSettings.getGlobal.mockReset();
  });

  afterEach(() => {
    // Clean up temporary files
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  describe('getMergedConfig', () => {
    it('should merge local, global, and env configs with correct priority', () => {
      // Setup local config in .tp/config.json
      const localConfig = {
        defaultTeam: 'LOCAL_TEAM',
        teamFilter: ['LOCAL', 'TEAM'],
        workspaceId: 'local-workspace',
      };
      fs.mkdirSync(path.join(tempDir, '.tp'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, '.tp', 'config.json'),
        JSON.stringify(localConfig, null, 2),
      );

      // Setup global config mock
      const globalImpl = (key: string) => {
        switch (key) {
          case 'defaultTeam':
            return 'GLOBAL_TEAM';
          case 'activeTeams':
            return ['GLOBAL', 'TEAM'];
          case 'backend':
            return 'linear';
          case 'linearApiKey':
            return 'global-api-key';
          default:
            return undefined;
        }
      };
      mockSettings.get.mockImplementation(globalImpl);
      mockSettings.getGlobal.mockImplementation(globalImpl);

      const { config, sources } = hierarchicalConfig.getMergedConfig(nestedDir);

      expect(config).toEqual({
        defaultTeam: 'LOCAL_TEAM', // Local overrides global
        teamFilter: ['LOCAL', 'TEAM'], // Local overrides global
        workspaceId: 'local-workspace', // Only in local
        apiKey: 'global-api-key', // From global (security)
        logLevel: 'error', // From env
        nodeEnv: 'test', // From env
        backend: 'linear', // From global
      });

      expect(sources.local).toEqual(localConfig);
      expect(sources.global).toBeDefined();
      expect(sources.env).toBeDefined();
    });

    it('should fallback to global when no local config exists', () => {
      // No local config - only global and env

      const globalImpl = (key: string) => {
        switch (key) {
          case 'defaultTeam':
            return 'GLOBAL_ONLY';
          case 'activeTeams':
            return ['GLOBAL'];
          case 'linearApiKey':
            return 'global-api-key';
          default:
            return undefined;
        }
      };
      mockSettings.get.mockImplementation(globalImpl);
      mockSettings.getGlobal.mockImplementation(globalImpl);

      const { config } = hierarchicalConfig.getMergedConfig(nestedDir);

      expect(config.defaultTeam).toBe('GLOBAL_ONLY');
      expect(config.teamFilter).toEqual(['GLOBAL']);
      expect(config.apiKey).toBe('global-api-key');
      expect(config.workspaceId).toBeUndefined();
    });

    it('should fallback to env when local and global are missing', () => {
      // No local or global config - only env

      mockSettings.get.mockReturnValue(undefined);

      const { config } = hierarchicalConfig.getMergedConfig(nestedDir);

      expect(config.apiKey).toBe('test-api-key'); // From env
      expect(config.logLevel).toBe('error'); // From env
      expect(config.nodeEnv).toBe('test'); // From env
      expect(config.defaultTeam).toBeUndefined();
      expect(config.teamFilter).toBeUndefined();
    });

    it('should cache merged config for performance', () => {
      const packageJson = {
        name: 'test-project',
        tp: { defaultTeam: 'CACHE_TEST' },
      };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const globalImpl = (key: string) => {
        return key === 'linearApiKey' ? 'api-key' : undefined;
      };
      mockSettings.get.mockImplementation(globalImpl);
      mockSettings.getGlobal.mockImplementation(globalImpl);

      // First call
      const result1 = hierarchicalConfig.getMergedConfig(nestedDir);

      // Second call with same directory should use cache
      const result2 = hierarchicalConfig.getMergedConfig(nestedDir);

      expect(result1.config).toEqual(result2.config);
      // Note: We can't easily test that settings.get isn't called again because
      // getConfigSources is called each time. The actual cache is for the merged result.
      expect(result1.config.defaultTeam).toBe('CACHE_TEST');
    });

    it('should validate merged configuration', () => {
      // This test verifies that schema validation works
      // We'll test this by providing valid config and expecting no errors
      const globalValidImpl = (key: string) => {
        return key === 'linearApiKey' ? 'valid-api-key' : undefined;
      };
      mockSettings.get.mockImplementation(globalValidImpl);
      mockSettings.getGlobal.mockImplementation(globalValidImpl);

      expect(() => {
        const result = hierarchicalConfig.getMergedConfig(nestedDir);
        expect(result.config.apiKey).toBe('valid-api-key');
      }).not.toThrow();
    });
  });

  describe('updateLocalSetting', () => {
    it('should update local setting and clear cache', () => {
      const packageJson = {
        name: 'test-project',
        tp: { defaultTeam: 'OLD' },
      };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      hierarchicalConfig.updateLocalSetting('defaultTeam', 'NEW', tempDir);

      const updatedPackageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
      );
      expect(updatedPackageJson.tp.defaultTeam).toBe('NEW');

      // Cache should be cleared (new config should be picked up)
      mockSettings.get.mockImplementation(() => undefined);
      mockSettings.getGlobal.mockImplementation(() => undefined);
      const { config } = hierarchicalConfig.getMergedConfig(tempDir);
      expect(config.defaultTeam).toBe('NEW');
    });
  });

  describe('updateGlobalSetting', () => {
    it('should update global setting and clear cache', () => {
      const mockSet = jest.fn();
      mockSettings.set = mockSet;

      hierarchicalConfig.updateGlobalSetting('defaultTeam', 'GLOBAL_NEW');

      expect(mockSet).toHaveBeenCalledWith('defaultTeam', 'GLOBAL_NEW');
    });

    it('should map teamFilter to activeTeams for backward compatibility', () => {
      const mockSet = jest.fn();
      mockSettings.set = mockSet;

      hierarchicalConfig.updateGlobalSetting('teamFilter', ['TEAM1', 'TEAM2']);

      expect(mockSet).toHaveBeenCalledWith('activeTeams', ['TEAM1', 'TEAM2']);
    });
  });

  describe('initLocalConfig', () => {
    it('should initialize local config and clear cache', () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        hierarchicalConfig.initLocalConfig({
          defaultTeam: 'INIT_TEST',
        });

        const packagePath = path.join(tempDir, 'package.json');
        expect(fs.existsSync(packagePath)).toBe(true);

        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        expect(packageJson.tp.defaultTeam).toBe('INIT_TEST');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('hasLocalConfig', () => {
    it('should return true when local config exists', () => {
      const packageJson = {
        name: 'test-project',
        tp: { defaultTeam: 'TEST' },
      };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      expect(hierarchicalConfig.hasLocalConfig(tempDir)).toBe(true);
    });

    it('should return false when no local config exists', () => {
      expect(hierarchicalConfig.hasLocalConfig(tempDir)).toBe(false);
    });
  });

  describe('getConfigWithSources', () => {
    it('should return config with source attribution', () => {
      const packageJson = {
        name: 'test-project',
        tp: {
          defaultTeam: 'LOCAL',
          teamFilter: ['LOCAL'],
        },
      };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const globalImpl = (key: string) => {
        return key === 'linearApiKey' ? 'global-key' : undefined;
      };
      mockSettings.get.mockImplementation(globalImpl);
      mockSettings.getGlobal.mockImplementation(globalImpl);

      const { config, sources } = hierarchicalConfig.getConfigWithSources(tempDir);

      expect(sources.defaultTeam).toBe('local');
      expect(sources.teamFilter).toBe('local');
      expect(sources.apiKey).toBe('global');
      expect(sources.logLevel).toBe('env');
      expect(sources.nodeEnv).toBe('env');
    });

    it('should attribute settings to correct source based on availability', () => {
      // Only global and env config
      const globalImpl2 = (key: string) => {
        switch (key) {
          case 'defaultTeam':
            return 'GLOBAL';
          case 'linearApiKey':
            return 'global-key';
          default:
            return undefined;
        }
      };
      mockSettings.get.mockImplementation(globalImpl2);
      mockSettings.getGlobal.mockImplementation(globalImpl2);

      const { sources } = hierarchicalConfig.getConfigWithSources(tempDir);

      expect(sources.defaultTeam).toBe('global');
      expect(sources.apiKey).toBe('global');
    });
  });

  describe('validateConfig', () => {
    it('should return valid when all required config is present', () => {
      const globalImpl3 = (key: string) => {
        return key === 'linearApiKey' ? 'valid-api-key' : undefined;
      };
      mockSettings.get.mockImplementation(globalImpl3);
      mockSettings.getGlobal.mockImplementation(globalImpl3);

      const { valid, errors } = hierarchicalConfig.validateConfig(tempDir);

      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('should return invalid when API key is missing', () => {
      // Mock environment config to not provide API key
      const mockEnvConfig = require('@atoms/shared/config');
      mockEnvConfig.config.get.mockReturnValueOnce({
        // No LINEAR_API_KEY provided
        NODE_ENV: 'test',
        LOG_LEVEL: 'info',
      });

      mockSettings.get.mockReturnValue(undefined);
      mockSettings.getGlobal.mockReturnValue(undefined);

      const { valid, errors } = hierarchicalConfig.validateConfig(tempDir);

      expect(valid).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid merged configuration');
    });

    it('should handle validation errors gracefully', () => {
      mockSettings.get.mockImplementation(() => {
        throw new Error('Settings error');
      });
      mockSettings.getGlobal.mockImplementation(() => {
        throw new Error('Settings error');
      });

      const { valid, errors } = hierarchicalConfig.validateConfig(tempDir);

      expect(valid).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Error');
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', () => {
      const packageJson = {
        name: 'test-project',
        tp: { defaultTeam: 'CACHE' },
      };
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const globalImpl4 = (key: string) => {
        return key === 'linearApiKey' ? 'valid-api-key' : undefined;
      };
      mockSettings.get.mockImplementation(globalImpl4);
      mockSettings.getGlobal.mockImplementation(globalImpl4);

      // Populate cache
      hierarchicalConfig.getMergedConfig(tempDir);

      // Clear cache
      hierarchicalConfig.clearCache();

      // Modify file
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(
          {
            name: 'test-project',
            tp: { defaultTeam: 'UPDATED' },
          },
          null,
          2,
        ),
      );

      // Should pick up new value (cache was cleared)
      const { config } = hierarchicalConfig.getMergedConfig(tempDir);
      expect(config.defaultTeam).toBe('UPDATED');
    });
  });
});
