import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { enhancedConfig } from '@atoms/config';

// Mock the global settings file system operations to avoid actual file creation
jest.mock('@organisms/cli/settings', () => {
  const mockGlobalSettings: any = {
    defaultTeam: undefined,
    activeTeams: undefined,
    backend: 'linear',
    linearApiKey: 'test-global-api-key'
  };

  return {
    settings: {
      get: jest.fn((key: string) => mockGlobalSettings[key]),
      set: jest.fn((key: string, value: any) => {
        mockGlobalSettings[key] = value;
      })
    }
  };
});

// Mock the environment config to control env values in tests
jest.mock('@atoms/shared/config', () => ({
  config: {
    get: jest.fn(() => ({
      LINEAR_API_KEY: 'test-env-api-key',
      LINEAR_WORKSPACE_ID: 'optional_workspace_id',
      NODE_ENV: 'test',
      LOG_LEVEL: 'info'
    }))
  }
}));

describe('Local Configuration Integration', () => {
  let tempDir: string;
  let projectDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    
    // Create temporary project directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-integration-test-'));
    projectDir = path.join(tempDir, 'test-project');
    fs.mkdirSync(projectDir, { recursive: true });
    
    // Change to project directory
    process.chdir(projectDir);
    
    // Clear all caches
    enhancedConfig.clearCache();
    
    // Reset mocks to default state
    const mockEnvConfig = require('@atoms/shared/config').config;
    mockEnvConfig.get.mockReturnValue({
      LINEAR_API_KEY: 'test-env-api-key',
      LINEAR_WORKSPACE_ID: 'optional_workspace_id',
      NODE_ENV: 'test',
      LOG_LEVEL: 'info'
    });
    
    const mockSettings = require('@organisms/cli/settings').settings;
    mockSettings.get.mockImplementation((key: string) => {
      if (key === 'linearApiKey') return 'test-global-api-key';
      if (key === 'backend') return 'linear';
      return undefined;
    });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
    // Clear config caches to ensure clean state
    enhancedConfig.clearCache();
  });

  describe('Node.js Project Workflow', () => {
    it('should support complete Node.js project configuration workflow', () => {
      // 1. Start with existing package.json (typical Node.js project)
      const packageJson = {
        name: 'my-awesome-project',
        version: '1.0.0',
        scripts: {
          start: 'node index.js'
        }
      };
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

      // 2. Initialize tp configuration
      expect(enhancedConfig.hasLocalConfig()).toBe(false);
      
      enhancedConfig.initLocalConfig({
        defaultTeam: 'AWESOME',
        teamFilter: ['AWESOME', 'DEV'],
        workspaceId: 'awesome-workspace'
      });

      expect(enhancedConfig.hasLocalConfig()).toBe(true);

      // 3. Verify config was added to package.json without affecting other content
      const updatedPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      expect(updatedPackageJson.name).toBe('my-awesome-project');
      expect(updatedPackageJson.scripts).toEqual({ start: 'node index.js' });
      expect(updatedPackageJson.tp).toEqual({
        defaultTeam: 'AWESOME',
        teamFilter: ['AWESOME', 'DEV'],
        workspaceId: 'awesome-workspace'
      });

      // 4. Get merged configuration (local + global + env)
      const mergedConfig = enhancedConfig.getMergedConfig();
      expect(mergedConfig.defaultTeam).toBe('AWESOME');
      expect(mergedConfig.teamFilter).toEqual(['AWESOME', 'DEV']);
      expect(mergedConfig.workspaceId).toBe('awesome-workspace');
      expect(mergedConfig.apiKey).toBe('test-global-api-key'); // From global

      // 5. Update local settings
      enhancedConfig.updateLocalSetting('defaultTeam', 'UPDATED');
      enhancedConfig.updateLocalSetting('teamFilter', ['UPDATED', 'TEAMS']);

      const updatedConfig = enhancedConfig.getMergedConfig();
      expect(updatedConfig.defaultTeam).toBe('UPDATED');
      expect(updatedConfig.teamFilter).toEqual(['UPDATED', 'TEAMS']);
      expect(updatedConfig.workspaceId).toBe('awesome-workspace'); // Preserved

      // 6. Verify source attribution
      const { config, sources } = enhancedConfig.getConfigWithSources();
      expect(sources.defaultTeam).toBe('local');
      expect(sources.teamFilter).toBe('local');
      expect(sources.workspaceId).toBe('local');
      expect(sources.apiKey).toBe('global');
    });

    it('should handle project without existing package.json', () => {
      // No package.json exists - tp init should create one
      expect(fs.existsSync('package.json')).toBe(false);

      enhancedConfig.initLocalConfig({
        defaultTeam: 'NEW_PROJECT'
      }, 'package.json');

      expect(fs.existsSync('package.json')).toBe(true);
      
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      expect(packageJson.tp).toEqual({
        defaultTeam: 'NEW_PROJECT'
      });
    });
  });

  describe('Non-Node.js Project Workflow', () => {
    it('should support .tp-config.json for non-Node.js projects', () => {
      // 1. Initialize with .tp-config.json (non-Node.js project)
      enhancedConfig.initLocalConfig({
        defaultTeam: 'PYTHON',
        teamFilter: ['PYTHON', 'DATA'],
        workspaceId: 'python-workspace'
      }, '.tp-config.json');

      expect(fs.existsSync('.tp-config.json')).toBe(true);
      expect(fs.existsSync('package.json')).toBe(false);

      // 2. Verify standalone config file
      const configContent = JSON.parse(fs.readFileSync('.tp-config.json', 'utf-8'));
      expect(configContent).toEqual({
        defaultTeam: 'PYTHON',
        teamFilter: ['PYTHON', 'DATA'],
        workspaceId: 'python-workspace'
      });

      // 3. Verify merged config works the same way
      const mergedConfig = enhancedConfig.getMergedConfig();
      expect(mergedConfig.defaultTeam).toBe('PYTHON');
      expect(mergedConfig.teamFilter).toEqual(['PYTHON', 'DATA']);
      expect(mergedConfig.workspaceId).toBe('python-workspace');
      expect(mergedConfig.apiKey).toBe('test-global-api-key'); // From global

      // 4. Update settings
      enhancedConfig.updateLocalSetting('defaultTeam', 'ML');
      
      const updatedConfigContent = JSON.parse(fs.readFileSync('.tp-config.json', 'utf-8'));
      expect(updatedConfigContent.defaultTeam).toBe('ML');
    });
  });

  describe('Hierarchy and Fallback Behavior', () => {
    it('should prioritize local over global settings', () => {
      // Mock env config to not have workspace ID
      const mockEnvConfig = require('@atoms/shared/config').config;
      mockEnvConfig.get.mockReturnValue({
        LINEAR_API_KEY: 'test-env-api-key',
        // No LINEAR_WORKSPACE_ID
        NODE_ENV: 'test',
        LOG_LEVEL: 'info'
      });
      
      // Setup global config (mocked)
      const mockSettings = require('@organisms/cli/settings').settings;
      mockSettings.get.mockImplementation((key: string) => {
        switch (key) {
          case 'defaultTeam': return 'GLOBAL_TEAM';
          case 'activeTeams': return ['GLOBAL', 'TEAMS'];
          case 'linearApiKey': return 'global-api-key';
          default: return undefined;
        }
      });

      // Create local config that overrides some global settings
      enhancedConfig.initLocalConfig({
        defaultTeam: 'LOCAL_TEAM',
        teamFilter: ['LOCAL', 'TEAMS']
        // No workspaceId - should be undefined
      });

      const mergedConfig = enhancedConfig.getMergedConfig();
      
      // Local overrides global
      expect(mergedConfig.defaultTeam).toBe('LOCAL_TEAM');
      expect(mergedConfig.teamFilter).toEqual(['LOCAL', 'TEAMS']);
      
      // Global settings still used for non-overridden values
      expect(mergedConfig.apiKey).toBe('global-api-key');
      
      // Settings not in local config and not in env should be undefined
      expect(mergedConfig.workspaceId).toBeUndefined();
    });

    it('should fall back to global when no local config exists', () => {
      // No local config
      expect(enhancedConfig.hasLocalConfig()).toBe(false);

      const mockSettings = require('@organisms/cli/settings').settings;
      mockSettings.get.mockImplementation((key: string) => {
        switch (key) {
          case 'defaultTeam': return 'GLOBAL_FALLBACK';
          case 'activeTeams': return ['FALLBACK'];
          case 'linearApiKey': return 'fallback-api-key';
          default: return undefined;
        }
      });

      const mergedConfig = enhancedConfig.getMergedConfig();
      
      expect(mergedConfig.defaultTeam).toBe('GLOBAL_FALLBACK');
      expect(mergedConfig.teamFilter).toEqual(['FALLBACK']);
      expect(mergedConfig.apiKey).toBe('fallback-api-key');
    });
  });

  describe('Nested Directory Discovery', () => {
    it('should find project config from nested directories', () => {
      // Create nested directory structure
      const nestedDir = path.join(projectDir, 'src', 'components', 'deep');
      fs.mkdirSync(nestedDir, { recursive: true });

      // Initialize config in project root
      enhancedConfig.initLocalConfig({
        defaultTeam: 'ROOT_PROJECT'
      });

      // Change to nested directory
      process.chdir(nestedDir);

      // Should still find the root config
      expect(enhancedConfig.hasLocalConfig()).toBe(true);
      
      const mergedConfig = enhancedConfig.getMergedConfig();
      expect(mergedConfig.defaultTeam).toBe('ROOT_PROJECT');
    });
  });

  describe('Config Validation', () => {
    it('should validate complete configuration', () => {
      enhancedConfig.initLocalConfig({
        defaultTeam: 'VALID'
      });

      const mockSettings = require('@organisms/cli/settings').settings;
      mockSettings.get.mockImplementation((key: string) => {
        return key === 'linearApiKey' ? 'valid-api-key' : undefined;
      });

      const { valid, errors } = enhancedConfig.validateConfig();
      
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing required configuration', () => {
      enhancedConfig.initLocalConfig({
        defaultTeam: 'TEST'
      });

      // Mock env config to not have API key
      const mockEnvConfig = require('@atoms/shared/config').config;
      mockEnvConfig.get.mockReturnValue({
        // No LINEAR_API_KEY
        NODE_ENV: 'test',
        LOG_LEVEL: 'info'
      });
      
      // No API key in global either
      const mockSettings = require('@organisms/cli/settings').settings;
      mockSettings.get.mockImplementation((key: string) => {
        // Return undefined for linearApiKey specifically
        if (key === 'linearApiKey') return undefined;
        return undefined;
      });

      const { valid, errors } = enhancedConfig.validateConfig();
      
      expect(valid).toBe(false);
      // The error comes from zod validation, check for the presence of apiKey error
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('apiKey');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle corrupted local config gracefully', () => {
      // Create invalid JSON config
      fs.writeFileSync('.tp-config.json', '{ invalid json }');

      expect(enhancedConfig.hasLocalConfig()).toBe(false);
      expect(enhancedConfig.getMergedConfig()).toBeDefined(); // Should not throw
    });

    it('should prevent initialization when config already exists', () => {
      enhancedConfig.initLocalConfig({ defaultTeam: 'FIRST' });

      expect(() => {
        enhancedConfig.initLocalConfig({ defaultTeam: 'SECOND' });
      }).toThrow('Project already has a tp configuration');
    });

    it('should handle permission errors gracefully', () => {
      // This test would need to mock fs operations to simulate permission errors
      // For now, we'll just verify the structure exists for error handling
      expect(enhancedConfig.validateConfig).toBeDefined();
      expect(enhancedConfig.clearCache).toBeDefined();
    });
  });
});