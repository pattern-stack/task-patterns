import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { projectDiscovery } from '@atoms/config/project-discovery';

describe('ProjectDiscovery', () => {
  let tempDir: string;
  let nestedDir: string;

  beforeEach(() => {
    // Create temporary directory structure
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-test-'));
    nestedDir = path.join(tempDir, 'nested', 'deeply');
    fs.mkdirSync(nestedDir, { recursive: true });

    // Clear cache before each test
    projectDiscovery.clearCache();
  });

  afterEach(() => {
    // Clean up temporary files
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('findProjectRoot', () => {
    it('should find package.json with tp section', () => {
      const packageJson = {
        name: 'test-project',
        tp: {
          defaultTeam: 'TEST',
          teamFilter: ['TEST', 'DEV'],
        },
      };

      const packagePath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

      const result = projectDiscovery.findProjectRoot(nestedDir);

      expect(result).toEqual({
        path: tempDir,
        configType: 'package.json',
        configPath: packagePath,
      });
    });

    it('should find .tp-config.json file', () => {
      const tpConfig = {
        defaultTeam: 'MOBILE',
        teamFilter: ['MOBILE', 'API'],
      };

      const configPath = path.join(tempDir, '.tp-config.json');
      fs.writeFileSync(configPath, JSON.stringify(tpConfig, null, 2));

      const result = projectDiscovery.findProjectRoot(nestedDir);

      expect(result).toEqual({
        path: tempDir,
        configType: '.tp-config.json',
        configPath: configPath,
      });
    });

    it('should prefer package.json over .tp-config.json', () => {
      const packageJson = {
        name: 'test-project',
        tp: { defaultTeam: 'PACKAGE' },
      };
      const tpConfig = { defaultTeam: 'CONFIG' };

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      fs.writeFileSync(path.join(tempDir, '.tp-config.json'), JSON.stringify(tpConfig, null, 2));

      const result = projectDiscovery.findProjectRoot(nestedDir);

      expect(result?.configPath).toContain('package.json');
    });

    it('should ignore package.json without tp section', () => {
      const packageJson = {
        name: 'test-project',
        dependencies: {},
      };
      const tpConfig = { defaultTeam: 'CONFIG' };

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      fs.writeFileSync(path.join(tempDir, '.tp-config.json'), JSON.stringify(tpConfig, null, 2));

      const result = projectDiscovery.findProjectRoot(nestedDir);

      expect(result?.configPath).toContain('.tp-config.json');
    });

    it('should return null if no config found', () => {
      const result = projectDiscovery.findProjectRoot(nestedDir);
      expect(result).toBeNull();
    });

    it('should handle invalid JSON files gracefully', () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), 'invalid json');
      fs.writeFileSync(path.join(tempDir, '.tp-config.json'), 'also invalid');

      const result = projectDiscovery.findProjectRoot(nestedDir);
      expect(result).toBeNull();
    });

    it('should walk up directory tree', () => {
      const packageJson = {
        name: 'root-project',
        tp: { defaultTeam: 'ROOT' },
      };

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Search from deeply nested directory
      const result = projectDiscovery.findProjectRoot(nestedDir);

      expect(result?.path).toBe(tempDir);
    });

    it('should use cache for repeated calls', () => {
      const packageJson = {
        name: 'test-project',
        tp: { defaultTeam: 'TEST' },
      };

      const packagePath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

      // First call
      const result1 = projectDiscovery.findProjectRoot(nestedDir);

      // Remove file to test cache
      fs.unlinkSync(packagePath);

      // Second call should return cached result
      const result2 = projectDiscovery.findProjectRoot(nestedDir);

      expect(result1).toEqual(result2);
      expect(result2).not.toBeNull();
    });
  });

  describe('hasProjectConfig', () => {
    it('should return true when config exists', () => {
      const packageJson = {
        name: 'test-project',
        tp: { defaultTeam: 'TEST' },
      };

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      expect(projectDiscovery.hasProjectConfig(nestedDir)).toBe(true);
    });

    it('should return false when no config exists', () => {
      expect(projectDiscovery.hasProjectConfig(nestedDir)).toBe(false);
    });
  });

  describe('getProjectRootPath', () => {
    it('should return project root path when found', () => {
      const packageJson = {
        name: 'test-project',
        tp: { defaultTeam: 'TEST' },
      };

      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      expect(projectDiscovery.getProjectRootPath(nestedDir)).toBe(tempDir);
    });

    it('should return null when no project found', () => {
      expect(projectDiscovery.getProjectRootPath(nestedDir)).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      const packageJson = {
        name: 'test-project',
        tp: { defaultTeam: 'TEST' },
      };

      const packagePath = path.join(tempDir, 'package.json');
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

      // First call to populate cache
      projectDiscovery.findProjectRoot(nestedDir);

      // Remove file and clear cache
      fs.unlinkSync(packagePath);
      projectDiscovery.clearCache();

      // Should return null now
      const result = projectDiscovery.findProjectRoot(nestedDir);
      expect(result).toBeNull();
    });
  });
});
