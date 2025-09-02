import * as fs from 'fs';
import * as path from 'path';
import { projectDiscovery, ProjectRoot } from './project-discovery';
import { z } from 'zod';

/**
 * Local Configuration Handler
 *
 * Handles reading and writing local project configurations from:
 * - package.json "tp" section (Node.js projects)
 * - .tp-config.json (non-Node.js projects)
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
  readLocalConfig(startDir: string = process.cwd()): LocalConfig | null {
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
      let config: LocalConfig;

      if (projectRoot.configType === 'package.json') {
        const packageJson = JSON.parse(fs.readFileSync(projectRoot.configPath, 'utf-8'));
        config = packageJson.tp || {};
      } else {
        config = JSON.parse(fs.readFileSync(projectRoot.configPath, 'utf-8'));
      }

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
   * @param preferredType Preferred config type ('package.json' or '.tp-config.json')
   */
  writeLocalConfig(
    config: LocalConfig,
    projectPath?: string,
    preferredType?: 'package.json' | '.tp-config.json',
  ): void {
    let targetPath: string;
    let configType: 'package.json' | '.tp-config.json';

    if (projectPath) {
      // Use specified project path
      targetPath = projectPath;

      // Determine config type
      if (preferredType) {
        configType = preferredType;
      } else if (fs.existsSync(path.join(projectPath, 'package.json'))) {
        configType = 'package.json';
      } else {
        configType = '.tp-config.json';
      }
    } else {
      // Find existing project root or use current directory
      const projectRoot = projectDiscovery.findProjectRoot();
      if (projectRoot) {
        targetPath = projectRoot.path;
        configType = projectRoot.configType;
      } else {
        targetPath = process.cwd();
        configType = fs.existsSync(path.join(targetPath, 'package.json'))
          ? 'package.json'
          : '.tp-config.json';
      }
    }

    const configPath = path.join(targetPath, configType);

    try {
      // Validate config before writing
      const validatedConfig = localConfigSchema.parse(config);

      if (configType === 'package.json') {
        // Update package.json with tp section
        let packageJson = {};
        if (fs.existsSync(configPath)) {
          packageJson = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }

        (packageJson as any).tp = validatedConfig;
        fs.writeFileSync(configPath, JSON.stringify(packageJson, null, 2), 'utf-8');
      } else {
        // Write standalone .tp-config.json
        fs.writeFileSync(configPath, JSON.stringify(validatedConfig, null, 2), 'utf-8');
      }

      // Update cache
      this.configCache.set(configPath, validatedConfig);
      // Clear project discovery cache so it detects the new config
      projectDiscovery.clearCache();
    } catch (error) {
      throw new Error(`Failed to write local config: ${error}`);
    }
  }

  /**
   * Initialize a new local config in current directory
   * @param config Initial configuration
   * @param configType Type of config file to create
   */
  initLocalConfig(
    config: LocalConfig = {},
    configType: 'package.json' | '.tp-config.json' = 'package.json',
  ): void {
    const currentDir = process.cwd();

    // Check if config already exists
    if (projectDiscovery.hasProjectConfig(currentDir)) {
      throw new Error('Project already has a tp configuration');
    }

    this.writeLocalConfig(config, currentDir, configType);
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
    startDir: string = process.cwd(),
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
    this.writeLocalConfig(updatedConfig, projectRoot.path, projectRoot.configType);
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
  getConfigPath(startDir: string = process.cwd()): string | null {
    const projectRoot = projectDiscovery.findProjectRoot(startDir);
    return projectRoot ? projectRoot.configPath : null;
  }
}

// Export singleton instance
export const localConfigManager = LocalConfigManager.getInstance();
