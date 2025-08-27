import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { linearClient } from '@atoms/client/linear-client';
import { TeamAPI, TEAM_TEMPLATES } from '@molecules/apis/team.api';
import { formatters } from '../formatters';
import { settings } from '../settings';

/**
 * Team Command Module
 * 
 * Provides team management capabilities via CLI
 */

export function createTeamCommand(): Command {
  const team = new Command('team')
    .alias('t')
    .description('Manage teams');

  // List all teams
  team
    .command('list')
    .alias('ls')
    .description('List all teams')
    .option('--detailed', 'Show detailed information')
    .action(async (options) => {
      const spinner = ora('Fetching teams...').start();
      
      try {
        const client = linearClient.getClient();
        const api = new TeamAPI(client);
        
        const teams = await api.list();
        
        spinner.stop();
        
        if (options.detailed) {
          teams.forEach(team => formatters.team(team, true));
        } else {
          formatters.teamList(teams);
        }
        
      } catch (error) {
        spinner.fail('Could not fetch teams');
        formatters.error('Failed to fetch teams', error);
      }
    });

  // Create a new team
  team
    .command('create <key> <name>')
    .description('Create a new team')
    .option('-d, --description <desc>', 'Team description')
    .option('--cycles', 'Enable cycles (sprints)')
    .option('--cycle-duration <days>', 'Cycle duration in days', '14')
    .option('--triage', 'Enable triage')
    .option('--template <template>', 'Apply a template (engineering, support)')
    .action(async (key, name, options) => {
      const spinner = ora(`Creating team ${key}...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new TeamAPI(client);
        
        // Validate team key
        const validation = TeamAPI.validateTeamKey(key);
        if (!validation.valid) {
          spinner.fail('Invalid team key');
          validation.errors.forEach(err => console.log(chalk.red(`  ${err}`)));
          return;
        }
        
        // Apply template if specified
        if (options.template) {
          const team = await api.applyTemplate(options.template, {
            key,
            name,
            description: options.description
          });
          
          spinner.succeed(`Team created using ${options.template} template`);
          formatters.team(team);
          formatters.info(`Use 'tp team show ${key}' to see team details`);
        } else {
          // Create team manually
          const team = await api.create({
            key,
            name,
            description: options.description,
            cyclesEnabled: options.cycles || false,
            cycleDuration: parseInt(options.cycleDuration),
            triageEnabled: options.triage || false
          });
          
          spinner.succeed('Team created successfully');
          formatters.team(team);
        }
        
      } catch (error: any) {
        spinner.fail('Could not create team');
        formatters.error('Failed to create team', error);
      }
    });

  // Show team details
  team
    .command('show <key>')
    .description('Show team details')
    .action(async (teamKey) => {
      const spinner = ora(`Loading team ${teamKey}...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new TeamAPI(client);
        
        const team = await api.getByKey(teamKey);
        if (!team) {
          spinner.fail(`Team not found: ${teamKey}`);
          return;
        }
        
        spinner.stop();
        formatters.team(team, true);
        
        // Show members
        const members = await api.getMembers(teamKey);
        formatters.memberList(members);
        
        // Show current cycle if enabled
        if (team.cyclesEnabled) {
          const cycles = await api.getCycles(teamKey);
          const current = await api.getCurrentCycle(teamKey);
          formatters.cycleList(cycles.slice(0, 3), current);
        }
        
        // Show workflow states
        const states = await api.getWorkflowStates(teamKey);
        console.log(chalk.yellow('\n  Workflow States:'));
        states.forEach(state => {
          console.log(chalk.gray('   '), state.name, chalk.dim(`(${state.type})`));
        });
        
      } catch (error) {
        spinner.fail(`Could not load team ${teamKey}`);
        formatters.error('Failed to load team', error);
      }
    });

  // Team analytics
  team
    .command('stats <key>')
    .alias('analytics')
    .description('Show team analytics and metrics')
    .action(async (teamKey) => {
      const spinner = ora(`Analyzing team ${teamKey}...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new TeamAPI(client);
        
        const analytics = await api.getAnalytics(teamKey);
        
        spinner.stop();
        formatters.analytics(analytics);
        
        // Show velocity if cycles are enabled
        const team = await api.getByKey(teamKey);
        if (team?.cyclesEnabled) {
          const velocities = await api.getVelocity(teamKey);
          formatters.velocity(velocities);
        }
        
      } catch (error) {
        spinner.fail(`Could not analyze team ${teamKey}`);
        formatters.error('Failed to get analytics', error);
      }
    });

  // Set default team
  team
    .command('set-default <key>')
    .description('Set the default team for operations')
    .action(async (teamKey) => {
      const spinner = ora(`Setting default team to ${teamKey}...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new TeamAPI(client);
        
        // Verify team exists
        const team = await api.getByKey(teamKey);
        if (!team) {
          spinner.fail(`Team not found: ${teamKey}`);
          return;
        }
        
        // Save to settings
        settings.set('defaultTeam', teamKey);
        
        spinner.succeed(`Default team set to ${teamKey}`);
        formatters.info(`New issues will be created in ${team.name} by default`);
        
      } catch (error) {
        spinner.fail('Could not set default team');
        formatters.error('Failed to set default team', error);
      }
    });

  // Apply team template
  team
    .command('apply-template <template>')
    .description('Create a team from a template')
    .option('-k, --key <key>', 'Team key (required)')
    .option('-n, --name <name>', 'Team name (required)')
    .option('-d, --description <desc>', 'Team description')
    .action(async (templateName, options) => {
      if (!options.key || !options.name) {
        formatters.error('Team key and name are required');
        console.log(chalk.dim('  Usage: tp team apply-template <template> --key KEY --name "Team Name"'));
        return;
      }
      
      const spinner = ora(`Applying template ${templateName}...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new TeamAPI(client);
        
        const team = await api.applyTemplate(templateName, {
          key: options.key,
          name: options.name,
          description: options.description
        });
        
        spinner.succeed(`Team created from ${templateName} template`);
        formatters.team(team, true);
        formatters.info(`Use 'tp labels apply-template ${templateName}' to add matching labels`);
        
      } catch (error) {
        spinner.fail('Could not apply template');
        formatters.error('Failed to apply template', error);
      }
    });

  // List available templates
  team
    .command('templates')
    .description('List available team templates')
    .action(() => {
      const templates = TeamAPI.getAvailableTemplates();
      
      console.log(chalk.cyan('\n==> Team Templates\n'));
      
      templates.forEach(({ name, template }) => {
        console.log(chalk.yellow(`  ${name}`));
        console.log(chalk.gray('    Name:       '), template.name);
        console.log(chalk.gray('    Description:'), template.description);
        console.log(chalk.gray('    Key:        '), template.config.key);
        console.log(chalk.gray('    Features:   '), 
          [
            template.config.cyclesEnabled && 'Cycles',
            template.config.triageEnabled && 'Triage'
          ].filter(Boolean).join(', ') || 'None'
        );
        console.log();
      });
      
      console.log(chalk.dim('  Usage: tp team apply-template <template> --key KEY --name "Name"'));
    });

  // Search teams
  team
    .command('search <query>')
    .description('Search teams by name or key')
    .action(async (query) => {
      const spinner = ora(`Searching for "${query}"...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new TeamAPI(client);
        
        const teams = await api.search(query);
        
        spinner.stop();
        
        if (teams.length === 0) {
          formatters.warning(`No teams found matching "${query}"`);
        } else {
          formatters.teamList(teams);
        }
        
      } catch (error) {
        spinner.fail('Search failed');
        formatters.error('Failed to search teams', error);
      }
    });

  // Clone team configuration
  team
    .command('clone <source> <key> <name>')
    .description('Clone a team configuration')
    .option('-d, --description <desc>', 'New team description')
    .action(async (sourceKey, newKey, newName, options) => {
      const spinner = ora(`Cloning team ${sourceKey}...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new TeamAPI(client);
        
        const team = await api.cloneTeam(sourceKey, {
          key: newKey,
          name: newName,
          description: options.description
        });
        
        spinner.succeed(`Team cloned successfully`);
        formatters.team(team);
        formatters.info('Workflow states have been created automatically');
        formatters.info('Use LabelAPI to clone labels if needed');
        
      } catch (error) {
        spinner.fail('Could not clone team');
        formatters.error('Failed to clone team', error);
      }
    });

  // Get team projects
  team
    .command('projects <key>')
    .description('List team projects')
    .action(async (teamKey) => {
      const spinner = ora(`Loading projects for ${teamKey}...`).start();
      
      try {
        const client = linearClient.getClient();
        const api = new TeamAPI(client);
        
        const projects = await api.getProjects(teamKey);
        
        spinner.stop();
        
        console.log(chalk.cyan(`\n==> Projects for ${teamKey}\n`));
        
        if (projects.length === 0) {
          console.log(chalk.yellow('  No projects found'));
        } else {
          projects.forEach(project => {
            console.log(chalk.yellow(`  ${project.name}`));
            if (project.description) {
              console.log(chalk.dim(`    ${project.description}`));
            }
            console.log(chalk.gray('    State:'), project.state);
            if (project.targetDate) {
              console.log(chalk.gray('    Target:'), new Date(project.targetDate).toLocaleDateString());
            }
            console.log();
          });
        }
        
      } catch (error) {
        spinner.fail(`Could not load projects for ${teamKey}`);
        formatters.error('Failed to load projects', error);
      }
    });

  return team;
}