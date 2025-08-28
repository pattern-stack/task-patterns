import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { enhancedConfig } from '@atoms/config';

/**
 * Enhanced Settings Manager
 * 
 * Integrates with the hierarchical configuration system while maintaining
 * backward compatibility with the existing settings interface.
 * 
 * Handles both local (project-specific) and global (user-specific) settings.
 */

interface GlobalSettings {
  defaultTeam?: string;      // Can be overridden by local config
  activeTeams?: string[];    // Can be overridden by local config (teamFilter)
  hideTeams?: string[];      // Global only
  backend?: 'linear' | 'github' | 'jira';  // Global user preference
  linearApiKey?: string;     // Global security setting
}

class EnhancedSettingsManager {
  private configDir: string;
  private configPath: string;
  private globalSettings: GlobalSettings = {};

  constructor() {
    // Store in ~/.task-pattern/config.json (same location as before)
    this.configDir = path.join(os.homedir(), '.task-pattern');
    this.configPath = path.join(this.configDir, 'config.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        this.globalSettings = JSON.parse(content);
      }
    } catch (error) {
      // Silent fail - use defaults
      this.globalSettings = {};
    }
  }

  private save(): void {
    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      
      fs.writeFileSync(
        this.configPath, 
        JSON.stringify(this.globalSettings, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.log(chalk.yellow('Could not save settings:', error));
    }
  }

  /**
   * Get a setting value using hierarchical config
   * This provides the merged value from local > global > env
   */
  get<K extends keyof GlobalSettings>(key: K): GlobalSettings[K] | undefined {
    const mergedConfig = enhancedConfig.getMergedConfig();
    
    // Map between settings keys and merged config keys
    switch (key) {
      case 'defaultTeam':
        return mergedConfig.defaultTeam as any;
      case 'activeTeams':
        return mergedConfig.teamFilter as any; // teamFilter maps to activeTeams
      case 'linearApiKey':
        return mergedConfig.apiKey as any;
      case 'backend':
        return mergedConfig.backend as any;
      case 'hideTeams':
        return this.globalSettings.hideTeams as any; // Global only setting
      default:
        return this.globalSettings[key];
    }
  }

  /**
   * Set a global setting (user-level preference)
   */
  set<K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]): void {
    this.globalSettings[key] = value;
    this.save();
    
    // Clear enhanced config cache to reflect changes
    enhancedConfig.clearCache();
  }

  /**
   * Set a local setting (project-specific)
   */
  setLocal<K extends 'defaultTeam' | 'teamFilter'>(
    key: K, 
    value: K extends 'defaultTeam' ? string : string[]
  ): void {
    // Map settings keys to local config keys
    if (key === 'defaultTeam') {
      enhancedConfig.updateLocalSetting('defaultTeam', value as string);
    } else if (key === 'teamFilter') {
      enhancedConfig.updateLocalSetting('teamFilter', value as string[]);
    }
  }

  /**
   * Team filter management methods (enhanced for local/global)
   */

  addActiveTeams(...teams: string[]): void {
    const isLocalProject = enhancedConfig.hasLocalConfig();
    
    if (isLocalProject) {
      // Update local config
      const current = enhancedConfig.getMergedConfig().teamFilter || [];
      const updated = [...new Set([...current, ...teams])];
      this.setLocal('teamFilter', updated);
      console.log(chalk.green(`✓ Now showing issues from: ${updated.join(', ')} (local config)`));
    } else {
      // Update global config (backward compatibility)
      const current = this.globalSettings.activeTeams || [];
      this.globalSettings.activeTeams = [...new Set([...current, ...teams])];
      this.save();
      console.log(chalk.green(`✓ Now showing issues from: ${this.globalSettings.activeTeams.join(', ')} (global config)`));
    }
  }

  removeActiveTeams(...teams: string[]): void {
    const isLocalProject = enhancedConfig.hasLocalConfig();
    
    if (isLocalProject) {
      // Update local config
      const current = enhancedConfig.getMergedConfig().teamFilter || [];
      const updated = current.filter(t => !teams.includes(t));
      this.setLocal('teamFilter', updated);
      
      if (updated.length === 0) {
        console.log(chalk.yellow('No team filters - showing all teams (local config)'));
      } else {
        console.log(chalk.green(`✓ Now showing issues from: ${updated.join(', ')} (local config)`));
      }
    } else {
      // Update global config (backward compatibility)
      if (!this.globalSettings.activeTeams) return;
      
      this.globalSettings.activeTeams = this.globalSettings.activeTeams.filter(
        t => !teams.includes(t)
      );
      this.save();
      
      if (this.globalSettings.activeTeams.length === 0) {
        console.log(chalk.yellow('No team filters - showing all teams (global config)'));
      } else {
        console.log(chalk.green(`✓ Now showing issues from: ${this.globalSettings.activeTeams.join(', ')} (global config)`));
      }
    }
  }

  clearTeamFilters(): void {
    const isLocalProject = enhancedConfig.hasLocalConfig();
    
    if (isLocalProject) {
      // Update local config
      this.setLocal('teamFilter', []);
      console.log(chalk.green('✓ Cleared team filters - showing all teams (local config)'));
    } else {
      // Update global config (backward compatibility)
      this.globalSettings.activeTeams = undefined;
      this.save();
      console.log(chalk.green('✓ Cleared team filters - showing all teams (global config)'));
    }
  }

  /**
   * Show current settings with source indication
   */
  show(): void {
    enhancedConfig.showConfig();
  }

  /**
   * Initialize local config for current project
   */
  initLocal(config: {
    defaultTeam?: string;
    teamFilter?: string[];
    workspaceId?: string;
  } = {}): void {
    enhancedConfig.initLocalConfig(config);
    console.log(chalk.green('✓ Initialized local configuration'));
    console.log(chalk.dim('  Use --local flag with config commands to modify local settings'));
  }

  /**
   * Check if current directory has local config
   */
  hasLocalConfig(): boolean {
    return enhancedConfig.hasLocalConfig();
  }

  /**
   * Get configuration path information
   */
  getConfigPaths(): {
    global: string;
    local: string | null;
  } {
    return {
      global: this.configPath,
      local: enhancedConfig.hasLocalConfig() 
        ? require('@atoms/config').projectDiscovery.findProjectRoot()?.configPath || null
        : null
    };
  }
}

// Export singleton instance
export const enhancedSettings = new EnhancedSettingsManager();