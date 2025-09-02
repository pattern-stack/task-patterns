import { hierarchicalConfig, MergedConfig } from './hierarchical-config';
import { LocalConfig } from './local-config';
import { projectDiscovery } from './project-discovery';

/**
 * Enhanced Configuration Manager
 *
 * Provides a unified interface to the hierarchical configuration system
 * while maintaining backward compatibility with the existing ConfigManager interface.
 *
 * This serves as the primary config interface for the CLI system.
 */

export class EnhancedConfigManager {
  private static instance: EnhancedConfigManager;

  private constructor() {}

  static getInstance(): EnhancedConfigManager {
    if (!EnhancedConfigManager.instance) {
      EnhancedConfigManager.instance = new EnhancedConfigManager();
    }
    return EnhancedConfigManager.instance;
  }

  /**
   * Get the merged configuration for current context
   * @param workingDir Directory to use for local config discovery
   */
  getMergedConfig(workingDir?: string): MergedConfig {
    const { config } = hierarchicalConfig.getMergedConfig(workingDir);
    return config;
  }

  /**
   * Get configuration with source attribution
   * @param workingDir Directory to use for local config discovery
   */
  getConfigWithSources(workingDir?: string) {
    return hierarchicalConfig.getConfigWithSources(workingDir);
  }

  /**
   * Backward compatibility methods (match existing ConfigManager interface)
   */

  get apiKey(): string {
    return this.getMergedConfig().apiKey;
  }

  get workspaceId(): string | undefined {
    return this.getMergedConfig().workspaceId;
  }

  get isProduction(): boolean {
    return this.getMergedConfig().nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.getMergedConfig().nodeEnv === 'development';
  }

  get logLevel(): string {
    return this.getMergedConfig().logLevel;
  }

  /**
   * New methods for hierarchical config
   */

  get defaultTeam(): string | undefined {
    return this.getMergedConfig().defaultTeam;
  }

  get teamFilter(): string[] | undefined {
    return this.getMergedConfig().teamFilter;
  }

  get backend(): string | undefined {
    return this.getMergedConfig().backend;
  }

  /**
   * Configuration management methods
   */

  updateLocalSetting<K extends keyof LocalConfig>(
    key: K,
    value: LocalConfig[K],
    workingDir?: string,
  ): void {
    hierarchicalConfig.updateLocalSetting(key, value, workingDir);
  }

  updateGlobalSetting(key: string, value: any): void {
    hierarchicalConfig.updateGlobalSetting(key, value);
  }

  initLocalConfig(
    config: LocalConfig = {},
    configType: 'package.json' | '.tp-config.json' = 'package.json',
  ): void {
    hierarchicalConfig.initLocalConfig(config, configType);
  }

  hasLocalConfig(workingDir?: string): boolean {
    return hierarchicalConfig.hasLocalConfig(workingDir);
  }

  validateConfig(workingDir?: string): { valid: boolean; errors: string[] } {
    return hierarchicalConfig.validateConfig(workingDir);
  }

  /**
   * Display current configuration
   */
  showConfig(workingDir?: string): void {
    const { config, sources } = this.getConfigWithSources(workingDir);

    console.log('\n==> Configuration Summary:\n');

    if (config.defaultTeam) {
      console.log(`  Default Team:     ${config.defaultTeam} (${sources.defaultTeam})`);
    }

    if (config.teamFilter && config.teamFilter.length > 0) {
      console.log(`  Team Filter:      ${config.teamFilter.join(', ')} (${sources.teamFilter})`);
    }

    if (config.workspaceId) {
      console.log(`  Workspace ID:     ${config.workspaceId} (${sources.workspaceId})`);
    }

    if (config.backend) {
      console.log(`  Backend:          ${config.backend} (${sources.backend})`);
    }

    console.log(`  API Key:          ${'*'.repeat(20)} (${sources.apiKey})`);
    console.log(`  Log Level:        ${config.logLevel} (${sources.logLevel})`);
    console.log(`  Environment:      ${config.nodeEnv} (${sources.nodeEnv})`);

    // Show local config info
    if (hierarchicalConfig.hasLocalConfig(workingDir)) {
      const localPath = projectDiscovery.findProjectRoot(workingDir)?.configPath;
      console.log(`\n  Local Config:     ${localPath}`);
    } else {
      console.log('\n  Local Config:     None found');
    }
  }

  /**
   * Clear all caches (useful for testing)
   */
  clearCache(): void {
    hierarchicalConfig.clearCache();
  }
}

// Export singleton instance
export const enhancedConfig = EnhancedConfigManager.getInstance();
