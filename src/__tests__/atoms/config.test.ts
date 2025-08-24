import { config, ConfigManager } from '@atoms/shared/config';

describe('ConfigManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('initialization', () => {
    it('should initialize with valid environment variables', () => {
      // The config is already initialized in setup.ts with test values
      const cfg = config.get();

      expect(cfg.LINEAR_API_KEY).toBeTruthy();
      expect(cfg.NODE_ENV).toBe('test');
      expect(cfg.LOG_LEVEL).toBe('error');
    });

    it('should use default values when optional env vars are missing', () => {
      process.env.LINEAR_API_KEY = 'test-api-key';
      delete process.env.NODE_ENV;
      delete process.env.LOG_LEVEL;

      jest.resetModules();
      const { config: newConfig } = require('@atoms/shared/config');
      const cfg = newConfig.get();

      expect(cfg.NODE_ENV).toBe('development');
      expect(cfg.LOG_LEVEL).toBe('info');
    });

    it('should handle workspace ID when provided', () => {
      process.env.LINEAR_API_KEY = 'test-api-key';
      process.env.LINEAR_WORKSPACE_ID = 'workspace-123';

      jest.resetModules();
      const { config: newConfig } = require('@atoms/shared/config');

      expect(newConfig.workspaceId).toBe('workspace-123');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      process.env.LINEAR_API_KEY = 'test-key';
    });

    it('should return API key', () => {
      jest.resetModules();
      const { config: newConfig } = require('@atoms/shared/config');

      expect(newConfig.apiKey).toBe('test-key');
    });

    it('should correctly identify production environment', () => {
      process.env.NODE_ENV = 'production';

      jest.resetModules();
      const { config: newConfig } = require('@atoms/shared/config');

      expect(newConfig.isProduction).toBe(true);
      expect(newConfig.isDevelopment).toBe(false);
    });

    it('should correctly identify development environment', () => {
      process.env.NODE_ENV = 'development';

      jest.resetModules();
      const { config: newConfig } = require('@atoms/shared/config');

      expect(newConfig.isDevelopment).toBe(true);
      expect(newConfig.isProduction).toBe(false);
    });
  });

  describe('validation', () => {
    it('should validate LOG_LEVEL enum values', () => {
      process.env.LINEAR_API_KEY = 'test-key';
      process.env.LOG_LEVEL = 'invalid-level';

      // Suppress console.error for this test
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      expect(() => {
        jest.resetModules();
        require('@atoms/shared/config');
      }).toThrow('Process exit');

      mockExit.mockRestore();
    });

    it('should validate NODE_ENV enum values', () => {
      process.env.LINEAR_API_KEY = 'test-key';
      process.env.NODE_ENV = 'invalid-env';

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      expect(() => {
        jest.resetModules();
        require('@atoms/shared/config');
      }).toThrow('Process exit');

      mockExit.mockRestore();
    });
  });
});
