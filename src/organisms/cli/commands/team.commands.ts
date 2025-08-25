/* eslint-disable no-console */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { TeamService } from '@features/team/service';
import { logger } from '@atoms/shared/logger';
import type { WorkflowState, IssueLabel } from '@linear/sdk';

export function teamCommands(program: Command) {
  const team = program.command('team').description('Manage Linear teams');

  team
    .command('list')
    .description('List all teams')
    .option('--limit <limit>', 'Number of teams to fetch', (value) => parseInt(value), 20)
    .action(async (options) => {
      const spinner = ora('Fetching teams...').start();
      try {
        const teamService = new TeamService();
        const teams = await teamService.list({ first: options.limit });
        const nodes = await teams.nodes;

        spinner.succeed(`Found ${nodes.length} teams`);

        if (nodes.length > 0) {
          console.log('\nTeams:');
          for (const team of nodes) {
            console.log(`  ${chalk.green(team.key)} - ${team.name}`);
            if (team.description) {
              console.log(`    ${chalk.gray(team.description)}`);
            }
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch teams');
        logger.error('Error', error);
      }
    });

  team
    .command('get <idOrKey>')
    .description('Get team details by ID or key')
    .action(async (idOrKey) => {
      const spinner = ora('Fetching team...').start();
      try {
        const teamService = new TeamService();

        let team;
        if (idOrKey.length < 10) {
          team = await teamService.getByKey(idOrKey);
        } else {
          team = await teamService.get(idOrKey);
        }

        if (team) {
          spinner.succeed(`Found team: ${chalk.green(team.key)}`);
          console.log('\nTeam Details:');
          console.log(`  Name: ${team.name}`);
          console.log(`  Key: ${team.key}`);
          console.log(`  Description: ${team.description || 'No description'}`);
          console.log(`  ID: ${team.id}`);
        } else {
          spinner.fail('Team not found');
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch team');
        logger.error('Error', error);
      }
    });

  team
    .command('members <teamId>')
    .description('List team members')
    .option('--limit <limit>', 'Number of members to fetch', (value) => parseInt(value), 20)
    .action(async (teamId, options) => {
      const spinner = ora('Fetching team members...').start();
      try {
        const teamService = new TeamService();
        const members = await teamService.getMembers(teamId, { first: options.limit });
        const nodes = await members.nodes;

        spinner.succeed(`Found ${nodes.length} members`);

        if (nodes.length > 0) {
          console.log('\nTeam Members:');
          for (const member of nodes) {
            const admin = member.admin ? chalk.yellow(' (Admin)') : '';
            console.log(`  ${chalk.green(member.name)}${admin}`);
            console.log(`    Email: ${member.email}`);
            console.log(`    ID: ${member.id}`);
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch team members');
        logger.error('Error', error);
      }
    });

  team
    .command('projects <teamId>')
    .description('List team projects')
    .option('--limit <limit>', 'Number of projects to fetch', (value) => parseInt(value), 20)
    .action(async (teamId, options) => {
      const spinner = ora('Fetching team projects...').start();
      try {
        const teamService = new TeamService();
        const projects = await teamService.getProjects(teamId, { first: options.limit });
        const nodes = await projects.nodes;

        spinner.succeed(`Found ${nodes.length} projects`);

        if (nodes.length > 0) {
          console.log('\nTeam Projects:');
          for (const project of nodes) {
            const state = project.state ? chalk.blue(`[${project.state}]`) : '';
            console.log(`  ${chalk.green(project.name)} ${state}`);
            if (project.description) {
              console.log(`    ${chalk.gray(project.description)}`);
            }
            console.log(`    ID: ${project.id}`);
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch team projects');
        logger.error('Error', error);
      }
    });

  team
    .command('cycles <teamId>')
    .description('List team cycles/sprints')
    .option('--limit <limit>', 'Number of cycles to fetch', (value) => parseInt(value), 20)
    .action(async (teamId, options) => {
      const spinner = ora('Fetching team cycles...').start();
      try {
        const teamService = new TeamService();
        const cycles = await teamService.getCycles(teamId, { first: options.limit });
        const nodes = await cycles.nodes;

        spinner.succeed(`Found ${nodes.length} cycles`);

        if (nodes.length > 0) {
          console.log('\nTeam Cycles:');
          for (const cycle of nodes) {
            const active = cycle.completedAt ? '' : chalk.green(' (Active)');
            console.log(`  ${chalk.blue(cycle.name)}${active}`);
            console.log(`    Number: ${cycle.number}`);
            console.log(`    ID: ${cycle.id}`);
            if (cycle.startsAt) {
              console.log(`    Starts: ${new Date(cycle.startsAt).toLocaleDateString()}`);
            }
            if (cycle.endsAt) {
              console.log(`    Ends: ${new Date(cycle.endsAt).toLocaleDateString()}`);
            }
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch team cycles');
        logger.error('Error', error);
      }
    });

  team
    .command('labels <teamId>')
    .description('List team labels')
    .option('--limit <limit>', 'Number of labels to fetch', (value) => parseInt(value), 20)
    .action(async (teamId, options) => {
      const spinner = ora('Fetching team labels...').start();
      try {
        const teamService = new TeamService();
        const labels = await teamService.getLabels(teamId, { first: options.limit });
        const nodes = await labels.nodes;

        spinner.succeed(`Found ${nodes.length} labels`);

        if (nodes.length > 0) {
          console.log('\nTeam Labels:');
          const grouped = new Map<string, IssueLabel[]>();

          for (const label of nodes) {
            const parentLabel = label.parent ? await label.parent : null;
            const parent = parentLabel?.name || 'Ungrouped';
            if (!grouped.has(parent)) {
              grouped.set(parent, []);
            }
            grouped.get(parent)!.push(label);
          }

          for (const [group, labels] of grouped) {
            console.log(`\n  ${chalk.yellow(group)}:`);
            for (const label of labels) {
              const color = label.color ? chalk.hex(label.color)('●') : '';
              console.log(`    ${color} ${label.name}`);
              console.log(`      ID: ${label.id}`);
            }
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch team labels');
        logger.error('Error', error);
      }
    });

  team
    .command('states <teamId>')
    .description('List team workflow states')
    .action(async (teamId) => {
      const spinner = ora('Fetching workflow states...').start();
      try {
        const teamService = new TeamService();
        const states = await teamService.getWorkflowStates(teamId);
        const nodes = await states.nodes;

        spinner.succeed(`Found ${nodes.length} workflow states`);

        if (nodes.length > 0) {
          console.log('\nWorkflow States:');

          const byType = new Map<string, WorkflowState[]>();
          for (const state of nodes) {
            const type = state.type || 'other';
            if (!byType.has(type)) {
              byType.set(type, []);
            }
            byType.get(type)!.push(state);
          }

          for (const [type, states] of byType) {
            console.log(`\n  ${chalk.yellow(type.toUpperCase())}:`);
            for (const state of states.sort((a, b) => a.position - b.position)) {
              const color = state.color ? chalk.hex(state.color)('●') : '';
              console.log(`    ${color} ${state.name}`);
              console.log(`      ID: ${state.id}`);
              console.log(`      Position: ${state.position}`);
            }
          }
        }
      } catch (error: unknown) {
        spinner.fail('Failed to fetch workflow states');
        logger.error('Error', error);
      }
    });
}
