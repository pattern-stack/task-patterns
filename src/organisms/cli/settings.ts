import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';

interface Settings {
  defaultTeam?: string;
  activeTeams?: string[];  // Teams to show in context
  hideTeams?: string[];    // Teams to always hide
  backend?: 'linear' | 'github' | 'jira';  // Future: backend selection
  linearApiKey?: string;   // Can store keys in settings too
}

class SettingsManager {
  private configDir: string;
  private configPath: string;
  private settings: Settings = {};

  constructor() {
    // Store in ~/.task-pattern/config.json
    this.configDir = path.join(os.homedir(), '.task-pattern');
    this.configPath = path.join(this.configDir, 'config.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        this.settings = JSON.parse(content);
      }
    } catch (error) {
      // Silent fail - use defaults
      this.settings = {};
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
        JSON.stringify(this.settings, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.log(chalk.yellow('Could not save settings:', error));
    }
  }

  // Get a setting with fallback to env variable
  get<K extends keyof Settings>(key: K): Settings[K] | undefined {
    // Check local settings first
    if (this.settings[key] !== undefined) {
      return this.settings[key];
    }
    
    // Fall back to environment variables
    switch (key) {
      case 'defaultTeam':
        return process.env.LINEAR_DEFAULT_TEAM as any;
      case 'linearApiKey':
        return process.env.LINEAR_API_KEY as any;
      case 'activeTeams':
        return process.env.LINEAR_ACTIVE_TEAMS?.split(',') as any;
      default:
        return undefined;
    }
  }

  /**
   * Get a setting value from the persisted global settings only.
   *
   * This bypasses any environment variable fallbacks which allows
   * higher level configuration managers to implement their own
   * precedence rules. Environment variables should be handled as
   * the lowest priority source and not mixed with user settings.
   */
  getGlobal<K extends keyof Settings>(key: K): Settings[K] | undefined {
    return this.settings[key];
  }

  // Set a setting
  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.settings[key] = value;
    this.save();
  }

  // Add teams to filter
  addActiveTeams(...teams: string[]): void {
    const current = this.settings.activeTeams || [];
    this.settings.activeTeams = [...new Set([...current, ...teams])];
    this.save();
    console.log(chalk.green(`✓ Now showing issues from: ${this.settings.activeTeams.join(', ')}`));
  }

  // Remove teams from filter
  removeActiveTeams(...teams: string[]): void {
    if (!this.settings.activeTeams) return;
    
    this.settings.activeTeams = this.settings.activeTeams.filter(
      t => !teams.includes(t)
    );
    this.save();
    
    if (this.settings.activeTeams.length === 0) {
      console.log(chalk.yellow('No team filters - showing all teams'));
    } else {
      console.log(chalk.green(`✓ Now showing issues from: ${this.settings.activeTeams.join(', ')}`));
    }
  }

  // Clear all filters
  clearTeamFilters(): void {
    this.settings.activeTeams = undefined;
    this.save();
    console.log(chalk.green('✓ Cleared team filters - showing all teams'));
  }

  // Show current settings
  show(): void {
    console.log(chalk.cyan('\n==> Current Settings:\n'));
    
    if (this.settings.defaultTeam) {
      console.log(chalk.gray('  Default Team:  '), this.settings.defaultTeam);
    }
    
    if (this.settings.activeTeams && this.settings.activeTeams.length > 0) {
      console.log(chalk.gray('  Active Teams:  '), this.settings.activeTeams.join(', '));
    } else {
      console.log(chalk.gray('  Active Teams:  '), 'All teams (no filter)');
    }
    
    if (this.settings.hideTeams && this.settings.hideTeams.length > 0) {
      console.log(chalk.gray('  Hidden Teams:  '), this.settings.hideTeams.join(', '));
    }
    
    console.log(chalk.gray('  Backend:       '), this.settings.backend || 'linear');
    console.log(chalk.gray('  Config Path:   '), this.configPath);
  }
}

// Export singleton instance
export const settings = new SettingsManager();