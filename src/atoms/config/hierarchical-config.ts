import { z } from 'zod';
import { config as envConfig } from '@atoms/shared/config';
import { localConfigManager, LocalConfig } from './local-config';
import { settings } from '@organisms/cli/settings'; // Global settings

/**
 * Hierarchical Configuration Manager
 *
 * Merges configuration from multiple sources with priority order:
 * 1. Local project config (highest priority)
 * 2. Global user config
 * 3. Environment variables (lowest priority)
 *
 * Security consideration: API keys always come from global/env, never local
 */

// Complete merged configuration schema
const mergedConfigSchema = z
  .object({
    // Local settings (can be overridden per-project)
    defaultTeam: z.string().optional(),
    teamFilter: z.array(z.string()).optional(),
    workspaceId: z.string().optional(),

    // Global settings (always from global config or env)
    apiKey: z.string(),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']),
    nodeEnv: z.enum(['development', 'production', 'test']),
    backend: z.enum(['linear', 'github', 'jira']).optional(),
  })
  .strict();

export type MergedConfig = z.infer<typeof mergedConfigSchema>;

export interface ConfigSource {
  local?: LocalConfig;
  global?: any; // Global settings from SettingsManager
  env?: any; // Environment config
}

export class HierarchicalConfigManager {
  private static instance: HierarchicalConfigManager;
  private mergedConfigCache = new Map<string, MergedConfig>();

  private constructor() {}

  static getInstance(): HierarchicalConfigManager {
    if (!HierarchicalConfigManager.instance) {
      HierarchicalConfigManager.instance = new HierarchicalConfigManager();
    }
    return HierarchicalConfigManager.instance;
  }

  /**
   * Get merged configuration for current directory
   * @param startDir Directory to start search from (defaults to cwd)
   * @returns Merged configuration with source information
   */
  getMergedConfig(startDir: string = process.env.TP_ORIGINAL_CWD || process.cwd()): {
    config: MergedConfig;
    sources: ConfigSource;
  } {
    const cacheKey = startDir;

    // Check cache
    if (this.mergedConfigCache.has(cacheKey)) {
      const cached = this.mergedConfigCache.get(cacheKey)!;
      return {
        config: cached,
        sources: this.getConfigSources(startDir),
      };
    }

    const sources = this.getConfigSources(startDir);
    const merged = this.mergeConfigs(sources);

    // Validate merged config
    try {
      const validatedConfig = mergedConfigSchema.parse(merged);
      this.mergedConfigCache.set(cacheKey, validatedConfig);
      return { config: validatedConfig, sources };
    } catch (error) {
      throw new Error(`Invalid merged configuration: ${String(error)}`);
    }
  }

  /**
   * Get configuration sources for debugging/display
   */
  private getConfigSources(startDir: string): ConfigSource {
    return {
      local: localConfigManager.readLocalConfig(startDir) || undefined,
      global: {
        defaultTeam: settings.getGlobal('defaultTeam'),
        teamFilter: settings.getGlobal('activeTeams'), // Map activeTeams to teamFilter
        backend: settings.getGlobal('backend'),
        linearApiKey: settings.getGlobal('linearApiKey'),
      },
      env: envConfig.get(),
    };
  }

  /**
   * Merge configuration sources according to priority
   */
  private mergeConfigs(sources: ConfigSource): MergedConfig {
    const { local, global, env } = sources;

    return {
      // Local settings (highest priority for project-specific settings)
      defaultTeam: local?.defaultTeam || global?.defaultTeam || env?.LINEAR_DEFAULT_TEAM,
      teamFilter: local?.teamFilter || global?.teamFilter || env?.LINEAR_ACTIVE_TEAMS?.split(','),
      workspaceId: local?.workspaceId || env?.LINEAR_WORKSPACE_ID,

      // Global/env settings (security sensitive or user preferences)
      apiKey: global?.linearApiKey || env?.LINEAR_API_KEY,
      logLevel: env?.LOG_LEVEL || 'info',
      nodeEnv: env?.NODE_ENV || 'development',
      backend: global?.backend || 'linear',
    };
  }

  /**
   * Update local configuration setting
   */
  updateLocalSetting<K extends keyof LocalConfig>(
    key: K,
    value: LocalConfig[K],
    startDir?: string,
  ): void {
    localConfigManager.updateLocalSetting(key, value, startDir);
    this.clearCache(); // Invalidate cache
  }

  /**
   * Update global configuration setting
   */
  updateGlobalSetting(key: string, value: any): void {
    // Map teamFilter back to activeTeams for backward compatibility
    if (key === 'teamFilter') {
      settings.set('activeTeams', value);
    } else {
      settings.set(key as any, value);
    }
    this.clearCache(); // Invalidate cache
  }

  /**
   * Initialize local config for current project
   */
  initLocalConfig(config: LocalConfig = {}): void {
    localConfigManager.initLocalConfig(config);
    this.clearCache(); // Invalidate cache
  }

  /**
   * Check if local config exists for current directory
   */
  hasLocalConfig(startDir?: string): boolean {
    return localConfigManager.readLocalConfig(startDir) !== null;
  }

  /**
   * Get configuration with source attribution for display
   */
  getConfigWithSources(startDir: string = process.env.TP_ORIGINAL_CWD || process.cwd()): {
    config: MergedConfig;
    sources: { [key: string]: 'local' | 'global' | 'env' };
  } {
    const { config, sources } = this.getMergedConfig(startDir);

    // Determine source for each config value
    const sourceMap: { [key: string]: 'local' | 'global' | 'env' } = {};

    if (config.defaultTeam) {
      if (sources.local?.defaultTeam) {
        sourceMap.defaultTeam = 'local';
      } else if (sources.global?.defaultTeam) {
        sourceMap.defaultTeam = 'global';
      } else {
        sourceMap.defaultTeam = 'env';
      }
    }

    if (config.teamFilter) {
      if (sources.local?.teamFilter) {
        sourceMap.teamFilter = 'local';
      } else if (sources.global?.teamFilter) {
        sourceMap.teamFilter = 'global';
      } else {
        sourceMap.teamFilter = 'env';
      }
    }

    if (config.workspaceId) {
      if (sources.local?.workspaceId) {
        sourceMap.workspaceId = 'local';
      } else {
        sourceMap.workspaceId = 'env';
      }
    }

    sourceMap.apiKey = sources.global?.linearApiKey ? 'global' : 'env';
    sourceMap.logLevel = 'env';
    sourceMap.nodeEnv = 'env';

    if (config.backend) {
      sourceMap.backend = 'global';
    }

    return { config, sources: sourceMap };
  }

  /**
   * Clear all caches (useful for testing)
   */
  clearCache(): void {
    this.mergedConfigCache.clear();
    localConfigManager.clearCache();
  }

  /**
   * Validate that all required configuration is present
   */
  validateConfig(startDir?: string): { valid: boolean; errors: string[] } {
    try {
      const { config } = this.getMergedConfig(startDir);

      const errors: string[] = [];

      if (!config.apiKey) {
        errors.push('API key is required (LINEAR_API_KEY environment variable or global config)');
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      return { valid: false, errors: [String(error)] };
    }
  }
}

// Export singleton instance
export const hierarchicalConfig = HierarchicalConfigManager.getInstance();
