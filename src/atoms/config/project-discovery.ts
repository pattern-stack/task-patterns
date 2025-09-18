import * as fs from 'fs';
import * as path from 'path';

/**
 * Project Discovery Utility
 *
 * Discovers project root by walking up directory tree looking for:
 * .tp/config.json file
 *
 * Implements caching to avoid repeated filesystem operations.
 */

interface ProjectRoot {
  path: string;
  configPath: string;
}

class ProjectDiscovery {
  private static instance: ProjectDiscovery;
  private cache = new Map<string, ProjectRoot | null>();

  private constructor() {}

  static getInstance(): ProjectDiscovery {
    if (!ProjectDiscovery.instance) {
      ProjectDiscovery.instance = new ProjectDiscovery();
    }
    return ProjectDiscovery.instance;
  }

  /**
   * Find project root starting from given directory
   * @param startDir Directory to start search from (defaults to cwd)
   * @returns ProjectRoot info or null if not found
   */
  findProjectRoot(
    startDir: string = process.env.TP_ORIGINAL_CWD || process.cwd(),
  ): ProjectRoot | null {
    // Check cache first
    const cacheKey = path.resolve(startDir);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null;
    }

    const result = this.searchProjectRoot(startDir);
    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Clear the discovery cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  private searchProjectRoot(startDir: string): ProjectRoot | null {
    let currentDir = path.resolve(startDir);
    const rootDir = path.parse(currentDir).root;

    while (currentDir !== rootDir) {
      // Check for .tp/config.json
      const tpConfigPath = path.join(currentDir, '.tp', 'config.json');
      if (fs.existsSync(tpConfigPath)) {
        try {
          // Validate that it's valid JSON
          JSON.parse(fs.readFileSync(tpConfigPath, 'utf-8'));
          return {
            path: currentDir,
            configPath: tpConfigPath,
          };
        } catch (error) {
          // Invalid JSON, continue searching
        }
      }

      // Move up one directory
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  /**
   * Check if given directory or its parents have a project config
   * @param dirPath Directory to check
   * @returns True if project config found
   */
  hasProjectConfig(dirPath: string = process.env.TP_ORIGINAL_CWD || process.cwd()): boolean {
    return this.findProjectRoot(dirPath) !== null;
  }

  /**
   * Get the project root path if it exists
   * @param startDir Directory to start search from
   * @returns Project root path or null
   */
  getProjectRootPath(
    startDir: string = process.env.TP_ORIGINAL_CWD || process.cwd(),
  ): string | null {
    const root = this.findProjectRoot(startDir);
    return root ? root.path : null;
  }
}

// Export singleton instance
export const projectDiscovery = ProjectDiscovery.getInstance();
export type { ProjectRoot };
