import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { linearClient } from '@atoms/client/linear-client';
import { settings } from '../settings';
import { formatters } from '../formatters';

/**
 * Config Command Module
 * 
 * Provides configuration management for task-patterns CLI
 */

export function createConfigCommand(): Command {
  const config = new Command('config')
    .description('Manage task-pattern settings');

  // Show current settings
  config
    .command('show')
    .description('Show current settings')
    .action(() => {
      settings.show();
    });

  // Set a configuration value
  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action((key, value) => {
      // Parse the key for nested values (e.g., "team.default")
      if (key === 'team.default' || key === 'defaultTeam') {
        settings.set('defaultTeam', value);
        formatters.success(`Default team set to "${value}"`);
      } else if (key === 'backend') {
        if (!['linear', 'github', 'jira'].includes(value)) {
          formatters.error('Invalid backend. Options: linear, github, jira');
          return;
        }
        settings.set('backend', value as any);
        formatters.success(`Backend set to "${value}"`);
      } else {
        formatters.warning(`Unknown configuration key: ${key}`);
        console.log(chalk.dim('  Available keys: team.default, backend'));
      }
    });

  // Get a configuration value
  config
    .command('get <key>')
    .description('Get a configuration value')
    .action((key) => {
      let value;
      
      // Handle different key formats
      if (key === 'team.default' || key === 'defaultTeam') {
        value = settings.get('defaultTeam');
      } else if (key === 'activeTeams' || key === 'teams') {
        value = settings.get('activeTeams');
      } else if (key === 'backend') {
        value = settings.get('backend');
      } else {
        value = settings.get(key as any);
      }
      
      if (value !== undefined) {
        if (Array.isArray(value)) {
          console.log(value.join(', '));
        } else {
          console.log(value);
        }
      } else {
        formatters.warning(`No value set for: ${key}`);
      }
    });

  // List all configuration options
  config
    .command('list')
    .description('List all configuration options')
    .action(() => {
      console.log(chalk.cyan('\n==> Configuration Options\n'));
      
      console.log(chalk.yellow('  Core Settings:'));
      console.log(chalk.gray('    team.default   '), 'Default team for new issues');
      console.log(chalk.gray('    backend        '), 'Task backend (linear, github, jira)');
      
      console.log(chalk.yellow('\n  Team Filters:'));
      console.log(chalk.gray('    activeTeams    '), 'Teams to show in context view');
      console.log(chalk.gray('    hideTeams      '), 'Teams to always hide');
      
      console.log(chalk.yellow('\n  API Keys:'));
      console.log(chalk.gray('    linearApiKey   '), 'Linear API key (can also use LINEAR_API_KEY env)');
      
      console.log(chalk.dim('\n  Use: tp config set <key> <value>'));
      console.log(chalk.dim('  Use: tp config get <key>'));
    });

  // Team filter management (legacy support)
  config
    .command('teams [teams...]')
    .description('Set active teams to filter (leave empty to show all)')
    .action((teams) => {
      if (teams && teams.length > 0) {
        settings.set('activeTeams', teams);
        formatters.success(`Now showing issues from: ${teams.join(', ')}`);
        console.log(chalk.dim('  Run "tp context" to see filtered view'));
      } else {
        settings.clearTeamFilters();
        console.log(chalk.dim('  Run "tp context" to see all teams'));
      }
    });

  config
    .command('add-team <teams...>')
    .description('Add teams to active filter')
    .action((teams) => {
      settings.addActiveTeams(...teams);
    });

  config
    .command('remove-team <teams...>')
    .description('Remove teams from active filter')
    .action((teams) => {
      settings.removeActiveTeams(...teams);
    });

  config
    .command('clear')
    .description('Clear all team filters')
    .action(() => {
      settings.clearTeamFilters();
    });

  config
    .command('list-teams')
    .description('List all available teams')
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
      }
    });

  // Reset configuration
  config
    .command('reset')
    .description('Reset all settings to defaults')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (options) => {
      if (!options.confirm) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const confirmed = await new Promise<boolean>((resolve) => {
          rl.question(chalk.yellow('Are you sure you want to reset all settings? (y/N) '), (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
          });
        });
        
        if (!confirmed) {
          console.log(chalk.gray('Reset cancelled'));
          return;
        }
      }
      
      // Clear all settings
      settings.set('defaultTeam', undefined);
      settings.set('activeTeams', undefined);
      settings.set('hideTeams', undefined);
      settings.set('backend', undefined);
      
      formatters.success('Settings reset to defaults');
      console.log(chalk.dim('  Configuration will now use environment variables'));
    });

  // Export configuration
  config
    .command('export')
    .description('Export configuration as JSON')
    .action(() => {
      const config = {
        defaultTeam: settings.get('defaultTeam'),
        activeTeams: settings.get('activeTeams'),
        hideTeams: settings.get('hideTeams'),
        backend: settings.get('backend')
      };
      
      // Remove undefined values
      Object.keys(config).forEach(key => {
        if (config[key as keyof typeof config] === undefined) {
          delete config[key as keyof typeof config];
        }
      });
      
      console.log(JSON.stringify(config, null, 2));
    });

  // Import configuration
  config
    .command('import <json>')
    .description('Import configuration from JSON')
    .action((jsonStr) => {
      try {
        const config = JSON.parse(jsonStr);
        
        if (config.defaultTeam) {
          settings.set('defaultTeam', config.defaultTeam);
        }
        if (config.activeTeams) {
          settings.set('activeTeams', config.activeTeams);
        }
        if (config.hideTeams) {
          settings.set('hideTeams', config.hideTeams);
        }
        if (config.backend) {
          settings.set('backend', config.backend);
        }
        
        formatters.success('Configuration imported successfully');
        settings.show();
      } catch (error) {
        formatters.error('Invalid JSON', error);
      }
    });

  return config;
}