import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { localConfigManager } from '@atoms/config/local-config';
import { projectDiscovery } from '@atoms/config/project-discovery';

describe('LocalConfigManager', () => {
  let tempDir: string;
  let nestedDir: string;

  beforeEach(() => {
    // Create temporary directory structure
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-config-test-'));
    nestedDir = path.join(tempDir, 'nested');
    fs.mkdirSync(nestedDir, { recursive: true });

    // Clear caches
    localConfigManager.clearCache();
    projectDiscovery.clearCache();
  });

  afterEach(() => {
    // Clean up temporary files
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('readLocalConfig', () => {
    it('should read config from package.json tp section', () => {
      const packageJson = {
        name: 'test-project',
        tp: {
          defaultTeam: 'TEST',
          teamFilter: ['TEST', 'DEV'],
          workspaceId: 'workspace-123',
        },
      };

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const config = localConfigManager.readLocalConfig(nestedDir);

      expect(config).toEqual({
        defaultTeam: 'TEST',
        teamFilter: ['TEST', 'DEV'],
        workspaceId: 'workspace-123',
      });
    });

    it('should read config from .tp-config.json', () => {
      const tpConfig = {
        defaultTeam: 'MOBILE',
        teamFilter: ['MOBILE', 'API'],
      };

      fs.writeFileSync(path.join(tempDir, '.tp-config.json'), JSON.stringify(tpConfig, null, 2));

      const config = localConfigManager.readLocalConfig(nestedDir);

      expect(config).toEqual({
        defaultTeam: 'MOBILE',
        teamFilter: ['MOBILE', 'API'],
      });
    });

    it('should return null if no config found', () => {
      const config = localConfigManager.readLocalConfig(nestedDir);
      expect(config).toBeNull();
    });

    it('should handle empty tp section in package.json', () => {
      const packageJson = {
        name: 'test-project',
        tp: {},
      };

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const config = localConfigManager.readLocalConfig(nestedDir);

      expect(config).toEqual({});
    });

    it('should validate config schema and warn on invalid config', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const invalidConfig = {
        defaultTeam: 123, // Should be string
        teamFilter: 'not-array', // Should be array
        invalidKey: 'value', // Not allowed
      };

      fs.writeFileSync(
        path.join(tempDir, '.tp-config.json'),
        JSON.stringify(invalidConfig, null, 2),
      );

      const config = localConfigManager.readLocalConfig(nestedDir);

      expect(config).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Invalid local config'),
        expect.any(Object),
      );

      consoleSpy.mockRestore();
    });

    it('should cache config for repeated reads', () => {
      const packageJson = {
        name: 'test-project',
        tp: { defaultTeam: 'TEST' },
      };

      const packagePath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

      // First read
      const config1 = localConfigManager.readLocalConfig(nestedDir);

      // Modify file to test cache
      fs.writeFileSync(
        packagePath,
        JSON.stringify({ name: 'modified', tp: { defaultTeam: 'MODIFIED' } }, null, 2),
      );

      // Second read should return cached value
      const config2 = localConfigManager.readLocalConfig(nestedDir);

      expect(config1).toEqual(config2);
      expect(config2?.defaultTeam).toBe('TEST'); // Not 'MODIFIED'
    });
  });

  describe('writeLocalConfig', () => {
    it('should write config to package.json when it exists', () => {
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
      };

      const packagePath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

      const config = {
        defaultTeam: 'WRITE_TEST',
        teamFilter: ['WRITE', 'TEST'],
      };

      localConfigManager.writeLocalConfig(config, tempDir);

      const updatedPackageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      expect(updatedPackageJson.tp).toEqual(config);
      expect(updatedPackageJson.name).toBe('test-project'); // Preserve existing content
    });

    it('should create .tp-config.json when no package.json exists', () => {
      const config = {
        defaultTeam: 'STANDALONE',
        workspaceId: 'workspace-456',
      };

      localConfigManager.writeLocalConfig(config, tempDir, '.tp-config.json');

      const configPath = path.join(tempDir, '.tp-config.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const writtenConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(writtenConfig).toEqual(config);
    });

    it('should create new package.json if none exists and type is package.json', () => {
      const config = {
        defaultTeam: 'NEW_PROJECT',
      };

      localConfigManager.writeLocalConfig(config, tempDir, 'package.json');

      const packagePath = path.join(tempDir, 'package.json');
      expect(fs.existsSync(packagePath)).toBe(true);

      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      expect(packageJson.tp).toEqual(config);
    });

    it('should validate config before writing', () => {
      const invalidConfig = {
        defaultTeam: 123, // Should be string
      } as any;

      expect(() => {
        localConfigManager.writeLocalConfig(invalidConfig, tempDir);
      }).toThrow('Failed to write local config');
    });

    it('should update cache after writing', () => {
      const config = {
        defaultTeam: 'CACHE_TEST',
      };

      localConfigManager.writeLocalConfig(config, tempDir, '.tp-config.json');

      // Reading should return the written config from cache
      const readConfig = localConfigManager.readLocalConfig(tempDir);
      expect(readConfig).toEqual(config);
    });
  });

  describe('initLocalConfig', () => {
    it('should initialize config in empty directory', () => {
      const config = {
        defaultTeam: 'INIT',
        teamFilter: ['INIT'],
      };

      // Change to temp directory for init
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        localConfigManager.initLocalConfig(config);

        const packagePath = path.join(tempDir, 'package.json');
        expect(fs.existsSync(packagePath)).toBe(true);

        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        expect(packageJson.tp).toEqual(config);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should throw error if config already exists', () => {
      const packageJson = {
        name: 'existing',
        tp: { defaultTeam: 'EXISTING' },
      };

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        expect(() => {
          localConfigManager.initLocalConfig();
        }).toThrow('Project already has a tp configuration');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('updateLocalSetting', () => {
    it('should update existing config setting', () => {
      const packageJson = {
        name: 'test-project',
        tp: {
          defaultTeam: 'OLD',
          teamFilter: ['OLD'],
        },
      };

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      localConfigManager.updateLocalSetting('defaultTeam', 'NEW', nestedDir);

      const updatedPackageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
      );
      expect(updatedPackageJson.tp.defaultTeam).toBe('NEW');
      expect(updatedPackageJson.tp.teamFilter).toEqual(['OLD']); // Preserve other settings
    });

    it('should remove setting when value is undefined', () => {
      const packageJson = {
        name: 'test-project',
        tp: {
          defaultTeam: 'REMOVE_ME',
          teamFilter: ['KEEP'],
        },
      };

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      localConfigManager.updateLocalSetting('defaultTeam', undefined, nestedDir);

      const updatedPackageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'),
      );
      expect(updatedPackageJson.tp.defaultTeam).toBeUndefined();
      expect(updatedPackageJson.tp.teamFilter).toEqual(['KEEP']);
    });
  });

  describe('getConfigPath', () => {
    it('should return config path when found', () => {
      const packageJson = {
        name: 'test-project',
        tp: { defaultTeam: 'TEST' },
      };

      const packagePath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

      const configPath = localConfigManager.getConfigPath(nestedDir);
      expect(configPath).toBe(packagePath);
    });

    it('should return null when no config found', () => {
      const configPath = localConfigManager.getConfigPath(nestedDir);
      expect(configPath).toBeNull();
    });
  });
});
