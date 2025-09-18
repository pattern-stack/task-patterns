import * as fs from 'fs';
import * as path from 'path';
import { projectDiscovery } from './project-discovery';
import { z } from 'zod';

/**
 * Local Configuration Handler
 *
 * Handles reading and writing local project configurations from:
 * .tp/config.json
 */

// Schema for local configuration settings (project-specific only)
const localConfigSchema = z
  .object({
    defaultTeam: z.string().optional(),
    teamFilter: z.array(z.string()).optional(), // renamed from activeTeams for clarity
    workspaceId: z.string().optional(),
  })
  .strict();

export type LocalConfig = z.infer<typeof localConfigSchema>;

export class LocalConfigManager {
  private static instance: LocalConfigManager;
  private configCache = new Map<string, LocalConfig>();

  private constructor() {}

  static getInstance(): LocalConfigManager {
    if (!LocalConfigManager.instance) {
      LocalConfigManager.instance = new LocalConfigManager();
    }
    return LocalConfigManager.instance;
  }

  /**
   * Read local configuration from current directory or specified path
   * @param startDir Directory to start search from (defaults to cwd)
   * @returns Local config object or null if not found
   */
  readLocalConfig(
    startDir: string = process.env.TP_ORIGINAL_CWD || process.cwd(),
  ): LocalConfig | null {
    const projectRoot = projectDiscovery.findProjectRoot(startDir);
    if (!projectRoot) {
      return null;
    }

    // Check cache first
    const cacheKey = projectRoot.configPath;
    if (this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey) || null;
    }

    try {
      const config: LocalConfig = JSON.parse(fs.readFileSync(projectRoot.configPath, 'utf-8'));

      // Validate configuration
      const validatedConfig = localConfigSchema.parse(config);
      this.configCache.set(cacheKey, validatedConfig);
      return validatedConfig;
    } catch (error) {
      console.warn(`Warning: Invalid local config at ${projectRoot.configPath}:`, error);
      return null;
    }
  }

  /**
   * Write local configuration to project root
   * @param config Configuration to write
   * @param projectPath Project root path (defaults to discovered root)
   */
  writeLocalConfig(config: LocalConfig, projectPath?: string): void {
    let targetPath: string;

    if (projectPath) {
      targetPath = projectPath;
    } else {
      // Find existing project root or use current directory
      const projectRoot = projectDiscovery.findProjectRoot();
      if (projectRoot) {
        targetPath = projectRoot.path;
      } else {
        targetPath = process.env.TP_ORIGINAL_CWD || process.cwd();
      }
    }

    // Create .tp directory if it doesn't exist
    const tpDir = path.join(targetPath, '.tp');
    if (!fs.existsSync(tpDir)) {
      fs.mkdirSync(tpDir, { recursive: true });
    }

    const configPath = path.join(tpDir, 'config.json');

    try {
      // Validate config before writing
      const validatedConfig = localConfigSchema.parse(config);

      // Write .tp/config.json
      fs.writeFileSync(configPath, JSON.stringify(validatedConfig, null, 2), 'utf-8');

      // Update cache
      this.configCache.set(configPath, validatedConfig);
      // Clear project discovery cache so it detects the new config
      projectDiscovery.clearCache();
    } catch (error) {
      throw new Error(`Failed to write local config: ${String(error)}`);
    }
  }

  /**
   * Initialize a new local config in current directory
   * @param config Initial configuration
   */
  initLocalConfig(config: LocalConfig = {}): void {
    const currentDir = process.env.TP_ORIGINAL_CWD || process.cwd();

    // Check if config already exists
    if (projectDiscovery.hasProjectConfig(currentDir)) {
      throw new Error('Project already has a tp configuration');
    }

    this.writeLocalConfig(config, currentDir);
  }

  /**
   * Update a specific setting in local config
   * @param key Configuration key to update
   * @param value New value
   * @param startDir Directory to start search from
   */
  updateLocalSetting<K extends keyof LocalConfig>(
    key: K,
    value: LocalConfig[K],
    startDir: string = process.env.TP_ORIGINAL_CWD || process.cwd(),
  ): void {
    const projectRoot = projectDiscovery.findProjectRoot(startDir);
    if (!projectRoot) {
      throw new Error('No local configuration found to update');
    }

    const currentConfig = this.readLocalConfig(startDir) || {};
    const updatedConfig = { ...currentConfig, [key]: value };

    // Remove undefined values
    Object.keys(updatedConfig).forEach((k) => {
      if (updatedConfig[k as keyof LocalConfig] === undefined) {
        delete updatedConfig[k as keyof LocalConfig];
      }
    });

    // Use the project root path for writing
    this.writeLocalConfig(updatedConfig, projectRoot.path);
  }

  /**
   * Clear the config cache (useful for testing)
   */
  clearCache(): void {
    this.configCache.clear();
  }

  /**
   * Get the path where local config would be stored
   * @param startDir Directory to start search from
   * @returns Config path or null if no project found
   */
  getConfigPath(startDir: string = process.env.TP_ORIGINAL_CWD || process.cwd()): string | null {
    const projectRoot = projectDiscovery.findProjectRoot(startDir);
    return projectRoot ? projectRoot.configPath : null;
  }
}

// Export singleton instance
export const localConfigManager = LocalConfigManager.getInstance();
