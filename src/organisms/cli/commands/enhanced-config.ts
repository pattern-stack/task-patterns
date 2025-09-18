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
  const config = new Command('config').description(
    'Manage task-pattern settings (supports local and global configs)',
  );

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
    .action(() => {
      try {
        if (enhancedSettings.hasLocalConfig()) {
          formatters.warning('Project already has local configuration');
          const paths = enhancedSettings.getConfigPaths();
          console.log(chalk.dim(`  Local config: ${paths.local}`));
          return;
        }

        // Get current global settings as defaults for local config
        const mergedConfig = enhancedConfig.getMergedConfig();
        const initialConfig = {
          defaultTeam: mergedConfig.defaultTeam,
          teamFilter: mergedConfig.teamFilter,
          workspaceId: mergedConfig.workspaceId,
        };

        // Remove undefined values
        Object.keys(initialConfig).forEach((key) => {
          if (initialConfig[key as keyof typeof initialConfig] === undefined) {
            delete initialConfig[key as keyof typeof initialConfig];
          }
        });

        enhancedConfig.initLocalConfig(initialConfig);

        formatters.success(`Local configuration initialized`);
        console.log(chalk.dim(`  Config file: ./.tp/config.json`));
        console.log(chalk.dim('  Use --local flag with config commands to modify local settings'));
      } catch (error) {
        formatters.error('Failed to initialize local configuration', error);
      }
    });

  // Set a configuration value
  config
    .command('set <key> <value>')
    .description('Set a configuration value (defaults to local if available)')
    .option('--local', 'Force set in local project configuration')
    .option('--global', 'Force set in global user configuration')
    .action(async (key, value, options) => {
      const hasLocal = enhancedSettings.hasLocalConfig();
      let useLocal = false;

      // Determine where to save based on options and context
      if (options.local && options.global) {
        formatters.error('Cannot use both --local and --global flags');
        return;
      } else if (options.local) {
        if (!hasLocal) {
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const shouldInit = await new Promise<boolean>((resolve) => {
            rl.question(chalk.yellow('No local config found. Initialize one? (Y/n) '), (answer) => {
              rl.close();
              resolve(!answer || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
            });
          });

          if (shouldInit) {
            enhancedConfig.initLocalConfig({});
            formatters.success('Local configuration initialized');
            useLocal = true;
          } else {
            return;
          }
        } else {
          useLocal = true;
        }
      } else if (options.global) {
        useLocal = false;
      } else {
        // No flags specified - if local exists, ask user preference
        if (hasLocal) {
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const choice = await new Promise<string>((resolve) => {
            console.log(chalk.cyan('\nWhere would you like to save this setting?'));
            console.log(chalk.gray('  1) Local project config (.tp/config.json)'));
            console.log(chalk.gray('  2) Global user config'));
            rl.question(chalk.yellow('Choose [1-2] (default: 1): '), (answer) => {
              rl.close();
              resolve(answer || '1');
            });
          });

          useLocal = choice === '1';
        } else {
          // No local config, default to local and offer to create
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const shouldInit = await new Promise<boolean>((resolve) => {
            rl.question(
              chalk.yellow('Initialize local config for this project? (Y/n) '),
              (answer) => {
                rl.close();
                resolve(!answer || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
              },
            );
          });

          if (shouldInit) {
            enhancedConfig.initLocalConfig({});
            formatters.success('Local configuration initialized');
            useLocal = true;
          } else {
            useLocal = false;
          }
        }
      }

      try {
        // Validate key and value
        if (key === 'team.default' || key === 'defaultTeam') {
          if (useLocal) {
            enhancedConfig.updateLocalSetting('defaultTeam', value);
            formatters.success(`Default team set to "${value}" (local config)`);
          } else {
            enhancedSettings.set('defaultTeam', value);
            formatters.success(`Default team set to "${value}" (global config)`);
          }
        } else if (key === 'backend') {
          if (useLocal) {
            formatters.error('Backend setting is global only (user preference)');
            return;
          }
          if (!['linear', 'github', 'jira'].includes(value)) {
            formatters.error('Invalid backend. Options: linear, github, jira');
            return;
          }
          enhancedSettings.set('backend', value);
          formatters.success(`Backend set to "${value}" (global config)`);
        } else if (key === 'workspaceId') {
          if (useLocal) {
            enhancedConfig.updateLocalSetting('workspaceId', value);
            formatters.success(`Workspace ID set to "${value}" (local config)`);
          } else {
            formatters.error('Workspace ID can only be set in local project configuration');
            console.log(chalk.dim('  Use --local flag or initialize local config first'));
            return;
          }
        } else {
          formatters.warning(`Unknown configuration key: ${key}`);
          console.log(chalk.dim('  Available keys: defaultTeam, backend, workspaceId'));
          console.log(chalk.dim('  Use: tp config list for all options'));
        }
      } catch (error) {
        formatters.error('Failed to set configuration', error);
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
    .description('Set active teams to filter (defaults to local if available)')
    .option('--local', 'Force update local configuration')
    .option('--global', 'Force update global configuration')
    .action(async (teams, options) => {
      const hasLocal = enhancedSettings.hasLocalConfig();
      let useLocal = false;

      // Determine where to save based on options and context
      if (options.local && options.global) {
        formatters.error('Cannot use both --local and --global flags');
        return;
      } else if (options.local) {
        if (!hasLocal) {
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const shouldInit = await new Promise<boolean>((resolve) => {
            rl.question(chalk.yellow('No local config found. Initialize one? (Y/n) '), (answer) => {
              rl.close();
              resolve(!answer || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
            });
          });

          if (shouldInit) {
            enhancedConfig.initLocalConfig({});
            formatters.success('Local configuration initialized');
            useLocal = true;
          } else {
            return;
          }
        } else {
          useLocal = true;
        }
      } else if (options.global) {
        useLocal = false;
      } else {
        // No flags specified - interactive selection
        if (hasLocal) {
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const choice = await new Promise<string>((resolve) => {
            console.log(chalk.cyan('\nWhere would you like to save team filters?'));
            console.log(chalk.gray('  1) Local project config (.tp/config.json)'));
            console.log(chalk.gray('  2) Global user config'));
            rl.question(chalk.yellow('Choose [1-2] (default: 1): '), (answer) => {
              rl.close();
              resolve(answer || '1');
            });
          });

          useLocal = choice === '1';
        } else {
          // No local config, offer to create
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const shouldInit = await new Promise<boolean>((resolve) => {
            rl.question(
              chalk.yellow('Initialize local config for this project? (Y/n) '),
              (answer) => {
                rl.close();
                resolve(!answer || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
              },
            );
          });

          if (shouldInit) {
            enhancedConfig.initLocalConfig({});
            formatters.success('Local configuration initialized');
            useLocal = true;
          } else {
            useLocal = false;
          }
        }
      }

      try {
        if (teams && teams.length > 0) {
          // Setting specific teams
          if (useLocal) {
            enhancedConfig.updateLocalSetting('teamFilter', teams);
            formatters.success(`Now showing issues from: ${teams.join(', ')} (local config)`);
          } else {
            enhancedSettings.set('activeTeams', teams);
            formatters.success(`Now showing issues from: ${teams.join(', ')} (global config)`);
          }
        } else {
          // Clearing team filters
          if (useLocal) {
            enhancedConfig.updateLocalSetting('teamFilter', undefined);
            console.log(chalk.green('✓ Cleared team filters - showing all teams (local config)'));
          } else {
            enhancedSettings.clearTeamFilters();
            console.log(chalk.green('✓ Cleared team filters - showing all teams (global config)'));
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

        teams.nodes.forEach((team) => {
          console.log(chalk.gray('  Key:  '), chalk.yellow(team.key));
          console.log(chalk.gray('  Name: '), team.name);
          console.log(chalk.gray('  ID:   '), chalk.dim(team.id));
          console.log();
        });

        console.log(chalk.dim(`  Use: tp config teams ${teams.nodes.map((t) => t.key).join(' ')}`));
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
          output: process.stdout,
        });

        const scope =
          resetLocal && resetGlobal
            ? 'all settings'
            : resetLocal
              ? 'local settings'
              : 'global settings';

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
            // Remove .tp/config.json file
            fs.unlinkSync(paths.local);
            // Try to remove .tp directory if empty
            const tpDir = paths.local.replace('/config.json', '');
            try {
              fs.rmdirSync(tpDir);
            } catch {
              // Directory not empty or other error, ignore
            }
            formatters.success('Local configuration removed');
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
