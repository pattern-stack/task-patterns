import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { linearClient } from '@atoms/client/linear-client';
import { enhancedSettings } from '../enhanced-settings';
import { enhancedConfig } from '@atoms/config';
import { formatters } from '../formatters';

/**
 * Enhanced Config Command Module
 * 
 * Provides hierarchical configuration management with support for:
 * - Local project settings (--local flag)
 * - Global user settings (--global flag)
 * - Configuration initialization (init command)
 */

export function createEnhancedConfigCommand(): Command {
  const config = new Command('config')
    .description('Manage task-pattern settings (supports local and global configs)');

  // Show current settings with source indication
  config
    .command('show')
    .description('Show current configuration with source indication')
    .action(() => {
      enhancedSettings.show();
    });

  // Initialize local configuration
  config
    .command('init')
    .description('Initialize local configuration for current project')
    .option('--type <type>', 'Config file type: package.json or .tp-config.json', 'package.json')
    .action((options) => {
      try {
        if (enhancedSettings.hasLocalConfig()) {
          formatters.warning('Project already has local configuration');
          const paths = enhancedSettings.getConfigPaths();
          console.log(chalk.dim(`  Local config: ${paths.local}`));
          return;
        }

        const configType = options.type as 'package.json' | '.tp-config.json';
        if (!['package.json', '.tp-config.json'].includes(configType)) {
          formatters.error('Invalid config type. Use: package.json or .tp-config.json');
          return;
        }

        // Get current global settings as defaults for local config
        const mergedConfig = enhancedConfig.getMergedConfig();
        const initialConfig = {
          defaultTeam: mergedConfig.defaultTeam,
          teamFilter: mergedConfig.teamFilter,
          workspaceId: mergedConfig.workspaceId
        };

        // Remove undefined values
        Object.keys(initialConfig).forEach(key => {
          if (initialConfig[key as keyof typeof initialConfig] === undefined) {
            delete initialConfig[key as keyof typeof initialConfig];
          }
        });

        enhancedConfig.initLocalConfig(initialConfig, configType);
        
        formatters.success(`Local configuration initialized`);
        console.log(chalk.dim(`  Config file: ./${configType === 'package.json' ? 'package.json' : '.tp-config.json'}`));
        console.log(chalk.dim('  Use --local flag with config commands to modify local settings'));
      } catch (error) {
        formatters.error('Failed to initialize local configuration', error);
      }
    });

  // Set a configuration value
  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .option('--local', 'Set in local project configuration')
    .option('--global', 'Set in global user configuration (default)')
    .action((key, value, options) => {
      const isLocal = options.local;
      const isGlobal = options.global || !options.local; // Default to global

      try {
        // Validate key and value
        if (key === 'team.default' || key === 'defaultTeam') {
          if (isLocal) {
            enhancedConfig.updateLocalSetting('defaultTeam', value);
            formatters.success(`Default team set to "${value}" (local config)`);
          } else {
            enhancedSettings.set('defaultTeam', value);
            formatters.success(`Default team set to "${value}" (global config)`);
          }
        } else if (key === 'backend') {
          if (isLocal) {
            formatters.error('Backend setting is global only (user preference)');
            return;
          }
          if (!['linear', 'github', 'jira'].includes(value)) {
            formatters.error('Invalid backend. Options: linear, github, jira');
            return;
          }
          enhancedSettings.set('backend', value as any);
          formatters.success(`Backend set to "${value}" (global config)`);
        } else if (key === 'workspaceId') {
          if (isLocal) {
            enhancedConfig.updateLocalSetting('workspaceId', value);
            formatters.success(`Workspace ID set to "${value}" (local config)`);
          } else {
            formatters.warning('Workspace ID is typically set locally per project');
            console.log(chalk.dim('  Use --local flag to set workspace ID for this project'));
          }
        } else {
          formatters.warning(`Unknown configuration key: ${key}`);
          console.log(chalk.dim('  Available keys: defaultTeam, backend, workspaceId'));
          console.log(chalk.dim('  Use: tp config list for all options'));
        }
      } catch (error) {
        if ((error as Error).message?.includes('Project already has a tp configuration')) {
          formatters.error('Cannot modify local config: project not initialized');
          console.log(chalk.dim('  Use: tp config init to initialize local configuration'));
        } else {
          formatters.error('Failed to set configuration', error);
        }
      }
    });

  // Get a configuration value
  config
    .command('get <key>')
    .description('Get a configuration value (shows merged result from all sources)')
    .action((key) => {
      try {
        const { config: mergedConfig, sources } = enhancedConfig.getConfigWithSources();
        let value;
        let source;

        // Handle different key formats
        if (key === 'team.default' || key === 'defaultTeam') {
          value = mergedConfig.defaultTeam;
          source = sources.defaultTeam;
        } else if (key === 'activeTeams' || key === 'teams' || key === 'teamFilter') {
          value = mergedConfig.teamFilter;
          source = sources.teamFilter;
        } else if (key === 'backend') {
          value = mergedConfig.backend;
          source = sources.backend;
        } else if (key === 'workspaceId') {
          value = mergedConfig.workspaceId;
          source = sources.workspaceId;
        } else if (key === 'apiKey') {
          value = '*'.repeat(20); // Hide sensitive data
          source = sources.apiKey;
        } else if (key === 'logLevel') {
          value = mergedConfig.logLevel;
          source = sources.logLevel;
        } else {
          formatters.warning(`Unknown configuration key: ${key}`);
          return;
        }

        if (value !== undefined) {
          if (Array.isArray(value)) {
            console.log(`${value.join(', ')} (${source})`);
          } else {
            console.log(`${value} (${source})`);
          }
        } else {
          formatters.warning(`No value set for: ${key}`);
        }
      } catch (error) {
        formatters.error('Failed to get configuration', error);
      }
    });

  // List all configuration options
  config
    .command('list')
    .description('List all configuration options')
    .action(() => {
      console.log(chalk.cyan('\n==> Configuration Options\n'));
      
      console.log(chalk.yellow('  Local Settings (project-specific):'));
      console.log(chalk.gray('    defaultTeam    '), 'Default team for new issues');
      console.log(chalk.gray('    teamFilter     '), 'Teams to show in context view');
      console.log(chalk.gray('    workspaceId    '), 'Linear workspace ID');
      
      console.log(chalk.yellow('\n  Global Settings (user preferences):'));
      console.log(chalk.gray('    backend        '), 'Task backend (linear, github, jira)');
      console.log(chalk.gray('    hideTeams      '), 'Teams to always hide (global only)');
      
      console.log(chalk.yellow('\n  Security Settings (global/env only):'));
      console.log(chalk.gray('    apiKey         '), 'Linear API key (use LINEAR_API_KEY env var)');
      
      console.log(chalk.dim('\n  Commands:'));
      console.log(chalk.dim('    tp config init                    # Initialize local config'));
      console.log(chalk.dim('    tp config set --local <key> <val> # Set local setting'));
      console.log(chalk.dim('    tp config set --global <key> <val># Set global setting'));
      console.log(chalk.dim('    tp config get <key>               # Get merged value'));
      console.log(chalk.dim('    tp config show                    # Show all settings'));
    });

  // Team filter management with local/global awareness
  config
    .command('teams [teams...]')
    .description('Set active teams to filter (automatically chooses local or global)')
    .option('--local', 'Force update local configuration')
    .option('--global', 'Force update global configuration')
    .action((teams, options) => {
      try {
        const isForceLocal = options.local;
        const isForceGlobal = options.global;
        const hasLocal = enhancedSettings.hasLocalConfig();

        if (isForceLocal && !hasLocal) {
          formatters.error('No local configuration found');
          console.log(chalk.dim('  Use: tp config init to create local configuration'));
          return;
        }

        if (teams && teams.length > 0) {
          // Setting specific teams
          if (isForceLocal || (hasLocal && !isForceGlobal)) {
            enhancedConfig.updateLocalSetting('teamFilter', teams);
            formatters.success(`Now showing issues from: ${teams.join(', ')} (local config)`);
          } else {
            enhancedSettings.set('activeTeams', teams);
            formatters.success(`Now showing issues from: ${teams.join(', ')} (global config)`);
          }
        } else {
          // Clearing team filters
          if (isForceLocal || (hasLocal && !isForceGlobal)) {
            enhancedConfig.updateLocalSetting('teamFilter', undefined);
            console.log(chalk.green('✓ Cleared team filters - showing all teams (local config)'));
          } else {
            enhancedSettings.clearTeamFilters();
          }
        }
        console.log(chalk.dim('  Run "tp context" to see filtered view'));
      } catch (error) {
        formatters.error('Failed to update team filters', error);
      }
    });

  // Add teams to active filter
  config
    .command('add-team <teams...>')
    .description('Add teams to active filter')
    .action((teams) => {
      enhancedSettings.addActiveTeams(...teams);
    });

  // Remove teams from active filter
  config
    .command('remove-team <teams...>')
    .description('Remove teams from active filter')
    .action((teams) => {
      enhancedSettings.removeActiveTeams(...teams);
    });

  // Clear team filters
  config
    .command('clear')
    .description('Clear all team filters')
    .action(() => {
      enhancedSettings.clearTeamFilters();
    });

  // List available teams (unchanged)
  config
    .command('list-teams')
    .description('List all available teams from Linear')
    .action(async () => {
      const spinner = ora('Fetching teams...').start();
      try {
        const client = linearClient.getClient();
        const teams = await client.teams();
        
        spinner.stop();
        console.log(chalk.cyan('\n==> Available Teams:\n'));
        
        teams.nodes.forEach(team => {
          console.log(chalk.gray('  Key:  '), chalk.yellow(team.key));
          console.log(chalk.gray('  Name: '), team.name);
          console.log(chalk.gray('  ID:   '), chalk.dim(team.id));
          console.log();
        });
        
        console.log(chalk.dim(`  Use: tp config teams ${teams.nodes.map(t => t.key).join(' ')}`));
      } catch (error) {
        spinner.fail('Could not fetch teams');
        console.error(error);
      }
    });

  // Reset configuration
  config
    .command('reset')
    .description('Reset configuration to defaults')
    .option('--local', 'Reset only local configuration')
    .option('--global', 'Reset only global configuration') 
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (options) => {
      const resetLocal = options.local;
      const resetGlobal = options.global || !options.local; // Default to global if no specific flag
      
      if (!options.confirm) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const scope = resetLocal && resetGlobal ? 'all settings' : 
                      resetLocal ? 'local settings' : 'global settings';
        
        const confirmed = await new Promise<boolean>((resolve) => {
          rl.question(chalk.yellow(`Are you sure you want to reset ${scope}? (y/N) `), (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
          });
        });
        
        if (!confirmed) {
          console.log(chalk.gray('Reset cancelled'));
          return;
        }
      }

      try {
        if (resetLocal && enhancedSettings.hasLocalConfig()) {
          // Remove local config file
          const paths = enhancedSettings.getConfigPaths();
          if (paths.local) {
            const fs = await import('fs');
            if (paths.local.endsWith('package.json')) {
              // Remove "tp" section from package.json
              const packageJson = JSON.parse(fs.readFileSync(paths.local, 'utf-8'));
              delete packageJson.tp;
              fs.writeFileSync(paths.local, JSON.stringify(packageJson, null, 2));
              formatters.success('Local configuration removed from package.json');
            } else {
              // Remove .tp-config.json file
              fs.unlinkSync(paths.local);
              formatters.success('Local configuration file removed');
            }
          }
        }

        if (resetGlobal) {
          // Clear global settings
          enhancedSettings.set('defaultTeam', undefined);
          enhancedSettings.set('activeTeams', undefined);
          enhancedSettings.set('hideTeams', undefined);
          enhancedSettings.set('backend', undefined);
          formatters.success('Global settings reset to defaults');
        }

        enhancedConfig.clearCache();
        console.log(chalk.dim('  Configuration will now use remaining sources'));
      } catch (error) {
        formatters.error('Failed to reset configuration', error);
      }
    });

  return config;
}